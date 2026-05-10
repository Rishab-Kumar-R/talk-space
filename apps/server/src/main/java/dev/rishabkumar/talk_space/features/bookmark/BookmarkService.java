package dev.rishabkumar.talk_space.features.bookmark;

import dev.rishabkumar.talk_space.features.audit.Audited;
import dev.rishabkumar.talk_space.shared.security.EncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@Service
public class BookmarkService {

    private static final Logger log = LoggerFactory.getLogger(BookmarkService.class);

    private final BookmarkRepository bookmarkRepository;
    private final EncryptionService encryptionService;

    public BookmarkService(BookmarkRepository bookmarkRepository, EncryptionService encryptionService) {
        this.bookmarkRepository = bookmarkRepository;
        this.encryptionService = encryptionService;
    }

    public Flux<Bookmark> getBookmarks(String username) {
        return bookmarkRepository.findByUsernameOrderBySavedAtDesc(username)
                .map(this::decrypt);
    }

    @Audited(action = "BOOKMARK_ADDED", resourceType = "message", resourceId = "#messageId")
    public Mono<Bookmark> addBookmark(String username, String messageId, Map<String, Object> body) {
        return bookmarkRepository.findByUsernameAndMessageId(username, messageId)
                .flatMap(existing -> Mono.<Bookmark>error(
                        new ResponseStatusException(HttpStatus.CONFLICT, "Already bookmarked")))
                .switchIfEmpty(Mono.defer(() -> {
                    Bookmark bm = new Bookmark();
                    bm.setUsername(username);
                    bm.setMessageId(messageId);
                    bm.setRoomId((String) body.get("roomId"));
                    bm.setRoomName((String) body.get("roomName"));
                    String content = (String) body.get("content");
                    bm.setContent(content != null ? encryptionService.encrypt(content) : null);
                    bm.setSenderUsername((String) body.get("senderUsername"));
                    String ts = (String) body.get("timestamp");
                    if (ts != null) bm.setTimestamp(Instant.parse(ts));
                    bm.setMessageType((String) body.get("messageType"));
                    bm.setFileUrl((String) body.get("fileUrl"));
                    bm.setFileName((String) body.get("fileName"));
                    bm.setSavedAt(Instant.now());
                    return bookmarkRepository.save(bm);
                }))
                .map(this::decrypt)
                .doOnSuccess(b -> log.info("Bookmark added user={} messageId={}", username, messageId));
    }

    private Bookmark decrypt(Bookmark bm) {
        if (bm.getContent() != null) bm.setContent(encryptionService.decrypt(bm.getContent()));
        return bm;
    }

    @Audited(action = "BOOKMARK_REMOVED", resourceType = "message", resourceId = "#messageId")
    public Mono<Void> removeBookmark(String username, String messageId) {
        log.info("Bookmark removed user={} messageId={}", username, messageId);
        return bookmarkRepository.deleteByUsernameAndMessageId(username, messageId);
    }
}
