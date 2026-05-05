"use client";

import { useState, useEffect } from "react";
import { markMessageRead, getReceipts } from "../api";
import { Message, ReadReceipt } from "../../../shared/types";

export function useReadReceipts(
  enabled: boolean,
  history: Message[],
  wsMessages: Message[],
  username: string,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [receipts, setReceipts] = useState<Record<string, ReadReceipt[]>>({});

  useEffect(() => {
    if (!enabled || history.length === 0) return;
    const ownIds = history.filter((m) => m.senderUsername === username).map((m) => m.id);
    ownIds.forEach((id) => {
      getReceipts(id).then((r) => {
        if (r.length > 0) setReceipts((prev) => ({ ...prev, [id]: r }));
      });
    });
  }, [history, username, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.messageId;
            if (id) markMessageRead(id);
          }
        });
      },
      { root: container, threshold: 0.5 },
    );
    container.querySelectorAll("[data-message-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [history.length, wsMessages.length, enabled, scrollContainerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReceipts = (messageId: string) => {
    getReceipts(messageId).then((r) => setReceipts((prev) => ({ ...prev, [messageId]: r })));
  };

  return { receipts, fetchReceipts };
}
