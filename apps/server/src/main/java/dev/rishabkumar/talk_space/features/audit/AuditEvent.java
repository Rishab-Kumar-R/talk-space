package dev.rishabkumar.talk_space.features.audit;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "audit_events")
public class AuditEvent {

    @Id
    private String id;

    @Indexed
    private String username;

    @Indexed
    private String action;

    private String resourceType;
    private String resourceId;

    /**
     * SUCCESS or FAILURE
     */
    private String outcome;

    /**
     * Populated on FAILURE — the exception message.
     */
    private String errorMessage;

    private long durationMs;

    @Indexed
    private Instant timestamp;

    public AuditEvent() {
    }

    public AuditEvent(String username, String action, String resourceType,
                      String resourceId, String outcome, String errorMessage, long durationMs) {
        this.username = username;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.outcome = outcome;
        this.errorMessage = errorMessage;
        this.durationMs = durationMs;
        this.timestamp = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getAction() {
        return action;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public String getOutcome() {
        return outcome;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
