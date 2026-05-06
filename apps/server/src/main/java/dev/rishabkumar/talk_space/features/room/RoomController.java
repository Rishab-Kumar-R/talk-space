package dev.rishabkumar.talk_space.features.room;

import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.presence.PresenceService;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final PresenceService presenceService;

    public RoomController(RoomService roomService, PresenceService presenceService) {
        this.roomService = roomService;
        this.presenceService = presenceService;
    }

    @GetMapping("/public")
    public Flux<PublicRoomSummary> listPublicRooms() {
        return roomService.listPublic();
    }

    @GetMapping
    public Flux<Room> listRooms() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(roomService::listAccessible);
    }

    @PostMapping
    public Mono<Room> createRoom(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        boolean isPrivate = Boolean.TRUE.equals(body.get("isPrivate"));
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> roomService.create(name, isPrivate, username));
    }

    @GetMapping("/{roomId}/presence")
    public Flux<String> getPresence(@PathVariable String roomId) {
        return presenceService.getOnline(roomId);
    }

    @GetMapping("/{roomId}/members")
    public Mono<Map<String, String>> getMembers(@PathVariable String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> roomService.getMembers(roomId, username));
    }

    @PostMapping("/{roomId}/invite")
    public Mono<Room> inviteMember(@PathVariable String roomId, @RequestBody Map<String, String> body) {
        String targetUsername = body.get("username");
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.invite(roomId, caller, targetUsername));
    }

    @DeleteMapping("/{roomId}/members/{username}")
    public Mono<Room> removeMember(@PathVariable String roomId, @PathVariable String username) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.removeMember(roomId, caller, username));
    }

    @PostMapping("/{roomId}/pin/{messageId}")
    public Mono<Room> pinMessage(@PathVariable String roomId, @PathVariable String messageId) {
        return roomService.pin(roomId, messageId);
    }

    @DeleteMapping("/{roomId}/pin/{messageId}")
    public Mono<Room> unpinMessage(@PathVariable String roomId, @PathVariable String messageId) {
        return roomService.unpin(roomId, messageId);
    }

    @GetMapping("/{roomId}/pinned")
    public Flux<Message> getPinnedMessages(@PathVariable String roomId) {
        return roomService.getPinned(roomId);
    }
}
