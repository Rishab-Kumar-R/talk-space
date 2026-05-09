package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.features.room.RoomService;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Comparator;

@RestController
@RequestMapping("/api/messages")
public class GlobalSearchController {

    private final MessageService messageService;
    private final RoomService roomService;

    public GlobalSearchController(MessageService messageService, RoomService roomService) {
        this.messageService = messageService;
        this.roomService = roomService;
    }

    @GetMapping("/search")
    public Flux<Message> searchGlobal(
            @RequestParam String q,
            @RequestParam(defaultValue = "25") int limit) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(username ->
                        roomService.listAccessible(username)
                                // up to 5 hits per room to keep it fast
                                .flatMap(room -> messageService.search(room.getName(), q, 5))
                                .sort(Comparator.comparing(Message::getTimestamp).reversed())
                                .take(limit)
                );
    }
}
