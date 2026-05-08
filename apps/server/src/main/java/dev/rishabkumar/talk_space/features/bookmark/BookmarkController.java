package dev.rishabkumar.talk_space.features.bookmark;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping
    public Flux<Bookmark> getBookmarks() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(bookmarkService::getBookmarks);
    }

    @PostMapping("/{messageId}")
    public Mono<Bookmark> addBookmark(@PathVariable String messageId,
                                      @RequestBody Map<String, Object> body) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> bookmarkService.addBookmark(username, messageId, body));
    }

    @DeleteMapping("/{messageId}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public Mono<Void> removeBookmark(@PathVariable String messageId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> bookmarkService.removeBookmark(username, messageId));
    }
}
