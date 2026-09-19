"use client";

/* OutcomeChip — what kind of thing a match is.
 *
 * NEVER maps an outcome onto --status-ok / warn / danger / info / neutral.
 *
 * Status answers "how is this going". An outcome answers "what kind of thing is
 * this". Different questions, and collapsing them has a specific, predictable
 * cost: a `timing` item is an uncleared cheque, which is the most routine event
 * in a month and the reason a statement and a ledger are SUPPOSED to disagree
 * at period end. Tint it amber and it reads as a problem. Do that to half the
 * rows and nobody believes any colour on the screen again.
 *
 * That is the two-bucket bug — the one the five outcomes exist to fix —
 * reappearing as paint after the data model has stopped making it. So the
 * outcomes get their own ramp in globals.css, exactly as agent identity does,
 * and this component is the only thing that reads it.
 *
 * The chip is flat and tinted, with no border and no shadow, matching
 * ui/Status: it is a label with a background, not a control. Giving it chrome
 * made the status chip read as something you could press, and it would do the
 * same here.
 */

import type { CSSProperties } from "react";
import type { MatchOutcome } from "@/lib/reconciliation/match";

/* The label a reviewer reads, and the token trio behind it.
 *
 * Labels are the primary carrier of meaning and the colour is the second cue,
 * which is why every chip says its own name rather than relying on a legend.
 * "Needs fixing" rather than "needs-adjustment": the contract's identifier is
 * for code, and the screen gets the plain words the specs use. */
const OUTCOME: Record<
  MatchOutcome,
  { label: string; mark: string; bg: string; ink: string; meaning: string }
> = {
  matched: {
    label: "Matched",
    mark: "var(--outcome-matched)",
    bg: "var(--outcome-matched-bg)",
    ink: "var(--outcome-matched-ink)",
    meaning: "Paired, and a rule says why",
  },
  timing: {
    label: "Timing",
    mark: "var(--outcome-timing)",
    bg: "var(--outcome-timing-bg)",
    ink: "var(--outcome-timing-ink)",
    meaning: "One-sided, and expected to clear on its own",
  },
  "bank-only": {
    label: "Bank only",
    mark: "var(--outcome-bank-only)",
    bg: "var(--outcome-bank-only-bg)",
    ink: "var(--outcome-bank-only-ink)",
    meaning: "On the statement, absent from the books",
  },
  "ledger-only": {
    label: "Ledger only",
    mark: "var(--outcome-ledger-only)",
    bg: "var(--outcome-ledger-only-bg)",
    ink: "var(--outcome-ledger-only-ink)",
    meaning: "In the books, with no reason to expect it to clear",
  },
  "needs-adjustment": {
    label: "Needs fixing",
    mark: "var(--outcome-needs-adjustment)",
    bg: "var(--outcome-needs-adjustment-bg)",
    ink: "var(--outcome-needs-adjustment-ink)",
    meaning: "A genuine difference that needs a person",
  },
};

export function outcomeLabel(outcome: MatchOutcome): string {
  return OUTCOME[outcome].label;
}

export function outcomeMeaning(outcome: MatchOutcome): string {
  return OUTCOME[outcome].meaning;
}

export function outcomeMark(outcome: MatchOutcome): string {
  return OUTCOME[outcome].mark;
}

/* The 6px mark, for a dense row that already carries its own label. */
export function OutcomeDot({
  outcome,
  size = 6,
  style,
}: {
  outcome: MatchOutcome;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: OUTCOME[outcome].mark,
        ...style,
      }}
    />
  );
}

export function OutcomeChip({
  outcome,
  showDot = true,
  style,
}: {
  outcome: MatchOutcome;
  showDot?: boolean;
  style?: CSSProperties;
}) {
  const o = OUTCOME[outcome];
  return (
    <span
      className="inline-flex items-center shrink-0"
      style={{
        height: "var(--control-sm)",
        padding: showDot ? "0 8px 0 6px" : "0 8px",
        gap: "var(--space-3)",
        background: o.bg,
        borderRadius: 999,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        fontWeight: "var(--weight-medium)",
        color: o.ink,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showDot && <OutcomeDot outcome={outcome} />}
      {o.label}
    </span>
  );
}
