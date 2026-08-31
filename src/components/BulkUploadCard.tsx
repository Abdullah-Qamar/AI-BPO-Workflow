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
 *   2. Account strip — every bank account associated with this property,
 *      rendered as a visible informational chip (logo + short name + masked
 *      account). Not clickable: the strip is the "what will be filled"
 *      preview. If a statement lands for an account while the card is still
 *      open (e.g. from within an overlay re-upload), the chip flips to its
 *      "filled" tint.
 *
 *   3. File-type microcopy — the small "PDF, CSV, XLSX · 50 MB max" hint.
 *
 * All drop targets accept multiple files. Real File objects reach the
 * onUploadStatement callback (via a stubbed mapping) — the POC keeps the
 * mocked bank-routing, but the click / drop flow itself now behaves like a
 * genuine upload. */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, FileUp, Loader2, Upload } from "lucide-react";
import { getBankMeta, type PropertyBank } from "@/lib/seed";
import type { BankFile } from "@/lib/seed";
import { Button } from "./ui/Button";

export interface BankStatementState {
  statement?: BankFile;
}

/* Soft tints derived from the drag accent. color-mix keeps them tied to
 * --dot-active, so the drop affordance can never drift away from the stroke
 * it is meant to belong to. */
const DRAG_TINT = "color-mix(in srgb, var(--dot-active) 9%, transparent)";
const DRAG_GLOW = "color-mix(in srgb, var(--dot-active) 8%, transparent)";

export function BulkUploadCard({
  banks,
  uploads,
  onUploadStatement,
  onBrowseAll,
  flat = false,
}: {
  banks: PropertyBank[];
  uploads: Record<string, BankStatementState>;
  onUploadStatement: (bankId: string) => void;
  onBrowseAll?: () => void;
  /* When true, drop the outer card chrome (surface, shadow, radius). Used
   * inside the BulkUploadOverlay so the modal's inner sheet is the only
   * elevated surface and the hero content sits flush inside it. */
  flat?: boolean;
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
    ? "var(--dot-active)"
    : hover
    ? "var(--line-row-hover)"
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
        background: flat ? "transparent" : "var(--surface-card-glow)",
        border: flat
          ? drag
            ? "1px solid var(--dot-active)"
            : "1px solid transparent"
          : `1px solid ${borderColor}`,
        boxShadow: flat
          ? "none"
          : drag
          ? "var(--shadow-depth-3)"
          : "var(--shadow-depth-2)",
        borderRadius: flat ? 0 : "var(--radius-panel)",
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
      <AccountStrip banks={banks} uploads={uploads} />
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
    ? "Release to route each file to its account"
    : busy
    ? "Matching each file to the right bank"
    : "Drop files here or browse · we'll route each one to its account.";

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: "100%",
        padding: "40px 32px 24px",
        gap: 14,
        cursor: busy ? "default" : "pointer",
        /* Inside, not outside. This target is the full width of the card, and
         * the card clips its own overflow to keep its corners — so the app's
         * default 2px ring was drawn beyond the clip and a keyboard user
         * focusing the largest control on the screen saw nothing at all. */
        outlineOffset: -2,
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
      {/* Illustration slot — soft-tinted tile with a subtle inner glow that
       * grows on drag. The illustration used to float on transparent
       * background; framing it inside a tinted tile keeps it visually
       * anchored to the rest of the card. */}
      <div
        className="flex items-center justify-center"
        style={{
          width: 76,
          height: 76,
          borderRadius: "var(--radius-card)",
          background: drag ? DRAG_TINT : "var(--surface-card-glow)",
          border: drag
            ? "1px solid var(--dot-active)"
            : "1px solid var(--line-menu)",
          boxShadow: drag
            ? `0 0 0 6px ${DRAG_GLOW}, var(--shadow-depth-1)`
            : "var(--shadow-depth-1)",
          color: "var(--ink-tertiary)",
          transition:
            "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        }}
      >
        {/* Dropzone affordance. On the icon scale at --icon-mark rather than the
          * old 44px raster, so it sits with every other icon in the app. */}
        <FileUp size={24} strokeWidth={1.5} aria-hidden />
      </div>

      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <div className="t-title ink-primary">{headline}</div>
        <div className="t-body ink-secondary" style={{ maxWidth: 440 }}>
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
                size={14}
                strokeWidth={1.75}
                className="animate-spin"
                style={{ opacity: 0.85 }}
              />
            ) : (
              <Upload size={14} strokeWidth={1.75} />
            )
          }
        >
          {busy ? "Uploading" : "Choose files"}
        </Button>
      </span>

      <div className="t-meta ink-secondary" style={{ marginTop: 2 }}>
        PDF, CSV, XLSX · 50 MB max per file
      </div>
    </div>
  );
}

/* Account strip — informational preview of the accounts that will receive
 * files once the user drops. Quiet, structural — not the visual centerpiece.
 * A filled count on the header line helps the user see progress after any
 * partial batch has landed.
 *
 * The layout is a grid capped at two columns rather than a wrapping flex row.
 * Flex with a 160px basis put three chips on the first line and orphaned the
 * fourth, and squeezed every label until both the bank name AND the account
 * number truncated — "Wells Far… ******77…" tells the reader nothing. Two
 * columns give each chip roughly half the card at any of the widths this
 * renders at (canvas ~590px, overlay ~740px), and the grid drops to one
 * column below ~400px so a chip never falls under a readable width. */
function AccountStrip({
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
        padding: "4px 20px 18px",
        gap: 10,
        background: "transparent",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 6 }}
      >
        <span className="nums t-body ink-primary">
          {filled === 0
            ? `${banks.length} associated ${
                banks.length === 1 ? "account" : "accounts"
              }`
            : `${filled} of ${banks.length} filled`}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(max(200px, calc(50% - var(--space-3))), 1fr))",
        }}
      >
        {banks.map((b) => (
          <AccountInfoChip
            key={b.id}
            bank={b}
            filled={!!uploads[b.id]?.statement}
          />
        ))}
      </div>
    </div>
  );
}

function AccountInfoChip({
  bank,
  filled,
}: {
  bank: PropertyBank;
  filled: boolean;
}) {
  /* Play the "just filled" animation ONLY when filled transitions false → true
   * during the session, not on initial mount. Tracks previous state via a
   * ref so re-renders with the same filled value don't retrigger. */
  const prev = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    if (!prev.current && filled) {
      setJustFilled(true);
      const id = window.setTimeout(() => setJustFilled(false), 900);
      return () => window.clearTimeout(id);
    }
    prev.current = filled;
  }, [filled]);

  /* The seed already knows what an account is called — "Chase Op",
   * "Chase Escrow" — and that label is what distinguishes two accounts at the
   * same bank. The old local regex table collapsed both to "Chase" and
   * disagreed with the seed on Bank of America besides. */
  const label = getBankMeta(bank.id).shortName;

  return (
    <div
      className={`flex items-center min-w-0 ${filled ? "chip-lifted" : ""}`}
      style={{
        height: "var(--control-lg)",
        padding: "0 12px 0 4px",
        gap: 8,
        background: filled ? "var(--status-ok-bg)" : "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        cursor: "default",
        position: "relative",
        transition:
          "background 200ms ease, border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
        transform: justFilled ? "translateY(-1px)" : "translateY(0)",
        animation: justFilled ? "chip-fill-in 500ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
      }}
      data-hint={`${label} · ${bank.accountNumber}`}
    >
      {filled ? (
        <span
          key="filled"
          className="flex items-center justify-center shrink-0 relative"
          style={{
            width: "var(--control-sm)",
            height: "var(--control-sm)",
            borderRadius: 999,
            background: "var(--status-ok)",
            color: "#FFFFFF",
            overflow: "visible",
            animation: "mark-swap 400ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Check size={14} strokeWidth={1.75} />
          {justFilled && <ParticleBurst />}
        </span>
      ) : (
        /* Empty state — logo sits directly in the pill. The pill itself is
         * the frame; a second white-circle ring around the logo would
         * duplicate the shape and read as chrome. */
        <Image
          key="empty"
          src={bank.logoSrc}
          width={24}
          height={24}
          alt=""
          className="shrink-0"
          style={{ objectFit: "contain", width: 24, height: 24 }}
        />
      )}
      {/* Name gives up its width first. A half-printed account number is worse
       * than a half-printed bank name: the number is the thing the reader is
       * matching a file against. */}
      <span
        className="truncate t-body ink-primary"
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: filled
            ? "var(--weight-medium)"
            : "var(--weight-regular)",
        }}
      >
        {label}
      </span>
      <span className="shrink-0 nums t-meta ink-tertiary">
        {bank.accountNumber}
      </span>

      <style jsx>{`
        @keyframes chip-fill-in {
          0% { transform: translateY(0) scale(1); box-shadow: var(--shadow-chip); }
          40% { transform: translateY(-2px) scale(1.02); box-shadow: var(--shadow-depth-2); }
          100% { transform: translateY(-1px) scale(1); box-shadow: var(--shadow-chip); }
        }
        @keyframes mark-swap {
          0% { transform: scale(0.6); opacity: 0.4; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ParticleBurst — six soft dots emit from the leading mark's center in a
 * radial burst, then fade. Rendered inside the mark so its positioning
 * follows the chip. Runs once on mount (mounted only when justFilled is
 * true), plays for ~700ms, then unmounts. */
function ParticleBurst() {
  const N = 6;
  const particles = Array.from({ length: N }, (_, i) => {
    const angle = (i * 360) / N;
    const distance = 22 + (i % 2) * 4;
    return { angle, distance, delay: i * 20 };
  });
  return (
    <span
      aria-hidden
      className="absolute"
      style={{
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: 4,
              height: 4,
              borderRadius: 999,
              background: "var(--status-ok)",
              opacity: 0,
              animation: `particle-burst 600ms ${p.delay}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
              transform: "translate(-50%, -50%)",
              ["--angle" as string]: `${p.angle}deg`,
              ["--distance" as string]: `${p.distance}px`,
            } as React.CSSProperties
          }
        />
      ))}
      <style jsx>{`
        @keyframes particle-burst {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0.6);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle))
              translateY(calc(var(--distance) * -1)) scale(0.4);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
