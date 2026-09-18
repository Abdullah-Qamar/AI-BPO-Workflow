"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { ThinkingOrb } from "thinking-orbs";
import { AGENT_ORB } from "@/lib/v2/orb";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Landmark,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button, IconButton } from "./ui/Button";
import { Tooltip } from "./ui/Tooltip";
import { ConfirmPopoverButton } from "./ui/ConfirmPopoverButton";
import {
  STATUS_META,
  agents as seedAgents,
  bankCountsForSession,
  getBankMeta,
  type AgentAction,
  type AgentArtifact,
  type AgentFile,
  type AgentInsight,
  type AgentSectionData,
  type AgentSignoff,
  type AgentStatusLine,
  type BankProgressRow,
  type DotState,
  type PropertyBank,
  type PropertyRecord,
  type PropertySession,
  type RecordItem,
  type StatusKey,
  type StatusTone,
} from "@/lib/seed";
import { useSession } from "@/lib/session/SessionProvider";
import {
  allBanksReviewed,
  totalAgentApproved,
  totalApproved,
  totalExceptions,
} from "@/lib/session/reducer";
import type { SessionState } from "@/lib/session/types";
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

/* Leading dot on a timeline line. These are MARKS, so they come off the mark
 * aliases rather than the inks: `neutral` stays deliberately grey because a
 * cleanly-completed step is not an "ok" event worth colouring, only a step
 * that has happened. */
const DOT_COLOR: Record<DotState, string> = {
  pending: "var(--line)",
  neutral: "var(--ink-tertiary)",
  failed: "var(--status-danger)",
};

type Tab = "agents" | "knowledge";

/* Identity colour per agent — which one, never how it is doing. */
const AGENT_IDENTITY: Record<DerivedAgent["id"], string> = {
  intake: "var(--agent-intake)",
  reconciliation: "var(--agent-reconciliation)",
  summary: "var(--agent-summary)",
};

/* ---------- Derived shapes ----------
 *
 * The panel renders the seed's agent shape but never its numbers: every count
 * below is interpolated from the live session. Two fields are carried that the
 * seed type has no room for, both optional so a seed value still satisfies the
 * type:
 *
 *   statusKey  — which STATUS_META row the agent's sub-line names. Only set
 *                where the lifecycle alone would say the wrong thing, i.e. a
 *                run that stopped.
 *   bankId /
 *   reviewed   — a per-account progress row's link back to the account it
 *                counts, so the row can open the review filtered to it. */
type ReconBankRow = BankProgressRow & {
  bankId?: string;
  reviewed?: boolean;
  /* Held apart from the name so the name is what truncates. A masked account
   * number cut off mid-mask identifies nothing. */
  account?: string;
};

type DerivedLine = Omit<AgentStatusLine, "bankRows"> & {
  bankRows?: ReconBankRow[];
};

type DerivedAgent = Omit<AgentSectionData, "timeline" | "collapsedLine"> & {
  statusKey?: StatusKey;
  timeline: DerivedLine[];
  collapsedLine?: DerivedLine;
};

/* The agent avatar artwork. The `/` workspace uses the dot-grid marks; the
 * `/v2` hub reuses this whole panel but wants its own ThinkingOrb avatars, so
 * the variant rides a context rather than threading a prop through
 * AgentList → AgentSection → AgentAvatar. */
type AvatarVariant = "dotGrid" | "orb";
const AvatarVariantContext = createContext<AvatarVariant>("dotGrid");

export function AgentsPanel({
  collapsed = false,
  onToggle,
  onInspect,
  avatarVariant = "dotGrid",
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  /* Called when the user clicks Summary's "Review N records" inspect CTA, or
   * one of Reconciliation's per-account rows. The host (page.tsx) responds by
   * swapping the canvas to ReviewCanvas. */
  onInspect?: () => void;
  /* Which agent artwork to draw — dot-grid on `/`, ThinkingOrb on `/v2`. */
  avatarVariant?: AvatarVariant;
}) {
  const [tab, setTab] = useState<Tab>("agents");

  if (collapsed)
    return (
      <AvatarVariantContext.Provider value={avatarVariant}>
        <CollapsedAgentsRail onToggle={onToggle} />
      </AvatarVariantContext.Provider>
    );

  return (
    <AvatarVariantContext.Provider value={avatarVariant}>
    <aside
      className="flex flex-col items-stretch shrink-0 relative overflow-hidden"
      style={{
        /* White single-surface panel. Full viewport height with a matching
         * 12 px gap on top, right, and bottom; butts flush to MainCanvas on
         * the left. Inner scroll container handles overflow when the agent
         * list runs long. */
        position: "sticky",
        top: 12,
        alignSelf: "flex-start",
        height: "calc(100vh - 24px)",
        margin: "12px 12px 12px 0",
        width: 360,
        padding: "14px 13px 14px 14px",
        gap: 12,
        background: "var(--surface-card)",
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-card)",
        transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        className="flex flex-col items-start flex-1 relative"
        style={{
          width: "100%",
          minHeight: 0,
          gap: 12,
        }}
      >
        {/* Collapse chevron — absolutely positioned so it stays at the exact
         * same top-right pin regardless of what renders in the header row
         * (tab strip, empty, error, whatever). Previously nested in a flex
         * row and drifted when the row grew. */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
          <IconButton
            variant="ghost"
            size="md"
            onClick={onToggle}
            ariaLabel="Collapse agents"
          >
            <PanelRightClose size={16} strokeWidth={1.5} />
          </IconButton>
        </div>

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
          style={{
            width: "100%",
            minHeight: 0,
          }}
        >
          {tab === "agents" ? (
            <div
              className="flex flex-col items-start"
              style={{ width: "100%", gap: 12 }}
            >
              <PanelOutcome />
              <AgentList onInspect={onInspect} />
            </div>
          ) : (
            <KnowledgePanel />
          )}
        </div>
      </div>
    </aside>
    </AvatarVariantContext.Provider>
  );
}

/* The app's one tab recipe: --control-md tall, --radius-control, --type-body.
 * This strip used to be the only one at --type-title in a 35px pill, which is
 * both off the control scale and a size larger than every other tab in the
 * app. Spec: docs/design-system/decisions.md §2. */
function TabRow({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex flex-row items-center" style={{ gap: 2 }}>
      <TabButton
        active={tab === "agents"}
        onClick={() => setTab("agents")}
        label="Agents"
      />
      <TabButton
        active={tab === "knowledge"}
        onClick={() => setTab("knowledge")}
        label="Knowledge"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex justify-center items-center transition"
      style={{
        height: "var(--control-md)",
        padding: "0 12px",
        background: active ? "var(--surface-tab-active)" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-control)",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-body)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* The run's outcome, compiled into the panel head on the `/v2` hub (its centre
 * no longer carries a summary band). Self-gates: only the orb variant renders
 * it, and only once there is an outcome to state. Figures only — the Review /
 * Post actions already live on the Summary agent below, so no CTA is repeated
 * here. */
function formatSignedAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "−" : ""}$${abs}`;
}

function OutcomeFigure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
        }}
      >
        {label}
      </span>
      <span
        className="nums"
        style={{
          fontSize: "var(--type-title)",
          lineHeight: "var(--leading-tight)",
          color: tone ?? "var(--ink-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PanelOutcome() {
  const variant = useContext(AvatarVariantContext);
  const { state, records } = useSession();
  if (variant !== "orb") return null;
  const rs = state.runState;
  if (rs !== "review" && rs !== "updating-yardi" && rs !== "complete")
    return null;

  const approved = state.bankOrder.reduce(
    (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
    0
  );
  const exceptions = state.bankOrder.reduce(
    (n, id) => n + (state.banks[id]?.exceptionCount ?? 0),
    0
  );
  const total = approved + exceptions;
  const net = records
    .filter((r) => (state.recordStatusOverrides[r.id] ?? r.status) === "flagged")
    .reduce((n, r) => n + r.amount, 0);

  const status =
    rs === "complete"
      ? { text: "Posted to Yardi", tone: "var(--status-ok)", done: true }
      : rs === "updating-yardi"
      ? { text: "Posting to Yardi", tone: "var(--ink-tertiary)", done: false }
      : { text: "Ready for review", tone: "var(--ink-tertiary)", done: false };

  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        gap: 10,
        padding: "10px 12px",
        borderRadius: "var(--radius-sheet)",
        background: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-chip)",
      }}
    >
      <div className="flex flex-row" style={{ gap: 18 }}>
        <OutcomeFigure label="Reconciled" value={String(total)} />
        <OutcomeFigure
          label="Open"
          value={String(exceptions)}
          tone={exceptions > 0 ? "var(--status-warn-ink)" : undefined}
        />
        <OutcomeFigure label="Net difference" value={formatSignedAmount(net)} />
      </div>
      <div className="flex flex-row items-center" style={{ gap: 6 }}>
        {status.done && (
          <Check size={13} strokeWidth={2} color={status.tone} />
        )}
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: status.done ? "var(--ink-secondary)" : status.tone,
          }}
        >
          {status.text}
        </span>
      </div>
    </div>
  );
}

function AgentList({ onInspect }: { onInspect?: () => void }) {
  /* Live agents derived from session state. The seed's three-agent shape stays
   * the same — what changes is each agent's lifecycle (idle / working / done /
   * error) and every figure it quotes, all of which is interpolated from the
   * open session rather than read off the seed's frozen snapshot.
   *
   * Demo hook: the URL hash `#demo=error` flips Intake into the error state so
   * the design of that lifecycle branch is observable in the running app
   * without wiring a real failure path. Set the hash in the address bar to see
   * it; remove or change it to return to normal behavior. */
  const {
    state,
    property,
    session,
    banks,
    records,
    retryRun,
    openReview,
    markBankReviewed,
  } = useSession();
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
    () => deriveAgents({ state, property, session, banks, records, demoState }),
    [state, property, session, banks, records, demoState]
  );

  /* On the `/v2` hub an agent stays out of the panel until its work starts —
   * an idle agent is a step the run has not reached yet, so it is noise. The
   * `/` workspace keeps the full pipeline visible (idle agents shown greyed),
   * so this only applies to the orb variant. */
  const variant = useContext(AvatarVariantContext);
  const shown =
    variant === "orb" ? derived.filter((a) => a.state !== "idle") : derived;

  /* Records still waiting on a person, counted off the same list the review
   * canvas renders — so the collapsed badge and the panel's own figures cannot
   * disagree. */
  const openCount = useMemo(
    () => records.filter((r) => r.status === "flagged").length,
    [records]
  );

  /* The one place the review flow is entered per account. `openReview` records
   * which account the review is scoped to, `markBankReviewed` remembers that
   * the reviewer has been through it, and `onInspect` is what actually swaps
   * the canvas. */
  const handleOpenBank = useCallback(
    (bankId: string) => {
      openReview(bankId);
      markBankReviewed(bankId);
      onInspect?.();
    },
    [openReview, markBankReviewed, onInspect]
  );

  const handleDownload = useCallback(() => {
    downloadSessionReport({ state, property, session, records });
  }, [state, property, session, records]);

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 16 }}
    >
      {shown.map((a) => (
        <AgentSection
          key={a.id}
          data={a}
          onInspect={onInspect}
          onOpenBank={handleOpenBank}
          onRetry={retryRun}
          onDownload={handleDownload}
          downloadTitle={`${reportFileName(property, session, state)} · ${
            records.length
          } records`}
        />
      ))}
    </div>
  );
}

/* ---------- Deriving the three agents from the live session ---------- */

function isReconciledStage(stage: string | undefined): boolean {
  return stage === "reconciled" || stage === "posting" || stage === "posted";
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function deriveAgents({
  state,
  property,
  session,
  banks,
  records,
  demoState,
}: {
  state: SessionState;
  property: PropertyRecord;
  session: PropertySession | null;
  banks: PropertyBank[];
  records: RecordItem[];
  demoState: string;
}): DerivedAgent[] {
  const [intakeSeed, reconSeed, summarySeed] = seedAgents;
  const bankCount = banks.length;

  const idleRecon = (hint?: string): DerivedAgent => ({
    ...reconSeed,
    state: "idle",
    idleHint: hint ?? reconSeed.idleHint,
    collapsedLine: undefined,
    timeline: [],
  });
  const idleSummary = (hint?: string): DerivedAgent => ({
    ...summarySeed,
    state: "idle",
    idleHint: hint ?? summarySeed.idleHint,
    collapsedLine: undefined,
    timeline: [],
    insight: undefined,
    artifact: undefined,
    primaryAction: undefined,
    inspectAction: undefined,
    secondaryAction: undefined,
  });

  /* Demo hook — visible via URL hash `#demo=error` (or `#demo=intake-error`).
   * Overrides the naturally-derived Intake lifecycle so the error state's
   * design (red-tinted avatar, danger status text, inline error card + Retry)
   * is observable in the running app. */
  if (demoState === "error" || demoState === "intake-error") {
    return [
      {
        ...intakeSeed,
        state: "error",
        error: {
          title: "Ledger import stalled",
          body: "Yardi API returned a 503 while fetching the Wells Fargo ledger. Retrying could resolve if it was a transient outage.",
          retryLabel: "Retry import",
        },
        collapsedLine: undefined,
        timeline: [],
      },
      idleRecon(),
      idleSummary(),
    ];
  }

  const runState = state.runState;

  /* The run broke and stopped. Without this branch a failed session fell
   * through to the "complete" return and rendered three finished agents with
   * zero counts, contradicting the Failed badge on the row it was opened
   * from. */
  if (runState === "failed") {
    return [
      {
        ...intakeSeed,
        state: "error",
        statusKey: "failed",
        error: {
          title: "Run stopped",
          body:
            state.failureNote ??
            "The run stopped before intake could hand off. Nothing was reconciled.",
          retryLabel: "Retry run",
        },
        collapsedLine: undefined,
        timeline: [],
      },
      /* Not "Waiting": nothing is coming. The run stopped upstream of them. */
      { ...idleRecon("Did not run"), statusKey: "not-started" },
      { ...idleSummary("Did not run"), statusKey: "not-started" },
    ];
  }

  if (runState === "draft") {
    return [
      { ...intakeSeed, state: "idle", collapsedLine: undefined, timeline: [] },
      idleRecon(),
      idleSummary(),
    ];
  }

  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const reconciledBanks = banks.filter((b) =>
    isReconciledStage(state.banks[b.id]?.stage)
  );

  if (runState === "running") {
    /* Slim the timeline to what is plausibly known mid-run. */
    const intakeLines = liveIntakeTimeline(intakeSeed, bankCount);
    return [
      {
        ...intakeSeed,
        state: "working",
        collapsedLine: intakeLines[0],
        timeline: intakeLines.slice(0, 4),
      },
      idleRecon(),
      idleSummary(),
    ];
  }

  const doneIntake: DerivedAgent = {
    ...intakeSeed,
    state: "done",
    collapsedLine: liveIntakeCollapsed(intakeSeed, bankCount),
    timeline: liveIntakeTimeline(intakeSeed, bankCount),
  };

  if (runState === "reconciling") {
    const progressLine: DerivedLine = {
      id: "recon-live",
      runs: [
        {
          text: `Matching… ${reconciledBanks.length} of ${bankCount} ${plural(
            bankCount,
            "account",
            "accounts"
          )} · `,
          tone: "neutral",
        },
        { text: `${approved} matched`, tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: `${exceptions} open`, tone: "failed" },
      ],
      dotState: "neutral",
    };
    return [
      doneIntake,
      {
        ...reconSeed,
        state: "working",
        collapsedLine: progressLine,
        timeline: [
          {
            id: "recon-started",
            runs: [
              {
                text: `Reconciling ${bankCount} ${plural(
                  bankCount,
                  "account",
                  "accounts"
                )}`,
                tone: "neutral",
              },
            ],
            dotState: "neutral",
          },
          progressLine,
        ],
      },
      idleSummary(),
    ];
  }

  const doneRecon = withLiveReconTimeline(reconSeed, "done", state, banks);
  const liveSummary = withLiveSummary(
    summarySeed,
    state,
    property,
    session,
    records,
    bankCount
  );

  if (runState === "review") {
    /* Post to Yardi lives in Summary's CTA ladder — Review records is the dark
     * primary and Post to Yardi renders below as the outline secondary commit.
     * The canvas header goes quiet (see PhaseCTA's review branch) so the two
     * dark pills no longer compete for the same commit. */
    return [doneIntake, doneRecon, liveSummary];
  }

  if (runState === "updating-yardi") {
    const postedCount = state.bankOrder.filter(
      (id) => state.banks[id]?.stage === "posted"
    ).length;
    return [
      doneIntake,
      doneRecon,
      {
        ...liveSummary,
        state: "working",
        primaryAction: undefined,
        collapsedLine: {
          id: "summary-posting",
          runs: [
            {
              text: `Posting to Yardi · ${postedCount} of ${bankCount} ${plural(
                bankCount,
                "account",
                "accounts"
              )}`,
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
    doneIntake,
    doneRecon,
    {
      ...liveSummary,
      primaryAction: undefined,
      signoff:
        session && session.finishedOn !== "In progress"
          ? { by: session.ranBy, at: session.finishedOn }
          : summarySeed.signoff,
      collapsedLine: {
        id: "summary-complete",
        runs: [
          { text: "Posted · ", tone: "neutral" as StatusTone },
          { text: `${approved} records`, tone: "approved" as StatusTone },
          { text: " posted · ", tone: "neutral" as StatusTone },
          { text: `${exceptions} open`, tone: "failed" as StatusTone },
        ],
        dotState: "neutral" as DotState,
      },
    },
  ];
}

/* Intake's timeline, counted off the property's own accounts.
 *
 * The seed asserted "8 received, 6 classified, 2 failed, 4 pairs ready", which
 * cannot all be true at once — six classified files make three pairs, not
 * four. The pairs are the fixed quantity (two slots per account), so received
 * is the pairs plus whatever failed to classify, and the arithmetic closes.
 * Which files failed is real seed content and stays; only the counts move. */
function liveIntakeTimeline(
  intakeSeed: AgentSectionData,
  bankCount: number
): DerivedLine[] {
  const chips: AgentFile[] =
    intakeSeed.timeline.find((l) => l.id === "intake-failed")?.chips ?? [];
  const classified = bankCount * 2;
  const received = classified + chips.length;
  const pairs = `${bankCount} account ${plural(bankCount, "pair", "pairs")}`;

  const lines: DerivedLine[] = [
    {
      id: "intake-received",
      runs: [{ text: `Received · ${received} files`, tone: "neutral" }],
      dotState: "neutral",
    },
    {
      id: "intake-classified",
      runs: [
        {
          text: `Classified · ${classified} statements and ledgers matched`,
          tone: "neutral",
        },
      ],
      dotState: "neutral",
    },
  ];
  if (chips.length > 0) {
    lines.push({
      id: "intake-failed",
      runs: [
        {
          text: `Could not classify ${chips.length} ${plural(
            chips.length,
            "file",
            "files"
          )}`,
          tone: "failed",
        },
      ],
      dotState: "failed",
      chips,
    });
  }
  lines.push(
    {
      id: "intake-yardi",
      runs: [
        {
          text: `Checked ledger totals against Yardi · ${bankCount} of ${bankCount} ${plural(
            bankCount,
            "account",
            "accounts"
          )}`,
          tone: "neutral",
        },
      ],
      dotState: "neutral",
    },
    {
      id: "intake-normalized",
      runs: [{ text: `Normalized · ${pairs} ready`, tone: "neutral" }],
      dotState: "neutral",
    },
    {
      id: "intake-handoff",
      runs: [{ text: "Handed off to Reconciliation", tone: "neutral" }],
      dotState: "neutral",
    }
  );
  return lines;
}

function liveIntakeCollapsed(
  intakeSeed: AgentSectionData,
  bankCount: number
): DerivedLine {
  const chips: AgentFile[] =
    intakeSeed.timeline.find((l) => l.id === "intake-failed")?.chips ?? [];
  const pairs = `${bankCount} account ${plural(bankCount, "pair", "pairs")}`;
  const runs: DerivedLine["runs"] = [
    { text: `Handed off · ${pairs}`, tone: "neutral" },
  ];
  if (chips.length > 0) {
    runs.push(
      { text: " · ", tone: "neutral" },
      /* "Unclassified", not "flagged". A flagged EXCEPTION is a record the
       * agent could not settle; these are files it could not identify at all,
       * which is a different failure and happens a stage earlier. */
      {
        text: `${chips.length} ${
          chips.length === 1 ? "file" : "files"
        } unclassified`,
        tone: "failed",
      }
    );
  }
  return { id: "intake-collapsed", runs, dotState: "neutral", chips };
}

/* For the Reconciliation agent: replace the seed's static timeline & counts
 * with values derived from the live session — only the accounts that actually
 * went through reconciliation appear in the bankRows strip, and the headline
 * counts mirror the canvas banner.
 *
 * The account rows used to come from a hardcoded map of 1849 Westlake's four
 * accounts, so every other property in the portfolio reconciled zero rows. */
function withLiveReconTimeline(
  reconSeed: AgentSectionData,
  agentState: AgentSectionData["state"],
  state: SessionState,
  banks: PropertyBank[]
): DerivedAgent {
  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const total = approved + exceptions;
  const expected = bankCountsForSession(state.selectedSessionId);

  const liveBankRows: ReconBankRow[] = banks
    .filter((b) => isReconciledStage(state.banks[b.id]?.stage))
    .map((b) => {
      const meta = getBankMeta(b.id);
      const runtime = state.banks[b.id];
      const counted = expected[b.id] ?? { approved: 0, exceptions: 0 };
      return {
        id: `recon-${b.id}`,
        bankId: b.id,
        logoSrc: meta.logoSrc,
        shortName: meta.shortName,
        account: meta.account,
        /* How much of this account settled, over everything the session's
         * records say it holds. Matched is live, so the bar fills as a
         * reviewer works through the open items. */
        matched: runtime?.approvedCount ?? 0,
        total: counted.approved + counted.exceptions,
        reviewed: runtime?.reviewed ?? false,
      };
    });

  const reconciledCount = liveBankRows.length;

  return {
    ...reconSeed,
    state: agentState,
    collapsedLine: {
      id: "recon-collapsed",
      runs: [
        { text: `Reconciled ${total} records · `, tone: "neutral" },
        { text: `${approved} matched`, tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: `${exceptions} open`, tone: "failed" },
      ],
      dotState: "neutral",
    },
    timeline: [
      {
        id: "recon-started",
        runs: [
          {
            text: `Reconciling ${reconciledCount} ${plural(
              reconciledCount,
              "account",
              "accounts"
            )}`,
            tone: "neutral",
          },
        ],
        dotState: "neutral",
      },
      {
        id: "recon-matching",
        runs: [
          { text: `Matched ${total} records · `, tone: "neutral" },
          { text: `${approved} matched`, tone: "approved" },
          { text: " · ", tone: "neutral" },
          { text: `${exceptions} open`, tone: "failed" },
        ],
        dotState: "neutral",
        bankRows: liveBankRows,
      },
    ],
  };
}

/* For the Summary agent: the seed's deliverable shape stays, every figure in
 * it is rewritten from the live session — timeline, insight paragraph, CTA
 * labels and the Post-to-Yardi sublabel all count the same records. */
function withLiveSummary(
  summarySeed: AgentSectionData,
  state: SessionState,
  property: PropertyRecord,
  session: PropertySession | null,
  records: RecordItem[],
  bankCount: number
): DerivedAgent {
  const approved = totalApproved(state);
  const exceptions = totalExceptions(state);
  const total = approved + exceptions;

  return {
    ...summarySeed,
    state: "done",
    collapsedLine: {
      id: "summary-collapsed",
      runs: [
        { text: "Ready to post · ", tone: "neutral" },
        { text: `${approved} matched`, tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: `${exceptions} open`, tone: "failed" },
      ],
      dotState: "neutral",
    },
    timeline: [
      {
        id: "summary-compiled",
        runs: [{ text: "Compiled review summary", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "summary-verified",
        runs: [
          {
            text: `Verified ${total} target records in Yardi`,
            tone: "neutral",
          },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-approved",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: `${approved} records`, tone: "approved" },
          { text: " ready to post", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-flagged",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: `${exceptions} exceptions`, tone: "failed" },
          { text: " to flag in Yardi", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-report",
        runs: [{ text: "Drafted reconciliation report", tone: "neutral" }],
        dotState: "neutral",
      },
    ],
    insight: liveInsight(state, property, session, records, bankCount),
    /* The sign-off is an audit line about a run that has been closed, so it is
     * withheld until the session actually posts. The complete branch adds it
     * back with this session's own runner and finish time. */
    signoff: undefined,
    inspectAction: summarySeed.inspectAction
      ? { ...summarySeed.inspectAction, label: `Review ${total} records` }
      : undefined,
    primaryAction: summarySeed.primaryAction
      ? {
          ...summarySeed.primaryAction,
          sublabel: `${approved} matched · ${exceptions} open`,
        }
      : undefined,
  };
}

/* Summary's read-out. Same three beats the seed authored — what was
 * reconciled, where the exceptions cluster, how the match rate compares to
 * last cycle — but each beat is counted off this session's records and this
 * property's own history rather than quoting 1849 Westlake's May figures at
 * every property in the portfolio. A beat whose evidence is missing (no
 * repeated cause, no earlier closed cycle) is dropped rather than guessed. */
function liveInsight(
  state: SessionState,
  property: PropertyRecord,
  session: PropertySession | null,
  records: RecordItem[],
  bankCount: number
): AgentInsight | undefined {
  const total = totalApproved(state) + totalExceptions(state);
  if (total === 0) return undefined;

  /* The agent's own verdict, not the review's running total: this paragraph
   * describes what the run produced, and it must not improve because a
   * reviewer approved some of the leftovers. */
  const agentApproved = totalAgentApproved(state);
  const agentFlagged = records.filter((r) => r.status === "flagged");
  const sentences: string[] = [
    `Reconciled ${total} records across ${bankCount} ${plural(
      bankCount,
      "account",
      "accounts"
    )}; ${agentApproved} matched on their own and ${
      agentFlagged.length
    } are open for review.`,
  ];

  const byReason = new Map<string, number>();
  for (const r of agentFlagged) {
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  }
  let topReason = "";
  let topCount = 0;
  for (const [reason, n] of byReason) {
    if (n > topCount) {
      topReason = reason;
      topCount = n;
    }
  }
  if (topCount > 1) {
    sentences.push(
      `${topCount} of the ${agentFlagged.length} exceptions share one cause: ${lowerFirst(
        topReason
      )}.`
    );
  }

  const rate = Math.round((agentApproved / total) * 100);
  const prior = property.sessions.find(
    (s) => s.statusKey === "completed" && s.cycle !== (session?.cycle ?? "")
  );
  if (prior && prior.records > 0) {
    const priorRate = Math.round((prior.matched / prior.records) * 100);
    const delta = rate - priorRate;
    sentences.push(
      delta === 0
        ? `Match rate is ${rate}%, level with ${prior.cycle}.`
        : `Match rate is ${rate}%, ${Math.abs(delta)} ${plural(
            Math.abs(delta),
            "point",
            "points"
          )} ${delta < 0 ? "below" : "above"} ${prior.cycle}.`
    );
  } else {
    sentences.push(`Match rate is ${rate}%.`);
  }

  return { body: sentences.join(" ") };
}

/* Reasons are authored as sentence fragments starting with a capital ("New fee
 * code · no mapping in property setup"). Mid-sentence they need the capital
 * dropped, but only where it is not an initialism or a proper noun. */
function lowerFirst(s: string): string {
  if (s.length < 2) return s.toLowerCase();
  if (s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s;
  return s[0].toLowerCase() + s.slice(1);
}

/* ---------- The report the Download chip actually produces ----------
 *
 * The chip used to name a 14-page PDF that no code produced and no click could
 * reach. There is no PDF: the honest artifact is the session's own record
 * list, which the app already holds, so the button writes that out as CSV and
 * says so. */

function reportFileName(
  property: PropertyRecord,
  session: PropertySession | null,
  state: SessionState
): string {
  const label = session?.label ?? state.cycle;
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${slug(property.code)}-${slug(label)}-records.csv`;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadSessionReport({
  state,
  property,
  session,
  records,
}: {
  state: SessionState;
  property: PropertyRecord;
  session: PropertySession | null;
  records: RecordItem[];
}) {
  if (typeof document === "undefined") return;
  const statusOf = (r: RecordItem) =>
    state.recordStatusOverrides[r.id] ?? r.status;
  const approved = records.filter((r) => statusOf(r) === "approved").length;
  const label = session?.label ?? state.cycle;

  const rows: (string | number)[][] = [
    ["Property", property.shortAddress],
    ["Property code", property.code],
    ["Cycle", label],
    ["Records", records.length],
    ["Matched", approved],
    ["Exceptions", records.length - approved],
    [],
    ["Date", "Account", "Record", "Amount", "Status", "Confidence", "Reason"],
    ...records.map((r) => {
      const meta = getBankMeta(r.bankId);
      return [
        r.date,
        `${meta.shortName} ${meta.account}`,
        r.title,
        r.amount.toFixed(2),
        statusOf(r),
        r.confidence,
        state.recordComments[r.id]
          ? `${r.reason} · reviewer note: ${state.recordComments[r.id]}`
          : r.reason,
      ];
    }),
  ];

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = reportFileName(property, session, state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Deferred: revoking in the same tick can cancel the download the click
   * just started. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ---------- Collapsed ----------
 *
 * The collapsed panel was a 68px full-height white card holding a single
 * chevron: a tall empty column that read as something which had failed to load
 * rather than as something deliberately put away.
 *
 * It answers the same question the expanded panel answers — how are the agents
 * doing — in less room. Its own component rather than a branch inside
 * AgentsPanel, because it needs the session and AgentsPanel does not: a hook
 * called on one side of a conditional return is the one thing hooks cannot
 * survive.
 */
function CollapsedAgentsRail({ onToggle }: { onToggle?: () => void }) {
  const { state, property, session, banks, records } = useSession();
  const derived = useMemo(
    () => deriveAgents({ state, property, session, banks, records, demoState: "" }),
    [state, property, session, banks, records]
  );
  /* Records still waiting on a person, counted off the same list the review
   * canvas renders, so the badge and the panel's own figures cannot disagree. */
  const openCount = useMemo(
    () => records.filter((r) => r.status === "flagged").length,
    [records]
  );

  return (
    <aside
      className="flex flex-col items-center shrink-0"
      aria-label="Agents, collapsed"
      style={{
        position: "sticky",
        top: 12,
        alignSelf: "flex-start",
        height: "calc(100vh - 24px)",
        margin: "12px 12px 12px 0",
        /* 48, down from 68. A rail of 24px marks needs 48; the extra 20 was
         * empty on both sides of a single chevron. */
        width: 48,
        padding: "var(--space-5) var(--space-4)",
        gap: "var(--space-5)",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-card)",
        transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <IconButton
        variant="ghost"
        size="md"
        onClick={onToggle}
        ariaLabel="Expand agents"
      >
        <PanelRightOpen size={16} strokeWidth={1.5} />
      </IconButton>

      <span
        aria-hidden
        style={{
          width: 20,
          height: 1,
          background: "var(--line-hair)",
          flexShrink: 0,
        }}
      />

      {derived.map((agent) => (
        <CollapsedAgentMark
          key={agent.id}
          agent={agent}
          onClick={onToggle}
        />
      ))}

      <div className="flex-1" />

      {/* The one figure worth surfacing at 48px: how much is still open. It
        * is why a reader would reopen the panel at all. */}
      {openCount > 0 && (
        <span
          className="nums inline-flex items-center justify-center shrink-0"
          /* The app's own hint, not the browser's. A native `title` here drew
           * the one black OS chip on a light product — the exact thing
           * ui/Hint exists to have replaced. */
          data-hint={`${openCount} open ${
            openCount === 1 ? "record" : "records"
          }`}
          data-hint-side="left"
          style={{
            minWidth: "var(--control-sm)",
            height: "var(--control-sm)",
            padding: "0 6px",
            borderRadius: 999,
            background: "var(--status-warn-bg)",
            color: "var(--status-warn-ink)",
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          {openCount}
        </span>
      )}
    </aside>
  );
}

/* One agent as a 24px mark, for the collapsed rail.
 *
 * The dot is the agent's IDENTITY colour and the ring around it is its STATE —
 * two facts that must not share one channel, which is the mistake the guidance
 * panel used to make by tinting Summary with the failure red. Idle agents drop
 * to a hollow ring: nothing has happened for them yet, and an absence should
 * look like one. */
function CollapsedAgentMark({
  agent,
  onClick,
}: {
  agent: DerivedAgent;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const identity = AGENT_IDENTITY[agent.id];
  const idle = agent.state === "idle";
  const failed = agent.state === "error";

  return (
    <Tooltip
      label={`${agent.name} · ${
        failed
          ? STATUS_META.failed.label
          : idle
          ? "Waiting"
          : agent.state === "working"
          ? STATUS_META.active.label
          : STATUS_META.completed.label
      }`}
      side="left"
      tone={failed ? "danger" : idle ? "neutral" : "success"}
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`${agent.name}. Expand agents.`}
        className="flex items-center justify-center shrink-0"
        style={{
          width: "var(--control-md)",
          height: "var(--control-md)",
          borderRadius: 999,
          background: hover ? "var(--surface-control)" : "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 120ms ease",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: idle ? "transparent" : failed
              ? "var(--status-danger)"
              : identity,
            border: idle ? "1.5px solid var(--line)" : "none",
            /* A halo in the state colour, so "which agent" and "how is it
              * doing" are separable at a glance. */
            boxShadow: idle
              ? "none"
              : `0 0 0 3px ${
                  failed
                    ? "var(--status-danger-bg)"
                    : agent.state === "working"
                    ? "var(--status-info-bg)"
                    : "var(--status-ok-bg)"
                }`,
          }}
        />
      </button>
    </Tooltip>
  );
}

/* ---------- One agent ---------- */

/* Sub-line under an agent's name. Labels come from the one status table, so
 * this panel cannot call a finished run "Done" while the session row beside it
 * calls the same run "Completed". */
function statusLineFor(data: DerivedAgent): { label: string; color: string } {
  if (data.statusKey) {
    const tone = STATUS_META[data.statusKey].tone;
    return {
      label: STATUS_META[data.statusKey].label,
      color:
        tone === "neutral"
          ? "var(--ink-tertiary)"
          : `var(--status-${tone}-ink)`,
    };
  }
  switch (data.state) {
    case "error":
      /* An agent that broke is Failed, which is the word the status table and
       * every session row use for the same event. It said "Review" here — the
       * label for a run waiting on a person — printed in the danger ink, so the
       * colour and the word named two different states at once. */
      return {
        label: STATUS_META.failed.label,
        color: "var(--status-danger-ink)",
      };
    case "idle":
      return { label: "Waiting", color: "var(--ink-tertiary)" };
    case "working":
      return {
        label: STATUS_META.active.label,
        color: "var(--status-info-ink)",
      };
    default:
      return {
        label: STATUS_META.completed.label,
        color: "var(--ink-secondary)",
      };
  }
}

function AgentSection({
  data,
  onInspect,
  onOpenBank,
  onRetry,
  onDownload,
  downloadTitle,
}: {
  data: DerivedAgent;
  onInspect?: () => void;
  onOpenBank?: (bankId: string) => void;
  onRetry: () => void;
  onDownload: () => void;
  downloadTitle: string;
}) {
  const [expanded, setExpanded] = useState(!!data.defaultExpanded);
  const [hover, setHover] = useState(false);

  const isIdle = data.state === "idle";
  const isWorking = data.state === "working";
  const isError = data.state === "error";
  const status = statusLineFor(data);

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
          /* No inset. The avatar is 36 and the gap is 12, so a flush header
           * puts the agent's name on 48 — the same column the timeline dots,
           * the insight paragraph and the CTAs below it all indent to. The 2px
           * that used to be here pushed the name off that axis by exactly
           * itself. */
          paddingLeft: 0,
          gap: 12,
          minHeight: 36,
          background: "transparent",
          border: "none",
          cursor: canToggle ? "pointer" : "default",
        }}
      >
        <AgentAvatar agentId={data.id} agentState={data.state} />
        <div className="flex flex-col items-start flex-1" style={{ gap: 2 }}>
          <span
            className="t-title"
            style={{
              color: isIdle
                ? "var(--ink-tertiary)"
                : isError
                ? "var(--status-danger-ink)"
                : "var(--ink-primary)",
            }}
          >
            {data.name}
          </span>
          {/* Sub-line under the name — a stable state indicator so the reader
           * knows at a glance what mode each agent is in. Reads regardless of
           * whether the body is expanded/collapsed. */}
          <span className="t-meta" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
      </button>

      {/* Idle body — a single muted line so the agent stays visually present
       * in grey instead of collapsing to a bare header. */}
      {isIdle && data.idleHint && <IdleBody hint={data.idleHint} />}

      {/* Error body — inline error card + Retry. */}
      {isError && data.error && (
        <ErrorBody error={data.error} onRetry={onRetry} />
      )}

      {/* Working / done body. */}
      {!isIdle && !isError && (
        <>
          {expanded ? (
            <TimelineBody
              timeline={data.timeline}
              isWorking={isWorking}
              hover={hover}
              onToggle={() => setExpanded(false)}
              onOpenBank={onOpenBank}
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
           * these today. CTA ladder:
           *   tier 1 — insight paragraph (the read-out)
           *   tier 2 — Review records   (PRIMARY dark pill — first CTA a
           *                              reviewer should reach for)
           *   tier 3 — Post to Yardi    (outline secondary — the terminal
           *                              commit, still visible & one click
           *                              away but doesn't out-shout Review)
           *   tier 4 — Utility row      (Rerun · Download report) */}
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
          {data.signoff && <SignoffLine signoff={data.signoff} />}
          {(data.secondaryAction || data.artifact) && (
            <UtilityRow
              secondaryAction={data.secondaryAction}
              artifact={data.artifact}
              onRetry={onRetry}
              onDownload={onDownload}
              downloadTitle={downloadTitle}
            />
          )}
        </>
      )}
    </div>
  );
}

/* Error body — sits in the same body column as idle/collapsed lines so the
 * indent aligns. Two-part: a soft red-tinted card with title + explanation,
 * then a Retry button that actually restarts the run. */
function ErrorBody({
  error,
  onRetry,
}: {
  error: NonNullable<AgentSectionData["error"]>;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 48, gap: 10 }}
    >
      <div
        className="flex flex-col items-start"
        style={{
          width: "100%",
          padding: "6px 8px",
          gap: 4,
          background: "var(--chip-failed-bg)",
          border: "1px solid var(--chip-failed-border)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        <span
          className="t-body"
          style={{
            color: "var(--status-danger-ink)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          {error.title}
        </span>
        <span className="t-prose" style={{ color: "var(--ink-secondary)" }}>
          {error.body}
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        leftIcon={<RotateCcw size={14} strokeWidth={1.75} />}
      >
        {error.retryLabel ?? "Retry"}
      </Button>
    </div>
  );
}

/* ---------- Body — idle (greyed-out placeholder) ---------- */

/* Idle agents keep the same 48 px indent + leading dot + body column geometry
 * as the working/done states so the panel doesn't reflow when the agent
 * activates. */
function IdleBody({ hint }: { hint: string }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", paddingLeft: 48, gap: 6 }}
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
      <span className="flex-1 truncate t-meta" style={{ color: "var(--ink-tertiary)" }}>
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
  line: DerivedLine;
  isWorking: boolean;
  hover: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", paddingLeft: 48, gap: 6 }}
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
        {/* Per-account rows are deliberately hidden in collapsed view —
         * collapsed should stay compact (one summary line). The strip shows
         * only when the agent is expanded. */}
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
  onOpenBank,
}: {
  timeline: DerivedLine[];
  isWorking: boolean;
  hover: boolean;
  onToggle: () => void;
  onOpenBank?: (bankId: string) => void;
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
            style={{ width: "100%", paddingLeft: 48, gap: 6 }}
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
                <BankRowStrip rows={line.bankRows} onOpenBank={onOpenBank} />
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
            boxShadow: "var(--shadow-depth-1)",
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
          color: "var(--ink-primary)",
        }}
      >
        <Chevron size={14} strokeWidth={1.75} />
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
 * variant. Colored runs stay static so the inline numerics keep their signal —
 * shimmering them would blur the "196 approved · 8 flagged" read into noise. */
function StatusText({
  runs,
  shimmer,
}: {
  runs: DerivedLine["runs"];
  shimmer: boolean;
}) {
  return (
    /* Text flow, not a flex row. The runs are one sentence cut into coloured
     * pieces, and as flex items with `white-space: pre` they could only ever be
     * one line — so "Handed off · 4 account pairs · 2 files unclassified" ran
     * 5px past the 244px column and lost its last letter to the panel's own
     * overflow, with no ellipsis to say so. Laid out inline they wrap at a
     * space like any other sentence. `pre-wrap` keeps the spaces the runs carry
     * around their separators, which is what holds "· " together. */
    <div style={{ width: "100%", minHeight: 14 }}>
      {runs.map((run, j) => {
        const cls =
          shimmer && run.tone === "neutral"
            ? "text-grad-neutral-shimmer"
            : STATIC_TONE_CLASS[run.tone];
        return (
          <span
            key={j}
            className={`t-meta ${cls}`}
            style={{ whiteSpace: "pre-wrap" }}
          >
            {run.text}
          </span>
        );
      })}
    </div>
  );
}

/* Per-account progress strip — one row per account, attached under a status
 * line (currently used by Reconciliation). Each row carries:
 *   • bank logo (14×14)
 *   • short name + masked account (truncates at column width)
 *   • thin progress bar (matched / total)
 *   • numeric count, and a tick once the account has been reviewed
 *
 * The row is also the way into the review: it is the only surface that knows
 * which account a reviewer is about to look at, so it is the one that opens
 * the review scoped to it. */
function BankRowStrip({
  rows,
  onOpenBank,
}: {
  rows: ReconBankRow[];
  onOpenBank?: (bankId: string) => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 2 }}
    >
      {rows.map((r) => (
        <BankRow key={r.id} row={r} onOpenBank={onOpenBank} />
      ))}
    </div>
  );
}

function BankRow({
  row,
  onOpenBank,
}: {
  row: ReconBankRow;
  onOpenBank?: (bankId: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const pct = row.total > 0 ? Math.min(1, row.matched / row.total) : 0;
  const bankId = row.bankId;
  const interactive = !!bankId && !!onOpenBank;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={interactive ? () => onOpenBank?.(bankId!) : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={
        interactive
          ? `Review ${row.shortName}${row.account ? ` ${row.account}` : ""}`
          : undefined
      }
      data-hint={`${row.shortName}${row.account ? ` ${row.account}` : ""}`}
      className="flex flex-row items-center text-left transition relative"
      style={{
        width: "100%",
        height: "var(--row-sm)",
        padding: "0 6px 3px",
        gap: 8,
        /* One hover, everywhere: lift to white on a transparent resting
         * border so nothing shifts. */
        background: hover && interactive ? "#FFFFFF" : "transparent",
        border:
          hover && interactive
            ? "1px solid var(--line-row-hover)"
            : "1px solid transparent",
        boxShadow: hover && interactive ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: interactive ? "pointer" : "default",
      }}
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
        className="flex-1 truncate t-meta"
        style={{ color: "var(--ink-primary)", minWidth: 0 }}
      >
        {row.shortName}
      </span>
      {row.account && (
        <span
          className="shrink-0 nums t-meta"
          style={{ color: "var(--ink-tertiary)" }}
        >
          {row.account}
        </span>
      )}
      {/* The bar runs along the row's own bottom edge rather than taking a
       * 48px column of its own. In a 240px column that column was the
       * difference between "Wells Fargo SD ******7782" and "W…": the account's
       * name is what the row is for, and the bar says the same thing the
       * fraction beside it already says. */}
      <span
        aria-hidden
        style={{
          /* Starts where the name starts, not at the row edge: a rule that ran
           * the full width would read as table ruling rather than as this
           * row's meter. */
          position: "absolute",
          left: 28,
          right: 6,
          bottom: 3,
          height: 2,
          borderRadius: 2,
          background: "rgba(48, 59, 69, 0.06)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            width: `${pct * 100}%`,
            height: "100%",
            background: "var(--line)",
            transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </span>
      <span
        className="shrink-0 nums t-meta"
        style={{
          color: "var(--ink-tertiary)",
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {row.matched}/{row.total}
      </span>
      {/* Fixed-width gutter so the tick appearing cannot reflow the columns. */}
      <span
        className="shrink-0 inline-flex items-center justify-center"
        style={{ width: 14, height: 14, color: "var(--status-ok)" }}
        data-hint={row.reviewed ? "Reviewed" : undefined}
      >
        {row.reviewed && <Check size={14} strokeWidth={1.75} />}
      </span>
    </button>
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

/* A file intake could not classify. Deliberately inert: there is no parsed
 * content behind it to open or download, so it carries no hover, no cursor and
 * no click — it is a label naming the file, and looking like a control it is
 * not would be the worse defect. */
function FileChip({ file }: { file: AgentFile }) {
  const Icon = file.icon === "file-text" ? FileText : Landmark;
  return (
    <div
      className="flex flex-row items-center flex-1 min-w-0"
      style={{
        /* Chip height comes off the control scale like every other chip in the
         * app; 22 was a one-off two pixels below it. */
        height: "var(--control-sm)",
        padding: "0 6px",
        gap: 6,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: "var(--radius-control)",
      }}
      data-hint={file.label}
    >
      <Icon size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      <span
        className="flex-1 truncate t-meta"
        style={{ color: "var(--ink-primary)" }}
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
  const variant = useContext(AvatarVariantContext);
  const visual = AGENT_VISUAL[agentId];
  const idle = agentState === "idle";
  const error = agentState === "error";
  /* Sized up from 26 → 44 so each pattern's silhouette (stars / pulse /
   * summary curve) is clearly readable — at 26 px the fields shrunk faster
   * than the eye could parse.
   *
   * State palette:
   *   working — full contrast, motion running
   *   done    — same contrast, motion continues (agents keep breathing)
   *   idle    — paused at t=0, muted tertiary ink
   *   error   — paused at t=0, danger ink so the signature shape holds a
   *             failed-tone signal even before you read the status line
   *
   * The colour is set as this wrapper's `color` rather than passed as a hex:
   * the canvas resolves its fill from the computed colour, which is what lets
   * a design token drive artwork. The avatar is keyed by tone because that
   * resolution happens once per mount. */
  const tone = error ? "error" : idle ? "idle" : "live";
  const inkForTone = {
    error: "var(--status-danger-ink)",
    idle: "var(--ink-tertiary)",
    live: "var(--ink-primary)",
  }[tone];
  return (
    <div
      className="shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius-sheet)",
        /* No red container in the error state — the failure already reads in the
         * greyed orb, the danger-ink name, and the "Run stopped" card below. */
        background: variant === "orb" ? "transparent" : "var(--surface-card)",
        border: "1px solid transparent",
      }}
    >
      {variant === "orb" ? (
        /* The `/v2` hub's own agent artwork. thinking-orbs ships only a 20px
         * and a 64px preset; the 20 reads too small and faint here, so the mark
         * is the richer 64px design scaled down to ~29px — clearly bigger than
         * the native inline preset. The 64px layout box is clipped by the
         * tile's overflow:hidden. It keeps animating in every state (the hub's
         * agents "breathe" when done); error greys and the wrapper tints red. */
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "scale(0.46)",
            transformOrigin: "center",
            opacity: idle ? 0.5 : 1,
            filter: error ? "grayscale(0.4)" : undefined,
          }}
        >
          <ThinkingOrb state={AGENT_ORB[agentId]} size={64} theme="light" />
        </div>
      ) : (
        <DotGridAvatar
          key={tone}
          size={36}
          pattern={visual.pattern}
          paused={idle || error}
          spacing={4}
          baseRadius={0.42}
          amp={1.35}
          baseAlpha={idle || error ? 0.2 : 0.26}
          peakAlpha={idle || error ? 0.55 : 1.0}
          edgeFadeFrac={0.09}
          style={{ color: inkForTone }}
        />
      )}
    </div>
  );
}

/* ---------- Summary deliverables ---------- */

/* All deliverable surfaces share the same 48 px left indent so they align with
 * the timeline column above. Each one is single-purpose and visually distinct
 * from the timeline so they don't read as additional status lines. */

/* No chip, no heading — the insight sits as a quiet paragraph in the
 * timeline column. The body itself is the signal; framing it as a "card"
 * was making it compete with the actual CTAs.
 *
 * Sized to read as the headline content for Summary — the status line above
 * stays the count signal, the CTAs below stay the action ladder, and this
 * paragraph carries the read-out. */
function InsightCard({ insight }: { insight: AgentInsight }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: "100%",
        paddingLeft: 48,
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "var(--type-title)",
          lineHeight: "var(--leading-prose)",
          letterSpacing: "var(--tracking-title)",
          fontWeight: "var(--weight-regular)",
          color: "var(--ink-primary)",
        }}
      >
        {insight.body}
      </p>
    </div>
  );
}

/* The audit line: who closed this run and when. One line, tertiary ink — it is
 * a fact to be able to cite later, not something the reviewer acts on, so it
 * sits below the CTAs rather than competing with them. */
function SignoffLine({ signoff }: { signoff: AgentSignoff }) {
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", paddingLeft: 48, paddingTop: 2 }}
    >
      <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
        Closed by {signoff.by} · {signoff.at}
      </span>
    </div>
  );
}

/* Review records — PRIMARY CTA in the Summary agent. Dark pill: this is the
 * first action a reviewer should reach for once reconciliation completes.
 * Sits above the outline Post-to-Yardi commit so the ladder reads
 * "review, then commit". */
function ReviewPrimaryButton({
  action,
  onClick,
}: {
  action: AgentAction;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 48 }}
    >
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={onClick}
        rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
        ariaLabel={action.label}
      >
        {action.label}
      </Button>
    </div>
  );
}

/* Post to Yardi — SECONDARY CTA. Outline pill so it's clearly a commit
 * surface (matches the ladder) but doesn't out-shout Review records above.
 * Wraps the ConfirmPopoverButton so the "are you sure?" gesture stays. */
function PostToYardiSecondary({ action }: { action: AgentAction }) {
  const { startYardiUpdate, state } = useSession();
  const reviewedCount = state.bankOrder.filter(
    (id) => state.banks[id]?.reviewed
  ).length;
  const everyAccountReviewed = allBanksReviewed(state);
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", paddingLeft: 48 }}
    >
      <ConfirmPopoverButton
        label={action.label}
        sublabel={action.sublabel}
        variant="secondary"
        size="md"
        fullWidth
        rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
        confirmTitle="Post approved records to Yardi?"
        confirmBody={
          <>
            {everyAccountReviewed
              ? "Every account has been reviewed. "
              : `${reviewedCount} of ${state.bankOrder.length} accounts reviewed. `}
            You&apos;re committing the approved records and flagging exceptions.
            Posting writes to Yardi and can&apos;t be undone.
          </>
        }
        confirmLabel="Post to Yardi"
        onConfirm={startYardiUpdate}
        /* Right, not left: the button is indented 48px into a 360px panel, so
         * a popover anchored to its left edge runs 36px past the panel and is
         * clipped by the panel's own overflow. */
        align="right"
      />
    </div>
  );
}

/* Utility row — the two tertiary actions, on the shared Button primitive at
 * its smallest size rather than a bespoke chip. Both now do what they say:
 * Rerun restarts the run behind a confirm, Download writes the session's
 * records out as a file. */
function UtilityRow({
  secondaryAction,
  artifact,
  onRetry,
  onDownload,
  downloadTitle,
}: {
  secondaryAction?: AgentAction;
  artifact?: AgentArtifact;
  onRetry: () => void;
  onDownload: () => void;
  downloadTitle: string;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", paddingLeft: 48, gap: 8, paddingTop: 2 }}
    >
      {/* The seed's artifact is the promise that a report exists; its filename
       * and "14 pages · 2.3 MB" described a PDF nothing produced, so the
       * tooltip names the file this button actually writes. */}
      {artifact && (
        <span data-hint={downloadTitle} className="shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownload}
            leftIcon={<Download size={14} strokeWidth={1.75} />}
            ariaLabel="Download reconciliation report"
          >
            Download report
          </Button>
        </span>
      )}
      <div className="flex-1" />
      {secondaryAction && (
        /* Rerun sits at the row's right edge and its confirm hangs off that
         * edge: the popover is 320px wide and the panel's content column is
         * 320px, so anchored anywhere further left it would be cut off by the
         * panel. The visible label is trimmed to fit the line; the full label
         * stays as the accessible name and the tooltip. */
        <span data-hint={secondaryAction.label} className="shrink-0">
          <ConfirmPopoverButton
            label="Rerun"
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={14} strokeWidth={1.75} />}
            confirmTitle={`${secondaryAction.label}?`}
            confirmBody="Clears this session back to its uploads so it can be run again. Reviewer decisions on the current records are discarded."
            confirmLabel="Rerun"
            onConfirm={onRetry}
            align="right"
            ariaLabel={secondaryAction.label}
          />
        </span>
      )}
    </div>
  );
}
