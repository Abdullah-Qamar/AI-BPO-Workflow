"use client";

/* AccountRow — the primary row in the product. One bank account, one period.
 *
 * NEVER shows a bare percentage, and NEVER colours the state with the status
 * ramp.
 *
 * The percentage rule first: "92%" means nothing. A number gets the question it
 * answers written next to it or it does not appear, and this row has no
 * question a percentage answers. What it shows instead is money, a count of
 * items, and two ages — all of which a person can act on.
 *
 * The colour rule is the more interesting one. It would be easy to tint `stuck`
 * red and `waiting for you` amber and call it triage, and the cost arrives one
 * screen later: `timing` items are uncleared cheques, the most routine event in
 * a month, and once routine things are painted as alarms nobody believes any
 * colour on the screen. So the state is WORDS, in ink, and urgency is carried
 * by grouping instead — the Close screen puts stuck accounts in their own
 * section at the top that cannot be collapsed or scrolled past. Position is a
 * stronger signal than hue and it cannot cry wolf.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §1, docs/UX_SPECS.md section 1.
 */

import type { ReconciliationState } from "@/lib/session/types";
import { Money } from "./Money";

/* ---------- The state, as words ----------
 *
 * The machine's fourteen states are identifiers. These are what a person reads,
 * and the specs write the header as "1849 Westlake · Operating · May 2026 ·
 * waiting for you". Two vocabularies on purpose: `partially-posted` is precise
 * and unreadable, "half sent" is neither.
 *
 * One table, so a row on Close and a header on Reconcile cannot describe the
 * same state with different words — which is how this codebase came to have
 * four names for two numbers. */
const STATE_WORDS: Record<ReconciliationState, string> = {
  draft: "waiting for files",
  reading: "reading",
  blocked: "stuck",
  matching: "pairing",
  review: "waiting for you",
  proven: "proved",
  signed: "signed",
  posting: "sending",
  posted: "sent",
  "partially-posted": "half sent",
  "post-failed": "failed",
  reversed: "reversed",
  closed: "closed",
  superseded: "replaced by a later run",
};

export function stateWords(state: ReconciliationState): string {
  return STATE_WORDS[state];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export interface AccountRowProps {
  propertyLabel: string;
  accountLabel: string;
  accountNumber?: string;
  state: ReconciliationState;
  /* Dollars. Rendered only when it is not zero and the state is one where an
   * unexplained figure means something: a draft account has not been read yet,
   * so a 0.00 against it would be a claim rather than a measurement. */
  unexplained: number;
  itemsWaiting: number;
  oldestOpenItemDays: number | null;
  /* On course to miss the lock: this account has sat longer than the days left
   * in the period.
   *
   * It replaces a "waiting N days" that every row carried. Two ages side by
   * side — the age of the oldest item INSIDE the account, and how long the
   * account itself had sat — read as the same kind of fact and could not be
   * told apart at a glance. The first one stays, because it is the age the
   * ninety-day rule is about. The second was only ever worth saying when it
   * had a consequence, so it is said as the consequence and only on the rows
   * that have it. */
  atRisk?: boolean;
  /* True when the figures are seeded rather than computed from a statement. The
   * row says so, because a screen printing twenty-two figures where one came
   * from a real document is making twenty-one claims it cannot support. */
  illustrative?: boolean;
  onOpen?: () => void;
  /* Injectable for a stable preview and for tests. */
  now?: Date;
}

const MEASURED: ReconciliationState[] = [
  "review",
  "proven",
  "signed",
  "posting",
  "posted",
  "partially-posted",
  "post-failed",
];

export function AccountRow({
  propertyLabel,
  accountLabel,
  accountNumber,
  state,
  unexplained,
  itemsWaiting,
  oldestOpenItemDays,
  atRisk = false,
  illustrative = false,
  onOpen,
}: AccountRowProps) {
  /* The meta line carries only the facts that exist, and NOT the state.
   *
   * The state used to lead it, and it was on every row: a queue of nine that
   * all read "waiting for you" under a heading that already said so. A fact
   * true of every row in a list discriminates between none of them, and it was
   * spending the first and most-read words of the line to do it. The section
   * the row is in says what state it is in; the row says what is in it.
   *
   * `stateWords` is still exported and still right — the Reconcile header and
   * the Accounts screen both name a single account's state, where it IS the
   * information. It is the repetition down a column that was the problem. */
  const facts: string[] = [];
  if (itemsWaiting > 0) facts.push(plural(itemsWaiting, "item", "items"));
  if (oldestOpenItemDays !== null && oldestOpenItemDays > 0) {
    facts.push(`oldest ${plural(oldestOpenItemDays, "day", "days")}`);
  }

  const showsMoney = MEASURED.includes(state);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="list-row flex flex-row items-center w-full text-left"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-6)",
        borderRadius: "var(--radius-row)",
        background: "transparent",
        border: "1px solid transparent",
        cursor: onOpen ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">
          {propertyLabel} · {accountLabel}
          {accountNumber && (
            <span className="ink-tertiary nums"> {accountNumber}</span>
          )}
        </span>
        <span className="t-meta ink-tertiary truncate">
          {/* The separators are computed rather than hard-coded in front of
            * each part. Dropping the state word from the front of this line
            * made an empty `facts` possible for the first time — an account
            * waiting for files has no items and no ages — and a literal
            * " · illustrative" then rendered with the middot leading and
            * nothing before it. */}
          {facts.join(" · ")}
          {atRisk && (
            /* Says its own name rather than taking a tint, exactly as a stale
              * open item does. Nothing here is wrong — the account reconciles
              * fine and will keep reconciling fine — it is going to run out of
              * month, which is an operations problem and not an error. An
              * amber row would say the arithmetic was in doubt. */
            <span
              style={{
                color: "var(--ink-secondary)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              {facts.length > 0 && " · "}on course to miss the lock
            </span>
          )}
          {illustrative &&
            (facts.length > 0 || atRisk ? " · illustrative" : "illustrative")}
        </span>
      </div>

      {/* The money, right-aligned so a column of these sorts visibly. Absent
        * rather than zero where the account has not been read: 0.00 is a
        * measurement, and a draft account has not been measured. */}
      {showsMoney && (
        <Money
          amount={unexplained}
          form="plain"
          emphasis="medium"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}
