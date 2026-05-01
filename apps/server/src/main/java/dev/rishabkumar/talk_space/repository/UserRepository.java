package dev.rishabkumar.talk_space.repository;

import dev.rishabkumar.talk_space.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveMongoRepository<User, String> {
    Mono<User> findByUsername(String username);
    Flux<User> findByUsernameContainingIgnoreCaseAndUsernameNot(
            String username, String excludeUsername, Pageable pageable);
}
