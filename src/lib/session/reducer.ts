import type {
  BankRuntime,
  BankStage,
  SessionAction,
  SessionState,
} from "./types";
import {
  bankCountsForSession,
  findSession,
  recordsForSession,
  type PropertySession,
} from "@/lib/seed";

/* Pure reducer for the session lifecycle. The asynchronous controller (mock
 * timers walking banks through stages) lives in SessionProvider. */

/* Seeded status per record — the baseline reviewer overrides deviate from.
 * An override matching the baseline is deleted rather than stored, so
 * "no overrides" always means "exactly the agent's verdict".
 *
 * Built per session, because each session has its own records now. */
function baseStatusFor(sessionId: string): Record<string, "approved" | "flagged"> {
  const out: Record<string, "approved" | "flagged"> = {};
  for (const r of recordsForSession(sessionId)) out[r.id] = r.status;
  return out;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "uploadStatement": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      const nextStage: BankStage =
        bank.stage === "empty" ? "statement-ready" : bank.stage;
      return setBank(state, action.bankId, { ...bank, stage: nextStage });
    }
    case "uploadLedger": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      // Only advances to pair-ready if a statement is already present. Without
      // it the row keeps its current stage (no observable change).
      if (bank.stage !== "statement-ready" && bank.stage !== "empty") return state;
      const nextStage: BankStage =
        bank.stage === "statement-ready" ? "pair-ready" : bank.stage;
      return setBank(state, action.bankId, { ...bank, stage: nextStage });
    }
    case "startRun": {
      if (state.runState !== "draft") return state;
      if (!hasAnyPairReady(state)) return state;
      return {
        ...state,
        runState: "reading",
        activeAgent: "intake",
        activeBankId: firstPairReadyBank(state),
      };
    }
    case "setActiveAgent":
      return { ...state, activeAgent: action.agent };
    case "setActiveBank":
      return { ...state, activeBankId: action.bankId };
    case "setBankStage": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      return setBank(state, action.bankId, { ...bank, stage: action.stage });
    }
    case "setComparingProgress": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      return setBank(state, action.bankId, {
        ...bank,
        comparingProgress: action.progress,
      });
    }
    case "setBankCounts": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      return setBank(state, action.bankId, {
        ...bank,
        approvedCount: action.approved,
        exceptionCount: action.exceptions,
        /* Freeze the agent's own verdict; moveRecord never touches these. */
        agentApprovedCount: action.approved,
        agentExceptionCount: action.exceptions,
      });
    }
    case "moveRecord": {
      if (state.runState !== "review") return state;
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      const base = baseStatusFor(state.selectedSessionId)[action.recordId];
      if (!base) return state;
      const current = state.recordStatusOverrides[action.recordId] ?? base;
      if (current === action.to) return state;
      const overrides = { ...state.recordStatusOverrides };
      if (base === action.to) delete overrides[action.recordId];
      else overrides[action.recordId] = action.to;
      const delta = action.to === "approved" ? 1 : -1;
      const approvedCount = bank.approvedCount + delta;
      const exceptionCount = bank.exceptionCount - delta;
      if (approvedCount < 0 || exceptionCount < 0) return state;
      return {
        ...setBank(state, action.bankId, {
          ...bank,
          approvedCount,
          exceptionCount,
        }),
        recordStatusOverrides: overrides,
      };
    }
    case "setRecordComment": {
      const comments = { ...state.recordComments };
      if (!action.text || action.text.trim() === "") {
        delete comments[action.recordId];
      } else {
        comments[action.recordId] = action.text;
      }
      return { ...state, recordComments: comments };
    }
    case "retryRun": {
      /* Three states can ask for a re-run and they mean the same thing: throw
       * away what this session produced and start it again from its documents.
       *
       * It was gated to "failed" alone, which left the Summary agent's own
       * "Rerun" chip — offered in review and after posting, which is exactly
       * when a reviewer decides the matching was wrong — confirming and then
       * doing nothing. */
      if (
        state.runState !== "blocked" &&
        state.runState !== "review" &&
        state.runState !== "posted"
      ) {
        return state;
      }
      const fresh: Record<string, BankRuntime> = {};
      for (const id of state.bankOrder) fresh[id] = freshBank(id);
      return {
        ...state,
        runState: "draft",
        activeAgent: null,
        activeBankId: null,
        failureNote: undefined,
        banks: fresh,
        /* A re-run is a fresh verdict, so the reviewer's decisions against the
         * old one do not carry over. */
        recordStatusOverrides: {},
        recordComments: {},
      };
    }
    case "advanceRunState":
      return { ...state, runState: action.to };
    case "openReview":
      return { ...state, reviewOpenBankId: action.bankId };
    case "closeReview":
      return { ...state, reviewOpenBankId: null };
    case "markBankReviewed": {
      const bank = state.banks[action.bankId];
      if (!bank) return state;
      return setBank(state, action.bankId, { ...bank, reviewed: true });
    }
    case "startYardiUpdate": {
      if (state.runState !== "review") return state;
      return {
        ...state,
        runState: "posting",
        activeAgent: "summary",
        activeBankId: state.bankOrder[0] ?? null,
        reviewOpenBankId: null,
      };
    }
    case "startNextCycle": {
      const fresh: Record<string, BankRuntime> = {};
      for (const id of state.bankOrder) fresh[id] = freshBank(id);
      return {
        ...state,
        runState: "draft",
        activeAgent: null,
        activeBankId: null,
        reviewOpenBankId: null,
        banks: fresh,
        recordStatusOverrides: {},
        recordComments: {},
      };
    }
    default:
      return state;
  }
}

function setBank(
  state: SessionState,
  id: string,
  next: BankRuntime
): SessionState {
  return { ...state, banks: { ...state.banks, [id]: next } };
}

export function freshBank(id: string): BankRuntime {
  return {
    id,
    stage: "empty",
    comparingProgress: 0,
    approvedCount: 0,
    exceptionCount: 0,
    agentApprovedCount: 0,
    agentExceptionCount: 0,
    reviewed: false,
  };
}

/* The state a session opens in.
 *
 * Every session used to open in `draft` — an empty upload canvas — no matter
 * what the row it was opened from said about it. A completed close and a
 * failed run and a cycle nobody had touched all looked identical. The session's
 * own record decides now:
 *
 *   no session (a new run)  -> draft
 *   failed                  -> failed, carrying the reason it failed
 *   active (awaiting a person) -> review, banks reconciled, counts loaded
 *   complete                -> complete, banks posted, counts loaded
 */
export function makeInitialState(args: {
  cycle: string;
  selectedSessionId: string;
  bankIds: string[];
}): SessionState {
  const found = findSession(args.selectedSessionId);
  const session: PropertySession | null = found?.session ?? null;

  const base: SessionState = {
    runState: "draft",
    cycle: args.cycle,
    selectedSessionId: args.selectedSessionId,
    banks: Object.fromEntries(args.bankIds.map((id) => [id, freshBank(id)])),
    bankOrder: args.bankIds,
    activeAgent: null,
    activeBankId: null,
    reviewOpenBankId: null,
    recordStatusOverrides: {},
    recordComments: {},
  };

  if (!session) return base;

  if (session.status === "failed") {
    return { ...base, runState: "blocked", failureNote: session.note };
  }

  const settled = session.status === "complete";
  const counts = bankCountsForSession(session.id);
  const banks: Record<string, BankRuntime> = {};
  for (const id of args.bankIds) {
    const c = counts[id] ?? { approved: 0, exceptions: 0 };
    banks[id] = {
      id,
      stage: settled ? "posted" : "reconciled",
      comparingProgress: 1,
      approvedCount: c.approved,
      exceptionCount: c.exceptions,
      agentApprovedCount: c.approved,
      agentExceptionCount: c.exceptions,
      reviewed: settled,
    };
  }

  return {
    ...base,
    runState: settled ? "posted" : "review",
    banks,
  };
}

/* ----- Selectors ----- */

export function hasAnyPairReady(state: SessionState): boolean {
  return state.bankOrder.some(
    (id) => state.banks[id]?.stage === "pair-ready"
  );
}

export function pairReadyBankIds(state: SessionState): string[] {
  return state.bankOrder.filter((id) => state.banks[id]?.stage === "pair-ready");
}

function firstPairReadyBank(state: SessionState): string | null {
  for (const id of state.bankOrder) {
    if (state.banks[id]?.stage === "pair-ready") return id;
  }
  return null;
}

export function isStatementUploaded(bank: BankRuntime | undefined): boolean {
  if (!bank) return false;
  return bank.stage !== "empty";
}

export function isLedgerUploaded(bank: BankRuntime | undefined): boolean {
  if (!bank) return false;
  // Ledger is present once the bank has advanced past statement-ready.
  return bank.stage !== "empty" && bank.stage !== "statement-ready";
}

export function totalApproved(state: SessionState): number {
  return state.bankOrder.reduce(
    (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
    0
  );
}

export function totalExceptions(state: SessionState): number {
  return state.bankOrder.reduce(
    (n, id) => n + (state.banks[id]?.exceptionCount ?? 0),
    0
  );
}

/* The agent's own verdict, unaffected by reviewer moves. This is the
 * numerator of "settled on its own" — the one figure that must not improve
 * because a human approved the leftovers. */
export function totalAgentApproved(state: SessionState): number {
  return state.bankOrder.reduce(
    (n, id) => n + (state.banks[id]?.agentApprovedCount ?? 0),
    0
  );
}

export function allBanksReviewed(state: SessionState): boolean {
  const banks = state.bankOrder
    .map((id) => state.banks[id])
    .filter(Boolean) as BankRuntime[];
  if (banks.length === 0) return false;
  return banks.every((b) => b.reviewed);
}

/* Intake has finished but reconciliation hasn't been released yet. Only
 * reachable when the provider runs with `gateReconciliation` — without it the
 * controller advances straight through and this window never opens. */
export function isAwaitingReconciliation(state: SessionState): boolean {
  return state.runState === "reading" && state.activeAgent === null;
}

/* The pair is "complete" once posted. Used to colour the wire-connector. */
export function isBankComplete(bank: BankRuntime | undefined): boolean {
  return bank?.stage === "posted";
}
