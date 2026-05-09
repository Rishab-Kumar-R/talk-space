"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "../../../shared/types";
import { getUser } from "../api";
import { Avatar } from "./Avatar";
import { StatusDot, STATUS_LABEL } from "./StatusDot";

// Module-level cache so profiles aren't re-fetched on every hover
const cache = new Map<string, UserProfile>();

interface Props {
  username: string;
  anchorRect: DOMRect;
}

export function MemberHoverCard({ username, anchorRect }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(cache.get(username) ?? null);

  useEffect(() => {
    if (cache.has(username)) return;
    getUser(username).then((p) => {
      if (p) {
        cache.set(username, p);
        setProfile(p);
      }
    });
  }, [username]);

  const CARD_W = 210;
  const CARD_H = 90;
  let top = anchorRect.bottom + 8;
  if (top + CARD_H > window.innerHeight - 8) top = anchorRect.top - CARD_H - 8;
  let left = anchorRect.left + anchorRect.width / 2 - CARD_W / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - CARD_W - 8));

  const status = profile?.status ?? "available";

  return (
    <div
      style={{
        position: "fixed", top, left, width: CARD_W, zIndex: 9999,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "var(--sh-4)",
        padding: "12px 14px",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={username} size={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.displayName || username}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>@{username}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
        <StatusDot status={status} size={7} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {profile?.statusText || STATUS_LABEL[status]}
        </span>
      </div>
    </div>
  );
}
