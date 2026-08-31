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
  | "complete"
  /* The run broke and stopped. Reached by opening a session the seed records
   * as failed — before this existed, opening one showed an empty upload canvas
   * identical to a session that had never been started, so the app contradicted
   * the "Failed" badge the row it was opened from was wearing. */
  | "failed";

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
   * joined in by selectors so we don't duplicate it. They are LIVE counts:
   * reviewer decisions (moveRecord) adjust them, so bank rows and the
   * summary band track the review as it happens. */
  approvedCount: number;
  exceptionCount: number;
  /* The agent's original verdict, frozen at `reconciled`. "Settled on its
   * own" is a claim about the agent, not about where the review ended up —
   * it must not improve because a human approved the leftovers. */
  agentApprovedCount: number;
  agentExceptionCount: number;
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
  /* Why the run failed. Only set when runState is "failed". */
  failureNote?: string;
  /* Reviewer decisions, keyed by record id. They live here — not in the
   * review surface's component state — because the drawer unmounts on close
   * and a decision that evaporates when the drawer does is not a decision.
   * Only deviations from the seeded status are stored. */
  recordStatusOverrides: Record<string, "approved" | "flagged">;
  recordComments: Record<string, string>;
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
  /* Reviewer moved one record between buckets during review. */
  | {
      type: "moveRecord";
      recordId: string;
      bankId: string;
      to: "approved" | "flagged";
    }
  /* Reviewer note on a record. Empty/undefined text clears it. */
  | { type: "setRecordComment"; recordId: string; text?: string }
  | { type: "startYardiUpdate" }
  | { type: "startNextCycle" }
  /* Clears a failed run back to draft so the files can be re-uploaded. */
  | { type: "retryRun" };
