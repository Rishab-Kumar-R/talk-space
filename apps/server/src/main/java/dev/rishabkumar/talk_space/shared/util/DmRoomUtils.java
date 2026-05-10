package dev.rishabkumar.talk_space.shared.util;

public final class DmRoomUtils {

    private DmRoomUtils() {
    }

    public static boolean isDm(String roomId) {
        return roomId != null && roomId.startsWith("dm.");
    }

    /**
     * Returns the other participant's username in a dm.<a>.<b> room.
     */
    public static String partner(String roomId, String self) {
        for (String part : roomId.substring(3).split("\\.")) {
            if (!part.equals(self)) return part;
        }
        return self;
    }

    /**
     * Builds a canonical DM room ID from two usernames (alphabetical order).
     */
    public static String buildId(String a, String b) {
        return a.compareTo(b) <= 0
                ? "dm." + a + "." + b
                : "dm." + b + "." + a;
    }
}
