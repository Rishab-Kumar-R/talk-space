package dev.rishabkumar.talk_space.features.user;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveMongoRepository<User, String> {
    Mono<User> findByUsername(String username);
    Mono<User> findByProviderAndProviderId(String provider, String providerId);

    @Query("{ $and: [ { username: { $regex: ?0, $options: 'i' } }, { username: { $ne: ?1 } } ] }")
    Flux<User> searchByUsernameExcluding(String query, String excludeUsername, Pageable pageable);
}
