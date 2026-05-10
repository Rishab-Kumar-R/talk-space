package dev.rishabkumar.talk_space.features.audit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;
    private final Set<String> admins;

    public AuditController(AuditService auditService,
                           @Value("${AUDIT_ADMIN_USERS:}") String adminUsers) {
        this.auditService = auditService;
        this.admins = Arrays.stream(adminUsers.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    /**
     * Current user's own audit trail.
     */
    @GetMapping("/me")
    public Flux<AuditEvent> myAudit(@RequestParam(defaultValue = "50") int limit) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(username -> auditService.findByUser(username, limit));
    }

    /**
     * Admin-only: recent events across all users.
     * Requires the caller's username to appear in the AUDIT_ADMIN_USERS env var
     * (comma-separated list). Passing ?username= or ?action= filters the results.
     */
    @GetMapping
    public Flux<AuditEvent> recent(@RequestParam(defaultValue = "100") int limit,
                                   @RequestParam(required = false) String username,
                                   @RequestParam(required = false) String action) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(caller -> {
                    if (!admins.contains(caller)) {
                        return Flux.error(new ResponseStatusException(
                                HttpStatus.FORBIDDEN, "Admin access required"));
                    }
                    if (username != null) return auditService.findByUser(username, limit);
                    if (action != null) return auditService.findByAction(action, limit);
                    return auditService.findRecent(limit);
                });
    }
}
