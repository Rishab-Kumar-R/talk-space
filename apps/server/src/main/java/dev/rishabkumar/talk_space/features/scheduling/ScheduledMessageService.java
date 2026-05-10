package dev.rishabkumar.talk_space.features.scheduling;

import dev.rishabkumar.talk_space.features.messaging.BroadcastService;
import dev.rishabkumar.talk_space.features.messaging.Message;
import dev.rishabkumar.talk_space.features.messaging.MessageService;
import dev.rishabkumar.talk_space.shared.security.EncryptionService;
import dev.rishabkumar.talk_space.shared.util.DmRoomUtils;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ScheduledMessageService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._-]+)");

    private final ScheduledMessageRepository repository;
    private final ReactiveMongoTemplate mongoTemplate;
    private final MessageService messageService;
    private final BroadcastService broadcastService;
    private final EncryptionService encryptionService;

    public ScheduledMessageService(ScheduledMessageRepository repository,
                                   ReactiveMongoTemplate mongoTemplate,
                                   MessageService messageService,
                                   BroadcastService broadcastService,
                                   EncryptionService encryptionService) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
        this.messageService = messageService;
        this.broadcastService = broadcastService;
        this.encryptionService = encryptionService;
    }

    public Mono<ScheduledMessage> create(String senderUsername, String senderId,
                                         String roomId, String content,
                                         Instant scheduledFor) {
        if (scheduledFor.isBefore(Instant.now().plusSeconds(30))) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Scheduled time must be at least 30 seconds in the future"));
        }
        ScheduledMessage sm = new ScheduledMessage();
        sm.setSenderUsername(senderUsername);
        sm.setSenderId(senderId);
        sm.setRoomId(roomId);
        sm.setContent(encryptionService.encrypt(content));
        sm.setScheduledFor(scheduledFor);
        return repository.save(sm);
    }

    public Flux<ScheduledMessage> listForUser(String senderUsername) {
        return repository
                .findBySenderUsernameAndSentFalseAndCancelledFalseOrderByScheduledForAsc(senderUsername)
                .map(sm -> {
                    sm.setContent(encryptionService.decrypt(sm.getContent()));
                    return sm;
                });
    }

    public Mono<Void> cancel(String id, String senderUsername) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(sm -> {
                    if (!sm.getSenderUsername().equals(senderUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN));
                    if (sm.isSent())
                        return Mono.error(new ResponseStatusException(HttpStatus.CONFLICT, "Message already sent"));
                    sm.setCancelled(true);
                    return repository.save(sm);
                })
                .then();
    }

    public Mono<ScheduledMessage> reschedule(String id, String senderUsername, Instant newTime) {
        if (newTime.isBefore(Instant.now().plusSeconds(30))) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Scheduled time must be at least 30 seconds in the future"));
        }
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(sm -> {
                    if (!sm.getSenderUsername().equals(senderUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN));
                    if (sm.isSent() || sm.isCancelled())
                        return Mono.error(new ResponseStatusException(HttpStatus.CONFLICT, "Cannot reschedule a sent or cancelled message"));
                    sm.setScheduledFor(newTime);
                    return repository.save(sm);
                })
                .map(sm -> {
                    sm.setContent(encryptionService.decrypt(sm.getContent()));
                    return sm;
                });
    }

    /**
     * Called by the scheduler job every 30s.
     * <p>
     * Uses an atomic findAndModify to claim each due message before dispatching it.
     * If two server instances run simultaneously, only the one that successfully flips
     * sent=false→true gets the document back; the other gets empty and skips — so each
     * message is guaranteed to be dispatched exactly once regardless of instance count.
     */
    public Mono<Void> dispatchDue() {
        Instant now = Instant.now();
        Query findDue = Query.query(
                Criteria.where("sent").is(false)
                        .and("cancelled").is(false)
                        .and("scheduledFor").lte(now)
        );

        // Fetch IDs of all due messages first, then claim each atomically
        return mongoTemplate.find(findDue, ScheduledMessage.class)
                .flatMap(candidate -> {
                    // Atomic claim: only succeeds if sent is still false
                    Query claimQuery = Query.query(
                            Criteria.where("_id").is(candidate.getId()).and("sent").is(false)
                    );
                    Update claimUpdate = new Update().set("sent", true);
                    FindAndModifyOptions opts = FindAndModifyOptions.options().returnNew(false);

                    return mongoTemplate.findAndModify(claimQuery, claimUpdate, opts, ScheduledMessage.class)
                            .flatMap(this::dispatch);
                    // If findAndModify returns empty, another instance already claimed it — skip silently
                })
                .then();
    }

    private Mono<Void> dispatch(ScheduledMessage sm) {
        String plaintext = encryptionService.decrypt(sm.getContent());
        Message msg = new Message(sm.getRoomId(), sm.getSenderId(),
                sm.getSenderUsername(), encryptionService.encrypt(plaintext));
        msg.setTimestamp(Instant.now());
        msg.setMessageType(sm.getMessageType());
        msg.setMentions(extractMentions(plaintext));

        Map<String, Object> broadcastPayload = buildBroadcastPayload(msg, plaintext);

        return messageService.save(msg)
                .flatMap(saved -> {
                    broadcastPayload.put("id", saved.getId());
                    Mono<Void> broadcast = broadcastService.publish(saved.getRoomId(), broadcastPayload).then();
                    if (DmRoomUtils.isDm(saved.getRoomId())) {
                        String partner = DmRoomUtils.partner(saved.getRoomId(), sm.getSenderUsername());
                        broadcast = broadcast.then(broadcastService.publishUnreadBump(saved.getRoomId(), partner).then());
                    }
                    return broadcast;
                });
    }

    private Map<String, Object> buildBroadcastPayload(Message msg, String plaintext) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "message");
        payload.put("roomId", msg.getRoomId());
        payload.put("senderId", msg.getSenderId());
        payload.put("senderUsername", msg.getSenderUsername());
        payload.put("content", plaintext);
        payload.put("timestamp", msg.getTimestamp().toString());
        payload.put("messageType", msg.getMessageType());
        payload.put("reactions", msg.getReactions());
        payload.put("mentions", msg.getMentions());
        payload.put("threadCount", 0);
        return payload;
    }

    private List<String> extractMentions(String content) {
        List<String> mentions = new ArrayList<>();
        if (content == null) return mentions;
        Matcher m = MENTION_PATTERN.matcher(content);
        while (m.find()) mentions.add(m.group(1));
        return mentions;
    }
}
