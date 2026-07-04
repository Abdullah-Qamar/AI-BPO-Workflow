"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Landmark,
  RotateCcw,
  SquareChevronLeft,
  SquareChevronRight,
} from "lucide-react";
import { ConfirmPopoverButton } from "./ui/ConfirmPopoverButton";
import {
  agents as seedAgents,
  type AgentAction,
  type AgentArtifact,
  type AgentFile,
  type AgentInsight,
  type AgentSectionData,
  type AgentStatusLine,
  type BankProgressRow,
  type DotState,
  type StatusRun,
  type StatusTone,
} from "@/lib/seed";
import { useSession } from "@/lib/session/SessionProvider";
import {
  totalApproved,
  totalExceptions,
} from "@/lib/session/reducer";
import type { RunState } from "@/lib/session/types";
import { DotGridAvatar, type DotGridPattern } from "./DotGridAvatar";
import { KnowledgePanel } from "./KnowledgePanel";

/* Per-agent avatar patterns from the DotGridAvatar system. The three
 * organisms map to the source assets in /AI Agents Animations/:
 *
 *   intake         → stars   (four star glyphs cycling through a 2×2 lattice)
 *   reconciliation → pulse   (radial rings expanding outward — the "spiral")
 *   summary        → summary (looped cursive scribble traced by a highlight)
 *
 * Active state renders in full contrast; idle pauses the animation at t=0
 * with a muted dot color so the shape signature stays legible without
 * competing for attention. */
const AGENT_VISUAL: Record<
  AgentSectionData["id"],
  { pattern: DotGridPattern }
> = {
  intake: { pattern: "stars" },
  reconciliation: { pattern: "pulse" },
  summary: { pattern: "summary" },
};

const DOT_COLOR: Record<DotState, string> = {
  pending: "#DDDFE6",
  neutral: "#A8A9AD",
  failed: "#FF0000",
};

type Tab = "agents" | "knowledge";

export function AgentsPanel({
  collapsed = false,
  onToggle,
  onInspect,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  /* Called when the user clicks Summary's "Review N records" inspect CTA.
   * The host (page.tsx) responds by swapping the canvas to ReviewCanvas. */
  onInspect?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("agents");

  if (collapsed) {
    return (
      <aside
        className="flex flex-col items-start shrink-0"
        style={{
          /* Sticky sliver — same surface as the expanded panel so collapsing
           * doesn't reveal a second underlying container. One card, resized. */
          position: "sticky",
          top: 12,
          alignSelf: "flex-start",
          height: "calc(100vh - 24px)",
          margin: "12px 12px 12px 0",
          width: 68,
          padding: "20px 12px",
          gap: 16,
          background: "var(--surface-card)",
          borderRadius: 20,
          boxShadow: "var(--shadow-card)",
          transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center justify-center transition"
          style={{
            width: 36,
            height: 36,
            padding: 8,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--text-1)",
            cursor: "pointer",
          }}
          aria-label="Expand agents"
          title="Expand agents"
        >
          <SquareChevronLeft size={20} strokeWidth={2} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col items-stretch shrink-0 relative overflow-hidden"
      style={{
        /* Single-surface panel. Previously the aside had a bg-side "gutter"
         * and the inner card sat inside — two nested backgrounds read as an
         * extra container. Now the aside IS the panel: one surface, one
         * shadow, one radius. Padding replaces the old gutter. */
        position: "sticky",
        top: 12,
        alignSelf: "flex-start",
        height: "calc(100vh - 24px)",
        margin: "12px 12px 12px 0",
        width: 400,
        padding: "20px 16px 20px 20px",
        gap: 16,
        background: "var(--surface-card)",
        borderRadius: 20,
        boxShadow: "var(--shadow-card)",
        transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        className="flex flex-col items-start flex-1 relative"
        style={{
          width: "100%",
          minHeight: 0,
          gap: 16,
        }}
      >
        {/* Collapse chevron — absolutely positioned so it stays at the exact
         * same top-right pin regardless of what renders in the header row
         * (tab strip, empty, error, whatever). Previously nested in a flex
         * row and drifted when the row grew. */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center transition"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            padding: 4,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--text-2)",
            cursor: "pointer",
            zIndex: 5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.7)";
            e.currentTarget.style.borderColor = "rgba(157,179,197,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
          aria-label="Collapse agents"
          title="Collapse agents"
        >
          <SquareChevronRight size={18} strokeWidth={1.75} />
        </button>

        {/* Header row — tab strip only. Leaves 32 px of clearance for the
         * pinned chevron on the right. */}
        <div
          className="flex flex-row items-center"
          style={{ width: "100%", paddingRight: 32 }}
        >
          <TabRow tab={tab} setTab={setTab} />
        </div>

        {/* Scrollable body so the CTAs at the bottom of Summary don't push
         * the whole panel taller than the viewport. */}
        <div
          className="flex flex-col items-start flex-1 overflow-y-auto scroll-thin"
          style={{ width: "100%", minHeight: 0, paddingRight: 4 }}
        >
          {tab === "agents" ? <AgentList onInspect={onInspect} /> : <KnowledgePanel />}
        </div>
      </div>
    </aside>
  );
}

function TabRow({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div
      className="flex flex-row justify-center items-center"
      style={{ height: 35 }}
    >
      <button
        onClick={() => setTab("agents")}
        className="flex justify-center items-center"
        style={{
          padding: "8px 16px",
          gap: 10,
          background:
            tab === "agents" ? "var(--surface-tab-active)" : "transparent",
          border: tab === "agents" ? "1px solid #FFFFFF" : "1px solid transparent",
          boxShadow: tab === "agents" ? "var(--shadow-chip)" : "none",
          borderRadius: 8,
          fontSize: 16,
          lineHeight: "19px",
          color: tab === "agents" ? "var(--text-1)" : "var(--text-placeholder)",
          cursor: "pointer",
        }}
      >
        Agents
      </button>
      <button
        onClick={() => setTab("knowledge")}
        className="flex justify-center items-center"
        style={{
          padding: "8px 16px",
          gap: 10,
          background:
            tab === "knowledge" ? "var(--surface-tab-active)" : "transparent",
          border:
            tab === "knowledge" ? "1px solid #FFFFFF" : "1px solid transparent",
          boxShadow: tab === "knowledge" ? "var(--shadow-chip)" : "none",
          borderRadius: 8,
          fontSize: 16,
          lineHeight: "19px",
          color:
            tab === "knowledge" ? "var(--text-1)" : "var(--text-placeholder)",
          cursor: "pointer",
        }}
      >
        Knowledge
      </button>
    </div>
  );
}

function AgentList({ onInspect }: { onInspect?: () => void }) {
  /* Live agents derived from session state. The seed's three-agent shape stays
   * the same — what changes is each agent's lifecycle (idle / working / done)
   * and what timeline events / counts are surfaced based on the current run
   * state. The seed's full snapshot becomes the resting state once the cycle
   * has reached review.
   *
   * Demo hook: the URL hash `#demo=error` flips Intake into the error state so
   * the design of that fourth lifecycle branch is observable in the running
   * app without wiring a real failure path. Set the hash in the address bar
   * to see it; remove or change it to return to normal behavior. */
  const { state } = useSession();
  const [demoState, setDemoState] = useState<string>("");
  useEffect(() => {
    const read = () => {
      if (typeof window === "undefined") return;
      const h = window.location.hash;
      const m = h.match(/demo=(\w+)/);
      setDemoState(m ? m[1] : "");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const derived = useMemo(
    () => deriveAgents(state.runState, state, demoState),
    [state, demoState]
  );
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 24 }}
    >
      {derived.map((a) => (
        <AgentSection key={a.id} data={a} onInspect={onInspect} />
      ))}
    </div>
  );
}

function deriveAgents(
  runState: RunState,
  state: ReturnType<typeof useSession>["state"],
  demoState: string = ""
): AgentSectionData[] {
  const [intakeSeed, reconSeed, summarySeed] = seedAgents;

  /* Demo hook — visible via URL hash `#demo=error` (or `#demo=intake-error`).
   * Overrides the naturally-derived Intake lifecycle so the error state's
   * design (red-tinted avatar, red status text, inline error card + Retry
   * chip) is observable in the running app. Real error handling would be
   * wired to intake pipeline failures. */
  const forceIntakeError = demoState === "error" || demoState === "intake-error";
  const intakeError: AgentSectionData["error"] = {
    title: "Ledger import stalled",
    body: "Yardi API returned a 503 while fetching the Wells Fargo ledger. Retrying could resolve if it was a transient outage.",
    retryLabel: "Retry import",
  };
  if (forceIntakeError) {
    // Short-circuit: return the demo error configuration for Intake and idle
    // for the other two — the design is what matters here.
    return [
      {
        ...intakeSeed,
        state: "error",
        error: intakeError,
        collapsedLine: undefined,
        timeline: [],
      },
      { ...reconSeed, state: "idle", collapsedLine: undefined, timeline: [] },
      {
        ...summarySeed,
        state: "idle",
        collapsedLine: undefined,
        timeline: [],
        insight: undefined,
        artifact: undefined,
        primaryAction: undefined,
        inspectAction: undefined,
        secondaryAction: undefined,
      },
    ];
  }

  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const reconciledBankCount = state.bankOrder.filter(
    (id) =>
      state.banks[id]?.stage === "reconciled" ||
      state.banks[id]?.stage === "posting" ||
      state.banks[id]?.stage === "posted"
  ).length;

  /* Helper: live recon line replacing the seed's hard-coded "52/16". */
  const liveReconCounts = (label: string): AgentStatusLine => ({
    id: "recon-live",
    runs: [
      { text: label + " · ", tone: "neutral" as StatusTone },
      { text: `${approved} approved`, tone: "approved" as StatusTone },
      { text: " · ", tone: "neutral" as StatusTone },
      { text: `${exceptions} flagged`, tone: "failed" as StatusTone },
    ],
    dotState: "neutral" as DotState,
  });

  // --- Phase-specific overrides ---

  if (runState === "draft") {
    return [
      { ...intakeSeed, state: "idle", collapsedLine: undefined, timeline: [] },
      { ...reconSeed, state: "idle", collapsedLine: undefined, timeline: [] },
      {
        ...summarySeed,
        state: "idle",
        collapsedLine: undefined,
        timeline: [],
        insight: undefined,
        artifact: undefined,
        primaryAction: undefined,
        inspectAction: undefined,
        secondaryAction: undefined,
      },
    ];
  }

  if (runState === "running") {
    return [
      {
        ...intakeSeed,
        state: "working",
        // Slim the timeline to what's plausibly known mid-run.
        timeline: intakeSeed.timeline.slice(0, Math.min(4, intakeSeed.timeline.length)),
      },
      { ...reconSeed, state: "idle", collapsedLine: undefined, timeline: [] },
      {
        ...summarySeed,
        state: "idle",
        collapsedLine: undefined,
        timeline: [],
        insight: undefined,
        artifact: undefined,
        primaryAction: undefined,
        inspectAction: undefined,
        secondaryAction: undefined,
      },
    ];
  }

  if (runState === "reconciling") {
    return [
      { ...intakeSeed, state: "done" },
      {
        ...reconSeed,
        state: "working",
        collapsedLine: liveReconCounts(
          `Matching… ${reconciledBankCount} of ${state.bankOrder.length} banks`
        ),
        timeline: [
          reconSeed.timeline[0],
          liveReconCounts(
            `Matching… ${reconciledBankCount} of ${state.bankOrder.length} banks`
          ),
        ],
      },
      {
        ...summarySeed,
        state: "idle",
        collapsedLine: undefined,
        timeline: [],
        insight: undefined,
        artifact: undefined,
        primaryAction: undefined,
        inspectAction: undefined,
        secondaryAction: undefined,
      },
    ];
  }

  if (runState === "review") {
    /* Post to Yardi has moved into Summary's CTA ladder — Review records is
     * the dark primary and Post to Yardi renders below as the outline
     * secondary commit. The canvas header goes quiet (see PhaseCTA's review
     * branch — a muted "Ready for review" status label) so the two dark
     * pills no longer compete for the same commit. */
    return [
      { ...intakeSeed, state: "done" },
      withLiveReconTimeline(reconSeed, "done", state),
      withLiveSummary(summarySeed, state),
    ];
  }

  if (runState === "updating-yardi") {
    const postedCount = state.bankOrder.filter(
      (id) => state.banks[id]?.stage === "posted"
    ).length;
    return [
      { ...intakeSeed, state: "done" },
      withLiveReconTimeline(reconSeed, "done", state),
      {
        ...withLiveSummary(summarySeed, state),
        state: "working",
        primaryAction: undefined,
        collapsedLine: {
          id: "summary-posting",
          runs: [
            {
              text: `Posting to Yardi · ${postedCount} of ${state.bankOrder.length} banks`,
              tone: "neutral" as StatusTone,
            },
          ],
          dotState: "neutral" as DotState,
        },
      },
    ];
  }

  // complete
  return [
    { ...intakeSeed, state: "done" },
    withLiveReconTimeline(reconSeed, "done", state),
    {
      ...withLiveSummary(summarySeed, state),
      primaryAction: undefined,
      collapsedLine: {
        id: "summary-complete",
        runs: [
          { text: "Posted · ", tone: "neutral" as StatusTone },
          { text: `${approved} records`, tone: "approved" as StatusTone },
          { text: " posted · ", tone: "neutral" as StatusTone },
          { text: `${exceptions} flagged`, tone: "failed" as StatusTone },
        ],
        dotState: "neutral" as DotState,
      },
    },
  ];
}

/* For the Reconciliation agent: replace the seed's static timeline & counts
 * with values derived from the live session — only the banks that actually
 * went through reconciliation appear in the bankRows strip, and the headline
 * counts mirror the canvas banner. */
function withLiveReconTimeline(
  reconSeed: AgentSectionData,
  agentState: AgentSectionData["state"],
  state: ReturnType<typeof useSession>["state"]
): AgentSectionData {
  const reconciledIds = state.bankOrder.filter((id) => {
    const stage = state.banks[id]?.stage;
    return stage === "reconciled" || stage === "posting" || stage === "posted";
  });
  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const total = approved + exceptions;

  // Bank rows ⇄ session bank ids. Mapping inferred from seed-shortName tokens.
  const bankRowFor = (bankId: string): BankProgressRow | null => {
    const meta: Record<string, { logoSrc: string; shortName: string }> = {
      "bank-chase-op": {
        logoSrc: "/logos/chase.png",
        shortName: "Chase Operating ******3421",
      },
      "bank-wells-sd": {
        logoSrc: "/logos/wells-fargo.png",
        shortName: "Wells Fargo SD ******7782",
      },
      "bank-boa-res": {
        logoSrc: "/logos/boa.png",
        shortName: "BoA Reserves ******9034",
      },
      "bank-chase-escrow": {
        logoSrc: "/logos/chase.png",
        shortName: "Chase Escrow ******8856",
      },
    };
    const m = meta[bankId];
    if (!m) return null;
    const bank = state.banks[bankId];
    const matched = (bank?.approvedCount ?? 0) + (bank?.exceptionCount ?? 0);
    return {
      id: `recon-${bankId}`,
      logoSrc: m.logoSrc,
      shortName: m.shortName,
      matched,
      total: matched,
    };
  };

  const liveBankRows = reconciledIds
    .map(bankRowFor)
    .filter((r): r is BankProgressRow => !!r);

  const liveTimeline: AgentStatusLine[] = [
    {
      id: "recon-started",
      runs: [
        {
          text: `Reconciling ${reconciledIds.length} bank ${
            reconciledIds.length === 1 ? "account" : "accounts"
          }`,
          tone: "neutral" as StatusTone,
        },
      ],
      dotState: "neutral" as DotState,
    },
    {
      id: "recon-matching",
      runs: [
        { text: `Matched ${total} transactions · `, tone: "neutral" as StatusTone },
        { text: `${approved} approved`, tone: "approved" as StatusTone },
        { text: " · ", tone: "neutral" as StatusTone },
        { text: `${exceptions} flagged`, tone: "failed" as StatusTone },
      ],
      dotState: "neutral" as DotState,
      bankRows: liveBankRows,
    },
  ];

  return {
    ...reconSeed,
    state: agentState,
    collapsedLine: {
      id: "recon-collapsed",
      runs: [
        { text: `Reconciled ${total} records · `, tone: "neutral" as StatusTone },
        { text: `${approved} approved`, tone: "approved" as StatusTone },
        { text: " · ", tone: "neutral" as StatusTone },
        { text: `${exceptions} flagged`, tone: "failed" as StatusTone },
      ],
      dotState: "neutral" as DotState,
    },
    timeline: liveTimeline,
  };
}

/* For the Summary agent: keep the seed's insight/artifact/secondary actions
 * (those are static deliverables) but rewrite the headline counts + Post-to-
 * Yardi sublabel to match the live session totals. */
function withLiveSummary(
  summarySeed: AgentSectionData,
  state: ReturnType<typeof useSession>["state"]
): AgentSectionData {
  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const total = approved + exceptions;
  return {
    ...summarySeed,
    state: "done",
    collapsedLine: {
      id: "summary-collapsed",
      runs: [
        { text: "Ready to post · ", tone: "neutral" as StatusTone },
        { text: `${approved} approved`, tone: "approved" as StatusTone },
        { text: " · ", tone: "neutral" as StatusTone },
        { text: `${exceptions} flagged`, tone: "failed" as StatusTone },
      ],
      dotState: "neutral" as DotState,
    },
    inspectAction: summarySeed.inspectAction
      ? { ...summarySeed.inspectAction, label: `Review ${total} records` }
      : undefined,
    primaryAction: summarySeed.primaryAction
      ? {
          ...summarySeed.primaryAction,
          sublabel: `${approved} approved · ${exceptions} flagged`,
        }
      : undefined,
  };
}

function AgentSection({
  data,
  onInspect,
}: {
  data: AgentSectionData;
  onInspect?: () => void;
}) {
  const [expanded, setExpanded] = useState(!!data.defaultExpanded);
  const [hover, setHover] = useState(false);

  const isIdle = data.state === "idle";
  const isWorking = data.state === "working";
  const isError = data.state === "error";

  /* The entire header is a click target when the body has content to toggle
   * — easier ergonomics than the small chevron-in-dot affordance below. */
  const canToggle =
    !isIdle && (!!data.collapsedLine || data.timeline.length > 0);

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 10 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header — avatar + name, always present. Consistent across all agents
       * so Summary doesn't visually outweigh the rest; the attention signal
       * lives in the insight body and the dark Post CTA. */}
      <button
        type="button"
        onClick={canToggle ? () => setExpanded((e) => !e) : undefined}
        aria-label={
          canToggle
            ? expanded
              ? `Collapse ${data.name} timeline`
              : `Expand ${data.name} timeline`
            : undefined
        }
        className="flex flex-row items-center text-left transition"
        style={{
          width: "100%",
          paddingLeft: 2,
          gap: 12,
          minHeight: 44,
          background: "transparent",
          border: "none",
          cursor: canToggle ? "pointer" : "default",
        }}
      >
        <AgentAvatar agentId={data.id} agentState={data.state} />
        <div className="flex flex-col items-start flex-1" style={{ gap: 2 }}>
          <span
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: isIdle
                ? "var(--text-4)"
                : isError
                ? "#A32626"
                : "var(--text-1)",
            }}
          >
            {data.name}
          </span>
          {/* Sub-line under the name — a stable state indicator so the reader
           * knows at a glance what mode each agent is in. Reads regardless of
           * whether the body is expanded/collapsed. */}
          <span
            style={{
              fontSize: 11,
              lineHeight: "13px",
              color: isError
                ? "#A32626"
                : isIdle
                ? "var(--text-4)"
                : isWorking
                ? "var(--dot-active)"
                : "var(--text-3)",
              letterSpacing: "0.02em",
            }}
          >
            {isError
              ? "Needs attention"
              : isIdle
              ? "Waiting"
              : isWorking
              ? "Working…"
              : "Done"}
          </span>
        </div>
      </button>

      {/* Idle body — a single muted line so the agent stays visually present
       * in grey instead of collapsing to a bare header. */}
      {isIdle && data.idleHint && <IdleBody hint={data.idleHint} />}

      {/* Error body — inline error card + Retry chip. */}
      {isError && data.error && <ErrorBody error={data.error} />}

      {/* Working / done body. */}
      {!isIdle && !isError && (
        <>
          {expanded ? (
            <TimelineBody
              timeline={data.timeline}
              isWorking={isWorking}
              hover={hover}
              onToggle={() => setExpanded(false)}
            />
          ) : (
            data.collapsedLine && (
              <CollapsedBody
                line={data.collapsedLine}
                isWorking={isWorking}
                hover={hover}
                onToggle={() => setExpanded(true)}
              />
            )
          )}
          {/* Deliverable surfaces — only Summary (in its done state) populates
           * these today. CTA ladder rebuilt:
           *   tier 1 — insight paragraph (the read-out)
           *   tier 2 — Review records   (PRIMARY dark pill — first CTA a
           *                              reviewer should reach for)
           *   tier 3 — Post to Yardi    (outline secondary — the terminal
           *                              commit, still visible & one click
           *                              away but doesn't out-shout Review)
           *   tier 4 — Utility chips    (Rerun · Download PDF as small
           *                              lifted chips, not underlines) */}
          {data.insight && <InsightCard insight={data.insight} />}
          {data.inspectAction && (
            <ReviewPrimaryButton
              action={data.inspectAction}
              onClick={onInspect}
            />
          )}
          {data.primaryAction && (
            <PostToYardiSecondary action={data.primaryAction} />
          )}
          {(data.secondaryAction || data.artifact) && (
            <UtilityRow
              secondaryAction={data.secondaryAction}
              artifact={data.artifact}
            />
          )}
        </>
      )}
    </div>
  );
}

/* Error body — sits in the same body column as idle/collapsed lines so the
 * indent aligns. Two-part: a soft red-tinted card with title + explanation,
 * then a Retry chip. Uses --chip-failed tokens so no new color values enter
 * the system. */
function ErrorBody({ error }: { error: NonNullable<AgentSectionData["error"]> }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 56, gap: 10 }}
    >
      <div
        className="flex flex-col items-start"
        style={{
          width: "100%",
          padding: "10px 12px",
          gap: 4,
          background: "var(--chip-failed-bg)",
          border: "1px solid var(--chip-failed-border)",
          borderRadius: 10,
          boxShadow: "var(--shadow-chip)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "#A32626",
            fontWeight: 500,
          }}
        >
          {error.title}
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: "16px",
            color: "var(--text-2)",
          }}
        >
          {error.body}
        </span>
      </div>
      <button
        type="button"
        className="inline-flex items-center transition"
        style={{
          height: 30,
          padding: "0 12px",
          gap: 6,
          background: "var(--surface-card-glow)",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--text-1)",
          fontSize: 12,
          lineHeight: "14px",
        }}
      >
        <RotateCcw size={12} strokeWidth={1.75} />
        {error.retryLabel ?? "Retry"}
      </button>
    </div>
  );
}

/* ---------- Body — idle (greyed-out placeholder) ---------- */

/* Idle agents keep the same 42 px indent + leading dot + body column geometry
 * as the working/done states so the panel doesn't reflow when the agent
 * activates. Dot is the lightest grey ("pending"), text uses --text-4 — both
 * say "present but inactive" without competing with active agents. */
function IdleBody({ hint }: { hint: string }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", paddingLeft: 56, gap: 6 }}
    >
      <div className="shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: DOT_COLOR.pending,
            border: "1px solid #FFFFFF",
            display: "inline-block",
          }}
        />
      </div>
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-4)",
        }}
      >
        {hint}
      </span>
    </div>
  );
}

/* ---------- Body — collapsed ----------
 *
 * When an agent is `working`, the collapsedLine reflects whatever the agent
 * is doing right now — and that line content changes as the run progresses
 * (banks normalize, banks reconcile, etc). We key the inner StatusText by
 * line.id so React remounts on transition and the CSS keyframe below runs;
 * the visual effect is a smooth, ≤200ms fade-up swap that signals "the
 * thing the agent is saying just changed" without yanking attention. */

function CollapsedBody({
  line,
  isWorking,
  hover,
  onToggle,
}: {
  line: AgentStatusLine;
  isWorking: boolean;
  hover: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", paddingLeft: 56, gap: 6 }}
    >
      <LeadingIndicator
        dotState={line.dotState}
        hover={hover}
        direction="right"
        onClick={onToggle}
      />
      <div
        className="flex flex-col items-start flex-1 min-w-0"
        style={{ gap: 8 }}
      >
        <div
          key={line.id}
          className="agent-line-swap"
          style={{ width: "100%" }}
        >
          <StatusText runs={line.runs} shimmer={isWorking} />
        </div>
        {line.chips && line.chips.length > 0 && (
          <ChipRow chips={line.chips} />
        )}
        {/* Per-bank rows are deliberately hidden in collapsed view —
         * collapsed should stay compact (one summary line). The 4-row
         * strip shows only when the agent is expanded. */}
      </div>
    </div>
  );
}

/* ---------- Body — expanded (timeline) ---------- */

function TimelineBody({
  timeline,
  isWorking,
  hover,
  onToggle,
}: {
  timeline: AgentStatusLine[];
  isWorking: boolean;
  hover: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 8 }}
    >
      {timeline.map((line, i) => {
        const isTop = i === 0;
        const isLast = i === timeline.length - 1;
        const shimmer = isWorking && isLast;
        return (
          <div
            key={line.id}
            className="flex flex-row items-start"
            style={{ width: "100%", paddingLeft: 56, gap: 6 }}
          >
            <LeadingIndicator
              dotState={line.dotState}
              hover={hover && isTop}
              direction="down"
              interactive={isTop}
              onClick={isTop ? onToggle : undefined}
            />
            <div
              className="flex flex-col items-start flex-1 min-w-0"
              style={{ gap: 8 }}
            >
              <StatusText runs={line.runs} shimmer={shimmer} />
              {line.chips && line.chips.length > 0 && (
                <ChipRow chips={line.chips} />
              )}
              {line.bankRows && line.bankRows.length > 0 && (
                <BankRowStrip rows={line.bankRows} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Atoms ---------- */

/* The 14×14 leading slot. By default shows a 6 px colored status dot. On
 * hover (with `hover` true), the dot crossfades out and a chevron crossfades
 * in, signalling that this row is the expand/collapse handle. Only used on
 * the top status line of each agent. */
function LeadingIndicator({
  dotState,
  hover,
  direction,
  interactive = true,
  onClick,
}: {
  dotState: DotState;
  hover: boolean;
  direction: "right" | "down";
  interactive?: boolean;
  onClick?: () => void;
}) {
  const Chevron = direction === "right" ? ChevronRight : ChevronDown;
  const showChevron = interactive && hover;
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      className="relative shrink-0"
      style={{
        width: 14,
        height: 14,
        // Align with the 14 px text line height the indicator sits next to.
        marginTop: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: interactive ? "pointer" : "default",
      }}
      aria-label={
        interactive
          ? direction === "right"
            ? "Expand timeline"
            : "Collapse timeline"
          : undefined
      }
      tabIndex={interactive ? 0 : -1}
    >
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center transition-opacity"
        style={{
          opacity: showChevron ? 0 : 1,
          transition: "opacity 120ms ease",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: DOT_COLOR[dotState],
            border: "1px solid #FFFFFF",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
            display: "block",
          }}
        />
      </span>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center transition-opacity"
        style={{
          opacity: showChevron ? 1 : 0,
          transition: "opacity 120ms ease",
          color: "var(--text-1)",
        }}
      >
        <Chevron size={14} strokeWidth={1.5} />
      </span>
    </button>
  );
}

const STATIC_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "text-grad-neutral",
  failed: "text-grad-failed",
  approved: "text-grad-approved",
  unapproved: "text-grad-unapproved",
};

/* When shimmer is on, only the NEUTRAL runs pick up the moving-highlight
 * variant. Colored runs (approved blue, unapproved red, failed red) stay
 * static so the inline numerics keep their signal — shimmering them would
 * blur the "41 approved · 16 flagged" read into noise. */
function StatusText({
  runs,
  shimmer,
}: {
  runs: StatusRun[];
  shimmer: boolean;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", minHeight: 14 }}
    >
      {runs.map((run, j) => {
        const cls =
          shimmer && run.tone === "neutral"
            ? "text-grad-neutral-shimmer"
            : STATIC_TONE_CLASS[run.tone];
        return (
          <span
            key={j}
            className={cls}
            style={{
              fontSize: 12,
              lineHeight: "14px",
              whiteSpace: "pre",
            }}
          >
            {run.text}
          </span>
        );
      })}
    </div>
  );
}

/* Per-bank progress strip — one row per bank, attached under a status line
 * (currently used by Reconciliation). Each row carries:
 *   • bank logo (14×14)
 *   • short name + masked account (truncates at column width)
 *   • thin progress bar (matched / total)
 *   • numeric count
 * Reads as a compact parallel-work tracker without inventing new color tokens. */
function BankRowStrip({ rows }: { rows: BankProgressRow[] }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 4 }}
    >
      {rows.map((r) => (
        <BankRow key={r.id} row={r} />
      ))}
    </div>
  );
}

function BankRow({ row }: { row: BankProgressRow }) {
  const pct = row.total > 0 ? Math.min(1, row.matched / row.total) : 0;
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", height: 20, gap: 8 }}
    >
      <div
        className="shrink-0 overflow-hidden"
        style={{ width: 14, height: 14, borderRadius: 3, background: "#FFFFFF" }}
      >
        <Image
          src={row.logoSrc}
          alt=""
          width={14}
          height={14}
          style={{ width: 14, height: 14, objectFit: "contain" }}
        />
      </div>
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-1)",
          minWidth: 0,
        }}
      >
        {row.shortName}
      </span>
      <div
        className="shrink-0"
        style={{
          width: 48,
          height: 3,
          borderRadius: 2,
          background: "rgba(48, 59, 69, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: "var(--text-2)",
            transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span
        className="shrink-0 tabular-nums"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-4)",
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {row.matched}/{row.total}
      </span>
    </div>
  );
}

function ChipRow({ chips }: { chips: AgentFile[] }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", gap: 4 }}
    >
      {chips.map((f) => (
        <FileChip key={f.id} file={f} />
      ))}
    </div>
  );
}

function FileChip({ file }: { file: AgentFile }) {
  const Icon = file.icon === "file-text" ? FileText : Landmark;
  return (
    <div
      className="flex flex-row items-center flex-1 min-w-0"
      style={{
        height: 22,
        padding: "4px 6px",
        gap: 6,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 6,
      }}
    >
      <Icon size={12} strokeWidth={1} color="#7F7F87" />
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-1)",
        }}
      >
        {file.label}
      </span>
    </div>
  );
}

function AgentAvatar({
  agentId,
  agentState,
}: {
  agentId: AgentSectionData["id"];
  agentState: AgentSectionData["state"];
}) {
  const visual = AGENT_VISUAL[agentId];
  const idle = agentState === "idle";
  const error = agentState === "error";
  /* Sized up from 26 → 44 so each pattern's silhouette (stars / pulse /
   * summary curve) is clearly readable — at 26 px the fields shrunk faster
   * than the eye could parse. Spacing / baseRadius / amp are scaled from the
   * originals by ~1.7× to keep pattern density proportional to canvas size.
   *
   * State palette:
   *   working — full contrast (#1a1a1a on card surface)
   *   done    — same contrast, motion continues (agents keep breathing)
   *   idle    — paused at t=0, muted mid-grey
   *   error   — paused at t=0, muted red so the signature shape holds a
   *             failed-tone signal even before you read the status line */
  const dotColor = error
    ? "#B84545"
    : idle
    ? "#A8A9AD"
    : "#1a1a1a";
  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: error ? "#FFF6F6" : "#F7F8FA",
        border: error
          ? "1px solid rgba(255, 0, 0, 0.18)"
          : "1px solid transparent",
      }}
    >
      <DotGridAvatar
        size={44}
        pattern={visual.pattern}
        paused={idle || error}
        spacing={4}
        baseRadius={0.42}
        amp={1.35}
        baseAlpha={idle || error ? 0.2 : 0.26}
        peakAlpha={idle || error ? 0.55 : 1.0}
        edgeFadeFrac={0.09}
        dotColor={dotColor}
      />
    </div>
  );
}

/* ---------- Summary deliverables ---------- */

/* All three deliverable surfaces share the same 42 px left indent and 16 px
 * right edge so they align with the timeline column above. Each one is single-
 * purpose and visually distinct from the timeline so they don't read as
 * additional status lines. */

/* No chip, no heading — the insight sits as a quiet paragraph in the
 * timeline column. The body itself is the signal; framing it as a "card"
 * was making it compete with the actual CTAs.
 *
 * Sized to read as the headline content for Summary — 40% larger than the
 * other agent body type, with proportional line-height. The status line
 * above stays the count signal; the inspect/primary CTAs below stay the
 * action ladder; this paragraph carries the AI-generated read-out and the
 * type weight reflects that. */
function InsightCard({ insight }: { insight: AgentInsight }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: "100%",
        paddingLeft: 56,
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: "25px",
          color: "var(--text-1)",
          letterSpacing: "-0.005em",
        }}
      >
        {insight.body}
      </p>
    </div>
  );
}

/* Review records — PRIMARY CTA in the Summary agent. Dark pill: this is the
 * first action a reviewer should reach for once reconciliation completes.
 * Sits above the outline Post-to-Yardi commit so the ladder reads
 * "review, then commit" left-to-right in the eye's expected order. */
function ReviewPrimaryButton({
  action,
  onClick,
}: {
  action: AgentAction;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 56 }}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex flex-row items-center justify-between transition"
        style={{
          width: "100%",
          padding: "12px 18px",
          gap: 10,
          background: hover
            ? "var(--action-primary-hover)"
            : "var(--action-primary)",
          border: "1px solid var(--action-primary)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--action-on-primary)",
          transition: "background 140ms ease",
        }}
        aria-label={action.label}
      >
        <span
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--action-on-primary)",
          }}
        >
          {action.label}
        </span>
        <ArrowRight
          size={16}
          strokeWidth={1.75}
          color="var(--action-on-primary)"
          className="shrink-0"
        />
      </button>
    </div>
  );
}

/* Post to Yardi — SECONDARY CTA. Outline pill so it's clearly a commit
 * surface (matches the ladder) but doesn't out-shout Review records above.
 * Wraps the ConfirmPopoverButton so the "are you sure?" gesture stays. */
function PostToYardiSecondary({ action }: { action: AgentAction }) {
  const { startYardiUpdate } = useSession();
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 56 }}
    >
      <ConfirmPopoverButton
        label={action.label}
        sublabel={action.sublabel}
        variant="secondary"
        size="md"
        fullWidth
        rightIcon={<ArrowRight size={15} strokeWidth={1.75} />}
        confirmTitle="Post approved records to Yardi?"
        confirmBody={
          <>
            You&apos;re committing the approved records and flagging exceptions.
            Posting writes to Yardi and can&apos;t be undone.
          </>
        }
        confirmLabel="Post to Yardi"
        onConfirm={startYardiUpdate}
        align="left"
      />
    </div>
  );
}

/* Utility row — Rerun + Download are now small lifted chips instead of the
 * previous underlined middot-separated text. Chips read as tappable, sit
 * side-by-side, and match the rest of the system's chip vocabulary. Each
 * carries icon + label so the affordance is unambiguous. */
function UtilityRow({
  secondaryAction,
  artifact,
}: {
  secondaryAction?: AgentAction;
  artifact?: AgentArtifact;
}) {
  const items: {
    key: string;
    label: string;
    title?: string;
    icon: React.ReactNode;
  }[] = [];
  if (secondaryAction) {
    items.push({
      key: "rerun",
      label: secondaryAction.label,
      icon: <RotateCcw size={12} strokeWidth={1.75} />,
    });
  }
  if (artifact) {
    items.push({
      key: "download",
      label: "Download PDF",
      title: `${artifact.filename} · ${artifact.meta}`,
      icon: <Download size={12} strokeWidth={1.75} />,
    });
  }
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", paddingLeft: 56, gap: 8, paddingTop: 2 }}
    >
      {items.map((it) => (
        <UtilityChip
          key={it.key}
          label={it.label}
          title={it.title}
          icon={it.icon}
        />
      ))}
    </div>
  );
}

function UtilityChip({
  label,
  title,
  icon,
}: {
  label: string;
  title?: string;
  icon: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center transition"
      style={{
        height: 28,
        padding: "0 12px",
        gap: 6,
        background: hover ? "#FFFFFF" : "var(--surface-card-glow)",
        border: hover
          ? "1px solid rgba(157, 179, 197, 0.4)"
          : "1px solid rgba(157, 179, 197, 0.28)",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--text-1)",
        fontSize: 12,
        lineHeight: "14px",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

