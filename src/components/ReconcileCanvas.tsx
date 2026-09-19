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

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronRight, FileText, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmPopoverButton } from "@/components/ui/ConfirmPopoverButton";
import { ReconcileRun } from "@/components/ReconcileRun";
import { ReconcilePosting } from "@/components/ReconcilePosting";
import { buildBatch, type PostingBatch } from "@/lib/posting";
import { MatchCard } from "@/components/entities/MatchCard";
import { ProofLadder } from "@/components/entities/ProofLadder";
import { OutcomeChip } from "@/components/entities/OutcomeChip";
import { Money } from "@/components/entities/Money";
import { stateWords } from "@/components/entities/AccountRow";
import { AgentOrb, type AgentJob } from "@/components/entities/AgentOrb";
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
import {
  bankLines,
  controlTotals,
  ledgerRows,
  ledgerTotals,
} from "@/lib/fixtures/westlakeOperating";
import { canProve, canSign, type ReconciliationState } from "@/lib/session/types";
import { OPEN_PERIOD } from "@/lib/close";
import { money, toCents } from "@/lib/money";

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
  job,
}: {
  name: string;
  state: LaneState;
  touched: string;
  /* Which part of the machine this lane is. Only used while the lane is
   * active — a finished lane gets a check, because what matters then is that
   * it is done, not which agent did it. */
  job: AgentJob;
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
          /* The orb replaces a spinner here, and the difference is not
            * decoration. A spinner says "something is happening" and is the
            * same glyph for every job in every product; the orb is per-agent,
            * so the Reader sweeping a document and the Matcher wiring two
            * sides together do not look identical while they run. It is the
            * one place on this screen where a machine is working rather than
            * having worked, which is why it appears here and nowhere else in
            * the strip. */
          <AgentOrb job={job} size={20} label={`${name}, running`} />
        ) : (
          /* A dash, not a circle.
           *
           * An empty circle outline is the radio-button shape, and it is a
           * control affordance almost everywhere else a person has seen one.
           * These are status marks: the lane has not run, and there is nothing
           * to choose. A dash cannot be mistaken for something to click. */
          <Minus
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

/* ---------- The two documents ----------
 *
 * The screen talked about the statement and the ledger in prose and never
 * showed them. They are the only two objects the whole month rests on, and
 * "a bai2 statement and a Yardi export" is a description of them rather than
 * the things themselves.
 *
 * Every figure here is read off the fixture rather than typed. The line counts
 * are the arrays' lengths, the balances are the control totals the file
 * declares in its own header, and the date the statement landed is the one in
 * its BAI2 `01` record — 260601, the first of June. Nothing on this strip is
 * invented, which is the point of putting it on the one account that is real.
 *
 * Stating the control totals HERE, before the Reader reaches them, is what
 * makes its self-check legible when it happens: a reader who has already seen
 * "closes at 301,980.10" understands what the grading beat is comparing. A
 * guarantee you can only verify after the fact is a guarantee nobody checks. */
function DocumentRow({
  name,
  kind,
  facts,
}: {
  name: string;
  kind: string;
  facts: string;
}) {
  return (
    <div
      className="list-row flex flex-row items-center"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
      }}
    >
      <FileText
        size="var(--icon-md)"
        strokeWidth="var(--stroke-md)"
        style={{ color: "var(--ink-tertiary)", flexShrink: 0 }}
        aria-hidden
      />
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">{name}</span>
        <span className="t-meta ink-tertiary truncate">
          {kind} · {facts}
        </span>
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

  /* The batch, once a person has signed. Null before that, and null again after
   * an undo — which is the point of undo. */
  const [batch, setBatch] = useState<PostingBatch | null>(null);

  /* Where the run itself is.
   *
   * `draft` means the documents are in and nobody has pressed start. `running`
   * is the machine working, and the middle of the screen is a picture of it.
   * `finished` is everything after, which is where the queue and the proof
   * live. Three values rather than replaying the fourteen-state machine here:
   * this is about which PICTURE the middle shows, and the reconciliation's own
   * state is derived below from the work rather than from the animation. */
  /* The run starts on its own, and there is no state before it.
   *
   * There used to be a `draft` picture with a Start button on it, and the
   * question it asked had no decision in it. Reading and pairing write nothing,
   * reach nothing, and are reversible by ignoring them; both documents were
   * already bound to the account and period; and the gate this product does
   * have is at the SIGNATURE, which is where a person takes responsibility. A
   * second gate at the front is the same click "New session" was on the Close
   * screen — the calendar creates the work, and documents landing start the
   * run.
   *
   * The tell was already in this file: "Run it again" went straight to
   * `running`. The second attempt never asked. Only the first one did, and
   * nothing about the first attempt is more consequential than the second.
   *
   * `stopped` is NOT that gate coming back. It exists only after somebody
   * presses Stop, so the button that restarts the run has a reason on screen
   * for why it is being offered: you stopped it. */
  const [run, setRun] = useState<"running" | "stopped" | "finished">("running");

  /* Every attempt, oldest first. A reconciliation can be run more than once —
   * mid-month against a partial statement, then again when the final one lands
   * — and the question the specs left open was whether the earlier attempts are
   * visible history or silently superseded.
   *
   * Visible. A figure that moved between attempts is exactly the thing somebody
   * will ask about in six months, and "the machine got 2,900.60 on the partial
   * statement and 2,900.60 again on the final one" is a different fact from
   * either number alone. Silently superseding them would also make the frozen
   * first-pass figure meaningless: frozen at WHICH verdict?
   *
   * Only the last one can be signed. */
  const [runs, setRuns] = useState<
    { attempt: number; finishedAt: string; unexplained: number; owed: number }[]
  >([]);

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

  const finishRun = useCallback(() => {
    setRun("finished");
    setRuns((prev) => [
      ...prev,
      {
        attempt: prev.length + 1,
        finishedAt: new Date().toISOString(),
        /* Frozen at the machine's verdict. It is computed here, before any
         * resolution exists, and never recomputed — a quality number that
         * improves when a person cleans up is not measuring the machine. */
        unexplained: proof.unexplained,
        owed: matches.filter(needsDecision).length,
      },
    ]);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [proof.unexplained, matches]);

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
    : run === "stopped"
      ? /* Stopped by a person mid-read. `blocked` is the honest state: the run
         * is not going to finish on its own and only a person can move it,
         * which is exactly what that state means. It is not `draft` — the
         * documents are in — and it is not `reading`, because nothing is. */
        "blocked"
      : run === "running"
        ? "reading"
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

  /* The lanes track the run, so a lane cannot claim to have read a document
   * before anybody started. "not started" is a state the old canvas never had,
   * which is why every lane on it looked busy from the moment it mounted. */
  /* `before` is now only ever true because somebody stopped the run. There is
   * no state before a run that nobody has started, because every run starts. */
  const before = run === "stopped";
  const during = run === "running";

  /* A lane may only report what it has actually touched YET.
   *
   * An earlier pass gated the lane's STATE on the run but left its text
   * unconditional, so while the documents were still being read the Pairing
   * lane already claimed "7 paired by rule · 5 left for you". A lane that
   * reports its finished figures before it has started is worse than a spinner:
   * a spinner says nothing, and this said something false. */
  const notYet = before || during;

  const lanes: {
    name: string;
    state: LaneState;
    touched: string;
    job: AgentJob;
  }[] = [
    {
      name: "Reading",
      job: "reading",
      state: before ? "waiting" : during ? "active" : "done",
      touched: before
        ? "stopped before it finished · nothing was written"
        : during
          ? "extracting rows, then grading them against the header"
          : "bai2-westlake-operating-2026-05.bai · 14 lines · totals matched the header",
    },
    {
      name: "Pairing",
      job: "pairing",
      state: notYet ? "waiting" : "done",
      touched: notYet
        ? "not started"
        : `${paired} paired by rule · ${oneSided} one-sided · ${owed} left for you`,
    },
    {
      name: "Checking",
      job: "checking",
      state: notYet ? "waiting" : owed > 0 ? "active" : "done",
      touched: notYet
        ? "not started"
        : `${confirmed} pattern confirmed · ${proposed} proposed · ${ambiguous} ranked, not decided`,
    },
    {
      name: "Sending",
      job: "sending",
      state: state === "signed" ? "active" : "waiting",
      touched:
        notYet
          ? "not started"
          : state === "signed"
          ? "sending"
          : `${entries} correcting ${
              entries === 1 ? "entry" : "entries"
            } and ${clearedMarks} cleared marks when signed`,
    },
  ];

  const showProof = run === "finished" && owed === 0;

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
                {/* The document count stays on every state, not just the one
                  * before the run. It is the cheapest "you are in the right
                  * place" fact on the screen and it does not stop being true
                  * once reading starts.
                  *
                  * "not yet run" is gone with the state that used to carry it.
                  * The run starts on its own now, so there is no moment when
                  * both documents are in and nothing has begun.
                  *
                  * `stopped` says "stopped" rather than taking `blocked`'s word
                  * "stuck". It maps to `blocked` because only a person can move
                  * it on, which is what that state means — but a run somebody
                  * halted on purpose is not a read that failed, and the subtitle
                  * should say which of the two happened. */}
                {`2 of 2 documents in · ${
                  run === "stopped" ? "stopped" : stateWords(state)
                }`}
              </span>
            </span>
          </div>

          {/* ---------- Who prepared it, and who signs ----------
            *
            * Stated rather than left implicit, which is what the flows document
            * asks for. The control that matters in accounting is that whoever
            * prepared the work is not whoever approves it, and that is not a
            * headcount rule: AI prepares, a person approves, and it satisfies
            * the control better than two people would because the preparer's
            * every step is recorded and replayable.
            *
            * So yes, one person can sign a reconciliation they "prepared" —
            * they did not prepare it, the machine did, and the screen should
            * say so where somebody is about to put their name to it. */}
          {run === "finished" && (
            <div
              className="flex flex-col"
              style={{
                background: "var(--surface-card)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
                padding: "var(--space-6)",
                gap: "var(--space-4)",
              }}
            >
              <span className="t-label">Who did what</span>
              <span className="t-prose ink-secondary">
                The machine read both documents, paired what it could and
                proposed the rest. Every figure on this screen came from that,
                and every decision on it will carry your name. That separation
                is the control, and it holds with one person because the
                preparer is not a person.
              </span>

              {/* Running it again is a real event, not a reset: a partial
                * statement mid-month, then the final one when it lands. The
                * earlier attempt stays in the list, because a first-pass figure
                * frozen at the machine's verdict is meaningless if nobody can
                * see which verdict. Resolutions are cleared, since they were
                * decisions about rows a new read may not even produce. */}
              {run === "finished" && (
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setMatches(westlakeMatches);
                    setOpenId(null);
                    setSignedBy(null);
                    setBatch(null);
                    setRun("running");
                  }}
                >
                  Run it again
                </Button>
              )}

              {runs.length > 0 && (
                <div
                  className="flex flex-col"
                  style={{
                    gap: "var(--space-3)",
                    paddingTop: "var(--space-4)",
                    borderTop: "1px solid var(--line-hair)",
                  }}
                >
                  <span className="t-label">
                    {runs.length === 1
                      ? "One attempt"
                      : `${runs.length} attempts · only the last can be signed`}
                  </span>
                  {runs.map((r, i) => (
                    <div
                      key={r.attempt}
                      className="flex flex-row items-baseline justify-between"
                      style={{
                        gap: "var(--space-5)",
                        opacity: i === runs.length - 1 ? 1 : 0.6,
                      }}
                    >
                      <span className="t-meta ink-secondary">
                        Run {r.attempt}
                        {i < runs.length - 1 && " · superseded"}
                      </span>
                      <span className="t-meta ink-tertiary nums">
                        first pass {money(r.unexplained)} · {r.owed}{" "}
                        {r.owed === 1 ? "item" : "items"}
                      </span>
                    </div>
                  ))}
                  <span className="t-meta ink-tertiary">
                    A first-pass figure is frozen at the machine's verdict. It
                    does not improve because somebody cleaned up afterwards.
                  </span>
                </div>
              )}
            </div>
          )}

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

          {/* ---------- The documents themselves ---------- */}
          <div
            className="flex flex-col"
            style={{
              background: "var(--surface-list)",
              borderRadius: "var(--radius-sheet)",
              boxShadow: "var(--shadow-depth-1)",
              padding: "var(--space-2)",
              ["--list-inset" as string]: "var(--space-5)",
            }}
          >
            <DocumentRow
              name="bai2-westlake-operating-2026-05.bai"
              kind="Bank statement · BAI2"
              facts={`${bankLines.length} lines · landed 1 June · opens ${money(
                controlTotals.openingBalance
              )} · closes ${money(controlTotals.closingBalance)}`}
            />
            <DocumentRow
              name="yardi-gl-westlake-operating-2026-05.csv"
              kind="Ledger export · Yardi"
              facts={`${ledgerRows.length} rows · post month 05/2026 · book balance ${money(
                ledgerTotals().bookBalance
              )}`}
            />
          </div>

          {/* ---------- The middle ---------- *
            *
            * Three pictures and never two at once. The machine while it runs,
            * the queue and the item while work is owed, the proof when nothing
            * is. The spec is explicit that this same area changes, and the
            * reason is that a proof over five open items would be showing a
            * conclusion nobody has reached. */}
          {run === "stopped" ? (
            <div
              className="flex flex-col items-start"
              style={{
                background: "var(--surface-card)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
                padding: "var(--space-9)",
                gap: "var(--space-5)",
              }}
            >
              <span className="t-title ink-primary">
                Stopped before it finished
              </span>
              {/* The sentence that used to sell the run now explains what
                * stopping cost, which is nothing. It is the same guarantee read
                * from the other side: a run that writes nothing until a
                * signature is a run you can abandon without consequence. */}
              <span className="t-prose ink-secondary">
                Nothing was written. Reading and pairing touch no ledger, so a
                run that does not finish leaves the account exactly as it was.
                Starting again reads both documents from the beginning.
              </span>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setRun("running")}
              >
                Start the run again
              </Button>
            </div>
          ) : run === "running" ? (
            <ReconcileRun
              matches={matches}
              onFinished={finishRun}
              onStop={() => setRun("stopped")}
            />
          ) : batch ? (
            /* Once it has been signed the middle becomes the send, because what
             * a person needs to see now is which entries landed. The proof is
             * behind it, unchanged and still true. */
            <ReconcilePosting
              initial={batch}
              reconciliation={reconciliation}
              period={OPEN_PERIOD}
              onUndone={() => setSignedBy(null)}
              onDismiss={() => setBatch(null)}
            />
          ) : showProof ? (
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
            {run !== "finished" ? (
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span className="t-label">Next</span>
                <span className="t-body ink-secondary">
                  {run === "stopped"
                    ? "Stopped. Nothing was read, so there is no figure to show."
                    : "Reading and pairing. The figure appears when the machine hands over."}
                </span>
              </div>
            ) : showProof ? (
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
              {run !== "finished" ? null : state === "signed" ? (
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
                  onConfirm={() => {
                    setSignedBy(REVIEWER);
                    setBatch(
                      buildBatch(
                        "recon-westlake-operating-2026-05",
                        "05/2026",
                        matches
                      )
                    );
                  }}
                />
              )}
              {/* A switched-off button says why, right next to it. */}
              {/* A switched-off button says why, and the sentence comes from
                * the guard rather than being restated here. Two copies of
                * "why can this not happen" is how a screen ends up disagreeing
                * with the rule it is describing. */}
              {run === "finished" && !signGuard.allowed && state !== "signed" && (
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
