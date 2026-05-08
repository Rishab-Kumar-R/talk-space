import { Download, FileText } from "lucide-react";
import { Message } from "../../../shared/types";
import { formatBytes } from "../../../shared/lib/utils";

export function FileMessage({ msg }: { msg: Message }) {
  if (msg.messageType === "image") {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img
          src={msg.fileUrl}
          alt={msg.fileName ?? "image"}
          className="max-w-xs max-h-64 rounded-xl object-cover hover:opacity-90 transition-opacity"
          style={{ border: "1px solid var(--border)" }}
        />
      </a>
    );
  }
  return (
    <a
      href={msg.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 mt-1 px-3 py-2.5 rounded-xl transition-colors"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; }}
    >
      <FileText size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate max-w-[200px]" style={{ color: "var(--text-1)" }}>
          {msg.fileName}
        </p>
        {msg.fileSize != null && (
          <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{formatBytes(msg.fileSize)}</p>
        )}
      </div>
      <Download size={13} style={{ color: "var(--text-3)", flexShrink: 0 }} />
    </a>
  );
}
