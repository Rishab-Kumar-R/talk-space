"use client";

import { useEffect, useRef } from "react";
import { Hash, Lock, X } from "lucide-react";

interface Props {
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  newRoomPrivate: boolean;
  setNewRoomPrivate: (v: boolean) => void;
  createError: string;
  setCreateError: (v: string) => void;
  onCreateRoom: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CreateRoomModal({
  newRoomName, setNewRoomName,
  newRoomPrivate, setNewRoomPrivate,
  createError, setCreateError,
  onCreateRoom, onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleClose() {
    setNewRoomName("");
    setNewRoomPrivate(false);
    setCreateError("");
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}
      style={{ backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)" }}>
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-4)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 420,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Create channel</p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
              Channels are where your team communicates
            </p>
          </div>
          <button className="icon-btn" onClick={handleClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px 16px" }}>
          <form onSubmit={(e) => { onCreateRoom(e); if (!createError) handleClose(); }}>

            {/* Name */}
            <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-faint)", display: "block", marginBottom: 6 }}>
              Channel name
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              background: "var(--panel)",
              boxShadow: "var(--sh-glow)",
              marginBottom: 16,
            }}>
              <Hash size={14} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={newRoomName}
                onChange={(e) => { setNewRoomName(e.target.value); setCreateError(""); }}
                placeholder="e.g. design-feedback"
                style={{
                  flex: 1, border: 0, outline: "none", background: "transparent",
                  fontSize: 14, color: "var(--text)", fontFamily: "inherit",
                }}
                onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
              />
            </div>

            {createError && (
              <p style={{ fontSize: 12, color: "var(--accent-rose)", marginBottom: 12 }}>{createError}</p>
            )}

            {/* Visibility */}
            <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-faint)", display: "block", marginBottom: 8 }}>
              Visibility
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {([false, true] as const).map((isPrivate) => (
                <button
                  key={String(isPrivate)}
                  type="button"
                  onClick={() => setNewRoomPrivate(isPrivate)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                    border: `1px solid ${newRoomPrivate === isPrivate ? "var(--accent)" : "var(--border)"}`,
                    background: newRoomPrivate === isPrivate ? "var(--accent-soft)" : "transparent",
                    fontFamily: "inherit",
                  }}
                >
                  {isPrivate ? <Lock size={14} style={{ color: "var(--accent)", flexShrink: 0 }} /> : <Hash size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: newRoomPrivate === isPrivate ? "var(--accent)" : "var(--text)" }}>
                      {isPrivate ? "Private" : "Public"}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      {isPrivate ? "Invite only" : "Anyone can join"}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button" onClick={handleClose}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newRoomName.trim()}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: 0,
                  background: newRoomName.trim() ? "var(--accent)" : "var(--hover)",
                  color: newRoomName.trim() ? "white" : "var(--text-faint)",
                  fontSize: 13, fontWeight: 600, cursor: newRoomName.trim() ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                Create channel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
