"use client";

/* Bulk upload card — empty-state primary surface (and the overlay body).
 *
 * Shown ONLY when no banks have uploaded yet, or when re-summoned from the
 * canvas overlay button. Once at least one file lands the canvas replaces
 * this card with per-bank pair rows. The card carries three pieces:
 *
 *   1. Hero — illustration, headline, helper, and the "Browse files" primary
 *      CTA. Both the card surface and the CTA route to a real hidden
 *      <input type="file" multiple>. Drag-and-drop is fully wired: DataTransfer
 *      files land here, get routed one-by-one to the next empty bank in order,
 *      and the button reflects an in-flight state while the routing plays out.
 *
 *   2. Bank strip — every bank associated with this property, rendered as a
 *      visible informational chip (logo + short name). Not clickable: the
 *      strip is the "what will be filled" preview. If a statement lands
 *      for a bank while the card is still open (e.g. from within an
 *      overlay re-upload), the chip flips to its "filled" tint.
 *
 *   3. File-type microcopy — the small "PDF, CSV, XLSX · 50 MB max" hint.
 *
 * All drop targets accept multiple files. Real File objects reach the
 * onUploadStatement callback (via a stubbed mapping) — the POC keeps the
 * mocked bank-routing, but the click / drop flow itself now behaves like a
 * genuine upload. */

import Image from "next/image";
import { useRef, useState } from "react";
import { Check, UploadCloud, Loader2 } from "lucide-react";
import type { BankFile, PropertyBank } from "@/lib/seed";
import { Button } from "./ui/Button";

export interface BankStatementState {
  statement?: BankFile;
}

export function BulkUploadCard({
  banks,
  uploads,
  onUploadStatement,
  onBrowseAll,
}: {
  banks: PropertyBank[];
  uploads: Record<string, BankStatementState>;
  onUploadStatement: (bankId: string) => void;
  onBrowseAll?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  const [dropping, setDropping] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Pairs each real File with an empty bank slot. Targets are captured
   * upfront from the current uploads snapshot — this matters because the
   * BulkUploadCard unmounts as soon as the first file lands (the canvas
   * replaces it with pair rows), so we can't rely on re-reading `uploads`
   * between dispatches. The staggered setTimeouts fire regardless of whether
   * the card is still mounted; they just need the bank IDs. */
  const handleFiles = (files: FileList | File[] | null) => {
    if (!files || (files as FileList).length === 0) {
      onBrowseAll?.();
      return;
    }
    const arr = Array.from(files as FileList);
    const emptyBanks = banks.filter((b) => !uploads[b.id]?.statement);
    const targets = emptyBanks.slice(0, arr.length).map((b) => b.id);
    if (targets.length === 0) {
      onBrowseAll?.();
      return;
    }
    setDropping(true);
    targets.forEach((bankId, i) => {
      window.setTimeout(() => {
        onUploadStatement(bankId);
        if (i === targets.length - 1) setDropping(false);
      }, i * 140);
    });
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  const borderColor = drag
    ? "#001AFF"
    : hover
    ? "rgba(157, 179, 197, 0.5)"
    : "transparent";

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
        handleFiles(e.dataTransfer?.files ?? null);
      }}
      className="flex flex-col items-stretch transition"
      style={{
        width: "100%",
        background: "var(--surface-card-glow)",
        border: `1px solid ${borderColor}`,
        boxShadow: drag ? "var(--shadow-depth-3)" : "var(--shadow-depth-2)",
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.csv,.xlsx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so the same file can be re-picked in a subsequent open.
          e.target.value = "";
        }}
      />
      <Hero onBrowse={openPicker} busy={dropping} drag={drag} />
      <BankStrip banks={banks} uploads={uploads} />
    </div>
  );
}

function Hero({
  onBrowse,
  busy,
  drag,
}: {
  onBrowse: () => void;
  busy: boolean;
  drag: boolean;
}) {
  const headline = drag
    ? "Drop your files"
    : busy
    ? "Uploading files"
    : "Upload statements and ledgers";
  const helper = drag
    ? "Release to route each file to its bank"
    : busy
    ? "Matching each file to the right bank"
    : "Drop files here or browse — we'll route each one to its bank.";

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: "100%",
        padding: "40px 32px 24px",
        gap: 14,
        cursor: busy ? "default" : "pointer",
      }}
      onClick={busy ? undefined : onBrowse}
      role="button"
      tabIndex={busy ? -1 : 0}
      onKeyDown={(e) => {
        if (busy) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBrowse();
        }
      }}
    >
      {/* Illustration slot — soft-tinted round tile with a subtle inner glow
       * that grows on drag. The illustration used to float on transparent
       * background; framing it inside a tinted circle keeps it visually
       * anchored to the rest of the card. */}
      <div
        className="flex items-center justify-center"
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: drag
            ? "linear-gradient(180deg, rgba(0,26,255,0.10) 0%, rgba(0,26,255,0.04) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,244,251,0.7) 100%)",
          border: drag
            ? "1px solid rgba(0,26,255,0.28)"
            : "1px solid rgba(157, 179, 197, 0.28)",
          boxShadow: drag
            ? "0 0 0 6px rgba(0,26,255,0.08), var(--shadow-depth-1)"
            : "var(--shadow-depth-1)",
          transition:
            "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        }}
      >
        <Image
          src="/icons/upload-document.svg"
          width={44}
          height={44}
          alt=""
          aria-hidden
        />
      </div>

      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <div
          style={{
            fontSize: 18,
            lineHeight: "22px",
            color: "var(--text-1)",
            letterSpacing: "-0.005em",
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
            maxWidth: 440,
          }}
        >
          {helper}
        </div>
      </div>

      {/* Primary CTA. Icon on the left reads as an "add files" affordance
       * (matches the top-right Re-upload chip pattern). Disabled while
       * routing so a stray double-click doesn't queue a phantom batch. */}
      <span
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ marginTop: 2 }}
      >
        <Button
          variant="primary"
          size="md"
          onClick={onBrowse}
          disabled={busy}
          leftIcon={
            busy ? (
              <Loader2
                size={15}
                strokeWidth={1.75}
                className="animate-spin"
                style={{ opacity: 0.85 }}
              />
            ) : (
              <UploadCloud size={15} strokeWidth={1.75} />
            )
          }
        >
          {busy ? "Uploading" : "Choose files"}
        </Button>
      </span>

      <div
        style={{
          marginTop: 2,
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
          letterSpacing: "0.02em",
        }}
      >
        PDF, CSV, XLSX · 50 MB max per file
      </div>
    </div>
  );
}

/* Bank strip — informational preview of the banks that will receive files
 * once the user drops. Quiet, structural — not the visual centerpiece.
 * Small filled-count on the right helps the user see progress after any
 * partial batch has landed. */
function BankStrip({
  banks,
  uploads,
}: {
  banks: PropertyBank[];
  uploads: Record<string, BankStatementState>;
}) {
  const filled = banks.filter((b) => !!uploads[b.id]?.statement).length;
  return (
    <div
      className="flex flex-col items-stretch"
      style={{
        width: "100%",
        padding: "14px 20px 18px",
        gap: 10,
        borderTop: "1px solid rgba(157, 179, 197, 0.22)",
        background: "rgba(247, 249, 253, 0.5)",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8 }}
      >
        <span
          style={{
            fontSize: 12,
            lineHeight: "15px",
            color: "var(--text-2)",
          }}
        >
          Routes to
        </span>
        <span
          className="tabular-nums"
          style={{
            fontSize: 12,
            lineHeight: "15px",
            color: "var(--text-1)",
          }}
        >
          {filled === 0
            ? `${banks.length} ${banks.length === 1 ? "bank" : "banks"}`
            : `${filled} of ${banks.length}`}
        </span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: "rgba(157, 179, 197, 0.28)",
          }}
        />
      </div>
      <div
        className="flex flex-row items-stretch"
        style={{ width: "100%", gap: 6, flexWrap: "wrap" }}
      >
        {banks.map((b) => (
          <BankInfoChip
            key={b.id}
            bank={b}
            filled={!!uploads[b.id]?.statement}
          />
        ))}
      </div>
    </div>
  );
}

function BankInfoChip({
  bank,
  filled,
}: {
  bank: PropertyBank;
  filled: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        flex: "1 1 160px",
        minWidth: 150,
        height: 30,
        padding: "0 10px 0 4px",
        gap: 8,
        background: filled ? "#F1FBF3" : "rgba(255,255,255,0.65)",
        border: `1px solid ${
          filled ? "rgba(30, 200, 0, 0.35)" : "rgba(157, 179, 197, 0.28)"
        }`,
        boxShadow: filled ? "var(--shadow-chip)" : "none",
        borderRadius: 999,
        cursor: "default",
      }}
      title={`${shortBankName(bank.name)} · ${bank.type} · ${bank.accountNumber}`}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: filled ? "#22C55E" : "#FFFFFF",
          border: filled
            ? "1px solid rgba(15, 77, 38, 0.22)"
            : "1px solid rgba(157, 179, 197, 0.32)",
          boxShadow: filled ? "none" : "var(--shadow-chip)",
        }}
      >
        {filled ? (
          <Check size={12} strokeWidth={2.5} color="#FFFFFF" />
        ) : (
          <Image
            src={bank.logoSrc}
            width={14}
            height={14}
            alt=""
            style={{ objectFit: "contain" }}
          />
        )}
      </span>
      <div
        className="flex flex-row items-baseline min-w-0"
        style={{ gap: 6, flex: 1 }}
      >
        <span
          className="truncate"
          style={{
            fontSize: 12,
            lineHeight: "15px",
            color: "var(--text-1)",
            fontWeight: filled ? 500 : 400,
          }}
        >
          {shortBankName(bank.name)}
        </span>
        <span
          className="truncate"
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-2)",
          }}
        >
          {bank.type} · {bank.accountNumber}
        </span>
      </div>
    </div>
  );
}

function shortBankName(full: string): string {
  const cleaned = full
    .replace(/,?\s*N\.A\.$/i, "")
    .replace(/\s+Bank$/i, "")
    .trim();
  if (/^JPMorgan Chase/i.test(cleaned)) return "Chase";
  if (/^Bank of America/i.test(cleaned)) return "BoA";
  if (/^Wells Fargo/i.test(cleaned)) return "Wells Fargo";
  return cleaned;
}
