"use client";

import { RefObject, useEffect } from "react";
import { X, Search, CornerDownLeft, ArrowUp, ArrowDown, Hash } from "lucide-react";
import { Message } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";
import { SearchScope } from "../hooks/useSearch";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResults: Message[];
  searching: boolean;
  scope: SearchScope;
  setScope: (s: SearchScope) => void;
  activeRoomName?: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onResultClick: (msg: Message) => void;
  onClose: () => void;
}

export function SearchPanel({
  searchQuery, setSearchQuery, searchResults, searching,
  scope, setScope, activeRoomName,
  searchInputRef, onResultClick, onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start"
      style={{
        background: "oklch(20% 0.012 265 / 0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        paddingTop: "12vh",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[600px] max-w-[90vw] rounded-[20px] overflow-hidden"
        style={{
          background: "var(--panel-translucent)",
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-4)",
          animation: "cmdRise 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-[18px] py-[14px]" style={{ borderBottom: "1px solid var(--divider)" }}>
          <Search size={18} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder={scope === "all" ? "Search all channels…" : `Search in #${activeRoomName ?? "channel"}…`}
            className="flex-1 bg-transparent outline-none text-[16px] leading-tight"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
                    className="px-2 py-1 rounded-lg text-[11.5px] font-medium"
                    style={{ background: "var(--panel-3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-1 px-3 pt-2 pb-1">
          {(["room", "all"] as SearchScope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                fontFamily: "inherit", cursor: "pointer", border: 0,
                background: scope === s ? "var(--accent)" : "transparent",
                color: scope === s ? "white" : "var(--text-muted)",
                transition: "all .12s",
              }}
              onMouseEnter={(e) => { if (scope !== s) (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (scope !== s) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {s === "room" ? `#${activeRoomName ?? "This channel"}` : "All channels"}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[440px] overflow-y-auto">
          {!searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search size={28} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
              <p className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                {scope === "all" ? "Search across all channels" : `Search in #${activeRoomName ?? "this channel"}`}
              </p>
            </div>
          )}
          {searching && (
            <div className="py-8 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>Searching…</div>
          )}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                No results for <strong style={{ color: "var(--text)" }}>&quot;{searchQuery}&quot;</strong>
              </p>
            </div>
          )}
          {!searching && searchResults.length > 0 && (
            <>
              <div className="px-[12px] pt-[10px] pb-1 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                Results · {searchResults.length}
              </div>
              {searchResults.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 px-3 py-[9px] rounded-[9px] mx-[6px] mb-0.5 cursor-pointer"
                  style={{ fontSize: "13.5px" }}
                  onClick={() => { onResultClick(msg); onClose(); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--active)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Avatar name={msg.senderUsername} size={28} style={{ borderRadius: 8, marginTop: 1, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold" style={{ color: "var(--text)" }}>{msg.senderUsername}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>{formatTime(msg.timestamp)}</span>
                      {scope === "all" && (
                        <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--panel-3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          <Hash size={9} strokeWidth={2.5} />
                          {msg.roomId}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] truncate" style={{ color: "var(--text-muted)" }}>{msg.content}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-[14px] py-2" style={{ borderTop: "1px solid var(--divider)" }}>
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <kbd className="px-1.5 py-0.5 rounded flex items-center" style={{ background: "var(--panel-3)", border: "1px solid var(--border)" }}>
              <CornerDownLeft size={10} />
            </kbd>
            jump to room
          </span>
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <kbd className="px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "var(--panel-3)", border: "1px solid var(--border)" }}>
              <ArrowUp size={10} /><ArrowDown size={10} />
            </kbd>
            navigate
          </span>
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <kbd className="px-1.5 py-px rounded text-[10px]" style={{ background: "var(--panel-3)", border: "1px solid var(--border)" }}>Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
