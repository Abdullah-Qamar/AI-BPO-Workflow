"use client";

/* SlotChip — the atomic upload affordance used twice per bank (statement +
 * ledger). Two visual states:
 *
 *   empty:  dashed slate border, upload icon + slot label.
 *   filled: solid border, success tint, check icon + filename (truncated).
 *
 * The chip is the click target; clicking opens the file picker (mocked in the
 * prototype — onPick fires immediately). */

import { Check, Upload } from "lucide-react";
import { useState } from "react";
import type { BankFile } from "@/lib/seed";

export type SlotKind = "statement" | "ledger";

const COPY: Record<SlotKind, { label: string; hint: string }> = {
  statement: { label: "Bank statement", hint: "PDF, CSV" },
  ledger: { label: "Yardi ledger", hint: "CSV, XLSX" },
};

export function SlotChip({
  kind,
  file,
  onPick,
  width,
}: {
  kind: SlotKind;
  file?: BankFile;
  onPick?: () => void;
  width?: number;
}) {
  const [hover, setHover] = useState(false);
  const copy = COPY[kind];
  const filled = !!file;

  if (filled) {
    return (
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center text-left transition"
        style={{
          width: width ?? "100%",
          minWidth: 0,
          padding: "8px 12px",
          gap: 10,
          background: hover ? "#DCF4E5" : "#E8F8EE",
          border: "1px solid #C5EBD2",
          borderRadius: 10,
          cursor: "pointer",
        }}
        title={`${file.filename} · ${file.sizeLabel}`}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "#1EFF00",
            color: "#0F7A3D",
          }}
        >
          <Check size={14} strokeWidth={2} color="#0F4D26" />
        </span>
        <span className="flex flex-col min-w-0">
          <span
            className="truncate"
            style={{
              fontSize: 13,
              lineHeight: "16px",
              color: "#0F4D26",
            }}
          >
            {file.filename}
          </span>
          <span
            className="truncate"
            style={{
              fontSize: 11,
              lineHeight: "14px",
              color: "#2E7A4D",
            }}
          >
            {file.sizeLabel} · {copy.label}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center text-left transition"
      style={{
        width: width ?? "100%",
        minWidth: 0,
        padding: "8px 12px",
        gap: 10,
        background: hover ? "#FAFBFD" : "transparent",
        border: `1.5px dashed ${hover ? "#7C8C9A" : "#9DB3C5"}`,
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: hover ? "#EFF3F8" : "#F2F4FB",
          color: "#43484E",
        }}
      >
        <Upload size={12} strokeWidth={1.75} />
      </span>
      <span className="flex flex-col min-w-0">
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-1)",
          }}
        >
          {copy.label}
        </span>
        <span
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-2)",
          }}
        >
          {copy.hint}
        </span>
      </span>
    </button>
  );
}

/* Thin connector between the two slots. Dashed grey when at least one slot
 * is empty; solid soft-glow (mirrors the Wire.svg metaphor) when both are
 * filled. */
export function SlotConnector({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden
      className="shrink-0 inline-flex items-center justify-center"
      style={{ width: 36, height: 32 }}
    >
      <span
        style={{
          width: "100%",
          height: 0,
          borderTop: complete
            ? "1.5px solid #1F7FFF"
            : "1.5px dashed #9DB3C5",
          opacity: complete ? 0.9 : 0.7,
        }}
      />
    </span>
  );
}
