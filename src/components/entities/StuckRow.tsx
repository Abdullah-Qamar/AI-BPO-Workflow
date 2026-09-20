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

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmPopoverButton } from "@/components/ui/ConfirmPopoverButton";
import { FileWarning } from "lucide-react";
import { Money } from "./Money";
import type { ClearedOutcome } from "@/lib/close";

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
  /* What this way out does to the document, which decides what happens to the
   * account. See `ClearedOutcome` in lib/close.ts: a file that leaves takes the
   * account back to waiting for one, a file that is fixed hands it to the
   * machine. Getting this wrong is not cosmetic — it is an account claiming to
   * be reading a statement that is no longer there. */
  outcome: ClearedOutcome;
  /* True where the action cannot honestly be one click, because it needs
   * something from a person that the machine must not invent. */
  needsInput?: boolean;
  /* The consequence, stated before the act rather than discovered after it.
   *
   * Set on the actions that change something a person cannot simply redo: a
   * move changes two accounts, and a discard removes a document. Same shape
   * the close confirm uses, and for the same reason — an irreversible step
   * whose effect is only visible afterwards is a step nobody can consent
   * to. */
  confirm?: { title: string; body: string; label: string };
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
  movesTo: { label: string; account: string; hasDocument: boolean } | undefined,
  accountLabel: string,
  onAct: ((label: string, outcome: ClearedOutcome) => void) | undefined
): StuckAction[] {
  /* The outcome travels WITH the action rather than only inside its handler,
   * because the row needs to read it too: an action that needs input opens a
   * form instead of firing, and the form fires the same outcome the button
   * would have. One source for it, so the two paths cannot disagree about what
   * happened to the document. */
  const act = (
    label: string,
    outcome: ClearedOutcome,
    extra?: Partial<StuckAction>
  ): StuckAction => ({
    label,
    outcome,
    onAct: onAct ? () => onAct(label, outcome) : undefined,
    ...extra,
  });

  switch (reason) {
    case "incomplete-read":
      return [
        act("Re-upload", "handed-back", { primary: true, needsInput: true }),
        act("Try another export format", "handed-back"),
      ];
    case "unreadable-line":
      return [
        act("Fill in the missing field", "handed-back", {
          primary: true,
          needsInput: true,
        }),
      ];
    case "wrong-period":
      return [
        act(subject ? `Open ${subject}` : "Open that period", "moved-away", {
          primary: true,
        }),
        act("Confirm this is a re-statement", "handed-back"),
      ];
    case "wrong-account":
      /* No sibling to route it to means no destination, and an action naming
       * no destination is the dead end this component exists to prevent. The
       * honest offer is to take it out rather than to invent a target. */
      if (!subject || !movesTo) {
        return [
          act("Take it out of this account", "moved-away", {
            primary: true,
            confirm: {
              title: "Take the statement out",
              body: `${accountLabel} then has no statement and goes back to waiting for one. The file is not deleted; it leaves this account and needs placing by hand.`,
              label: "Take it out",
            },
          }),
        ];
      }
      return [
        act(`Move to ${subject}`, "moved-away", {
          primary: true,
          confirm: {
            title: `Move it to ${subject}`,
            /* Two different acts wearing one label, and the body is where they
             * separate. To an account with nothing, this is the statement
             * arriving. To one that already read a statement for this period,
             * it is a second document on the same account and month, which is
             * the duplicate case and needs settling there rather than here. */
            body: movesTo.hasDocument
              ? `${accountLabel} then has no statement and goes back to waiting for one. ${subject} has already read a statement for this period, so it will have two and somebody has to say which one counts.`
              : `${accountLabel} then has no statement and goes back to waiting for one. ${subject} is waiting for one, so the month can run there.`,
            label: "Move it",
          },
        }),
      ];
    case "duplicate":
      return [
        act("Discard", "moved-away", {
          primary: true,
          confirm: {
            title: "Discard this file",
            body: `The copy already taken in is kept and stays the one this month reconciles against. ${accountLabel} is unaffected by the discard.`,
            label: "Discard it",
          },
        }),
        act("Replace the earlier one", "handed-back"),
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
  atRisk = false,
  missingField,
  movesTo,
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
  /* On course to miss the lock, in the same words and the same treatment the
   * account rows use.
   *
   * A blocked account is still an account waiting on a person, so it counts
   * toward the headline's at-risk figure — and because the Stuck section draws
   * its rows with this component rather than AccountRow, leaving it off here
   * made the headline say six while five rows carried the mark. The number and
   * the rows have to be the same accounts. */
  atRisk?: boolean;
  /* The row the Reader stopped on, for `unreadable-line`. Without it the form
   * would ask somebody to supply a control number for a row they cannot see,
   * which is a worse dead end than the one this replaces. */
  missingField?: { date: string; amount: number; description: string };
  /* Where a misrouted statement belongs, and whether that account already has
   * one. The second half changes what the confirm says, because a move into an
   * empty account and a move into a full one are different acts. */
  movesTo?: { label: string; account: string; hasDocument: boolean };
  onAct?: (label: string, outcome: ClearedOutcome) => void;
}) {
  const actions = actionsFor(
    reason,
    subject,
    movesTo,
    accountLabel,
    onAct
  );

  /* The form is open or it is not. One piece of state, because only one action
   * on any of the five reason codes needs input from a person today. */
  const [filling, setFilling] = useState(false);
  const [control, setControl] = useState("");

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
        <span className="t-prose ink-secondary">
          {explanation}
          {atRisk && (
            <span
              style={{
                color: "var(--ink-secondary)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              {" "}
              It is on course to miss the lock.
            </span>
          )}
        </span>

        {/* Always present. See the header comment: the actions come from the
          * reason code, and every reason code has at least one. */}
        <div
          className="flex flex-row flex-wrap"
          style={{ gap: "var(--space-4)", marginTop: "var(--space-2)" }}
        >
          {actions.map((a) =>
            /* Three shapes, and which one an action takes is a property of
              * what it does rather than a style choice:
              *
              *   confirm  it changes something a person cannot simply redo —
              *            a move touches two accounts, a discard drops a file
              *   form     it needs something typed that the machine must not
              *            invent
              *   plain    everything else */
            a.confirm ? (
              <ConfirmPopoverButton
                key={a.label}
                label={a.label}
                variant={a.primary ? "primary" : "secondary"}
                size="sm"
                align="left"
                confirmTitle={a.confirm.title}
                confirmBody={a.confirm.body}
                confirmLabel={a.confirm.label}
                onConfirm={() => a.onAct?.()}
              />
            ) : (
              <Button
                key={a.label}
                variant={a.primary ? "primary" : "secondary"}
                size="sm"
                onClick={
                  /* "Fill in the missing field" opens the field. It cannot
                    * resolve on the click, because the sentence directly above
                    * it says "Nothing has been guessed" — and a button that
                    * fixes a missing control number without asking anybody for
                    * one has guessed. The copy and the control have to
                    * agree. */
                  reason === "unreadable-line" && a.needsInput
                    ? () => setFilling(true)
                    : a.onAct
                }
              >
                {a.label}
              </Button>
            )
          )}
        </div>

        {/* ---------- Supplying the missing field ----------
          *
          * The row is shown read-only and the one thing that is absent is the
          * one thing there is a box for. That shape is the argument: the
          * machine extracted a date and an amount and stopped at a control
          * number it could not read, and it is handing over exactly the gap
          * rather than asking a person to re-key the line.
          *
          * Submit stays off until something is typed. There is no default, no
          * placeholder that looks like a value, and no "skip" — a blank
          * control number is the state the run already refused to continue
          * from, so offering to continue with one would undo the guarantee the
          * explanation just made. */}
        {filling && missingField && (
          <div
            className="flex flex-col"
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-5)",
              gap: "var(--space-5)",
              borderRadius: "var(--radius-sheet)",
              background: "var(--surface-list)",
              border: "1px solid var(--line-hair)",
            }}
          >
            <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <span className="t-label">The row that stopped</span>
              <div
                className="flex flex-row items-baseline"
                style={{ gap: "var(--space-5)" }}
              >
                <span className="t-body ink-secondary nums shrink-0">
                  {missingField.date}
                </span>
                <span className="t-body ink-primary flex-1 min-w-0 truncate">
                  {missingField.description}
                </span>
                <Money
                  amount={missingField.amount}
                  /* Signed, like every other statement line in the product.
                    * `plain` drops the sign, and a debit rendered as a positive
                    * figure on the one row a person is being asked to identify
                    * is exactly the wrong place to lose it. */
                  form="signed"
                  style={{
                    fontSize: "var(--type-body)",
                    lineHeight: "var(--leading-ui)",
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <label className="t-label" htmlFor={`control-${documentName}`}>
                Control number
              </label>
              <input
                id={`control-${documentName}`}
                value={control}
                onChange={(e) => setControl(e.target.value)}
                placeholder="As printed on the statement"
                className="t-body ink-primary nums"
                style={{
                  height: "var(--control-md)",
                  padding: "0 var(--space-4)",
                  borderRadius: "var(--radius-control)",
                  background: "#FFFFFF",
                  border: "1px solid var(--line-soft)",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <span className="t-meta ink-tertiary">
                Taken from the statement, never derived. The run continues from
                the row it stopped on.
              </span>
            </div>

            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-4)" }}
            >
              <Button
                variant="primary"
                size="sm"
                disabled={control.trim().length === 0}
                onClick={() => {
                  onAct?.(
                    `Supplied control number ${control.trim()}`,
                    "handed-back"
                  );
                  setFilling(false);
                }}
              >
                Supply it and carry on
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilling(false);
                  setControl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
