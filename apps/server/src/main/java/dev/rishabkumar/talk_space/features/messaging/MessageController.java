package dev.rishabkumar.talk_space.features.messaging;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/rooms/{roomId}/messages")
    public Flux<Message> getMessages(
            @PathVariable String roomId,
            @RequestParam(required = false) String before,
            @RequestParam(defaultValue = "30") int limit) {
        return messageService.getMessages(roomId, before, limit);
    }

    @GetMapping("/rooms/{roomId}/messages/search")
    public Flux<Message> searchMessages(
            @PathVariable String roomId,
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {
        return messageService.search(roomId, q, limit);
    }

    @GetMapping("/rooms/{roomId}/messages/{messageId}/thread")
    public Flux<Message> getThread(@PathVariable String roomId, @PathVariable String messageId) {
        return messageService.getThread(messageId);
    }

    @GetMapping("/messages/mentions")
    public Flux<Message> getMentions(
            @RequestParam(defaultValue = "50") int limit) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(username -> messageService.getMentions(username, limit));
    }

    @PostMapping("/messages/{messageId}/reactions")
    public Mono<Message> toggleReaction(
            @PathVariable String messageId,
            @RequestBody Map<String, String> body) {
        String emoji = body.get("emoji");
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> messageService.toggleReaction(messageId, emoji, username));
    }

    @PatchMapping("/messages/{messageId}")
    public Mono<Message> editMessage(
            @PathVariable String messageId,
            @RequestBody Map<String, String> body) {
        String newContent = body.get("content");
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> messageService.edit(messageId, newContent, username));
    }

    @DeleteMapping("/messages/{messageId}")
    public Mono<Void> deleteMessage(@PathVariable String messageId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> messageService.delete(messageId, username));
    }
}
