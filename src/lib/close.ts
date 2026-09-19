/* The open period, as reconciliations.
 *
 * One place that answers "what is outstanding across the portfolio right now",
 * so the rail's count and the Close screen cannot disagree about it. Both read
 * this; neither computes its own.
 *
 * ---------------------------------------------------------------------------
 * One account here is real and the rest are illustrative, and that is stated
 *
 * The Westlake Chase operating account is computed from `fixtures/` through the
 * match contract and the balance proof: 14 bank lines, 16 ledger rows, an
 * unexplained figure of 2,900.60 that was arrived at rather than chosen.
 *
 * Every other account in the portfolio is seed data. Its state and its figure
 * are DERIVED — deterministically, from the seed's own counts and a hash of the
 * account id — rather than typed in one at a time. That distinction matters
 * less than the next one, which is that they are carried with a flag saying
 * they are illustrative, and the screens show it. TAXONOMY_AND_IA is explicit
 * that the fixture has one account and that its siblings must be labelled as
 * such wherever they appear.
 *
 * The alternative was a Close screen with one row on it, which would not be
 * honest either — it would hide that this product is about twelve properties a
 * month, and the whole argument for the Close screen is that the single-run
 * theatre cannot be the home screen.
 */

import {
  CURRENT_CYCLE,
  properties,
  type PropertyBankMapping,
  type PropertyRecord,
} from "@/lib/seed";
import {
  STATES_AWAITING_A_PERSON,
  type Period,
  type Reconciliation,
  type ReconciliationState,
} from "@/lib/session/types";
import { buildProof } from "@/lib/reconciliation/proof";
import { westlakeMatches, ACCOUNT_ID } from "@/lib/reconciliation/westlakeMatches";
import { controlTotals, ledgerTotals } from "@/lib/fixtures/westlakeOperating";
import { toCents, toDollars } from "@/lib/money";

/* ---------- The period ---------- */

export const OPEN_PERIOD: Period = {
  id: "period-2026-05",
  label: CURRENT_CYCLE,
  entityId: "entity-tahoe-holdings",
  /* Open, which is what makes posting legal. The guards in types.ts read this
   * rather than assuming it. */
  closed: false,
};

/* Days until the period has to be closed. A date, not a countdown stored
 * anywhere: the Close screen states it beside the count and it has to move on
 * its own. Measured from the fixture's own close date so the demo is stable. */
export const PERIOD_CLOSES_ON = "2026-06-10";

export function daysUntilClose(today = new Date("2026-06-06T00:00:00Z")): number {
  const end = Date.parse(`${PERIOD_CLOSES_ON}T00:00:00Z`);
  return Math.max(0, Math.round((end - today.getTime()) / 86_400_000));
}

/* ---------- The row a screen renders ---------- */

/* A reconciliation with the standing-world objects it belongs to, and one fact
 * about the prototype itself.
 *
 * `illustrative` is not decoration. A screen that prints 22 unexplained figures
 * while exactly one of them was computed from a real statement is making a
 * claim about 21 of them that it cannot support, and the panel three clicks
 * away says "worked out, not estimated". Carrying the flag is what lets the
 * screen tell the truth in the one place a reader would check. */
export interface AccountRow {
  reconciliation: Reconciliation;
  property: PropertyRecord;
  account: PropertyBankMapping;
  illustrative: boolean;
}

/* ---------- Deriving the illustrative accounts ---------- */

/* A small stable hash, so the same account gets the same state and figure on
 * every render and across reloads. Deriving them beats writing 21 rows by hand:
 * hand-written rows drift from the seed they are supposed to describe, and
 * nobody notices because nothing checks them. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/* How a property's seeded session status spreads across its accounts.
 *
 * A property's session is one status over all of its banks, which is precisely
 * the hierarchy bug this rebuild exists to correct, so it cannot be copied onto
 * each account unchanged — that would make "3 of 4 proven" impossible to
 * render, because all four would always agree. The spread is deterministic and
 * weighted by the seed's own status: a property the seed calls failed has one
 * blocked account rather than four, because one bad statement is what blocks a
 * close in practice. */
function stateFor(
  property: PropertyRecord,
  account: PropertyBankMapping,
  index: number
): ReconciliationState {
  const seeded = property.currentSession?.statusKey ?? property.state;
  const h = hash(account.id);

  if (seeded === "failed") {
    /* The first account carries the blockage; its siblings are further along.
     * A property does not usually fail four ways at once. */
    return index === 0 ? "blocked" : h % 3 === 0 ? "review" : "proven";
  }
  if (seeded === "completed") return "posted";
  if (seeded === "not-started") return "draft";

  /* Under review: some accounts are done, some want a decision, and some are
   * proven and waiting only for a signature. */
  const bucket = h % 5;
  if (bucket === 0) return "posted";
  if (bucket === 1) return "proven";
  return "review";
}

/* An illustrative unexplained figure, in whole cents.
 *
 * Only ever non-zero for an account in `review`, because every other state
 * either has not got there yet or has already reached zero — a proven account
 * with money unexplained is a contradiction the guards would refuse anyway. */
function unexplainedFor(
  account: PropertyBankMapping,
  state: ReconciliationState,
  openItems: number
): number {
  if (state !== "review") return 0;
  const h = hash(`${account.id}:unexplained`);

  /* Roughly 150 to 9,000, with cents.
   *
   * The range is the point. An earlier version scaled by the seed's open-item
   * count and produced a reserve account 116,763.50 out, which is not a
   * reconciliation difference — it is a missing wire, and an accountant reading
   * the screen would stop to ask about it rather than believe the screen. It
   * also buried the one real figure on the board: the Close screen sorts by
   * money, so a single invented six-figure row would have pushed Westlake's
   * genuine 2,900.60 far enough down to be invisible.
   *
   * A few hundred to a few thousand is what a month's unexplained difference
   * actually looks like on an account this size, which puts the real figure in
   * the middle of the pack where it belongs rather than at either end. */
  const dollars = 150 + (h % 8_850);
  /* A small nudge from the seed's own open-item count, so a row claiming six
   * open items does not sit below one claiming one. */
  const bump = Math.min(openItems, 8) * 120;
  return toDollars((dollars + bump) * 100 + (h % 100));
}

/* ---------- The real one ---------- */

function westlakeOperating(): Reconciliation {
  const proof = buildProof({
    matches: westlakeMatches,
    statementClosing: controlTotals.closingBalance,
    ledgerClosing: ledgerTotals().bookBalance,
    periodEndLabel: "May 31",
  });

  return {
    id: "recon-westlake-operating-2026-05",
    accountId: ACCOUNT_ID,
    periodId: OPEN_PERIOD.id,
    state: "review",
    unexplained: proof.unexplained,
    itemsWaiting: proof.openItems.length,
    /* The oldest open item at this period's end: the 14 May refund, which is
     * one of the two the reviewer has to choose between. */
    oldestOpenItemDays: Math.max(
      0,
      ...westlakeMatches.map((m) => m.ageDays ?? 0)
    ),
    waitingSince: "2026-06-02T09:14:00Z",
    runs: [
      {
        id: "run-westlake-operating-1",
        reconciliationId: "recon-westlake-operating-2026-05",
        attempt: 1,
        startedAt: "2026-06-02T09:11:00Z",
        finishedAt: "2026-06-02T09:14:00Z",
        /* Frozen at the machine's verdict. It is the same figure as the live
         * one right now because nobody has acted yet, and it will STAY this
         * figure after they do. */
        firstPassUnexplained: proof.unexplained,
        firstPassItemsWaiting: proof.openItems.length,
        ruleVersions: {
          "rule-exact-day": "1.4",
          "rule-check-number": "1.2",
          "rule-sum-to-deposit": "1.1",
          "rule-near-day": "1.4",
        },
        modelVersion: "reader-2026-04",
      },
    ],
    signedBy: null,
    signedAt: null,
  };
}

/* ---------- The board ---------- */

let cached: AccountRow[] | null = null;

/* Every account due in the open period. Computed once: the derivation is pure
 * and the seed does not change at runtime, and recomputing 22 proofs on every
 * keystroke in a filter box is waste nobody asked for. */
export function accountRows(): AccountRow[] {
  if (cached) return cached;

  const rows: AccountRow[] = [];

  for (const property of properties) {
    const session =
      property.sessions.find((s) => s.cycle === CURRENT_CYCLE) ??
      property.currentSession;

    property.banks.forEach((account, index) => {
      if (
        account.id === "bm-chase-operating-3421" &&
        property.code === "TH-1247"
      ) {
        rows.push({
          reconciliation: westlakeOperating(),
          property,
          account,
          illustrative: false,
        });
        return;
      }

      const state = stateFor(property, account, index);
      const openItems = session?.openItems ?? 0;
      const unexplained = unexplainedFor(account, state, openItems);
      const h = hash(account.id);

      rows.push({
        reconciliation: {
          id: `recon-${property.code}-${account.id}-2026-05`,
          accountId: account.id,
          periodId: OPEN_PERIOD.id,
          state,
          unexplained,
          itemsWaiting: state === "review" ? 1 + (h % 6) : 0,
          oldestOpenItemDays:
            state === "draft" ? null : 3 + (h % 120),
          waitingSince: session?.finishedOn ?? null,
          runs: [],
          signedBy: null,
          signedAt: null,
        },
        property,
        account,
        illustrative: true,
      });
    });
  }

  cached = rows;
  return rows;
}

/* ---------- What the rail counts ---------- */

/* Accounts where a person is the only thing that can move the work on.
 *
 * ONLY Close carries a count in the rail, because a badge that counts
 * everything is noise. This is what it counts, and it is computed here rather
 * than at the call site so the number on the rail and the rows on the screen
 * are the same number. */
export function awaitingAPerson(): AccountRow[] {
  return accountRows().filter((r) =>
    STATES_AWAITING_A_PERSON.includes(r.reconciliation.state)
  );
}

export function provenCount(): { proven: number; due: number } {
  const rows = accountRows();
  const proven = rows.filter((r) =>
    ["proven", "signed", "posting", "posted", "closed"].includes(
      r.reconciliation.state
    )
  ).length;
  return { proven, due: rows.length };
}

/* Total money unexplained across the open period, in dollars. Summed in cents,
 * because twenty-two floats added in a row do not land where they should. */
export function totalUnexplained(): number {
  return toDollars(
    accountRows().reduce((t, r) => t + toCents(r.reconciliation.unexplained), 0)
  );
}
