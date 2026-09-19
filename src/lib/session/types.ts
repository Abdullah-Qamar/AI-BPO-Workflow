/* The reconciliation model, and the running state of the screens on top of it.
 *
 * ---------------------------------------------------------------------------
 * The correction this file exists for
 *
 * `SessionState` below still holds one session per property per period, with a
 * `banks` map beneath it and a single state across the whole thing. That shape
 * cannot be right, and the reason is not a missing field:
 *
 *   A SESSION NEVER TIES OUT.
 *
 * There is no such thing as proving that a property's cash agrees. Each bank
 * account proves separately, against its own statement, with its own balance
 * proof and its own unexplained figure. A badge above four accounts can only be
 * a summary pretending to be a proof, and the moment one account is short it has
 * to choose between lying and going red for the three that are fine.
 *
 * So the unit of reconciliation is ONE BANK ACCOUNT FOR ONE ACCOUNTING PERIOD.
 * The thing above it is a close package, which counts and never proves.
 *
 * The objects that say so are at the top of this file. `SessionState` and its
 * reducer are the older runtime shape, migrated onto the new state machine and
 * otherwise left alone: three components totalling nearly eight thousand lines
 * read it directly, and redesigning them is later work with its own risk.
 *
 * Spec: docs/TAXONOMY_AND_IA.md Parts 1 and 2, docs/FLOWS.md Part 2,
 * docs/BUILD_PROMPTS.md S1.
 */

import { toCents } from "@/lib/money";

/* ===========================================================================
 * THE STANDING WORLD — set up once, edited on events
 * ======================================================================== */

/* An accounting period, per legal entity.
 *
 * `closed` is the load-bearing field. A closed period cannot be posted into,
 * and a correction discovered in September goes into September rather than back
 * into May. That guard is code, below, and never a prompt. */
export interface Period {
  id: string;
  /* "May 2026". The word is PERIOD, not cycle: the domain needs period close,
   * closed period and prior period, and "closed cycle" is not a phrase anyone
   * in accounting says. */
  label: string;
  entityId: string;
  closed: boolean;
}

/* A bank account. Belongs to a property, carries its own GL cash mapping, and
 * owns its open items — a reconciliation BORROWS them and never owns them. */
export interface BankAccount {
  id: string;
  propertyId: string;
  /* "Operating", "Security deposit", "Reserve", "Escrow". Four is seed data,
   * not structure: a small property may have one and a large one six. Nothing
   * in the model may assume a count. */
  name: string;
  /* Masked, "••••3421". */
  number: string;
  bankName: string;
  /* "1010-000 Cash - Operating". */
  glCashAccount: string;
}

/* ===========================================================================
 * THE MOVING WORLD — created each period, then frozen
 * ======================================================================== */

/* The fourteen states a reconciliation moves through.
 *
 * Replaces `RunState`, which ran draft → running → reconciling → review →
 * updating-yardi → complete, with one `failed` hanging off the side. Two things
 * were wrong with it and both are the same mistake:
 *
 *   READING WAS ALLOWED TO FAIL AND SENDING WAS NOT.
 *
 * That is exactly backwards. Reading a statement is recoverable — re-upload it,
 * ask for a different export, type the one field that would not parse. Sending
 * entries into the general ledger is the irreversible step, and it had no
 * failure state at all. So `posting` now has four possible outcomes and reading
 * has `blocked`.
 *
 * `blocked` is the state the product was missing, and its absence is why a read
 * failure had nowhere to live. Every one of the Reader's five failure kinds
 * lands here with a named reason and at least one action beside it. */
export type ReconciliationState =
  /* Created for an account and a period, waiting for documents. Shows what it
   * expects — "0 of 2" — rather than an empty canvas indistinguishable from a
   * run that was never started. */
  | "draft"
  /* The Reader extracting rows and grading them against the statement's own
   * declared control totals. */
  | "reading"
  /* A read failed and needs a person. Only a person or a new document moves it
   * on; there is no timeout that turns a failed read into a successful one. */
  | "blocked"
  /* Matcher, then pattern proposer, then candidate ranker. Unattended. */
  | "matching"
  /* Items waiting on a person, and unexplained is not 0.00. */
  | "review"
  /* Unexplained is exactly 0.00 and nothing is open. Guarded, see `canProve`. */
  | "proven"
  /* A person authorised it. The immutable snapshot is taken here. */
  | "signed"
  /* The Poster sending entries, one at a time, each with an idempotency key. */
  | "posting"
  /* Every entry landed. */
  | "posted"
  /* Some landed and some did not. Retry is safe because of the keys. */
  | "partially-posted"
  /* None landed. */
  | "post-failed"
  /* A completed post undone. The strongest trust feature in the product. */
  | "reversed"
  /* The period is locked. Terminal. */
  | "closed"
  /* A later run replaced this one. */
  | "superseded";

/* States in which a person is the only thing that can move the work on. Used by
 * every count that claims to be "waiting on you", so that a badge on one screen
 * and a queue on another cannot disagree about what that phrase means. */
export const STATES_AWAITING_A_PERSON: readonly ReconciliationState[] = [
  "blocked",
  "review",
  /* Proven but unsigned is waiting on a person too, and it is the cheapest
   * fifteen seconds in the product. Mixing it into the same queue as `review`
   * hides that, which is why the Close screen separates them while this list
   * keeps them together for counting. */
  "proven",
  "partially-posted",
  "post-failed",
];

/* ---------- Where `blocked` lives ----------
 *
 * ON THE DOCUMENT, and the reconciliation reports the worst state of its
 * documents. A statement can be perfectly fine while the ledger export is the
 * wrong period, and a reconciliation carrying one `blocked` flag cannot say
 * which of its two inputs is the problem — which is the difference between a
 * person knowing to re-export from Yardi and a person re-uploading the bank
 * file for no reason.
 *
 * It also matters for recovery. `blocked` clears when a NEW DOCUMENT arrives,
 * and a document is the thing that arrives. A flag on the reconciliation would
 * have to be cleared by guessing which upload was meant to fix it. */
export interface ReconciliationDocument {
  id: string;
  /* Which of the two it is. */
  side: "statement" | "ledger";
  filename: string;
  /* A fingerprint, so a swapped file is detectable and a duplicate is
   * recognisable before it is taken in twice. */
  fingerprint: string;
  /* `blocked` here is the Reader's failure on THIS file, with its reason. */
  state: "waiting" | "reading" | "blocked" | "bound";
  blockedBecause?: string;
}

/* The reconciliation's reading state, derived from its documents rather than
 * stored beside them. Worst wins: one blocked file blocks the run, because
 * reconciling against half a statement is the thing the Reader's grade exists
 * to prevent. */
export function readingStateOf(
  docs: ReconciliationDocument[]
): "draft" | "reading" | "blocked" {
  if (docs.some((d) => d.state === "blocked")) return "blocked";
  if (docs.some((d) => d.state === "reading")) return "reading";
  if (docs.length > 0 && docs.every((d) => d.state === "bound")) return "reading";
  return "draft";
}

/* One attempt at a reconciliation.
 *
 * A reconciliation can be run more than once — against a partial statement
 * mid-month, then again when the final one arrives — and only the last is
 * signed. The seed already prints "May 2026 · Re-run" with no object behind it;
 * this is that object.
 *
 * The frozen figures are the point of the type. They are measured at the
 * MACHINE'S VERDICT and never improve when a person cleans up afterwards,
 * because a quality number that rises when people work harder is not measuring
 * the system. */
export interface Run {
  id: string;
  reconciliationId: string;
  /* 1 for the first attempt. */
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  /* Unexplained at the moment matching finished, before any human action. */
  firstPassUnexplained: number;
  /* How many items the machine handed over. Frozen with the figure above. */
  firstPassItemsWaiting: number;
  /* Which rules and which model versions were live, so a decision taken in
   * March stays explicable in September after the rules have changed six
   * times. */
  ruleVersions: Record<string, string>;
  modelVersion: string | null;
}

/* THE UNIT. One bank account, one accounting period. */
export interface Reconciliation {
  id: string;
  accountId: string;
  periodId: string;
  state: ReconciliationState;

  /* Adjusted bank minus adjusted book, in dollars, WORKED OUT FRESH from the
   * matches every time it is read. It is stored on this object only as the
   * result of that computation being handed around; nothing may persist it,
   * because a stored unexplained figure is how a screen ends up showing a
   * number that stopped being true three clicks ago. */
  unexplained: number;
  /* Matches still needing a person. */
  itemsWaiting: number;
  /* Age in days of the oldest open item on the account, at this period's end. */
  oldestOpenItemDays: number | null;
  /* When this reconciliation last moved. What matters on a queue is how long
   * something has been WAITING, which is now minus this. */
  waitingSince: string | null;

  runs: Run[];
  /* Set at `signed`, and only ever by a person. */
  signedBy: string | null;
  signedAt: string | null;
}

/* One property, one period. It COUNTS. It never proves and has no single
 * status, which is the whole correction: "3 of 4 accounts proven", never a
 * badge. */
export interface ClosePackage {
  id: string;
  propertyId: string;
  periodId: string;
  reconciliationIds: string[];
}

/* ===========================================================================
 * THE GUARDS — written as code, because a comment cannot refuse anything
 * ======================================================================== */

/* Why a thing cannot happen, carried with the fact that it cannot.
 *
 * A bare boolean would let a screen render a disabled button with no
 * explanation, and the cross-screen rules require a switched-off button to say
 * why right next to it. Making the reason part of the refusal is the cheapest
 * way to make that rule impossible to forget. */
export type Guard = { allowed: true } | { allowed: false; because: string };

/* review → proven.
 *
 * Unexplained must equal 0.00. Not rounded, not overridable, not a warning
 * somebody can click past — this is Yardi's own rule, where the difference must
 * reach zero before anything posts. The comparison is in integer cents because
 * a float chain of twenty additions lands on -1.4e-14 where the answer is zero,
 * and `=== 0` is false for that. */
export function canProve(r: Reconciliation): Guard {
  if (r.state !== "review") {
    return { allowed: false, because: `Not in review · currently ${r.state}` };
  }
  if (toCents(r.unexplained) !== 0) {
    return {
      allowed: false,
      because: "Unexplained is not 0.00",
    };
  }
  if (r.itemsWaiting > 0) {
    return {
      allowed: false,
      because: `${r.itemsWaiting} ${
        r.itemsWaiting === 1 ? "item is" : "items are"
      } still open`,
    };
  }
  return { allowed: true };
}

/* proven → signed.
 *
 * A person. Never automatically, at any autonomy rung, and not because of any
 * doubt about capability: when an auditor asks who signed this, the answer has
 * to be a legal person who can be asked why and who carries the consequence.
 *
 * The refusal to automate this is structural rather than conditional. `sign`
 * below takes a person's name and there is no overload that does not, and no
 * agent identity type exists anywhere in this model for one to be passed. */
export function canSign(r: Reconciliation): Guard {
  if (r.state !== "proven") {
    return {
      allowed: false,
      because:
        r.state === "review"
          ? "The month is not proven yet"
          : `Cannot be signed from ${r.state}`,
    };
  }
  return { allowed: true };
}

export function sign(
  r: Reconciliation,
  by: string,
  at: string
): Reconciliation {
  const guard = canSign(r);
  if (!guard.allowed) throw new Error(guard.because);
  if (!by.trim()) throw new Error("A signature needs a person");
  return { ...r, state: "signed", signedBy: by, signedAt: at };
}

/* → posting. The period must be open. */
export function canPost(r: Reconciliation, period: Period): Guard {
  if (period.closed) {
    return {
      allowed: false,
      because: `${period.label} is closed · post the correction into the next period`,
    };
  }
  if (r.state !== "signed" && r.state !== "partially-posted" && r.state !== "post-failed") {
    return {
      allowed: false,
      because:
        r.state === "proven"
          ? "Needs a signature first"
          : `Cannot post from ${r.state}`,
    };
  }
  return { allowed: true };
}

/* posted → reversed. Also requires an open period: after close, an undo becomes
 * a correction in the next period rather than a rewrite of this one. */
export function canReverse(r: Reconciliation, period: Period): Guard {
  if (period.closed) {
    return {
      allowed: false,
      because: `${period.label} is closed · reverse it in the next period`,
    };
  }
  if (r.state !== "posted" && r.state !== "partially-posted") {
    return { allowed: false, because: `Nothing posted to reverse` };
  }
  return { allowed: true };
}

/* blocked → reading. Only a person or a new document. */
export function canRetryRead(r: Reconciliation): Guard {
  if (r.state !== "blocked") {
    return { allowed: false, because: `Not blocked · currently ${r.state}` };
  }
  return { allowed: true };
}

/* ===========================================================================
 * CLOSE PACKAGE — counting, never proving
 * ======================================================================== */

export interface CloseCount {
  proven: number;
  due: number;
}

/* "3 of 4 accounts proven". Deliberately returns a pair and not a percentage or
 * a status: there is no single state a property can be in, and every attempt to
 * produce one has to lie about at least one of its accounts. */
export function closeCount(
  pkg: ClosePackage,
  byId: Record<string, Reconciliation>
): CloseCount {
  const rs = pkg.reconciliationIds
    .map((id) => byId[id])
    .filter((r): r is Reconciliation => Boolean(r));
  const proven = rs.filter((r) =>
    ["proven", "signed", "posting", "posted", "closed"].includes(r.state)
  ).length;
  return { proven, due: rs.length };
}

/* ===========================================================================
 * THE RUNNING SESSION — the older runtime shape, migrated
 * ======================================================================== */

/* Retained under its old name because twelve files import it. Its VALUES are
 * now the fourteen states above, so the app speaks one vocabulary even where
 * the surrounding shape has not been rebuilt yet. */
export type RunState = ReconciliationState;

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
  /* Why the read failed. Only set when runState is "blocked". */
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
  /* Clears a blocked run back to draft so the files can be re-uploaded. */
  | { type: "retryRun" };
