package dev.rishabkumar.talk_space.features.readreceipt;

import dev.rishabkumar.talk_space.features.messaging.MessageRepository;
import dev.rishabkumar.talk_space.features.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@Service
public class ReadReceiptService {

    private final ReadReceiptRepository receiptRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public ReadReceiptService(ReadReceiptRepository receiptRepository,
                              MessageRepository messageRepository,
                              UserRepository userRepository) {
        this.receiptRepository = receiptRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    public Mono<Void> markRead(String messageId, String username) {
        return userRepository.findByUsername(username)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(viewer -> {
                    if (!viewer.isShowReadReceipts()) return Mono.empty();
                    return receiptRepository.existsByMessageIdAndUsername(messageId, username)
                            .flatMap(exists -> {
                                if (exists) return Mono.empty();
                                return messageRepository.findById(messageId)
                                        .flatMap(msg -> {
                                            if (msg.getSenderUsername().equals(username)) return Mono.empty();
                                            ReadReceipt r = new ReadReceipt(messageId, msg.getRoomId(), username);
                                            r.setReadAt(Instant.now());
                                            return receiptRepository.save(r);
                                        });
                            });
                })
                .then();
    }

    /**
     * Returns IDs of messages in a room that this user has already read.
     */
    public Flux<String> getReadMessageIds(String roomId, String username) {
        return receiptRepository.findByRoomIdAndUsername(roomId, username)
                .map(ReadReceipt::getMessageId);
    }

    public Flux<Map<String, String>> getReceipts(String messageId) {
        return messageRepository.findById(messageId)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMapMany(msg ->
                        userRepository.findByUsername(msg.getSenderUsername())
                                .flatMapMany(sender -> {
                                    if (!sender.isShowReadReceipts()) return Flux.empty();
                                    return receiptRepository.findByMessageId(messageId)
                                            .map(r -> Map.of("username", r.getUsername(),
                                                    "readAt", r.getReadAt().toString()));
                                })
                );
    }
}
