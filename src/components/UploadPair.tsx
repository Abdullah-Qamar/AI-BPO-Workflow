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
import { FileUp, FileText, Table } from "lucide-react";
import type { PropertyBank, UploadPair as UploadPairType } from "@/lib/seed";
import { WireConnector } from "./WireConnector";
import { StatusChip, type StatusTone } from "./ui/Status";

/* A preferred width, not a fixed one. Two 295px cards plus the wire between
 * them need ~630px, and the workspace canvas is 620px at a 1512px viewport with
 * the session list open — ten pixels short, so the ledger card was clipped by
 * the canvas edge on the app's most common layout. The cards shrink to fit
 * instead. */
const CARD_W = 295;
/* A floor, not a ceiling. It was a fixed height, and the ledger card's three
 * values — a legal entity plus a property name, a GL code plus its label, and a
 * full period — each wrap to two or three lines in a 295px card, so the content
 * ran past the bottom and collided with the absolutely-positioned date. The two
 * cards in a pair still match each other's height: the row stretches them, so
 * the wire between them still meets both at the same point. */
const CARD_H = 262;

/* Soft tints derived from the drag accent, so the drop glow can never drift
 * away from the stroke it belongs to. */
const DRAG_GLOW = "color-mix(in srgb, var(--dot-active) 14%, transparent)";

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
        className="flex flex-row items-stretch relative"
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

  /* Pair is only "complete" (wire lights up) when BOTH statement and ledger
   * have landed. If either is missing the wire stays in inactive/unplugged
   * mode — the pairing signal is what activates the wire, not just the bank
   * side being uploaded. */
  const pairComplete = statementUploaded && ledgerUploaded;

  return (
    <div
      className="flex flex-row items-stretch relative"
      style={{ width: "100%" }}
    >
      <BankCard pair={pair} />
      <WireSpan
        active={pairComplete && !!isActiveBank}
        complete={stageTone === "complete"}
        stageLabel={hideBadge ? null : stageLabel ?? null}
        stageTone={stageTone ?? "neutral"}
        inactive={!pairComplete}
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
  /* Mount-in bloom — plays a soft rise + green-glow burst so the transition
   * from InactiveBankCard to the populated BankCard reads as "file landed"
   * rather than an instant swap. The BulkUploadCard version of this
   * animation unmounts too fast to be seen; running it on the pair-row card
   * mount is where the delight actually surfaces. */
  return (
    <div
      className="flex flex-col justify-start items-start shrink-0 relative card-bloom-in"
      style={{
        flex: `1 1 ${CARD_W}px`,
        maxWidth: CARD_W,
        minWidth: 0,
        minHeight: CARD_H,
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
          <div className="t-title ink-primary">{bank.bank.name}</div>
          <div className="t-meta ink-tertiary">{bank.bank.address}</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />

      <Field label="Account Holder:" value={bank.accountHolder} />
      <Field label="Account Number:" value={bank.accountNumber} nums />
      <Field label="Period:" value={bank.period} />
      <BottomLeftDate label={`Issue: ${bank.issue}`} />
    </div>
  );
}

function LedgerCard({ pair }: { pair: UploadPairType }) {
  const { ledger } = pair;
  return (
    <div
      className="flex flex-col justify-start items-start shrink-0 relative card-bloom-in"
      style={{
        flex: `1 1 ${CARD_W}px`,
        maxWidth: CARD_W,
        minWidth: 0,
        minHeight: CARD_H,
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
      <Field label="Cash Account:" value={ledger.cashAccount} nums />
      <Field label="Period:" value={ledger.period} />
      <BottomLeftDate label={`Exported: ${ledger.exported}`} />
    </div>
  );
}

/* The card's lowest-altitude metadata, sitting at its foot.
 *
 * It used to be absolutely positioned at `bottom: 16` on a fixed-height card,
 * which pinned it to the corner and let the field rows above run underneath it
 * once a value wrapped. `margin-top: auto` puts it at the foot of the flow
 * instead, so it is pushed down by content rather than covered by it, and the
 * card grows to fit. */
function BottomLeftDate({ label }: { label: string }) {
  return (
    <div
      className="t-meta ink-tertiary shrink-0"
      style={{ marginTop: "auto", paddingTop: "var(--space-4)" }}
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
        border: "1px solid var(--dot-active)",
        boxShadow: `0 0 0 3px ${DRAG_GLOW}, var(--shadow-depth-1)`,
      }
    : hover
    ? {
        background: "rgba(255,255,255,0.65)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-depth-1)",
      }
    : {
        background: "rgba(247, 248, 250, 0.55)",
        border: "1px solid var(--line-menu)",
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
        flex: `1 1 ${CARD_W}px`,
        maxWidth: CARD_W,
        minWidth: 0,
        minHeight: CARD_H,
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
            borderRadius: "var(--radius-control)",
            background: "#FFFFFF",
            border: "1px solid var(--line-menu)",
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
          <div className="t-title ink-secondary">{bank.name}</div>
          <div className="t-meta ink-tertiary">
            {bank.type} · <span className="nums">{bank.accountNumber}</span>
          </div>
        </div>
      </div>

      <div
        style={{ width: "100%", height: 1, background: "var(--line-hair)" }}
      />

      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{ width: "100%", gap: 10 }}
      >
        {/* The card receives a file rather than sending one, so the glyph is
          * FileUp. `Upload` is reserved for buttons and menu items. */}
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--control-lg)",
            height: "var(--control-lg)",
            borderRadius: "var(--radius-sheet)",
            background: hover ? "#FFFFFF" : "rgba(255,255,255,0.7)",
            border: "1px solid var(--line-menu)",
            color: "var(--ink-secondary)",
            transition: "background 140ms ease",
          }}
        >
          <FileUp size={16} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col items-center" style={{ gap: 2 }}>
          <div
            className="t-body ink-primary"
            style={{ fontWeight: "var(--weight-medium)" }}
          >
            Upload statement
          </div>
          <div className="t-meta ink-tertiary">Drop or click · PDF, CSV</div>
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
        flex: `1 1 ${CARD_W}px`,
        maxWidth: CARD_W,
        minWidth: 0,
        minHeight: CARD_H,
        padding: "20px 16px 16px",
        gap: 12,
        background: "rgba(247, 248, 250, 0.4)",
        border: "1px solid var(--line-hair)",
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
            borderRadius: "var(--radius-control)",
            background: "rgba(255,255,255,0.65)",
            border: "1px solid var(--line-menu)",
            color: "var(--ink-tertiary)",
          }}
        >
          {/* Table, like every other Ledger header in the app. A ledger is the
            * table of GL entries exported from Yardi; FileText is "a single
            * file" and said nothing about which of the two documents this card
            * is waiting for. */}
          <Table size={16} strokeWidth={1.5} />
        </div>
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
          <div className="t-title ink-secondary">Ledger</div>
          <div className="t-meta ink-tertiary">Awaiting statement</div>
        </div>
      </div>

      <div
        style={{ width: "100%", height: 1, background: "var(--line-hair)" }}
      />

      {/* A document that has not arrived, not an institution. `Landmark` is the
        * bank's glyph and sat here on the LEDGER card, which is the one place
        * in the pair that has nothing to do with a bank. */}
      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{ width: "100%", opacity: 0.5, color: "var(--ink-tertiary)" }}
      >
        <FileText size={20} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function LedgerEmptyCard({ onUpload }: { onUpload?: () => void }) {
  /* Same chrome as the populated LedgerCard so the silhouette doesn't shift
   * when the upload resolves. The body holds a single lifted inner sheet —
   * solid stroke, never dashed (decisions.md §3).
   * Resting: card surface, hairline outline, chip-depth shadow.
   * Hover  : brightens to white, --line stroke, lifts to depth-1.
   * Drag   : --dot-active stroke + soft glow. */
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);

  const dropzoneVisual = drag
    ? {
        background: "#FFFFFF",
        border: "1px solid var(--dot-active)",
        boxShadow: `0 0 0 3px ${DRAG_GLOW}, var(--shadow-depth-1)`,
      }
    : hover
    ? {
        background: "#FFFFFF",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-depth-1)",
      }
    : {
        background: "var(--surface-list)",
        border: "1px solid var(--line-menu)",
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
        flex: `1 1 ${CARD_W}px`,
        maxWidth: CARD_W,
        minWidth: 0,
        minHeight: CARD_H,
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
          padding: "12px 8px",
          gap: 10,
          background: dropzoneVisual.background,
          border: dropzoneVisual.border,
          boxShadow: dropzoneVisual.boxShadow,
          borderRadius: "var(--radius-sheet)",
          transition:
            "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
        }}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--control-lg)",
            height: "var(--control-lg)",
            borderRadius: "var(--radius-sheet)",
            background: "#FFFFFF",
            border: "1px solid var(--line-menu)",
            boxShadow: "var(--shadow-chip)",
            color: "var(--ink-secondary)",
          }}
        >
          <FileUp size={16} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col items-center" style={{ gap: 2 }}>
          {/* --type-title here was the outlier: title is for card and section
            * titles, not for the label on an affordance inside one. */}
          <div
            className="t-body ink-primary"
            style={{ fontWeight: "var(--weight-medium)" }}
          >
            Add Yardi ledger
          </div>
          <div className="t-meta ink-tertiary">Drop or click · CSV, XLSX</div>
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
      {/* Pairs with the statement card's bank logo: that side is identified by
        * the institution that issued it, this one by what it is — the table of
        * GL entries exported from Yardi. Sized and stroked to sit on the same
        * line as its twin so the two headers read as one row. */}
      <Table
        size={20}
        strokeWidth={1.5}
        style={{ flexShrink: 0, color: "var(--ink-tertiary)" }}
      />
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
        <div className="t-title ink-primary">Ledger</div>
        {/* The subtitle carries a hostname, which has no break opportunity of
          * its own: in a card squeezed to ~153px it ran straight out the side.
          * Breaking mid-token is ugly and staying inside the card is not
          * optional. */}
        <div
          className="t-meta ink-tertiary"
          style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

/* Field row. The label is referred to, the value is read — so the label is
 * meta/tertiary and the value is body/primary. They used to be the same size
 * with the emphasis inverted, which flattened the card.
 *
 * Neither column has a hard floor any more. The label was a fixed 114px and the
 * value a `flex-1` with the default `min-width: auto`, so the pair could not go
 * below 114 + its longest word — and once the canvas drops to ~390px (1280
 * viewport, session list and agents panel both open) the two 295px cards shrink
 * to ~153 and every value ran out past the card, past the canvas, and into a
 * horizontal scrollbar. The label now gives width up as a last resort and the
 * value breaks rather than escaping. At the widths this actually renders at
 * there is slack in the row, so shrinking never engages and nothing moves. */
function Field({
  label,
  value,
  nums,
}: {
  label: string;
  value: string;
  nums?: boolean;
}) {
  return (
    <div className="flex flex-row items-baseline" style={{ width: "100%", gap: 12 }}>
      <div
        className="t-meta ink-tertiary"
        style={{ flex: "0 1 114px", minWidth: 0 }}
      >
        {label}
      </div>
      {/* A 40px basis rather than the `flex-1` zero it had. The value is the
        * only thing in the row that grows, so at every width the card actually
        * renders at it still ends up exactly where it did — but when the row
        * runs NEGATIVE the basis is what it shrinks from, and a zero basis
        * shrinks to zero and spills its text over the label beside it. */}
      <div
        className={`t-body ink-primary${nums ? " nums" : ""}`}
        style={{
          flex: "1 1 var(--space-10)",
          minWidth: 0,
          overflowWrap: "anywhere",
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
          {/* One status vocabulary, with an explicit label because this text is
            * an agent's present-tense action ("Matching… 62%"), not a status
            * name. The halo is the one addition to the flat chip recipe: the
            * chip sits on the wire artwork rather than on a flat surface. */}
          <StatusChip
            tone={STAGE_TONE[stageTone]}
            label={stageLabel}
            style={{
              fontVariantNumeric: "tabular-nums lining-nums",
              boxShadow: "0 0 0 3px rgba(255, 255, 255, 0.75)",
            }}
          />
        </div>
      )}
    </div>
  );
}

const STAGE_TONE: Record<StageTone, StatusTone> = {
  neutral: "neutral",
  active: "info",
  complete: "ok",
};

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
          borderRadius: "var(--radius-control)",
          background: "var(--line)",
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
