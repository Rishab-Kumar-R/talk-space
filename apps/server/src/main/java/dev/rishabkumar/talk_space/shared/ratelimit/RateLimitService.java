package dev.rishabkumar.talk_space.shared.ratelimit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Service
public class RateLimitService {

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public RateLimitService(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Increments the counter for the given key and returns whether the request is within the limit.
     * The TTL is set on the first increment to enforce a sliding-start window.
     */
    public Mono<Boolean> isAllowed(String key, int limit, long windowSeconds) {
        return redisTemplate.opsForValue()
                .increment(key)
                .flatMap(count -> {
                    if (count == 1) {
                        return redisTemplate.expire(key, Duration.ofSeconds(windowSeconds))
                                .thenReturn(true);
                    }
                    return Mono.just(count <= limit);
                });
    }
}
