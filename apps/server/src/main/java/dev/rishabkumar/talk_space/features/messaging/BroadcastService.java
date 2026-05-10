package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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

    public Mono<Long> publishReactionUpdated(Message saved) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "reaction_updated");
            event.put("id", saved.getId());
            event.put("reactions", saved.getReactions());
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

    public Mono<Long> publishPollUpdated(Message saved) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "poll_updated");
            event.put("id", saved.getId());
            event.put("pollVotes", saved.getPollVotes());
            String json = objectMapper.writeValueAsString(event);
            return redisTemplate.convertAndSend("chat.room." + saved.getRoomId(), json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    /**
     * Broadcasts an ephemeral system message (join/leave) — not persisted to MongoDB.
     */
    public Mono<Long> publishSystemMessage(String roomId, String text) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "message");
            event.put("id", "sys-" + UUID.randomUUID());
            event.put("roomId", roomId);
            event.put("senderUsername", "system");
            event.put("messageType", "system");
            event.put("content", text);
            event.put("timestamp", Instant.now().toString());
            String json = objectMapper.writeValueAsString(event);
            return redisTemplate.convertAndSend("chat.room." + roomId, json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    /**
     * Pushes an unread_bump event to a specific user's personal notification channel.
     */
    public Mono<Long> publishUnreadBump(String roomId, String recipientUsername) {
        try {
            String json = objectMapper.writeValueAsString(
                    Map.of("type", "unread_bump", "roomId", roomId));
            return redisTemplate.convertAndSend("notify.user." + recipientUsername, json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    /**
     * Notifies a specific user that they have been removed from a room.
     */
    public Mono<Long> publishRoomRemoved(String roomId, String removedUsername) {
        try {
            String json = objectMapper.writeValueAsString(
                    Map.of("type", "room_removed", "roomId", roomId));
            return redisTemplate.convertAndSend("notify.user." + removedUsername, json);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }
}
