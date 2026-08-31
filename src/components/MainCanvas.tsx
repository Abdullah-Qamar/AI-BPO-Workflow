"use client";

/* MainCanvas — the workspace's primary surface.
 *
 * Now driven by SessionProvider. All upload + run state lives in the reducer;
 * this component is a pure read-out of session state, with action dispatch
 * helpers passed through to the child cards.
 *
 * Two layouts of the same session, chosen in the header and remembered:
 *
 *   pairs    — the original. One full-width row per account: statement card,
 *              hand-drawn wire, ledger card. Reads document-first.
 *   accounts — AccountGrid. One card per account across the canvas, with the
 *              two documents as slots inside it. Reads property-first.
 *
 * They share every input: same reducer, same upload actions, same stage lines.
 * Only the arrangement differs, which is the point — a reader who switches
 * should see the same session said another way, not a second app.
 *
 * Visual phase map (one phase owns the canvas at a time):
 *   draft           → bulk upload + per-bank pair cards (existing flow)
 *   running         → pair cards + per-bank stage badges (Scanning / Parsing / Normalizing)
 *   reconciling     → pair cards + per-bank comparing progress, wire pulses on active bank
 *   review          → pair cards static + post-reconciliation summary banner
 *   updating-yardi  → pair cards + per-bank posting badges
 *   complete        → pair cards in completed tone + signoff banner */

import { useEffect, useMemo, useState } from "react";
import { Building2, Upload } from "lucide-react";
import {
  cycleOptions,
  type BankFile,
  type PropertyBank,
  type PropertyRecord,
  type UploadPair as UploadPairType,
} from "@/lib/seed";
import { BulkUploadCard, type BankStatementState } from "./BulkUploadCard";
import { BulkUploadOverlay } from "./BulkUploadOverlay";
import { UploadPair } from "./UploadPair";
import { AccountGrid } from "./AccountGrid";
import {
  LAYOUT_STORAGE_KEY,
  WorkspaceLayoutSwitch,
  type WorkspaceLayout,
} from "./WorkspaceLayoutSwitch";
import { PhaseCTA } from "./PhaseCTA";
import { Button } from "./ui/Button";
import { CyclePicker } from "./ui/CyclePicker";
import { StatusDot } from "./ui/Status";
import { useSession } from "@/lib/session/SessionProvider";
import {
  isLedgerUploaded,
  isStatementUploaded,
} from "@/lib/session/reducer";
import type { BankRuntime } from "@/lib/session/types";

export function MainCanvas({
  onSelectSession,
}: {
  /* Switching the cycle switches to that cycle's session on this property.
   * Without it the picker would be another chevron that promises a menu and
   * then does nothing with the choice. */
  onSelectSession?: (sessionId: string) => void;
}) {
  /* Everything on this canvas belongs to the session that is open. It used to
   * read the module-level `activeProperty` and `propertyBanks`, so every
   * session — whichever property, whichever cycle — rendered 1849 Westlake's
   * address and its four Chase/Wells/BoA accounts. */
  const { state, property, session, banks, uploadStatement, uploadLedger } =
    useSession();
  const [bulkOpen, setBulkOpen] = useState(false);

  /* Read after mount, never during render: the server has no localStorage, so
   * rendering the stored value directly would draw one layout on the server and
   * snap to the other on hydration. Same pattern the rail uses for its collapse
   * preference. The original layout is the default — a returning reader has to
   * have chosen the grid to get it. */
  const [layout, setLayout] = useState<WorkspaceLayout>("pairs");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAYOUT_STORAGE_KEY) === "accounts") {
        setLayout("accounts");
      }
    } catch {
      /* private mode or storage disabled: stay on the default layout */
    }
  }, []);
  const chooseLayout = (next: WorkspaceLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
  };

  /* Build the upload manifest used by both the empty-state bulk card and the
   * overlay re-summon. */
  const statementUploads = useMemo<Record<string, BankStatementState>>(() => {
    const out: Record<string, BankStatementState> = {};
    for (const b of banks) {
      const bank = state.banks[b.id];
      if (isStatementUploaded(bank)) {
        out[b.id] = { statement: statementFileFor(b, state.cycle) };
      }
    }
    return out;
  }, [state.banks, state.cycle, banks]);

  /* The account grid names every file slot whether or not it is filled, so it
   * needs the synthesized statement file for every account, not just the
   * uploaded ones. */
  const statementFiles = useMemo<Record<string, BankFile>>(() => {
    const out: Record<string, BankFile> = {};
    for (const b of banks) out[b.id] = statementFileFor(b, state.cycle);
    return out;
  }, [banks, state.cycle]);

  /* `PropertyBank` carries the bank's legal name, which is the right string on
   * a statement header and far too long for a card 260px wide. The short brand
   * lives on the property's own mapping. */
  const shortNames = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const m of property.banks) out[m.id] = m.shortName;
    return out;
  }, [property]);

  const anyUploaded = banks.some((b) => isStatementUploaded(state.banks[b.id]));
  const inLifecycle = state.runState !== "draft";

  /* Two canvas modes:
   *
   *   first-load   → only the bulk hero. No pair rows yet. The hero is the
   *                  spotlight; it disappears as soon as a file lands.
   *   has-uploads  → no canvas-level upload card. All pair rows render
   *                  (uploaded = active, missing = inactive). A top-strip
   *                  re-upload button opens the bulk overlay. */
  return (
    <main
      className="flex flex-col items-start flex-1 min-w-0 relative overflow-auto scroll-thin canvas-pad canvas-scope"
      style={{
        gap: 16,
        background: "var(--bg-grad)",
      }}
    >
      <Header
        property={property}
        sessionLabel={session?.label ?? state.cycle}
        cycle={session?.cycle ?? state.cycle}
        onSelectCycle={(next) => {
          const target = property.sessions.find((x) => x.cycle === next);
          if (target) onSelectSession?.(target.id);
        }}
        runState={state.runState}
        /* The grid has no bulk hero of its own (see below), so in that layout
         * the "upload every statement at once" path has to be reachable from
         * the header even before the first file lands. */
        showReupload={
          !inLifecycle &&
          (anyUploaded || (layout === "accounts" && state.runState === "draft"))
        }
        reuploadLabel={anyUploaded ? "Re-upload" : "Upload all"}
        onReupload={() => setBulkOpen(true)}
        layout={layout}
        onSelectLayout={chooseLayout}
      />

      {/* A failed session used to open on an empty upload canvas — visually
        * identical to a cycle nobody had started, and flatly contradicting the
        * "Failed" badge on the row it was opened from. It says what happened
        * and offers the one action that helps. */}
      {state.runState === "failed" && (
        <FailureNotice note={state.failureNote} />
      )}

      <div
        key={`session-body-${state.selectedSessionId}`}
        className="flex flex-col items-start canvas-enter"
        style={{ width: "100%", padding: "24px 0 48px", gap: 24 }}
      >
        {/* The account grid is its own empty state and does not want the bulk
          * hero above it.
          *
          * The hero exists because variation 1's empty rows are four full-width
          * bands of nothing — dead weight that says less than the one card
          * replacing them. The grid's empty cards are the opposite: compact,
          * they name each account and the two documents it owes, and every
          * empty slot is already a drop target. Putting a hero over them would
          * be two upload surfaces stacked, which is the "uploaded and empty
          * cards together" mistake in a new costume. */}
        {layout === "accounts" ? (
          <AccountGrid
            banks={banks}
            shortNames={shortNames}
            statementFiles={statementFiles}
            state={state}
            stageLabel={(bankId) =>
              stageLabelFor(state.banks[bankId], state.runState)
            }
            onUploadStatement={uploadStatement}
            onUploadLedger={uploadLedger}
          />
        ) : (
          <>
            {!anyUploaded && state.runState === "draft" && (
              <BulkUploadCard
                banks={banks}
                uploads={statementUploads}
                onUploadStatement={uploadStatement}
                onBrowseAll={() => {
                  const next = banks.find(
                    (b) => !isStatementUploaded(state.banks[b.id])
                  );
                  if (next) uploadStatement(next.id);
                }}
              />
            )}

            {anyUploaded && (
              <div
                className="flex flex-col items-start"
                style={{ width: "100%", gap: 24 }}
              >
                {banks.map((bank) => {
                  const pair = pairFor(bank);
                  if (!pair) return null;
                  const runtime = state.banks[bank.id];
                  const statementUploaded = isStatementUploaded(runtime);
                  const ledgerUploaded = isLedgerUploaded(runtime);
                  return (
                    <UploadPair
                      key={bank.id}
                      pair={pair}
                      bank={bank}
                      statementUploaded={statementUploaded}
                      ledgerUploaded={ledgerUploaded}
                      onUploadStatement={() => uploadStatement(bank.id)}
                      onUploadLedger={() => uploadLedger(bank.id)}
                      stageLabel={stageLabelFor(runtime, state.runState)}
                      stageTone={stageToneFor(runtime, state.runState)}
                      isActiveBank={state.activeBankId === bank.id}
                      hideBadge={inLifecycle}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BulkUploadOverlay
        open={bulkOpen}
        banks={banks}
        uploads={statementUploads}
        onUploadStatement={(id) => uploadStatement(id)}
        onBrowseAll={() => {
          const next = banks.find(
            (b) => !isStatementUploaded(state.banks[b.id])
          );
          if (next) uploadStatement(next.id);
        }}
        onClose={() => setBulkOpen(false)}
      />

      <style jsx>{`
        .canvas-enter {
          animation: canvas-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes canvas-enter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function Header({
  property,
  sessionLabel,
  cycle,
  onSelectCycle,
  runState,
  showReupload,
  reuploadLabel,
  onReupload,
  layout,
  onSelectLayout,
}: {
  property: PropertyRecord;
  sessionLabel: string;
  cycle: string;
  onSelectCycle: (cycle: string) => void;
  runState: string;
  showReupload: boolean;
  reuploadLabel: string;
  onReupload: () => void;
  layout: WorkspaceLayout;
  onSelectLayout: (next: WorkspaceLayout) => void;
}) {
  /* Two rows, not one.
   *
   * The canvas column is the narrowest on the screen — around 620px at a
   * 1512px viewport, once the rail, the session list and the agents panel have
   * taken theirs. A 24px address competing on one line with a phase CTA and a
   * cycle picker left the title about 200px, so "1849 Westlake Ave N, Seattle,
   * WA 98109" rendered as "1849 Westlake A…". The address is the one thing on
   * this screen that says which property you are looking at, so it gets its own
   * line and the controls get theirs. */
  const inLifecycle =
    runState === "running" ||
    runState === "reconciling" ||
    runState === "updating-yardi";

  const statusKey =
    runState === "complete"
      ? "completed"
      : runState === "failed"
      ? "failed"
      : inLifecycle
      ? "active"
      : "review";

  return (
    <div
      className="flex flex-col items-start shrink-0"
      style={{ width: "100%", gap: "var(--space-5)", paddingBottom: "var(--space-2)" }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: "var(--space-4)", minHeight: "var(--control-lg)" }}
      >
        {/* The box is the glyph's own size, not a 28px cell around it.
          *
          * The dot is pinned to the box's bottom-right corner, so on a 28px box
          * holding a 20px glyph anchored top-left it landed 8px clear of the
          * building and read as a stray dot rather than as its badge. Sized to
          * the glyph, the dot overlaps the corner it is meant to sit on.
          *
          * The 12px it gives back is not spare either: at the 388px canvas the
          * address needs 311px and the old 28 + 12 lockup left it 300, so the
          * one string that says which property this is lost its tail. */}
        <div
          className="relative shrink-0 flex items-center justify-center"
          style={{ width: "var(--icon-lg)", height: "var(--icon-lg)" }}
        >
          <Building2 size={20} strokeWidth={1.5} color="var(--ink-secondary)" />
          <span
            className="absolute"
            style={{ right: -2, bottom: -2 }}
          >
            <StatusDot status={statusKey} size={8} ring />
          </span>
        </div>
        <h1 className="canvas-title flex-1 truncate" style={{ color: "var(--ink-primary)" }}>
          {property.address}
        </h1>
      </div>

      {/* The line beneath carries what the title cannot: which property this is
        * in the ledger, which cycle is open, and the controls that act on it.
        *
        * It wraps rather than truncating. The controls have a floor — a phase
        * CTA and a cycle picker are ~350px together — and in a 390px canvas a
        * one-line row simply has nowhere to put the identity, so it squeezed it
        * to zero width and the reader lost the property code entirely. Sent to
        * its own line instead, it costs one row of height and keeps the fact.
        *
        * The identity's basis is its own content, not a 200px guess. A guess is
        * only right for the strings that happen to measure it: at the 620px
        * canvas "TH-1247 · May 2026 · Re-run · 4 accounts" wants 252 and a
        * 200px basis let the row call itself full at 214, so the line kept its
        * place and dropped "accounts" — with an empty row directly beneath it.
        * Asking for what it needs is what makes the wrap fire exactly when the
        * fact would otherwise be cut. */}
      <div
        className="flex flex-row items-center flex-wrap"
        style={{
          width: "100%",
          gap: "var(--space-4)",
          minHeight: "var(--control-lg)",
        }}
      >
        <span
          className="nums truncate"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {property.code} · {sessionLabel} · {property.banks.length}{" "}
          {property.banks.length === 1 ? "account" : "accounts"}
        </span>

        {/* The controls travel together. Left to wrap individually, a canvas one
          * step too narrow put the phase CTA beside the identity and dropped the
          * cycle picker onto a line of its own, which reads as three unrelated
          * rows rather than one row that ran out of space.
          *
          * Together, but not off the edge. The group is `shrink-0`, so once its
          * own content exceeds the canvas it used to run straight past the right
          * edge — at a 388px canvas the cycle picker was simply not on screen.
          * Wrapping inside the group is the last resort after the group has
          * already dropped to its own line, so the "three unrelated rows" case
          * it was written against still cannot happen; what changes is only the
          * case that was previously unreadable. */}
        <div
          className="flex flex-row items-center flex-wrap justify-end shrink-0"
          style={{ gap: "var(--space-4)", maxWidth: "100%" }}
        >
          {showReupload && !inLifecycle && (
            <Button
              variant="secondary"
              size="md"
              onClick={onReupload}
              leftIcon={<Upload size={14} strokeWidth={1.75} />}
              ariaLabel="Open bulk upload"
            >
              {reuploadLabel}
            </Button>
          )}

          {/* Leftmost of the three, and deliberately so: it decides how
            * everything below is drawn, where the CTA and the picker act on
            * what is drawn. Left to right the row reads arrangement, then
            * action, then scope. */}
          <WorkspaceLayoutSwitch value={layout} onChange={onSelectLayout} />

          <PhaseCTA />

        {/* Was a chip with a chevron, no menu and no handler — the exact "dead
          * pill that looks like a dropdown" that CyclePicker exists to replace.
          * A chevron is a promise. */}
        {/* Only the cycles this property has actually been run for. Offering
          * the portfolio-wide list would promise months this property has no
          * session behind. */}
          <CyclePicker
            value={cycle}
            options={propertyCycles(property, cycle)}
            onChange={onSelectCycle}
          />
        </div>
      </div>
    </div>
  );
}

/* Distinct cycles this property has a session for, newest first, with the one
 * currently open guaranteed present (a fresh draft has no session yet). */
function propertyCycles(property: PropertyRecord, current: string): string[] {
  const seen = new Set<string>([current]);
  for (const x of property.sessions) seen.add(x.cycle);
  return cycleOptions.filter((c) => seen.has(c));
}

/* Shown when the session being viewed is one that failed.
 *
 * It explains and does not act: the retry lives in the header's phase CTA,
 * which is where the one thing to do next lives in every other state too.
 * Offering it twice on one screen made the reader choose between two identical
 * buttons. */
function FailureNotice({ note }: { note?: string }) {
  return (
    <div
      className="flex flex-row items-center shrink-0"
      style={{
        width: "100%",
        gap: "var(--space-5)",
        padding: "var(--space-5) var(--space-6)",
        background: "var(--status-danger-bg)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
            color: "var(--status-danger-ink)",
          }}
        >
          This session failed
        </span>
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          {note ?? "The run stopped before any records were matched."}
        </span>
      </div>
    </div>
  );
}

/* ----- Stage badge derivation -----
 *
 * Stage labels still drive per-pair badges when not in a lifecycle phase
 * (e.g., the "Pair ready" cue once both files land). During running /
 * reconciling / updating-yardi the canvas suppresses badges via MainCanvas's
 * `hideBadge` prop — status flows through the AgentsPanel instead. */

function stageLabelFor(
  bank: BankRuntime | undefined,
  runState: string
): string | null {
  if (!bank) return null;
  switch (bank.stage) {
    case "scanning":
      return "Scanning statement";
    case "parsing":
      return "Parsing transactions";
    case "normalizing":
      return "Normalizing ledger";
    case "normalized":
      return runState === "reconciling" ? "Queued for matching" : "Intake ready";
    case "comparing": {
      const pct = Math.round((bank.comparingProgress ?? 0) * 100);
      return `Matching… ${pct}%`;
    }
    case "reconciled":
      if (bank.approvedCount + bank.exceptionCount === 0) return "Reconciled";
      /* The contract's words: what the agent settled is MATCHED, what it handed
       * back is an EXCEPTION. This line said "approved · flagged", which is the
       * reviewer's vocabulary for a decision a person makes later, applied to a
       * verdict the agent has just reached on its own. */
      return `${bank.approvedCount} matched · ${bank.exceptionCount} ${
        bank.exceptionCount === 1 ? "exception" : "exceptions"
      }`;
    case "posting":
      return "Posting to Yardi";
    case "posted":
      return "Posted";
    default:
      return null;
  }
}

function stageToneFor(
  bank: BankRuntime | undefined,
  _runState: string
): "neutral" | "active" | "complete" {
  if (!bank) return "neutral";
  if (bank.stage === "posted") return "complete";
  if (
    bank.stage === "scanning" ||
    bank.stage === "parsing" ||
    bank.stage === "normalizing" ||
    bank.stage === "comparing" ||
    bank.stage === "posting"
  )
    return "active";
  return "neutral";
}

/* ----- pair + file synthesis -----
 *
 * `banksFor` in the seed already builds each account's pair with the cycle's
 * real period and issue dates, so the canvas reads them rather than rebuilding
 * them. The previous version hardcoded a July 2026 statement period and an
 * August 2026 issue date onto a May 2026 session, and named the file
 * "…-may2026-stmt.pdf" while doing it. */

function pairFor(bank: PropertyBank): UploadPairType | null {
  return bank.uploaded ?? null;
}

/* "chase-operating-3421" + "May 2026" -> "chase-operating-3421-may2026-stmt.pdf" */
function statementFileFor(bank: PropertyBank, cycle: string): BankFile {
  const slug = bank.id.replace(/^bm-/, "");
  const [mon, year] = cycle.split(" ");
  return {
    filename: `${slug}-${mon.toLowerCase()}${year}-stmt.pdf`,
    sizeLabel: pickSize(bank.id),
  };
}

/* Deterministic, so a statement does not change size between renders. */
function pickSize(slug: string) {
  const sizes = ["1.2 MB", "1.6 MB", "892 KB", "2.1 MB", "743 KB", "3.4 MB"];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return sizes[Math.abs(h) % sizes.length];
}
