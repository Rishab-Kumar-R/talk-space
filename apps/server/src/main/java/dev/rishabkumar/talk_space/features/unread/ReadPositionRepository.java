package dev.rishabkumar.talk_space.features.unread;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReadPositionRepository extends ReactiveMongoRepository<ReadPosition, String> {
    Mono<ReadPosition> findByUsernameAndRoomId(String username, String roomId);
    Flux<ReadPosition> findByUsername(String username);
}
