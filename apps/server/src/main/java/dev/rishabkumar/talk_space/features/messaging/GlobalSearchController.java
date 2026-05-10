package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.features.room.RoomService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Comparator;

@RestController
@RequestMapping("/api/messages")
public class GlobalSearchController {

    private final MessageService messageService;
    private final RoomService roomService;

    @Value("${chat.search.hits-per-room:3}")
    private int hitsPerRoom;

    @Value("${chat.search.room-concurrency:5}")
    private int roomConcurrency;

    public GlobalSearchController(MessageService messageService, RoomService roomService) {
        this.messageService = messageService;
        this.roomService = roomService;
    }

    private static final int MAX_SEARCH_LIMIT = 50;

    @GetMapping("/search")
    public Flux<Message> searchGlobal(
            @RequestParam String q,
            @RequestParam(defaultValue = "25") int limit) {
        final int effectiveLimit = Math.min(limit, MAX_SEARCH_LIMIT);
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(username ->
                        roomService.listAccessible(username)
                                // Search rooms in bounded parallel batches — prevents fan-out overload
                                // when a user has access to many rooms
                                .flatMap(room -> messageService.search(room.getName(), q, hitsPerRoom),
                                        roomConcurrency)
                                .sort(Comparator.comparing(Message::getTimestamp).reversed())
                                .take(effectiveLimit)
                );
    }
}
