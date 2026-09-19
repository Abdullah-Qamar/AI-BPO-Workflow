"use client";

/* OpenItemRow — one thing still waiting to clear, on an account.
 *
 * NEVER renders without an age, and the age is NEVER passed in.
 *
 * The second half is what makes the first half true. `ageDays` is not a prop:
 * this component takes the date the item was written and the date the period
 * ended, and subtracts. A stored age is a number that was correct once, and an
 * open item's whole nature is that it survives periods — cheque 1042 is 7 days
 * old at the May close, 37 at the June close and 99 at the August close, and
 * every one of those is computed at a close rather than ticking up on a clock.
 *
 * Measuring from the PERIOD END rather than from today matters for the same
 * reason. An item's age is a property of the item at a close, so re-opening the
 * May reconciliation in September must still say 7 days. Age measured from
 * today would quietly re-age history every time somebody looked at it.
 *
 * Past 90 days an item is stale, which is not a reconciliation problem — the
 * arithmetic is fine and the proof still ties. It is an operations problem: a
 * cheque written three months ago that the payee never presented, with three
 * ways out, two of which write to the ledger.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §4, docs/TAXONOMY_AND_IA.md Part 3 joint 1.
 */

import { Money } from "./Money";

export const STALE_AFTER_DAYS = 90;

/* Whole days between two ISO dates. Exported because the account screen and the
 * proof both need the same arithmetic, and two implementations of "how old is
 * this" is how two surfaces come to disagree about one cheque. */
export function ageInDays(writtenOn: string, periodEnd: string): number {
  const days =
    (Date.parse(`${periodEnd}T00:00:00Z`) -
      Date.parse(`${writtenOn}T00:00:00Z`)) /
    86_400_000;
  return Math.max(0, Math.round(days));
}

export function isStale(writtenOn: string, periodEnd: string): boolean {
  return ageInDays(writtenOn, periodEnd) > STALE_AFTER_DAYS;
}

export function OpenItemRow({
  description,
  reference,
  amount,
  writtenOn,
  periodEnd,
}: {
  description: string;
  /* The cheque number or control number. What identifies the item in its own
   * system, which is what a person types into Yardi to find it. */
  reference?: string;
  amount: number;
  /* ISO date the item was written or banked. */
  writtenOn: string;
  /* ISO date of the close this row is being read at. */
  periodEnd: string;
}) {
  const age = ageInDays(writtenOn, periodEnd);
  const stale = age > STALE_AFTER_DAYS;

  return (
    <div
      className="list-row flex flex-row items-center"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-6)",
        borderRadius: "var(--radius-row)",
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">{description}</span>
        <span className="t-meta ink-tertiary truncate">
          {reference && <span className="nums">{reference} · </span>}
          <span className="nums">{age}</span> {age === 1 ? "day" : "days"} old
          {stale && (
            /* Stale says its own name rather than taking a tint. The item is
              * not an error and the proof still ties with it in place; what it
              * needs is chasing, voiding or writing back, and a red row would
              * suggest the month is wrong when it is not. */
            <span
              style={{
                color: "var(--ink-secondary)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              {" · stale, over 90 days"}
            </span>
          )}
        </span>
      </div>

      <Money
        amount={amount}
        form="plain"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          flexShrink: 0,
        }}
      />
    </div>
  );
}
