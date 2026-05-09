package dev.rishabkumar.talk_space.features.scheduling;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "scheduled_messages")
@CompoundIndex(name = "dispatch_idx", def = "{'sent': 1, 'cancelled': 1, 'scheduledFor': 1}")
public class ScheduledMessage {

    @Id
    private String id;

    @Indexed
    private String senderUsername;
    private String senderId;
    private String roomId;
    private String content;
    private String messageType = "text";
    private Instant scheduledFor;
    private boolean sent = false;
    private boolean cancelled = false;
    private Instant createdAt = Instant.now();

    public ScheduledMessage() {}

    public String getId() { return id; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public Instant getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(Instant scheduledFor) { this.scheduledFor = scheduledFor; }
    public boolean isSent() { return sent; }
    public void setSent(boolean sent) { this.sent = sent; }
    public boolean isCancelled() { return cancelled; }
    public void setCancelled(boolean cancelled) { this.cancelled = cancelled; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
