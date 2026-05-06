import { API_BASE, apiFetch } from "../../shared/lib/api-client";
import { UserProfile, UserStatus, UserSummary } from "../../shared/types";

export async function searchUsers(q: string): Promise<UserSummary[]> {
  const res = await apiFetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMe(): Promise<UserProfile | null> {
  const res = await apiFetch(`${API_BASE}/users/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateProfile(
  displayName: string,
  avatarColor: string,
  showReadReceipts: boolean,
  status: UserStatus,
  statusText: string,
): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, avatarColor, showReadReceipts, status, statusText }),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}
