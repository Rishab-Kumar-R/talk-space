package dev.rishabkumar.talk_space.features.messaging;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

public interface MessageRepository extends ReactiveMongoRepository<Message, String> {
    Flux<Message> findByRoomIdOrderByTimestampDesc(String roomId, Pageable pageable);
    Flux<Message> findByRoomIdAndTimestampBeforeOrderByTimestampDesc(String roomId, Instant before, Pageable pageable);
    Flux<Message> findByRoomIdOrderByTimestampDesc(String roomId);
    Mono<Long> countByRoomIdAndTimestampAfter(String roomId, Instant after);
    Mono<Message> findFirstByRoomIdOrderByTimestampDesc(String roomId);
}
