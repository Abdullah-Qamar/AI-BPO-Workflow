"use client";

/* DocRow — one document in the hub. Statements stack on the left, Yardi
 * ledgers on the right.
 *
 * 68px at rest: logo, bank name, masked account, state glyph. Clicking expands
 * it in place to show the document's full metadata; neighbours push down and
 * the hub re-measures so the strand re-curves to the new centre.
 *
 * Rows do not pre-render as empty slots — a row only exists once its file has
 * landed, and it materialises outward from the core to read as "intake routed
 * this document here". */

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { PropertyBank } from "@/lib/seed";
import {
  ROW_H,
  fileSize,
  ledgerFilename,
  statementFilename,
  type RowState,
  type Side,
} from "@/lib/v2/hub";

/* V2's status marks, kept as named exports because three of its components
 * import them — but pointing at the app's semantic pairs rather than at two
 * hexes of their own. #4B7F63 was the fourth green and #A8701C the second amber
 * in simultaneous service across the product. */
export const SUCCESS = "var(--status-ok)";
export const AMBER = "var(--status-warn)";

/* Duration of the expand/collapse morph. HubCanvas re-measures the strands for
 * at least this long so the curves stay attached while the row grows. */
export const ROW_MORPH_MS = 300;

export function DocRow({
  bank,
  side,
  state,
  detail,
  cycle,
  expanded,
  onToggle,
  dimmed,
  highlighted,
  onHoverChange,
  registerRef,
}: {
  bank: PropertyBank;
  side: Side;
  state: RowState;
  detail: string | null;
  cycle: string;
  expanded: boolean;
  onToggle: () => void;
  /* Another row is hovered — this one recedes so the lit strand reads. */
  dimmed: boolean;
  /* This row's pair-partner is hovered. The partner brightens but does NOT
   * expand: expansion stays an independent, deliberate act on each side. */
  highlighted: boolean;
  onHoverChange: (hovered: boolean) => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const isStatement = side === "statement";

  /* Natural height of the detail block, measured so the expand can animate to
   * an exact pixel target instead of a guessed max-height. Re-measured every
   * render because the content changes with state (the verdict line) and with
   * the cycle (filenames). */
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [detailH, setDetailH] = useState(0);
  useLayoutEffect(() => {
    const h = detailRef.current?.scrollHeight ?? 0;
    if (h !== detailH) setDetailH(h);
  });


  const accent =
    state === "exception" ? AMBER : state === "done" ? SUCCESS : "var(--line)";

  return (
    <div
      ref={registerRef}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={`flex flex-col overflow-hidden ${
        isStatement ? "row-enter-left" : "row-enter-right"
      }`}
      style={{
        width: "100%",
        minHeight: ROW_H,
        padding: "0 12px",
        background: "var(--surface-card)",
        border: `1px solid ${
          highlighted ? "rgba(157,179,197,0.55)" : "rgba(255,255,255,0.9)"
        }`,
        borderRadius: 12,
        boxShadow: highlighted
          ? "0 4px 14px -4px rgba(37,49,63,0.18)"
          : "var(--shadow-depth-1)",
        cursor: "pointer",
        /* Opacity is the hover-isolation state and nothing else. The entrance
         * used to drive it from a requestAnimationFrame flag, which meant a row
         * stayed at opacity 0 whenever rAF didn't fire — a mount animation must
         * never be able to hide content. The slide-in is now a pure CSS keyframe
         * on transform only, so the two can't fight and the row is visible even
         * if animation never runs. */
        opacity: dimmed ? 0.34 : 1,
        transition:
          "opacity 240ms ease, box-shadow 160ms ease, border-color 160ms ease",
      }}
    >
      {/* ----- Resting band ----- */}
      <div
        className="flex flex-row items-center shrink-0"
        style={{ height: ROW_H - 2, gap: 10 }}
      >
        <span
          className="shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "#FFFFFF",
            border: "1px solid rgba(157,179,197,0.28)",
          }}
        >
          <Image
            src={bank.logoSrc}
            alt=""
            width={20}
            height={20}
            style={{ width: 20, height: 20, objectFit: "contain" }}
          />
        </span>

        <span className="flex flex-col min-w-0 flex-1" style={{ gap: 1 }}>
          <span
            className="truncate"
            style={{ fontSize: "var(--type-body)", lineHeight: "var(--leading-ui)", color: "var(--ink-primary)" }}
          >
            {bank.type}
          </span>
          <span
            className="truncate"
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              color: detail ? "var(--ink-primary)" : "var(--ink-secondary)",
              opacity: detail ? 0.85 : 1,
            }}
          >
            {detail ?? (isStatement ? bank.accountNumber : bank.ledgerCashAccount)}
          </span>
        </span>

        <StateGlyph state={state} />
      </div>

      {/* ----- Expanded detail -----
        *
        * The morph matters: the column is centred on the core, so an instant
        * height change re-centres the whole side in a single frame and the
        * composition appears to jump. HubCanvas re-measures the strands on
        * every frame of this transition so the curves follow.
        *
        * Height animates from a measured pixel value rather than the
        * grid-template-rows 0fr→1fr trick, so the target is exact and no
        * max-height cap has to be guessed. */}
      <div
        style={{
          overflow: "hidden",
          height: expanded ? detailH : 0,
          transition: `height ${ROW_MORPH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <div ref={detailRef}>
        <div
          className="flex flex-col"
          style={{
            gap: 7,
            paddingBottom: 13,
            borderTop: `1px solid rgba(157,179,197,0.22)`,
            paddingTop: 11,
          }}
        >
          {(isStatement
            ? [
                ["File", statementFilename(bank.id, cycle)],
                ["Size", fileSize(bank.id + "s")],
                ["Holder", bank.accountHolder],
                ["Account", bank.accountNumber],
              ]
            : [
                ["File", ledgerFilename(bank.id, cycle)],
                ["Source", bank.ledgerSource],
                ["Tenant", bank.ledgerTenant],
                ["Account", bank.ledgerCashAccount],
              ]
          ).map(([label, value]) => (
            <span key={label} className="flex flex-row" style={{ gap: 8 }}>
              <span
                className="shrink-0"
                style={{
                  width: 52,
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  color: "var(--ink-tertiary)",
                }}
              >
                {label}
              </span>
              <span
                className="flex-1 min-w-0 truncate"
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  color: "var(--ink-secondary)",
                }}
                title={value}
              >
                {value}
              </span>
            </span>
          ))}
          <span
            style={{
              marginTop: 2,
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              color: accent,
            }}
          >
            {state === "exception"
              ? "Flagged rows in this account"
              : state === "done"
              ? "Ready"
              : state === "working"
              ? "In progress"
              : "Awaiting run"}
          </span>
        </div>
        </div>
      </div>

      {/* Rows emanate from the core, so the statement column slides left and the
        * ledger column slides right. Transform only — see the opacity note. */}
      <style jsx>{`
        .row-enter-left,
        .row-enter-right {
          animation: row-enter-l 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .row-enter-right {
          animation-name: row-enter-r;
        }
        @keyframes row-enter-l {
          from {
            transform: translateX(16px);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes row-enter-r {
          from {
            transform: translateX(-16px);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .row-enter-left,
          .row-enter-right {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function StateGlyph({ state }: { state: RowState }) {
  if (state === "working") {
    return (
      <Loader2
        size={14}
        strokeWidth={1.75}
        className="animate-spin shrink-0"
        color="var(--ink-secondary)"
      />
    );
  }
  if (state === "done") {
    return (
      <span
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "rgba(75,127,99,0.12)",
        }}
      >
        <Check size={14} strokeWidth={1.75} color={SUCCESS} />
      </span>
    );
  }
  if (state === "exception") {
    return (
      <span
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "rgba(168,112,28,0.12)",
        }}
      >
        <TriangleAlert size={14} strokeWidth={1.75} color={AMBER} />
      </span>
    );
  }
  return (
    <span
      className="shrink-0"
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        border: "1.5px solid rgba(98,116,131,0.42)",
      }}
    />
  );
}
