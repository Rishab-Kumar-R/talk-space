"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Clock, X, Hash, MessageCircle, Trash2, RotateCcw } from "lucide-react";
import { ScheduledMessage } from "../../../shared/types";
import { isDM, dmPartner } from "../../../shared/lib/utils";

interface Props {
  scheduled: ScheduledMessage[];
  loading: boolean;
  username: string;
  onLoad: () => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string, newIso: string) => Promise<unknown>;
  onClose: () => void;
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatScheduledTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ` at ${timeStr}`;
}

function ScheduledItem({
  msg,
  username,
  onCancel,
  onReschedule,
}: {
  msg: ScheduledMessage;
  username: string;
  onCancel: (id: string) => void;
  onReschedule: (id: string, newIso: string) => Promise<unknown>;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newValue, setNewValue] = useState(toLocalDatetimeValue(new Date(msg.scheduledFor)));
  const [saving, setSaving] = useState(false);

  const isMyMessage = msg.senderUsername === username;
  const roomDisplay = isDM(msg.roomId)
    ? `@${dmPartner(msg.roomId, username)}`
    : `#${msg.roomId}`;
  const RoomIcon = isDM(msg.roomId) ? MessageCircle : Hash;

  async function handleReschedule() {
    if (!newValue) return;
    setSaving(true);
    try {
      await onReschedule(msg.id, new Date(newValue).toISOString());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: hovered ? "var(--hover)" : "transparent",
        transition: "background .1s",
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Room + time row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RoomIcon size={12} style={{ color: "var(--text-faint)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{roomDisplay}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={11} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 500 }}>
            {formatScheduledTime(msg.scheduledFor)}
          </span>
        </div>
      </div>

      {/* Content */}
      <p style={{
        fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 8,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {msg.content}
      </p>

      {/* Reschedule input (inline) */}
      {editing && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
          <input
            type="datetime-local"
            value={newValue}
            min={toLocalDatetimeValue(new Date(Date.now() + 60_000))}
            onChange={(e) => setNewValue(e.target.value)}
            style={{
              flex: 1, padding: "6px 8px", borderRadius: 7,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text)", fontSize: 12, fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={handleReschedule}
            disabled={saving}
            style={{
              padding: "6px 10px", borderRadius: 7, border: 0,
              background: "var(--accent)", color: "white",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: "6px 8px", borderRadius: 7,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Actions */}
      {isMyMessage && !editing && (
        <div style={{ display: "flex", gap: 6, opacity: hovered ? 1 : 0, transition: "opacity .1s" }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RotateCcw size={10} />
            Reschedule
          </button>
          <button
            onClick={() => onCancel(msg.id)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", borderRadius: 6,
              border: "1px solid transparent", background: "transparent",
              color: "var(--accent-rose)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Trash2 size={10} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function ScheduledPanel({ scheduled, loading, username, onLoad, onCancel, onReschedule, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(panelRef.current, { x: 24, opacity: 0, duration: 0.22, ease: "power3.out" });
  }, []);

  useEffect(() => {
    onLoad();
    const interval = setInterval(onLoad, 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={panelRef} className="thread-panel" style={{ width: 360 }}>
      <div className="thread-head">
        <div style={{ flex: 1 }}>
          <div className="title">Scheduled messages</div>
          <div className="sub">
            {loading ? "Loading…" : `${scheduled.length} pending`}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      <div className="thread-stream" style={{ padding: 0 }}>
        {!loading && scheduled.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <Clock size={28} style={{ color: "var(--text-faint)", margin: "0 auto 10px", display: "block" }} />
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>No scheduled messages</p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
              Use the clock icon in the composer to schedule a message
            </p>
          </div>
        )}
        {scheduled.map((msg) => (
          <ScheduledItem
            key={msg.id}
            msg={msg}
            username={username}
            onCancel={onCancel}
            onReschedule={onReschedule}
          />
        ))}
      </div>
    </div>
  );
}
