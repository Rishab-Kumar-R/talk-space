package dev.rishabkumar.talk_space.shared.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class AppMetrics {

    public final AtomicInteger wsConnections = new AtomicInteger(0);

    public final Counter messagesTotal;
    public final Timer  encryptionTimer;
    public final Timer  redisPublishTimer;
    public final Counter uploadBytesTotal;

    public AppMetrics(MeterRegistry registry) {
        Gauge.builder("talkspace.websocket.connections.active", wsConnections, AtomicInteger::get)
                .description("Active WebSocket connections")
                .register(registry);

        messagesTotal = Counter.builder("talkspace.messages.sent.total")
                .description("Total messages sent")
                .register(registry);

        encryptionTimer = Timer.builder("talkspace.messages.encrypted.duration")
                .description("AES-256-GCM encryption latency per message")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        redisPublishTimer = Timer.builder("talkspace.redis.publish.duration")
                .description("Redis pub/sub publish latency")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        uploadBytesTotal = Counter.builder("talkspace.upload.bytes.total")
                .description("Total bytes uploaded to S3")
                .register(registry);
    }
}
