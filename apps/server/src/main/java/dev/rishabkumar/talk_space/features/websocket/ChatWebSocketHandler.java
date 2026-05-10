package dev.rishabkumar.talk_space.features.websocket;

import dev.rishabkumar.talk_space.features.messaging.BroadcastService;
import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.messaging.MessageService;
import dev.rishabkumar.talk_space.features.presence.PresenceService;
import dev.rishabkumar.talk_space.features.room.RoomRepository;
import dev.rishabkumar.talk_space.features.room.RoomService;
import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import dev.rishabkumar.talk_space.shared.ratelimit.RateLimitService;
import dev.rishabkumar.talk_space.shared.util.DmRoomUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.ReactiveSubscription;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private final ReactiveRedisMessageListenerContainer listenerContainer;
    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final MessageService messageService;
    private final BroadcastService broadcastService;
    private final PresenceService presenceService;
    private final ObjectMapper objectMapper;
    private final AppMetrics metrics;
    private final RateLimitService rateLimitService;

    @Value("${rate-limit.ws-messages-per-minute:30}")
    private int wsMsgLimit;

    @Value("${rate-limit.ws-joins-per-minute:10}")
    private int wsJoinLimit;

    @Value("${chat.max-message-length:4000}")
    private int maxMessageLength;

    public ChatWebSocketHandler(
            ReactiveRedisMessageListenerContainer listenerContainer,
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate,
            RoomRepository roomRepository,
            RoomService roomService,
            MessageService messageService,
            BroadcastService broadcastService,
            PresenceService presenceService,
            ObjectMapper objectMapper,
            AppMetrics metrics,
            RateLimitService rateLimitService) {
        this.listenerContainer = listenerContainer;
        this.redisTemplate = redisTemplate;
        this.roomRepository = roomRepository;
        this.roomService = roomService;
        this.messageService = messageService;
        this.broadcastService = broadcastService;
        this.presenceService = presenceService;
        this.objectMapper = objectMapper;
        this.metrics = metrics;
        this.rateLimitService = rateLimitService;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String path = session.getHandshakeInfo().getUri().getPath();
        String roomId = path.substring(path.lastIndexOf('/') + 1);
        String ticket = extractParam(session.getHandshakeInfo().getUri().getQuery(), "ticket");

        if (roomId.isBlank() || ticket == null) {
            log.warn("WebSocket rejected — missing ticket or blank roomId");
            return session.close();
        }

        // Consume the ticket atomically — getAndDelete ensures single-use
        return redisTemplate.opsForValue()
                .getAndDelete("ws:ticket:" + ticket)
                .switchIfEmpty(Mono.fromRunnable(() ->
                        log.warn("WebSocket rejected — unknown or expired ticket roomId={}", roomId)))
                .flatMap(username ->
                        rateLimitService.isAllowed("ratelimit:ws:join:" + username, wsJoinLimit, 60)
                                .flatMap(joinAllowed -> {
                                    if (!joinAllowed) {
                                        log.warn("WebSocket join rate-limited user={} roomId={}", username, roomId);
                                        return session.close();
                                    }
                                    Mono<Boolean> membershipCheck = roomRepository.findByName(roomId)
                                            .map(room -> !room.isPrivate() || room.getMemberRoles().containsKey(username))
                                            .defaultIfEmpty(true);
                                    return membershipCheck.flatMap(allowed -> {
                                        if (!allowed) return session.close();
                                        return doHandle(session, roomId, username);
                                    });
                                })
                )
                .switchIfEmpty(session.close());
    }

    private Mono<Void> doHandle(WebSocketSession session, String roomId, String username) {
        String channel = "chat.room." + roomId;
        Sinks.Many<String> serverPush = Sinks.many().unicast().onBackpressureBuffer();

        Mono<Void> inbound = session.receive()
                .flatMap(wsMessage -> {
                    String payload = wsMessage.getPayloadAsText();
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> event = payload.startsWith("{")
                                ? objectMapper.readValue(payload, Map.class)
                                : Map.of("type", "message", "content", payload);

                        if ("typing".equals(event.get("type"))) {
                            Map<String, Object> typingEvent = new HashMap<>();
                            typingEvent.put("type", "typing");
                            typingEvent.put("username", username);
                            if (event.containsKey("threadId")) {
                                typingEvent.put("threadId", event.get("threadId"));
                            }
                            return broadcastService.publish(roomId, Map.copyOf(typingEvent));
                        }

                        String content = (String) event.getOrDefault("content", "");
                        if (content.length() > maxMessageLength) {
                            serverPush.tryEmitNext(
                                    "{\"type\":\"error\",\"message\":\"Message exceeds maximum length of "
                                            + maxMessageLength + " characters\"}");
                            return Mono.empty();
                        }

                        return rateLimitService.isAllowed("ratelimit:ws:msg:" + username, wsMsgLimit, 60)
                                .flatMap(allowed -> {
                                    if (!allowed) {
                                        log.warn("WebSocket message rate-limited user={} roomId={}", username, roomId);
                                        serverPush.tryEmitNext("{\"type\":\"rate_limited\",\"retryAfter\":60}");
                                        return Mono.empty();
                                    }
                                    return saveAndBroadcast(event, roomId, username, channel);
                                });
                    } catch (JacksonException e) {
                        return Mono.error(e);
                    }
                })
                .then();

        Flux<String> redisMessages = listenerContainer
                .receive(ChannelTopic.of(channel), ChannelTopic.of("notify.user." + username))
                .map(ReactiveSubscription.Message::getMessage);

        Mono<Void> outbound = session.send(
                Flux.merge(redisMessages, serverPush.asFlux()).map(session::textMessage));

        metrics.wsConnections.incrementAndGet();
        log.info("WebSocket connected user={} roomId={} sessionId={}", username, roomId, session.getId());
        return presenceService.join(roomId, username)
                .then(Mono.zip(inbound, outbound))
                .then()
                .doFinally(signal -> {
                    log.info("WebSocket disconnected user={} roomId={} signal={}", username, roomId, signal);
                    metrics.wsConnections.decrementAndGet();
                    serverPush.tryEmitComplete();
                    presenceService.leave(roomId, username).subscribe();
                });
    }

    private Mono<Void> saveAndBroadcast(Map<String, Object> event, String roomId,
                                        String username, String channel) {
        String plaintextContent = (String) event.getOrDefault("content", "");
        String replyToId = (String) event.get("replyToId");
        String plaintextReplyPreview = (String) event.get("replyPreview");
        String messageType = (String) event.getOrDefault("messageType", "text");
        String fileUrl = (String) event.get("fileUrl");
        String fileName = (String) event.get("fileName");
        Number fileSizeRaw = (Number) event.get("fileSize");
        String mimeType = (String) event.get("mimeType");
        String threadId = (String) event.get("threadId");
        @SuppressWarnings("unchecked")
        java.util.List<String> pollOptions = (java.util.List<String>) event.get("pollOptions");

        Message message = new Message(roomId, username, username,
                plaintextContent.isBlank() ? null : messageService.encrypt(plaintextContent));
        message.setTimestamp(Instant.now());
        message.setMentions(extractMentions(plaintextContent));
        message.setThreadId(threadId);
        message.setMessageType(messageType);
        if (fileUrl != null) {
            message.setFileUrl(fileUrl);
            message.setFileName(fileName);
            message.setFileSize(fileSizeRaw != null ? fileSizeRaw.longValue() : null);
            message.setMimeType(mimeType);
        }
        if (replyToId != null) {
            message.setReplyToId(replyToId);
            message.setReplyPreview(plaintextReplyPreview != null
                    ? messageService.encrypt(plaintextReplyPreview) : null);
        }
        if (pollOptions != null) {
            message.setPollOptions(pollOptions);
        }

        Mono<Void> ensureDm = DmRoomUtils.isDm(roomId)
                ? roomService.ensureDmRoom(roomId, username, DmRoomUtils.partner(roomId, username)).then()
                : Mono.empty();

        return ensureDm.then(messageService.save(message)).flatMap(saved -> {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> outEvent = objectMapper.convertValue(saved, Map.class);
                outEvent.put("content", plaintextContent);
                if (plaintextReplyPreview != null) outEvent.put("replyPreview", plaintextReplyPreview);
                if (fileUrl != null) {
                    outEvent.put("fileUrl", fileUrl);
                    outEvent.put("fileName", fileName);
                    outEvent.put("fileSize", fileSizeRaw);
                    outEvent.put("mimeType", mimeType);
                    outEvent.put("messageType", messageType);
                }

                if (pollOptions != null) {
                    outEvent.put("pollOptions", pollOptions);
                    outEvent.put("pollVotes", java.util.Collections.emptyMap());
                }
                if (threadId != null) {
                    outEvent.put("type", "thread_reply");
                    Map<String, Object> countEvent = new HashMap<>();
                    countEvent.put("type", "thread_count_updated");
                    countEvent.put("rootId", threadId);
                    return messageService.incrementThreadCount(threadId)
                            .then(broadcastService.publish(roomId, outEvent))
                            .then(broadcastService.publish(roomId, Map.copyOf(countEvent)))
                            .then();
                } else {
                    outEvent.put("type", "message");
                    Mono<Void> broadcast = broadcastService.publish(roomId, outEvent).then();
                    if (DmRoomUtils.isDm(roomId)) {
                        String partner = DmRoomUtils.partner(roomId, username);
                        broadcast = broadcast.then(broadcastService.publishUnreadBump(roomId, partner).then());
                    }
                    return broadcast;
                }
            } catch (Exception e) {
                return Mono.<Void>error(e);
            }
        });
    }

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._-]+)");

    private static final int MAX_MENTIONS = 20;

    private List<String> extractMentions(String text) {
        if (text == null || text.isBlank()) return List.of();
        Matcher m = MENTION_PATTERN.matcher(text);
        LinkedHashSet<String> found = new LinkedHashSet<>();
        while (m.find() && found.size() < MAX_MENTIONS) found.add(m.group(1));
        return new ArrayList<>(found);
    }

    private String extractParam(String query, String name) {
        if (query == null) return null;
        String prefix = name + "=";
        for (String param : query.split("&")) {
            if (param.startsWith(prefix)) return param.substring(prefix.length());
        }
        return null;
    }
}
