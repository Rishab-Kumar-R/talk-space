// Central type definitions shared across all features

export type UserStatus = "available" | "away" | "dnd";

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: string;
  replyToId?: string;
  replyPreview?: string;
  replyToUsername?: string;
  reactions?: Record<string, string[]>;
  editedAt?: string;
  deleted?: boolean;
  mentions?: string[];
  threadId?: string;
  threadCount?: number;
  messageType?: "text" | "image" | "file" | "poll" | "system";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  pollOptions?: string[];
  pollVotes?: Record<string, number>;
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  pinnedMessageIds?: string[];
  isPrivate?: boolean;
  memberRoles?: Record<string, string>;
  description?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  status: UserStatus;
  statusText: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarColor: string | null;
  showReadReceipts: boolean;
  status: UserStatus;
  statusText: string;
}

export interface ReadReceipt {
  username: string;
  readAt: string;
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  messageType: "image" | "file";
}

export interface PublicRoomSummary {
  name: string;
  createdBy: string;
  createdAt: string;
  onlineCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
}

export interface ScheduledMessage {
  id: string;
  roomId: string;
  senderUsername: string;
  content: string;
  messageType: string;
  scheduledFor: string;
  sent: boolean;
  cancelled: boolean;
  createdAt: string;
}

export interface NotificationPrefs {
  mutedRooms: string[];
  dndStart: string | null;
  dndEnd: string | null;
}

export interface ReplyTo {
  id: string;
  username: string;
  preview: string;
}
