import { API_BASE, apiFetch } from "../../shared/lib/api-client";
import { ReadReceipt } from "../../shared/types";

export async function markMessageRead(messageId: string): Promise<void> {
  await apiFetch(`${API_BASE}/messages/${messageId}/read`, { method: "POST" });
}

export async function getReceipts(messageId: string): Promise<ReadReceipt[]> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}/receipts`);
  if (!res.ok) return [];
  return res.json();
}
