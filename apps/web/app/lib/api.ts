const API_BASE = "http://localhost:8080/api";

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: string;
  replyToId?: string;
  replyPreview?: string;
  reactions?: Record<string, string[]>;
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Username already taken");
  return (await res.json()).token;
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return (await res.json()).token;
}

export async function getMessages(roomId: string, before?: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages`);
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function getRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function createRoom(name: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Could not create room");
  return res.json();
}

export async function getPresence(roomId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/presence`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function searchMessages(roomId: string, q: string): Promise<Message[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages/search`);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function toggleReaction(messageId: string, emoji: string): Promise<Message> {
  const res = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error("Failed to toggle reaction");
  return res.json();
}

export interface UserSummary {
  id: string;
  username: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarColor: string | null;
}

export async function searchUsers(q: string): Promise<UserSummary[]> {
  const res = await fetch(
    `${API_BASE}/users/search?q=${encodeURIComponent(q)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function getMe(): Promise<UserProfile | null> {
  const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function updateProfile(
  displayName: string,
  avatarColor: string,
): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ displayName, avatarColor }),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function markRoomRead(roomId: string): Promise<void> {
  await fetch(`${API_BASE}/rooms/${roomId}/read`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/rooms/unread`, { headers: authHeaders() });
  if (!res.ok) return {};
  return res.json();
}
