package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.features.room.RoomRepository;
import dev.rishabkumar.talk_space.features.unread.ReadPosition;
import dev.rishabkumar.talk_space.features.unread.ReadPositionRepository;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class UnreadController {

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final ReadPositionRepository readPositionRepository;
    private final ReactiveMongoTemplate mongoTemplate;

    public UnreadController(
            MessageRepository messageRepository,
            RoomRepository roomRepository,
            ReadPositionRepository readPositionRepository,
            ReactiveMongoTemplate mongoTemplate) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.readPositionRepository = readPositionRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @PostMapping("/{roomId}/read")
    public Mono<Void> markRead(@PathVariable String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username ->
                        readPositionRepository.findByUsernameAndRoomId(username, roomId)
                                .switchIfEmpty(Mono.just(new ReadPosition(username, roomId)))
                                .flatMap(pos -> {
                                    pos.setLastReadAt(Instant.now());
                                    return readPositionRepository.save(pos);
                                })
                )
                .then();
    }

    @GetMapping("/unread")
    public Mono<Map<String, Long>> getUnreadCounts() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username ->
                        readPositionRepository.findByUsername(username)
                                .collectMap(ReadPosition::getRoomId, ReadPosition::getLastReadAt)
                                .flatMap(positions -> {
                                    // Channel rooms
                                    Flux<Map.Entry<String, Long>> channelCounts = roomRepository.findAll()
                                            .flatMap(room -> countUnread(room.getName(), positions));

                                    // DM rooms — find all dm.* roomIds containing this username
                                    Query dmQuery = Query.query(
                                            Criteria.where("roomId").regex("^dm\\..*" + username + ".*"));
                                    Flux<Map.Entry<String, Long>> dmCounts = mongoTemplate
                                            .findDistinct(dmQuery, "roomId", "messages", String.class)
                                            .flatMap(roomId -> countUnread(roomId, positions));

                                    return Flux.merge(channelCounts, dmCounts)
                                            .collectMap(Map.Entry::getKey, Map.Entry::getValue);
                                })
                );
    }

    private Mono<Map.Entry<String, Long>> countUnread(String roomId, Map<String, Instant> positions) {
        Instant lastRead = positions.get(roomId);
        if (lastRead == null) {
            // For DMs: count everything (recipient has never opened it)
            // For channels: return 0 (don't flood with historical backlog on first join)
            if (roomId.startsWith("dm.")) {
                return messageRepository
                        .countByRoomIdAndTimestampAfterAndDeletedFalseAndThreadIdIsNull(roomId, Instant.EPOCH)
                        .map(count -> Map.entry(roomId, count));
            }
            return Mono.just(Map.entry(roomId, 0L));
        }
        return messageRepository
                .countByRoomIdAndTimestampAfterAndDeletedFalseAndThreadIdIsNull(roomId, lastRead)
                .map(count -> Map.entry(roomId, count));
    }
}
