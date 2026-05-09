import { API_BASE, apiFetch, safeJson } from "../../shared/lib/api-client";
import { Message } from "../../shared/types";

export async function getMessages(roomId: string, before?: string): Promise<Message[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : "";
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/messages${qs}`);
  if (!res.ok) return [];
  return (await safeJson<Message[]>(res)) ?? [];
}

export async function searchMessages(roomId: string, q: string): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/messages/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await safeJson<Message[]>(res)) ?? [];
}

export async function searchMessagesGlobal(q: string): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/messages/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await safeJson<Message[]>(res)) ?? [];
}

export async function toggleReaction(messageId: string, emoji: string): Promise<Message> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error("Failed to toggle reaction");
  return (await safeJson<Message>(res))!;
}

export async function editMessage(messageId: string, content: string): Promise<Message> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to edit message");
  return (await safeJson<Message>(res))!;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete message");
}

export async function getThread(roomId: string, messageId: string): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/messages/${messageId}/thread`);
  if (!res.ok) return [];
  return (await safeJson<Message[]>(res)) ?? [];
}

export async function getMentions(limit = 50): Promise<Message[]> {
  const res = await apiFetch(`${API_BASE}/messages/mentions?limit=${limit}`);
  if (!res.ok) return [];
  return (await safeJson<Message[]>(res)) ?? [];
}

export async function voteOnPoll(messageId: string, optionIndex: number): Promise<Message> {
  const res = await apiFetch(`${API_BASE}/messages/${messageId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIndex }),
  });
  if (!res.ok) throw new Error("Failed to vote");
  return (await safeJson<Message>(res))!;
}

