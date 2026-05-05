"use client";

import { useRef, useCallback } from "react";

export function useTyping(sendTyping: () => void) {
  const typingThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onKeyPress = useCallback(() => {
    if (!typingThrottle.current) {
      sendTyping();
      typingThrottle.current = setTimeout(() => {
        typingThrottle.current = null;
      }, 1000);
    }
  }, [sendTyping]);

  return { onKeyPress };
}
