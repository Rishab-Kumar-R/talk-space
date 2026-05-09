package dev.rishabkumar.talk_space.features.scheduling;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;


public interface ScheduledMessageRepository extends ReactiveMongoRepository<ScheduledMessage, String> {

    Flux<ScheduledMessage> findBySenderUsernameAndSentFalseAndCancelledFalseOrderByScheduledForAsc(String senderUsername);

}
