package dev.rishabkumar.talk_space.features.auth;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface RefreshTokenRepository extends ReactiveMongoRepository<RefreshToken, String> {
    Mono<RefreshToken> findByToken(String token);
    Mono<Void> deleteByUsername(String username);
    Mono<Void> deleteByToken(String token);
}
