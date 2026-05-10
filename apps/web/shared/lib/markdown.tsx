"use client";

import { marked } from "marked";
import DOMPurify from "dompurify";
import { useMemo } from "react";

const EMOJI_ONLY_RE = /^(\p{Emoji_Presentation}|\p{Emoji}️|‍)+\s*$/u;
import hljs from "highlight.js";

marked.use({ gfm: true, breaks: true });

const renderer = new marked.Renderer();
renderer.image = () => "";
renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language }).value;
  const label = language !== "plaintext" ? `<span class="hljs-lang-label">${language}</span>` : "";
  return `<pre><code class="hljs language-${language}">${highlighted}</code>${label}</pre>`;
};

function highlightMentions(text: string, currentUser?: string): string {
  return text.replace(
    /@([a-zA-Z0-9._-]+)/g,
    (_, user) => {
      const isMe = currentUser && user.toLowerCase() === currentUser.toLowerCase();
      return `<span class="mention${isMe ? " me" : ""}">@${user}</span>`;
    },
  );
}

export function MarkdownContent({ content, currentUser }: { content: string; currentUser?: string }) {
  const isEmojiOnly = useMemo(() => EMOJI_ONLY_RE.test(content?.trim() ?? ""), [content]);

  const html = useMemo(() => {
    if (isEmojiOnly) return "";
    const withMentions = highlightMentions(content ?? "", currentUser);
    const raw = marked.parse(withMentions, { renderer }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ["p", "strong", "em", "code", "pre", "a", "ul", "ol", "li", "blockquote", "br", "span"],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
      FORCE_BODY: false,
      ALLOW_DATA_ATTR: false,
    });
  }, [content, currentUser, isEmojiOnly]);

  if (isEmojiOnly) {
    return (
      <div className="msg-content" style={{ fontSize: "2.2em", lineHeight: 1.2 }}>
        {content?.trim()}
      </div>
    );
  }

  return (
    <div
      className="msg-content text-sm leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function applyFormat(
  value: string,
  selStart: number,
  selEnd: number,
  syntax: { prefix: string; suffix: string },
): { value: string; selStart: number; selEnd: number } {
  const { prefix, suffix } = syntax;
  const selected = value.slice(selStart, selEnd);
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const newValue = `${before}${prefix}${selected}${suffix}${after}`;
  return {
    value: newValue,
    selStart: selStart + prefix.length,
    selEnd: selEnd + prefix.length,
  };
}
