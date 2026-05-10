package dev.rishabkumar.talk_space.shared.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Attaches a short requestId to every HTTP request and writes it into the Reactor
 * context so the RequestIdAccessor can bridge it into SLF4J MDC on each scheduler thread.
 * The traceId/spanId are handled automatically by micrometer-tracing-bridge-otel.
 */
@Component
@Order(-100)
public class MdcWebFilter implements WebFilter {

    private static final Logger log = LoggerFactory.getLogger(MdcWebFilter.class);
    static final String REQUEST_ID_KEY = "requestId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String method = exchange.getRequest().getMethod().name();
        String path = exchange.getRequest().getPath().value();

        return chain.filter(exchange)
                .contextWrite(ctx -> ctx.put(REQUEST_ID_KEY, requestId))
                .doOnSubscribe(s -> log.debug("→ {} {}", method, path))
                .doFinally(signal -> {
                    var status = exchange.getResponse().getStatusCode();
                    log.debug("<- {} {} {}", method, path, status != null ? status.value() : "-");
                });
    }
}
