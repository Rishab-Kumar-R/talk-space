package dev.rishabkumar.talk_space.features.scheduling;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduled")
public class ScheduledMessageController {

    private final ScheduledMessageService service;

    public ScheduledMessageController(ScheduledMessageService service) {
        this.service = service;
    }

    @PostMapping
    public Mono<ScheduledMessage> create(@RequestBody Map<String, String> body) {
        String content = body.get("content");
        String roomId = body.get("roomId");
        String scheduledForStr = body.get("scheduledFor");
        Instant scheduledFor = Instant.parse(scheduledForStr);

        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .flatMap(auth -> service.create(auth.getName(), auth.getName(), roomId, content, scheduledFor));
    }

    @GetMapping
    public Flux<ScheduledMessage> list() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(service::listForUser);
    }

    @DeleteMapping("/{id}")
    public Mono<Void> cancel(@PathVariable String id) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> service.cancel(id, username));
    }

    @PatchMapping("/{id}")
    public Mono<ScheduledMessage> reschedule(@PathVariable String id,
                                              @RequestBody Map<String, String> body) {
        Instant newTime = Instant.parse(body.get("scheduledFor"));
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> service.reschedule(id, username, newTime));
    }
}
