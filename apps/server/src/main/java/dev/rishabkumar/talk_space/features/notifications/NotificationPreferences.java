package dev.rishabkumar.talk_space.features.notifications;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "notification_preferences")
public class NotificationPreferences {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private List<String> mutedRooms = new ArrayList<>();
    private String dndStart; // "HH:mm" 24-hour, null = disabled
    private String dndEnd;   // "HH:mm" 24-hour, null = disabled

    public NotificationPreferences() {}

    public NotificationPreferences(String username) {
        this.username = username;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }

    public List<String> getMutedRooms() { return mutedRooms; }
    public void setMutedRooms(List<String> mutedRooms) { this.mutedRooms = mutedRooms; }

    public String getDndStart() { return dndStart; }
    public void setDndStart(String dndStart) { this.dndStart = dndStart; }

    public String getDndEnd() { return dndEnd; }
    public void setDndEnd(String dndEnd) { this.dndEnd = dndEnd; }
}
