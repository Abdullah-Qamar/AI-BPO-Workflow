"use client";

/* Bulk upload card — empty-state primary surface (and the overlay body).
 *
 * Shows ONLY when no banks have uploaded yet, OR when re-summoned from the
 * canvas overlay button. Single hero — illustration, headline, helper copy,
 * Browse button, file-type microcopy — plus a one-line indicator of how many
 * banks are associated with this property. Per-bank pills are gone; uploads
 * now happen inline on each pair row once at least one file lands.
 *
 * The card surface itself is a drop target. Drops route to the next empty
 * bank in order, keeping the "drop anywhere" promise honest. */

import Image from "next/image";
import { useState } from "react";
import { Landmark } from "lucide-react";
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
        const next = banks.find((b) => !uploads[b.id]?.statement);
        if (next) onUploadStatement(next.id);
        else onBrowseAll?.();
      }}
      className="flex flex-col items-stretch transition"
      style={{
        width: "100%",
        background: "var(--surface-card-glow)",
        border: `1px solid ${borderColor}`,
        boxShadow: drag ? "var(--shadow-depth-3)" : "var(--shadow-depth-2)",
        borderRadius: 20,
      }}
    >
      <Hero onBrowse={onBrowseAll} bankCount={banks.length} />
    </div>
  );
}

function Hero({
  onBrowse,
  bankCount,
}: {
  onBrowse?: () => void;
  bankCount: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: "100%",
        padding: "44px 32px 32px",
        gap: 16,
        cursor: "pointer",
      }}
      onClick={onBrowse}
      role="button"
      tabIndex={0}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "transparent",
        }}
      >
        <Image
          src="/icons/upload-document.svg"
          width={52}
          height={52}
          alt=""
          aria-hidden
        />
      </div>

      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <div
          style={{
            fontSize: 20,
            lineHeight: "24px",
            color: "var(--text-1)",
          }}
        >
          Upload statements and ledgers
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--text-2)",
            maxWidth: 500,
          }}
        >
          Drop bank statements and Yardi ledger exports here. We&apos;ll route
          each file to the right bank.
        </div>
      </div>

      <span
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="primary"
          size="md"
          onClick={onBrowse}
          style={{ marginTop: 2 }}
        >
          Browse files
        </Button>
      </span>

      <div
        className="flex flex-row items-center"
        style={{
          marginTop: 6,
          gap: 8,
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
        }}
      >
        <span
          className="inline-flex items-center"
          style={{
            gap: 6,
            padding: "4px 10px",
            background: "rgba(255, 255, 255, 0.55)",
            border: "1px solid rgba(157, 179, 197, 0.35)",
            borderRadius: 999,
          }}
        >
          <Landmark size={12} strokeWidth={1.5} color="#43484E" />
          <span className="tabular-nums" style={{ color: "var(--text-1)" }}>
            {bankCount}
          </span>
          <span>{bankCount === 1 ? "bank associated" : "banks associated"}</span>
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ letterSpacing: "0.02em" }}>
          PDF, CSV, XLSX · 50 MB max
        </span>
      </div>
    </div>
  );
}
