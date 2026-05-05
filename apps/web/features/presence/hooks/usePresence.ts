"use client";

import { useState, useEffect } from "react";
import { getPresence } from "../../rooms/api";
import { isDM } from "../../../shared/lib/utils";

export function usePresence(activeRoomName: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

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

  return { onlineUsers };
}
