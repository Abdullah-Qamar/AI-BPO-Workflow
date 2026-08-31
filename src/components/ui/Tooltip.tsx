"use client";

/* Tooltip — hover-triggered floating label with an optional coloured dot.
 *
 * Frosted, not opaque. A tooltip is the most transient surface in the app and
 * the thing it most needs to say is "I am on top of what you were looking at,
 * and you have not lost it" — which is exactly what letting the backdrop show
 * through, blurred, says. Same `.glass` recipe as the menus, so every floating
 * surface in the product is made of the same material.
 *
 * Deliberately light-on-dark's opposite: the OS renders a native `title` as a
 * dark chip, and having those and this on one screen was two tooltip designs. */

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type TooltipTone = "neutral" | "danger" | "success" | "info" | "violet";

const DOT: Record<TooltipTone, string> = {
  neutral: "var(--line)",
  danger: "var(--status-danger)",
  success: "var(--status-ok)",
  info: "var(--status-info)",
  violet: "var(--agent-summary)",
};

export function Tooltip({
  label,
  tone = "neutral",
  side = "top",
  delayMs = 120,
  block = false,
  children,
}: {
  label: ReactNode;
  tone?: TooltipTone;
  side?: "top" | "bottom" | "left" | "right";
  delayMs?: number;
  /* Wrap a full-width target — a listing row — rather than an inline control.
   * The wrapper is inline-flex by default, which collapses a block child to
   * its content width; `block` keeps the row at 100%. */
  block?: boolean;
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
      style={{
        position: "relative",
        display: block ? "block" : "inline-flex",
        width: block ? "100%" : undefined,
      }}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="glass inline-flex items-center"
          style={{
            position: "absolute",
            zIndex: 50,
            padding: "6px 10px",
            gap: 8,
            borderRadius: "var(--radius-sheet)",
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
            /* A one-line label never wraps; a multi-line one is given a
             * measure and allowed to. `pre-line` so an authored "\n" in the
             * label survives, which is how a row's overflow detail is written. */
            whiteSpace: "pre-line",
            maxWidth: 320,
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
