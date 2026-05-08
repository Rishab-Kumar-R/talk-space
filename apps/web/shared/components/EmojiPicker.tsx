"use client";

import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { useEffect, useRef } from "react";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Picker
        data={data}
        onEmojiSelect={(e: { native: string }) => { onSelect(e.native); onClose(); }}
        theme="auto"
        previewPosition="none"
        skinTonePosition="none"
        perLine={8}
        maxFrequentRows={2}
      />
    </div>
  );
}
