package dev.rishabkumar.talk_space.features.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method for audit logging. The AuditAspect intercepts it, resolves the
 * caller's username from the reactive security context, and persists an AuditEvent.
 *
 * <p>{@code resourceId} accepts a SpEL expression evaluated against the method's
 * parameter list — e.g. {@code "#messageId"} or {@code "#roomId + '/' + #username"}.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    /**
     * Short action name stored verbatim — e.g. MESSAGE_DELETED, ROOM_CREATED.
     */
    String action();

    /**
     * Domain entity type — e.g. "message", "room", "bookmark".
     */
    String resourceType() default "";

    /**
     * SpEL expression resolving to the affected resource's identifier.
     */
    String resourceId() default "";
}
