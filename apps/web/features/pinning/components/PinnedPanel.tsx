"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { X } from "lucide-react";
import { Message } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { FileMessage } from "../../messaging/components/FileMessage";

interface Props {
  pinnedMessages: Message[];
  onUnpin: (messageId: string) => void;
  onClose: () => void;
}

function PinnedItem({ msg, onUnpin }: { msg: Message; onUnpin: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 16px",
        background: hovered ? "var(--hover)" : "transparent",
        transition: "background .1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar name={msg.senderUsername} size={26} style={{ borderRadius: "50%", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{msg.senderUsername}</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatTime(msg.timestamp)}</span>
        </div>
        {msg.messageType === "image" || msg.messageType === "file"
          ? <FileMessage msg={msg} />
          : (
            <p style={{
              fontSize: 13, color: "var(--text)", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {msg.content}
            </p>
          )
        }
      </div>
      <button
        onClick={() => onUnpin(msg.id)}
        title="Unpin"
        style={{
          flexShrink: 0, width: 24, height: 24,
          border: 0, borderRadius: 4,
          background: "transparent",
          color: "var(--text-faint)",
          cursor: "pointer",
          display: "grid", placeItems: "center",
          opacity: hovered ? 1 : 0,
          transition: "opacity .1s, color .1s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-rose)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function PinnedPanel({ pinnedMessages, onUnpin, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(panelRef.current, { x: 24, opacity: 0, duration: 0.22, ease: "power3.out" });
  }, []);

  return (
    <div ref={panelRef} className="thread-panel" style={{ width: 320 }}>
      <div className="thread-head">
        <div style={{ flex: 1 }}>
          <div className="title">Pinned messages</div>
          <div className="sub">{pinnedMessages.length} / 5 pins used</div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      <div className="thread-stream">
        {pinnedMessages.length === 0 && (
          <p style={{ fontSize: 12, textAlign: "center", padding: "32px 18px", color: "var(--text-faint)" }}>
            No pinned messages yet
          </p>
        )}
        {pinnedMessages.map((msg) => (
          <PinnedItem key={msg.id} msg={msg} onUnpin={onUnpin} />
        ))}
      </div>
    </div>
  );
}
