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
import type { StuckReason } from "@/components/entities/StuckRow";
import { illustrativeOldestDays } from "@/lib/accounts";
import { toCents, toDollars } from "@/lib/money";
import { daysUntilClose as untilClose, NOW } from "@/lib/period";

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

/* Deferred to lib/period.ts, which owns the one clock. */
export function daysUntilClose(): number {
  return untilClose(PERIOD_CLOSES_ON);
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

/* ---------- Blocks a person has cleared ----------
 *
 * The Stuck section announced five failure kinds, each with the right way out
 * beside it, and every one of those buttons was wired to an empty function.
 * `StuckRow` guarantees by construction that a row always OFFERS an action —
 * there is no prop through which to leave one off — and the call site quietly
 * made that guarantee cosmetic. That is this product's characteristic defect,
 * the one its own component header names: a surface that says something is
 * wrong and gives the person nowhere to go.
 *
 * Module-level and observable, the same shape as `sampling.ts`'s findings
 * store, because clearing a block has to REACH somewhere. A screen that
 * announced what it WOULD have done would be a picture of the flow rather than
 * the flow.
 *
 * Deliberately not persisted, for the same reason findings are not: a reload
 * starting clean is honest, and a prototype pretending to a history it does not
 * have is the failure this product spends most of its design avoiding.
 */

/* Reconciliation id -> the label of the action the person took. The label is
 * kept rather than a bare flag because "Discard" and "Replace the earlier one"
 * are different decisions about the same duplicate, and a store that remembers
 * only THAT somebody acted cannot say which. Nothing reads it yet; an activity
 * log is the obvious consumer. */
/* What clearing a block DID, not just that it happened.
 *
 * `handed-back` — the document is usable now and the machine carries on. A
 *                 supplied control number, a re-upload, a duplicate confirmed
 *                 as superseding the earlier file.
 * `moved-away`  — the document left this account. It belonged somewhere else,
 *                 or it was discarded.
 *
 * The distinction is the whole reason this is not a boolean. A misrouted
 * statement that goes to its real account leaves THIS account with nothing,
 * so the account goes back to waiting for a file. Sending it to `matching`
 * would have it claim the machine is pairing, using a statement that is no
 * longer there — which is what the first version of this did. */
export type ClearedOutcome = "handed-back" | "moved-away";

let clearedBlocks = new Map<string, { action: string; outcome: ClearedOutcome }>();
const blockListeners = new Set<() => void>();

export function subscribeBlocks(cb: () => void): () => void {
  blockListeners.add(cb);
  return () => blockListeners.delete(cb);
}

export function getClearedBlocks(): ReadonlyMap<
  string,
  { action: string; outcome: ClearedOutcome }
> {
  return clearedBlocks;
}

/* A person resolved a blocked read. There is no timeout and no machine path
 * into this function: `blocked` only ever leaves by a person or a new document,
 * which is the guard in docs/FLOWS.md Part 2 and the reason this takes an
 * explicit action label rather than inferring one. */
export function clearBlock(
  reconciliationId: string,
  action: string,
  outcome: ClearedOutcome
): void {
  if (clearedBlocks.has(reconciliationId)) return;
  clearedBlocks = new Map(clearedBlocks).set(reconciliationId, {
    action,
    outcome,
  });
  /* The board is derived from this now, so the memo has to go. Every consumer
   * — the rail's count, the proven tally, the Stuck list — reads `accountRows`,
   * and dropping the cache is what keeps them one number instead of three. */
  cached = null;
  blockListeners.forEach((cb) => cb());
}

export function resetClearedBlocks(): void {
  clearedBlocks = new Map();
  cached = null;
  blockListeners.forEach((cb) => cb());
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

      const id = `recon-${property.code}-${account.id}-2026-05`;
      const seeded = stateFor(property, account, index);

      /* A cleared block hands the work back to the machine.
       *
       * `matching` rather than `reading`: docs/FLOWS.md F1 terminates every
       * resolved branch at the reconciliation going to `matching`, and states
       * its exit as "every reconciliation is `matching`, or `blocked` with a
       * named reason". The `blocked -> reading` line in Part 2's guard table
       * describes what may open the gate — only a person or a new document —
       * not a resting place, and parking rows permanently in `reading` would
       * claim a read is under way that nothing in this prototype performs.
       *
       * Guarded on `seeded === "blocked"` so an id in the store can never
       * rewrite a state that was not blocked to begin with. */
      const cleared = seeded === "blocked" ? clearedBlocks.get(id) : undefined;
      const state = cleared
        ? cleared.outcome === "moved-away"
          ? /* The file went to the account it belonged to, so this one has no
             * statement and is waiting for one again. On Close it moves out of
             * Stuck and into "Waiting for files", which is the truthful place
             * for an account with nothing to read. */
            "draft"
          : "matching"
        : seeded;

      const openItems = session?.openItems ?? 0;
      const unexplained = unexplainedFor(account, state, openItems);
      const h = hash(account.id);

      rows.push({
        reconciliation: {
          id,
          accountId: account.id,
          periodId: OPEN_PERIOD.id,
          state,
          unexplained,
          itemsWaiting: state === "review" ? 1 + (h % 6) : 0,
          /* One derivation, shared with the Accounts list, so the same account
           * does not report two different ages on two screens. */
          oldestOpenItemDays:
            state === "draft" ? null : illustrativeOldestDays(account.id),
          /* NOT `session.finishedOn`, which is a display string like "Apr 1"
           * with no year in it. Date.parse reads that as the year 2001 and the
           * row rendered "waiting 9135 days", which is the kind of number a
           * screen prints with a straight face right up until somebody reads
           * it. Derived instead, within the last nine days, which is what a
           * queue in an open period actually looks like. */
          waitingSince: new Date(
            Date.parse("2026-06-06T00:00:00Z") -
              (1 + (h % 9)) * 86_400_000
          ).toISOString(),
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
/* ---------- What happens when nobody acts ----------
 *
 * A reconciliation sitting in review for five days while the period is about to
 * close is a real operational state, and the product had nothing to say about
 * it.
 *
 * What it says now is arithmetic rather than a nudge. This build has no
 * messaging layer, and inventing notifications for a design prototype would be
 * a feature nobody can see working. What IS computable and useful: an account
 * that has been waiting longer than the days left before the lock is an account
 * that is on course to miss the close, and that is a sentence a person acts on.
 *
 * Ageing, not escalating. Escalation needs somebody to escalate TO, and this
 * product has one person in it. */
export function atRiskOfMissingClose(daysLeft: number): AccountRow[] {
  const now = Date.parse(`${NOW}T00:00:00Z`);
  return accountRows().filter((r) => {
    if (!STATES_AWAITING_A_PERSON.includes(r.reconciliation.state)) return false;
    if (!r.reconciliation.waitingSince) return false;
    const waited = Math.round(
      (now - Date.parse(r.reconciliation.waitingSince)) / 86_400_000
    );
    return waited > daysLeft;
  });
}

export function totalUnexplained(): number {
  return toDollars(
    accountRows().reduce((t, r) => t + toCents(r.reconciliation.unexplained), 0)
  );
}

/* ---------- Stuck documents ----------
 *
 * A blocked reconciliation is a read that failed, and the Reader's five failure
 * kinds each need a different route out. Which kind a given account hit is
 * derived from its id rather than written per account, for the same reason the
 * states are: a hand-written list drifts from the seed it describes and nothing
 * notices.
 *
 * The explanations name real figures where the failure has one, because "the
 * closing balance in the file is 148,220.40 and the lines add up to 144,880.15"
 * is something a person can act on and "checksum mismatch" is not.
 */


export interface StuckDocument {
  id: string;
  accountLabel: string;
  documentName: string;
  reason: StuckReason;
  explanation: string;
  subject?: string;
  /* Where a misrouted statement actually belongs.
   *
   * This was the bug. `subject` was built from the account the file was
   * dropped ON, so the explanation read "the account number is not ••••1145"
   * and the button beside it offered to move the file TO ••••1145 — the one
   * account the sentence had just ruled out. A recovery action has to name a
   * destination, and the destination is the account whose number the statement
   * actually carries.
   *
   * A sibling on the same property, which is the realistic mistake: somebody
   * drops the Reserve statement on the Operating account. */
  movesTo?: {
    label: string;
    account: string;
    /* Whether that account already holds a statement.
     *
     * It changes what the move IS. To an account waiting for files this is a
     * delivery and the month can run there. To one that already has a
     * statement it is a second document on the same account and period, which
     * is the `duplicate` case wearing a different hat — so the confirm says so
     * rather than presenting both as the same tidy action. */
    hasDocument: boolean;
  };
  /* The row the Reader could not finish, for `unreadable-line`. A person
   * supplies the missing control number, and they cannot do that without
   * seeing which row is short of one. */
  missingField?: { date: string; amount: number; description: string };
}

const STUCK_KINDS: StuckReason[] = [
  "incomplete-read",
  "wrong-period",
  "wrong-account",
  "duplicate",
  "unreadable-line",
];

function explain(
  reason: StuckReason,
  account: PropertyBankMapping,
  sibling: PropertyBankMapping | undefined,
  siblingHasDocument: boolean
): {
  explanation: string;
  subject?: string;
  movesTo?: { label: string; account: string; hasDocument: boolean };
} {
  switch (reason) {
    case "incomplete-read":
      return {
        explanation:
          "The file declares a closing balance the extracted lines do not reproduce. The run stopped rather than reconcile against half a statement.",
      };
    case "wrong-period":
      return {
        explanation:
          "The statement covers April. This reconciliation is May, so one of the two is wrong.",
        subject: "April 2026",
      };
    case "wrong-account": {
      /* Without a sibling there is nowhere to route it, and an action with no
       * destination is the dead end this whole surface exists to remove. The
       * file goes back for somebody to place by hand. */
      if (!sibling) {
        return {
          explanation: `The account number on the statement is not ${account.account}, which is the account this file was dropped on. No other account on this property matches it either.`,
        };
      }
      return {
        explanation: `The statement is for ${sibling.account}, not ${account.account}, which is the account this file was dropped on.`,
        subject: `${sibling.type} ${sibling.account}`,
        movesTo: {
          label: sibling.type,
          account: sibling.account,
          hasDocument: siblingHasDocument,
        },
      };
    }
    case "duplicate":
      return {
        explanation:
          "Byte for byte the same file as one already taken in. Taking it twice would double every line in it.",
      };
    case "unreadable-line":
      return {
        explanation:
          "One row has an amount and a date but no control number. Nothing has been guessed; the run carries on once somebody supplies it.",
      };
  }
}

export function stuckDocuments(): StuckDocument[] {
  const rows = accountRows();
  return rows
    .filter((r) => r.reconciliation.state === "blocked")
    .map((r) => {
      const reason = STUCK_KINDS[hash(r.account.id) % STUCK_KINDS.length];
      /* The account the statement really belongs to: another account on the
       * same property. Deterministic, so the destination named on the button
       * does not change between renders. */
      const sibling = r.property.banks.find((b) => b.id !== r.account.id);
      /* `draft` is the only state that means "no document here yet". Anything
       * further along has already read one. */
      const siblingRow = sibling
        ? rows.find((x) => x.account.id === sibling.id)
        : undefined;
      const siblingHasDocument =
        siblingRow !== undefined && siblingRow.reconciliation.state !== "draft";

      const { explanation, subject, movesTo } = explain(
        reason,
        r.account,
        sibling,
        siblingHasDocument
      );

      /* The row the Reader stopped on. Derived from the account id so it is
       * stable, and deliberately unremarkable — a mid-month vendor payment is
       * what a missing control number actually looks like. */
      const h2 = hash(`${r.account.id}:row`);
      const missingField =
        reason === "unreadable-line"
          ? {
              date: `2026-05-${String(9 + (h2 % 18)).padStart(2, "0")}`,
              amount: -toDollars(45_000 + (h2 % 380_000)),
              description: "Vendor payment",
            }
          : undefined;

      return {
        id: r.reconciliation.id,
        accountLabel: `${r.property.shortAddress} · ${r.account.type}`,
        documentName: `bai2-${r.property.code.toLowerCase()}-${r.account.type
          .toLowerCase()
          .replace(/\s+/g, "-")}-2026-05.bai`,
        reason,
        explanation,
        subject,
        movesTo,
        missingField,
      };
    });
}

/* The sample queue itself lives in `lib/sampling.ts`.
 *
 * A `spotCheckCount()` used to sit here, deriving a number from how many
 * accounts went through without a person. It was a reasonable guess and it was
 * a SECOND source of truth for a figure the queue itself can answer exactly, so
 * it went the moment the queue became real. Two places that compute the same
 * number is how a badge and the rows under it come to disagree. */
