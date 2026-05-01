package dev.rishabkumar.talk_space.handler;

import tools.jackson.core.JacksonException;
import dev.rishabkumar.talk_space.model.Message;
import dev.rishabkumar.talk_space.repository.MessageRepository;
import dev.rishabkumar.talk_space.service.EncryptionService;
import dev.rishabkumar.talk_space.service.JwtService;
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
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {
    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private final ReactiveRedisMessageListenerContainer listenerContainer;
    private final MessageRepository messageRepository;
    private final JwtService jwtService;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    public ChatWebSocketHandler(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate,
            ReactiveRedisMessageListenerContainer listenerContainer,
            MessageRepository messageRepository,
            JwtService jwtService,
            EncryptionService encryptionService,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.listenerContainer = listenerContainer;
        this.messageRepository = messageRepository;
        this.jwtService = jwtService;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String path = session.getHandshakeInfo().getUri().getPath();
        String roomId = path.substring(path.lastIndexOf('/') + 1);

        String query = session.getHandshakeInfo().getUri().getQuery();
        String token = extractToken(query);

        if (token == null || !jwtService.isValid(token)) {
            return session.close();
        }

        String username = jwtService.extractUsername(token);
        String channel = "chat.room." + roomId;
        String presenceKey = "presence.room." + roomId;

        Mono<Void> inbound = session.receive()
                .flatMap(wsMessage -> {
                    String payload = wsMessage.getPayloadAsText();
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> event = payload.startsWith("{")
                                ? objectMapper.readValue(payload, Map.class)
                                : Map.of("type", "message", "content", payload);
                        String type = (String) event.get("type");

                        if ("typing".equals(type)) {
                            Map<String, String> typingEvent = new HashMap<>();
                            typingEvent.put("type", "typing");
                            typingEvent.put("username", username);
                            String typingJson = objectMapper.writeValueAsString(typingEvent);
                            return redisTemplate.convertAndSend(channel, typingJson);
                        }

                        String plaintextContent = (String) event.getOrDefault("content", "");
                        String replyToId = (String) event.get("replyToId");
                        String plaintextReplyPreview = (String) event.get("replyPreview");

                        Message message = new Message(roomId, username, username,
                                encryptionService.encrypt(plaintextContent));
                        message.setTimestamp(Instant.now());
                        if (replyToId != null) {
                            message.setReplyToId(replyToId);
                            message.setReplyPreview(plaintextReplyPreview != null
                                    ? encryptionService.encrypt(plaintextReplyPreview)
                                    : null);
                        }

                        return messageRepository.save(message)
                                .flatMap(saved -> {
                                    try {
                                        @SuppressWarnings("unchecked")
                                        Map<String, Object> outEvent = objectMapper.convertValue(saved, Map.class);
                                        outEvent.put("type", "message");
                                        // broadcast plaintext so connected clients don't need to decrypt
                                        outEvent.put("content", plaintextContent);
                                        if (plaintextReplyPreview != null) {
                                            outEvent.put("replyPreview", plaintextReplyPreview);
                                        }
                                        String json = objectMapper.writeValueAsString(outEvent);
                                        return redisTemplate.convertAndSend(channel, json);
                                    } catch (JacksonException e) {
                                        return Mono.error(e);
                                    }
                                });

                    } catch (JacksonException e) {
                        return Mono.error(e);
                    }
                })
                .then();

        Flux<String> redisMessages = listenerContainer
                .receive(ChannelTopic.of(channel))
                .map(ReactiveSubscription.Message::getMessage);

        Mono<Void> outbound = session.send(
                redisMessages.map(session::textMessage)
        );

        return redisTemplate.opsForSet().add(presenceKey, username)
                .then(Mono.zip(inbound, outbound))
                .then()
                .doFinally(signal -> redisTemplate.opsForSet().remove(presenceKey, username).subscribe());
    }

    private String extractToken(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) {
                return param.substring(6);
            }
        }
        return null;
    }
}
