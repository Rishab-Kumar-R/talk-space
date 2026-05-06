package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Single place that publishes events to Redis chat channels.
 * Used by both MessageService (REST) and ChatWebSocketHandler (WS)
 * so the broadcast logic is never duplicated.
 */
@Service
public class BroadcastService {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final AppMetrics metrics;

    public BroadcastService(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate,
            ObjectMapper objectMapper,
            AppMetrics metrics) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.metrics = metrics;
    }

    public Mono<Long> publish(String roomId, Map<String, Object> event) {
        Instant start = Instant.now();
        try {
            String json = objectMapper.writeValueAsString(event);
            boolean isMessage = "message".equals(event.get("type"));
            return redisTemplate.convertAndSend("chat.room." + roomId, json)
                    .doOnSuccess(r -> {
                        metrics.redisPublishTimer.record(Duration.between(start, Instant.now()));
                        if (isMessage) metrics.messagesTotal.increment();
                    });
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    public Mono<Long> publishMessageEdited(Message saved, String plaintextContent) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.convertValue(saved, Map.class);
            event.put("type", "message_edited");
            event.put("content", plaintextContent);
            String json = objectMapper.writeValueAsString(event);
            return redisTemplate.convertAndSend("chat.room." + saved.getRoomId(), json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    public Mono<Long> publishMessageDeleted(String messageId, String roomId) {
        try {
            String json = objectMapper.writeValueAsString(
                    Map.of("type", "message_deleted", "id", messageId, "roomId", roomId));
            return redisTemplate.convertAndSend("chat.room." + roomId, json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }
}
