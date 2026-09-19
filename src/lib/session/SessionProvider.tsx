"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  makeInitialState,
  sessionReducer,
  pairReadyBankIds,
} from "./reducer";
import type {
  BankRuntime,
  SessionAction,
  SessionState,
} from "./types";
import {
  bankCountsForSession,
  banksFor,
  findSession,
  recordsForSession,
  type PropertyBank,
  type PropertyRecord,
  type PropertySession,
  type RecordItem,
} from "@/lib/seed";

/* SessionProvider wraps the app with the live lifecycle state machine.
 *
 *   • `state` — pure data, driven by the reducer
 *   • `dispatch` — typed action sink
 *   • A side-effect controller (this file's main useEffect) reacts to runState
 *     transitions and dispatches the timed sequence of stage advances that
 *     simulate agent work.
 *
 * Two-slot upload model: the user explicitly uploads BOTH the statement and
 * the Yardi ledger. We don't auto-attach the ledger — the canvas surfaces an
 * "Add Yardi ledger" affordance inside the pair card once the statement lands. */

const STAGE_STEP_MS = 650;       // time between bank stages during running
const COMPARE_TICK_MS = 90;      // progress tick during reconciling
const COMPARE_TICKS = 12;        // ticks per bank during comparing
const POST_STEP_MS = 700;        // posting → posted step
const REVIEW_AUTO_GATE_MS = 400; // small pause before review screen settles

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
  /* Who this session belongs to. Every canvas used to read the module-level
   * `activeProperty` and so rendered 1849 Westlake's address, accounts and
   * ledger identity no matter which session was open. */
  property: PropertyRecord;
  session: PropertySession | null;
  /* The property's accounts, in their two-slot upload form. */
  banks: PropertyBank[];
  /* This session's records — what the review canvas lists. */
  records: RecordItem[];
  retryRun: () => void;
  uploadStatement: (bankId: string) => void;
  uploadLedger: (bankId: string) => void;
  startRun: () => void;
  startReconciliation: () => void;
  startYardiUpdate: () => void;
  startNextCycle: () => void;
  openReview: (bankId: string) => void;
  closeReview: () => void;
  markBankReviewed: (bankId: string) => void;
  moveRecord: (
    recordId: string,
    bankId: string,
    to: "approved" | "flagged"
  ) => void;
  setRecordComment: (recordId: string, text?: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  property,
  bankIds,
  cycle,
  selectedSessionId,
  gateReconciliation = false,
  parallelReconciliation = false,
  children,
}: {
  /* The property whose session this is. */
  property: PropertyRecord;
  bankIds: string[];
  cycle: string;
  selectedSessionId: string;
  /* When true the controller stops after intake instead of auto-advancing into
   * reconciliation, parking the session at `runState: "reading"` with no active
   * agent. The host then calls `startReconciliation()` on a user gesture.
   *
   * V1 leaves this off and keeps its uninterrupted run. V2's core hands the
   * user an explicit "Start reconciliation" CTA at the intake boundary, so it
   * opts in. */
  gateReconciliation?: boolean;
  /* Reconcile every bank at once instead of one after another. Four accounts
   * have no dependency on each other, so sequential matching was an artefact of
   * the controller rather than a description of the work — and it made the
   * canvas claim three banks were idle while one ran.
   *
   * V1's AgentsPanel narrates a single active bank at a time, so it stays on the
   * sequential walk; V2's hub lights every comparing strand independently and
   * opts in. */
  parallelReconciliation?: boolean;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    { bankIds, cycle, selectedSessionId },
    makeInitialState
  );

  /* The controller reads the latest state via a ref so timers can chain
   * without re-binding on every state change. */
  const stateRef = useRef(state);
  stateRef.current = state;

  /* We schedule timers via setTimeout, but cancel them whenever the run state
   * transitions or the component unmounts to keep the demo deterministic. */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  /* ----- Controller: react to runState changes ----- */

  useEffect(() => {
    cancelTimer();
    const { runState } = state;

    if (runState === "reading") {
      runIntakePhase();
    } else if (runState === "matching") {
      runReconciliationPhase();
    } else if (runState === "posting") {
      runPostingPhase();
    }

    return cancelTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.runState]);

  function runIntakePhase() {
    const ids = pairReadyBankIds(stateRef.current);
    if (ids.length === 0) {
      // nothing to do — fall back to draft
      dispatch({ type: "advanceRunState", to: "draft" });
      return;
    }
    walkBanks(ids, ["scanning", "parsing", "normalizing", "normalized"], () => {
      dispatch({ type: "setActiveBank", bankId: null });
      if (gateReconciliation) {
        /* Park at running/no-agent. `isAwaitingReconciliation` reads this pair
         * as the intake-complete gate. */
        dispatch({ type: "setActiveAgent", agent: null });
        return;
      }
      timerRef.current = setTimeout(() => {
        dispatch({ type: "advanceRunState", to: "matching" });
        dispatch({ type: "setActiveAgent", agent: "reconciliation" });
      }, REVIEW_AUTO_GATE_MS);
    });
  }

  function runReconciliationPhase() {
    const ids = stateRef.current.bankOrder.filter(
      (id) => stateRef.current.banks[id]?.stage === "normalized"
    );
    if (ids.length === 0) {
      // nothing ready to reconcile — defensive fallback
      dispatch({ type: "advanceRunState", to: "review" });
      return;
    }
    if (parallelReconciliation) {
      compareAllBanks(ids);
      return;
    }
    compareBanks(ids, 0);

    /* All banks comparing at once. Each gets a different number of ticks so
     * they don't finish in lockstep — four accounts of different sizes would
     * never complete simultaneously, and a synchronised finish reads as fake. */
    function compareAllBanks(queue: string[]) {
      const ticksFor: Record<string, number> = {};
      queue.forEach((id, i) => {
        ticksFor[id] = COMPARE_TICKS + i * 4;
      });
      const done = new Set<string>();

      for (const id of queue) {
        dispatch({ type: "setBankStage", bankId: id, stage: "comparing" });
        dispatch({ type: "setComparingProgress", bankId: id, progress: 0 });
      }
      /* No single active bank while parallel — V2's strands derive "working"
       * from each bank's own stage, so nothing needs the pointer. */
      dispatch({ type: "setActiveBank", bankId: null });

      let tick = 0;
      const step = () => {
        timerRef.current = setTimeout(() => {
          tick += 1;
          for (const id of queue) {
            if (done.has(id)) continue;
            const progress = Math.min(1, tick / ticksFor[id]);
            dispatch({ type: "setComparingProgress", bankId: id, progress });
            if (progress >= 1) {
              done.add(id);
              const counts = bankCountsForSession(selectedSessionId)[id] ?? {
                approved: 0,
                exceptions: 0,
              };
              dispatch({
                type: "setBankCounts",
                bankId: id,
                approved: counts.approved,
                exceptions: counts.exceptions,
              });
              dispatch({ type: "setBankStage", bankId: id, stage: "reconciled" });
            }
          }
          if (done.size < queue.length) {
            step();
            return;
          }
          timerRef.current = setTimeout(() => {
            dispatch({ type: "advanceRunState", to: "review" });
            dispatch({ type: "setActiveAgent", agent: null });
          }, REVIEW_AUTO_GATE_MS);
        }, COMPARE_TICK_MS);
      };
      step();
    }

    function compareBanks(queue: string[], idx: number) {
      if (idx >= queue.length) {
        dispatch({ type: "setActiveBank", bankId: null });
        timerRef.current = setTimeout(() => {
          dispatch({ type: "advanceRunState", to: "review" });
          dispatch({ type: "setActiveAgent", agent: null });
        }, REVIEW_AUTO_GATE_MS);
        return;
      }
      const bankId = queue[idx];
      dispatch({ type: "setActiveBank", bankId });
      dispatch({ type: "setBankStage", bankId, stage: "comparing" });
      dispatch({ type: "setComparingProgress", bankId, progress: 0 });
      stepCompareProgress(bankId, 1, queue, idx);
    }

    function stepCompareProgress(
      bankId: string,
      tick: number,
      queue: string[],
      idx: number
    ) {
      timerRef.current = setTimeout(() => {
        const progress = Math.min(1, tick / COMPARE_TICKS);
        dispatch({ type: "setComparingProgress", bankId, progress });
        if (tick < COMPARE_TICKS) {
          stepCompareProgress(bankId, tick + 1, queue, idx);
        } else {
          // Seed the records once comparing finishes.
          const counts = bankCountsForSession(selectedSessionId)[bankId] ?? {
            approved: 0,
            exceptions: 0,
          };
          dispatch({
            type: "setBankCounts",
            bankId,
            approved: counts.approved,
            exceptions: counts.exceptions,
          });
          dispatch({ type: "setBankStage", bankId, stage: "reconciled" });
          compareBanks(queue, idx + 1);
        }
      }, COMPARE_TICK_MS);
    }
  }

  function runPostingPhase() {
    const ids = stateRef.current.bankOrder.filter(
      (id) => stateRef.current.banks[id]?.stage === "reconciled"
    );
    if (ids.length === 0) {
      dispatch({ type: "advanceRunState", to: "posted" });
      return;
    }
    walkBanks(ids, ["posting", "posted"], () => {
      dispatch({ type: "setActiveBank", bankId: null });
      timerRef.current = setTimeout(() => {
        dispatch({ type: "advanceRunState", to: "posted" });
        dispatch({ type: "setActiveAgent", agent: null });
      }, REVIEW_AUTO_GATE_MS);
    });
  }

  /* Walks a list of bank ids through the given sequence of stages, one bank
   * at a time. Each stage transition is STAGE_STEP_MS apart. */
  function walkBanks(
    ids: string[],
    stages: BankRuntime["stage"][],
    onDone: () => void
  ) {
    let bankIdx = 0;
    let stageIdx = 0;

    const tick = () => {
      if (bankIdx >= ids.length) {
        onDone();
        return;
      }
      const bankId = ids[bankIdx];
      dispatch({ type: "setActiveBank", bankId });
      dispatch({ type: "setBankStage", bankId, stage: stages[stageIdx] });
      stageIdx += 1;
      if (stageIdx >= stages.length) {
        stageIdx = 0;
        bankIdx += 1;
      }
      timerRef.current = setTimeout(
        tick,
        stages.includes("posted") ? POST_STEP_MS : STAGE_STEP_MS
      );
    };

    tick();
  }

  /* ----- Action helpers ----- */

  const uploadStatement = useCallback(
    (bankId: string) => dispatch({ type: "uploadStatement", bankId }),
    []
  );
  const uploadLedger = useCallback(
    (bankId: string) => dispatch({ type: "uploadLedger", bankId }),
    []
  );
  const startRun = useCallback(() => dispatch({ type: "startRun" }), []);
  /* Releases the `gateReconciliation` hold. No-op unless intake has parked. */
  const startReconciliation = useCallback(() => {
    dispatch({ type: "advanceRunState", to: "matching" });
    dispatch({ type: "setActiveAgent", agent: "reconciliation" });
  }, []);
  const startYardiUpdate = useCallback(
    () => dispatch({ type: "startYardiUpdate" }),
    []
  );
  const startNextCycle = useCallback(
    () => dispatch({ type: "startNextCycle" }),
    []
  );
  const retryRun = useCallback(() => dispatch({ type: "retryRun" }), []);
  const openReview = useCallback(
    (bankId: string) => dispatch({ type: "openReview", bankId }),
    []
  );
  const closeReview = useCallback(() => dispatch({ type: "closeReview" }), []);
  const markBankReviewed = useCallback(
    (bankId: string) => dispatch({ type: "markBankReviewed", bankId }),
    []
  );
  const moveRecord = useCallback(
    (recordId: string, bankId: string, to: "approved" | "flagged") =>
      dispatch({ type: "moveRecord", recordId, bankId, to }),
    []
  );
  const setRecordComment = useCallback(
    (recordId: string, text?: string) =>
      dispatch({ type: "setRecordComment", recordId, text }),
    []
  );

  const found = findSession(selectedSessionId);
  const banks = useMemo(
    () => banksFor(property, cycle),
    [property, cycle]
  );
  const records = useMemo(
    () => recordsForSession(selectedSessionId),
    [selectedSessionId]
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      dispatch,
      property,
      session: found?.session ?? null,
      banks,
      records,
      retryRun,
      uploadStatement,
      uploadLedger,
      startRun,
      startReconciliation,
      startYardiUpdate,
      startNextCycle,
      openReview,
      closeReview,
      markBankReviewed,
      moveRecord,
      setRecordComment,
    }),
    [
      state,
      property,
      found?.session,
      banks,
      records,
      retryRun,
      uploadStatement,
      uploadLedger,
      startRun,
      startReconciliation,
      startYardiUpdate,
      startNextCycle,
      openReview,
      closeReview,
      markBankReviewed,
      moveRecord,
      setRecordComment,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}

/* Non-throwing variant for components (like WorkspaceNav) that render both
 * inside and outside the provider — e.g. while the user is choosing a session
 * to open. Returns null when no provider is mounted. */
export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}
