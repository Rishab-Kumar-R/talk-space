package dev.rishabkumar.talk_space.features.user;

import dev.rishabkumar.talk_space.features.user.dto.UserProfile;
import dev.rishabkumar.talk_space.features.user.dto.UserSummary;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Set;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Flux<UserSummary> search(String query, String currentUser) {
        return userRepository
                .findByUsernameContainingIgnoreCaseAndUsernameNot(query, currentUser, PageRequest.of(0, 10))
                .map(u -> new UserSummary(u.getId(), u.getUsername(), u.getStatus(), u.getStatusText()));
    }

    public Mono<UserProfile> getProfile(String username) {
        return userRepository.findByUsername(username)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .map(UserService::toProfile);
    }

    public Mono<UserProfile> updateProfile(String username, Map<String, Object> updates) {
        return userRepository.findByUsername(username)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(user -> {
                    if (updates.containsKey("displayName")) user.setDisplayName((String) updates.get("displayName"));
                    if (updates.containsKey("avatarColor")) user.setAvatarColor((String) updates.get("avatarColor"));
                    if (updates.containsKey("showReadReceipts"))
                        user.setShowReadReceipts((Boolean) updates.get("showReadReceipts"));
                    if (updates.containsKey("status")) {
                        String s = (String) updates.get("status");
                        if (Set.of("available", "away", "dnd").contains(s)) user.setStatus(s);
                    }
                    if (updates.containsKey("statusText")) user.setStatusText((String) updates.get("statusText"));
                    return userRepository.save(user);
                })
                .map(UserService::toProfile);
    }

    public static UserProfile toProfile(User u) {
        return new UserProfile(u.getId(), u.getUsername(), u.getDisplayName(),
                u.getAvatarColor(), u.isShowReadReceipts(), u.getStatus(), u.getStatusText());
    }
}
