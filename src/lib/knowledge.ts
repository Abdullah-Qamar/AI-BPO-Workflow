/* What the machine has been taught: rules, and situations on the trust ladder.
 *
 * Rules are data. Patterns are product. Prompts are code. Three different
 * things with three different owners, routinely collapsed into one, and the
 * collapse is what the current knowledge base is:
 *
 *   "Tenant ACH returns for unit 308 are a known recurring issue with broken
 *    auto-pay. Approve manually."
 *   "Refunds under $250 are routine. Auto-approve and skip the ambiguity check."
 *
 * Both are prompts wearing a rule's clothes. The first tells the books a tenant
 * paid when they did not. The second disables the exact safeguard the fixture's
 * two 210.00 refunds exist to demonstrate. Neither can be tested, previewed, or
 * used to reconstruct why March behaved differently from April, and neither has
 * anybody's name on it or a date it stops being true.
 *
 * ---------------------------------------------------------------------------
 * The preview is real, and that is the point of this module
 *
 * Step two of writing a rule is replaying last month through the draft and
 * saying what would have changed. Every product of this kind leaves it out, and
 * it is the difference between a setting and a decision somebody understands.
 *
 * So the conditions here are a small closed set the prototype can actually
 * EVALUATE against the fixture's month, rather than free text it would have to
 * pretend to understand. Three kinds is enough to carry the argument, and one
 * of the three is the dangerous rule from the seed — previewing it shows it
 * auto-picking between two candidates the system has already said it cannot
 * tell apart, which is a far better case against it than a paragraph.
 *
 * Spec: docs/UX_SPECS.md section 4, docs/AI_ARCHITECTURE.md Part 5,
 * docs/FLOWS.md F7 and F9.
 */

import { isAmbiguous, type Match } from "@/lib/reconciliation/match";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { sumDollars, toCents } from "@/lib/money";
import type { Rung } from "@/components/entities/PatternRow";
import type { RuleScope } from "@/components/entities/RuleRow";

/* ---------- Conditions the prototype can actually run ---------- */

export type Condition =
  /* Book a bank-only item automatically when it is under an amount. Routine:
   * a fee or interest the books never recorded, where the only question is who
   * accepts it into the ledger. */
  | { kind: "auto-book-bank-only-under"; amount: number }
  /* Pair on amount within a window of days. The matcher's own ladder, exposed
   * so the window can be tuned per property. */
  | { kind: "match-within-days"; days: number }
  /* Pick the first candidate on an ambiguous match under an amount.
   *
   * This is the seed's "refunds under $250 are routine, auto-approve and skip
   * the ambiguity check", modelled honestly. It is in the set precisely so the
   * preview and the conflict check can refuse it in front of somebody. */
  | { kind: "auto-pick-ambiguous-under"; amount: number };

export function conditionWords(c: Condition): string {
  switch (c.kind) {
    case "auto-book-bank-only-under":
      return `Book a statement item the ledger is missing, automatically, when it is under ${c.amount.toFixed(2)}`;
    case "match-within-days":
      return `Pair rows of the same amount posted within ${c.days} ${
        c.days === 1 ? "day" : "days"
      } of each other`;
    case "auto-pick-ambiguous-under":
      return `Choose the first candidate automatically when a match is ambiguous and under ${c.amount.toFixed(2)}`;
  }
}

/* ---------- A rule ---------- */

export interface Rule {
  id: string;
  condition: Condition;
  /* The plain-words version a reviewer reads, which may say more than the
   * condition can express — why the window is five days, for instance. */
  words: string;
  scope: RuleScope;
  scopeLabel?: string;
  /* Required. A rule nobody owns is a rule nobody reviews. */
  owner: string;
  /* Required, ISO. A rule that never expires never gets looked at again. */
  expires: string;
  timesFired: number;
  timesOverridden: number;
}

export function overrideRate(r: Rule): number | null {
  /* Nothing until there is enough to divide. A rate off one disagreement gets
   * believed far past what it can support. */
  if (r.timesFired < 5) return null;
  return r.timesOverridden / r.timesFired;
}

export const rules: Rule[] = [
  {
    id: "rule-bayview-window",
    condition: { kind: "match-within-days", days: 5 },
    words:
      "Bayview Landscaping invoices arrive up to five days late, so allow a five day window",
    scope: "property",
    scopeLabel: "1849 Westlake",
    owner: "S. Mehta",
    expires: "2026-12-31",
    timesFired: 40,
    timesOverridden: 18,
  },
  {
    id: "rule-refund-window",
    condition: { kind: "match-within-days", days: 3 },
    words: "Refunds issued within three days of the bank debit, matched to the cent",
    scope: "account",
    scopeLabel: "1849 Westlake · Operating",
    owner: "N. Okafor",
    expires: "2026-09-30",
    timesFired: 64,
    timesOverridden: 9,
  },
  {
    id: "rule-sum-to-deposit",
    condition: { kind: "match-within-days", days: 0 },
    words: "A deposit matching three or more rent rows that sum to it",
    scope: "global",
    owner: "Product",
    expires: "2027-01-31",
    timesFired: 1842,
    timesOverridden: 11,
  },
  {
    id: "rule-cheque-number",
    condition: { kind: "match-within-days", days: 0 },
    words: "Cheque number and amount agree with the voucher",
    scope: "global",
    owner: "Product",
    expires: "2027-01-31",
    timesFired: 4103,
    timesOverridden: 6,
  },
  {
    id: "rule-closed-period",
    condition: { kind: "match-within-days", days: 0 },
    words: "Never post into a closed period",
    scope: "global",
    owner: "Engineering",
    expires: "2030-01-01",
    timesFired: 3,
    timesOverridden: 0,
  },
];

/* Worst first, by override rate. That puts the rules most likely to be wrong at
 * the top, which is the only sensible default for a list whose one number is
 * how often people disagree with it. Rules with too little evidence to rate sit
 * below the rated ones rather than at either extreme. */
export function rulesWorstFirst(list: Rule[] = rules): Rule[] {
  return [...list].sort((a, b) => {
    const ra = overrideRate(a);
    const rb = overrideRate(b);
    if (ra === null && rb === null) return b.timesFired - a.timesFired;
    if (ra === null) return 1;
    if (rb === null) return -1;
    return rb - ra;
  });
}

export function portfolioOverrideRate(list: Rule[] = rules): number {
  const fired = list.reduce((n, r) => n + r.timesFired, 0);
  const overridden = list.reduce((n, r) => n + r.timesOverridden, 0);
  return fired === 0 ? 0 : overridden / fired;
}

/* ---------- Step 2: the preview ---------- */

export interface PreviewHit {
  matchId: string;
  what: string;
  amount: number;
  /* What the rule would have done to it. */
  effect: string;
}

export interface Preview {
  hits: PreviewHit[];
  totalAmount: number;
  /* Written for the reviewer: "would have changed 3 items worth 4,545.60". */
  summary: string;
}

/* Replays the draft condition over a month IN MEMORY. Nothing is saved and
 * nothing is changed — the whole value of a preview is that it is free. */
export function previewCondition(
  condition: Condition,
  month: Match[] = westlakeMatches
): Preview {
  const hits: PreviewHit[] = [];

  for (const m of month) {
    if (condition.kind === "auto-book-bank-only-under") {
      if (m.outcome !== "bank-only") continue;
      const line = m.bankLines[0];
      if (!line) continue;
      if (Math.abs(toCents(line.amount)) > toCents(condition.amount)) continue;
      hits.push({
        matchId: m.id,
        what: line.typeMeaning ?? line.description,
        amount: line.amount,
        effect: "booked to the ledger without a person",
      });
    }

    if (condition.kind === "auto-pick-ambiguous-under") {
      if (!isAmbiguous(m)) continue;
      const line = m.bankLines[0];
      if (!line) continue;
      if (Math.abs(toCents(line.amount)) > toCents(condition.amount)) continue;
      const first = m.candidates[0];
      const chosen = m.ledgerRows.find((r) =>
        first.ledgerRowIds.includes(r.id)
      );
      hits.push({
        matchId: m.id,
        what: line.typeMeaning ?? line.description,
        amount: line.amount,
        effect: `paired with ${
          chosen?.description ?? "the first candidate"
        } and the other ${m.candidates.length - 1} never shown`,
      });
    }

    if (condition.kind === "match-within-days") {
      /* A window rule only changes anything where the matcher had to reach for
       * the window at all. On this month that is the ambiguous refund, and
       * narrowing or widening it changes nothing: both candidates sit exactly
       * one day either side of the statement, so any window that admits one
       * admits the other. Reporting "no change" here is the honest answer and
       * it is also the fixture's lesson. */
      continue;
    }
  }

  const totalAmount = sumDollars(hits.map((h) => h.amount));

  return {
    hits,
    totalAmount,
    summary: hits.length
      ? `Would have changed ${hits.length} ${
          hits.length === 1 ? "item" : "items"
        } last month, worth ${Math.abs(totalAmount).toFixed(2)}.`
      : "Would have changed nothing last month.",
  };
}

/* ---------- Step 3: the conflict check ---------- */

export interface Conflict {
  /* What it clashes with, named. */
  against: string;
  why: string;
  /* A conflict with a permanent exclusion cannot be approved past. One with
   * another rule is a judgement call. */
  blocking: boolean;
}

export function conflictsFor(condition: Condition): Conflict[] {
  const out: Conflict[] = [];

  if (condition.kind === "auto-pick-ambiguous-under") {
    /* The one conflict worth building this whole screen to show.
     *
     * An ambiguous match is a permanent exclusion from the autonomy ladder, and
     * not because nobody got round to promoting it: by definition the system
     * does not know which candidate is right. A rule that picks one anyway is
     * not automation, it is a coin toss with the audit trail of a decision.
     *
     * On this month it lands on two refunds of 210.00 that differ only by which
     * tenant gets the money. The proof reaches zero either way, so nothing
     * downstream can catch a wrong pick. */
    out.push({
      against: "Ambiguous matches never climb the ladder",
      why: "By definition the system does not know which candidate is right. Choosing one automatically makes a decision nobody can defend, and the balance proof reaches zero whichever way it goes.",
      blocking: true,
    });
    out.push({
      against: "Refunds issued within three days of the bank debit · N. Okafor",
      why: "That rule already governs these lines and hands anything it cannot separate to a person. This one would take those cases back.",
      blocking: false,
    });
  }

  if (
    condition.kind === "auto-book-bank-only-under" &&
    condition.amount > 500
  ) {
    out.push({
      against: "Never auto-approve above 500.00",
      why: "A guardrail in code rather than a rule anybody can edit. A draft above that threshold cannot take effect.",
      blocking: true,
    });
  }

  if (condition.kind === "match-within-days" && condition.days >= 5) {
    out.push({
      against: "Refunds issued within three days · 1849 Westlake · Operating",
      why: "A wider window on the same account admits everything the narrower one does, and more. Two windows over one account means the looser always wins.",
      blocking: false,
    });
  }

  return out;
}

/* ---------- Situations: the trust ladder ---------- */

export interface Situation {
  id: string;
  name: string;
  rung: Rung;
  timesSeen: number;
  agreementRate: number | null;
  excludedBecause?: string;
  /* The sampling rate in the words a person uses: "1 in 10". */
  sampling: string;
  /* Why it last moved. Demotion is automatic, so this is where a pattern gets
   * told what happened to it. */
  lastMove?: string;
}

export const situations: Situation[] = [
  {
    id: "sit-returned-payment",
    name: "Returned payment",
    rung: 3,
    timesSeen: 240,
    agreementRate: 0.97,
    sampling: "1 in 10",
    lastMove: "Promoted to level 3 on 14 July, with 186 observations behind it.",
  },
  {
    id: "sit-transfer",
    name: "Transfer between own accounts",
    rung: 4,
    timesSeen: 1180,
    agreementRate: 0.99,
    sampling: "1 in 5",
  },
  {
    id: "sit-bank-fee",
    name: "Bank fee not booked",
    rung: 2,
    timesSeen: 63,
    agreementRate: 0.88,
    sampling: "every item",
  },
  {
    id: "sit-lockbox",
    name: "Lockbox deposit split across tenants",
    rung: 1,
    timesSeen: 9,
    agreementRate: null,
    sampling: "nothing to sample yet",
  },
  {
    id: "sit-late-invoice",
    name: "Vendor invoice arriving late",
    rung: 2,
    timesSeen: 310,
    agreementRate: 0.71,
    sampling: "every item",
    lastMove:
      "Fell from level 3 on 2 August. Nobody was asked: the override rate crossed 25% and demotion is automatic.",
  },
];

/* Rendered as their own group, at the bottom, and never as situations stuck at
 * level one. Excluded is a different kind of thing from a low score, and naming
 * these three is what makes the rest of the ladder credible. */
export const exclusions: Situation[] = [
  {
    id: "exc-ambiguous",
    name: "Ambiguous matches",
    rung: "excluded",
    timesSeen: 41,
    agreementRate: null,
    sampling: "every item, by a person",
    excludedBecause: "by definition the system does not know",
  },
  {
    id: "exc-deposits",
    name: "Anything on a security deposit account",
    rung: "excluded",
    timesSeen: 0,
    agreementRate: null,
    sampling: "not automated at all",
    excludedBecause: "legally segregated funds",
  },
  {
    id: "exc-final-write",
    name: "The final write",
    rung: "excluded",
    timesSeen: 0,
    agreementRate: null,
    sampling: "every send is authorised",
    excludedBecause: "somebody has to answer who signed this",
  },
];

/* What promoting a situation costs, stated before it happens. The trade is the
 * point: the system does more, so a person looks harder at what it does
 * unwatched. */
export const SAMPLING_AT_RUNG: Record<1 | 2 | 3 | 4, string> = {
  1: "nothing to sample yet",
  2: "every item",
  3: "1 in 10",
  4: "1 in 5",
};
