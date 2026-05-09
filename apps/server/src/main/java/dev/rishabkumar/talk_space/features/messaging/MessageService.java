package dev.rishabkumar.talk_space.features.messaging;

import dev.rishabkumar.talk_space.shared.security.EncryptionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final EncryptionService encryptionService;
    private final BroadcastService broadcastService;

    public MessageService(MessageRepository messageRepository,
                          EncryptionService encryptionService,
                          BroadcastService broadcastService) {
        this.messageRepository = messageRepository;
        this.encryptionService = encryptionService;
        this.broadcastService = broadcastService;
    }

    public Flux<Message> getMessages(String roomId, String before, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        Flux<Message> query = before != null
                ? messageRepository.findByRoomIdAndTimestampBeforeAndDeletedFalseOrderByTimestampDesc(
                        roomId, Instant.parse(before), page)
                : messageRepository.findByRoomIdAndDeletedFalseOrderByTimestampDesc(roomId, page);

        return query.collectList()
                .flatMapMany(list -> {
                    Collections.reverse(list);
                    return Flux.fromIterable(list);
                })
                .map(this::decrypt);
    }

    public Flux<Message> search(String roomId, String q, int limit) {
        if (q == null || q.isBlank()) return Flux.empty();
        String term = q.toLowerCase(Locale.ROOT);
        return messageRepository.findByRoomIdAndDeletedFalseOrderByTimestampDesc(roomId)
                .take(500)
                .map(this::decrypt)
                .filter(msg -> msg.getContent() != null
                        && msg.getContent().toLowerCase(Locale.ROOT).contains(term))
                .take(limit);
    }

    public Mono<Message> toggleReaction(String messageId, String emoji, String username) {
        return messageRepository.findById(messageId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                .flatMap(msg -> {
                    var users = msg.getReactions().computeIfAbsent(emoji, k -> new ArrayList<>());
                    if (users.contains(username)) users.remove(username);
                    else users.add(username);
                    if (users.isEmpty()) msg.getReactions().remove(emoji);
                    return messageRepository.save(msg);
                })
                .flatMap(saved -> broadcastService.publishReactionUpdated(saved).thenReturn(saved))
                .map(this::decrypt);
    }

    public Mono<Message> edit(String messageId, String newContent, String callerUsername) {
        return messageRepository.findById(messageId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                .flatMap(msg -> {
                    if (!msg.getSenderUsername().equals(callerUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit another user's message"));
                    if (msg.isDeleted())
                        return Mono.error(new ResponseStatusException(HttpStatus.GONE, "Message has been deleted"));
                    msg.setContent(encryptionService.encrypt(newContent));
                    msg.setEditedAt(Instant.now());
                    return messageRepository.save(msg);
                })
                .flatMap(saved -> broadcastService.publishMessageEdited(saved, newContent).thenReturn(saved))
                .map(saved -> {
                    saved.setContent(newContent);
                    return saved;
                });
    }

    public Mono<Void> delete(String messageId, String callerUsername) {
        return messageRepository.findById(messageId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                .flatMap(msg -> {
                    if (!msg.getSenderUsername().equals(callerUsername))
                        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete another user's message"));
                    msg.setDeleted(true);
                    msg.setContent(null);
                    return messageRepository.save(msg);
                })
                .flatMap(saved -> broadcastService.publishMessageDeleted(saved.getId(), saved.getRoomId()))
                .then();
    }

    public Flux<Message> getThread(String rootMessageId) {
        return messageRepository.findByThreadIdOrderByTimestampAsc(rootMessageId)
                .map(this::decrypt);
    }

    public Mono<Void> incrementThreadCount(String messageId) {
        return messageRepository.incrementThreadCount(messageId).then();
    }

    public Flux<Message> getMentions(String username, int limit) {
        return messageRepository.findByMentionsContainingOrderByTimestampDesc(
                username, PageRequest.of(0, limit))
                .map(this::decrypt);
    }

    public Mono<Message> vote(String messageId, int optionIndex, String username) {
        return messageRepository.findById(messageId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")))
                .flatMap(msg -> {
                    if (!"poll".equals(msg.getMessageType()))
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not a poll"));
                    if (msg.getPollOptions() == null || optionIndex < 0 || optionIndex >= msg.getPollOptions().size())
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid option"));
                    var votes = msg.getPollVotes();
                    if (Integer.valueOf(optionIndex).equals(votes.get(username))) {
                        votes.remove(username); // toggle off
                    } else {
                        votes.put(username, optionIndex);
                    }
                    return messageRepository.save(msg);
                })
                .flatMap(saved -> broadcastService.publishPollUpdated(saved).thenReturn(saved))
                .map(this::decrypt);
    }

    /** Save an already-constructed message (used by WebSocket handler). */
    public Mono<Message> save(Message message) {
        return messageRepository.save(message);
    }

    public Message decrypt(Message msg) {
        if (msg.getContent() != null) msg.setContent(encryptionService.decrypt(msg.getContent()));
        if (msg.getReplyPreview() != null) msg.setReplyPreview(encryptionService.decrypt(msg.getReplyPreview()));
        return msg;
    }

    public String encrypt(String plaintext) {
        return encryptionService.encrypt(plaintext);
    }
}
