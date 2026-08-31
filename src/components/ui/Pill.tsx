"use client";

/* Pill — display-only colored chip with an optional leading dot.
 * Tone palette mirrors the system's status colors. */

import type { CSSProperties, ReactNode } from "react";

export type PillTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet";

/* Tones map onto the semantic status pairs in globals.css rather than carrying
 * their own hexes. They used to be a seventh palette: this file's "success"
 * green was #1EFF00 while the Dashboard's was #2FA35F and the upload card's was
 * #22C55E, all on screen at once. */
const TONE: Record<
  PillTone,
  { bg: string; border: string; text: string; dot: string }
> = {
  neutral: {
    bg: "var(--surface-control)",
    border: "#FFFFFF",
    text: "var(--ink-primary)",
    dot: "var(--line)",
  },
  info: {
    bg: "var(--status-info-bg)",
    border: "#FFFFFF",
    text: "var(--status-info-ink)",
    dot: "var(--status-info)",
  },
  success: {
    bg: "var(--status-ok-bg)",
    border: "#FFFFFF",
    text: "var(--status-ok-ink)",
    dot: "var(--status-ok)",
  },
  warning: {
    bg: "var(--status-warn-bg)",
    border: "#FFFFFF",
    text: "var(--status-warn-ink)",
    dot: "var(--status-warn)",
  },
  danger: {
    bg: "var(--status-danger-bg)",
    border: "#FFFFFF",
    text: "var(--status-danger-ink)",
    dot: "var(--status-danger)",
  },
  /* The one tone with no status meaning — used for identity, not state. */
  violet: {
    bg: "#F1EBFF",
    border: "#FFFFFF",
    text: "#4423C2",
    dot: "var(--agent-summary)",
  },
};

export function Pill({
  tone = "neutral",
  showDot = false,
  leadingIcon,
  children,
  style,
}: {
  tone?: PillTone;
  showDot?: boolean;
  leadingIcon?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const t = TONE[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: "var(--control-sm)",
        padding: "4px 8px",
        gap: 6,
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: t.text,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: t.dot,
            flexShrink: 0,
          }}
        />
      )}
      {leadingIcon && (
        <span className="inline-flex shrink-0" aria-hidden>
          {leadingIcon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
