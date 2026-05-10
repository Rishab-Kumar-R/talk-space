package dev.rishabkumar.talk_space.shared.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DmRoomUtilsTest {

    @Test
    void isDmReturnsTrueForDmRooms() {
        assertThat(DmRoomUtils.isDm("dm.alice.bob")).isTrue();
        assertThat(DmRoomUtils.isDm("dm.alice.alice")).isTrue();
    }

    @Test
    void isDmReturnsFalseForPublicRooms() {
        assertThat(DmRoomUtils.isDm("general")).isFalse();
        assertThat(DmRoomUtils.isDm("dm-lookalike")).isFalse();
        assertThat(DmRoomUtils.isDm(null)).isFalse();
    }

    @Test
    void partnerReturnsOtherUser() {
        assertThat(DmRoomUtils.partner("dm.alice.bob", "alice")).isEqualTo("bob");
        assertThat(DmRoomUtils.partner("dm.alice.bob", "bob")).isEqualTo("alice");
    }

    @Test
    void partnerReturnsSelfForSelfDm() {
        assertThat(DmRoomUtils.partner("dm.alice.alice", "alice")).isEqualTo("alice");
    }
}
