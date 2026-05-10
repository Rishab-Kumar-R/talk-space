package dev.rishabkumar.talk_space.features.audit;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface AuditRepository extends ReactiveMongoRepository<AuditEvent, String> {

    Flux<AuditEvent> findByUsernameOrderByTimestampDesc(String username, Pageable pageable);

    Flux<AuditEvent> findByActionOrderByTimestampDesc(String action, Pageable pageable);

    Flux<AuditEvent> findAllByOrderByTimestampDesc(Pageable pageable);
}
