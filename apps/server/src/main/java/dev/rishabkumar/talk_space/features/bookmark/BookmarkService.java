package dev.rishabkumar.talk_space.features.bookmark;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@Service
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;

    public BookmarkService(BookmarkRepository bookmarkRepository) {
        this.bookmarkRepository = bookmarkRepository;
    }

    public Flux<Bookmark> getBookmarks(String username) {
        return bookmarkRepository.findByUsernameOrderBySavedAtDesc(username);
    }

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
                    bm.setContent((String) body.get("content"));
                    bm.setSenderUsername((String) body.get("senderUsername"));
                    String ts = (String) body.get("timestamp");
                    if (ts != null) bm.setTimestamp(Instant.parse(ts));
                    bm.setMessageType((String) body.get("messageType"));
                    bm.setFileUrl((String) body.get("fileUrl"));
                    bm.setFileName((String) body.get("fileName"));
                    bm.setSavedAt(Instant.now());
                    return bookmarkRepository.save(bm);
                }));
    }

    public Mono<Void> removeBookmark(String username, String messageId) {
        return bookmarkRepository.deleteByUsernameAndMessageId(username, messageId);
    }
}
