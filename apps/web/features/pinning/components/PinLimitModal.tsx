"use client";

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
    <div
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-warm-50 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-warm-900 font-semibold text-sm mb-1">Pin limit reached (5/5)</p>
          <p className="text-warm-600 text-xs mb-4">
            Pinning this message will remove the oldest pin to make room.
          </p>

          {oldest && (
            <div className="bg-warm-200 rounded-xl px-3 py-2.5 mb-4">
              <p className="text-warm-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Will be unpinned</p>
              <div className="flex items-start gap-2">
                <Avatar name={oldest.senderUsername} size={22} />
                <div className="min-w-0">
                  <span className="text-warm-800 text-xs font-semibold">{oldest.senderUsername}</span>
                  <p className="text-warm-600 text-xs truncate mt-0.5">
                    {oldest.messageType === "image" ? "🖼️ Image"
                      : oldest.messageType === "file" ? `📎 ${oldest.fileName}`
                      : oldest.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 bg-warm-800 text-warm-50 rounded-xl py-2.5 text-sm font-semibold hover:bg-warm-900 transition-colors"
            >
              Remove oldest &amp; pin
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-warm-200 text-warm-700 rounded-xl py-2.5 text-sm font-medium hover:bg-warm-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
