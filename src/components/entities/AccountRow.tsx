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

/* Whole days between an ISO timestamp and now. Used for "how long has this been
 * sitting", which is the question the old "Updated 4h ago" column was failing to
 * answer: what matters is how long something has been WAITING, not when it last
 * moved. */
function daysWaiting(since: string | null, now: Date): number | null {
  if (!since) return null;
  const ms = now.getTime() - Date.parse(since);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round(ms / 86_400_000));
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
  waitingSince: string | null;
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
  waitingSince,
  illustrative = false,
  onOpen,
  now = new Date("2026-06-06T00:00:00Z"),
}: AccountRowProps) {
  const waited = daysWaiting(waitingSince, now);

  /* The meta line: the state first, because it says what kind of row this is,
   * then only the facts that exist. An account waiting for files has no items
   * and no ages, and printing "0 items · oldest 0 days" against it would be
   * inventing measurements of a thing nobody has looked at. */
  const facts: string[] = [stateWords(state)];
  if (itemsWaiting > 0) facts.push(plural(itemsWaiting, "item", "items"));
  if (oldestOpenItemDays !== null && oldestOpenItemDays > 0) {
    facts.push(`oldest ${plural(oldestOpenItemDays, "day", "days")}`);
  }
  if (waited !== null && waited > 0) {
    facts.push(`waiting ${plural(waited, "day", "days")}`);
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
          {facts.join(" · ")}
          {illustrative && " · illustrative"}
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
