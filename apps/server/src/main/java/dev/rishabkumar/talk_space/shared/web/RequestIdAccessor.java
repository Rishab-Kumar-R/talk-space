package dev.rishabkumar.talk_space.shared.web;

import io.micrometer.context.ThreadLocalAccessor;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/**
 * Bridges the requestId stored in the Reactor context into SLF4J MDC so that
 * %X{requestId} is available in log patterns on every scheduler thread hop.
 * Spring Boot auto-discovers ThreadLocalAccessor beans via context-propagation.
 */
@Component
public class RequestIdAccessor implements ThreadLocalAccessor<String> {

    private static final String MDC_KEY = "requestId";

    @Override
    public Object key() {
        return MdcWebFilter.REQUEST_ID_KEY;
    }

    @Override
    public String getValue() {
        return MDC.get(MDC_KEY);
    }

    @Override
    public void setValue(String value) {
        MDC.put(MDC_KEY, value);
    }

    @Override
    public void setValue() {
        MDC.remove(MDC_KEY);
    }
}
