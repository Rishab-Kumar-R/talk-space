package dev.rishabkumar.talk_space.features.readreceipt;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReadReceiptRepository extends ReactiveMongoRepository<ReadReceipt, String> {
    Flux<ReadReceipt> findByMessageId(String messageId);
    Mono<Boolean> existsByMessageIdAndUsername(String messageId, String username);
}
