import { API_BASE, apiFetch } from "../../shared/lib/api-client";
import { Message } from "../../shared/types";

export async function getMessages(roomId: string, before?: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages`);
  if (before) url.searchParams.set("before", before);
  const res = await apiFetch(url.toString());
  if (!res.ok) return [];
  return res.json();
}

export async function searchMessages(roomId: string, q: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages/search`);
  url.searchParams.set("q", q);
  const res = await apiFetch(url.toString());
  if (!res.ok) return [];
  return res.json();
}

export async function toggleReaction(messageId: string, emoji: string): Promise<Message> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error("Failed to toggle reaction");
  return res.json();
}

export async function editMessage(messageId: string, content: string): Promise<Message> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to edit message");
  return res.json();
}

export async function deleteMessage(messageId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete message");
}

export async function getThread(roomId: string, messageId: string): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/messages/${messageId}/thread`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMentions(limit = 50): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/messages/mentions?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}
