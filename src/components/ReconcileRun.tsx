"use client";

/* The live run — a picture of the machine, while the machine is working.
 *
 * The other half of the Reconcile spec. While the work is running you watch the
 * two documents and the lines joining them as rows get paired, with a count
 * going up. Once it finishes, that same area becomes the proof. A picture of a
 * machine is right for work in progress and a proof is right for work that is
 * finished, and neither one is right for the other.
 *
 * ---------------------------------------------------------------------------
 * It replays the real classification, and that is the whole difference
 *
 * This is timed, so it is theatre — the prototype has no parser, no matcher and
 * no model. What stops it being a fake progress bar is WHAT it animates: the
 * lines are the fixture's actual 14 statement rows and 16 ledger rows, and the
 * pairings arrive in the order the matches are written, each one lighting the
 * rows it accounts for and tinting them with its own outcome. Nothing invents a
 * percentage. At the end the tally on screen is the month, and every figure in
 * it survives into the queue and the proof.
 *
 * A bar that fills to 100% over three seconds would have been a quarter of the
 * work and would have told a reader nothing they could check.
 *
 * ---------------------------------------------------------------------------
 * The Reader grades its own homework, visibly
 *
 * Reading is not one step. The Reader extracts rows, then checks them against
 * the totals the statement itself declares in its header, and the run stops if
 * they disagree. That check is the design move that makes model-based document
 * reading acceptable in an accounting product, and it costs nothing because the
 * answer is printed on the input.
 *
 * So it gets its own beat on screen rather than disappearing inside the word
 * "reading". A retry storm hidden in a spinner is the classic
 * agent-observability failure, and the architecture document names it as an
 * open question; this is the answer being yes, you see the grade.
 *
 * Spec: docs/UX_SPECS.md section 2, docs/FLOWS.md F2,
 * docs/AI_ARCHITECTURE.md Part 3 §1.
 */

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/entities/Money";
import { OutcomeChip, outcomeMark } from "@/components/entities/OutcomeChip";
import type { Match, MatchOutcome } from "@/lib/reconciliation/match";
import {
  bankLines,
  controlTotals,
  ledgerRows,
} from "@/lib/fixtures/westlakeOperating";
import { money } from "@/lib/money";

export type RunPhase = "reading" | "grading" | "pairing" | "done";

/* Beats, in milliseconds. Slow enough to follow, short enough that nobody
 * watching a walkthrough reaches for the skip. */
const LINE_MS = 55;
const GRADE_MS = 900;
const MATCH_MS = 190;

/* ---------- The clock ---------- */

/* One index that only ever counts up, and three phases derived from it. A
 * single counter rather than a phase machine with its own timers: two timers
 * over one animation is how a run ends up in a state the screen cannot draw. */
function useRunClock(totalLines: number, totalMatches: number) {
  const [tick, setTick] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const gradeTicks = Math.ceil(GRADE_MS / LINE_MS);
  const readEnd = totalLines;
  const gradeEnd = readEnd + gradeTicks;
  const end = gradeEnd + totalMatches * Math.ceil(MATCH_MS / LINE_MS);

  useEffect(() => {
    if (skipped || tick >= end) return;
    const id = window.setTimeout(() => setTick((t) => t + 1), LINE_MS);
    return () => window.clearTimeout(id);
  }, [tick, end, skipped]);

  if (skipped) {
    return {
      phase: "done" as RunPhase,
      linesRead: totalLines,
      matchesFound: totalMatches,
      skip: () => setSkipped(true),
    };
  }

  const phase: RunPhase =
    tick < readEnd
      ? "reading"
      : tick < gradeEnd
        ? "grading"
        : tick < end
          ? "pairing"
          : "done";

  const matchesFound =
    tick <= gradeEnd
      ? 0
      : Math.min(
          totalMatches,
          Math.floor((tick - gradeEnd) / Math.ceil(MATCH_MS / LINE_MS))
        );

  return {
    phase,
    linesRead: Math.min(tick, totalLines),
    matchesFound,
    skip: () => setSkipped(true),
  };
}

/* ---------- A document column ---------- */

function DocumentColumn({
  heading,
  subheading,
  lines,
  revealed,
  accounted,
}: {
  heading: string;
  subheading: string;
  lines: { id: string; date: string; amount: number; description: string }[];
  revealed: number;
  /* Row id to the outcome that accounted for it. */
  accounted: Map<string, MatchOutcome>;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-list)",
        borderRadius: "var(--radius-sheet)",
        boxShadow: "var(--shadow-depth-1)",
        padding: "var(--space-6)",
        gap: "var(--space-4)",
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="t-label">{heading}</span>
        <span className="t-meta ink-tertiary nums truncate">{subheading}</span>
      </div>

      <div className="flex flex-col" style={{ gap: 1 }}>
        {lines.map((line, i) => {
          const shown = i < revealed;
          const outcome = accounted.get(line.id);
          return (
            <div
              key={line.id}
              className="flex flex-row items-center"
              style={{
                minHeight: "var(--row-sm)",
                padding: "0 var(--space-4)",
                gap: "var(--space-4)",
                borderRadius: "var(--radius-row)",
                /* A row that has been accounted for lifts onto white and takes
                 * its outcome's mark. Until then it is present but quiet — the
                 * document existed before the machine read it. */
                background: outcome ? "#FFFFFF" : "transparent",
                opacity: shown ? 1 : 0,
                transition: "opacity 160ms ease, background 220ms ease",
              }}
            >
              <span
                aria-hidden
                className="shrink-0"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: outcome
                    ? outcomeMark(outcome)
                    : "var(--line-soft)",
                  transition: "background 220ms ease",
                }}
              />
              <span className="t-meta ink-tertiary nums shrink-0" style={{ width: 40 }}>
                {new Date(`${line.date}T00:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
              <span className="t-meta ink-secondary flex-1 min-w-0 truncate">
                {line.description}
              </span>
              <Money
                amount={line.amount}
                form="signed"
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  flexShrink: 0,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- The run ---------- */

export function ReconcileRun({
  matches,
  onFinished,
  onStop,
}: {
  matches: Match[];
  onFinished: () => void;
  /* Stop it early.
   *
   * The run starts on its own, so this is the intervention that replaces the
   * old Start button. The architecture document asks for planning visibility —
   * show the plan before the work so the operator can stop it early — and a
   * gate is only one way to answer that, and the more expensive one: it spends
   * a click on every run to buy the ability to intervene in the rare one. A
   * visible Stop buys the same ability and charges nothing for it. */
  onStop: () => void;
}) {
  const bank = useMemo(
    () =>
      bankLines.map((l) => ({
        id: l.id,
        date: l.postDate,
        amount: l.amount,
        description: l.description,
      })),
    []
  );
  const ledger = useMemo(
    () =>
      ledgerRows.map((r) => ({
        id: r.id,
        date: r.postDate,
        amount: r.amount,
        description: `${r.payee} · ${r.description}`,
      })),
    []
  );

  /* The clock counts ROWS PER COLUMN, because both documents are read at once
   * and the columns are different lengths — 14 statement lines against 16
   * ledger rows. The figure on screen is the two columns added up, which is
   * what a reader is actually looking at: an earlier version printed the raw
   * tick and said "14 of 30 lines read" while 28 rows were visible. */
  const perColumn = Math.max(bank.length, ledger.length);
  const { phase, linesRead, matchesFound, skip } = useRunClock(
    perColumn,
    matches.length
  );

  const totalLines = bank.length + ledger.length;
  const revealedTotal =
    Math.min(linesRead, bank.length) + Math.min(linesRead, ledger.length);

  /* Which rows the matches found so far have accounted for, and under which
   * outcome. Derived from the match list, so the colours on the documents and
   * the tally beneath them cannot disagree. */
  const accounted = useMemo(() => {
    const map = new Map<string, MatchOutcome>();
    for (const m of matches.slice(0, matchesFound)) {
      for (const l of m.bankLines) map.set(l.id, m.outcome);
      for (const r of m.ledgerRows) map.set(r.id, m.outcome);
    }
    return map;
  }, [matches, matchesFound]);

  const tally = useMemo(() => {
    const counts = new Map<MatchOutcome, number>();
    for (const m of matches.slice(0, matchesFound)) {
      counts.set(m.outcome, (counts.get(m.outcome) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [matches, matchesFound]);

  useEffect(() => {
    if (phase === "done") onFinished();
  }, [phase, onFinished]);

  const headline =
    phase === "reading"
      ? "Reading the two documents"
      : phase === "grading"
        ? "Checking the extracted rows against the statement's own totals"
        : "Pairing by rule, then naming what did not pair";

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-7)",
        gap: "var(--space-6)",
      }}
    >
      {/* ---------- What is happening, and the count ---------- */}
      <div
        className="flex flex-row items-end justify-between flex-wrap"
        style={{ gap: "var(--space-6)" }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="t-label">Running</span>
          <span className="t-body ink-primary">{headline}</span>
        </div>
        <div
          className="flex flex-row items-baseline"
          style={{ gap: "var(--space-5)" }}
        >
          {/* The count going up. It is the number of matches, not a percentage:
            * a percentage of an unknown total is a guess wearing a decimal
            * point. */}
          <span
            className="nums-lead ink-primary"
            style={{
              fontSize: "var(--type-metric)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {phase === "reading" || phase === "grading"
              ? revealedTotal
              : matchesFound}
          </span>
          <span className="t-body ink-secondary">
            {phase === "reading" || phase === "grading"
              ? `of ${totalLines} lines read`
              : `of ${matches.length} accounted for`}
          </span>
        </div>
      </div>

      {/* ---------- The Reader's grade, stated rather than hidden ---------- */}
      {phase !== "reading" && (
        <div
          className="flex flex-row items-start"
          style={{
            background: "var(--surface-list)",
            borderRadius: "var(--radius-sheet)",
            padding: "var(--space-5) var(--space-6)",
            gap: "var(--space-4)",
          }}
        >
          <Check
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{
              color: "var(--ink-secondary)",
              flexShrink: 0,
              marginTop: 2,
            }}
            aria-hidden
          />
          <span className="t-prose ink-secondary">
            The statement declares{" "}
            <span className="nums">{money(controlTotals.creditTotal)}</span> in{" "}
            {controlTotals.creditCount} credits and{" "}
            <span className="nums">{money(controlTotals.debitTotal)}</span> in{" "}
            {controlTotals.debitCount} debits, closing at{" "}
            <span className="nums">{money(controlTotals.closingBalance)}</span>.
            The extracted rows reproduce all five. Had they not, the run would
            have stopped here rather than reconcile against half a statement.
          </span>
        </div>
      )}

      {/* ---------- The two documents ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "start",
        }}
      >
        <DocumentColumn
          heading="Statement"
          subheading="bai2-westlake-operating-2026-05.bai"
          lines={bank}
          revealed={phase === "reading" ? linesRead : bank.length}
          accounted={accounted}
        />
        <DocumentColumn
          heading="Ledger"
          subheading="yardi-gl-westlake-operating-2026-05.csv"
          lines={ledger}
          revealed={phase === "reading" ? linesRead : ledger.length}
          accounted={accounted}
        />
      </div>

      {/* ---------- The tally, growing ---------- */}
      <div
        className="flex flex-row items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)" }}
      >
        <div
          className="flex flex-row flex-wrap items-center"
          style={{ gap: "var(--space-4)", minHeight: "var(--control-sm)" }}
        >
          {tally.map(([outcome, n]) => (
            <span
              key={outcome}
              className="flex flex-row items-center"
              style={{ gap: "var(--space-3)" }}
            >
              <OutcomeChip outcome={outcome} />
              <span className="t-meta ink-secondary nums">{n}</span>
            </span>
          ))}
          {!tally.length && (
            <span className="t-meta ink-tertiary">
              Nothing classified yet.
            </span>
          )}
        </div>

        {phase !== "done" && (
          <div className="flex flex-row items-center" style={{ gap: "var(--space-4)" }}>
            {/* Stop is the quieter of the two on purpose. Skipping is what a
              * person watching a demo wants; stopping is what somebody who has
              * spotted the wrong file wants, and it is the rarer act. Neither
              * writes anything — nothing this run does reaches the ledger until
              * a signature, which is why stopping is cheap and why the gate
              * that used to precede it was not buying safety. */}
            <Button variant="ghost" size="sm" onClick={onStop}>
              Stop
            </Button>
            <Button variant="secondary" size="sm" onClick={skip}>
              Skip to the end
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
