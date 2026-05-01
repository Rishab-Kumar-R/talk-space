package dev.rishabkumar.talk_space.controller;

import dev.rishabkumar.talk_space.model.Message;
import dev.rishabkumar.talk_space.repository.MessageRepository;
import dev.rishabkumar.talk_space.service.EncryptionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MessageController {

    private final MessageRepository messageRepository;
    private final EncryptionService encryptionService;

    public MessageController(MessageRepository messageRepository, EncryptionService encryptionService) {
        this.messageRepository = messageRepository;
        this.encryptionService = encryptionService;
    }

    private Message decryptMessage(Message msg) {
        if (msg.getContent() != null) {
            msg.setContent(encryptionService.decrypt(msg.getContent()));
        }
        if (msg.getReplyPreview() != null) {
            msg.setReplyPreview(encryptionService.decrypt(msg.getReplyPreview()));
        }
        return msg;
    }

    @GetMapping("/rooms/{roomId}/messages")
    public Flux<Message> getMessages(
            @PathVariable String roomId,
            @RequestParam(required = false) String before,
            @RequestParam(defaultValue = "30") int limit) {

        PageRequest page = PageRequest.of(0, limit);

        Flux<Message> query = before != null
                ? messageRepository.findByRoomIdAndTimestampBeforeOrderByTimestampDesc(
                        roomId, Instant.parse(before), page)
                : messageRepository.findByRoomIdOrderByTimestampDesc(roomId, page);

        return query.collectList()
                .flatMapMany(list -> {
                    Collections.reverse(list);
                    return Flux.fromIterable(list);
                })
                .map(this::decryptMessage);
    }

    @PostMapping("/messages/{messageId}/reactions")
    public Mono<Message> toggleReaction(
            @PathVariable String messageId,
            @RequestBody Map<String, String> body) {

        String emoji = body.get("emoji");
        if (emoji == null || emoji.isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "emoji required"));
        }

        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> (Authentication) ctx.getAuthentication())
                .flatMap(auth -> {
                    String username = auth.getName();
                    return messageRepository.findById(messageId)
                            .switchIfEmpty(Mono.error(
                                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                            .flatMap(msg -> {
                                var users = msg.getReactions()
                                        .computeIfAbsent(emoji, k -> new ArrayList<>());
                                if (users.contains(username)) users.remove(username);
                                else users.add(username);
                                if (users.isEmpty()) msg.getReactions().remove(emoji);
                                return messageRepository.save(msg);
                            })
                            .map(this::decryptMessage);
                });
    }
}
