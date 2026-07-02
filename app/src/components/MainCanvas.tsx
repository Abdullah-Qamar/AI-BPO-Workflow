"use client";

/* MainCanvas — the workspace's primary surface.
 *
 * Now driven by SessionProvider. All upload + run state lives in the reducer;
 * this component is a pure read-out of session state, with action dispatch
 * helpers passed through to the child cards.
 *
 * Visual phase map (one phase owns the canvas at a time):
 *   draft           → bulk upload + per-bank pair cards (existing flow)
 *   running         → pair cards + per-bank stage badges (Scanning / Parsing / Normalizing)
 *   reconciling     → pair cards + per-bank comparing progress, wire pulses on active bank
 *   review          → pair cards static + post-reconciliation summary banner
 *   updating-yardi  → pair cards + per-bank posting badges
 *   complete        → pair cards in completed tone + signoff banner */

import { useMemo, useState } from "react";
import { Building2, ChevronDown, UploadCloud } from "lucide-react";
import {
  activeProperty,
  propertyBanks,
  selectedMonth,
  type BankFile,
  type PropertyBank,
  type UploadPair as UploadPairType,
} from "@/lib/seed";
import { BulkUploadCard, type BankStatementState } from "./BulkUploadCard";
import { BulkUploadOverlay } from "./BulkUploadOverlay";
import { UploadPair } from "./UploadPair";
import { PhaseCTA } from "./PhaseCTA";
import { useSession } from "@/lib/session/SessionProvider";
import {
  isLedgerUploaded,
  isStatementUploaded,
} from "@/lib/session/reducer";
import type { BankRuntime } from "@/lib/session/types";

export function MainCanvas() {
  const { state, uploadStatement, uploadLedger } = useSession();
  const [bulkOpen, setBulkOpen] = useState(false);

  /* Build the upload manifest used by both the empty-state bulk card and the
   * overlay re-summon. */
  const statementUploads = useMemo<Record<string, BankStatementState>>(() => {
    const out: Record<string, BankStatementState> = {};
    for (const b of propertyBanks) {
      const bank = state.banks[b.id];
      if (isStatementUploaded(bank)) {
        out[b.id] = { statement: synthesizeStatementFile(b.id) };
      }
    }
    return out;
  }, [state.banks]);

  const anyUploaded = propertyBanks.some((b) =>
    isStatementUploaded(state.banks[b.id])
  );
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
      className="flex flex-col items-start flex-1 min-w-0 relative overflow-auto scroll-thin canvas-pad"
      style={{
        gap: 16,
        background: "var(--bg-grad)",
      }}
    >
      <Header
        runState={state.runState}
        showReupload={anyUploaded && !inLifecycle}
        onReupload={() => setBulkOpen(true)}
      />

      <div
        key={`session-body-${state.selectedSessionId}`}
        className="flex flex-col items-start canvas-enter"
        style={{ width: "100%", padding: "24px 0 48px", gap: 24 }}
      >
        {!anyUploaded && state.runState === "draft" && (
          <BulkUploadCard
            banks={propertyBanks}
            uploads={statementUploads}
            onUploadStatement={uploadStatement}
            onBrowseAll={() => {
              const next = propertyBanks.find(
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
            {propertyBanks.map((bank) => {
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
      </div>

      <BulkUploadOverlay
        open={bulkOpen}
        banks={propertyBanks}
        uploads={statementUploads}
        onUploadStatement={(id) => uploadStatement(id)}
        onBrowseAll={() => {
          const next = propertyBanks.find(
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
  runState,
  showReupload,
  onReupload,
}: {
  runState: string;
  showReupload: boolean;
  onReupload: () => void;
}) {
  /* Single-row header. Property title anchors the left, the phase CTA sits as
   * the primary control on the right just before the month picker, with the
   * quiet re-upload chip tucked in when relevant. Keeping everything on one
   * line prevents the earlier "floating pill between title and canvas" state
   * where the CTA had no visual anchor. */
  const inLifecycle =
    runState === "running" ||
    runState === "reconciling" ||
    runState === "updating-yardi";

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 12, paddingBottom: 4 }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 12, minHeight: 40 }}
      >
        <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
          <Building2 size={28} strokeWidth={1.25} color="#464A51" />
          <span
            className="absolute"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              right: -2,
              bottom: -2,
              background:
                runState === "complete"
                  ? "var(--dot-complete)"
                  : "var(--dot-active)",
              boxShadow: "0 0 0 2px #ECEEF3",
            }}
          />
        </div>
        <h1
          className="flex-1 truncate"
          style={{
            fontSize: 28,
            lineHeight: "34px",
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          {activeProperty.address}
        </h1>

        {showReupload && !inLifecycle && (
          <button
            type="button"
            onClick={onReupload}
            className="inline-flex items-center transition"
            style={{
              height: 35,
              padding: "8px 14px 8px 12px",
              gap: 8,
              background: "var(--surface-card)",
              border: "1px solid rgba(157, 179, 197, 0.4)",
              boxShadow: "var(--shadow-chip)",
              borderRadius: 999,
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-1)",
              cursor: "pointer",
            }}
            aria-label="Open bulk upload"
          >
            <UploadCloud size={14} strokeWidth={1.5} color="#43484E" />
            Re-upload
          </button>
        )}

        <PhaseCTA />

        <button
          className="flex flex-row justify-center items-center"
          style={{
            height: 35,
            padding: "8px 12px 8px 16px",
            gap: 10,
            background: "#F2F4FB",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-chip)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-1)",
            }}
          >
            {selectedMonth}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            color="#43484E"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </button>
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
      return `${bank.approvedCount} approved · ${bank.exceptionCount} flagged`;
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

/* ----- pair + file synthesis (unchanged from the static demo) ----- */

function pairFor(bank: PropertyBank): UploadPairType | null {
  if (bank.uploaded) return bank.uploaded;
  return synthesizePair(bank);
}

function synthesizePair(bank: PropertyBank): UploadPairType {
  const logo =
    bank.logoSrc.includes("chase")
      ? "chase"
      : bank.logoSrc.includes("wells-fargo")
      ? "wells-fargo"
      : bank.logoSrc.includes("boa")
      ? "boa"
      : "chase";
  const address =
    logo === "chase"
      ? "P.O. Box 659754, San Antonio, TX 78265-9754"
      : logo === "wells-fargo"
      ? "P.O. Box 6995, Portland, OR 97228-6995"
      : "P.O. Box 25118, Tampa, FL 33622-5118";
  return {
    id: `pair-${bank.id}`,
    bank: {
      id: `bank-${bank.id}`,
      bank: { name: bank.name, logo, address },
      accountHolder: bank.accountHolder,
      accountNumber: bank.accountNumber,
      period: "July 01, 2026 – July 31, 2026",
      issue: "Aug 03, 2026",
    },
    ledger: {
      id: `ledger-${bank.id}`,
      source: bank.ledgerSource,
      tenantId: bank.ledgerTenant,
      propertyAndCode: bank.ledgerPropertyAndCode,
      cashAccount: bank.ledgerCashAccount,
      period: "July 01, 2026 – July 31, 2026",
      exported: "Aug 03, 2026 · 09:14 PT",
    },
  };
}

function synthesizeStatementFile(bankId: string): BankFile {
  const bank = propertyBanks.find((b) => b.id === bankId);
  if (!bank) return { filename: "statement.pdf", sizeLabel: "1.2 MB" };
  const slug = bank.id.replace(/^bank-/, "");
  return {
    filename: `${slug}-may2026-stmt.pdf`,
    sizeLabel: pickSize(slug),
  };
}

function pickSize(slug: string) {
  const sizes = ["1.2 MB", "1.6 MB", "892 KB", "2.1 MB"];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return sizes[Math.abs(h) % sizes.length];
}
