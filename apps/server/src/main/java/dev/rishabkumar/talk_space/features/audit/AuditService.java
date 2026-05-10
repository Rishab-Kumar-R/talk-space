package dev.rishabkumar.talk_space.features.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditRepository auditRepository;

    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    public Mono<AuditEvent> record(String username, String action, String resourceType,
                                   String resourceId, String outcome, String errorMessage,
                                   long durationMs) {
        AuditEvent event = new AuditEvent(username, action, resourceType,
                resourceId, outcome, errorMessage, durationMs);
        return auditRepository.save(event)
                .doOnSuccess(e -> log.debug("Audit recorded action={} user={} outcome={} durationMs={}",
                        action, username, outcome, durationMs))
                .doOnError(e -> log.error("Failed to persist audit event action={} user={}", action, username, e));
    }

    public Flux<AuditEvent> findByUser(String username, int limit) {
        return auditRepository.findByUsernameOrderByTimestampDesc(username, PageRequest.of(0, limit));
    }

    public Flux<AuditEvent> findByAction(String action, int limit) {
        return auditRepository.findByActionOrderByTimestampDesc(action, PageRequest.of(0, limit));
    }

    public Flux<AuditEvent> findRecent(int limit) {
        return auditRepository.findAllByOrderByTimestampDesc(PageRequest.of(0, limit));
    }
}
