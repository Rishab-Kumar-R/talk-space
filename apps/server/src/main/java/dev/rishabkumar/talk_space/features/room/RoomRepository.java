package dev.rishabkumar.talk_space.features.room;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

import java.time.Instant;

public interface RoomRepository extends ReactiveMongoRepository<Room, String> {
    Mono<Boolean> existsByName(String name);
    Mono<Room> findByName(String name);
    Mono<Long> countByCreatedByAndIsPrivateAndCreatedAtBetween(String createdBy, boolean isPrivate, Instant start, Instant end);
}
