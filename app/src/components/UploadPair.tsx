"use client";

/* UploadPair — the bank ↔ wire ↔ ledger triad that appears beneath the bulk
 * upload card once a bank's statement has landed.
 *
 * Two configurations:
 *
 *   complete: both statement and ledger uploaded — full bank metadata on the
 *             left, full ledger metadata on the right, wire connecting them.
 *
 *   awaiting-ledger: statement uploaded but ledger missing — the bank card
 *             is fully populated (same as complete), but the ledger card
 *             swaps its field rows for an internal upload affordance with
 *             the same chrome, header, and divider as the populated card so
 *             the silhouette never shifts. Clicking the affordance fires
 *             onUploadLedger, then the ledger card resolves to its complete
 *             state. The wire stays visible across both states — the bridge
 *             is the visual constant; the cargo arrives. */

import Image from "next/image";
import { useState } from "react";
import { Loader2, Upload, Check, Landmark, FileText } from "lucide-react";
import type { PropertyBank, UploadPair as UploadPairType } from "@/lib/seed";
import { WireConnector } from "./WireConnector";

const CARD_W = 295;
const CARD_H = 262;

export type StageTone = "neutral" | "active" | "complete";

export function UploadPair({
  pair,
  bank,
  statementUploaded,
  ledgerUploaded,
  onUploadStatement,
  onUploadLedger,
  stageLabel,
  stageTone,
  isActiveBank,
  hideBadge,
}: {
  pair: UploadPairType;
  /* The canonical PropertyBank record. Used by the inactive bank card to
   * render bank identity (logo, name, masked account) without leaning on
   * the synthesized UploadPair contents — those describe an uploaded file
   * which by definition doesn't exist yet for an inactive row. */
  bank: PropertyBank;
  statementUploaded: boolean;
  ledgerUploaded: boolean;
  onUploadStatement?: () => void;
  onUploadLedger?: () => void;
  /* Per-bank stage label. Rendered centered over the wire connector so it
   * speaks about the pair (bank ↔ ledger) rather than crowding the bank card. */
  stageLabel?: string | null;
  stageTone?: StageTone;
  /* Highlights the wire connector for the bank currently being processed. */
  isActiveBank?: boolean;
  /* Suppress the stage badge entirely. Used during running/reconciling/
   * updating-yardi when the canvas is supposed to read as quiet and the
   * right agents panel carries the full status read-out. */
  hideBadge?: boolean;
}) {
  /* When no statement has landed yet, the whole row drops to an inactive
   * state: dulled bank card (which acts as the upload affordance), single
   * dulled wire, dulled ledger card. The user adds the statement here and
   * the row flips to active. */
  if (!statementUploaded) {
    return (
      <div
        className="flex flex-row items-start relative"
        style={{ width: "100%" }}
      >
        <InactiveBankCard bank={bank} onUpload={onUploadStatement} />
        <WireSpan
          active={false}
          complete={false}
          stageLabel={null}
          stageTone="neutral"
          inactive
        />
        <InactiveLedgerCard />
      </div>
    );
  }

  return (
    <div
      className="flex flex-row items-start relative"
      style={{ width: "100%" }}
    >
      <BankCard pair={pair} />
      <WireSpan
        active={!!isActiveBank}
        complete={stageTone === "complete"}
        stageLabel={hideBadge ? null : stageLabel ?? null}
        stageTone={stageTone ?? "neutral"}
      />
      {ledgerUploaded ? (
        <LedgerCard pair={pair} />
      ) : (
        <LedgerEmptyCard onUpload={onUploadLedger} />
      )}
    </div>
  );
}

function BankCard({ pair }: { pair: UploadPairType }) {
  const { bank } = pair;
  return (
    <div
      className="flex flex-col justify-start items-start shrink-0 relative"
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="flex flex-row items-start"
        style={{ width: "100%", gap: 8 }}
      >
        <BankLogo name={bank.bank.logo} />
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
          <div
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-1)",
            }}
          >
            {bank.bank.name}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-2)",
            }}
          >
            {bank.bank.address}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />

      <Field label="Account Holder:" value={bank.accountHolder} />
      <Field label="Account Number:" value={bank.accountNumber} />
      <Field label="Period:" value={bank.period} />
      <BottomLeftDate label={`Issue: ${bank.issue}`} />
    </div>
  );
}

function LedgerCard({ pair }: { pair: UploadPairType }) {
  const { ledger } = pair;
  return (
    <div
      className="flex flex-col justify-start items-start shrink-0 relative"
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <LedgerHeader subtitle={`${ledger.source}\nTenant: ${ledger.tenantId}`} />

      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />

      <Field label="Property & Code:" value={ledger.propertyAndCode} />
      <Field label="Cash Account:" value={ledger.cashAccount} />
      <Field label="Period:" value={ledger.period} />
      <BottomLeftDate label={`Exported: ${ledger.exported}`} />
    </div>
  );
}

/* Bottom-left anchored date label. Absolute positioning means the date stays
 * pinned to the corner regardless of how the body content above grows or
 * shrinks. This is the lowest-altitude metadata on the card — purposefully
 * quiet so it doesn't fight with the field rows. */
function BottomLeftDate({ label }: { label: string }) {
  return (
    <div
      className="absolute"
      style={{
        left: 16,
        bottom: 16,
        fontSize: 12,
        lineHeight: "14px",
        color: "var(--text-2)",
      }}
    >
      {label}
    </div>
  );
}

/* InactiveBankCard — dulled-grey bank card shown when the property has a
 * mapped bank account but no statement uploaded for this cycle. The whole
 * card surface is the upload affordance: click anywhere to upload, drop a
 * file anywhere to attach. Dulled tones so it visually subordinates to
 * active pairs while still being scannable as "this slot exists." */
function InactiveBankCard({
  bank,
  onUpload,
}: {
  bank: PropertyBank;
  onUpload?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);

  const visual = drag
    ? {
        background: "#FFFFFF",
        border: "1px solid #001AFF",
        boxShadow:
          "0 0 0 3px rgba(0, 26, 255, 0.14), var(--shadow-depth-1)",
      }
    : hover
    ? {
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(157, 179, 197, 0.55)",
        boxShadow: "var(--shadow-depth-1)",
      }
    : {
        background: "rgba(247, 248, 250, 0.55)",
        border: "1px solid rgba(157, 179, 197, 0.32)",
        boxShadow: "none",
      };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onUpload}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUpload?.();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onUpload?.();
      }}
      className="flex flex-col items-start shrink-0 relative transition"
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: visual.background,
        border: visual.border,
        boxShadow: visual.boxShadow,
        borderRadius: "var(--radius-card)",
        cursor: "pointer",
        transition:
          "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      }}
    >
      <div
        className="flex flex-row items-start"
        style={{ width: "100%", gap: 8, opacity: 0.55 }}
      >
        <div
          className="shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#FFFFFF",
            border: "1px solid rgba(157, 179, 197, 0.35)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={bank.logoSrc}
            width={28}
            height={28}
            alt=""
            style={{ objectFit: "contain", filter: "grayscale(0.85)" }}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
          <div
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-2)",
            }}
          >
            {bank.name}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-4)",
            }}
          >
            {bank.type} · {bank.accountNumber}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(157, 179, 197, 0.22)",
        }}
      />

      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{ width: "100%", gap: 10 }}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: hover ? "#FFFFFF" : "rgba(255,255,255,0.7)",
            border: "1px solid rgba(157, 179, 197, 0.45)",
            boxShadow: hover ? "var(--shadow-depth-1)" : "var(--shadow-chip)",
            color: "#43484E",
            transition: "background 140ms ease, box-shadow 140ms ease",
          }}
        >
          <Upload size={14} strokeWidth={2} />
        </span>
        <div className="flex flex-col items-center" style={{ gap: 2 }}>
          <div
            style={{
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-1)",
            }}
          >
            Upload statement
          </div>
          <div
            style={{
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--text-2)",
            }}
          >
            Drop or click · PDF, CSV
          </div>
        </div>
      </div>
    </div>
  );
}

/* InactiveLedgerCard — quiet placeholder for the ledger side of an inactive
 * pair. No upload affordance on this side: ledger is contingent on the bank
 * statement landing first. */
function InactiveLedgerCard() {
  return (
    <div
      className="flex flex-col items-start shrink-0 relative"
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: "rgba(247, 248, 250, 0.4)",
        border: "1px solid rgba(157, 179, 197, 0.22)",
        boxShadow: "none",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="flex flex-row items-start"
        style={{ width: "100%", gap: 8, opacity: 0.5 }}
      >
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(157, 179, 197, 0.3)",
          }}
        >
          <FileText size={18} strokeWidth={1.25} color="#7F7F87" />
        </div>
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
          <div
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-2)",
            }}
          >
            Ledger
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-4)",
            }}
          >
            Awaiting statement
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(157, 179, 197, 0.2)",
        }}
      />

      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{ width: "100%", opacity: 0.5 }}
      >
        <Landmark size={20} strokeWidth={1.25} color="#7F7F87" />
      </div>
    </div>
  );
}

function LedgerEmptyCard({ onUpload }: { onUpload?: () => void }) {
  /* Same chrome as the populated LedgerCard so the silhouette doesn't shift
   * when the upload resolves. The body holds a single lifted action — the
   * locked design-direction chip recipe (solid stroke, no dashed border).
   * Resting: light card surface, hairline outline, chip-depth shadow.
   * Hover  : brightens to white, lifts to depth-1.
   * Drag   : solid blue stroke + soft glow (the only "active" state visual). */
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);

  const dropzoneVisual = drag
    ? {
        background: "#FFFFFF",
        border: "1px solid #001AFF",
        boxShadow:
          "0 0 0 3px rgba(0, 26, 255, 0.14), var(--shadow-depth-1)",
      }
    : hover
    ? {
        background: "#FFFFFF",
        border: "1px solid rgba(157, 179, 197, 0.65)",
        boxShadow: "var(--shadow-depth-1)",
      }
    : {
        background: "var(--surface-card)",
        border: "1px solid rgba(157, 179, 197, 0.35)",
        boxShadow: "var(--shadow-chip)",
      };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragEnter={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onUpload?.();
      }}
      onClick={onUpload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUpload?.();
        }
      }}
      className="flex flex-col justify-start items-start shrink-0 transition"
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
        cursor: "pointer",
      }}
    >
      <LedgerHeader subtitle="Awaiting Yardi export" />

      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />

      <div
        className="flex flex-col items-center justify-center text-center transition"
        style={{
          width: "100%",
          flex: 1,
          padding: "16px 12px",
          gap: 10,
          background: dropzoneVisual.background,
          border: dropzoneVisual.border,
          boxShadow: dropzoneVisual.boxShadow,
          borderRadius: 10,
          transition:
            "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
        }}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#FFFFFF",
            border: "1px solid rgba(157, 179, 197, 0.35)",
            boxShadow: "var(--shadow-chip)",
            color: "#43484E",
          }}
        >
          <Upload size={14} strokeWidth={2} />
        </span>
        <div className="flex flex-col items-center" style={{ gap: 2 }}>
          <div
            style={{
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-1)",
            }}
          >
            Add Yardi ledger
          </div>
          <div
            style={{
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--text-2)",
            }}
          >
            Drop or click · CSV, XLSX
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerHeader({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{ width: "100%", gap: 8 }}
    >
      <Image
        src="/icons/ledger.svg"
        width={40}
        height={40}
        alt="Ledger"
        style={{ flexShrink: 0 }}
      />
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
        <div
          style={{
            fontSize: 18,
            lineHeight: "22px",
            color: "var(--text-1)",
          }}
        >
          Ledger
        </div>
        <div
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
            whiteSpace: "pre-line",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-start" style={{ width: "100%", gap: 12 }}>
      <div
        className="shrink-0"
        style={{
          width: 114,
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-1)",
        }}
      >
        {label}
      </div>
      <div
        className="flex-1"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-2)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WireSpan({
  active,
  complete,
  stageLabel,
  stageTone,
  inactive,
}: {
  active: boolean;
  complete: boolean;
  stageLabel: string | null;
  stageTone: StageTone;
  inactive?: boolean;
}) {
  /* The wire is the "agent at work" visual. Endpoint caps always breathe and
   * shimmer sweeps run when `active` (driven inside WireConnector). We add a
   * subtle green tint for completed pairs. When `inactive`, the wire collapses
   * to a single dulled-grey line (no chrome, no shimmer). The stage badge
   * lifts off the wire so the per-bank status speaks about the pair rather
   * than crowding either card. */
  return (
    <div
      className="flex-1 flex items-center justify-center relative"
      style={{
        minWidth: 40,
        marginInline: -3,
        height: CARD_H,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: inactive ? 1 : complete ? 0.85 : 1,
          filter:
            !inactive && complete ? "hue-rotate(85deg) saturate(0.7)" : undefined,
          pointerEvents: "none",
        }}
      >
        {/* WireConnector fills this slot (100% × 100%). preserveAspectRatio="none"
         * lets it scale horizontally as the flex container tightens without
         * clipping or overflowing. */}
        <WireConnector active={active} inactive={inactive} />
      </div>
      {stageLabel && (
        <div
          className="relative flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <StageBadge label={stageLabel} tone={stageTone} />
        </div>
      )}
    </div>
  );
}

/* Stage badge — compact pill that sits over the wire connector, centered
 * between the bank and ledger cards. The badge surfaces "what is happening
 * here" for this specific pair without crowding either card body. */
function StageBadge({
  label,
  tone,
}: {
  label: string;
  tone: StageTone;
}) {
  const palette = (() => {
    switch (tone) {
      case "active":
        return {
          bg: "#FFFFFF",
          border: "rgba(0, 26, 255, 0.25)",
          color: "#001AFF",
          icon: (
            <Loader2
              size={11}
              strokeWidth={2}
              className="animate-spin"
              style={{ flexShrink: 0 }}
            />
          ),
        };
      case "complete":
        return {
          bg: "#F2FCF4",
          border: "rgba(30, 200, 0, 0.3)",
          color: "#0A8A00",
          icon: <Check size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />,
        };
      default:
        return {
          bg: "#FFFFFF",
          border: "rgba(157, 179, 197, 0.5)",
          color: "var(--text-1)",
          icon: null,
        };
    }
  })();
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: 24,
        padding: "0 10px",
        gap: 6,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 999,
        color: palette.color,
        fontSize: 11,
        lineHeight: "14px",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        boxShadow:
          "0 1px 3px rgba(48,59,69,0.08), 0 0 0 2px rgba(255,255,255,0.7)",
      }}
    >
      {palette.icon}
      <span>{label}</span>
    </div>
  );
}

function BankLogo({ name }: { name: string }) {
  const src =
    name === "chase"
      ? "/logos/chase.png"
      : name === "wells-fargo"
      ? "/logos/wells-fargo.png"
      : name === "boa"
      ? "/logos/boa.png"
      : null;

  if (!src) {
    return (
      <div
        className="shrink-0"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "#9DB3C5",
        }}
      />
    );
  }

  return (
    <Image
      src={src}
      width={40}
      height={40}
      alt=""
      style={{ flexShrink: 0, objectFit: "contain" }}
    />
  );
}

