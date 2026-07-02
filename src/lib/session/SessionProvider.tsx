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
import { reconciledRecords } from "@/lib/seed";

/* Pre-compute per-bank approved/exception counts from the canonical seed.
 * The seed's BankProgressRow has total matched per bank (14/18/22/14) but
 * doesn't split approved vs. flagged per bank — we infer the split from the
 * filterable record list and pad approved to round-trip to the bank's known
 * matched total. */
const COUNTS_BY_BANK: Record<string, { approved: number; exceptions: number }> =
  (() => {
    /* Bank-row totals from seed's reconBankRows. Kept in sync manually
     * because that array isn't exported. */
    const totals: Record<string, number> = {
      "bank-chase-op": 14,
      "bank-wells-sd": 18,
      "bank-boa-res": 22,
      "bank-chase-escrow": 14,
    };
    const out: Record<string, { approved: number; exceptions: number }> = {};
    for (const [id, total] of Object.entries(totals)) {
      const flagged = reconciledRecords.filter(
        (r) => r.bankId === id && r.status === "flagged"
      ).length;
      const approved = Math.max(0, total - flagged);
      out[id] = { approved, exceptions: flagged };
    }
    return out;
  })();

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
  uploadStatement: (bankId: string) => void;
  uploadLedger: (bankId: string) => void;
  startRun: () => void;
  startYardiUpdate: () => void;
  startNextCycle: () => void;
  openReview: (bankId: string) => void;
  closeReview: () => void;
  markBankReviewed: (bankId: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  bankIds,
  cycle,
  selectedSessionId,
  children,
}: {
  bankIds: string[];
  cycle: string;
  selectedSessionId: string;
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

    if (runState === "running") {
      runIntakePhase();
    } else if (runState === "reconciling") {
      runReconciliationPhase();
    } else if (runState === "updating-yardi") {
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
      timerRef.current = setTimeout(() => {
        dispatch({ type: "advanceRunState", to: "reconciling" });
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
    compareBanks(ids, 0);

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
          const counts = COUNTS_BY_BANK[bankId] ?? { approved: 0, exceptions: 0 };
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
      dispatch({ type: "advanceRunState", to: "complete" });
      return;
    }
    walkBanks(ids, ["posting", "posted"], () => {
      dispatch({ type: "setActiveBank", bankId: null });
      timerRef.current = setTimeout(() => {
        dispatch({ type: "advanceRunState", to: "complete" });
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
  const startYardiUpdate = useCallback(
    () => dispatch({ type: "startYardiUpdate" }),
    []
  );
  const startNextCycle = useCallback(
    () => dispatch({ type: "startNextCycle" }),
    []
  );
  const openReview = useCallback(
    (bankId: string) => dispatch({ type: "openReview", bankId }),
    []
  );
  const closeReview = useCallback(() => dispatch({ type: "closeReview" }), []);
  const markBankReviewed = useCallback(
    (bankId: string) => dispatch({ type: "markBankReviewed", bankId }),
    []
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      dispatch,
      uploadStatement,
      uploadLedger,
      startRun,
      startYardiUpdate,
      startNextCycle,
      openReview,
      closeReview,
      markBankReviewed,
    }),
    [
      state,
      uploadStatement,
      uploadLedger,
      startRun,
      startYardiUpdate,
      startNextCycle,
      openReview,
      closeReview,
      markBankReviewed,
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
