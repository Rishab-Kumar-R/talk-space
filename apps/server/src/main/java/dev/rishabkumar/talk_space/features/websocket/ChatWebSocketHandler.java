package dev.rishabkumar.talk_space.features.websocket;

import dev.rishabkumar.talk_space.features.messaging.BroadcastService;
import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.messaging.MessageService;
import dev.rishabkumar.talk_space.features.presence.PresenceService;
import dev.rishabkumar.talk_space.features.room.RoomRepository;
import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import dev.rishabkumar.talk_space.shared.security.JwtService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.ReactiveSubscription;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private final ReactiveRedisMessageListenerContainer listenerContainer;
    private final RoomRepository roomRepository;
    private final MessageService messageService;
    private final BroadcastService broadcastService;
    private final PresenceService presenceService;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final AppMetrics metrics;

    public ChatWebSocketHandler(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate,
            ReactiveRedisMessageListenerContainer listenerContainer,
            RoomRepository roomRepository,
            MessageService messageService,
            BroadcastService broadcastService,
            PresenceService presenceService,
            JwtService jwtService,
            ObjectMapper objectMapper,
            AppMetrics metrics) {
        this.redisTemplate = redisTemplate;
        this.listenerContainer = listenerContainer;
        this.roomRepository = roomRepository;
        this.messageService = messageService;
        this.broadcastService = broadcastService;
        this.presenceService = presenceService;
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.metrics = metrics;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String path = session.getHandshakeInfo().getUri().getPath();
        String roomId = path.substring(path.lastIndexOf('/') + 1);
        String token = extractToken(session.getHandshakeInfo().getUri().getQuery());

        if (token == null || !jwtService.isValid(token)) return session.close();

        String username = jwtService.extractUsername(token);

        // For private rooms, reject non-members immediately
        Mono<Boolean> membershipCheck = roomRepository.findByName(roomId)
                .map(room -> !room.isPrivate() || room.getMemberRoles().containsKey(username))
                .defaultIfEmpty(true);

        return membershipCheck.flatMap(allowed -> {
            if (!allowed) return session.close();
            return doHandle(session, roomId, username);
        });
    }

    private Mono<Void> doHandle(WebSocketSession session, String roomId, String username) {
        String channel = "chat.room." + roomId;

        Mono<Void> inbound = session.receive()
                .flatMap(wsMessage -> {
                    String payload = wsMessage.getPayloadAsText();
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> event = payload.startsWith("{")
                                ? objectMapper.readValue(payload, Map.class)
                                : Map.of("type", "message", "content", payload);

                        if ("typing".equals(event.get("type"))) {
                            Map<String, String> typingEvent = new HashMap<>();
                            typingEvent.put("type", "typing");
                            typingEvent.put("username", username);
                            return broadcastService.publish(roomId, Map.copyOf(typingEvent));
                        }

                        return saveAndBroadcast(event, roomId, username, channel);
                    } catch (JacksonException e) {
                        return Mono.error(e);
                    }
                })
                .then();

        Flux<String> redisMessages = listenerContainer
                .receive(ChannelTopic.of(channel))
                .map(ReactiveSubscription.Message::getMessage);

        Mono<Void> outbound = session.send(redisMessages.map(session::textMessage));

        metrics.wsConnections.incrementAndGet();
        return presenceService.join(roomId, username)
                .then(Mono.zip(inbound, outbound))
                .then()
                .doFinally(signal -> {
                    metrics.wsConnections.decrementAndGet();
                    presenceService.leave(roomId, username).subscribe();
                });
    }

    private Mono<Long> saveAndBroadcast(Map<String, Object> event, String roomId,
                                         String username, String channel) {
        String plaintextContent = (String) event.getOrDefault("content", "");
        String replyToId = (String) event.get("replyToId");
        String plaintextReplyPreview = (String) event.get("replyPreview");
        String messageType = (String) event.getOrDefault("messageType", "text");
        String fileUrl = (String) event.get("fileUrl");
        String fileName = (String) event.get("fileName");
        Number fileSizeRaw = (Number) event.get("fileSize");
        String mimeType = (String) event.get("mimeType");

        Message message = new Message(roomId, username, username,
                plaintextContent.isBlank() ? null : messageService.encrypt(plaintextContent));
        message.setTimestamp(Instant.now());
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

        return messageService.save(message).flatMap(saved -> {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> outEvent = objectMapper.convertValue(saved, Map.class);
                outEvent.put("type", "message");
                outEvent.put("content", plaintextContent);
                if (plaintextReplyPreview != null) outEvent.put("replyPreview", plaintextReplyPreview);
                if (fileUrl != null) {
                    outEvent.put("fileUrl", fileUrl);
                    outEvent.put("fileName", fileName);
                    outEvent.put("fileSize", fileSizeRaw);
                    outEvent.put("mimeType", mimeType);
                    outEvent.put("messageType", messageType);
                }
                return broadcastService.publish(roomId, outEvent);
            } catch (Exception e) {
                return Mono.error(e);
            }
        });
    }

    private String extractToken(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) return param.substring(6);
        }
        return null;
    }
}
