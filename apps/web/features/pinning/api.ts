import { API_BASE, apiFetch } from "../../shared/lib/api-client";
import { Message, Room } from "../../shared/types";

export async function getPinnedMessages(roomId: string): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/pinned`);
  if (!res.ok) return [];
  return res.json();
}

export async function pinMessage(roomId: string, messageId: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/pin/${messageId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function unpinMessage(roomId: string, messageId: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/pin/${messageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to unpin");
  return res.json();
}
