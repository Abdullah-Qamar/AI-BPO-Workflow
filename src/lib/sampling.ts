/* Spot checks — looking at work nobody flagged, on purpose.
 *
 * The flow with no screen, and the one the whole autonomy argument rests on.
 * Without it the escaped-error count has no source, and a reviewer who only
 * ever sees exceptions slowly forgets what normal looks like.
 *
 * ---------------------------------------------------------------------------
 * The trap this exists to defeat
 *
 * THE PATTERN YOU AUTOMATE IS THE PATTERN THAT STOPS BEING WATCHED. Once a
 * situation reaches the top rung nobody reviews it, so a failure inside it is
 * structurally invisible — and two wrong matches of equal amounts still net to
 * zero, so the balance proof reaches zero while the month is wrong. Nothing
 * downstream can catch that. Only somebody looking can.
 *
 * Which is why sampling RISES as autonomy rises rather than falling, and why
 * this queue is filled from the work the machine settled by itself rather than
 * from anything it flagged.
 *
 * ---------------------------------------------------------------------------
 * A model chooses what to look at. A person does the looking.
 *
 * A machine checking its own work finds nothing it did not already believe, so
 * the verdict is always a person's. What a model can usefully do is aim the
 * attention: toward situations that were recently promoted, toward large
 * amounts, toward accounts that behave unlike themselves.
 *
 * And toward nothing at all. One in four of these is drawn at random, and that
 * stratum is not decoration. A sample composed entirely of what the system
 * already suspects inherits the system's blind spots — it can only confirm or
 * deny hypotheses somebody already had. The random draw is the only part that
 * can turn up something nobody was looking for, which is the entire job.
 *
 * Spec: docs/FLOWS.md F8, docs/AI_ARCHITECTURE.md Part 6,
 * docs/TAXONOMY_AND_IA.md Part 5.
 */

import type { Match } from "@/lib/reconciliation/match";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { situations, type Situation } from "@/lib/knowledge";

/* ---------- What gets sampled ---------- */

export type Stratum =
  /* The situation was promoted recently, so there is least evidence that it
   * deserves the rung it is on. */
  | "recently-promoted"
  /* Biggest money. Being wrong costs most here. */
  | "large-amount"
  /* The account is behaving unlike itself. */
  | "unusual-account"
  /* Drawn at random, and the only stratum that can find what nobody suspected. */
  | "random";

export const STRATUM_WORDS: Record<Stratum, string> = {
  "recently-promoted": "recently promoted",
  "large-amount": "large amount",
  "unusual-account": "unusual for this account",
  random: "random draw",
};

export interface SampleItem {
  id: string;
  match: Match;
  accountLabel: string;
  period: string;
  stratum: Stratum;
  /* Why this one, in a sentence. A queue that does not say why it picked
   * something teaches a reviewer to work it mechanically. */
  chosenBecause: string;
  /* The situation this item's classification belongs to, where it has one. A
   * problem found here is what can demote it. */
  situationId?: string;
}

/* The pool is work the machine settled WITHOUT a person: matched pairings and
 * timing classifications. Anything that went to the queue has already been
 * looked at, and re-checking it would be sampling the reviewer rather than the
 * machine. */
function settledByMachine(): Match[] {
  return westlakeMatches.filter(
    (m) => m.outcome === "matched" || m.outcome === "timing"
  );
}

const ACCOUNT = "1849 Westlake · Operating";
const PERIOD = "May 2026";

/* When the queue was filled: the moment the run handed over.
 *
 * DOES IT INTERRUPT, OR WAIT? It waits — and it ages in the open, which is the
 * answer to the objection that a queue you can always put off is a queue that
 * never happens.
 *
 * A hard interrupt is the wrong instrument here. Blocking somebody from closing
 * a month until they have sampled would make sampling the thing standing
 * between them and their deadline, and the first workaround anybody finds is to
 * click through it. Worse, it would put a sampling prompt in front of a person
 * mid-decision on a real exception, which is where their attention is worth
 * most.
 *
 * So it waits, and the Close screen says how long. An unchecked sample that has
 * been sitting eleven days is visible as eleven days, next to a count that
 * grows as the system does more. That is the pressure that works on a
 * professional: not a modal, but a number that is getting worse and has their
 * name on it. */
const QUEUED_SINCE = "2026-06-02";

export function queuedSince(): string {
  return QUEUED_SINCE;
}

export function sampleQueue(): SampleItem[] {
  const pool = settledByMachine();
  const byId = (id: string) => pool.find((m) => m.id === id);

  const picks: (SampleItem | null)[] = [
    /* The one the whole idea is about. This pairing was made under a situation
     * running at the top rung, which means nobody reviewed it and nobody was
     * ever going to. Sampling it is not suspicion, it is the price of having
     * automated it. */
    (() => {
      const m = byId("m-transfer-0526");
      return m
        ? {
            id: "s-transfer",
            match: m,
            accountLabel: ACCOUNT,
            period: PERIOD,
            stratum: "recently-promoted" as const,
            chosenBecause:
              "Transfers between own accounts run at level 4, so no person saw this one. That is exactly why it is here: what gets automated is what stops being watched.",
            situationId: "sit-transfer",
          }
        : null;
    })(),

    (() => {
      const m = byId("m-rent-batch-0504");
      return m
        ? {
            id: "s-rent-batch",
            match: m,
            accountLabel: ACCOUNT,
            period: PERIOD,
            stratum: "large-amount" as const,
            chosenBecause:
              "The largest pairing in the period, and a one-to-many: one deposit split across three tenants. Being wrong here misallocates rent for three people while the totals still agree.",
          }
        : null;
    })(),

    (() => {
      const m = byId("m-cheque-1042-outstanding");
      return m
        ? {
            id: "s-cheque-1042",
            match: m,
            accountLabel: ACCOUNT,
            period: PERIOD,
            stratum: "unusual-account" as const,
            chosenBecause:
              "Classified as expected to clear. Cheques on this account usually present within a week and this one has not, so the classification is worth a second look before it carries forward again.",
          }
        : null;
    })(),

    (() => {
      const m = byId("m-cheque-1045");
      return m
        ? {
            id: "s-cheque-1045",
            match: m,
            accountLabel: ACCOUNT,
            period: PERIOD,
            stratum: "random" as const,
            chosenBecause:
              "Drawn at random, and that is the point of it. A sample made only of what the system already suspects can confirm or deny somebody's hypothesis and nothing else. This is the part that can find what nobody was looking for.",
          }
        : null;
    })(),
  ];

  return picks.filter((p): p is SampleItem => p !== null);
}

/* ---------- What a check produces ---------- */

export type Verdict = "confirmed" | "problem";

export interface Finding {
  itemId: string;
  verdict: Verdict;
  /* Required on a problem. "Found an error" without saying what is not a
   * finding, it is a feeling, and it cannot be counted or learned from. */
  note: string;
  situationId?: string;
  by: string;
  at: string;
}

/* ---------- The store ----------
 *
 * Module-level and observable, because a finding has to REACH somewhere. The
 * flow's whole value is that a spot check feeds the escaped-error count and can
 * demote a situation; a screen that announced what it would have done would be
 * a picture of the loop rather than the loop.
 *
 * Deliberately not persisted. This is a prototype and a reload starting clean
 * is the honest behaviour — pretending to a history it does not have is the
 * failure this product spends most of its design avoiding.
 */

let findings: Finding[] = [];
const listeners = new Set<() => void>();

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getFindings(): Finding[] {
  return findings;
}

export function record(f: Finding): void {
  findings = [...findings, f];
  listeners.forEach((cb) => cb());
}

export function clearFindings(): void {
  findings = [];
  listeners.forEach((cb) => cb());
}

/* Problems found by sampling. One of the two sources of the escaped-error
 * count; the other is a problem reported after sending, which this prototype
 * has no inbox for. */
export function escapedFromSampling(): Finding[] {
  return findings.filter((f) => f.verdict === "problem");
}

/* ---------- What a problem does to a situation ---------- */

/* Demotion is automatic. Nobody is asked, and the situation is told why.
 *
 * The threshold is on the override rate — how often a person disagreed — and a
 * spot check that finds a problem IS a disagreement. So a finding moves the
 * rate, and whether it crosses is arithmetic rather than judgement. */
export const DEMOTION_THRESHOLD = 0.05;

export interface DemotionCheck {
  situation: Situation;
  /* Override rate before this finding and after it. */
  before: number;
  after: number;
  crosses: boolean;
  /* Written for the person who just found the problem. */
  sentence: string;
}

export function demotionCheck(situationId: string): DemotionCheck | null {
  const situation = situations.find((s) => s.id === situationId);
  if (!situation || situation.rung === "excluded") return null;
  if (situation.agreementRate === null) return null;

  const seen = situation.timesSeen;
  const disagreed = Math.round(seen * (1 - situation.agreementRate));

  const before = disagreed / seen;
  /* One more observation and one more disagreement. */
  const after = (disagreed + 1) / (seen + 1);
  const crosses = after >= DEMOTION_THRESHOLD && before < DEMOTION_THRESHOLD;

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return {
    situation,
    before,
    after,
    crosses,
    sentence: crosses
      ? `This takes ${situation.name} from ${pct(before)} overridden to ${pct(
          after
        )}, across the ${DEMOTION_THRESHOLD * 100}% line. It drops to level ${
          (situation.rung as number) - 1
        } automatically. Nobody is asked.`
      : `This takes ${situation.name} from ${pct(before)} overridden to ${pct(
          after
        )}. The line is ${
          DEMOTION_THRESHOLD * 100
        }%, so it stays at level ${situation.rung}. One finding against ${seen} observations is not evidence of drift.`,
  };
}
