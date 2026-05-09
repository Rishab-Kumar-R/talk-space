"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationPrefs } from "../../../shared/types";
import { getNotificationPrefs, updateNotificationPrefs, muteRoom, unmuteRoom } from "../api";

const EMPTY: NotificationPrefs = { mutedRooms: [], dndStart: null, dndEnd: null };

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(EMPTY);
  const [editDndStart, setEditDndStart] = useState("");
  const [editDndEnd, setEditDndEnd] = useState("");

  useEffect(() => {
    getNotificationPrefs().then((p) => {
      setPrefs(p);
      setEditDndStart(p.dndStart ?? "");
      setEditDndEnd(p.dndEnd ?? "");
    });
  }, []);

  const toggleMute = useCallback(async (roomId: string) => {
    const muted = prefs.mutedRooms.includes(roomId);
    const updated = await (muted ? unmuteRoom(roomId) : muteRoom(roomId));
    setPrefs(updated);
  }, [prefs.mutedRooms]);

  const saveDnd = useCallback(async (start: string, end: string) => {
    const updated = await updateNotificationPrefs({
      dndStart: start || null,
      dndEnd: end || null,
    });
    setPrefs(updated);
    setEditDndStart(updated.dndStart ?? "");
    setEditDndEnd(updated.dndEnd ?? "");
  }, []);

  const isRoomMuted = useCallback(
    (roomId: string) => prefs.mutedRooms.includes(roomId),
    [prefs.mutedRooms],
  );

  const isDndActive = useCallback(() => {
    if (!prefs.dndStart || !prefs.dndEnd) return false;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = prefs.dndStart.split(":").map(Number);
    const [eh, em] = prefs.dndEnd.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    // handles overnight windows (e.g. 22:00–08:00)
    return startMins <= endMins
      ? nowMins >= startMins && nowMins < endMins
      : nowMins >= startMins || nowMins < endMins;
  }, [prefs.dndStart, prefs.dndEnd]);

  return {
    prefs,
    editDndStart, setEditDndStart,
    editDndEnd, setEditDndEnd,
    toggleMute,
    saveDnd,
    isRoomMuted,
    isDndActive,
  };
}
