"use client";

import { marked } from "marked";
import DOMPurify from "dompurify";
import { useMemo } from "react";

marked.use({ gfm: true, breaks: true });

const renderer = new marked.Renderer();
renderer.image = () => "";

export function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { renderer }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ["p", "strong", "em", "code", "pre", "a", "ul", "ol", "li", "blockquote", "br"],
      ALLOWED_ATTR: ["href", "target", "rel"],
      FORCE_BODY: false,
    });
  }, [content]);

  return (
    <div
      className="msg-content text-warm-800 text-sm leading-relaxed break-words"
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
