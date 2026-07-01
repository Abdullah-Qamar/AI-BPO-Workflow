"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FileText,
  Landmark,
  SquareChevronLeft,
  SquareChevronRight,
} from "lucide-react";
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
import { PixelField, type PixelFieldShape } from "./PixelField";
import { KnowledgePanel } from "./KnowledgePanel";

/* Per-agent avatar art. Active accents pull directly from the three workspace
 * status dots (#001AFF blue, #1EFF00 green, #FF0000 red), distributed one
 * per agent so the panel reads as three distinct organisms. The idle/grey
 * variant is handled below in AgentAvatar — same dots palette, no accent
 * color, so the bloom reads as "present but inactive". */
const AGENT_VISUAL: Record<
  AgentSectionData["id"],
  { shape: PixelFieldShape; accent: string }
> = {
  intake: { shape: "arrow", accent: "#001AFF" },
  reconciliation: { shape: "cluster", accent: "#1EFF00" },
  summary: { shape: "swirl", accent: "#FF0000" },
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
          width: 80,
          padding: "28px 20px",
          gap: 16,
          background: "var(--bg-side)",
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
      className="flex flex-row items-stretch shrink-0"
      style={{
        width: 400,
        padding: 12,
        gap: 10,
        background: "var(--bg-side)",
      }}
    >
      <div
        className="flex flex-col items-start flex-1"
        style={{
          padding: "12px 16px 12px 12px",
          gap: 24,
          background: "var(--surface-card)",
          boxShadow: "var(--shadow-card)",
          borderRadius: "var(--radius-panel)",
        }}
      >
        <div
          className="flex flex-row items-center"
          style={{ width: "100%", gap: 8 }}
        >
          <TabRow tab={tab} setTab={setTab} />
          <div className="flex-1" />
          <button
            onClick={onToggle}
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              color: "var(--text-2)",
              cursor: "pointer",
            }}
            aria-label="Collapse agents"
            title="Collapse agents"
          >
            <SquareChevronRight size={20} strokeWidth={2} />
          </button>
        </div>
        {tab === "agents" ? <AgentList onInspect={onInspect} /> : <KnowledgePanel />}
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
   * has reached review. */
  const { state } = useSession();
  const derived = useMemo(() => deriveAgents(state.runState, state), [state]);
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
  state: ReturnType<typeof useSession>["state"]
): AgentSectionData[] {
  const [intakeSeed, reconSeed, summarySeed] = seedAgents;
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
    /* During review the canvas's PhaseCTA "Post to Yardi" is the single
     * commit surface. Summary's primaryAction is suppressed here so the user
     * isn't presented with two dark pills for the same action. The Summary
     * panel keeps the insight + Review + utility row — narration only. */
    return [
      { ...intakeSeed, state: "done" },
      withLiveReconTimeline(reconSeed, "done", state),
      { ...withLiveSummary(summarySeed, state), primaryAction: undefined },
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

  /* The entire header is a click target when the body has content to toggle
   * — easier ergonomics than the small chevron-in-dot affordance below. */
  const canToggle = !isIdle && (!!data.collapsedLine || data.timeline.length > 0);

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
          paddingLeft: 4,
          gap: 12,
          height: 28,
          background: "transparent",
          border: "none",
          cursor: canToggle ? "pointer" : "default",
        }}
      >
        <AgentAvatar agentId={data.id} idle={isIdle} />
        <span
          className="flex-1"
          style={{
            fontSize: 16,
            lineHeight: "19px",
            color: isIdle ? "var(--text-4)" : "var(--text-1)",
          }}
        >
          {data.name}
        </span>
      </button>

      {/* Idle body — a single muted line so the agent stays visually present
       * in grey instead of collapsing to a bare header. Shows what the agent
       * is waiting on; no shimmer, no actions, no chips. */}
      {isIdle && data.idleHint && <IdleBody hint={data.idleHint} />}

      {/* Working / done body. */}
      {!isIdle && (
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
           * these today. Hierarchy is three tiers so the eye knows where to go:
           *   tier 1 (information) — insight callout
           *   tier 2 (secondary)   — Review (recommended pre-commit step)
           *   tier 3 (primary)     — Post to Yardi (the commit)
           *   tier 4 (utility)     — Rerun + Download collapsed into one
           *                          quiet middot-separated row
           * Earlier iteration had 4 equal-weight CTAs which forced the user
           * to triage instead of act — the utility row fixes that. */}
          {data.insight && <InsightCard insight={data.insight} />}
          {data.inspectAction && (
            <InspectButton action={data.inspectAction} onClick={onInspect} />
          )}
          {data.primaryAction && (
            <PrimaryCommitButton action={data.primaryAction} />
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

/* ---------- Body — idle (greyed-out placeholder) ---------- */

/* Idle agents keep the same 42 px indent + leading dot + body column geometry
 * as the working/done states so the panel doesn't reflow when the agent
 * activates. Dot is the lightest grey ("pending"), text uses --text-4 — both
 * say "present but inactive" without competing with active agents. */
function IdleBody({ hint }: { hint: string }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", paddingLeft: 42, gap: 6 }}
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
      style={{ width: "100%", paddingLeft: 42, gap: 6 }}
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
            style={{ width: "100%", paddingLeft: 42, gap: 6 }}
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
  idle,
}: {
  agentId: AgentSectionData["id"];
  idle: boolean;
}) {
  const visual = AGENT_VISUAL[agentId];
  /* Idle = PixelField rendered statically (speed 0 = peak-pose hold in
   * PATTERNS; see PixelField.tsx). Colors collapse onto a uniform mid-grey
   * so the agent's signature shape (arrow / cluster / swirl) reads clearly
   * but carries no color signal. Active runs the bloom at full speed with
   * the agent's bright workspace-dot accent. */
  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{ width: 24, height: 24, borderRadius: 5 }}
    >
      <PixelField
        shape={visual.shape}
        size={24}
        gridSize={12}
        samples={2}
        speed={idle ? 0 : 1}
        dotColor={idle ? "#A8A9AD" : "#43484E"}
        accentColor={idle ? "#A8A9AD" : visual.accent}
        accentReach={0.7}
        bgColor="#F7F8FA"
        dotBase={0.12}
        dotMax={1.0}
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
        paddingLeft: 42,
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

/* Inspect — chip-style button that hands off to the canvas detail view.
 * Sits between insight and download because reviewing the records is the
 * natural next step after reading the headline. */
function InspectButton({
  action,
  onClick,
}: {
  action: AgentAction;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 42 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-row items-center justify-between transition"
        style={{
          width: "100%",
          padding: "9px 16px",
          gap: 8,
          background: "var(--surface-card-glow)",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
          borderRadius: 999,
          cursor: "pointer",
        }}
        aria-label={action.label}
      >
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-1)",
          }}
        >
          {action.label}
        </span>
        <ArrowUpRight
          size={14}
          strokeWidth={1.5}
          color="#43484E"
          className="shrink-0"
        />
      </button>
    </div>
  );
}

/* Utility row — collapses rerun + download into one quiet middot-separated
 * line beneath the primary CTA. Reads as "you can also do these" without
 * competing for attention with the dark pill above. Both links are visually
 * identical so neither outranks the other; the user picks by need. */
function UtilityRow({
  secondaryAction,
  artifact,
}: {
  secondaryAction?: AgentAction;
  artifact?: AgentArtifact;
}) {
  const items: { key: string; label: string; title?: string }[] = [];
  if (secondaryAction) {
    items.push({ key: "rerun", label: secondaryAction.label });
  }
  if (artifact) {
    items.push({
      key: "download",
      label: "Download PDF",
      title: `${artifact.filename} · ${artifact.meta}`,
    });
  }
  return (
    <div
      className="flex flex-row items-center justify-center"
      style={{ width: "100%", paddingLeft: 42, gap: 8, height: 16 }}
    >
      {items.map((it, i) => (
        <span
          key={it.key}
          className="flex flex-row items-center"
          style={{ gap: 8 }}
        >
          {i > 0 && (
            <span
              aria-hidden
              style={{
                width: 2,
                height: 2,
                borderRadius: 999,
                background: "var(--text-2)",
                opacity: 0.5,
                display: "inline-block",
              }}
            />
          )}
          <button
            type="button"
            title={it.title}
            aria-label={it.label}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-2)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              textDecorationColor: "rgba(98,116,131,0.35)",
            }}
          >
            {it.label}
          </button>
        </span>
      ))}
    </div>
  );
}

/* Primary commit — the dark pill that posts the run to Yardi. Sits at the
 * same 42 px indent as the rest of Summary's body so the dot column stays
 * the visual spine, but uses --action-primary to dominate the surface area.
 * Two-line label: action up top, scope ("52 approved · 16 flagged") below. */
function PrimaryCommitButton({ action }: { action: AgentAction }) {
  const { startYardiUpdate } = useSession();
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 42 }}
    >
      <button
        type="button"
        onClick={startYardiUpdate}
        className="flex flex-row items-center justify-between transition"
        style={{
          width: "100%",
          padding: action.sublabel ? "10px 18px" : "12px 18px",
          gap: 10,
          background: "var(--action-primary)",
          border: "1px solid var(--action-primary)",
          boxShadow: "var(--shadow-chip)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--action-on-primary)",
        }}
        aria-label={action.label}
      >
        <div className="flex flex-col items-start" style={{ gap: 2 }}>
          <span
            style={{
              fontSize: 14,
              lineHeight: "17px",
              color: "var(--action-on-primary)",
            }}
          >
            {action.label}
          </span>
          {action.sublabel && (
            <span
              style={{
                fontSize: 11,
                lineHeight: "13px",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {action.sublabel}
            </span>
          )}
        </div>
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

