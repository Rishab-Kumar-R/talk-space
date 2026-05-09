package dev.rishabkumar.talk_space.features.notifications;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface NotificationPreferencesRepository extends ReactiveMongoRepository<NotificationPreferences, String> {
    Mono<NotificationPreferences> findByUsername(String username);
}
