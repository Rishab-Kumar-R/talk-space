"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "info";
interface ToastItem { id: number; message: string; variant: ToastVariant; }

interface ToastCtx { toast: (message: string, variant?: ToastVariant) => void; }
const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 8, zIndex: 9999,
        pointerEvents: "none", alignItems: "center",
      }}>
        {items.map((item) => (
          <div key={item.id} style={{
            padding: "10px 18px", borderRadius: 8,
            background: item.variant === "error" ? "var(--accent-rose, #e54d4d)" : "var(--panel-3, #333)",
            color: "white",
            fontSize: 13.5, fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            animation: "toast-in 0.2s ease",
            whiteSpace: "nowrap",
            border: item.variant === "success" ? "1px solid rgba(255,255,255,0.15)" : "none",
          }}>
            {item.variant === "success" && <span style={{ marginRight: 6 }}>✓</span>}
            {item.variant === "error" && <span style={{ marginRight: 6 }}>✕</span>}
            {item.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
