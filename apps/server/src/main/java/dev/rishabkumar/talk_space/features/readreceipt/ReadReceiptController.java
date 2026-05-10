package dev.rishabkumar.talk_space.features.readreceipt;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class ReadReceiptController {

    private final ReadReceiptService readReceiptService;

    public ReadReceiptController(ReadReceiptService readReceiptService) {
        this.readReceiptService = readReceiptService;
    }

    @PostMapping("/{messageId}/read")
    public Mono<Void> markRead(@PathVariable String messageId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> readReceiptService.markRead(messageId, username));
    }

    @GetMapping("/read/mine")
    public Flux<String> getMyReadIds(@RequestParam String roomId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMapMany(username -> readReceiptService.getReadMessageIds(roomId, username));
    }

    @PostMapping("/read/batch")
    public Mono<Void> markReadBatch(@RequestBody Map<String, List<String>> body) {
        List<String> ids = body.getOrDefault("messageIds", List.of());
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> Flux.fromIterable(ids)
                        .flatMap(id -> readReceiptService.markRead(id, username))
                        .then());
    }

    @GetMapping("/{messageId}/receipts")
    public Flux<Map<String, String>> getReceipts(@PathVariable String messageId) {
        return readReceiptService.getReceipts(messageId);
    }
}
