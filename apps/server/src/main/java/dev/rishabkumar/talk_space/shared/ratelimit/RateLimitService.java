package dev.rishabkumar.talk_space.shared.ratelimit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

@Service
public class RateLimitService {

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public RateLimitService(
            @Qualifier("reactiveStringRedisTemplate") ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Fixed-window rate limiter. The window boundary is aligned to clock time
     * (e.g. every 60s from epoch), so a burst at the end of one window cannot
     * be doubled by starting the next window immediately after.
     * <p>
     * The key is bucketed by the current time window so each window gets a
     * fresh counter. TTL is set to 2× the window so Redis cleans up stale keys.
     */
    public Mono<Boolean> isAllowed(String key, int limit, long windowSeconds) {
        long bucket = Instant.now().getEpochSecond() / windowSeconds;
        String bucketedKey = key + ":" + bucket;
        return redisTemplate.opsForValue()
                .increment(bucketedKey)
                .flatMap(count -> {
                    if (count == 1) {
                        return redisTemplate.expire(bucketedKey, Duration.ofSeconds(windowSeconds * 2))
                                .thenReturn(true);
                    }
                    return Mono.just(count <= limit);
                });
    }
}
