/* Session lifecycle types for the live application layer. These coexist with
 * the static contracts in `lib/types.ts` — that file describes the data shape
 * the redesign should preserve; this file describes the *running session's*
 * state machine. We don't reuse the legacy `BankStage` enum from there because
 * it predates the two-slot manual upload model.
 *
 * The seed (lib/seed.ts) represents the canonical FINAL snapshot of a finished
 * run. The reducer below progresses session state TOWARD that snapshot as the
 * user advances through the lifecycle. */

export type RunState =
  | "draft"
  | "running"
  | "reconciling"
  | "review"
  | "updating-yardi"
  | "complete";

export type BankStage =
  | "empty"             // no files uploaded yet
  | "statement-ready"   // statement uploaded, ledger missing
  | "pair-ready"        // both files uploaded; eligible for the run
  | "scanning"          // intake reading statement
  | "parsing"           // intake parsing transactions
  | "normalizing"       // intake normalizing ledger rows
  | "normalized"        // intake done; waiting for reconciliation
  | "comparing"         // reconciliation matching this bank
  | "reconciled"        // reconciliation done; records populated
  | "posting"           // summary posting to yardi
  | "posted";           // done

export type ActiveAgent = "intake" | "reconciliation" | "summary" | null;

export interface BankRuntime {
  id: string;
  stage: BankStage;
  comparingProgress: number;     // 0..1 during `comparing`
  /* approvedCount / exceptionCount populate during the `reconciled` step;
   * the actual record content lives in the seed (reconciledRecords) and is
   * joined in by selectors so we don't duplicate it. */
  approvedCount: number;
  exceptionCount: number;
  reviewed: boolean;
}

export interface SessionState {
  runState: RunState;
  cycle: string;
  selectedSessionId: string;
  banks: Record<string, BankRuntime>;
  bankOrder: string[];
  activeAgent: ActiveAgent;
  activeBankId: string | null;
  reviewOpenBankId: string | null;
}

export type SessionAction =
  | { type: "uploadStatement"; bankId: string }
  | { type: "uploadLedger"; bankId: string }
  | { type: "startRun" }
  | { type: "setActiveAgent"; agent: ActiveAgent }
  | { type: "setActiveBank"; bankId: string | null }
  | { type: "setBankStage"; bankId: string; stage: BankStage }
  | { type: "setComparingProgress"; bankId: string; progress: number }
  | {
      type: "setBankCounts";
      bankId: string;
      approved: number;
      exceptions: number;
    }
  | { type: "advanceRunState"; to: RunState }
  | { type: "openReview"; bankId: string }
  | { type: "closeReview" }
  | { type: "markBankReviewed"; bankId: string }
  | { type: "startYardiUpdate" }
  | { type: "startNextCycle" };
