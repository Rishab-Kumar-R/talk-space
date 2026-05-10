package dev.rishabkumar.talk_space.features.upload;

import dev.rishabkumar.talk_space.features.audit.Audited;
import dev.rishabkumar.talk_space.shared.ratelimit.RateLimitService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "application/zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    /**
     * Detects actual MIME type from file magic bytes, ignoring the client-supplied Content-Type.
     */
    private static String detectMimeType(byte[] bytes) {
        if (bytes.length < 4) return "application/octet-stream";
        // JPEG: FF D8 FF
        if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF)
            return "image/jpeg";
        // PNG: 89 50 4E 47
        if (bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            return "image/png";
        // GIF: 47 49 46 38
        if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38)
            return "image/gif";
        // WEBP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
        if (bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
            return "image/webp";
        // PDF: 25 50 44 46
        if (bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46)
            return "application/pdf";
        // ZIP / DOCX / XLSX share the PK header: 50 4B 03 04
        if (bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04) {
            // Use the declared type to distinguish OOXML formats from plain zip
            return "application/zip";
        }
        // Plain text: all bytes in printable ASCII + common whitespace
        boolean looksLikeText = true;
        int sample = Math.min(bytes.length, 512);
        for (int i = 0; i < sample; i++) {
            int b = bytes[i] & 0xFF;
            if (b < 9 || (b > 13 && b < 32 && b != 27)) {
                looksLikeText = false;
                break;
            }
        }
        if (looksLikeText) return "text/plain";
        return "application/octet-stream";
    }

    private final S3Service s3Service;
    private final RateLimitService rateLimitService;
    private final long maxBytes;
    private final int uploadsPerDay;

    public UploadController(S3Service s3Service,
                            RateLimitService rateLimitService,
                            @Value("${aws.s3.max-file-size-mb}") int maxFileSizeMb,
                            @Value("${rate-limit.uploads-per-day:20}") int uploadsPerDay) {
        this.s3Service = s3Service;
        this.rateLimitService = rateLimitService;
        this.maxBytes = (long) maxFileSizeMb * 1024 * 1024;
        this.uploadsPerDay = uploadsPerDay;
    }

    @Audited(action = "FILE_UPLOADED", resourceType = "file")
    @PostMapping
    public Mono<Map<String, Object>> upload(@RequestPart("file") FilePart filePart) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(username -> {
                    String today = LocalDate.now(ZoneOffset.UTC).toString();
                    return rateLimitService.isAllowed("ratelimit:upload:" + username + ":" + today, uploadsPerDay, 86400L)
                            .flatMap(allowed -> {
                                if (!allowed) {
                                    log.warn("Upload rate-limited user={}", username);
                                    return Mono.error(new ResponseStatusException(
                                            HttpStatus.TOO_MANY_REQUESTS,
                                            "Daily upload limit (" + uploadsPerDay + ") reached"));
                                }
                                log.info("Upload started user={} filename={}", username, filePart.filename());
                                return doUpload(filePart)
                                        .doOnSuccess(r -> log.info("Upload complete user={} filename={} size={}",
                                                username, filePart.filename(), r.get("fileSize")));
                            });
                });
    }

    private Mono<Map<String, Object>> doUpload(FilePart filePart) {
        String declaredType = filePart.headers().getContentType() != null
                ? filePart.headers().getContentType().toString()
                : "application/octet-stream";

        String filename = filePart.filename();

        return filePart.content()
                .map(buf -> {
                    byte[] bytes = new byte[buf.readableByteCount()];
                    buf.read(bytes);
                    return bytes;
                })
                .reduce((a, b) -> {
                    byte[] combined = new byte[a.length + b.length];
                    System.arraycopy(a, 0, combined, 0, a.length);
                    System.arraycopy(b, 0, combined, a.length, b.length);
                    return combined;
                })
                .flatMap(bytes -> {
                    if (bytes.length > maxBytes)
                        return Mono.error(new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE,
                                "File exceeds maximum size of %d MB".formatted(maxBytes / 1024 / 1024)));

                    // Determine the real MIME type from the file's magic bytes.
                    // For OOXML formats (docx/xlsx) that share the ZIP magic header,
                    // we trust the declared type since both are in the allowlist.
                    String detectedType = detectMimeType(bytes);
                    String contentType = "application/zip".equals(detectedType)
                            && ALLOWED_TYPES.contains(declaredType)
                            && declaredType.startsWith("application/vnd")
                            ? declaredType
                            : detectedType;

                    if (!ALLOWED_TYPES.contains(contentType)) {
                        log.warn("Upload rejected: declared={} detected={} filename={}", declaredType, contentType, filename);
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "File type not allowed"));
                    }

                    long fileSize = bytes.length;
                    String messageType = contentType.startsWith("image/") ? "image" : "file";
                    return s3Service.upload(filename, contentType, bytes)
                            .map(url -> Map.<String, Object>of(
                                    "url", url, "fileName", filename,
                                    "fileSize", fileSize, "mimeType", contentType,
                                    "messageType", messageType));
                });
    }
}
