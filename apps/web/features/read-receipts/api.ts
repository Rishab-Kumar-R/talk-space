import { API_BASE, authHeaders } from "../../shared/lib/api-client";
import { ReadReceipt } from "../../shared/types";

export async function markMessageRead(messageId: string): Promise<void> {
  await fetch(`${API_BASE}/messages/${messageId}/read`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function getReceipts(messageId: string): Promise<ReadReceipt[]> {
  const res = await fetch(`${API_BASE}/messages/${messageId}/receipts`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}
