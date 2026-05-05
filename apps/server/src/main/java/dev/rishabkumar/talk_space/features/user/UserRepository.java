package dev.rishabkumar.talk_space.features.user;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveMongoRepository<User, String> {
    Mono<User> findByUsername(String username);
    Mono<User> findByProviderAndProviderId(String provider, String providerId);
    Flux<User> findByUsernameContainingIgnoreCaseAndUsernameNot(
            String query, String excludeUsername, Pageable pageable);
}
