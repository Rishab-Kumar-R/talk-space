package dev.rishabkumar.talk_space.features.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${jwt.refresh-expiration:2592000000}")
    private long refreshExpiration;

    public RefreshTokenService(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    public Mono<RefreshToken> create(String username) {
        RefreshToken rt = new RefreshToken();
        rt.setToken(UUID.randomUUID().toString());
        rt.setUsername(username);
        rt.setCreatedAt(Instant.now());
        rt.setExpiresAt(Instant.now().plusMillis(refreshExpiration));
        return repository.save(rt);
    }

    public Mono<RefreshToken> validate(String token) {
        return repository.findByToken(token)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token")))
                .flatMap(rt -> {
                    if (rt.getExpiresAt().isBefore(Instant.now())) {
                        return repository.deleteByToken(token)
                                .then(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired")));
                    }
                    return Mono.just(rt);
                });
    }

    public Mono<RefreshToken> rotate(String oldToken, String username) {
        return repository.deleteByToken(oldToken)
                .then(create(username));
    }

    public Mono<Void> deleteByToken(String token) {
        return repository.deleteByToken(token);
    }

    public Mono<Void> deleteByUsername(String username) {
        return repository.deleteByUsername(username);
    }
}
