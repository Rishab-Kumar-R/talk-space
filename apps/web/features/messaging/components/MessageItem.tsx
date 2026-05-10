"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  CornerUpLeft, MessageSquare, Smile, Pencil, Trash2, Pin, PinOff, Bookmark, BookmarkCheck,
} from "lucide-react";
import { Message, ReadReceipt } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { FileMessage } from "./FileMessage";
import { PollMessage } from "./PollMessage";
import { MarkdownContent } from "../../../shared/lib/markdown";

interface Props {
  msg: Message;
  display: Message;
  username: string;
  myAvatarColor?: string | null;
  isGrouped?: boolean;
  editingId: string | null;
  editDraft: string;
  setEditDraft: (v: string) => void;
  emojiPickerFor: string | null;
  setEmojiPickerFor: (id: string | null) => void;
  currentIsDM: boolean;
  pinnedIds: string[];
  receipts: Record<string, ReadReceipt[]>;
  showReadReceipts: boolean;
  onReply: (msg: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onStartEdit: (msg: Message) => void;
  onSubmitEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onDelete: (messageId: string) => void;
  onPin: (msg: Message) => void;
  onUnpin: (messageId: string) => void;
  onFetchReceipts: (messageId: string) => void;
  onOpenThread: (msg: Message) => void;
  isBookmarked: boolean;
  onBookmark: (msg: Message) => void;
  onVoted: (updated: Message) => void;
}

export function MessageItem({
  msg, display, username, myAvatarColor, isGrouped = false,
  editingId, editDraft, setEditDraft,
  emojiPickerFor, setEmojiPickerFor,
  currentIsDM, pinnedIds, receipts, showReadReceipts,
  onReply, onReaction, onStartEdit, onSubmitEdit, onCancelEdit,
  onDelete, onPin, onUnpin, onFetchReceipts, onOpenThread,
  isBookmarked, onBookmark, onVoted,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

  useGSAP(() => {
    gsap.from(rowRef.current, { opacity: 0, y: 6, duration: 0.2, ease: "power2.out" });
  }, []);

  const reactionEntries = Object.entries(display.reactions ?? {});
  const isPinned = pinnedIds.includes(msg.id);
  const isOwn = display.senderUsername === username;
  const showEmoji = emojiPickerFor === msg.id;
  const isEditing = editingId === msg.id;
  const isMentioned = !isOwn && (display.mentions?.includes(username) ?? false);

  return (
    <div
      ref={rowRef}
      data-message-id={msg.id}
      className={`msg-group${isGrouped ? " follow" : ""}${isMentioned ? " mentioned" : ""}`}
    >
      {/* Avatar / time-side for grouped */}
      {isGrouped ? (
        <div style={{ width: 28, flexShrink: 0, position: "relative" }}>
          <span className="msg-time-side">
            {formatTime(display.timestamp).replace(" AM", "").replace(" PM", "")}
          </span>
        </div>
      ) : (
        <div className="msg-avatar">
          <Avatar
            name={display.senderUsername}
            size={28}
            color={isOwn && myAvatarColor ? myAvatarColor : undefined}
            style={{ borderRadius: "50%" }}
          />
        </div>
      )}

      {/* Content */}
      <div className="msg-body">
        {/* Header */}
        {!isGrouped && (
          <div className="msg-head">
            <span className="msg-author">{display.senderUsername}</span>
            <span className="msg-time">
              {formatTime(display.timestamp)}
              {display.editedAt && !isEditing && (
                <span className="ml-1" style={{ fontStyle: "italic" }}>(edited)</span>
              )}
            </span>
          </div>
        )}

        {/* Reply quote */}
        {display.replyToId && display.replyPreview && (
          <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 4, maxWidth: "90%" }}>
            <div style={{ width: 3, borderRadius: 3, background: "var(--accent)", flexShrink: 0, opacity: 0.6 }} />
            <div style={{ paddingLeft: 8 }}>
              {display.replyToUsername && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", marginRight: 5 }}>
                  {display.replyToUsername}
                </span>
              )}
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {display.replyPreview}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmitEdit(msg.id); }}
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <input
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onCancelEdit(); }}
              style={{
                width: "100%", padding: "6px 10px",
                fontSize: 15, lineHeight: 1.55, color: "var(--text)",
                background: "var(--hover)",
                border: "1px solid var(--border-strong)",
                borderRadius: 6, outline: "none",
                fontFamily: "inherit",
                boxShadow: "var(--sh-glow)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="submit"
                style={{
                  padding: "3px 10px", borderRadius: 5, border: 0,
                  background: "var(--accent)", color: "white",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >Save</button>
              <button
                type="button"
                onClick={onCancelEdit}
                style={{
                  padding: "3px 8px", borderRadius: 5,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}
              >Cancel</button>
              <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: 2 }}>esc to cancel</span>
            </div>
          </form>
        ) : display.messageType === "poll" ? (
          <PollMessage msg={display} username={username} onVoted={onVoted} />
        ) : display.messageType === "image" || display.messageType === "file" ? (
          <div className="rounded-xl overflow-hidden inline-block">
            <FileMessage msg={display} />
          </div>
        ) : (
          <div className="msg-text">
            <MarkdownContent content={display.content} currentUser={username} />
          </div>
        )}

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div className="reactions">
            {reactionEntries.map(([emoji, users]) => {
              const mine = users.includes(username);
              return (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); onReaction(msg.id, emoji); }}
                  className={`reaction${mine ? " mine" : ""}`}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              );
            })}
            <button
              onClick={() => setEmojiPickerFor(msg.id)}
              className="reaction"
              title="Add reaction"
            >
              <Smile size={12} style={{ color: "var(--text-faint)" }} />
            </button>
          </div>
        )}

        {/* Thread count */}
        {!currentIsDM && (display.threadCount ?? 0) > 0 && (
          <div className="thread-indicator" onClick={() => onOpenThread(display)}>
            <div className="stack">
              <div className="a" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {display.senderUsername.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="count">{display.threadCount} {display.threadCount === 1 ? "reply" : "replies"}</span>
            <span className="last">Last reply 2 min ago</span>
          </div>
        )}
      </div>

      <div className="msg-actions" onClick={(e) => e.stopPropagation()}>
        {/* Quick reaction strip */}
        {showEmoji && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 4 }}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                title={emoji}
                onClick={() => { onReaction(msg.id, emoji); setEmojiPickerFor(null); }}
                style={{ fontSize: 15, lineHeight: 1, background: "transparent", border: 0, cursor: "pointer", padding: "2px 3px", borderRadius: 5 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button title="React" aria-label="Add reaction" onClick={() => setEmojiPickerFor(showEmoji ? null : msg.id)}>
          <Smile size={15} />
        </button>
          <button title="Reply" aria-label="Reply to message" onClick={() => onReply(display)}>
            <CornerUpLeft size={15} />
          </button>
          {!currentIsDM && (
            <button title="Reply in thread" aria-label="Reply in thread" onClick={() => onOpenThread(display)}>
              <MessageSquare size={15} />
            </button>
          )}
          <button
            title={isBookmarked ? "Remove bookmark" : "Save message"}
            aria-label={isBookmarked ? "Remove bookmark" : "Save message"}
            onClick={() => onBookmark(display)}
            style={isBookmarked ? { color: "var(--accent)" } : {}}
          >
            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
          <span className="sep" />
          {isOwn && display.messageType !== "poll" && (
            <button title="Edit" aria-label="Edit message" onClick={() => onStartEdit(display)}>
              <Pencil size={14} />
            </button>
          )}
          <button title={isPinned ? "Unpin" : "Pin"} aria-label={isPinned ? "Unpin message" : "Pin message"} onClick={() => isPinned ? onUnpin(msg.id) : onPin(display)}>
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          {isOwn && (
            <button
              title="Delete"
              aria-label="Delete message"
              onClick={() => onDelete(msg.id)}
              style={{ color: "var(--accent-rose)" }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
    </div>
  );
}
