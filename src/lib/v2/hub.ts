/* Workspace V2 — the hub's read model.
 *
 * V2 runs on the same SessionProvider as V1; this file is the translation
 * layer that turns the shared lifecycle state into the vocabulary the hub
 * actually draws with: a phase, a per-row state, and a strand state.
 *
 * See WORKSPACE_V2.md for the locked design decisions these types encode. */

import type { BankRuntime, SessionState } from "@/lib/session/types";
import { isAwaitingReconciliation } from "@/lib/session/reducer";

/* ---------- Geometry ----------
 *
 * The row height is the load-bearing number. V1's cards were 295×262; four
 * stacked exceeded the viewport, which is why the hub composition was
 * impossible before V2. At 68px, four rows plus gaps occupy ~308px per side
 * and the core gets real vertical room. */
export const ROW_H = 68;
export const ROW_GAP = 10;
/* Sized so the whole composition (220 + 84 + 330 + 84 + 220 = 938) fits the
 * workspace column at 1440 with the session nav expanded — 1440 − 80 rail
 * − 300 nav − 80 canvas padding leaves 980. Below that the columns and spans
 * shrink toward their minimums rather than overflowing. */
export const ROW_W = 220;
export const ROW_W_MIN = 170;
/* The core is square — it holds one animated avatar and nothing else, so it has
 * no reason to be a panel-shaped box. 120 keeps ~28px of air around the 64px
 * orb: enough for the plate to read as a plate, little enough that it stops
 * competing with the document rows either side of it. It was 148, which with
 * the inner ring gone left the tile looking like a lot of empty plate. */
export const CORE_SIZE = 120;
/* Small on purpose. The square's job is to hold a sign of life, and a 144px
 * field filling it read as a texture swatch; at 56px surrounded by air it reads
 * as one deliberate mark. */
/* 64 is one of the two ThinkingOrb presets, not an arbitrary size — see
 * lib/v2/orb.ts. `as const` keeps it assignable to the package's OrbSize. */
export const CORE_AVATAR = 64 as const;
/* Whatever sits under the core is taken out of flow entirely rather than given a
 * reserved height. Reserving worked, but it paid for stillness with a permanent
 * void in every phase that has nothing to put there — which was most of them.
 * Out of flow, the square cannot move no matter what appears beneath it, and the
 * phases with no action below the core simply have nothing below the core. */
export const COLUMN_H = ROW_H * 4 + ROW_GAP * 3;
/* Minimum horizontal run for the strands. Below this the curves lose their
 * S and read as straight lines into the node. */
export const SPAN_MIN = 84;
/* How far outside the core's edge each convergence node sits. */
export const NODE_OFFSET = 16;

/* ---------- Phase ---------- */

export type HubPhase =
  | "draft"
  /* Documents have landed but nothing is known about them yet — intake is
   * reading each one to find its institution, account and side. Purely a V2
   * concept: the shared reducer is keyed by bank, and during this phase no
   * document has been assigned to a bank, so it cannot be represented there. */
  | "identifying"
  | "intake"
  | "intake-done"
  | "matching"
  | "summary"
  | "posting"
  | "complete"
  /* The run stopped. V2 had no phase for this, so a failed session fell through
   * `hubPhase`'s default to "draft" — it rendered as a fresh session, accepted
   * documents, docked all of them, and then could never start, because the
   * effect that calls `startRun` requires runState "draft" and the reducer's
   * runState was "failed". The workspace sat on "awaiting documents" with every
   * document visibly in place. */
  | "failed";

export function hubPhase(
  state: SessionState,
  identifying: boolean
): HubPhase {
  switch (state.runState) {
    case "draft":
      return identifying ? "identifying" : "draft";
    case "reading":
      return isAwaitingReconciliation(state) ? "intake-done" : "intake";
    case "matching":
      return "matching";
    case "review":
      return "summary";
    case "posting":
      return "posting";
    case "posted":
      return "complete";
    case "blocked":
      return "failed";
    default:
      return "draft";
  }
}

/* ---------- Row + strand state ----------
 *
 * `side` matters: during intake the statement is scanned and parsed while the
 * ledger is normalized, so the two halves of a pair are busy at different
 * moments and their strands must light independently. */

export type Side = "statement" | "ledger";
export type RowState = "idle" | "working" | "done" | "exception";

export function rowState(
  bank: BankRuntime | undefined,
  side: Side,
  phase: HubPhase
): RowState {
  if (!bank) return "idle";
  switch (bank.stage) {
    case "empty":
    case "statement-ready":
    case "pair-ready":
      return "idle";
    case "scanning":
    case "parsing":
      return side === "statement" ? "working" : "idle";
    case "normalizing":
      return side === "ledger" ? "working" : "done";
    case "normalized":
      return "done";
    case "comparing":
      return "working";
    case "reconciled":
      return bank.exceptionCount > 0 && phase !== "posting" ? "exception" : "done";
    case "posting":
      return "working";
    case "posted":
      return "done";
    default:
      return "idle";
  }
}

/* Per-row status line, shown under the bank name while something is happening
 * to that specific document. Null means the row stays quiet. */
export function rowDetail(
  bank: BankRuntime | undefined,
  side: Side,
  phase: HubPhase
): string | null {
  if (!bank) return null;
  /* Once reconciliation has landed, the row stops narrating process and starts
   * carrying its verdict. Without this the amber glyph is contentless — it
   * says "something here" on every bank and discriminates nothing. */
  if (phase === "summary" || phase === "complete") {
    if (bank.stage === "reconciled" || bank.stage === "posted") {
      return bank.exceptionCount > 0
        ? `${bank.exceptionCount} flagged`
        : "Clear";
    }
  }
  switch (bank.stage) {
    case "scanning":
      return side === "statement" ? "Reading" : null;
    case "parsing":
      return side === "statement" ? "Parsing transactions" : null;
    case "normalizing":
      return side === "ledger" ? "Normalizing rows" : null;
    case "comparing":
      return `Matching ${Math.round((bank.comparingProgress ?? 0) * 100)}%`;
    case "posting":
      return "Posting";
    default:
      return null;
  }
}

/* ---------- Strands ----------
 *
 * Four states, per the locked wire language. Direction is meaningful: light
 * travels inward toward the node during intake and reconcile, and outward
 * during the Yardi post. */

export type StrandState = "ghost" | "idle" | "working" | "done" | "exception";

export function strandState(
  bank: BankRuntime | undefined,
  side: Side,
  phase: HubPhase
): StrandState {
  if (!bank || bank.stage === "empty") return "ghost";
  /* A statement with no ledger yet leaves the ledger-side strand unplugged. */
  if (side === "ledger" && bank.stage === "statement-ready") return "ghost";
  const rs = rowState(bank, side, phase);
  if (rs === "working") return "working";
  if (rs === "exception") return "exception";
  if (rs === "done") return "done";
  return "idle";
}

export function strandFlowsOutward(phase: HubPhase): boolean {
  return phase === "posting";
}

/* ---------- Document identity ----------
 *
 * Filenames are synthesized from the bank id so a row can show something
 * concrete when expanded. Deterministic, so the same bank always shows the
 * same file across renders. */

/* A filename a person could plausibly have on disk, not a database key.
 * These read `bm-wells-operating-1145-may2026-stmt.pdf` before — the account's
 * primary key, prefix and all, printed as though a bank had named the file. */
function fileSlug(bankId: string): string {
  return bankId.replace(/^bm-/, "").replace(/^bank-/, "");
}

/* "May 2026" -> "may26". */
function cycleStamp(cycle: string): string {
  const [mon, year] = cycle.split(" ");
  return `${mon.toLowerCase()}${String(year).slice(2)}`;
}

export function statementFilename(bankId: string, cycle: string): string {
  return `${fileSlug(bankId)}_${cycleStamp(cycle)}.pdf`;
}

export function ledgerFilename(bankId: string, cycle: string): string {
  return `yardi_${fileSlug(bankId)}_${cycleStamp(cycle)}.csv`;
}

const SIZES = ["1.2 MB", "1.6 MB", "892 KB", "2.1 MB", "744 KB", "1.4 MB"];

export function fileSize(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return SIZES[Math.abs(h) % SIZES.length];
}
