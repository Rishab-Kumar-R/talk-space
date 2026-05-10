package dev.rishabkumar.talk_space.shared.security;

import dev.rishabkumar.talk_space.shared.metrics.AppMetrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class EncryptionServiceTest {

    private EncryptionService service;

    @BeforeEach
    void setUp() throws Exception {
        // 256-bit AES key for tests
        byte[] key = new byte[32];
        String base64Key = Base64.getEncoder().encodeToString(key);
        AppMetrics metrics = new AppMetrics(new SimpleMeterRegistry());
        service = new EncryptionService(base64Key, metrics);
    }

    @Test
    void encryptDecryptRoundTrip() {
        String plaintext = "Hello, TalkSpace!";
        String ciphertext = service.encrypt(plaintext);

        assertThat(ciphertext).isNotEqualTo(plaintext);
        assertThat(service.decrypt(ciphertext)).isEqualTo(plaintext);
    }

    @Test
    void encryptProducesUniqueOutputEachTime() {
        String plaintext = "same message";
        String c1 = service.encrypt(plaintext);
        String c2 = service.encrypt(plaintext);

        // Each call uses a fresh random IV, so ciphertexts must differ
        assertThat(c1).isNotEqualTo(c2);
        assertThat(service.decrypt(c1)).isEqualTo(plaintext);
        assertThat(service.decrypt(c2)).isEqualTo(plaintext);
    }

    @Test
    void decryptTamperedCiphertextReturnsSentinel() {
        String ciphertext = service.encrypt("secret");
        // Flip a byte in the middle to simulate tampering
        byte[] raw = Base64.getDecoder().decode(ciphertext);
        raw[raw.length / 2] ^= 0xFF;
        String tampered = Base64.getEncoder().encodeToString(raw);

        assertThat(service.decrypt(tampered)).isEqualTo("[encrypted]");
    }

    @Test
    void decryptGarbageInputReturnsSentinel() {
        assertThat(service.decrypt("not-valid-base64!!!")).isEqualTo("[encrypted]");
    }
}
