"use client";

import { useState, useEffect } from "react";
import { getPresence, getGlobalPresence } from "../../rooms/api";
import { isDM } from "../../../shared/lib/utils";

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
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [activeRoomName]);

  useEffect(() => {
    const poll = () => getGlobalPresence().then(setOnlineGlobal);
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  return { onlineUsers, onlineGlobal };
}
