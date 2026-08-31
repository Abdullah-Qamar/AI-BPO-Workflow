"use client";

/* Overlay scaffolding — backdrop + centered floating surface. Use for modals,
 * confirmation dialogs, and full-screen wizards. */

import { useEffect, type ReactNode } from "react";

export function Overlay({
  open,
  onDismiss,
  children,
}: {
  open: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 100,
        background: "var(--scrim)",
        backdropFilter: "blur(var(--scrim-blur))",
        WebkitBackdropFilter: "blur(var(--scrim-blur))",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
    >
      {children}
    </div>
  );
}

export function OverlayCard({
  children,
  width = 480,
  style,
}: {
  children: ReactNode;
  width?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        maxWidth: "calc(100vw - 48px)",
        maxHeight: "calc(100vh - 48px)",
        background: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-depth-4)",
        borderRadius: "var(--radius-panel)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
