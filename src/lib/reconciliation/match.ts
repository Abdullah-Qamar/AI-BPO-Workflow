/* The reconciliation contract.
 *
 * Replaces `RecordItem` (lib/seed.ts), which modelled a reconciled line as a
 * single row with one amount, one `status` from a two-value set, and a bare
 * confidence percentage. Four things were structurally inexpressible in it:
 *
 *   1. A match with two sides. The fixture's rent deposit is one bank line of
 *      $12,450.00 against THREE ledger rows of $4,200 / $4,150 / $4,100. There
 *      was nowhere to put the other side, let alone three of it.
 *   2. Candidates. When the matcher cannot choose between two equal refunds,
 *      the reviewer picking one is the most common action in the job, and the
 *      candidates existed only as prose in a `reason` string.
 *   3. A normal month. An uncleared cheque matches nothing and is completely
 *      routine, but with two buckets it had to be filed as a problem. Once half
 *      the flags are nothing, nobody trusts the flag.
 *   4. A real difference. Moving a $75 shortfall to "approved" did not make the
 *      $75 go away; it just sent it onward labelled as fine.
 *
 * See docs/RECONCILER_PLAYBOOK.md Part 3 (gaps 1, 2, 3, 8) and Part 8 prompt 1,
 * and docs/REBUILD_PLAN.md Part 2 for the audit this answers.
 *
 * ---------------------------------------------------------------------------
 * Why five outcomes, and why THESE five
 *
 * The taxonomy is not a matter of taste. It is the set of categories the
 * balance proof's arithmetic consumes, which is the reason a two-bucket model
 * could not produce a proof at all:
 *
 *   matched            nets out; contributes nothing to either adjustment
 *   timing             feeds the BANK side — outstanding and in-transit
 *   bank-only          feeds the BOOK side — the books are missing an entry
 *   needs-adjustment   feeds the BOOK side once resolved
 *   ledger-only        feeds NOTHING. It is the residue, and it is why the
 *                      proof can fail to reach zero.
 *
 * Verified against fixtures/: classifying the 14 bank lines and 16 ledger rows
 * by these five outcomes and applying only the rules above reproduces adjusted
 * bank = adjusted book = 292,844.60, unexplained 0.00. `proof.ts` performs that
 * computation; it is not restated here.
 *
 * `ledger-only` and `timing` are BOTH one-sided in the books, and keeping them
 * apart is the whole point. An outstanding cheque and a double-entered cheque
 * look identical in the data — one side, no counterpart — and differ only in
 * whether there is a reason to expect it to clear. Collapsing them is gap 2. */

/* ---------- Outcomes ---------- */

/* Deliberately NOT mapped onto --status-ok/warn/danger/info/neutral. Status
 * answers "how is this going"; an outcome answers "what kind of thing is this".
 * Map them one-to-one and a routine uncleared cheque gets tinted as a warning,
 * which is gap 2 reappearing as colour after the model has stopped making the
 * mistake. Outcomes get their own identity tokens, exactly as --agent-* is kept
 * apart from --status-* because tinting an agent with a status colour once put
 * a red dot beside "Summary".
 *
 * Spec: docs/REBUILD_PLAN.md Part 4 decision 2. */
export type MatchOutcome =
  /* Paired, and a rule says why. */
  | "matched"
  /* On the statement, absent from the books. The books need an entry: a fee, a
   * credit the bank received, interest. Yardi calls this a BOOK reconciling
   * item, and that is the vocabulary to use — the ledger is what is wrong. */
  | "bank-only"
  /* In the books, absent from the statement, with no reason to expect it to
   * clear. A voided cheque still on the books, a double entry, a deposit
   * recorded twice. Unlike `timing` this does NOT adjust the proof, which is
   * precisely why it can leave the month unexplained. */
  | "ledger-only"
  /* One-sided, and expected to clear on its own. An outstanding cheque or a
   * deposit in transit. Routine, carries forward, and adjusts the bank side of
   * the proof. The single most common reason a statement and a ledger are
   * SUPPOSED to disagree at month end. */
  | "timing"
  /* A genuine difference that needs a person. The reviewer's four resolution
   * actions all apply here and nowhere else. */
  | "needs-adjustment";

/* Which journey of the proof an outcome feeds, and in which direction. Derived
 * rather than stored, so a match cannot be classified one way and counted
 * another. `proof.ts` is the only consumer. */
export type ProofContribution =
  | { side: "none" }
  /* Reduces or increases the ADJUSTED BANK balance. */
  | { side: "bank"; kind: "outstanding" | "in-transit" }
  /* Adjusts the ADJUSTED BOOK balance by a correcting entry. */
  | { side: "book"; kind: "book-reconciling-item" };

/* ---------- The two sides ---------- */

/* One line from one source. The same shape serves both sides so a match can be
 * rendered symmetrically — the review row shows the bank line on the left and
 * the ledger row(s) on the right, and neither side is privileged. */
export interface MatchLine {
  id: string;
  /* ISO short, "2026-05-04". */
  date: string;
  /* Signed dollars. Positive = money INTO the account, on both sides. The
   * ledger's Debit/Credit columns are normalised to this one convention at the
   * fixture boundary, because every consumer wants the signed figure and
   * because a sign that means different things on two sides of one row is how
   * reconciliation bugs are born. */
  amount: number;
  description: string;
  /* Bank side only: the BAI2 transaction type code and what it means to us.
   * Codes are not fully standard — banks publish proprietary ranges, notably
   * in the 900s — so the meaning is a per-bank mapping and travels with the
   * line rather than being looked up from a constant. */
  typeCode?: number;
  typeMeaning?: string;
  /* Bank reference / customer reference, or the ledger's control and check
   * numbers. Whatever identifies this line in its own system. */
  reference?: string;
}

/* ---------- Why it matched ---------- */

/* The rule that produced the pairing. Matching is deterministic and takes no
 * model (playbook Part 4), so every match has an auditable answer to "why did
 * these match" — and a run records which rule VERSION it used, because a rule
 * changed by a correction must not silently rewrite the explanation of a past
 * decision. */
export interface RuleRef {
  id: string;
  /* Written for a reviewer to read, not a log line: "same amount, same day". */
  label: string;
  version: string;
}

/* A pairing the matcher considered. Kept whether or not it won, because the
 * reviewer's most common action is choosing between them and they cannot choose
 * from a list that was discarded.
 *
 * `rejectedBecause` is null on the candidate that was selected. */
export interface Candidate {
  id: string;
  ledgerRowIds: string[];
  rule: RuleRef;
  rejectedBecause: string | null;
}

/* A named explanation for a group of related lines — the returned payment, a
 * transfer between two accounts under the same property.
 *
 * `confirmed` is the load-bearing field. A pattern is ASSERTED only once a
 * deterministic check has confirmed it; until then it is a suggestion and must
 * be presented as a guess. The model proposes, a rule commits (playbook Part
 * 4). For the returned payment the check is arithmetic: the return plus its fee
 * must equal the original deposit. In the fixture 1,200.00 + 75.00 = 1,275.00,
 * so it confirms — and if a bank ever charged a different fee it would not, and
 * the product would correctly stop claiming to know what happened. */
export interface PatternRef {
  id: string;
  /* "Returned payment", not "NSF_PATTERN_3". */
  label: string;
  confirmed: boolean;
  /* What the check actually verified, in the reviewer's words. Null while
   * unconfirmed, because there is nothing true to say yet. */
  confirmedBy: string | null;
  /* A consequence the arithmetic does not carry. The returned payment nets to
   * zero across three lines, which makes it look settled — but the tenant's
   * rent is now unpaid, and that is the thing a person has to act on. */
  note?: string;
}

/* ---------- Resolution ---------- */

/* The four actions, replacing bucket-swapping. Each one must visibly move the
 * unexplained figure; that is the point of them. "Approve" is deliberately not
 * among them — approving was never a response to a real difference, it was a
 * way of hiding one (gap 3). */
export type ResolutionKind =
  /* It will clear on its own. Reclassifies to `timing` and carries forward. */
  | "accept-as-timing"
  /* The matcher chose wrong. Selects a different candidate. */
  | "correct-the-match"
  /* The books are wrong and need an entry. Carries an amount and a reason, and
   * is what actually moves the adjusted book balance. */
  | "add-correcting-entry"
  /* Genuinely cannot be settled now. Requires a reason, and unlike the other
   * three it leaves the difference UNEXPLAINED rather than resolving it — so a
   * month with anything set aside cannot claim to be proven. */
  | "set-aside";

export interface Resolution {
  kind: ResolutionKind;
  /* Required for every kind. `set-aside` and `add-correcting-entry` cannot be
   * performed without one; the other two record the reviewer's rationale so a
   * later reader knows why the machine was overruled. */
  reason: string;
  /* `add-correcting-entry` only: signed dollars, same convention as MatchLine. */
  amount?: number;
  /* `correct-the-match` only: the candidate the reviewer picked. */
  selectedCandidateId?: string;
  /* Who and when. An AI cannot be accountable (playbook Part 5), so a
   * resolution always names a person. */
  by: string;
  at: string;
}

/* ---------- The match ---------- */

export interface Match {
  id: string;
  /* The account this belongs to. One account for one period is the unit of
   * reconciliation; the property-level session above it is a close package
   * (playbook Part 6, the hierarchy bug). */
  accountId: string;
  /* The accounting period, "May 2026". A match cannot outlive its period, but
   * the open ITEM it may become belongs to the account and carries forward. */
  cycle: string;

  outcome: MatchOutcome;

  /* Both sides are arrays, and both can be empty.
   *
   * The playbook's prompt 1 specifies "a bank side (one statement line)" and a
   * ledger side as an array. This deviates deliberately: the returned-payment
   * pattern is THREE bank lines — the original deposit, the return, and the fee
   * — against one ledger row, and prompt 4 requires presenting those three as
   * ONE linked event. A single-element array covers the ordinary one-to-one
   * case at no cost, so making both sides arrays is strictly more expressive
   * than special-casing the pattern elsewhere.
   *
   * bankLines empty  => ledger-only or timing (an outstanding cheque)
   * ledgerRows empty => bank-only (a fee the books never recorded) */
  bankLines: MatchLine[];
  ledgerRows: MatchLine[];

  /* Null when nothing matched — there is no rule that explains an absence. */
  rule: RuleRef | null;
  /* Every pairing considered. Length > 1 is the ambiguity signal, and it
   * replaces the bare confidence percentage: "2 candidates, matched on memo
   * reference" is a fact a reviewer can act on, where "48%" is a feeling.
   * Empty when nothing was in range. */
  candidates: Candidate[];
  /* A proposed or confirmed explanation. Null for the ordinary case. */
  pattern: PatternRef | null;
  /* Null until a person acts. Only meaningful on `needs-adjustment`. */
  resolution: Resolution | null;

  /* One line, why the matcher reached this outcome. Kept from RecordItem
   * because the teardown identified it as the product's best existing idea —
   * "Matched on memo reference · exact amount" does real work. */
  reason: string;

  /* How long this has been open, in days, for an item that carries forward.
   * Set from the period close, not from today, so the age of a March cheque
   * does not creep while nobody is looking. Flagged stale past 90 days. */
  ageDays?: number;
}

/* ---------- Derivations ----------
 *
 * Functions, not stored fields. A match's contribution to the proof must follow
 * from its outcome and its amounts, or the two can disagree — which is the
 * class of bug that lets a screen claim a month is proven while the ladder says
 * otherwise. */

/* Signed dollars on each side, and the difference between them. */
export function bankTotal(m: Match): number {
  return m.bankLines.reduce((sum, l) => sum + l.amount, 0);
}

export function ledgerTotal(m: Match): number {
  return m.ledgerRows.reduce((sum, l) => sum + l.amount, 0);
}

/* What this match leaves unexplained on its own terms. Zero for a clean match.
 * For the returned payment the three bank lines net to zero against a ledger
 * row of +1,275.00, so the difference is -1,275.00 — exactly the correcting
 * entry the books require. */
export function difference(m: Match): number {
  return bankTotal(m) - ledgerTotal(m);
}

export function isAmbiguous(m: Match): boolean {
  return m.candidates.length > 1;
}

export function isStale(m: Match): boolean {
  return (m.ageDays ?? 0) > 90;
}

/* Whether this match still needs a person. A `needs-adjustment` with a
 * resolution is settled; one without is the work still owed. */
export function needsDecision(m: Match): boolean {
  return m.outcome === "needs-adjustment" && m.resolution === null;
}

/* How this match enters the balance proof.
 *
 * `timing` splits by direction, and the direction comes from the sign on the
 * side that HAS lines. An outstanding cheque is money the books have already
 * paid out that the bank has not yet seen, so it reduces the bank balance; a
 * deposit in transit is money the books have already taken in, so it increases
 * it. Both are ledger-side-only, and the sign is what tells them apart. */
export function proofContribution(m: Match): ProofContribution {
  switch (m.outcome) {
    case "matched":
      return { side: "none" };

    case "timing": {
      const amount = m.ledgerRows.length ? ledgerTotal(m) : bankTotal(m);
      return {
        side: "bank",
        kind: amount < 0 ? "outstanding" : "in-transit",
      };
    }

    case "bank-only":
      /* The bank saw it and the books did not, so the books get the entry. */
      return { side: "book", kind: "book-reconciling-item" };

    case "needs-adjustment":
      /* Only once resolved with a correcting entry does it adjust anything.
       * Unresolved, and when set aside, it contributes nothing and the
       * difference stays visible in the unexplained figure — which is the
       * behaviour that stops "approving" from making a shortfall disappear. */
      if (m.resolution?.kind === "add-correcting-entry") {
        return { side: "book", kind: "book-reconciling-item" };
      }
      return { side: "none" };

    case "ledger-only":
      /* The residue. Deliberately adjusts NOTHING: an item in the books with
       * no counterpart and no reason to expect one is not explained by being
       * categorised, and the proof should refuse to reach zero while it
       * stands. */
      return { side: "none" };
  }
}

/* The signed amount this match contributes to its side of the proof. Read
 * alongside `proofContribution`, which says where it goes. */
export function proofAmount(m: Match): number {
  switch (m.outcome) {
    case "timing":
      return m.ledgerRows.length ? ledgerTotal(m) : bankTotal(m);
    case "bank-only":
      return bankTotal(m);
    case "needs-adjustment":
      return m.resolution?.kind === "add-correcting-entry"
        ? m.resolution.amount ?? 0
        : 0;
    default:
      return 0;
  }
}
