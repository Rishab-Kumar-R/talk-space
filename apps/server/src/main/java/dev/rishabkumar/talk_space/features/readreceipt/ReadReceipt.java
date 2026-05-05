package dev.rishabkumar.talk_space.features.readreceipt;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "read_receipts")
@CompoundIndex(name = "message_user", def = "{'messageId': 1, 'username': 1}", unique = true)
public class ReadReceipt {

    @Id
    private String id;
    private String messageId;
    private String roomId;
    private String username;
    private Instant readAt = Instant.now();

    public ReadReceipt() {}

    public ReadReceipt(String messageId, String roomId, String username) {
        this.messageId = messageId;
        this.roomId = roomId;
        this.username = username;
    }

    public String getId() { return id; }
    public String getMessageId() { return messageId; }
    public String getRoomId() { return roomId; }
    public String getUsername() { return username; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }
}
