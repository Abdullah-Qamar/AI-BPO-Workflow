/* The Westlake operating account, May 2026, expressed as matches.
 *
 * `lib/fixtures/westlakeOperating.ts` holds the two files as rows. This module
 * is the matcher's verdict on them: 14 bank lines and 16 ledger rows resolved
 * into 16 matches across all five outcomes. It is the first thing in the app
 * that actually uses the contract in `match.ts`, which until now nothing did.
 *
 * ---------------------------------------------------------------------------
 * Why this is a hand-authored table and not a matching engine
 *
 * The playbook is explicit that matching takes no model and is a deterministic
 * rule ladder (Part 4), and that being rules is what makes it testable. None of
 * that argues for shipping the ladder inside a design prototype: an engine run
 * over 30 rows would produce exactly the verdicts below, and the verdicts are
 * what the screens consume. What the engine would add is a second place for the
 * month to be wrong.
 *
 * So the rule that produced each pairing is RECORDED on the match rather than
 * executed. `rule.label` is the rung of the ladder that fired, in the words a
 * reviewer reads. That keeps the auditable answer to "why did these match"
 * without pretending to a matching engine this artifact does not have.
 *
 * ---------------------------------------------------------------------------
 * The two open items, and why they are the whole demo
 *
 * Twelve of the sixteen matches are settled at first pass. Two are not, and
 * they were planted to be the two hardest cases in the job:
 *
 *   The returned payment. Three bank lines (+1,275.00 deposit, -1,200.00
 *   return, -75.00 fee) against one ledger row of +1,275.00. The bank side nets
 *   to zero, so it LOOKS settled, and the books are wrong by the full 1,275.00.
 *   A deterministic check confirms the pattern — 1,200.00 + 75.00 = 1,275.00 —
 *   which is what lets the product name it instead of reporting "amounts don't
 *   match, 1,200 versus 1,275" as the old seed did.
 *
 *   The ambiguous refund. One bank debit of -210.00 against TWO ledger refunds
 *   of -210.00 each, posted 14 and 16 May either side of the bank's 15 May. The
 *   date rung cannot separate them: both are exactly one day out. Only the memo
 *   says "INV 4912", and reading intent out of free text is the Explainer's job,
 *   which has no authority to commit. So the matcher stops, and a person picks.
 *
 * The second one carries the playbook's sharpest lesson. WHICHEVER refund the
 * reviewer picks, the proof reaches zero: the chosen row matches the bank line
 * and the other becomes an outstanding item, and 210.00 leaves the bank side
 * either way. A wrong pick ties perfectly and refunds the wrong tenant. That is
 * "balance is not evidence of correctness" made mechanical rather than asserted.
 *
 * ---------------------------------------------------------------------------
 * What the arithmetic comes to
 *
 * At first pass, with both open items unresolved:
 *
 *   adjusted bank  301,980.10 - 18,240.50 + 9,315.00 = 293,054.60
 *   adjusted book  289,944.00 +  4,175.60            = 294,119.60
 *   unexplained                                          (1,065.00)
 *
 * And 1,065.00 is not an arbitrary residue: it is exactly 1,275.00 - 210.00,
 * the two open items' effects. Resolve the return with a correcting entry and
 * the book side falls to 292,844.60; settle the refund and the loser becomes an
 * outstanding item and the bank side falls to 292,844.60 too. Both journeys
 * land on the same figure and the proof reaches 0.00. `proof.ts` computes all
 * of this from the matches below; none of it is written down as a total.
 */

import type { Candidate, Match, MatchLine, RuleRef } from "./match";
import {
  bankLines,
  ledgerRows,
  type FixtureBankLine,
  type FixtureLedgerRow,
} from "@/lib/fixtures/westlakeOperating";

/* ---------- Scope ---------- */

export const ACCOUNT_ID = "acct-westlake-chase-operating";
export const ACCOUNT_LABEL = "Chase Operating";
export const ACCOUNT_NUMBER = "••••3421";
export const CYCLE = "May 2026";

/* The last day of the period. Every age below is measured from here rather
 * than from today, so a March cheque does not silently grow older while nobody
 * is looking at it (match.ts, `ageDays`). */
export const PERIOD_END = "2026-05-31";

/* ---------- The rule ladder ----------
 *
 * The rungs, in the order the matcher tries them. Versions are recorded on
 * every match because a rule changed by a correction must not silently rewrite
 * the explanation of a decision already made.
 */
const RULES = {
  exactDay: {
    id: "rule-exact-day",
    label: "Same amount, same day",
    version: "1.4",
  },
  checkNo: {
    id: "rule-check-number",
    label: "Cheque number and amount agree",
    version: "1.2",
  },
  sumToDeposit: {
    id: "rule-sum-to-deposit",
    label: "One deposit against several rows summing to it",
    version: "1.1",
  },
  nearDay: {
    id: "rule-near-day",
    label: "Same amount, within three days",
    version: "1.4",
  },
  noCounterpart: {
    id: "rule-no-counterpart",
    label: "No counterpart within the window",
    version: "1.0",
  },
} satisfies Record<string, RuleRef>;

/* ---------- Row lookup ----------
 *
 * Throws on a miss rather than returning undefined. A typo in an id here would
 * otherwise produce a match with one side silently empty, which reclassifies it
 * and moves the proof — the exact failure mode `verifyFixture` exists to catch
 * on the other side of the boundary.
 */
function bank(id: string): MatchLine {
  const line = bankLines.find((l: FixtureBankLine) => l.id === id);
  if (!line) throw new Error(`No bank line ${id} in the Westlake fixture`);
  return {
    id: line.id,
    date: line.postDate,
    amount: line.amount,
    description: line.description,
    typeCode: line.typeCode,
    typeMeaning: line.typeMeaning,
    reference: line.customerRef,
  };
}

function ledger(id: string): MatchLine {
  const row = ledgerRows.find((r: FixtureLedgerRow) => r.id === id);
  if (!row) throw new Error(`No ledger row ${id} in the Westlake fixture`);
  return {
    id: row.id,
    date: row.postDate,
    amount: row.amount,
    /* Payee first: on the ledger side it is what identifies the row to a
     * reviewer, where the description is the reason for the payment. */
    description: `${row.payee} · ${row.description}`,
    reference: row.checkNo ? `Cheque ${row.checkNo}` : row.controlNo,
  };
}

/* Whole days between a ledger date and the period end. */
function ageAtClose(date: string): number {
  const days =
    (Date.parse(`${PERIOD_END}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
    86_400_000;
  return Math.round(days);
}

/* ---------- The candidates on the ambiguous refund ----------
 *
 * Both are kept, neither is selected, and `rejectedBecause` is null on both —
 * the field records why the matcher DISCARDED a pairing, and it discarded
 * neither. It could not choose. Writing a rejection reason on one of them to
 * make the shape look decided would be the product claiming a judgement it did
 * not make.
 */
const REFUND_CANDIDATES: Candidate[] = [
  {
    id: "cand-refund-4912",
    ledgerRowIds: ["gl-v20901"],
    rule: RULES.nearDay,
    rejectedBecause: null,
  },
  {
    id: "cand-refund-4913",
    ledgerRowIds: ["gl-v20907"],
    rule: RULES.nearDay,
    rejectedBecause: null,
  },
];

/* ---------- The month ---------- */

export const westlakeMatches: Match[] = [
  /* ===== Settled: paired, with a rule that says why ===== */

  {
    id: "m-rent-batch-0504",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0504001")],
    ledgerRows: [
      ledger("gl-r11501"),
      ledger("gl-r11502"),
      ledger("gl-r11503"),
    ],
    rule: RULES.sumToDeposit,
    candidates: [
      {
        id: "cand-rent-batch",
        ledgerRowIds: ["gl-r11501", "gl-r11502", "gl-r11503"],
        rule: RULES.sumToDeposit,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "One ACH batch against three rent rows summing to it · 4,200.00 + 4,150.00 + 4,100.00",
  },
  {
    id: "m-deposit-0506",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0506001")],
    ledgerRows: [ledger("gl-r11510")],
    rule: RULES.exactDay,
    candidates: [
      {
        id: "cand-deposit-0506",
        ledgerRowIds: ["gl-r11510"],
        rule: RULES.exactDay,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "Cheque deposit package, same amount and same day · batch 0506",
  },
  {
    id: "m-deposit-0518",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0518001")],
    ledgerRows: [ledger("gl-r11533")],
    rule: RULES.exactDay,
    candidates: [
      {
        id: "cand-deposit-0518",
        ledgerRowIds: ["gl-r11533"],
        rule: RULES.exactDay,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "Cheque deposit package, same amount and same day · batch 0518",
  },
  {
    id: "m-cheque-1038",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0507001")],
    ledgerRows: [ledger("gl-v20881")],
    rule: RULES.checkNo,
    candidates: [
      {
        id: "cand-cheque-1038",
        ledgerRowIds: ["gl-v20881"],
        rule: RULES.checkNo,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "Cheque 1038 presented, amount agrees with the voucher",
  },
  {
    id: "m-cheque-1040",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0511001")],
    ledgerRows: [ledger("gl-v20894")],
    rule: RULES.checkNo,
    candidates: [
      {
        id: "cand-cheque-1040",
        ledgerRowIds: ["gl-v20894"],
        rule: RULES.checkNo,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "Cheque 1040 presented, amount agrees with the voucher",
  },
  {
    id: "m-cheque-1045",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0522001")],
    ledgerRows: [ledger("gl-v20915")],
    rule: RULES.checkNo,
    candidates: [
      {
        id: "cand-cheque-1045",
        ledgerRowIds: ["gl-v20915"],
        rule: RULES.checkNo,
        rejectedBecause: null,
      },
    ],
    pattern: null,
    resolution: null,
    reason: "Cheque 1045 presented, amount agrees with the voucher",
  },
  {
    id: "m-transfer-0526",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "matched",
    bankLines: [bank("bank-br0526001")],
    ledgerRows: [ledger("gl-j04417")],
    rule: RULES.exactDay,
    candidates: [
      {
        id: "cand-transfer-0526",
        ledgerRowIds: ["gl-j04417"],
        rule: RULES.exactDay,
        rejectedBecause: null,
      },
    ],
    pattern: {
      id: "pattern-internal-transfer",
      label: "Transfer between own accounts",
      confirmed: true,
      confirmedBy:
        "The receiving account XXXX9034 is on the same property, and the journal entry names it",
      note: "Cash left this account but not the portfolio. The reserve account's own reconciliation carries the other leg.",
    },
    resolution: null,
    reason: "Transfer to capital reserve, same amount and same day",
  },

  /* ===== Bank-only: the statement saw it, the books never did =====
   *
   * Yardi's vocabulary calls these BOOK reconciling items, because the ledger
   * is the side that is wrong and the ledger is the side that gets an entry.
   * All three adjust the book journey of the proof.
   */

  {
    id: "m-stripe-payout-0512",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "bank-only",
    bankLines: [bank("bank-br0512001")],
    ledgerRows: [],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Card settlement reached the bank · no ledger entry within three days",
  },
  {
    id: "m-interest-0531",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "bank-only",
    bankLines: [bank("bank-br0531002")],
    ledgerRows: [],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Interest credited by the bank · the books never record it until the statement arrives",
  },
  {
    id: "m-service-fee-0529",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "bank-only",
    bankLines: [bank("bank-br0529001")],
    ledgerRows: [],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Account analysis fee charged by the bank · no voucher raised",
  },

  /* ===== Timing: one-sided, and expected to clear =====
   *
   * Routine. These are the reason a statement and a ledger are SUPPOSED to
   * disagree at month end, and the reason a two-bucket model had to file a
   * normal month as a pile of problems.
   */

  {
    id: "m-cheque-1042-outstanding",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "timing",
    bankLines: [],
    ledgerRows: [ledger("gl-v20922")],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Cheque 1042 written, not yet presented",
    ageDays: ageAtClose("2026-05-24"),
  },
  {
    id: "m-cheque-1051-outstanding",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "timing",
    bankLines: [],
    ledgerRows: [ledger("gl-v20930")],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Cheque 1051 written, not yet presented",
    ageDays: ageAtClose("2026-05-28"),
  },
  {
    id: "m-cheque-1055-outstanding",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "timing",
    bankLines: [],
    ledgerRows: [ledger("gl-v20938")],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Cheque 1055 written, not yet presented",
    ageDays: ageAtClose("2026-05-29"),
  },
  {
    id: "m-deposit-0531-in-transit",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "timing",
    bankLines: [],
    ledgerRows: [ledger("gl-r11560")],
    rule: RULES.noCounterpart,
    candidates: [],
    pattern: null,
    resolution: null,
    reason: "Banked on the last day of the period · lands on the statement in June",
    ageDays: ageAtClose("2026-05-31"),
  },

  /* ===== Needs adjustment: the two the machine hands over ===== */

  {
    id: "m-returned-payment-308",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "needs-adjustment",
    /* Three bank lines against one ledger row. This is the deviation from the
     * playbook's "bank side (one statement line)" that match.ts documents: the
     * pattern only holds together if the deposit, the return and the fee are
     * ONE event, and splitting them across three matches is how the old seed
     * came to report a routine bounce as a mystery. */
    bankLines: [
      bank("bank-br0503001"),
      bank("bank-br0520001"),
      bank("bank-br0520002"),
    ],
    ledgerRows: [ledger("gl-r11488")],
    rule: RULES.exactDay,
    candidates: [
      {
        id: "cand-returned-308",
        ledgerRowIds: ["gl-r11488"],
        rule: RULES.exactDay,
        rejectedBecause: null,
      },
    ],
    pattern: {
      id: "pattern-returned-payment",
      label: "Returned payment",
      confirmed: true,
      confirmedBy:
        "The return of 1,200.00 plus its 75.00 fee equals the 1,275.00 deposit it reverses",
      note: "Rent for unit 308 is unpaid. The books still show it received, and the tenant owes 1,275.00 before any fee is passed on.",
    },
    resolution: null,
    reason: "Deposit reversed on 20 May with a return fee · the books record the rent as received",
  },
  {
    id: "m-refund-4912-ambiguous",
    accountId: ACCOUNT_ID,
    cycle: CYCLE,
    outcome: "needs-adjustment",
    bankLines: [bank("bank-br0515001")],
    /* BOTH candidate rows, not one and not none.
     *
     * Empty was the first instinct and it was wrong. The reasoning for empty
     * was sound as far as it went — committing one row here would record a
     * decision nobody made — but it threw away the half of this match that is
     * not in doubt. Two refunds of 210.00 sit in the books against one debit of
     * 210.00 on the statement, so exactly one of them has not cleared, and that
     * is true before anybody chooses and stays true whichever way they choose.
     * With the rows absent, 210.00 of genuinely outstanding money was invisible
     * to the proof until the decision was taken.
     *
     * So `ledgerRows` holds every row this match touches, and `candidates`
     * holds the ways they could pair. The two fields answer different
     * questions, which is why the apparent redundancy is not one. Resolving
     * the match narrows `ledgerRows` to the chosen row and hands the other to
     * a `timing` match of its own.
     *
     * It reads correctly in the item view too: bank line on the left, two
     * ledger rows on the right, each one selectable. That is the shape of the
     * decision. */
    ledgerRows: [ledger("gl-v20901"), ledger("gl-v20907")],
    rule: null,
    candidates: REFUND_CANDIDATES,
    /* An UNCONFIRMED pattern, and the distinction is the whole point of the
     * field.
     *
     * The Explainer reads "ACH DEBIT REFUND INV 4912" and proposes the obvious
     * reading: this is the refund against invoice 4912, so it is Tenant 115's.
     * That reading is probably right. It is also a model inferring intent from
     * free text, which is a suggestion and not a finding, so no deterministic
     * check can commit it. The amounts are identical, the two ledger dates are
     * symmetrical about the bank's, and a memo string is not evidence a rule
     * can test.
     *
     * So `confirmed` stays false and `confirmedBy` stays null, because there is
     * nothing true to say yet. Every surface has to present this as a guess:
     * the balance proof refuses to use the label at all and falls back to the
     * bank's type code, and the review screen must mark it as proposed. The
     * model proposes, a rule commits, and here no rule can. */
    pattern: {
      id: "pattern-refund-against-invoice",
      label: "Refund against invoice 4912",
      confirmed: false,
      confirmedBy: null,
      note: "Only the memo points at 4912. The amounts are identical and the two ledger dates sit one day either side of the bank's, so nothing but that text separates them.",
    },
    resolution: null,
    reason: "Two refunds of 210.00 one day either side · the memo says invoice 4912, which no rule can confirm",
    /* 17 days: the age of the OLDER of the two candidate rows, 14 May.
     *
     * The surplus is whichever row loses, so its true age is 15 days or 17 and
     * nobody knows which yet. The older figure is the one to show. It feeds an
     * "oldest" statement and a staleness flag, and on both of those the safe
     * direction to be wrong is towards looking older: overstating age invites a
     * second look, understating it suppresses one. */
    ageDays: ageAtClose("2026-05-14"),
  },
];
