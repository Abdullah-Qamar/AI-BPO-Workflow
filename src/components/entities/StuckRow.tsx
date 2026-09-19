"use client";

/* StuckRow — a document that could not be read, with the way out beside it.
 *
 * NEVER renders without at least one action. This component exists because the
 * current build announces problems and offers nothing: two file chips reading
 * "2 files unclassified" that do not respond to a click, a "two possible
 * matches, can't choose" whose candidates live only in a prose string, and a
 * genuine 75.00 difference whose only exit was to mark it approved.
 *
 * Those are the same bug three times, and the flows document names it as this
 * product's characteristic defect: a surface that says something is wrong and
 * gives the person nowhere to go.
 *
 * So the rule is enforced by construction rather than by care. The actions are
 * not a prop. They are looked up from the reason code, which is a closed union
 * of the Reader's five failure kinds, and every one of the five has at least
 * one action in the table below. There is no way to build a StuckRow with no
 * way out, because there is no prop through which to leave them off.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §2, docs/AI_ARCHITECTURE.md Part 3 §1,
 * docs/FLOWS.md F1.
 */

import { Button } from "@/components/ui/Button";
import { FileWarning } from "lucide-react";

/* The Reader's five failure kinds. Each is detected differently and each needs
 * a different route out, which is the point of having five rather than one
 * "the totals did not reproduce, so we stopped". */
export type StuckReason =
  /* Extracted totals do not equal the statement's own declared control totals.
   * The document grades the Reader's homework, and this is a failing grade. */
  | "incomplete-read"
  /* One line parsed partially. The run can continue once a person supplies the
   * field, and never by the Reader inventing it. */
  | "unreadable-line"
  /* The statement's period is not this reconciliation's period. */
  | "wrong-period"
  /* The account number on the statement resolves to a different account. */
  | "wrong-account"
  /* The file fingerprint matches one already taken in. */
  | "duplicate";

/* One action a person can take. `primary` gets the filled button; everything
 * else is secondary, because two equally weighted buttons make a person choose
 * before they have read either. */
export interface StuckAction {
  label: string;
  primary?: boolean;
  onAct?: () => void;
}

/* The table that makes the rule structural. A reason code cannot exist here
 * without actions, and `actionsFor` has no branch that returns an empty list.
 *
 * `subject` is interpolated into the labels that need it — "Open April 2026",
 * "Move to Reserve ••••9034" — because an action reading "Open that period" is
 * a button that makes a person guess which period it means. */
function actionsFor(
  reason: StuckReason,
  subject: string | undefined,
  onAct: ((label: string) => void) | undefined
): StuckAction[] {
  const act = (label: string): StuckAction["onAct"] =>
    onAct ? () => onAct(label) : undefined;

  switch (reason) {
    case "incomplete-read":
      return [
        { label: "Re-upload", primary: true, onAct: act("Re-upload") },
        {
          label: "Try another export format",
          onAct: act("Try another export format"),
        },
      ];
    case "unreadable-line":
      return [
        {
          label: "Fill in the missing field",
          primary: true,
          onAct: act("Fill in the missing field"),
        },
      ];
    case "wrong-period":
      return [
        {
          label: subject ? `Open ${subject}` : "Open that period",
          primary: true,
          onAct: act("Open that period"),
        },
        {
          label: "Confirm this is a re-statement",
          onAct: act("Confirm this is a re-statement"),
        },
      ];
    case "wrong-account":
      return [
        {
          label: subject ? `Move to ${subject}` : "Move to the right account",
          primary: true,
          onAct: act("Move to the right account"),
        },
      ];
    case "duplicate":
      return [
        { label: "Discard", primary: true, onAct: act("Discard") },
        {
          label: "Replace the earlier one",
          onAct: act("Replace the earlier one"),
        },
      ];
  }
}

const REASON_WORDS: Record<StuckReason, string> = {
  "incomplete-read": "Incomplete read",
  "unreadable-line": "Unreadable line",
  "wrong-period": "Wrong period",
  "wrong-account": "Wrong account",
  duplicate: "Duplicate",
};

export function StuckRow({
  accountLabel,
  documentName,
  reason,
  explanation,
  subject,
  onAct,
}: {
  accountLabel: string;
  documentName: string;
  reason: StuckReason;
  /* One line, in the reviewer's words, saying what the machine found. Not the
   * error text: "the closing balance in the file is 301,980.10 and the lines
   * add up to 298,140.60" is something a person can act on, where "checksum
   * mismatch" is not. */
  explanation: string;
  /* The period or account a "wrong period" / "wrong account" action points at,
   * so the button can name it. */
  subject?: string;
  onAct?: (label: string) => void;
}) {
  const actions = actionsFor(reason, subject, onAct);

  return (
    <div
      className="flex flex-row items-start"
      style={{
        padding: "var(--space-5) var(--space-6)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
        background: "var(--surface-list)",
        boxShadow: "var(--shadow-depth-1)",
      }}
    >
      <FileWarning
        size="var(--icon-md)"
        strokeWidth="var(--stroke-md)"
        style={{ color: "var(--ink-tertiary)", flexShrink: 0, marginTop: 1 }}
        aria-hidden
      />

      <div className="flex flex-col min-w-0 flex-1" style={{ gap: "var(--space-3)" }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="t-body ink-primary">
            {accountLabel} · {REASON_WORDS[reason]}
          </span>
          <span className="t-meta ink-tertiary truncate">{documentName}</span>
        </div>
        <span className="t-prose ink-secondary">{explanation}</span>

        {/* Always present. See the header comment: the actions come from the
          * reason code, and every reason code has at least one. */}
        <div
          className="flex flex-row flex-wrap"
          style={{ gap: "var(--space-4)", marginTop: "var(--space-2)" }}
        >
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={a.primary ? "primary" : "secondary"}
              size="sm"
              onClick={a.onAct}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
