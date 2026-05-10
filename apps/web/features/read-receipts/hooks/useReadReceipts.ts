"use client";

import { useState, useEffect, useRef } from "react";
import { markMessageReadBatch, getReceipts, getMyReadIds } from "../api";
import { Message, ReadReceipt } from "../../../shared/types";

export function useReadReceipts(
  enabled: boolean,
  history: Message[],
  wsMessages: Message[],
  username: string,
  activeRoomId: string | null,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [receipts, setReceipts] = useState<Record<string, ReadReceipt[]>>({});
  const fetchedReceiptIds = useRef<Set<string>>(new Set());
  const pendingBatch = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Server-sourced: message IDs this user has already read (persisted in MongoDB)
  const alreadyRead = useRef<Set<string>>(new Set());

  // When room changes, fetch the set of already-read message IDs from the server
  useEffect(() => {
    if (!enabled || !activeRoomId) return;
    alreadyRead.current = new Set(); // reset for new room
    fetchedReceiptIds.current = new Set();
    getMyReadIds(activeRoomId).then((ids) => {
      ids.forEach((id) => alreadyRead.current.add(id));
    });
  }, [activeRoomId, enabled]);

  // Fetch receipts for own messages — only once per message, capped to last 20
  useEffect(() => {
    if (!enabled || history.length === 0) return;
    const ownIds = history
      .filter((m) => m.senderUsername === username)
      .map((m) => m.id)
      .slice(-20);
    ownIds.forEach((id) => {
      if (fetchedReceiptIds.current.has(id)) return;
      fetchedReceiptIds.current.add(id);
      getReceipts(id).then((r) => {
        if (r.length > 0) setReceipts((prev) => ({ ...prev, [id]: r }));
      });
    });
  }, [history.length, username, enabled]);

  // Batch + debounce IntersectionObserver marks; skip already-read messages
  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    function flush() {
      const ids = [...pendingBatch.current];
      pendingBatch.current.clear();
      if (ids.length === 0) return;
      markMessageReadBatch(ids).catch(() => {});
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.messageId;
            if (id && !alreadyRead.current.has(id)) {
              alreadyRead.current.add(id); // optimistically mark to avoid duplicate batches
              pendingBatch.current.add(id);
              if (flushTimer.current) clearTimeout(flushTimer.current);
              flushTimer.current = setTimeout(flush, 800);
            }
          }
        });
      },
      { root: container, threshold: 0.5 },
    );
    container.querySelectorAll("[data-message-id]").forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flush();
    };
  }, [history.length, wsMessages.length, enabled, scrollContainerRef]);

  const fetchReceipts = (messageId: string) => {
    getReceipts(messageId).then((r) => setReceipts((prev) => ({ ...prev, [messageId]: r })));
  };

  return { receipts, fetchReceipts };
}
