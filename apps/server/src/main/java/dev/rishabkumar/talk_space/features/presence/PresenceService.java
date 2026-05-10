package dev.rishabkumar.talk_space.features.presence;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Service
public class PresenceService {

    private static final Duration TTL = Duration.ofSeconds(90);
    private static final String GLOBAL_KEY = "presence.global";

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public PresenceService(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Mark user online in a room and globally; refreshes TTL.
     */
    public Mono<Void> join(String roomId, String username) {
        String userRoomKey = userRoomKey(roomId, username);
        String userGlobalKey = userGlobalKey(username);
        return redisTemplate.opsForValue().set(userRoomKey, "1", TTL)
                .then(redisTemplate.opsForValue().set(userGlobalKey, "1", TTL))
                .then();
    }

    /**
     * Remove user from room and global presence immediately.
     */
    public Mono<Void> leave(String roomId, String username) {
        return redisTemplate.delete(userRoomKey(roomId, username))
                .then(redisTemplate.delete(userGlobalKey(username)))
                .then();
    }

    /**
     * Refresh the TTL without changing value (heartbeat).
     */
    public Mono<Void> heartbeat(String roomId, String username) {
        return redisTemplate.expire(userRoomKey(roomId, username), TTL)
                .then(redisTemplate.expire(userGlobalKey(username), TTL))
                .then();
    }

    /**
     * Returns online usernames for a room by scanning presence keys.
     */
    public Flux<String> getOnline(String roomId) {
        String pattern = "presence.room." + roomId + ".*";
        return redisTemplate.keys(pattern)
                .map(key -> key.substring(("presence.room." + roomId + ".").length()));
    }

    /**
     * Returns all globally online usernames.
     */
    public Flux<String> getOnlineGlobal() {
        return redisTemplate.keys("presence.user.*")
                .map(key -> key.substring("presence.user.".length()));
    }

    private String userRoomKey(String roomId, String username) {
        return "presence.room." + roomId + "." + username;
    }

    private String userGlobalKey(String username) {
        return "presence.user." + username;
    }
}
