"use client";

import { useState, useCallback, useEffect } from "react";
import { Message, Room } from "../../../shared/types";
import { fetchBookmarks, addBookmark, removeBookmark } from "../api";

export interface Bookmark {
  id: string;
  messageId: string;
  roomId: string;
  roomName: string;
  content: string;
  senderUsername: string;
  timestamp: string;
  messageType?: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  savedAt: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    fetchBookmarks().then(setBookmarks);
  }, []);

  const toggle = useCallback(async (msg: Message, room: Room | null) => {
    const alreadySaved = bookmarks.some((b) => b.messageId === msg.id);
    if (alreadySaved) {
      setBookmarks((prev) => prev.filter((b) => b.messageId !== msg.id));
      await removeBookmark(msg.id);
    } else {
      const saved = await addBookmark(msg, room);
      if (saved) setBookmarks((prev) => [saved, ...prev]);
    }
  }, [bookmarks]);

  const remove = useCallback(async (msgId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.messageId !== msgId));
    await removeBookmark(msgId);
  }, []);

  const isBookmarked = useCallback((msgId: string, bookmarkList: Bookmark[]) =>
    bookmarkList.some((b) => b.messageId === msgId), []);

  return { bookmarks, toggle, remove, isBookmarked };
}
