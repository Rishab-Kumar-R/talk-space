package dev.rishabkumar.talk_space.features.bookmark;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookmarkRepository extends ReactiveMongoRepository<Bookmark, String> {
    Flux<Bookmark> findByUsernameOrderBySavedAtDesc(String username);
    Mono<Bookmark> findByUsernameAndMessageId(String username, String messageId);
    Mono<Void> deleteByUsernameAndMessageId(String username, String messageId);
}
