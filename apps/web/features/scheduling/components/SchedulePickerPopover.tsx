"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";

interface Props {
  onSchedule: (isoString: string) => void;
  onClose: () => void;
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minDatetime(): string {
  const d = new Date(Date.now() + 60_000);
  return toLocalDatetimeValue(d);
}

export function SchedulePickerPopover({ onSchedule, onClose }: Props) {
  const [value, setValue] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(0, 0, 0);
    return toLocalDatetimeValue(d);
  });

  function handleConfirm() {
    if (!value) return;
    const iso = new Date(value).toISOString();
    onSchedule(iso);
    onClose();
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: 0,
        zIndex: 300,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "var(--sh-4)",
        padding: "14px 16px 12px",
        minWidth: 260,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Schedule message</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-faint)", display: "grid", placeItems: "center" }}
        >
          <X size={13} />
        </button>
      </div>

      <input
        type="datetime-local"
        value={value}
        min={minDatetime()}
        onChange={(e) => setValue(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          marginBottom: 10,
        }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!value}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7,
            border: 0, background: "var(--accent)", color: "white",
            fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            opacity: !value ? 0.5 : 1,
          }}
        >
          Schedule
        </button>
      </div>
    </div>
  );
}
