"use client";

import { useState, useEffect } from "react";
import { getPresence, getGlobalPresence, sendPresenceHeartbeat } from "../../rooms/api";
import { isDM } from "../../../shared/lib/utils";

const POLL_MS = 30_000;
const HEARTBEAT_MS = 30_000;

export function usePresence(activeRoomName: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [onlineGlobal, setOnlineGlobal] = useState<string[]>([]);

  useEffect(() => {
    if (!activeRoomName || isDM(activeRoomName)) {
      setOnlineUsers([]);
      return;
    }
    const poll = () => getPresence(activeRoomName).then(setOnlineUsers);
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [activeRoomName]);

  useEffect(() => {
    const poll = () => getGlobalPresence().then(setOnlineGlobal);
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat keeps presence TTL alive; fires immediately then every 30s
  useEffect(() => {
    sendPresenceHeartbeat(activeRoomName ?? undefined);
    const interval = setInterval(
      () => sendPresenceHeartbeat(activeRoomName ?? undefined),
      HEARTBEAT_MS,
    );
    return () => clearInterval(interval);
  }, [activeRoomName]);

  return { onlineUsers, onlineGlobal };
}
