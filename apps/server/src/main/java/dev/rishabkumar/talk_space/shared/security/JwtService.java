package dev.rishabkumar.talk_space.shared.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public JwtService(@Qualifier("reactiveStringRedisTemplate")
                      ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean isValid(String token) {
        try {
            extractUsername(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Adds the token to a Redis blocklist so it is rejected before its natural expiry.
     */
    public Mono<Void> blocklist(String token) {
        try {
            Date expiry = Jwts.parser().verifyWith(getSigningKey()).build()
                    .parseSignedClaims(token).getPayload().getExpiration();
            long ttlSeconds = Math.max(1, (expiry.getTime() - System.currentTimeMillis()) / 1000);
            return redisTemplate.opsForValue()
                    .set("jwt:block:" + token, "1", Duration.ofSeconds(ttlSeconds))
                    .then();
        } catch (Exception e) {
            return Mono.empty();
        }
    }

    public Mono<Boolean> isBlocklisted(String token) {
        return redisTemplate.hasKey("jwt:block:" + token)
                .onErrorReturn(false);
    }
}
