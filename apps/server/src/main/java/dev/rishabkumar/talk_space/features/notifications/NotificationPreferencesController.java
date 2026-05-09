package dev.rishabkumar.talk_space.features.notifications;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping("/api/users/me/notification-prefs")
public class NotificationPreferencesController {

    private final NotificationPreferencesRepository repo;

    public NotificationPreferencesController(NotificationPreferencesRepository repo) {
        this.repo = repo;
    }

    private Mono<String> currentUser() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName());
    }

    private Mono<NotificationPreferences> getOrCreate(String username) {
        return repo.findByUsername(username)
                .switchIfEmpty(Mono.just(new NotificationPreferences(username)));
    }

    @GetMapping
    public Mono<NotificationPreferences> get() {
        return currentUser().flatMap(this::getOrCreate);
    }

    @PutMapping
    public Mono<NotificationPreferences> update(@RequestBody Map<String, Object> body) {
        return currentUser().flatMap(username -> getOrCreate(username).flatMap(prefs -> {
            if (body.containsKey("dndStart")) prefs.setDndStart((String) body.get("dndStart"));
            if (body.containsKey("dndEnd"))   prefs.setDndEnd((String) body.get("dndEnd"));
            return repo.save(prefs);
        }));
    }

    @PostMapping("/mute/{roomId}")
    public Mono<NotificationPreferences> mute(@PathVariable String roomId) {
        return currentUser().flatMap(username -> getOrCreate(username).flatMap(prefs -> {
            if (!prefs.getMutedRooms().contains(roomId)) prefs.getMutedRooms().add(roomId);
            return repo.save(prefs);
        }));
    }

    @DeleteMapping("/mute/{roomId}")
    public Mono<NotificationPreferences> unmute(@PathVariable String roomId) {
        return currentUser().flatMap(username -> getOrCreate(username).flatMap(prefs -> {
            prefs.getMutedRooms().remove(roomId);
            return repo.save(prefs);
        }));
    }
}
