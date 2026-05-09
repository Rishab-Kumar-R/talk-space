"use client";

import { useState, useCallback } from "react";
import { ScheduledMessage } from "../../../shared/types";
import {
  listScheduledMessages,
  createScheduledMessage,
  cancelScheduledMessage,
  rescheduleMessage,
} from "../api";

export function useScheduled() {
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await listScheduledMessages();
      setScheduled(msgs);
    } finally {
      setLoading(false);
    }
  }, []);

  const schedule = useCallback(async (roomId: string, content: string, scheduledFor: string) => {
    const msg = await createScheduledMessage(roomId, content, scheduledFor);
    setScheduled((prev) => [...prev, msg].sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
    ));
    return msg;
  }, []);

  const cancel = useCallback(async (id: string) => {
    await cancelScheduledMessage(id);
    setScheduled((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const reschedule = useCallback(async (id: string, scheduledFor: string) => {
    const updated = await rescheduleMessage(id, scheduledFor);
    setScheduled((prev) =>
      prev.map((m) => (m.id === id ? updated : m))
          .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
    );
    return updated;
  }, []);

  const pendingCount = scheduled.length;

  return { scheduled, loading, pendingCount, load, schedule, cancel, reschedule };
}
