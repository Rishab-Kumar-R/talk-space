package dev.rishabkumar.talk_space.features.messaging;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.data.mongodb.repository.Update;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

public interface MessageRepository extends ReactiveMongoRepository<Message, String> {
    Flux<Message> findByRoomIdAndDeletedFalseOrderByTimestampDesc(String roomId, Pageable pageable);
    Flux<Message> findByRoomIdAndTimestampBeforeAndDeletedFalseOrderByTimestampDesc(String roomId, Instant before, Pageable pageable);
    Flux<Message> findByRoomIdAndDeletedFalseOrderByTimestampDesc(String roomId);
    Flux<Message> findByRoomIdOrderByTimestampDesc(String roomId, Pageable pageable);
    Flux<Message> findByRoomIdOrderByTimestampDesc(String roomId);
    Mono<Long> countByRoomIdAndTimestampAfter(String roomId, Instant after);
    Mono<Message> findFirstByRoomIdOrderByTimestampDesc(String roomId);
    Flux<Message> findByMentionsContainingOrderByTimestampDesc(String username, Pageable pageable);
    Flux<Message> findByThreadIdOrderByTimestampAsc(String threadId);

    @Query("{ '_id': ?0 }")
    @Update("{ '$inc': { 'threadCount': 1 } }")
    Mono<Long> incrementThreadCount(String messageId);
}
