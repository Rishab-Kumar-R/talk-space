package dev.rishabkumar.talk_space.features.room;

import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.messaging.MessageRepository;
import dev.rishabkumar.talk_space.shared.security.EncryptionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoomService {

    private static final int MAX_PINS = 5;

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final EncryptionService encryptionService;

    public RoomService(RoomRepository roomRepository,
                       MessageRepository messageRepository,
                       EncryptionService encryptionService) {
        this.roomRepository = roomRepository;
        this.messageRepository = messageRepository;
        this.encryptionService = encryptionService;
    }

    public Flux<Room> listAccessible(String username) {
        return roomRepository.findAll()
                .filter(room -> !room.isPrivate() || room.getMemberRoles().containsKey(username));
    }

    public Mono<Room> create(String name, boolean isPrivate, String createdBy) {
        if (name == null || name.isBlank())
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name required"));
        if (name.length() > 50)
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name too long (max 50 chars)"));
        if (!name.matches("^[a-zA-Z0-9._-]+$"))
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name may only contain letters, numbers, dots, hyphens, underscores"));

        return roomRepository.existsByName(name)
                .flatMap(exists -> {
                    if (exists) return Mono.error(
                            new ResponseStatusException(HttpStatus.CONFLICT, "Room already exists"));
                    Room room = new Room(name, createdBy);
                    room.setPrivate(isPrivate);
                    return roomRepository.save(room);
                });
    }

    public Mono<Map<String, String>> getMembers(String roomId, String callerUsername) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .map(room -> {
                    if (room.isPrivate() && !room.getMemberRoles().containsKey(callerUsername))
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member");
                    return room.getMemberRoles();
                });
    }

    public Mono<Room> invite(String roomId, String callerUsername, String targetUsername) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    if (!"admin".equals(room.getMemberRoles().get(callerUsername)))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only"));
                    Map<String, String> roles = new HashMap<>(room.getMemberRoles());
                    roles.putIfAbsent(targetUsername, "member");
                    room.setMemberRoles(roles);
                    return roomRepository.save(room);
                });
    }

    public Mono<Room> removeMember(String roomId, String callerUsername, String targetUsername) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    boolean isSelf = callerUsername.equals(targetUsername);
                    boolean isAdmin = "admin".equals(room.getMemberRoles().get(callerUsername));
                    if (!isSelf && !isAdmin)
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only"));
                    if ("admin".equals(room.getMemberRoles().get(targetUsername)) && !isSelf)
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot remove an admin"));
                    Map<String, String> roles = new HashMap<>(room.getMemberRoles());
                    roles.remove(targetUsername);
                    room.setMemberRoles(roles);
                    return roomRepository.save(room);
                });
    }

    public Mono<Room> pin(String roomId, String messageId) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> messageRepository.findById(messageId)
                        .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                        .flatMap(msg -> {
                            List<String> pins = new ArrayList<>(room.getPinnedMessageIds());
                            if (pins.contains(messageId)) return Mono.just(room);
                            if (pins.size() >= MAX_PINS) return Mono.error(
                                    new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                            "Maximum " + MAX_PINS + " pinned messages allowed"));
                            pins.add(messageId);
                            room.setPinnedMessageIds(pins);
                            return roomRepository.save(room);
                        }));
    }

    public Mono<Room> unpin(String roomId, String messageId) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    List<String> pins = new ArrayList<>(room.getPinnedMessageIds());
                    pins.remove(messageId);
                    room.setPinnedMessageIds(pins);
                    return roomRepository.save(room);
                });
    }

    public Flux<Message> getPinned(String roomId) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMapMany(room -> {
                    if (room.getPinnedMessageIds().isEmpty()) return Flux.empty();
                    return Flux.fromIterable(room.getPinnedMessageIds())
                            .flatMap(messageRepository::findById)
                            .map(msg -> {
                                if (msg.getContent() != null)
                                    msg.setContent(encryptionService.decrypt(msg.getContent()));
                                if (msg.getReplyPreview() != null)
                                    msg.setReplyPreview(encryptionService.decrypt(msg.getReplyPreview()));
                                return msg;
                            });
                });
    }
}
