package dev.rishabkumar.talk_space.features.presence;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class PresenceService {

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public PresenceService(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Mono<Long> join(String roomId, String username) {
        return redisTemplate.opsForSet().add(key(roomId), username);
    }

    public Mono<Long> leave(String roomId, String username) {
        return redisTemplate.opsForSet().remove(key(roomId), username);
    }

    public Flux<String> getOnline(String roomId) {
        return redisTemplate.opsForSet().members(key(roomId));
    }

    private String key(String roomId) {
        return "presence.room." + roomId;
    }
}
