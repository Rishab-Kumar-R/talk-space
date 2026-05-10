package dev.rishabkumar.talk_space.features.room;

import dev.rishabkumar.talk_space.features.messaging.BroadcastService;
import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.presence.PresenceService;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final PresenceService presenceService;
    private final BroadcastService broadcastService;

    public RoomController(RoomService roomService, PresenceService presenceService,
                          BroadcastService broadcastService) {
        this.roomService = roomService;
        this.presenceService = presenceService;
        this.broadcastService = broadcastService;
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

    @GetMapping("/presence/online")
    public Mono<List<String>> getGlobalPresence() {
        return presenceService.getOnlineGlobal().collectList();
    }

    @GetMapping("/{roomId}/presence")
    public Mono<List<String>> getPresence(@PathVariable String roomId) {
        return presenceService.getOnline(roomId).collectList();
    }

    @PostMapping("/presence/heartbeat")
    public Mono<Void> heartbeat(@RequestParam(required = false) String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    String room = roomId != null ? roomId : "__global__";
                    return presenceService.join(room, username);
                });
    }

    @GetMapping("/{roomId}/members")
    public Mono<Map<String, String>> getMembers(@PathVariable String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> roomService.getMembers(roomId, username));
    }

    @PatchMapping("/{roomId}")
    public Mono<Room> updateRoom(@PathVariable String roomId, @RequestBody Map<String, String> body) {
        String description = body.get("description");
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> roomService.updateDescription(roomId, username, description));
    }

    @PostMapping("/{roomId}/invite")
    public Mono<Room> inviteMember(@PathVariable String roomId, @RequestBody Map<String, String> body) {
        String targetUsername = body.get("username");
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.invite(roomId, caller, targetUsername)
                        .flatMap(room -> broadcastService
                                .publishSystemMessage(roomId, targetUsername + " joined the room")
                                .thenReturn(room)));
    }

    @DeleteMapping("/{roomId}/members/{username}")
    public Mono<Room> removeMember(@PathVariable String roomId, @PathVariable String username) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.removeMember(roomId, caller, username)
                        .flatMap(room -> broadcastService
                                .publishSystemMessage(roomId, username + " left the room")
                                .then(broadcastService.publishRoomRemoved(roomId, username))
                                .thenReturn(room)));
    }

    @PostMapping("/{roomId}/pin/{messageId}")
    public Mono<Room> pinMessage(@PathVariable String roomId, @PathVariable String messageId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.pin(roomId, caller, messageId));
    }

    @DeleteMapping("/{roomId}/pin/{messageId}")
    public Mono<Room> unpinMessage(@PathVariable String roomId, @PathVariable String messageId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(caller -> roomService.unpin(roomId, caller, messageId));
    }

    @GetMapping("/{roomId}/pinned")
    public Flux<Message> getPinnedMessages(@PathVariable String roomId) {
        return roomService.getPinned(roomId);
    }
}
