import { API_BASE, apiFetch, safeJson } from "../../../shared/lib/api-client";
import { ScheduledMessage } from "../../../shared/types";

const BASE = `${API_BASE}/scheduled`;

export async function createScheduledMessage(
  roomId: string,
  content: string,
  scheduledFor: string,
): Promise<ScheduledMessage> {
  const res = await apiFetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, content, scheduledFor }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await safeJson<ScheduledMessage>(res))!;
}

export async function listScheduledMessages(): Promise<ScheduledMessage[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) return [];
  return (await safeJson<ScheduledMessage[]>(res)) ?? [];
}

export async function cancelScheduledMessage(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function rescheduleMessage(id: string, scheduledFor: string): Promise<ScheduledMessage> {
  const res = await apiFetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledFor }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await safeJson<ScheduledMessage>(res))!;
}
