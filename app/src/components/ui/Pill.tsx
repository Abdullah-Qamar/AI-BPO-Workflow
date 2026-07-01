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

const TONE: Record<
  PillTone,
  { bg: string; border: string; text: string; dot: string }
> = {
  neutral: {
    bg: "#F2F4FB",
    border: "#FFFFFF",
    text: "var(--text-1)",
    dot: "#9DB3C5",
  },
  info: {
    bg: "#EAF1FF",
    border: "#FFFFFF",
    text: "#0033C2",
    dot: "#001AFF",
  },
  success: {
    bg: "#E8F8EE",
    border: "#FFFFFF",
    text: "#0F7A3D",
    dot: "#1EFF00",
  },
  warning: {
    bg: "#FFF6E8",
    border: "#FFFFFF",
    text: "#9C5A00",
    dot: "#FF8A1F",
  },
  danger: {
    bg: "#FFF2F2",
    border: "#FFC0C0",
    text: "var(--text-1)",
    dot: "#FF0000",
  },
  violet: {
    bg: "#F1EBFF",
    border: "#FFFFFF",
    text: "#4423C2",
    dot: "#7C4DFF",
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
        height: 22,
        padding: "4px 8px",
        gap: 6,
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "14px",
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
