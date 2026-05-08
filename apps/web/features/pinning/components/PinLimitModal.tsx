"use client";

import { Pin } from "lucide-react";
import { Message } from "../../../shared/types";
import { Avatar } from "../../users/components/Avatar";

interface Props {
  pinnedMessages: Message[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PinLimitModal({ pinnedMessages, onConfirm, onCancel }: Props) {
  const oldest = pinnedMessages[0];

  return (
    <div className="modal-backdrop" onClick={onCancel}
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
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Pin size={15} style={{ color: "var(--accent)" }} />
            <p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>Pin limit reached (5/5)</p>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
            Pinning this will remove the oldest pin to make room.
          </p>

          {oldest && (
            <div className="rounded-xl px-3 py-2.5 mb-4"
                 style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: "var(--text-3)" }}>Will be unpinned</p>
              <div className="flex items-start gap-2">
                <Avatar name={oldest.senderUsername} size={22} />
                <div className="min-w-0">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
                    {oldest.senderUsername}
                  </span>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-2)" }}>
                    {oldest.messageType === "image" ? "Image"
                      : oldest.messageType === "file" ? oldest.fileName
                      : oldest.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Remove oldest &amp; pin
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--bg-input)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
