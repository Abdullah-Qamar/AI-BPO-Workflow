"use client";

/* Status primitives.
 *
 * One vocabulary for "how is this going", rendered two ways: a 6px mark for
 * dense rows where the label is carried by the row itself, and a tinted chip
 * where the state has to say its own name.
 *
 * Before this existed the app drew status eight structurally different ways —
 * bare spans, ringed dots, hollow strokes, glyph circles, tinted text pills —
 * and spelled the same state five different ways ("Complete", "Completed",
 * "Done", "Posted", "Closed"). The labels now come from one table, so a filter
 * chip on one screen and a session row on another cannot disagree.
 *
 * Spec: docs/design-system/decisions.md §1, §4.
 */

import type { CSSProperties } from "react";
import { STATUS_META, type StatusKey } from "@/lib/seed";

export type StatusTone = "ok" | "warn" | "danger" | "info" | "neutral";

/* Semantic pairs from globals.css. `mark` is the dot and the stroke; `bg` and
 * `ink` are the chip. Neutral is the one tone with no colour of its own —
 * "not started" is an absence, and tinting it would make it look like an
 * event. */
const TONE: Record<StatusTone, { mark: string; bg: string; ink: string }> = {
  ok: {
    mark: "var(--status-ok)",
    bg: "var(--status-ok-bg)",
    ink: "var(--status-ok-ink)",
  },
  warn: {
    mark: "var(--status-warn)",
    bg: "var(--status-warn-bg)",
    ink: "var(--status-warn-ink)",
  },
  danger: {
    mark: "var(--status-danger)",
    bg: "var(--status-danger-bg)",
    ink: "var(--status-danger-ink)",
  },
  info: {
    mark: "var(--status-info)",
    bg: "var(--status-info-bg)",
    ink: "var(--status-info-ink)",
  },
  neutral: {
    mark: "var(--line)",
    bg: "var(--surface-control)",
    ink: "var(--ink-tertiary)",
  },
};

export function statusTone(status: StatusKey): StatusTone {
  return STATUS_META[status].tone;
}

export function statusLabel(status: StatusKey): string {
  return STATUS_META[status].label;
}

export function toneColors(tone: StatusTone) {
  return TONE[tone];
}

/* The mark. 6px by default, which is the size every dense row wants; the
 * optional white ring is for marks that sit on a photo, a logo or a coloured
 * fill rather than on a flat surface. */
export function StatusDot({
  status,
  tone,
  size = 6,
  ring = false,
  style,
}: {
  status?: StatusKey;
  tone?: StatusTone;
  size?: number;
  ring?: boolean;
  style?: CSSProperties;
}) {
  const t = TONE[tone ?? (status ? statusTone(status) : "neutral")];
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: t.mark,
        border: ring ? "1px solid #FFFFFF" : undefined,
        boxShadow: ring ? "var(--shadow-depth-1)" : undefined,
        ...style,
      }}
    />
  );
}

/* The chip. Flat and tinted — no border, no shadow: it is a label with a
 * background, not a control, and giving it chrome made it read as something
 * you could press. */
export function StatusChip({
  status,
  tone,
  label,
  showDot = true,
  style,
}: {
  status?: StatusKey;
  tone?: StatusTone;
  /* Overrides the table only where the surface genuinely names something else
   * (an agent's present-tense action, say). Status states take the table. */
  label?: string;
  showDot?: boolean;
  style?: CSSProperties;
}) {
  const key = status ?? "not-started";
  const t = TONE[tone ?? statusTone(key)];
  return (
    <span
      className="inline-flex items-center shrink-0"
      style={{
        height: "var(--control-sm)",
        padding: showDot ? "0 8px 0 6px" : "0 8px",
        gap: "var(--space-3)",
        background: t.bg,
        borderRadius: 999,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        fontWeight: "var(--weight-medium)",
        color: t.ink,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showDot && <StatusDot tone={tone ?? statusTone(key)} />}
      {label ?? statusLabel(key)}
    </span>
  );
}
