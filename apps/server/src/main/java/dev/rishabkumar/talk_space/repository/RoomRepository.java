package dev.rishabkumar.talk_space.repository;

import dev.rishabkumar.talk_space.model.Room;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface RoomRepository extends ReactiveMongoRepository<Room, String> {
    Mono<Boolean> existsByName(String name);
}
