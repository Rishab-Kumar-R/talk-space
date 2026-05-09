"use client";

import { X } from "lucide-react";
import { UserStatus } from "../../../shared/types";
import { Avatar } from "./Avatar";
import { StatusDot, STATUS_LABEL } from "./StatusDot";

interface Props {
  username: string;
  editDisplayName: string;
  setEditDisplayName: (v: string) => void;
  editAvatarColor: string;
  setEditAvatarColor: (v: string) => void;
  editShowReceipts: boolean;
  setEditShowReceipts: (v: boolean) => void;
  editStatus: UserStatus;
  setEditStatus: (v: UserStatus) => void;
  editStatusText: string;
  setEditStatusText: (v: string) => void;
  editDndStart: string;
  setEditDndStart: (v: string) => void;
  editDndEnd: string;
  setEditDndEnd: (v: string) => void;
  savingProfile: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

const STATUS_COLORS: Record<UserStatus, string> = {
  available: "#10b981",
  away: "#f59e0b",
  dnd: "#ef4444",
};

export function ProfileModal({
  username,
  editDisplayName, setEditDisplayName,
  editAvatarColor, setEditAvatarColor,
  editShowReceipts, setEditShowReceipts,
  editStatus, setEditStatus,
  editStatusText, setEditStatusText,
  editDndStart, setEditDndStart,
  editDndEnd, setEditDndEnd,
  savingProfile,
  onSave,
  onClose,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}
      style={{ backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)" }}>
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-4)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 400,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Edit profile</p>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={onSave}>
          {/* Avatar preview */}
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 8px" }}>
            <div style={{ position: "relative", cursor: "pointer" }}>
              <Avatar name={username} size={72} color={editAvatarColor} style={{ borderRadius: "50%" }} />
            </div>
          </div>

          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Display name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", display: "block", marginBottom: 6 }}>
                Display name
              </label>
              <input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder={username}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  border: "1px solid var(--border)", outline: "none",
                  background: "transparent", color: "var(--text)",
                  fontSize: 14, fontFamily: "inherit",
                  transition: "border-color .15s",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; (e.target as HTMLInputElement).style.boxShadow = "var(--sh-glow)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
              <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>Shown in the sidebar. Username stays the same.</p>
            </div>

            {/* Status */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", display: "block", marginBottom: 8 }}>
                Status
              </label>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {(["available", "away", "dnd"] as UserStatus[]).map((s) => (
                  <button
                    key={s} type="button" onClick={() => setEditStatus(s)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      border: `1px solid ${editStatus === s ? STATUS_COLORS[s] : "var(--border)"}`,
                      background: editStatus === s ? `${STATUS_COLORS[s]}18` : "transparent",
                      color: editStatus === s ? STATUS_COLORS[s] : "var(--text-muted)",
                      fontSize: 12.5, fontWeight: editStatus === s ? 600 : 400,
                      fontFamily: "inherit", transition: "all .12s",
                    }}
                  >
                    <StatusDot status={s} size={7} />
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <input
                value={editStatusText}
                onChange={(e) => setEditStatusText(e.target.value)}
                placeholder="What's your status? (optional)"
                maxLength={80}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  border: "1px solid var(--border)", outline: "none",
                  background: "transparent", color: "var(--text)",
                  fontSize: 13.5, fontFamily: "inherit",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
            </div>

            {/* Read receipts */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Read receipts</p>
                <p style={{ fontSize: 12, color: "var(--text-faint)" }}>Let others see when you've read their messages</p>
              </div>
              <button
                type="button"
                onClick={() => setEditShowReceipts(!editShowReceipts)}
                style={{
                  width: 38, height: 20, borderRadius: 999, border: 0,
                  background: editShowReceipts ? "var(--accent)" : "var(--border-strong)",
                  cursor: "pointer", position: "relative", flexShrink: 0,
                  transition: "background .2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, width: 16, height: 16,
                  background: "white", borderRadius: "50%",
                  transition: "left .2s",
                  left: editShowReceipts ? 20 : 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </button>
            </div>

            {/* DND hours */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", display: "block", marginBottom: 6 }}>
                Do Not Disturb hours
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="time"
                  value={editDndStart}
                  onChange={(e) => setEditDndStart(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 8,
                    border: "1px solid var(--border)", outline: "none",
                    background: "transparent", color: "var(--text)",
                    fontSize: 13, fontFamily: "inherit",
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                />
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>to</span>
                <input
                  type="time"
                  value={editDndEnd}
                  onChange={(e) => setEditDndEnd(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 8,
                    border: "1px solid var(--border)", outline: "none",
                    background: "transparent", color: "var(--text)",
                    fontSize: 13, fontFamily: "inherit",
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                />
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>No notifications during these hours. Leave blank to disable.</p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
              <button
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={savingProfile}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: 0,
                  background: "var(--accent)", color: "white",
                  fontSize: 13, fontWeight: 600,
                  cursor: savingProfile ? "default" : "pointer",
                  opacity: savingProfile ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {savingProfile ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
