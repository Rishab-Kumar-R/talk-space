"use client";

import { useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { UserSummary } from "../../../shared/types";
import { Avatar } from "./Avatar";

interface Props {
  dmQuery: string;
  setDmQuery: (v: string) => void;
  dmResults: UserSummary[];
  onSelect: (username: string) => void;
  onClose: () => void;
}

export function DMSearchModal({ dmQuery, setDmQuery, dmResults, onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}
      style={{ backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)" }}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>New Direct Message</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
               style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            <Search size={14} style={{ color: "var(--text-3)" }} />
            <input
              ref={inputRef}
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              placeholder="Search by username..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-1)" }}
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {dmResults.length === 0 && dmQuery.trim() && (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-3)" }}>No users found</p>
          )}
          {dmResults.length === 0 && !dmQuery.trim() && (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-3)" }}>Type a username to search</p>
          )}
          {dmResults.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelect(user.username)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ color: "var(--text-1)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div className="relative shrink-0">
                <Avatar name={user.username} size={32} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{user.username}</p>
                {user.statusText && (
                  <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{user.statusText}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
