package dev.rishabkumar.talk_space.features.readreceipt;

import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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

    @GetMapping("/{messageId}/receipts")
    public Flux<Map<String, String>> getReceipts(@PathVariable String messageId) {
        return readReceiptService.getReceipts(messageId);
    }
}
