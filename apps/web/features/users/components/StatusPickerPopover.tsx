"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { UserStatus } from "../../../shared/types";
import { StatusDot, STATUS_LABEL } from "./StatusDot";

interface Props {
  status: UserStatus;
  statusText: string;
  onSave: (status: UserStatus, text: string) => Promise<void>;
  onClose: () => void;
}

const STATUS_COLORS: Record<UserStatus, string> = {
  available: "#10b981",
  away: "#f59e0b",
  dnd: "#ef4444",
};

export function StatusPickerPopover({ status, statusText, onSave, onClose }: Props) {
  const [localStatus, setLocalStatus] = useState<UserStatus>(status);
  const [localText, setLocalText] = useState(statusText);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(localStatus, localText);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        right: 0,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "var(--sh-4)",
        zIndex: 100,
        padding: "12px 14px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Set status
        </span>
        <button className="icon-btn" onClick={onClose}><X size={13} /></button>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {(["available", "away", "dnd"] as UserStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setLocalStatus(s)}
            style={{
              flex: 1, padding: "6px 4px", borderRadius: 7, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              border: `1px solid ${localStatus === s ? STATUS_COLORS[s] : "var(--border)"}`,
              background: localStatus === s ? `${STATUS_COLORS[s]}18` : "transparent",
              color: localStatus === s ? STATUS_COLORS[s] : "var(--text-muted)",
              fontSize: 11, fontWeight: localStatus === s ? 600 : 400,
              fontFamily: "inherit", transition: "all .12s",
            }}
          >
            <StatusDot status={s} size={6} />
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <input
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        placeholder="What's your status?"
        maxLength={80}
        autoFocus
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 7,
          border: "1px solid var(--border)", outline: "none",
          background: "transparent", color: "var(--text)",
          fontSize: 13, fontFamily: "inherit",
          marginBottom: 10, boxSizing: "border-box",
        }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onClose();
        }}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%", padding: "7px 0", borderRadius: 7, border: 0,
          background: "var(--accent)", color: "white",
          fontSize: 12.5, fontWeight: 600,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
          fontFamily: "inherit",
        }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
