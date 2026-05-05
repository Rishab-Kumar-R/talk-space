export const AVATAR_COLORS = [
  "#c4a882", "#82b4a4", "#a49ac4", "#c4827a", "#8aa4c4",
  "#b4a882", "#82c4a0", "#c482b4", "#a4c482", "#9490c4",
];

export const PROFILE_COLORS = [
  "#c4a882", "#82b4a4", "#a49ac4", "#c4827a", "#8aa4c4",
  "#b4a882", "#82c4a0", "#c482b4", "#e07b54", "#54a0e0",
];

export const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export function avatarBg(name: string): string {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isDM(name: string): boolean {
  return name.startsWith("dm.");
}

export function dmPartner(roomId: string, self: string): string {
  return roomId.replace("dm.", "").split(".").find((p) => p !== self) ?? roomId;
}

export function buildDMRoomId(a: string, b: string): string {
  return `dm.${[a, b].sort().join(".")}`;
}

export function typingText(users: string[], self: string): string {
  const others = users.filter((u) => u !== self);
  if (others.length === 0) return "";
  if (others.length === 1) return `${others[0]} is typing...`;
  if (others.length === 2) return `${others[0]} and ${others[1]} are typing...`;
  if (others.length <= 4)
    return `${others.slice(0, -1).join(", ")} and ${others[others.length - 1]} are typing...`;
  return `${others[0]}, ${others[1]} and ${others.length - 2} others are typing...`;
}
