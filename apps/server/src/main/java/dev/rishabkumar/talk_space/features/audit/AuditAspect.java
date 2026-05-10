package dev.rishabkumar.talk_space.features.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.lang.reflect.Method;
import java.time.Instant;

/**
 * Intercepts methods annotated with {@link Audited} and writes an {@link AuditEvent}
 * to MongoDB after the reactive pipeline completes (success or error).
 *
 * <p>Only {@code Mono}-returning methods are fully instrumented. {@code Flux} and
 * synchronous methods fall through without auditing (none are annotated today).
 */
@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private final AuditService auditService;
    private final ExpressionParser spelParser = new SpelExpressionParser();
    private final DefaultParameterNameDiscoverer nameDiscoverer = new DefaultParameterNameDiscoverer();

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        Instant start = Instant.now();
        Object result = pjp.proceed();

        if (!(result instanceof Mono<?> mono)) {
            // Non-reactive methods: fire-and-forget with anonymous username
            return result;
        }

        String resolvedResourceId = resolveSpel(audited.resourceId(), pjp);

        // Pull username from the reactive security context, then wrap the original Mono
        // so we record success/failure without altering its return value or error signal.
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty("anonymous")
                .flatMap(username -> mono
                        .doOnSuccess(r -> {
                            long ms = Instant.now().toEpochMilli() - start.toEpochMilli();
                            auditService.record(username, audited.action(), audited.resourceType(),
                                    resolvedResourceId, "SUCCESS", null, ms).subscribe();
                        })
                        .doOnError(e -> {
                            long ms = Instant.now().toEpochMilli() - start.toEpochMilli();
                            auditService.record(username, audited.action(), audited.resourceType(),
                                    resolvedResourceId, "FAILURE", e.getMessage(), ms).subscribe();
                        })
                );
    }

    /**
     * Evaluates a SpEL expression (e.g. {@code "#messageId"}) against the intercepted
     * method's actual argument values. Returns an empty string if the expression is
     * blank or evaluation fails.
     */
    private String resolveSpel(String expression, ProceedingJoinPoint pjp) {
        if (expression == null || expression.isBlank()) return "";
        try {
            Method method = ((MethodSignature) pjp.getSignature()).getMethod();
            String[] paramNames = nameDiscoverer.getParameterNames(method);
            Object[] args = pjp.getArgs();

            EvaluationContext ctx = new StandardEvaluationContext();
            if (paramNames != null) {
                for (int i = 0; i < paramNames.length; i++) {
                    ctx.setVariable(paramNames[i], args[i]);
                }
            }

            Object value = spelParser.parseExpression(expression).getValue(ctx);
            return value != null ? value.toString() : "";
        } catch (Exception e) {
            log.warn("AuditAspect: SpEL evaluation failed for expression='{}': {}", expression, e.getMessage());
            return "";
        }
    }
}
