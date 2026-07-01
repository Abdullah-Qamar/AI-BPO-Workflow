import type {
  BankRuntime,
  BankStage,
  SessionAction,
  SessionState,
} from "./types";

/* Pure reducer for the session lifecycle. The asynchronous controller (mock
 * timers walking banks through stages) lives in SessionProvider. */

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
        runState: "running",
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
      });
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
        runState: "updating-yardi",
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
    reviewed: false,
  };
}

export function makeInitialState(args: {
  cycle: string;
  selectedSessionId: string;
  bankIds: string[];
}): SessionState {
  const banks: Record<string, BankRuntime> = {};
  for (const id of args.bankIds) banks[id] = freshBank(id);
  return {
    runState: "draft",
    cycle: args.cycle,
    selectedSessionId: args.selectedSessionId,
    banks,
    bankOrder: args.bankIds,
    activeAgent: null,
    activeBankId: null,
    reviewOpenBankId: null,
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

export function allBanksReviewed(state: SessionState): boolean {
  const banks = state.bankOrder
    .map((id) => state.banks[id])
    .filter(Boolean) as BankRuntime[];
  if (banks.length === 0) return false;
  return banks.every((b) => b.reviewed);
}

/* The pair is "complete" once posted. Used to colour the wire-connector. */
export function isBankComplete(bank: BankRuntime | undefined): boolean {
  return bank?.stage === "posted";
}
