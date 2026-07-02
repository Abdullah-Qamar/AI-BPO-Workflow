"use client";

/* Tooltip — hover-triggered lifted card with optional colored leading dot.
 * Matches the "Inconsistency detected (1)" pattern from the references:
 * white surface, soft depth-3 shadow, rounded ~12px, small accent dot. */

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type TooltipTone = "neutral" | "danger" | "success" | "info" | "violet";

const DOT: Record<TooltipTone, string> = {
  neutral: "#9DB3C5",
  danger: "#FF0000",
  success: "#1EFF00",
  info: "#001AFF",
  violet: "#7C4DFF",
};

export function Tooltip({
  label,
  tone = "neutral",
  side = "top",
  delayMs = 120,
  children,
}: {
  label: ReactNode;
  tone?: TooltipTone;
  side?: "top" | "bottom" | "left" | "right";
  delayMs?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delayMs);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const positionStyle: CSSProperties = (() => {
    switch (side) {
      case "bottom":
        return { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
      case "left":
        return { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
      case "right":
        return { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
      case "top":
      default:
        return { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
    }
  })();

  return (
    <span
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: "relative", display: "inline-flex" }}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="inline-flex items-center"
          style={{
            position: "absolute",
            zIndex: 50,
            padding: "8px 12px",
            gap: 8,
            background: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "var(--shadow-depth-3)",
            borderRadius: 10,
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            ...positionStyle,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: DOT[tone],
              flexShrink: 0,
            }}
          />
          {label}
        </span>
      )}
    </span>
  );
}
