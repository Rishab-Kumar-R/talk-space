"use client";

import { RefObject, useEffect } from "react";
import { X, Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { Message } from "../../../shared/types";
import { formatTime } from "../../../shared/lib/utils";
import { Avatar } from "../../users/components/Avatar";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResults: Message[];
  searching: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
}

export function SearchPanel({ searchQuery, setSearchQuery, searchResults, searching, searchInputRef, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    /* Overlay backdrop */
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
        <style>{`
          @keyframes cmdRise {
            from { transform: translateY(-8px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Search input */}
        <div className="flex items-center gap-3 px-[18px] py-[14px]" style={{ borderBottom: "1px solid var(--divider)" }}>
          <Search size={18} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Search messages…"
            className="flex-1 bg-transparent outline-none text-[16px] leading-tight"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
                    className="px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors"
                    style={{ background: "var(--panel-3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[480px] overflow-y-auto">
          {!searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Search size={28} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
              <p className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>Type to search messages</p>
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
                  className="flex items-start gap-3 px-3 py-[9px] rounded-[9px] mx-[6px] mb-0.5 cursor-pointer transition-colors"
                  style={{ fontSize: "13.5px" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--active)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Avatar name={msg.senderUsername} size={28} style={{ borderRadius: 8, marginTop: 1 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold" style={{ color: "var(--text)" }}>{msg.senderUsername}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>{formatTime(msg.timestamp)}</span>
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
            to select
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
