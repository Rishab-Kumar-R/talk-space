"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { X, ArrowUp, Paperclip } from "lucide-react";
import { Message, ReadReceipt } from "../../../shared/types";
import { Avatar } from "../../users/components/Avatar";
import { MarkdownContent } from "../../../shared/lib/markdown";
import { formatTime, typingText } from "../../../shared/lib/utils";

interface Props {
  rootMessage: Message;
  threadMessages: Message[];
  loading: boolean;
  activeRoomName?: string;
  typingUsers: string[];
  streamRef?: React.RefObject<HTMLDivElement | null>;
  receipts?: Record<string, ReadReceipt[]>;
  showReadReceipts?: boolean;
  username?: string;
  onFetchReceipts?: (messageId: string) => void;
  onClose: () => void;
  onSendReply: (content: string, threadId: string) => void;
  onTyping: () => void;
}

export function ThreadPanel({
  rootMessage, threadMessages, loading, activeRoomName, typingUsers,
  streamRef, receipts = {}, showReadReceipts = false, username, onFetchReceipts,
  onClose, onSendReply, onTyping,
}: Props) {
  const [reply, setReply] = useState("");
  const panelRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(panelRef.current, { x: 24, opacity: 0, duration: 0.22, ease: "power3.out" });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    onSendReply(reply.trim(), rootMessage.id);
    setReply("");
  }

  const replyCount = threadMessages.length;
  const channelName = activeRoomName ? `#${activeRoomName}` : "channel";
  const typingLine = typingText(typingUsers, "");

  return (
    <aside ref={panelRef} className="thread-panel">

      {/* ── Header */}
      <div className="thread-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title">Thread</div>
          <div className="sub">{channelName}{replyCount > 0 ? ` · ${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : ""}</div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      {/* ── Stream */}
      <div ref={streamRef} className="thread-stream">

        {/* Root message */}
        <div style={{
          display: "flex", gap: 12,
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}>
          <Avatar name={rootMessage.senderUsername} size={32} style={{ borderRadius: "50%", flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>{rootMessage.senderUsername}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{formatTime(rootMessage.timestamp)}</span>
            </div>
            <div className="msg-text" style={{ fontSize: 14 }}>
              <MarkdownContent content={rootMessage.content} />
            </div>
          </div>
        </div>

        {/* Replies separator */}
        {replyCount > 0 && (
          <div className="thread-sep">
            <span className="line" />
            <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
            <span className="line" />
          </div>
        )}

        {loading && (
          <p style={{ fontSize: 12, textAlign: "center", padding: "16px 0", color: "var(--text-faint)" }}>Loading…</p>
        )}

        {!loading && replyCount === 0 && (
          <p style={{ fontSize: 12, textAlign: "center", padding: "24px 18px", color: "var(--text-faint)" }}>
            No replies yet. Start the thread!
          </p>
        )}

        {threadMessages.map((m) => {
          const isOwn = m.senderUsername === username;
          const msgReceipts = receipts[m.id] ?? [];
          const readers = msgReceipts.filter(r => r.username !== username);
          return (
            <div
              key={m.id}
              data-message-id={m.id}
              style={{ display: "flex", gap: 10, padding: "7px 20px", transition: "background .1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Avatar name={m.senderUsername} size={26} style={{ borderRadius: "50%", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{m.senderUsername}</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatTime(m.timestamp)}</span>
                </div>
                <div className="msg-text" style={{ fontSize: 14 }}>
                  <MarkdownContent content={m.content} />
                </div>
                {showReadReceipts && isOwn && readers.length > 0 && (
                  <button
                    onClick={() => onFetchReceipts?.(m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
                    title={readers.map(r => r.username).join(", ")}
                  >
                    {readers.slice(0, 3).map((r) => (
                      <Avatar key={r.username} name={r.username} size={14} style={{ borderRadius: "50%" }} />
                    ))}
                    {readers.length > 3 && (
                      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>+{readers.length - 3}</span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: 2 }}>
                      Seen by {readers.length > 1 ? `${readers[0].username} and ${readers.length - 1} more` : readers[0].username}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ height: 12 }} />
      </div>

      {/* ── Typing indicator */}
      <div style={{ height: 18, padding: "0 20px", flexShrink: 0 }}>
        {typingLine && (
          <p style={{ fontSize: 11.5, fontStyle: "italic", color: "var(--text-faint)" }}>{typingLine}</p>
        )}
      </div>

      {/* ── Composer */}
      <form onSubmit={handleSubmit} style={{ flexShrink: 0, padding: "0 16px 16px" }}>
        <div className="composer">
          <input
            value={reply}
            onChange={(e) => { setReply(e.target.value); onTyping(); }}
            placeholder={`Reply in ${channelName}…`}
            className="composer-input"
            style={{ fontSize: 14 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="composer-foot">
            <button type="button" className="icon-btn" title="Attach">
              <Paperclip size={14} strokeWidth={1.75} />
            </button>
            <span className="hint">⏎ to send</span>
            <button type="submit" disabled={!reply.trim()} className="send">
              <ArrowUp size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
