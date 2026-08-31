"use client";

/* SlotChip — the atomic upload affordance used twice per bank (statement +
 * ledger). Two visual states:
 *
 *   empty:  quiet lifted control fill, FileUp glyph + slot label and hint.
 *   filled: success tint, check mark + filename (truncated).
 *
 * The empty slot used to carry a 1.5px dashed stroke, which decisions.md §3
 * bans outright. "Empty and droppable" is now carried by fill and ink instead:
 * the slot sits on --surface-control with tertiary ink and an open FileUp
 * glyph, one step quieter than the filled chip beside it, and its stroke only
 * appears on hover (--line) or drag-over (--dot-active). A dashed rectangle was
 * never doing the work anyway — the contrast between a tinted, named, filled
 * slot and an untinted empty one is what a reader actually sees.
 *
 * The chip is the click target; clicking opens the file picker (mocked in the
 * prototype — onPick fires immediately). */

import { Check, FileUp } from "lucide-react";
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
          padding: "var(--space-4) var(--space-5)",
          gap: "var(--space-4)",
          background: "var(--status-ok-bg)",
          border: `1px solid ${hover ? "var(--line)" : "transparent"}`,
          borderRadius: "var(--radius-sheet)",
          cursor: "pointer",
        }}
        data-hint={`${file.filename} · ${file.sizeLabel}`}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--control-sm)",
            height: "var(--control-sm)",
            borderRadius: 999,
            background: "var(--status-ok)",
            color: "#FFFFFF",
          }}
        >
          <Check size={14} strokeWidth={1.75} />
        </span>
        <span className="flex flex-col min-w-0">
          <span
            className="truncate t-body"
            style={{ color: "var(--status-ok-ink)" }}
          >
            {file.filename}
          </span>
          <span
            className="truncate t-meta"
            style={{ color: "var(--status-ok-ink)" }}
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
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-4)",
        background: hover
          ? "var(--surface-control-hover)"
          : "var(--surface-control)",
        border: `1px solid ${hover ? "var(--line)" : "transparent"}`,
        borderRadius: "var(--radius-sheet)",
        cursor: "pointer",
      }}
    >
      {/* The slot receives a file rather than sending one, so the glyph is
        * FileUp; `Upload` is the action glyph and belongs on buttons. */}
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: "var(--control-sm)",
          height: "var(--control-sm)",
          borderRadius: 999,
          background: "#FFFFFF",
          border: "1px solid var(--line-menu)",
          color: "var(--ink-secondary)",
        }}
      >
        <FileUp size={14} strokeWidth={1.75} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="t-body ink-secondary">{copy.label}</span>
        <span className="t-meta ink-tertiary">{copy.hint}</span>
      </span>
    </button>
  );
}

/* Thin connector between the two slots. Solid throughout — dashed strokes are
 * banned — with the state carried by colour and weight instead: --line while
 * either slot is still empty, --status-ok once the pair is whole, which is the
 * same green the filled slot beside it uses. */
export function SlotConnector({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden
      className="shrink-0 inline-flex items-center justify-center"
      style={{ width: 36, height: 32 }}
    >
      {/* Two named lines rather than one line at two opacities: --line-hair is
        * the app's "barely there" rule and is what the account grid's seam uses
        * for the same "this half is still empty" state, so the two layouts
        * draw an untied pair the same weight. */}
      <span
        style={{
          width: "100%",
          height: 0,
          borderTop: `1px solid ${
            complete ? "var(--status-ok)" : "var(--line-hair)"
          }`,
        }}
      />
    </span>
  );
}
