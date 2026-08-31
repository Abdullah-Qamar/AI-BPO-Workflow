"use client";

/* SummaryBand — the run's outcome, at the top of the workspace.
 *
 * Placement is the argument: this is the answer, so it sits above the activity
 * that produced it and the hub that did the work. It only exists once there is
 * an outcome to state — before that the workspace leads with activity.
 *
 * On how much to show: the ops lead is deciding one thing, whether they can
 * close the cycle. That needs three numbers and no more.
 *
 *   reconciled   the denominator — did it look at everything?
 *   need review  the work still owed
 *   net          whether the books actually tie. A reconciliation that leaves a
 *                non-zero difference is not finished regardless of match counts,
 *                so this is the one number that can veto the others.
 *
 * "Settled on its own" was a fourth. It measured the AGENT — what share it got
 * through without a person — which is a question about the system's performance,
 * not about whether this cycle can close. It has a page of its own for that.
 * Removed here and from the review canvas on 2026-08-27.
 *
 * Deliberately excluded: per-bank splits (already on the rows and in activity),
 * durations (in the agent pills), confidence spread (belongs to the record
 * review, where a specific decision can be interrogated). */

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/session/SessionProvider";
import { AMBER, SUCCESS } from "./DocRow";
import {
  totalApproved,
  totalExceptions,
} from "@/lib/session/reducer";
import type { HubPhase } from "@/lib/v2/hub";
import type { SessionState } from "@/lib/session/types";

/* "-$4,991.25" / "$0.00". A true minus, so the numeral face renders it. */
function formatSigned(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "−" : ""}$${abs}`;
}

export function SummaryBand({
  phase,
  state,
  onViewRecords,
}: {
  phase: HubPhase;
  state: SessionState;
  onViewRecords: () => void;
}) {
  const { records } = useSession();
  if (phase !== "summary" && phase !== "posting" && phase !== "complete") {
    return null;
  }

  /* Approved/exceptions are LIVE — reviewer moves in the drawer burn the
   * amber number down in real time. Autonomy is the agent's own figure,
   * frozen at reconcile: it must not improve because a human approved the
   * leftovers, so it reads from the agent-original counts. */
  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const total = approved + exceptions;

  /* The signed sum of what is still unmatched — the one figure that can veto
   * the others, since a reconciliation leaving a non-zero difference is not
   * finished however good its match counts look. Read off the same record list
   * the review drawer renders, so the two cannot disagree. */
  const netDifference = records
    .filter((r) => (state.recordStatusOverrides[r.id] ?? r.status) === "flagged")
    .reduce((n, r) => n + r.amount, 0);

  return (
    <div
      className="flex flex-row items-center summary-band"
      style={{
        width: "100%",
        maxWidth: 880,
        margin: "0 auto",
        padding: "8px 16px",
        gap: 30,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 14,
      }}
    >
      <Figure label="Reconciled" value={String(total)} />
      <Figure
        label="Open"
        value={String(exceptions)}
        tone={exceptions > 0 ? AMBER : undefined}
      />
      {/* Computed, not asserted. It was the literal "$0.00" with a comment
        * calling zero "the finding" — on a run with open exceptions that is a
        * claim the data does not support. The signed sum of what is still
        * unmatched is the number that decides whether the books tie. */}
      <Figure label="Net difference" value={formatSigned(netDifference)} />

      <span className="flex-1" />

      {phase === "summary" && exceptions > 0 && (
        <Button
          variant="primary"
          size="md"
          onClick={onViewRecords}
          rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
        >
          Review {exceptions}
        </Button>
      )}
      {phase === "summary" && exceptions === 0 && (
        <Button variant="secondary" size="md" onClick={onViewRecords}>
          View records
        </Button>
      )}
      {/* Once posted, the band's job flips from prompting work to stating
        * that the cycle is closed. Quiet on purpose — the outcome figures to
        * the left are the news; this just says they made it into Yardi. */}
      {phase === "complete" && (
        <span
          className="flex flex-row items-center"
          style={{ gap: 6, fontSize: "var(--type-meta)", lineHeight: "var(--leading-prose)", color: "var(--ink-secondary)" }}
        >
          <Check size={14} strokeWidth={1.75} color={SUCCESS} aria-hidden />
          Posted to Yardi
          {exceptions > 0 && (
            <span style={{ color: "var(--ink-tertiary)" }}>
              · {exceptions} flagged for follow-up
            </span>
          )}
        </span>
      )}

      <style jsx>{`
        .summary-band {
          animation: summary-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes summary-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .summary-band {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}) {
  return (
    <span className="flex flex-col shrink-0" style={{ gap: 2 }}>
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
        }}
      >
        {label}
      </span>
      <span className="flex flex-row items-baseline" style={{ gap: 6 }}>
        <span
          className="nums"
          style={{
            fontSize: "var(--type-heading)",
            lineHeight: "var(--leading-tight)",
            color: tone ?? "var(--ink-primary)",
          }}
        >
          {value}
        </span>
        {note && (
          <span
            className="nums"
            style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-ui)", color: "var(--ink-tertiary)" }}
          >
            {note}
          </span>
        )}
      </span>
    </span>
  );
}
