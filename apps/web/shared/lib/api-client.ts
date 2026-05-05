export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080") + "/api";

export function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
