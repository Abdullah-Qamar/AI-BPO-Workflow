"use client";

/* HubCanvas — the whole of column 3 in Workspace V2.
 *
 * Composition: statement rows on the left, ledger rows on the right, one core
 * between them, and eight strands converging to a single node on each side.
 *
 * This file owns three things the pieces can't own themselves:
 *
 *   1. Geometry. Strand endpoints are measured from the live DOM rather than
 *      computed, because a row can expand to ~200px and push its neighbours
 *      down — the curve has to follow. Re-measures on expand, on file arrival,
 *      and on container resize.
 *   2. Arrival choreography. Dropped files are anonymous — intake identifies
 *      each one at the core and only then does its row fly out to a side. See
 *      lib/v2/intake.ts for why identity must be an output, not an input.
 *   3. Hover isolation. With all four strands per side converging on one node,
 *      hovering is the only way to tell which strand belongs to which bank. */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
/* No module-level account list. Every one of the five places this file used to
 * reach for `propertyBanks` — the pair gate, the row builder, the docked
 * filter, the present-tense line and the row type — was reading 1849
 * Westlake's four accounts regardless of which session was open. On any other
 * property `state.banks[thatId]` was undefined, so the pair gate could never be
 * satisfied and the workspace sat on "awaiting documents" for ever, with the
 * documents themselves having docked correctly. See `banks` on the session. */
import type { PropertyBank } from "@/lib/seed";
import { useSession } from "@/lib/session/SessionProvider";
import { incomingFor, makeDockBuffer, useIntakeQueue } from "@/lib/v2/intake";
import {
  COLUMN_H,
  NODE_OFFSET,
  ROW_GAP,
  ROW_W,
  ROW_W_MIN,
  SPAN_MIN,
  hubPhase,
  rowDetail,
  rowState,
  strandFlowsOutward,
  strandState,
  type HubPhase,
  type Side,
} from "@/lib/v2/hub";
import { DocRow, ROW_MORPH_MS } from "./DocRow";
import { Core, CoreAction } from "./Core";
import { Strands, type StrandSpec } from "./Strands";
import { SessionHeader, type WorkspaceTab } from "./SessionHeader";
import { PropertyKnowledge } from "./PropertyKnowledge";
import { Activity, type AgentPillState } from "./ActivityFeed";
import { currentAction, useActivityLog } from "@/lib/v2/activity";
import {
  propertyNotes,
  type NoteKind,
  type PropertyNote,
} from "@/lib/v2/propertyNotes";

/* A little past DocRow's morph so the final frame lands on the settled layout. */
const MEASURE_WINDOW_MS = ROW_MORPH_MS + 60;

interface RowGeom {
  /* x of the row edge facing the core. */
  x: number;
  y: number;
}

interface Geometry {
  w: number;
  h: number;
  rows: Record<string, RowGeom>;
  nodes: Array<{ x: number; y: number }>;
}

const EMPTY_GEOM: Geometry = { w: 0, h: 0, rows: {}, nodes: [] };

export function HubCanvas({
  onViewRecords,
  onSelectSession,
}: {
  onViewRecords: () => void;
  /* Switching cycles in the header switches sessions, which only the host can
   * do — it owns the selected id and keys the provider by it. */
  onSelectSession?: (sessionId: string) => void;
}) {
  const {
    state,
    banks,
    uploadStatement,
    uploadLedger,
    startRun,
    startReconciliation,
    retryRun,
  } = useSession();

  const [tab, setTab] = useState<WorkspaceTab>("workspace");
  const [activityOpen, setActivityOpen] = useState(false);

  /* Property instructions live here rather than inside the Knowledge tab: the
   * tab strip badges the count, so the two would disagree the moment one was
   * added. */
  const [notes, setNotes] = useState<PropertyNote[]>(propertyNotes);
  const addNote = useCallback(
    (draft: {
      kind: NoteKind;
      title: string;
      body: string;
      appliesTo: string;
    }) => {
      setNotes((prev) => [
        ...prev,
        {
          id: `note-local-${prev.length + 1}`,
          kind: draft.kind,
          title: draft.title.trim(),
          body: draft.body.trim(),
          appliesTo: draft.appliesTo.trim() || null,
          addedBy: "You",
          addedOn: state.cycle,
          /* A new instruction has not been read by a run yet. Zero hits is the
           * truth; `pending` is what stops that zero being reported as a
           * stale rule the agents ignored. */
          hits: 0,
          pending: true,
        },
      ]);
    },
    [state.cycle]
  );

  /* ---------- Arrival choreography ----------
   *
   * Declared before the geometry block because the layout effects below depend
   * on `phase` and `docked` — the strands have to re-measure whenever a newly
   * identified document docks and changes a column's height. */

  const dropped = useRef(false);

  /* `docked` is the truth of "intake has identified this document and placed
   * it". Row visibility reads from here rather than from the bank's session
   * stage, because a ledger can be identified before its statement arrives and
   * the shared model has no ledger-only stage to represent that. */
  const [docked, setDocked] = useState<Set<string>>(() => new Set());
  const dockToSession = useRef(makeDockBuffer(uploadStatement, uploadLedger));

  const handleDock = useCallback((bankId: string, side: Side) => {
    setDocked((prev) => new Set(prev).add(`${side}:${bankId}`));
    dockToSession.current(bankId, side);
  }, []);

  /* The documents this session receives, built from its own accounts. They used
   * to be a fixed list of eight pinned to one property's account ids, so a
   * two-account property received four documents addressed to accounts it does
   * not have and intake completed without a single one landing. */
  const docs = useMemo(
    () => incomingFor(banks, state.cycle),
    [banks, state.cycle]
  );
  const queue = useIntakeQueue({ docs, onDock: handleDock });

  const handleDropFiles = useCallback(() => {
    if (dropped.current) return;
    dropped.current = true;
    queue.start();
  }, [queue]);

  const phase = hubPhase(state, queue.started && queue.stage !== "done");

  /* The workspace's memory. Append-only, derived from the same session state the
   * hub renders, so it can't drift out of step with what's on screen. */
  const activity = useActivityLog({ state, banks, queue, docked });

  /* Reading contents only begins once every document has been identified and
   * paired. Until then intake is still working out what it is holding. */
  const allPaired = banks.every(
    (b) => state.banks[b.id]?.stage === "pair-ready"
  );
  useEffect(() => {
    if (state.runState === "draft" && queue.stage === "done" && allPaired) {
      startRun();
    }
  }, [state.runState, queue.stage, allPaired, startRun]);

  /* ---------- Refs + geometry ---------- */

  const hubRef = useRef<HTMLDivElement | null>(null);
  const coreBoxRef = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef(new Map<string, HTMLDivElement>());
  const [geom, setGeom] = useState<Geometry>(EMPTY_GEOM);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [hoveredBankId, setHoveredBankId] = useState<string | null>(null);

  const measure = useCallback(() => {
    const hub = hubRef.current;
    const coreBox = coreBoxRef.current;
    if (!hub || !coreBox) return;
    const hb = hub.getBoundingClientRect();
    const cb = coreBox.getBoundingClientRect();

    /* Client rects are viewport-relative, but the strand SVG is `inset: 0` on
     * this same scroll container — its origin is the top-left of the *scrolled
     * content*, not of the visible box. Without adding the scroll offset back,
     * every endpoint is wrong by exactly how far the hub is scrolled: the
     * convergence nodes detach upward from the core once the hub scrolls
     * vertically, and sideways at widths narrow enough to scroll the columns. */
    const sx = hub.scrollLeft;
    const sy = hub.scrollTop;
    const coreCenterY = cb.top + cb.height / 2 - hb.top + sy;

    const rows: Record<string, RowGeom> = {};
    for (const [key, el] of rowEls.current) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      const isStatement = key.startsWith("statement:");
      rows[key] = {
        x: (isStatement ? r.right - hb.left : r.left - hb.left) + sx,
        y: r.top + r.height / 2 - hb.top + sy,
      };
    }

    setGeom({
      /* Client size, deliberately. Sizing this from `scrollWidth/Height` feeds
       * the SVG's own box back into the next measurement — it is an abspos child
       * of this scroll container, so it *is* part of the scrollable overflow it
       * would be measuring. That ratchets. The SVG carries `overflow: visible`,
       * so strands still paint outside the viewBox and nothing is clipped. */
      w: hb.width,
      h: hb.height,
      rows,
      nodes: [
        { x: cb.left - hb.left - NODE_OFFSET + sx, y: coreCenterY },
        { x: cb.right - hb.left + NODE_OFFSET + sx, y: coreCenterY },
      ],
    });
  }, []);

  /* Layout-effect so the strands never paint a frame behind the rows. */
  useLayoutEffect(() => {
    measure();
  }, [measure, expandedKey, phase, docked, state.banks]);

  /* A row's expand/collapse is a 300ms height transition, and because the
   * column is centred on the core the entire side drifts for its duration.
   * One measurement at the start would leave the strands detached from their
   * rows the whole way, so re-measure every frame until it settles. */
  useEffect(() => {
    let raf = 0;
    const started = performance.now();
    const step = () => {
      measure();
      if (performance.now() - started < MEASURE_WINDOW_MS) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [expandedKey, measure]);

  useEffect(() => {
    const hub = hubRef.current;
    if (!hub || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(hub);
    return () => ro.disconnect();
  }, [measure]);

  const registerRow = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) rowEls.current.set(key, el);
      else rowEls.current.delete(key);
    },
    []
  );

  /* ---------- Strand specs ---------- */

  const strands = useMemo<StrandSpec[]>(() => {
    if (geom.nodes.length < 2) return [];
    const out: StrandSpec[] = [];
    for (const b of banks) {
      const rt = state.banks[b.id];
      for (const side of ["statement", "ledger"] as Side[]) {
        const key = `${side}:${b.id}`;
        const g = geom.rows[key];
        if (!g) continue;
        const node = side === "statement" ? geom.nodes[0] : geom.nodes[1];
        out.push({
          key,
          bankId: b.id,
          from: { x: side === "statement" ? g.x + 6 : g.x - 6, y: g.y },
          to: node,
          state: strandState(rt, side, phase),
          dim: hoveredBankId !== null && hoveredBankId !== b.id,
          lit: hoveredBankId === b.id,
        });
      }
    }
    return out;
  }, [geom, state.banks, phase, hoveredBankId]);

  const anyWorking = strands.some((s) => s.state === "working");

  /* A row exists once intake has docked its document — not before, and not
   * because the seed says the bank exists. */
  const visibleRows = useCallback(
    (side: Side) => banks.filter((b) => docked.has(`${side}:${b.id}`)),
    [docked]
  );

  const pills = agentPills(phase);
  const present = currentAction(phase, state, banks, queue);

  return (
    <main
      className="flex flex-col flex-1 min-w-0 canvas-pad overflow-auto scroll-thin"
      style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
    >
      <SessionHeader
        cycle={state.cycle}
        phase={phase}
        state={state}
        docsIdentified={queue.identified}
        docsTotal={queue.total}
        noteCount={notes.length}
        tab={tab}
        onTabChange={setTab}
        onSelectCycle={onSelectSession}
        showTabs={false}
      />

      {tab === "knowledge" ? (
        <PropertyKnowledge phase={phase} notes={notes} onAdd={addNote} />
      ) : (
      <>
      {/* Reading order is outcome → record → work.
        *
        * The summary states the answer, the activity list accounts for how it
        * was reached, and the hub is the mechanism. Anything the run has not
        * produced yet simply isn't rendered, so the column shortens toward the
        * top rather than holding empty slots. */}
      {/* The outcome summary and the activity record both live in the
        * right-side agent panel now; the hub is just the mechanism. */}

      {/* `justify-center` on an overflowing row spills content out of *both*
        * sides, which pushed the statement column underneath the session nav
        * where it was silently clipped. Scrolling instead keeps every row
        * reachable when the workspace is too narrow to hold the composition. */}
      <div
        ref={hubRef}
        className="flex flex-row items-center justify-center relative overflow-x-auto scroll-thin"
        style={{
          width: "100%",
          /* Grow into leftover canvas height so the hub centres in what is left
           * below the header and the activity block, instead of sitting against
           * them with a viewport of dead space underneath.
           *
           * `0` shrink is load-bearing, not tidiness: `overflow-x: auto` makes
           * overflow-y compute to auto too, so a hub allowed to shrink below its
           * content becomes a nested vertical scroller — and a scrolled hub was
           * what tore the strands' convergence nodes away from the core. Grow
           * only; when the composition is taller than the canvas, `main`
           * scrolls, as it did before. */
          flex: "1 0 auto",
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <Strands
          width={geom.w}
          height={geom.h}
          strands={strands}
          nodes={geom.nodes}
          flowOutward={strandFlowsOutward(phase)}
          anyWorking={anyWorking}
        />

        <DocColumn
          side="statement"
          banks={visibleRows("statement")}
          state={state}
          phase={phase}
          expandedKey={expandedKey}
          setExpandedKey={setExpandedKey}
          hoveredBankId={hoveredBankId}
          setHoveredBankId={setHoveredBankId}
          registerRow={registerRow}
        />

        <span style={{ flex: `1 1 ${SPAN_MIN}px`, minWidth: 44 }} />

        {/* The square is measured for the strand endpoints, so nothing may sit
          * under it in flow — the action below is absolutely positioned against
          * this box and cannot drag the convergence nodes downward. */}
        <div
          className="flex flex-col items-center shrink-0 relative"
          style={{ zIndex: 2 }}
        >
          <div ref={coreBoxRef}>
            <Core phase={phase} onDropFiles={handleDropFiles} />
          </div>
          <CoreAction
            phase={phase}
            /* From the session's own accounts — see the note at the top of this
             * file about the module-level list that read one property's four
             * accounts no matter which session was open. */
            accountCount={banks.length}
            onDropFiles={handleDropFiles}
            onStartReconciliation={startReconciliation}
            onRetry={retryRun}
            failureNote={state.failureNote}
          />
        </div>

        <span style={{ flex: `1 1 ${SPAN_MIN}px`, minWidth: 44 }} />

        <DocColumn
          side="ledger"
          banks={visibleRows("ledger")}
          state={state}
          phase={phase}
          expandedKey={expandedKey}
          setExpandedKey={setExpandedKey}
          hoveredBankId={hoveredBankId}
          setHoveredBankId={setHoveredBankId}
          registerRow={registerRow}
        />
      </div>
      </>
      )}
    </main>
  );
}

/* Agent pill states, driven by phase. `identifying` and `intake` are both
 * Intake's turn — the first is reading identities, the second reading contents —
 * so the pill stays working across the pair. */
function agentPills(phase: HubPhase): AgentPillState[] {
  const at = (
    agent: AgentPillState["agent"],
    working: boolean,
    done: boolean
  ): AgentPillState => ({
    agent,
    state: working ? "working" : done ? "done" : "idle",
  });

  const past = (...phases: HubPhase[]) => phases.includes(phase);

  return [
    at(
      "intake",
      past("identifying", "intake"),
      past("intake-done", "matching", "summary", "posting", "complete")
    ),
    at(
      "reconciliation",
      past("matching"),
      past("summary", "posting", "complete")
    ),
    /* Summary counts as done at `summary`: the figures on screen are its
     * output, and the run is parked on the user, not on the agent. Posting to
     * Yardi is its second act, so it returns to working there. */
    at("summary", past("posting"), past("summary", "complete")),
  ];
}

/* ---------- Columns ---------- */

function DocColumn({
  side,
  banks,
  state,
  phase,
  expandedKey,
  setExpandedKey,
  hoveredBankId,
  setHoveredBankId,
  registerRow,
}: {
  side: Side;
  banks: PropertyBank[];
  state: ReturnType<typeof useSession>["state"];
  phase: HubPhase;
  expandedKey: string | null;
  setExpandedKey: (k: string | null) => void;
  hoveredBankId: string | null;
  setHoveredBankId: (id: string | null) => void;
  registerRow: (key: string) => (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        flex: `0 1 ${ROW_W}px`,
        minWidth: ROW_W_MIN,
        /* Reserved so docking rows fill into existing space rather than growing
         * the column and shifting the core. */
        minHeight: COLUMN_H,
        /* Centre the rows within that reserved height so any number of files
         * sits level with the core rather than stacking from the top — the
         * cards read as flowing out of the middle and staying there. */
        justifyContent: "center",
        gap: ROW_GAP,
        zIndex: 1,
      }}
    >
      {banks.map((b) => {
        const key = `${side}:${b.id}`;
        const rt = state.banks[b.id];
        return (
          <DocRow
            key={key}
            bank={b}
            side={side}
            state={rowState(rt, side, phase)}
            detail={rowDetail(rt, side, phase)}
            cycle={state.cycle}
            expanded={expandedKey === key}
            onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
            dimmed={hoveredBankId !== null && hoveredBankId !== b.id}
            highlighted={hoveredBankId === b.id}
            onHoverChange={(h) => setHoveredBankId(h ? b.id : null)}
            registerRef={registerRow(key)}
          />
        );
      })}
    </div>
  );
}
