import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { ReadReceipt } from "../../shared/types";

export async function getMyReadIds(roomId: string): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/messages/read/mine?roomId=${encodeURIComponent(roomId)}`);
  if (!res.ok) return [];
  return (await safeJson<string[]>(res)) ?? [];
}

export async function markMessageReadBatch(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  await apiFetch(`${API_BASE}/messages/read/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageIds }),
  });
}

export async function getReceipts(messageId: string): Promise<ReadReceipt[]> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}/receipts`);
  if (!res.ok) return [];
  return (await safeJson<ReadReceipt[]>(res)) ?? [];
}
