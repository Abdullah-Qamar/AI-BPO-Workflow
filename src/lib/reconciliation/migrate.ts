/* Migration: `RecordItem` -> `Match`.
 *
 * The playbook's prompt 1 is explicit that the existing seed must keep working
 * — migrated, not deleted — and that a seeded record which was ambiguous with
 * two candidates must come through with both candidates properly represented.
 * This is that migration. It is a pure function, so the old seed stays the
 * single source of that data and the two cannot drift.
 *
 * Record ids are PRESERVED. `SessionState.recordStatusOverrides` and
 * `recordComments` are keyed by record id, so changing them would silently
 * discard every reviewer decision already in a running session.
 *
 * ---------------------------------------------------------------------------
 * Classification is a table, not a parser
 *
 * The eight flagged records are hand-authored, each a distinct kind of
 * exception, and their kind is recorded in prose in `reason`. It would be
 * possible to regex that prose into an outcome. It would also be a trap: the
 * classification would then depend on copy that exists to be read by humans
 * and gets rewritten for tone, and a change to a `reason` string would silently
 * reclassify a record and move the balance proof.
 *
 * So the mapping is an explicit table below, keyed by record id, with the
 * reasoning written next to each entry. It is longer than a parser and it is
 * reviewable, which is the trade worth making for something the proof depends
 * on.
 *
 * ---------------------------------------------------------------------------
 * What the migration reveals: there are no `timing` records
 *
 * Classifying all eight exceptions produces bank-only and needs-adjustment, and
 * NOT ONE `timing` item. That is not an oversight in this file — it is gap 2
 * showing up as an absence. The seed was built on two buckets, so it contains
 * only things that are wrong; a routine outstanding cheque had no bucket that
 * wasn't labelled a problem, and so none was ever written.
 *
 * The full five-outcome spread lives in the fixture-backed data for Westlake's
 * operating account (`lib/fixtures/westlakeOperating.ts`), where three
 * uncleared cheques and a deposit in transit are real lines in a real file.
 * That is the division: the seed carries the synthetic portfolio, the fixture
 * carries the one account that has to be exactly right.
 *
 * Do not "fix" this by inventing timing records here. An invented outstanding
 * cheque would adjust the proof by a number nobody can trace to a document. */

import type { RecordItem } from "@/lib/seed";
import type {
  Candidate,
  Match,
  MatchLine,
  MatchOutcome,
  PatternRef,
  RuleRef,
} from "./match";

/* The rule ladder, from playbook Part 4. Matching is deterministic, so these
 * are the only things that can produce a match, and every migrated record
 * names the one that applied to it. Versioned because a run must record which
 * rule version it used. */
const RULES = {
  exact: {
    id: "rule-exact",
    label: "same amount, same day",
    version: "1.0.0",
  },
  window: {
    id: "rule-window",
    label: "same amount within 3 days",
    version: "1.0.0",
  },
  reference: {
    id: "rule-reference",
    label: "amount and reference",
    version: "1.0.0",
  },
  aggregate: {
    id: "rule-aggregate",
    label: "one deposit against several ledger rows",
    version: "1.0.0",
  },
} as const satisfies Record<string, RuleRef>;

/* How each hand-authored exception classifies, and why.
 *
 * `candidateLedgerRows` carries the ledger rows named in the record's own
 * `evidence` array. Where there are two, the record was genuinely ambiguous and
 * the reviewer has to choose — which is the action the old contract could not
 * express at all. */
interface ExceptionSpec {
  outcome: MatchOutcome;
  /* Why this outcome, for a reader of this file. Not user-facing. */
  note: string;
  /* Ledger rows the matcher considered, from the record's `evidence`. */
  candidateLedgerRows: string[];
  rule: RuleRef | null;
  pattern?: PatternRef;
}

const EXCEPTIONS: Record<string, ExceptionSpec> = {
  /* On the statement, nothing within the matching window. The books are
   * missing an entry, which makes this a BOOK reconciling item in Yardi's
   * vocabulary and a book-side adjustment in the proof. */
  "rec-f-1": {
    outcome: "bank-only",
    note: "Statement line with no ledger counterpart in range.",
    candidateLedgerRows: [],
    rule: null,
  },

  /* THE AMBIGUOUS REFUND. Two candidate ledger rows, identical amounts, and
   * the matcher correctly refused to choose. This is the record the whole
   * match-object change exists for: under the old contract the candidates
   * were prose in a `reason` string and the reviewer had nowhere to pick.
   *
   * Note what makes it sharp — both candidates are the same amount, so the
   * balance proof ties to zero whichever one is picked. Picking wrong closes
   * the month correctly balanced and duns the wrong tenant. */
  "rec-f-2": {
    outcome: "needs-adjustment",
    note: "Two equal candidates; the reviewer must choose. Proof ties either way.",
    candidateLedgerRows: ["ledger-row-142", "ledger-row-154"],
    rule: RULES.reference,
  },

  /* THE RETURNED PAYMENT. Reported by the old seed as "amounts don't match,
   * $1,200 vs $1,275" — an anomaly. It is not an anomaly, it is one of the
   * most routine events in property management: the payment bounced, the bank
   * took a $75 fee, and 1,200.00 + 75.00 = 1,275.00 exactly.
   *
   * The pattern is marked CONFIRMED because that arithmetic is a deterministic
   * check, not a model's opinion. Had the fee been any other amount it would
   * not confirm, and the product would correctly stop claiming to know what
   * happened rather than asserting a pattern that does not hold. */
  "rec-f-3": {
    outcome: "needs-adjustment",
    note: "Returned payment plus fee. Confirmable by arithmetic, not a mismatch.",
    candidateLedgerRows: ["ledger-row-78"],
    rule: null,
    pattern: {
      id: "pattern-returned-payment",
      label: "Returned payment",
      confirmed: true,
      confirmedBy: "Return of 1,200.00 plus fee of 75.00 equals the original 1,275.00",
      note: "The tenant's rent is unpaid. The books must reverse the receipt.",
    },
  },

  /* Flagged for novelty, not for a match failure — the counterparty had never
   * been seen. A person has to confirm it, so it needs a decision; but there
   * is no arithmetic difference to correct, which is why it resolves by
   * setting aside with a reason or by accepting it, not by a correcting entry. */
  "rec-f-4": {
    outcome: "needs-adjustment",
    note: "First occurrence of this counterparty. Needs a person, not an entry.",
    candidateLedgerRows: [],
    rule: null,
  },

  /* A bank fee with no GL mapping. On the statement, absent from the books,
   * and additionally missing a chart-of-accounts code — so it is bank-only
   * AND it points at a configuration gap. The per-bank code dictionary is the
   * real fix and it is out of scope here. */
  "rec-f-5": {
    outcome: "bank-only",
    note: "Fee on the statement, no ledger entry and no GL code mapped.",
    candidateLedgerRows: [],
    rule: null,
  },

  /* Reverses rec-f-1 exactly: +4,318.42 then -4,318.42. Together they net to
   * zero and neither belongs in the books.
   *
   * Left as its own match rather than merged with rec-f-1 into one two-line
   * event. Merging is arguably truer, but `PropertySession.records` and the
   * `matched + exceptions = records` invariant in seed.ts are derived from the
   * record COUNT, so collapsing two records into one silently changes totals on
   * four other surfaces. The link is carried by an UNCONFIRMED pattern instead:
   * the pairing is proposed, and nothing asserts it until a check runs. */
  "rec-f-6": {
    outcome: "bank-only",
    note: "Reversal of rec-f-1. Linked by an unconfirmed pattern, not merged.",
    candidateLedgerRows: [],
    rule: null,
    pattern: {
      id: "pattern-payout-reversal",
      label: "Payout and reversal",
      confirmed: false,
      confirmedBy: null,
      note: "Same amount as an earlier unmatched payout, opposite sign.",
    },
  },

  /* A ledger row exists and the amounts agree, but the dates are four days
   * apart and the window rule allows three. So the matcher found a candidate
   * and could not commit to it. One candidate, needing a decision — which is
   * different from no candidate at all, and the old two-bucket model could not
   * tell those apart. */
  "rec-f-7": {
    outcome: "needs-adjustment",
    note: "One candidate, 4 days apart against a 3-day window.",
    candidateLedgerRows: ["ledger-row-64"],
    rule: RULES.window,
  },

  /* Same shape as rec-f-5. */
  "rec-f-8": {
    outcome: "bank-only",
    note: "Fee on the statement, no ledger entry and no GL code mapped.",
    candidateLedgerRows: [],
    rule: null,
  },
};

/* A migrated record yields one bank line. The old contract had a single
 * `amount` and a single `title`, so that is all there is to work with — the
 * ledger side is reconstructed from `evidence` only as far as candidate IDS,
 * because the seed never held ledger amounts or dates.
 *
 * This is the honest limit of the migration and worth stating: a migrated
 * match knows WHICH ledger rows were considered but not what they said. Only
 * the fixture-backed account has both sides in full. Surfaces that render a
 * two-sided row must therefore handle a match whose `ledgerRows` is empty
 * while `candidates` is not. */
function bankLineFrom(r: RecordItem): MatchLine {
  return {
    id: `${r.id}-bank`,
    date: r.date,
    amount: r.amount,
    description: r.title,
    reference: r.evidence[0],
  };
}

function candidatesFrom(spec: ExceptionSpec): Candidate[] {
  if (spec.candidateLedgerRows.length === 0) return [];
  const rule = spec.rule ?? RULES.exact;
  return spec.candidateLedgerRows.map((rowId, i) => ({
    id: `cand-${rowId}`,
    ledgerRowIds: [rowId],
    rule,
    /* Nothing in the seed records WHY one candidate lost — with two equal
     * refunds there is no reason, which is the entire problem. So a lone
     * candidate is un-rejected and a tie leaves both un-rejected, and the
     * reviewer resolves it. Fabricating a rejection reason here would invent
     * a judgement the matcher never made. */
    rejectedBecause:
      spec.candidateLedgerRows.length > 1 && i > 0 ? null : null,
  }));
}

export function migrateRecord(r: RecordItem, cycle: string): Match {
  const spec = EXCEPTIONS[r.id];

  /* Everything not in the exception table is an approved record — the five
   * hand-authored ones with story value plus the generated tail. They matched,
   * on the exact rule unless their own reason says otherwise. */
  if (!spec) {
    return {
      id: r.id,
      accountId: r.bankId,
      cycle,
      outcome: "matched",
      bankLines: [bankLineFrom(r)],
      /* The seed names a ledger row in `evidence` but carries no figures for
       * it. A matched record's ledger side is known to balance — that is what
       * matched means — so it is reconstructed as the mirror of the bank line.
       * This is a migration artefact, not a document: the fixture-backed
       * account is where a real ledger row comes from. */
      ledgerRows: r.evidence[1]
        ? [
            {
              id: `${r.id}-ledger`,
              date: r.date,
              amount: r.amount,
              description: r.title,
              reference: r.evidence[1],
            },
          ]
        : [],
      rule: RULES.exact,
      candidates: [],
      pattern: null,
      resolution: null,
      reason: r.reason,
    };
  }

  return {
    id: r.id,
    accountId: r.bankId,
    cycle,
    outcome: spec.outcome,
    bankLines: [bankLineFrom(r)],
    /* Deliberately empty. The candidates are known, their contents are not. */
    ledgerRows: [],
    rule: spec.rule,
    candidates: candidatesFrom(spec),
    pattern: spec.pattern ?? null,
    resolution: null,
    reason: r.reason,
  };
}

export function migrateRecords(records: RecordItem[], cycle: string): Match[] {
  return records.map((r) => migrateRecord(r, cycle));
}

/* The old two-value status, for surfaces that have not moved over yet.
 *
 * Kept so the migration can land without touching a single component, which is
 * what prompt 1 asks for ("show me the new types and the migration before
 * touching any component"). Every call site of this function is a surface still
 * on the old contract, so it doubles as the migration checklist: when this has
 * no callers, the move is complete.
 *
 * Note the asymmetry it exposes. Four of the five outcomes collapse to
 * "flagged" and only `matched` survives intact, which is a compact statement of
 * what the old contract was throwing away. */
export function outcomeToLegacyStatus(
  outcome: MatchOutcome
): "approved" | "flagged" {
  return outcome === "matched" ? "approved" : "flagged";
}
