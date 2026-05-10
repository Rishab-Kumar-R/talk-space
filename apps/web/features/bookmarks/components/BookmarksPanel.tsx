"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { X, Bookmark, Paperclip } from "lucide-react";
import { Bookmark as BookmarkType } from "../hooks/useBookmarks";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";

interface Props {
  bookmarks: BookmarkType[];
  onRemove: (msgId: string) => void;
  onClose: () => void;
}

function BookmarkItem({ bm, onRemove }: { bm: BookmarkType; onRemove: (id: string) => void }) {
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
      <Avatar name={bm.senderUsername} size={26} style={{ borderRadius: "50%", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{bm.senderUsername}</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatTime(bm.timestamp)}</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>#{bm.roomName}</span>
        </div>
        {bm.messageType === "image" && bm.fileUrl ? (
          <Image src={bm.fileUrl!} alt={bm.fileName ?? "image"} width={120} height={80} style={{ height: 80, width: "auto", borderRadius: 6, objectFit: "cover" }} />
        ) : bm.messageType === "file" && bm.fileName ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Paperclip size={12} style={{ flexShrink: 0 }} />
            {bm.fileName}
          </p>
        ) : (
          <p style={{
            fontSize: 13, color: "var(--text)", lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {bm.content}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(bm.messageId)}
        title="Remove bookmark"
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

export function BookmarksPanel({ bookmarks, onRemove, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(panelRef.current, { x: 24, opacity: 0, duration: 0.22, ease: "power3.out" });
  }, []);

  return (
    <div ref={panelRef} className="thread-panel" style={{ width: 320 }}>
      <div className="thread-head">
        <div style={{ flex: 1 }}>
          <div className="title">Saved messages</div>
          <div className="sub">{bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}</div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      <div className="thread-stream">
        {bookmarks.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 18px" }}>
            <Bookmark size={28} style={{ color: "var(--text-faint)", margin: "0 auto 10px" }} strokeWidth={1.5} />
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>No saved messages yet</p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
              Click the bookmark icon on any message to save it here.
            </p>
          </div>
        )}
        {bookmarks.map((bm) => (
          <BookmarkItem key={bm.messageId} bm={bm} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
