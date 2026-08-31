"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Plus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CURRENT_CYCLE,
  aiThroughput,
  cycleOptions,
  cyclePulseFor,
  dashboardSessionsFor,
  previousCycle,
  shortCycle,
  type DashboardSession,
  type DashboardState,
} from "@/lib/seed";
import { NewSessionModal } from "./NewSessionModal";
import { Button } from "./ui/Button";
import { Tooltip } from "./ui/Tooltip";
import { ConfirmPopoverButton } from "./ui/ConfirmPopoverButton";
import { CyclePicker } from "./ui/CyclePicker";

interface DashboardCanvasProps {
  /* A row opens the session it describes. Both ids are passed because the host
   * resolves the property and then the exact session within it — a property can
   * have two sessions in one cycle when a failed run was re-run. */
  /* `sessionId` opens that exact session. Where it is empty the host resolves
   * the property's own session in `cycle`, falling back to a fresh draft. */
  onOpenSession?: (propertyId: string, sessionId: string, cycle?: string) => void;
  /* AI Performance is its own route now, so this hands navigation up rather
   * than swapping a view inside this component. */
  onOpenObservability?: () => void;
}

/* Dashboard.
 *
 * Two things, in priority order: how the AI is performing, and what still needs
 * a person. The AI block is flat type on the canvas rather than a card, so the
 * one lifted surface on the screen is the list the reader is actually working.
 *
 * The cycle's month picker, progress and status counts all live inside that
 * list, because they describe the list. Floating them in a separate strip above
 * made the reader look in two places to answer one question. */
export function DashboardCanvas({
  onOpenSession,
  onOpenObservability,
}: DashboardCanvasProps) {
  const [tab, setTab] = useState<DashboardState>("review");
  const [modalOpen, setModalOpen] = useState(false);
  const [cycle, setCycle] = useState(CURRENT_CYCLE);
  /* Sessions the reader has just asked to re-run. The prototype has no queue
   * behind it, so the rows say "Queued" rather than pretending to progress —
   * an honest acknowledgement beats a button that does nothing. */
  const [rerunning, setRerunning] = useState<string[]>([]);

  /* The whole screen is scoped to the chosen cycle — the figures, the progress
   * and the list. The picker used to set a piece of state nothing read, so
   * choosing April moved the label and left May's eighteen rows underneath it.
   *
   * Sorted most-recently-worked-on first, which is the order someone triaging
   * wants. minutesAgo drives the sort and the label both, so they cannot drift
   * apart. */
  const byState = useMemo(() => {
    const rows = dashboardSessionsFor(cycle);
    return {
      review: rows.filter((s) => s.state === "review"),
      failed: rows.filter((s) => s.state === "failed"),
      completed: rows.filter((s) => s.state === "completed"),
    };
  }, [cycle]);

  const pulse = useMemo(() => cyclePulseFor(cycle), [cycle]);
  /* Re-scoping the screen clears the acknowledgement — it described the cycle
   * that was open when it was made. */
  useEffect(() => setRerunning([]), [cycle]);
  const rows = byState[tab];

  return (
    <main
      className="canvas-pad flex flex-col items-center flex-1 min-w-0 relative overflow-hidden"
      style={{ background: "var(--bg-grad)" }}
    >
      {/* min-h-0 lets the list below actually shrink-to-fit and scroll inside
        * itself, which is what lets it run to the bottom of the viewport. */}
      <div
        className="flex flex-col min-h-0"
        style={{ width: "100%", maxWidth: 1120, gap: "var(--space-7)", flex: 1 }}
      >
        <Header
          onStartRun={() => setModalOpen(true)}
          cycle={cycle}
          onCycleChange={setCycle}
        />
        <AIPerformance
          cycle={cycle}
          onOpenDetails={() => onOpenObservability?.()}
        />
        <RunList
          tab={tab}
          setTab={setTab}
          rows={rows}
          pulse={pulse}
          queued={rerunning}
          onOpen={(s) => onOpenSession?.(s.propertyId, s.sessionId)}
          onRerunFailed={() => setRerunning(byState.failed.map((s) => s.id))}
          counts={{
            review: byState.review.length,
            failed: byState.failed.length,
            completed: byState.completed.length,
          }}
        />
      </div>

      <NewSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(propertyId, chosenCycle) => {
          setModalOpen(false);
          /* The cycle the modal was set to, not the one the Dashboard happens
           * to be scoped to. It used to be dropped here, so choosing "Apr 2026"
           * in the picker and then a property silently started the current
           * cycle instead — a control that answers a question and then has its
           * answer thrown away.
           *
           * No session id: the host resolves the property's session in that
           * cycle, or opens a draft where the cycle has not been run. */
          onOpenSession?.(propertyId, "", chosenCycle);
        }}
      />
    </main>
  );
}

/* No leading icon. A 24px heading that reads "Dashboard", beside a rail item
 * that reads "Dashboard", beside a glyph of a dashboard, was three statements of
 * one fact — and the icon pushed the title 28px right of every other left edge
 * on the page. Dropping it aligns the heading with the content column beneath
 * it, which is what the eye actually uses. */
function Header({
  onStartRun,
  cycle,
  onCycleChange,
}: {
  onStartRun: () => void;
  cycle: string;
  onCycleChange: (c: string) => void;
}) {
  return (
    <div
      className="flex flex-row items-center shrink-0"
      style={{ width: "100%", gap: "var(--space-4)", height: "var(--control-lg)" }}
    >
      <h1
        className="t-display flex-1 truncate"
        style={{ color: "var(--ink-primary)" }}
      >
        Dashboard
      </h1>
      {/* The cycle scopes the whole screen — the figures below it and the list
        * below those — so it belongs in the page header, not inside one of the
        * things it scopes. It sits left of the primary action, which always
        * holds the far right. */}
      <CyclePicker value={cycle} options={cycleOptions} onChange={onCycleChange} />
      <Button
        variant="primary"
        size="lg"
        onClick={onStartRun}
        leftIcon={<Plus size={14} strokeWidth={1.75} />}
      >
        New session
      </Button>
    </div>
  );
}

/* ---------- AI performance ----------
 *
 * Two readings and a way in.
 *
 * They used to be set as inline sentences — "90% accurate, +2 vs Apr" — with
 * the figure at --type-heading. That reads fluently and scans badly: the number
 * and the word that qualifies it sat at the same optical weight, so nothing on
 * the strip led, and at 20px the two figures did not hold their own against the
 * 24px page title directly above them.
 *
 * Label above, figure beneath, trend alongside. Three things follow:
 *
 *   1. The figure is the biggest thing in its own block and can take
 *      --type-display, because the label above it is doing the naming and the
 *      number no longer has to carry a word at its own size.
 *   2. A reader reads the label, then the number under it. Number-then-hunt-
 *      for-what-it-counts is the failure mode of a bare metric row.
 *   3. The two readings become blocks, so a rule between them separates them
 *      without a gap wide enough to read as two sections.
 *
 * This is the same construction as the Reading component on the AI Performance
 * page, deliberately: the Dashboard strip is a two-item preview of that screen
 * and should look like one. */
function AIPerformance({
  cycle,
  onOpenDetails,
}: {
  cycle: string;
  onOpenDetails: () => void;
}) {
  /* Both figures belong to the cycle the page is scoped to. They used to read
   * a module constant, so re-scoping the screen to April left January's list
   * under May's accuracy. `aiThroughput` carries a point per cycle; the two
   * figures and their comparisons come from it and from the point before it. */
  const prev = previousCycle(cycle);
  const point = aiThroughput.find((p) => p.cycle === cycle);
  const prevPoint = prev ? aiThroughput.find((p) => p.cycle === prev) : undefined;
  const vs = prev ? `vs ${shortCycle(prev)}` : "vs prior cycle";

  /* Outside the trend series' range there is nothing honest to print. */
  if (!point) return null;

  const accuracy = point.successRate;
  const accuracyTrend = prevPoint ? accuracy - prevPoint.successRate : 0;
  const tokensUsed = point.tokens;
  const tokensTrendPct = prevPoint
    ? Math.round(((tokensUsed - prevPoint.tokens) / prevPoint.tokens) * 100)
    : 0;
  const o = {
    accuracy,
    accuracyTrend,
    tokensUsed,
    tokensTrendPct,
  };
  return (
    <section
      className="flex flex-col items-start shrink-0"
      style={{ width: "100%", gap: "var(--space-4)" }}
    >
      {/* Figures first, then the way in — the block reads top to bottom in one
        * column. The link sat at the far right of the figures' own row, which
        * split the eye between a left-hand number and a right-hand control on
        * the same line and gave a tertiary action the position the page's
        * primary action holds one row above it. */}
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-7)" }}
      >
      <AIMetric
        label="First-pass accuracy"
        value={`${o.accuracy}%`}
        /* Points, not "pts": the unit was abbreviated jargon next to a figure
         * that already carries a % sign, so the comparison says what it is
         * measured against instead. */
        trend={`${Math.abs(o.accuracyTrend)} ${vs}`}
        delta={o.accuracyTrend}
        trendGood={o.accuracyTrend >= 0}
      />

      <span
        aria-hidden
        style={{
          width: 1,
          alignSelf: "stretch",
          background: "var(--line-hair)",
        }}
      />

      <AIMetric
        label="Tokens used"
        value={formatTokens(o.tokensUsed)}
        trend={`${Math.abs(o.tokensTrendPct)}% ${vs}`}
        delta={o.tokensTrendPct}
        /* Fewer tokens for the same work is the good direction, which is why
         * direction and judgement are two separate inputs here. */
        trendGood={o.tokensTrendPct <= 0}
      />

      </div>

      {/* Tertiary: a text link, not a chip. Its negative left margin cancels
        * the ghost button's own inset so the label starts on the same pixel
        * as the "90%" above it — a quiet control that is optically indented
        * reads as a nested item rather than as the block's own footer.
        *
        * 13, not 12: the ghost variant carries a 1px transparent border on top
        * of its 12px padding, so cancelling the padding alone left the label
        * one pixel right of the figure it is aligned to. */}
      <Button
        variant="ghost"
        size="md"
        onClick={onOpenDetails}
        rightIcon={<ArrowRight size={14} strokeWidth={1.75} />}
        style={{ marginLeft: -13 }}
      >
        View details
      </Button>
    </section>
  );
}

/* The arrow and the colour answer two different questions and must not share
 * one input: the arrow is which way the number moved, the colour is whether
 * that is good news. Tokens falling 8% is a down arrow in green; driving the
 * arrow off `trendGood` printed an up arrow beside "−8%". */
function AIMetric({
  label,
  value,
  trend,
  delta,
  trendGood,
}: {
  label: string;
  value: string;
  trend: string;
  delta: number;
  trendGood: boolean;
}) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return (
    <div className="flex flex-col shrink-0" style={{ gap: 2 }}>
      <span className="t-label">{label}</span>
      <div
        className="flex flex-row items-baseline"
        style={{ gap: "var(--space-4)" }}
      >
        <span
          className="nums-lead"
          style={{
            fontSize: "var(--type-metric)",
            lineHeight: "var(--leading-tight)",
            color: "var(--ink-primary)",
          }}
        >
          {value}
        </span>
        <span
          className="nums flex flex-row items-center"
          style={{
            gap: 2,
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-meta)",
            color: trendGood
              ? "var(--status-ok-ink)"
              : "var(--status-danger-ink)",
            whiteSpace: "nowrap",
          }}
        >
          {delta >= 0 ? (
            <TrendingUp size={14} strokeWidth={1.75} />
          ) : (
            <TrendingDown size={14} strokeWidth={1.75} />
          )}
          {sign}
          {trend}
        </span>
      </div>
    </div>
  );
}

/* 1,240,000 -> "1.24M". Millions are the unit a cycle's usage actually lands
 * in, and the raw figure is seven digits of precision nobody reads. */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/* ---------- Run list ----------
 *
 * A listing, not a spreadsheet. The references never present a table as bare
 * cells on a flat plane; every list in them is a soft outer shell holding a
 * brighter inner sheet, with one hairline per row inset to the text and exactly
 * one coloured element per row that lets you find the row you want without
 * reading it. Three things follow from that, and they are the redesign:
 *
 *   1. One toolbar, not three stacked bands. The cycle bar, the tab strip and
 *      the column header used to be three full-width rules inside 100px. The
 *      controls now share a single row and the column header sits on the inner
 *      sheet, so there is one division: controls above, data below.
 *   2. The rows live on --surface-list, a step brighter than the card. That one
 *      step of nesting is what separates the controls from the data without
 *      needing a rule to do it.
 *   3. Every row carries a "needs" chip — flat, tinted, no border, no shadow,
 *      the reference's exact chip. It is the only colour in the row and it is
 *      what makes a twelve-row tab scannable.
 *
 * What the cycle picker and progress describe is still the list, so they still
 * live in the list's own toolbar rather than floating above it. */
function RunList({
  tab,
  setTab,
  rows,
  counts,
  pulse,
  queued,
  onOpen,
  onRerunFailed,
}: {
  tab: DashboardState;
  setTab: (t: DashboardState) => void;
  rows: DashboardSession[];
  counts: Record<DashboardState, number>;
  pulse: { posted: number; total: number };
  /** Session ids the reader has just asked to re-run. */
  queued: string[];
  onRerunFailed: () => void;
  /* A row is the way into a run. Clicking one opens that property's workspace,
   * which is why the whole row is the hit target rather than a trailing link:
   * there is exactly one thing a row does. */
  onOpen: (session: DashboardSession) => void;
}) {
  const { posted, total } = pulse;
  const pct = total === 0 ? 0 : Math.round((posted / total) * 100);

  return (
    <section
      className="flex flex-col min-h-0"
      style={{
        width: "100%",
        /* Hugs its rows instead of stretching to the viewport floor. The old
         * `flex: 1` drew the three-row Review tab inside an 85%-empty box: it
         * moved the dead space from under the card to inside it, which reads
         * worse, because an empty card looks broken where empty canvas just
         * looks calm. No surface in the references is ever bigger than what it
         * holds. */
        flex: "0 1 auto",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        /* 16px, up from 8. A 1120px card holding a dense table needs the
         * container to give that density air — the same lesson as --pad-card.
         * At 8px the toolbar's right-hand cluster sat almost on the card's
         * border and read as clipped. */
        padding: "0 var(--space-6) var(--space-6)",
      }}
    >
      <Toolbar
        tab={tab}
        setTab={setTab}
        counts={counts}
        onRerunFailed={onRerunFailed}
        posted={posted}
        total={total}
        pct={pct}
      />

      {/* The bright inner sheet. --list-inset is declared here so every row's
        * hairline tracks this sheet's own padding rather than a literal. */}
      <div
        className="flex flex-col min-h-0"
        style={{
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
          overflow: "hidden",
          /* 4px so a hovered row's fill sits inset from the sheet's rounded
           * edges instead of colliding with them. No border: the brightness
           * step plus depth-1 already reads as a nested surface, and a border
           * would have pushed the first column one pixel off the tab label
           * above it. */
          padding: 4,
          ...({ "--list-inset": "8px" } as React.CSSProperties),
        }}
      >
        {/* Six column labels over nothing read as a table that failed to load
          * rather than as a tab with nothing in it. The header appears with the
          * data it names. */}
        {rows.length > 0 && <TableHeader tab={tab} />}
        {/* The rows scroll, not the card, so the toolbar and the column labels
          * stay put on a long tab. Capped in rows rather than in viewport units
          * because the page shell is min-height:100vh — it grows with its
          * content, so a percentage or vh cap here would simply never engage.
          * 14 rows is roughly a screenful; below that the card just hugs. */}
        <div
          className="flex flex-col min-h-0 overflow-auto scroll-thin"
          style={{ maxHeight: 14 * 40 }}
        >
          {rows.length === 0 ? (
            <EmptyTab tab={tab} />
          ) : (
            rows.map((s) => (
              <RunRow
                key={s.id}
                session={s}
                queued={queued.includes(s.id)}
                onOpen={() => onOpen(s)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* One row of controls. Tabs lead at the left edge because they are the primary
 * filter; the cycle scope reads as a sentence at the right — "May 2026 · 12 of
 * 18 closed" plus the bar. The standalone "67%" is gone: the bar already is the
 * percentage, and saying it a third time was the redundancy, not the bar. */
function Toolbar({
  tab,
  setTab,
  counts,
  posted,
  total,
  pct,
  onRerunFailed,
}: {
  tab: DashboardState;
  setTab: (t: DashboardState) => void;
  counts: Record<DashboardState, number>;
  posted: number;
  total: number;
  pct: number;
  onRerunFailed: () => void;
}) {
  return (
    <div
      className="flex flex-row items-center shrink-0"
      style={{
        gap: "var(--space-5)",
        /* No horizontal padding. The strip's own box now starts and ends on the
         * card's content edge, which is the edge every other element on the
         * card already respects — the 12px inset that used to align the tab's
         * LABEL with a row's first column left the strip looking indented from
         * everything around it, which is a worse error than a pill being
         * optically outdented from its own text. */
        padding: "var(--space-6) 0 var(--space-5)",
      }}
    >
      <div className="flex flex-row items-center" style={{ gap: "var(--space-2)" }}>
        {(
          [
            ["review", "Review"],
            ["failed", "Failed"],
            ["completed", "Completed"],
          ] as [DashboardState, string][]
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={active}
              className="flex flex-row items-center"
              style={{
                height: "var(--control-md)",
                padding: "0 10px",
                gap: "var(--space-3)",
                background: active ? "var(--surface-tab-active)" : "transparent",
                border: active ? "1px solid #FFFFFF" : "1px solid transparent",
                boxShadow: active ? "var(--shadow-chip)" : "none",
                borderRadius: "var(--radius-control)",
                cursor: "pointer",
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
                fontWeight: active
                  ? "var(--weight-medium)"
                  : "var(--weight-regular)",
                color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
                fontFamily: "inherit",
              }}
            >
              {label}
              <span
                className="nums"
                style={{
                  fontSize: "var(--type-meta)",
                  color: active ? "var(--ink-secondary)" : "var(--ink-tertiary)",
                }}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sits with the tabs, not with the cycle readout: it acts on whichever
        * tab is open, and it is only offered where there is something to act
        * on. A re-run control on Review or Completed would be an action with no
        * object.
        *
        * "Re-run", hyphenated, is the spelling the session labels already use
        * ("May 2026 · Re-run"), and a screen that shows both forms reads as two
        * different verbs. */}
      {tab === "failed" && counts.failed > 0 && (
        <ConfirmPopoverButton
          variant="secondary"
          size="md"
          label={`Re-run ${counts.failed} failed`}
          leftIcon={<RotateCcw size={14} strokeWidth={1.75} />}
          confirmTitle={`Re-run ${counts.failed} failed sessions?`}
          confirmBody="Each one starts again from its statements. Anything already posted to Yardi is untouched."
          confirmLabel="Re-run"
          onConfirm={onRerunFailed}
        />
      )}

      <div className="flex-1" />

      {/* Progress only — the cycle picker that used to close this cluster lives
        * in the page header now, since it scopes the figures above the list as
        * well as the list itself.
        *
        * Bar first, then the readout. The bar is the thing a reader takes in at
        * a glance and the sentence is what they fall back on when they want the
        * exact figures, so the glanceable half leads and the precise half sits
        * where the eye lands last. */}
      <div
        aria-hidden
        style={{
          width: 120,
          height: 6,
          borderRadius: 999,
          background: "var(--line-row-hover)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "var(--status-ok)",
          }}
        />
      </div>
      <span
        className="nums"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {posted} of {total} posted to Yardi
      </span>
    </div>
  );
}

/* ---------- Table ----------
 *
 * Labels beside values in aligned columns, one text size, hierarchy from weight
 * and ink. Both the header and every row share GRID so the columns genuinely
 * line up; minmax(0, 1fr) is what lets Property truncate instead of shoving the
 * figures off the end.
 *
 * The columns are the four facts a run's progress is made of — statements in,
 * ledgers reconciled, records matched, lines still open — because together they
 * answer the only question a triage row has to answer: how far along is this,
 * and how much is left. That replaced a prose "Detail" cell that said "N records
 * posted" on twelve consecutive rows, and a "Needs" chip that labelled what a
 * figure can state outright.
 *
 * The Period column is gone. It carried Mar/Apr/May values while the picker
 * above said May 2026, which was simply wrong; now the dashboard is scoped to
 * one close, every row belongs to it, and a column repeating the header's own
 * value twelve times has nothing to say.
 *
 * Outstanding is the one coloured cell, and it is deliberately the last figure
 * before the timestamp: it is what decides whether the reader opens the row. */
/* Fixed widths measured against the header labels at --type-meta, not guessed.
 * They came down 20px each when the column glyphs went: every width was
 * label + 14px glyph + 6px gap, and two thirds of what the wider ones were
 * holding was the mark rather than the word. "Outstanding" set the widest;
 * "Accounts" sets it now. */
const GRID = "minmax(0, 1fr) 74px 58px 66px 62px 64px 14px";

function TableHeader({ tab }: { tab: DashboardState }) {
  const cell: React.CSSProperties = {
    fontSize: "var(--type-meta)",
    lineHeight: "var(--leading-ui)",
    fontWeight: "var(--weight-medium)",
    letterSpacing: "var(--tracking-meta)",
    color: "var(--ink-tertiary)",
  };

  return (
    /* Wears .list-row for the inset hairline only — it is the same primitive as
      * a row rule and there is no reason to draw it a second way.
      *
      * Labels alone, no glyphs. Each column header used to lead with a type
      * mark on the argument that four adjacent numeric columns are quicker to
      * tell apart by symbol than by word. In practice the marks were the
      * loudest thing in a header band that is meant to be the quietest, they
      * cost every column 20px of width that the figures below wanted, and a
      * bank, a table, a checklist and two clocks are not a vocabulary anyone
      * learns from one screen. The words do the work. */
    <div
      className="list-row grid shrink-0"
      style={{
        gridTemplateColumns: GRID,
        gap: "var(--space-5)",
        alignItems: "center",
        padding: "var(--space-4) 8px",
        /* A row carries a 1px transparent border so its hover lift does not
         * shift it. The header did not, so every label sat one pixel left of
         * the column it names — enough to read as a soft edge on the
         * right-aligned figures. Same box, same axis. */
        border: "1px solid transparent",
      }}
    >
      <span style={cell}>Property</span>
      <span style={{ ...cell, textAlign: "center" }}>Accounts</span>
      <span style={{ ...cell, textAlign: "center" }}>Ledgers</span>
      {/* "Matched", not "Records": the cell holds `session.matched`. Under the
        * old label a failed run read "Records 0" beside "Open 168", which
        * contradicts the invariant that open items are a subset of records. */}
      <span style={{ ...cell, textAlign: "center" }}>Matched</span>
      <span style={{ ...cell, textAlign: "center" }}>Open</span>
      <span style={{ ...cell, textAlign: "center" }}>
        {tab === "completed" ? "Posted" : "Updated"}
      </span>
      <span />
    </div>
  );
}

function RunRow({
  session,
  queued,
  onOpen,
}: {
  session: DashboardSession;
  queued: boolean;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    /* Everything the row cannot print — the legal entity, the named accounts,
      * and why a failed run failed — on hover.
      *
      * The app's own tooltip rather than a native `title`: the OS renders one
      * as a dark chip, so a screen with both had two tooltip designs on it, and
      * the dark one is the only black surface in a light product. */
    <Tooltip
      block
      side="bottom"
      delayMs={400}
      label={`${session.legalEntity}\n${session.banks.join(" · ")}\n${
        session.detail
      }`}
    >
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${session.property} · ${session.propertyCode} · ${
        session.label
      } · ${session.recordsReconciled} records matched, ${
        session.outstanding === 0 ? "none" : session.outstanding
      } open. Open session.`}
      className="list-row grid text-left shrink-0"
      style={{
        width: "100%",
        gridTemplateColumns: GRID,
        gap: "var(--space-5)",
        alignItems: "center",
        height: 40,
        padding: "0 8px",
        /* Hover-lifts to white, matching the property listing. The sheet under
         * these rows is a hair off-white precisely so that there is somewhere
         * whiter to go; the hairline border and the chip shadow are what carry
         * the lift, since a 1.5% fill change on its own would not read. The
         * resting border is transparent so nothing shifts on hover. */
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition:
          "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
      }}
    >
      {/* Property leads, and carries the code it always had in the data and
        * never showed. The name truncates; the code does not, because a
        * half-printed code is worse than no code. */}
      <span
        className="flex flex-row items-baseline truncate"
        style={{ gap: "var(--space-3)" }}
      >
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          {session.property}
        </span>
        <span
          className="nums shrink-0"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          · {session.propertyCode}
        </span>
        {/* The cycle is stated once, in the page header. What a row still has
          * to say is when it is the SECOND attempt at that cycle — otherwise
          * two rows for one property read as a duplicate. */}
        {session.label !== session.cycle && (
          <span
            className="shrink-0"
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              letterSpacing: "var(--tracking-meta)",
              color: "var(--ink-tertiary)",
            }}
          >
            · {session.label.split(" · ").slice(1).join(" · ")}
          </span>
        )}
      </span>

      <Figure value={session.banks.length} />
      {/* "3 / 4" rather than two columns or a bar: the ratio is the fact, and at
        * a 40px pitch a bar would be three pixels of nothing. Complete ratios
        * drop to tertiary so an incomplete one is the thing you notice. */}
      <Figure
        value={`${session.ledgersDone} / ${session.ledgersTotal}`}
        muted={session.ledgersDone === session.ledgersTotal}
      />
      <Figure value={session.recordsReconciled} />
      {/* The one coloured cell in the row. Zero is an em-rule, not a "0": a
        * column of zeroes reads as data to check, where a rule reads as nothing
        * to do. */}
      <Figure
        value={session.outstanding === 0 ? "—" : session.outstanding}
        tone={session.outstanding === 0 ? "muted" : "alert"}
      />

      <span
        className="nums"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {queued ? "Queued" : formatAgo(session.minutesAgo)}
      </span>

      <span className="row-chevron inline-flex shrink-0" aria-hidden>
        <ChevronRight size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      </span>
    </button>
    </Tooltip>
  );
}

/* One numeric cell. Centred under a centred header so the pair shares an axis;
 * these columns hold counts and short ratios, never a money column, so the
 * clean right edge that tabular figures buy is worth less here than the header
 * and value reading as one thing. Three inks rather than three sizes: default is
 * the reading level, muted is "nothing here", alert is "this is the work". */
function Figure({
  value,
  muted,
  tone,
}: {
  value: string | number;
  muted?: boolean;
  tone?: "muted" | "alert";
}) {
  const alert = tone === "alert";
  const quiet = muted || tone === "muted";
  return (
    <span
      className="nums"
      style={{
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        fontWeight: alert ? "var(--weight-medium)" : "var(--weight-regular)",
        color: alert
          ? "var(--status-warn-ink)"
          : quiet
          ? "var(--ink-tertiary)"
          : "var(--ink-secondary)",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

/* Left-aligned, like the reference's empty states, rather than a centred hero. */
function EmptyTab({ tab }: { tab: DashboardState }) {
  const copy: Record<DashboardState, string> = {
    review: "Nothing waiting on you right now.",
    failed: "No failed sessions this cycle.",
    completed: "No sessions closed yet this cycle.",
  };
  return (
    <div
      style={{
        padding: "var(--space-7) 8px",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-tertiary)",
      }}
    >
      {copy[tab]}
    </div>
  );
}

/* Compact relative time. Single source is minutesAgo, so the label always
 * matches the sort order the list is drawn in. */
function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}
