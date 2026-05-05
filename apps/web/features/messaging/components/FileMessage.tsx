import { Message } from "../../../shared/types";
import { formatBytes } from "../../../shared/lib/utils";

export function FileMessage({ msg }: { msg: Message }) {
  if (msg.messageType === "image") {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={msg.fileUrl}
          alt={msg.fileName ?? "image"}
          className="max-w-xs max-h-64 rounded-xl object-cover mt-1 border border-warm-300 hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }
  return (
    <a
      href={msg.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 mt-1 px-3 py-2.5 bg-warm-200 hover:bg-warm-300 border border-warm-300 rounded-xl transition-colors"
    >
      <span className="text-xl">📎</span>
      <div className="min-w-0">
        <p className="text-warm-900 text-xs font-medium truncate max-w-[200px]">{msg.fileName}</p>
        {msg.fileSize != null && (
          <p className="text-warm-500 text-[10px]">{formatBytes(msg.fileSize)}</p>
        )}
      </div>
      <span className="text-warm-500 text-xs ml-1">↓</span>
    </a>
  );
}
