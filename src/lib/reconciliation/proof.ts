/* The balance proof.
 *
 * Gap 4 in the playbook, and the single highest-value thing missing from the
 * product: the screen that shows counts, percentages and a "tied" label had no
 * balances anywhere in its model, and proving the balances agree is the entire
 * reason reconciliation exists.
 *
 * ---------------------------------------------------------------------------
 * Two journeys, one meeting point
 *
 * The bank's record and the books are SUPPOSED to disagree at month end. A
 * cheque written on the 28th has not cleared. A deposit banked on the 31st
 * lands on the 1st. Neither is an error. So the proof does not compare the two
 * balances; it walks each one to the figure it would be if nothing were in
 * flight, and checks that the two walks arrive at the same place.
 *
 *   bank statement closing  -  outstanding  +  in transit   =  adjusted bank
 *   ledger closing          +  book reconciling items       =  adjusted book
 *   adjusted bank           -  adjusted book                =  STILL UNEXPLAINED
 *
 * ---------------------------------------------------------------------------
 * Every figure is computed, and that is the claim the panel makes
 *
 * Both starting balances are read off the source documents. Every adjustment
 * below them is derived from the matches by `proofContribution` and
 * `proofAmount` in match.ts, which are functions rather than stored fields
 * precisely so a match cannot be classified one way and counted another.
 * Nothing on this ladder is seeded, which is what earns the panel the right to
 * say "calculated, not estimated" — the old screen's "tied" label was a string
 * in the seed, and a proof that asserts its own conclusion proves nothing.
 *
 * ---------------------------------------------------------------------------
 * Why the two sides are grouped differently, on purpose
 *
 * The bank side collapses into two lines with counts: outstanding cheques are
 * interchangeable, and "3 items, oldest 7 days" is what a reviewer needs, not
 * three near-identical rows. The book side lists every item separately,
 * because each one is a different STORY — a card settlement, interest, a fee,
 * a returned rent payment — and netting them the way a printed proof does
 * ("a service charge, plus interest earned, (142.82)") hides which is which.
 *
 * ---------------------------------------------------------------------------
 * Unresolved items are counted as unexplained, not hidden
 *
 * A `needs-adjustment` match contributes nothing until a person resolves it,
 * so the proof does not reach zero while work is owed. That is the behaviour
 * gap 3 asks for: moving a difference to "approved" never made it go away, and
 * a month with anything set aside cannot claim to be proven.
 */

import {
  needsDecision,
  proofAmount,
  proofContribution,
  type Match,
} from "./match";
import { isZero, sumDollars, toCents, toDollars } from "@/lib/money";

/* ---------- Shape ---------- */

/* One line of the ladder. `matchIds` is provenance: every figure can be traced
 * back to the matches that produced it, so a reviewer who distrusts a number
 * can open the items behind it rather than taking it on faith. */
export interface ProofLine {
  id: string;
  /* Carries its own operator: "Less cheques written, not yet cleared". */
  label: string;
  /* The instance behind the category, or the count behind the group. */
  detail?: string;
  /* Signed dollars. Negative reduces the side it sits on. */
  amount: number;
  matchIds: string[];
}

export interface ProofSide {
  /* "Statement balance, 31 May" / "Ledger balance, 31 May". */
  balanceLabel: string;
  balance: number;
  lines: ProofLine[];
  /* "Adjusted bank balance" / "Adjusted book balance". */
  adjustedLabel: string;
  adjusted: number;
}

/* A difference still waiting on a person. Surfaced beside the unexplained
 * figure because "1,065.00 unexplained" is a fact, and "two items owe a
 * decision" is what to do about it. */
export interface OpenItem {
  matchId: string;
  label: string;
  /* What this match leaves unexplained on its own terms. */
  amount: number;
  /* The question the reviewer has to settle, in their words. */
  question: string;
}

export interface BalanceProof {
  bank: ProofSide;
  book: ProofSide;
  /* adjusted bank - adjusted book. Zero is the only acceptable answer before
   * anything posts, which is how Yardi itself works. */
  unexplained: number;
  tied: boolean;
  openItems: OpenItem[];
}

/* ---------- Helpers ---------- */

function short(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* The word a ladder line leads with. The figure is rendered in accounting form
 * as well, and the redundancy is the convention: the word serves a reader
 * going line by line, the parentheses serve one scanning the column. */
function operator(amount: number): "Plus" | "Less" {
  return toCents(amount) < 0 ? "Less" : "Plus";
}

/* Lowercase the first letter of a type-code meaning so it reads as part of the
 * sentence the operator starts: "Less service fee", not "Less Service fee".
 * Left alone when the string starts with an acronym the bank publishes in
 * caps, because "Plus aCH credit" is worse than the inconsistency. */
function asPhrase(meaning: string): string {
  if (/^[A-Z]{2,}/.test(meaning)) return meaning;
  return meaning.charAt(0).toLowerCase() + meaning.slice(1);
}

/* ---------- The computation ---------- */

export function buildProof(input: {
  matches: Match[];
  /* Type code 015 from the statement's own account header. What the BANK said,
   * not what the lines add up to — `verifyFixture` is what checks those agree,
   * and keeping them separate is the only reason that check can fail. */
  statementClosing: number;
  /* Opening balance plus every ledger row. A fact about the ledger, arrived at
   * without reference to matching. */
  ledgerClosing: number;
  periodEndLabel: string;
}): BalanceProof {
  const { matches, statementClosing, ledgerClosing, periodEndLabel } = input;

  /* ----- Bank journey: remove what the bank has not seen yet ----- */

  const outstanding: Match[] = [];
  const inTransit: Match[] = [];
  const bookItems: Match[] = [];

  for (const m of matches) {
    const contribution = proofContribution(m);
    if (contribution.side === "bank") {
      (contribution.kind === "outstanding" ? outstanding : inTransit).push(m);
    } else if (contribution.side === "book") {
      bookItems.push(m);
    }
  }

  const bankLines: ProofLine[] = [];

  if (outstanding.length) {
    const amount = sumDollars(outstanding.map(proofAmount));
    const oldest = Math.max(...outstanding.map((m) => m.ageDays ?? 0));
    bankLines.push({
      id: "bank-outstanding",
      /* "Outstanding payments", not "outstanding cheques". The group is all
       * cheques in most months and the vocabulary's term of art is the cheque,
       * but the moment a reviewer settles the ambiguous refund the losing ACH
       * row lands in this same group — and a line reading "4 cheques" over a
       * set containing an ACH refund is a small lie on a document whose entire
       * claim is that its figures can be checked. */
      label: "Less outstanding payments",
      detail: `${outstanding.length} ${
        outstanding.length === 1 ? "item" : "items"
      } · oldest ${oldest} ${oldest === 1 ? "day" : "days"}`,
      amount,
      matchIds: outstanding.map((m) => m.id),
    });
  }

  if (inTransit.length) {
    const amount = sumDollars(inTransit.map(proofAmount));
    bankLines.push({
      id: "bank-in-transit",
      label: "Plus deposits banked, not yet landed",
      detail: `${inTransit.length} ${
        inTransit.length === 1 ? "deposit" : "deposits"
      }`,
      amount,
      matchIds: inTransit.map((m) => m.id),
    });
  }

  const adjustedBankCents =
    toCents(statementClosing) + bankLines.reduce((t, l) => t + toCents(l.amount), 0);

  /* ----- Book journey: add what the books have not recorded yet ----- */

  const bookLines: ProofLine[] = bookItems.map((m) => {
    const amount = proofAmount(m);
    const line = m.bankLines[0];

    /* A confirmed pattern names itself better than a type code can: "Less
     * returned payment" carries the whole event, where the three bank lines
     * underneath it are an ACH credit, a returned item and a fee. */
    if (m.pattern?.confirmed) {
      /* The SPAN, not the prose. A pattern's `reason` is written for the
       * review screen, where there is room for a sentence; set as a ladder
       * detail it wrapped to two lines and pushed the book side out of step
       * with the bank side. What this line owes a reader is that the entry
       * covers several statement lines and over what stretch, which is also the
       * fact that makes a netted event hard to spot by eye. */
      const dates = m.bankLines.map((l) => l.date).sort();
      return {
        id: `book-${m.id}`,
        label: `${operator(amount)} ${asPhrase(m.pattern.label)}`,
        detail:
          dates.length > 1
            ? `${dates.length} statement lines · ${short(dates[0])} to ${short(
                dates[dates.length - 1]
              )}`
            : dates.length === 1
              ? short(dates[0])
              : undefined,
        amount,
        matchIds: [m.id],
      };
    }

    return {
      id: `book-${m.id}`,
      /* The bank's own transaction type code, which is the per-bank code
       * dictionary doing exactly the job the playbook names for it. */
      label: `${operator(amount)} ${asPhrase(line?.typeMeaning ?? "adjustment")}`,
      /* The date and the bank's own reference, NOT the statement description.
       * A BAI2 description is upper case by convention ("ACH CREDIT STRIPE
       * PAYOUT ST-88412") and this design language retired upper-case text
       * everywhere; sentence-casing it would need a parser that has to guess
       * which words are proper nouns. It is redundant here in any case, because
       * the label already carries what KIND of item this is, off the type code.
       * What the detail owes the reader is WHICH one, and that is the date and
       * the reference. Identifiers stay upper case, which is already how the
       * app writes TH-1247 and GL 1010. */
      detail: line
        ? [short(line.date), line.reference].filter(Boolean).join(" · ")
        : undefined,
      amount,
      matchIds: [m.id],
    };
  });

  const adjustedBookCents =
    toCents(ledgerClosing) + bookLines.reduce((t, l) => t + toCents(l.amount), 0);

  /* ----- What is left ----- */

  const unexplainedCents = adjustedBankCents - adjustedBookCents;

  /* Everything still waiting on a person, which is now `needsDecision` rather
   * than a local test for `needs-adjustment`. Bank-only items joined the queue
   * when they stopped applying themselves: a fee the books never recorded does
   * not reach the ledger until somebody books it, and a proof that shows a gap
   * with nothing to click is worse than one that shows the gap and the four
   * items behind it.
   *
   * The two kinds ask different questions, and the `question` field is where
   * that difference lives rather than in a second list. */
  const openItems: OpenItem[] = matches.filter(needsDecision).map((m) => ({
    matchId: m.id,
    /* A confirmed pattern names the whole event. Otherwise the type code's
     * meaning, for the same reason the ladder uses it: it is short, it is the
     * bank's own classification, and it is not upper case. The statement
     * description is deliberately not used here either. */
    label:
      (m.pattern?.confirmed ? m.pattern.label : null) ??
      m.bankLines[0]?.typeMeaning ??
      "Difference",
    amount: toDollars(
      toCents(sumDollars(m.bankLines.map((l) => l.amount))) -
        toCents(sumDollars(m.ledgerRows.map((l) => l.amount)))
    ),
    question:
      m.candidates.length > 1
        ? `Choose between ${m.candidates.length} candidates`
        : m.outcome === "bank-only"
          ? /* Not "needs a correcting entry". The entry is not in question — the
             * bank charged the fee and the books are simply missing it. What is
             * owed is somebody accepting it into the ledger, and saying so
             * keeps this row honestly distinct from a real difference. */
            "Book it to the ledger"
          : "Needs a correcting entry",
  }));

  return {
    bank: {
      balanceLabel: `Statement balance, ${periodEndLabel}`,
      balance: statementClosing,
      lines: bankLines,
      adjustedLabel: "Adjusted bank balance",
      adjusted: toDollars(adjustedBankCents),
    },
    book: {
      balanceLabel: `Ledger balance, ${periodEndLabel}`,
      balance: ledgerClosing,
      lines: bookLines,
      adjustedLabel: "Adjusted book balance",
      adjusted: toDollars(adjustedBookCents),
    },
    unexplained: toDollars(unexplainedCents),
    tied: isZero(toDollars(unexplainedCents)),
    openItems,
  };
}
