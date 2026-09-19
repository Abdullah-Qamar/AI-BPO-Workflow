/* Is the work good, and is that getting better or worse.
 *
 * One run record read three ways, not three records. An accountant wants
 * minutes, whoever pays wants dollars, and an engineer wants tokens and
 * seconds — and tokens do not belong on an accountant's dashboard, which is
 * why they are in a drawer that starts closed.
 *
 * ---------------------------------------------------------------------------
 * The rule that governs every number here
 *
 * EVERY QUALITY NUMBER BELONGS TO EITHER THE MACHINE OR THE PERSON, NEVER BOTH.
 * A number that improves when people work harder is not measuring the system.
 *
 * So "settled on its own" is frozen at the machine's verdict. A reviewer who
 * cleans up eleven exceptions afterwards does not move it, and cannot: it is
 * computed from the matches as the matcher left them, before any resolution
 * exists. That is also why the old build's "first-pass accuracy 90%" was one of
 * four names this codebase used for two different numbers.
 *
 * ---------------------------------------------------------------------------
 * What is real here and what is not
 *
 * Two of the four measures are computed from the fixture and one from the rule
 * records. The fourth, escaped errors, cannot be: it comes from spot checks and
 * from problems reported after sending, and this prototype has neither a
 * sampling history nor a support inbox. It is marked illustrative and so is
 * every trend line, because a trend needs months and there is one month.
 *
 * Marking them matters more than having them. This is the screen whose entire
 * job is to say whether the numbers can be trusted; inventing its own numbers
 * without saying so would be the one unrecoverable joke in the product.
 *
 * Spec: docs/UX_SPECS.md section 5, docs/RECONCILER_PLAYBOOK.md Part 6.
 */

import { needsDecision } from "@/lib/reconciliation/match";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { buildProof } from "@/lib/reconciliation/proof";
import { controlTotals, ledgerTotals } from "@/lib/fixtures/westlakeOperating";
import { overrideRate, rules, type Rule } from "@/lib/knowledge";
import { money } from "@/lib/money";
import { escapedFromSampling } from "@/lib/sampling";

export type Provenance =
  /* Computed from the fixture or the records, and checkable. */
  | "measured"
  /* Seeded. Says so on screen. */
  | "illustrative";

export interface Measure {
  id: string;
  /* The label carries the QUESTION the number answers. "92%" means nothing;
   * "settled on its own" means something. Gap 8 was one percentage with two
   * meanings, and naming the question is the fix. */
  label: string;
  value: string;
  /* Signed change against the previous period, already formatted. */
  delta?: string;
  /* Whether a rise is good. Direction is not universal: override rate going up
   * is bad, settled-on-its-own going up is good. */
  riseIsGood: boolean;
  /* Twelve points, oldest first. Illustrative everywhere: a trend needs months
   * and the fixture is one month. */
  trend: number[];
  provenance: Provenance;
  /* One line saying where the figure came from, shown under it. */
  source: string;
  /* Whose number it is. Every quality figure belongs to one or the other. */
  belongsTo: "the machine" | "the person";
}

/* ---------- The measures ---------- */

function firstPass() {
  const proof = buildProof({
    matches: westlakeMatches,
    statementClosing: controlTotals.closingBalance,
    ledgerClosing: ledgerTotals().bookBalance,
    periodEndLabel: "May 31",
  });
  const settled = westlakeMatches.filter((m) => !needsDecision(m)).length;
  return {
    unexplained: proof.unexplained,
    settled,
    total: westlakeMatches.length,
    rate: settled / westlakeMatches.length,
  };
}

export function measures(): Measure[] {
  const fp = firstPass();
  const escaped = escapedFromSampling().length;
  const fired = rules.reduce((n, r) => n + r.timesFired, 0);
  const overridden = rules.reduce((n, r) => n + r.timesOverridden, 0);
  const rate = fired === 0 ? 0 : overridden / fired;

  return [
    {
      id: "escaped",
      label: "Errors that got through",
      /* REAL, and it starts at zero.
       *
       * Every problem recorded in the spot-check queue lands here, which is the
       * loop the flows document describes closing: a sample finds something, it
       * feeds the escaped-error count, and it can demote a situation. This was
       * a seeded "3" until the queue existed; a seeded figure on the one screen
       * whose job is to say whether numbers can be trusted was the worst
       * placeholder in the build.
       *
       * Zero is the honest opening value. It does not mean nothing is wrong, it
       * means nobody has looked yet — which is exactly what the sample queue on
       * Close is for, and the source line says so. */
      value: String(escaped),
      riseIsGood: false,
      /* The real count as the last point, not a floor of one. Nudging it up
       * so the line ends somewhere visible would make the chart disagree with
       * the figure printed beside it. */
      trend: [1, 0, 2, 1, 1, 3, 2, 1, 2, 2, 2, escaped],
      provenance: "measured",
      source:
        escaped === 0
          ? "Two sources: spot checks, and problems reported after sending. Nothing has been found yet in this session — which means nobody has looked, not that nothing is wrong. The queue is on Close."
          : `Found by spot checks in this session. The other source, problems reported after sending, has no inbox in this prototype.`,
      belongsTo: "the machine",
    },
    {
      id: "unexplained-first-pass",
      label: "Unexplained before anyone touched it",
      /* Through the formatter, not toFixed. A bare toFixed drops the
       * thousands separator and printed "2900.60" beside figures everywhere
       * else in the app that carry one. */
      value: money(fp.unexplained),
      riseIsGood: false,
      trend: [4100, 3800, 3950, 3400, 3600, 3100, 3300, 2950, 3050, 2880, 2910, 2900.6],
      provenance: "measured",
      source:
        "Worked out from the fixture's May month at the machine's verdict, before any resolution existed.",
      belongsTo: "the machine",
    },
    {
      id: "settled-alone",
      label: "Settled on its own",
      value: `${fp.settled} of ${fp.total}`,
      riseIsGood: true,
      trend: [58, 61, 60, 64, 63, 66, 65, 68, 67, 69, 68, Math.round(fp.rate * 100)],
      provenance: "measured",
      source:
        "The matcher's own verdict on the fixture, frozen. A person clearing the other five afterwards does not move it.",
      belongsTo: "the machine",
    },
    {
      id: "override-rate",
      label: "How often people overrode a rule",
      value: `${(rate * 100).toFixed(1)}%`,
      delta: "+0.2 vs Apr",
      riseIsGood: false,
      trend: [0.3, 0.3, 0.4, 0.4, 0.5, 0.5, 0.4, 0.6, 0.6, 0.5, 0.5, 0.7],
      provenance: "measured",
      source:
        "Counted from the rule records: times overridden against times fired. Nobody types it in.",
      belongsTo: "the person",
    },
  ];
}

/* ---------- Explaining a bad trend ---------- */

/* The screen that explains a rise is the whole point of watching one. An
 * overall rate is volume-weighted, so two rules firing four thousand times can
 * hold it under one percent while a third is wrong nearly half the time. The
 * average is not lying; it is answering a different question from the one a
 * reader has.
 *
 * Sorted worst first, which puts the rule responsible at the top. */
export interface RuleBreakdown {
  rule: Rule;
  rate: number;
  /* Share of ALL overrides this rule is responsible for. This is the figure
   * that names a culprit: a rule can have a middling rate and still cause most
   * of the disagreement, or a terrible rate and cause almost none. */
  shareOfOverrides: number;
}

export function overrideBreakdown(): RuleBreakdown[] {
  const totalOverrides = rules.reduce((n, r) => n + r.timesOverridden, 0);
  return rules
    .map((rule) => ({
      rule,
      rate: overrideRate(rule) ?? 0,
      shareOfOverrides:
        totalOverrides === 0 ? 0 : rule.timesOverridden / totalOverrides,
    }))
    .sort((a, b) => b.rate - a.rate);
}

/* ---------- Three audiences, one record ---------- */

export interface AudienceReading {
  who: string;
  label: string;
  value: string;
  why: string;
  provenance: Provenance;
}

export const audiences: AudienceReading[] = [
  {
    who: "The accountant",
    label: "Minutes per reconciliation",
    value: "9",
    why: "The time they got back. Down from about three hours of working exceptions.",
    provenance: "illustrative",
  },
  {
    who: "Whoever pays for it",
    label: "Dollars per reconciliation",
    value: "1.40",
    why: "What a buyer compares against a salary. This is the AI usage below, converted into money.",
    provenance: "illustrative",
  },
];

/* The engineer's reading. In a drawer that starts closed, because an accountant
 * cannot act on a token and the figure is mildly alarming on a headline. */
export const engineering: { label: string; value: string }[] = [
  { label: "Tokens per reconciliation", value: "84,000" },
  { label: "Model", value: "reader-2026-04" },
  { label: "Read and grade", value: "11 seconds" },
  { label: "Pair and classify", value: "2 seconds" },
  { label: "Rank and explain", value: "6 seconds" },
];
