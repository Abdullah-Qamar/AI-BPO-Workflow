"use client";

/* Reconcile — get one bank account to zero for one month, then sign it.
 *
 * Most of the product is this screen. It replaces the three-agent canvas, and
 * the change is not cosmetic: that canvas showed Intake, Reconciliation and
 * Summary, which are the names of parts of the machine. A person navigates by
 * the object they are working on, never by the component working on it.
 *
 * ---------------------------------------------------------------------------
 * Four lanes over five jobs
 *
 * Reading · Pairing · Checking · Sending. The five jobs behind them are the
 * Reader, the Matcher, the pattern proposer, the candidate ranker and the
 * Poster — the proposer and the ranker both sit in Checking, because the split
 * between them is a design fact and not a user-facing one.
 *
 * Each lane says what it actually TOUCHED, not that it was busy. "read the
 * statement, 14 lines, totals matched" is a claim a person can check against
 * the file. A spinner is not.
 *
 * ---------------------------------------------------------------------------
 * The middle changes when the work finishes
 *
 * While there is work owed, the middle is the queue and the item view: the
 * machine's leftovers and the decisions they need. When nothing is owed, that
 * same area becomes the proof. A picture of a machine is right for work in
 * progress; a proof is right for work that is finished, and showing a proof
 * while five items are open would be showing a conclusion that has not been
 * reached.
 *
 * ---------------------------------------------------------------------------
 * One number, and it moves while you watch
 *
 * The unexplained figure is worked out fresh from the matches on every render
 * and never stored. Each of the four actions changes one input to that sum, so
 * the figure moves on the click that caused it. That is the whole argument for
 * the four actions over a pair of buckets, and it only lands if the figure is
 * on screen while the decision is being taken — so the bar at the bottom
 * carries it while an item is open, and hands the job to the proof once the
 * proof appears. Exactly one figure at --type-metric at any moment.
 *
 * Spec: docs/UX_SPECS.md section 2, docs/FLOWS.md F3 to F5,
 * docs/BUILD_PROMPTS.md S5 to S7.
 */

import { useMemo, useState } from "react";
import { Check, ChevronRight, Circle, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmPopoverButton } from "@/components/ui/ConfirmPopoverButton";
import { MatchCard } from "@/components/entities/MatchCard";
import { ProofLadder } from "@/components/entities/ProofLadder";
import { OutcomeChip } from "@/components/entities/OutcomeChip";
import { Money } from "@/components/entities/Money";
import { stateWords } from "@/components/entities/AccountRow";
import {
  difference,
  needsDecision,
  type Match,
  type ResolutionKind,
} from "@/lib/reconciliation/match";
import { buildProof } from "@/lib/reconciliation/proof";
import {
  actionAvailable,
  applyResolution,
  undoResolution,
} from "@/lib/reconciliation/resolve";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { controlTotals, ledgerTotals } from "@/lib/fixtures/westlakeOperating";
import { canProve, canSign, type ReconciliationState } from "@/lib/session/types";
import { toCents } from "@/lib/money";

const PERIOD_END = "2026-05-31";
const REVIEWER = "N. Okafor";

/* The sentence each action writes into the record. A resolution always carries
 * a reason, and a screen that made the reviewer type one for a routine booking
 * would be a screen they learn to fill with a full stop. These are defaults the
 * reviewer would edit; `set-aside` deliberately has none, because "cannot be
 * settled now" is meaningless without saying why. */
const DEFAULT_REASON: Record<ResolutionKind, string> = {
  "accept-as-timing": "Expected to clear on its own. Carrying it forward.",
  "correct-the-match": "Selected the candidate that belongs to this line.",
  "add-correcting-entry": "The books are missing this. Booking it to the ledger.",
  "set-aside": "Cannot be settled in this period.",
};

/* ---------- Lanes ---------- */

type LaneState = "done" | "active" | "waiting";

function Lane({
  name,
  state,
  touched,
}: {
  name: string;
  state: LaneState;
  touched: string;
}) {
  return (
    <div
      className="flex flex-row items-start flex-1 min-w-0"
      style={{ gap: "var(--space-4)", padding: "var(--space-5)" }}
    >
      <span className="shrink-0" style={{ marginTop: 1, lineHeight: 0 }}>
        {state === "done" ? (
          <Check
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{ color: "var(--ink-secondary)" }}
            aria-hidden
          />
        ) : state === "active" ? (
          <Loader
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{ color: "var(--ink-primary)" }}
            aria-hidden
          />
        ) : (
          <Circle
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{ color: "var(--line)" }}
            aria-hidden
          />
        )}
      </span>
      <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
        <span
          className="t-body"
          style={{
            fontWeight:
              state === "active"
                ? "var(--weight-medium)"
                : "var(--weight-regular)",
            color:
              state === "waiting"
                ? "var(--ink-tertiary)"
                : "var(--ink-primary)",
          }}
        >
          {name}
        </span>
        {/* What the lane touched, not that it was busy. */}
        <span className="t-meta ink-tertiary">{touched}</span>
      </div>
    </div>
  );
}

/* ---------- Queue row ---------- */

function QueueRow({
  match,
  selected,
  onOpen,
}: {
  match: Match;
  selected: boolean;
  onOpen: () => void;
}) {
  const settled = match.resolution !== null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-row items-center w-full text-left"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
        background: selected ? "#FFFFFF" : "transparent",
        border: `1px solid ${selected ? "var(--line-row-hover)" : "transparent"}`,
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        cursor: "pointer",
        fontFamily: "inherit",
        opacity: settled ? 0.6 : 1,
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: "var(--space-3)" }}>
        <span className="t-body ink-primary truncate">
          {match.pattern?.confirmed
            ? match.pattern.label
            : match.bankLines[0]?.typeMeaning ??
              match.ledgerRows[0]?.description ??
              "Difference"}
        </span>
        <div
          className="flex flex-row items-center"
          style={{ gap: "var(--space-4)" }}
        >
          <OutcomeChip outcome={match.outcome} />
          {settled && (
            <span className="t-meta ink-tertiary">settled</span>
          )}
        </div>
      </div>
      <Money
        amount={Math.abs(difference(match))}
        form="plain"
        emphasis="medium"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          flexShrink: 0,
        }}
      />
      <ChevronRight
        size="var(--icon-sm)"
        strokeWidth="var(--stroke-sm)"
        style={{ color: "var(--ink-tertiary)", flexShrink: 0 }}
        aria-hidden
      />
    </button>
  );
}

/* ---------- The screen ---------- */

export function ReconcileCanvas() {
  const [matches, setMatches] = useState<Match[]>(westlakeMatches);
  const [openId, setOpenId] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState<string | null>(null);

  const proof = useMemo(
    () =>
      buildProof({
        matches,
        statementClosing: controlTotals.closingBalance,
        ledgerClosing: ledgerTotals().bookBalance,
        periodEndLabel: "May 31",
      }),
    [matches]
  );

  /* The queue, biggest money first, because that is the order in which a
   * person's attention is worth most. Settled items stay in the list rather
   * than vanishing: a row that disappears the instant it is decided gives a
   * reviewer nowhere to undo and no way to see what they have done. */
  const queue = useMemo(
    () =>
      matches
        .filter((m) => needsDecision(m) || m.resolution !== null)
        .sort((a, b) => {
          const settledA = a.resolution ? 1 : 0;
          const settledB = b.resolution ? 1 : 0;
          if (settledA !== settledB) return settledA - settledB;
          return Math.abs(toCents(difference(b))) - Math.abs(toCents(difference(a)));
        }),
    [matches]
  );

  const owed = matches.filter(needsDecision).length;
  const open = openId ? matches.find((m) => m.id === openId) ?? null : null;

  /* The reconciliation's state, derived rather than stored. Nothing here is a
   * field somebody can set to `proven` while money is unexplained. */
  const state: ReconciliationState = signedBy
    ? "signed"
    : owed === 0 && proof.tied
      ? "proven"
      : "review";

  const reconciliation = {
    id: "recon-westlake-operating-2026-05",
    accountId: "acct-westlake-chase-operating",
    periodId: "period-2026-05",
    state,
    unexplained: proof.unexplained,
    itemsWaiting: owed,
    oldestOpenItemDays: null,
    waitingSince: null,
    runs: [],
    signedBy,
    signedAt: null,
  };

  const proveGuard = canProve({ ...reconciliation, state: "review" });
  const signGuard = canSign({ ...reconciliation, state });

  const act = (kind: ResolutionKind, candidateId: string | null) => {
    if (!open) return;
    setMatches(
      applyResolution(matches, open.id, kind, {
        reason: DEFAULT_REASON[kind],
        by: REVIEWER,
        at: new Date().toISOString(),
        /* The entry the books need is exactly the difference the match leaves:
         * a fee of -185.00 on the statement and nothing in the ledger is a
         * difference of -185.00, and booking that figure is what closes it. */
        amount: kind === "add-correcting-entry" ? difference(open) : undefined,
        selectedCandidateId: candidateId ?? undefined,
        periodEnd: PERIOD_END,
      })
    );
  };

  /* ---------- Lane copy, derived from the month ---------- */

  const paired = matches.filter((m) => m.outcome === "matched").length;
  const oneSided = matches.filter(
    (m) => m.outcome === "timing" || m.outcome === "bank-only"
  ).length;
  const confirmed = matches.filter((m) => m.pattern?.confirmed).length;
  const proposed = matches.filter(
    (m) => m.pattern && !m.pattern.confirmed
  ).length;
  const ambiguous = matches.filter((m) => m.candidates.length > 1).length;
  const entries = matches.filter(
    (m) => m.resolution?.kind === "add-correcting-entry"
  ).length;
  /* A cleared mark is a tick against a LEDGER transaction saying it reached the
   * bank this period. So it counts ledger rows, not both sides — an earlier
   * version summed bank lines too and reported 18, which double-counts every
   * pairing and would have the confirm overstating what it is about to write.
   *
   * Two kinds of match earn one. A `matched` pairing, obviously. And a resolved
   * returned payment, because its original deposit DID land even though the
   * event as a whole nets to zero. A bank-only item earns none: what it
   * produces is a new ledger entry, which is the correcting entry counted
   * beside this, and a row that did not exist cannot be ticked as cleared.
   *
   * On the fixture this comes to 11, which is the figure the flows document
   * uses in its own worked confirm. */
  const clearedMarks = matches.reduce((n, m) => {
    if (m.outcome === "matched") return n + m.ledgerRows.length;
    if (m.resolution?.kind === "add-correcting-entry") {
      return n + m.ledgerRows.length;
    }
    return n;
  }, 0);

  const lanes: { name: string; state: LaneState; touched: string }[] = [
    {
      name: "Reading",
      state: "done",
      touched:
        "bai2-westlake-operating-2026-05.bai · 14 lines · totals matched the header",
    },
    {
      name: "Pairing",
      state: "done",
      touched: `${paired} paired by rule · ${oneSided} one-sided · ${owed} left for you`,
    },
    {
      name: "Checking",
      state: owed > 0 ? "active" : "done",
      touched: `${confirmed} pattern confirmed · ${proposed} proposed · ${ambiguous} ranked, not decided`,
    },
    {
      name: "Sending",
      state: state === "signed" ? "active" : "waiting",
      touched:
        state === "signed"
          ? "sending"
          : `${entries} correcting ${
              entries === 1 ? "entry" : "entries"
            } and ${clearedMarks} cleared marks when signed`,
    },
  ];

  const showProof = owed === 0;

  return (
    <main
      className="canvas-scope flex-1 min-w-0"
      style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
    >
      <div
        className="canvas-pad"
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
      >
        <div
          className="flex flex-col"
          style={{ gap: "var(--space-7)", paddingBottom: "var(--space-10)" }}
        >
          {/* ---------- Header: the account, the month, the state as words ---- */}
          <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            <h1 className="canvas-title ink-primary">
              1849 Westlake · Operating
            </h1>
            <span className="t-body ink-secondary nums">
              ••••3421 · GL 1010 Operating Cash · May 2026 ·{" "}
              <span style={{ fontWeight: "var(--weight-medium)" }}>
                {stateWords(state)}
              </span>
            </span>
          </div>

          {/* ---------- The four lanes ---------- */}
          <div
            className="flex flex-row flex-wrap"
            style={{
              background: "var(--surface-card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {lanes.map((l) => (
              <Lane key={l.name} {...l} />
            ))}
          </div>

          {/* ---------- The middle ---------- */}
          {showProof ? (
            /* The work is done, so the picture changes from the machine's
             * leftovers to the proof. */
            <ProofLadder
              matches={matches}
              statementClosing={controlTotals.closingBalance}
              ledgerClosing={ledgerTotals().bookBalance}
              periodEndLabel="May 31"
              accountLabel="Chase Operating"
              accountNumber="••••3421"
              cycle="May 2026"
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(280px, 340px) minmax(320px, 1fr)",
                gap: "var(--space-5)",
                alignItems: "start",
              }}
            >
              {/* The queue */}
              <div
                className="flex flex-col"
                style={{
                  background: "var(--surface-card)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "var(--shadow-card)",
                  padding: "var(--space-5)",
                  gap: "var(--space-2)",
                }}
              >
                <div
                  className="flex flex-col"
                  style={{ padding: "var(--space-3) var(--space-5)", gap: 2 }}
                >
                  <span className="t-label">
                    Needs you · {owed} {owed === 1 ? "item" : "items"}
                  </span>
                  <span className="t-meta ink-tertiary">Most money first.</span>
                </div>
                {queue.map((m) => (
                  <QueueRow
                    key={m.id}
                    match={m}
                    selected={openId === m.id}
                    onOpen={() => setOpenId(m.id)}
                  />
                ))}
              </div>

              {/* The item view, or an invitation to open one */}
              {open ? (
                <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
                  <MatchCard
                    key={open.id}
                    match={open}
                    modelSentence={
                      open.candidates.length > 1
                        ? "Both rows match the amount to the cent and sit one day either side of the statement. The memo on the bank line reads INV 4912, which is Tenant 115's invoice, so that row is the likelier of the two. Nothing here can be checked by a rule."
                        : undefined
                    }
                    onAct={act}
                    available={(kind, candidateId) =>
                      actionAvailable(open, kind, candidateId)
                    }
                  />
                  {open.resolution && (
                    <div
                      className="flex flex-row items-center justify-between"
                      style={{
                        background: "var(--surface-card)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: "var(--shadow-card)",
                        padding: "var(--space-5) var(--space-6)",
                        gap: "var(--space-5)",
                      }}
                    >
                      <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
                        <span className="t-body ink-primary">
                          {open.resolution.reason}
                        </span>
                        <span className="t-meta ink-tertiary">
                          {open.resolution.by} · just now
                        </span>
                      </div>
                      {/* Undo is the strongest trust feature in the product,
                        * and it costs nothing here because every action is a
                        * pure function over the match list. */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setMatches(undoResolution(matches, open.id))
                        }
                      >
                        Undo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="flex flex-col items-start"
                  style={{
                    background: "var(--surface-card)",
                    borderRadius: "var(--radius-card)",
                    boxShadow: "var(--shadow-card)",
                    padding: "var(--space-9)",
                    gap: "var(--space-4)",
                  }}
                >
                  <span className="t-title ink-primary">
                    {owed} {owed === 1 ? "item needs" : "items need"} a decision
                  </span>
                  <span className="t-prose ink-secondary">
                    Open one from the queue. Every action changes one input to
                    the balance proof, so the unexplained figure below moves on
                    the click that caused it.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ---------- The bar at the bottom ---------- */}
          <div
            className="flex flex-row items-center justify-between flex-wrap"
            style={{
              background: "var(--surface-card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
              padding: "var(--space-6) var(--space-7)",
              gap: "var(--space-6)",
            }}
          >
            {/* The figure lives here only while the proof is not on screen.
              * Exactly one --type-metric figure at any moment. */}
            {showProof ? (
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span className="t-label">Next</span>
                <span className="t-body ink-secondary">
                  {state === "signed"
                    ? `Sending ${entries} correcting ${
                        entries === 1 ? "entry" : "entries"
                      } and ${clearedMarks} cleared marks into 05/2026.`
                    : "The month is proven. Signing takes a frozen copy of the documents, the rules that ran, and your name."}
                </span>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span className="t-label">Still unexplained</span>
                <Money
                  amount={proof.unexplained}
                  form="signed"
                  emphasis="lead"
                  tone={
                    proof.tied
                      ? "var(--status-ok-ink)"
                      : "var(--status-warn-ink)"
                  }
                  style={{
                    fontSize: "var(--type-metric)",
                    lineHeight: "var(--leading-tight)",
                  }}
                />
              </div>
            )}

            <div
              className="flex flex-col items-end"
              style={{ gap: "var(--space-3)" }}
            >
              {state === "signed" ? (
                <span className="t-body ink-secondary">
                  Signed by {signedBy}
                </span>
              ) : (
                /* One confirm treatment, and it states exactly what will be
                 * written before the click. The review drawer used to fire
                 * immediately while the agents panel wrapped the same action in
                 * a confirm, and the drawer was the surface that got demoed.
                 * The screen's job here is to make the consequence plain, not
                 * to make the person think: they did the thinking upstairs. */
                <ConfirmPopoverButton
                  label="Sign and send"
                  variant="primary"
                  size="lg"
                  confirmLabel="Sign and send"
                  confirmTitle="Write to Yardi"
                  confirmBody={`${entries} correcting ${
                    entries === 1 ? "entry" : "entries"
                  } and ${clearedMarks} cleared marks into 05/2026. Each entry carries an idempotency key, so a retry cannot duplicate it, and a completed post can be undone while the period is open.`}
                  disabled={!signGuard.allowed}
                  onConfirm={() => setSignedBy(REVIEWER)}
                />
              )}
              {/* A switched-off button says why, right next to it. */}
              {/* A switched-off button says why, and the sentence comes from
                * the guard rather than being restated here. Two copies of
                * "why can this not happen" is how a screen ends up disagreeing
                * with the rule it is describing. */}
              {!signGuard.allowed && state !== "signed" && (
                <span className="t-meta ink-tertiary">
                  {proveGuard.allowed ? "Ready to sign" : proveGuard.because}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
