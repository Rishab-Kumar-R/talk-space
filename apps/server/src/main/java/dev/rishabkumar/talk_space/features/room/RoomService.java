package dev.rishabkumar.talk_space.features.room;

import dev.rishabkumar.talk_space.features.audit.Audited;
import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.messaging.MessageRepository;
import dev.rishabkumar.talk_space.shared.util.DmRoomUtils;
import dev.rishabkumar.talk_space.features.presence.PresenceService;
import dev.rishabkumar.talk_space.shared.security.EncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private static final int MAX_PINS = 5;

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final EncryptionService encryptionService;
    private final PresenceService presenceService;
    private final ReactiveMongoTemplate mongoTemplate;

    @Value("${rate-limit.private-rooms-per-month:2}")
    private int privateRoomsPerMonth;

    @Value("${rate-limit.public-rooms-per-month:5}")
    private int publicRoomsPerMonth;

    public RoomService(RoomRepository roomRepository,
                       MessageRepository messageRepository,
                       EncryptionService encryptionService,
                       PresenceService presenceService,
                       ReactiveMongoTemplate mongoTemplate) {
        this.roomRepository = roomRepository;
        this.messageRepository = messageRepository;
        this.encryptionService = encryptionService;
        this.presenceService = presenceService;
        this.mongoTemplate = mongoTemplate;
    }

    public Flux<Room> listAccessible(String username) {
        // Push the filter to MongoDB — avoids loading every room into memory
        Query query = new Query(new Criteria().orOperator(
                Criteria.where("isPrivate").is(false),
                Criteria.where("memberRoles." + username).exists(true)
        ));
        return mongoTemplate.find(query, Room.class);
    }

    public Flux<PublicRoomSummary> listPublic() {
        return roomRepository.findAll()
                .filter(room -> !room.isPrivate())
                .flatMap(room -> {
                    Mono<Long> onlineCount = presenceService.getOnline(room.getName()).count();
                    Mono<String[]> lastMsgData = messageRepository
                            .findFirstByRoomIdOrderByTimestampDesc(room.getName())
                            .map(msg -> new String[]{
                                    truncate(msg.getContent() != null
                                            ? encryptionService.decrypt(msg.getContent()) : null, 80),
                                    msg.getTimestamp().toString()
                            })
                            .defaultIfEmpty(new String[]{null, null});
                    return Mono.zip(onlineCount, lastMsgData)
                            .map(t -> new PublicRoomSummary(
                                    room.getName(), room.getCreatedBy(), room.getCreatedAt().toString(),
                                    t.getT1(), t.getT2()[0], t.getT2()[1]));
                });
    }

    private String truncate(String text, int max) {
        if (text == null) return null;
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }

    @Audited(action = "ROOM_CREATED", resourceType = "room", resourceId = "#name")
    public Mono<Room> create(String name, boolean isPrivate, String createdBy) {
        if (name == null || name.isBlank())
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name required"));
        if (name.length() > 50)
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name too long (max 50 chars)"));
        if (!name.matches("^[a-zA-Z0-9._-]+$"))
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name may only contain letters, numbers, dots, hyphens, underscores"));

        return checkMonthlyRoomLimit(createdBy, isPrivate)
                .then(roomRepository.existsByName(name))
                .flatMap(exists -> {
                    if (exists) return Mono.error(
                            new ResponseStatusException(HttpStatus.CONFLICT, "Room already exists"));
                    Room room = new Room(name, createdBy);
                    room.setPrivate(isPrivate);
                    return roomRepository.save(room);
                })
                .doOnSuccess(room -> log.info("Room created name={} private={} by={}", name, isPrivate, createdBy));
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

    @Audited(action = "ROOM_MEMBER_INVITED", resourceType = "room", resourceId = "#roomId")
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

    @Audited(action = "ROOM_MEMBER_REMOVED", resourceType = "room", resourceId = "#roomId")
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

    public Mono<Room> pin(String roomId, String callerUsername, String messageId) {
        Mono<Void> ensureDm = DmRoomUtils.isDm(roomId)
                ? ensureDmRoom(roomId, callerUsername, DmRoomUtils.partner(roomId, callerUsername)).then()
                : Mono.empty();
        return ensureDm.then(roomRepository.findByName(roomId))
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    if (!room.getMemberRoles().containsKey(callerUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));
                    return messageRepository.findById(messageId)
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
                            });
                });
    }

    /**
     * Idempotently creates a DM room document so pinning and other room-scoped features work.
     */
    public Mono<Room> ensureDmRoom(String roomId, String user1, String user2) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.defer(() -> {
                    Room room = new Room(roomId, user1);
                    room.setPrivate(true);
                    Map<String, String> roles = new HashMap<>(room.getMemberRoles());
                    roles.put(user1, "member");
                    roles.put(user2, "member");
                    room.setMemberRoles(roles);
                    return roomRepository.save(room);
                }));
    }

    public Mono<Room> updateDescription(String roomId, String callerUsername, String description) {
        if (description != null && description.length() > 500)
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description too long (max 500 chars)"));
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    room.setDescription(description);
                    return roomRepository.save(room);
                });
    }

    public Mono<Room> unpin(String roomId, String callerUsername, String messageId) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")))
                .flatMap(room -> {
                    if (!room.getMemberRoles().containsKey(callerUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));
                    List<String> pins = new ArrayList<>(room.getPinnedMessageIds());
                    pins.remove(messageId);
                    room.setPinnedMessageIds(pins);
                    return roomRepository.save(room);
                });
    }

    private Mono<Void> checkMonthlyRoomLimit(String username, boolean isPrivate) {
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        Instant start = current.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = current.atEndOfMonth().atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        int limit = isPrivate ? privateRoomsPerMonth : publicRoomsPerMonth;
        String type = isPrivate ? "private" : "public";

        return roomRepository.countByCreatedByAndIsPrivateAndCreatedAtBetween(username, isPrivate, start, end)
                .flatMap(count -> {
                    if (count >= limit) {
                        log.warn("Monthly {} room limit={} reached for user={}", type, limit, username);
                        return Mono.error(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                                "Monthly limit of " + limit + " " + type + " rooms reached"));
                    }
                    return Mono.empty();
                });
    }

    public Flux<Message> getPinned(String roomId) {
        return roomRepository.findByName(roomId)
                .switchIfEmpty(Mono.just(new Room("", ""))) // DM rooms may not have a persisted document yet
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
