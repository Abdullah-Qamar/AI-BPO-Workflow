"use client";

/* AccountGrid — the workspace canvas laid out as one card per account.
 *
 * The second of the two reconciliation layouts. Variation 1 (UploadPair) gives
 * every account a full-width row: statement card, hand-drawn wire, ledger card.
 * That row is beautiful and it is also four near-identical bands stacked down a
 * 620px column, with the account's identity printed twice inside every one of
 * them and the wire eating the middle third. Reading "which accounts are ready"
 * means reading eight cards.
 *
 * This layout starts from the observation that a statement and a ledger are not
 * two peers that happen to be near each other — they are the two documents ONE
 * account owes for ONE cycle. So the account is the card, stated once, and the
 * two documents are two slots inside it. Four accounts then fit across the
 * canvas instead of down it, and the whole property is one glance.
 *
 * ----- What replaces the wire -----
 *
 * Variation 1's wire is a bridge drawn BETWEEN two cards; there is no between
 * here, so shrinking it would leave a decorative squiggle saying nothing. What
 * the wire actually communicates is "these two get compared", and the honest
 * way to say that inside a single card is to make the two slots two halves of
 * one sheet and put the claim on the SEAM between them:
 *
 *   nothing tied yet  → the seam is quiet hairline and wears an open-link mark;
 *                       the empty slot is a recessed well, so an incomplete
 *                       card visibly has a hole in it
 *   both documents in → the seam firms up, the mark closes, and the seam names
 *                       the period the two documents share, which is the actual
 *                       precondition for comparing them
 *   matching          → the seam's two halves fill inward from the statement
 *                       side and the ledger side and converge on the mark; the
 *                       foot names the stage and the percentage
 *   reconciled        → the mark becomes a check and the card's foot carries
 *                       the two figures the run produced
 *
 * The seam is a row in normal flow rather than absolutely positioned art, so it
 * cannot drift from the slots it joins at any width, and it costs 20px instead
 * of a third of the canvas.
 */

import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  Check,
  FileText,
  FileUp,
  Link2,
  Table,
  TriangleAlert,
  Unlink2,
} from "lucide-react";
import type { BankFile, PropertyBank } from "@/lib/seed";
import { StatusChip } from "./ui/Status";
import type { BankRuntime, SessionState } from "@/lib/session/types";
import { isLedgerUploaded, isStatementUploaded } from "@/lib/session/reducer";

/* The narrowest a card can be and still show a statement filename with enough
 * of its tail to tell two cycles apart. At the 620px canvas this gives two
 * columns; under ~540px it drops to one, which is the same card, not a
 * different one.
 *
 * Paired with `auto-fill`, not `auto-fit`. `auto-fit` collapses the tracks it
 * has no card for and hands their width to the ones it does, which on a wide
 * canvas stretched 2390 Shattuck's single account into a 1012px card: a 32px
 * logo, a 16px title and two slot rows smeared across a metre of screen. The
 * empty tracks stay, so a property with one account and a property with four
 * draw the same card. */
const MIN_CARD_W = 260;

/* Soft tint derived from the drag accent, so the drop glow can never drift away
 * from the stroke it belongs to. Same value UploadPair uses. */
const DRAG_GLOW = "color-mix(in srgb, var(--dot-active) 14%, transparent)";

export function AccountGrid({
  banks,
  shortNames,
  statementFiles,
  state,
  stageLabel,
  onUploadStatement,
  onUploadLedger,
}: {
  banks: PropertyBank[];
  /* "Chase", "Wells Fargo", "BoA" — the brand as a reader says it. `PropertyBank`
   * only carries the legal name ("JPMorgan Chase Bank, N.A."), which is the right
   * string for a statement header and the wrong one for a 260px card. */
  shortNames: Record<string, string>;
  statementFiles: Record<string, BankFile>;
  state: SessionState;
  /* The same per-account stage line variation 1 puts on its wire, passed in
   * rather than imported so the two layouts cannot describe one stage two ways.
   * It arrives as a function so this file has no import back into MainCanvas. */
  stageLabel: (bankId: string) => string | null;
  onUploadStatement: (bankId: string) => void;
  onUploadLedger: (bankId: string) => void;
}) {
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CARD_W}px, 1fr))`,
        gap: "var(--space-6)",
        alignItems: "stretch",
      }}
    >
      {banks.map((bank) => (
        <AccountCard
          key={bank.id}
          bank={bank}
          shortName={shortNames[bank.id] ?? bank.name}
          statementFile={statementFiles[bank.id]}
          runtime={state.banks[bank.id]}
          runState={state.runState}
          stageLabel={stageLabel(bank.id)}
          onUploadStatement={() => onUploadStatement(bank.id)}
          onUploadLedger={() => onUploadLedger(bank.id)}
        />
      ))}
    </div>
  );
}

function AccountCard({
  bank,
  shortName,
  statementFile,
  runtime,
  runState,
  stageLabel,
  onUploadStatement,
  onUploadLedger,
}: {
  bank: PropertyBank;
  shortName: string;
  statementFile?: BankFile;
  runtime?: BankRuntime;
  runState: string;
  stageLabel: string | null;
  onUploadStatement: () => void;
  onUploadLedger: () => void;
}) {
  const pair = bank.uploaded;
  const statementIn = isStatementUploaded(runtime);
  const ledgerIn = isLedgerUploaded(runtime);
  const failed = runState === "failed";

  /* A failed session has been reset to zero uploads by the reducer, so its
   * slots are empty and would otherwise invite a file that the run can do
   * nothing with: `startRun` only leaves `draft`, and a failed session's only
   * route forward is the header's Retry. The slots go inert and say so through
   * the foot instead of offering a dead end. */
  const acceptsUploads = !failed;

  const label = `${shortName} ${bank.type}`;

  return (
    <article
      className="flex flex-col"
      style={{
        minWidth: 0,
        padding: "var(--pad-card)",
        gap: "var(--space-5)",
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      {/* Identity, once.
        *
        * The purpose leads because it is what distinguishes one account from
        * the next WITHIN a property, and this card only ever appears inside
        * one. The bank is carried by its logo and named beneath in meta; the
        * account holder is not here at all, because it is the property's legal
        * entity on every account and so belongs to the canvas heading, not to
        * four cards under it. */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: "var(--space-5)" }}
      >
        <BankLogo src={bank.logoSrc} dim={!statementIn} />
        <div className="flex flex-col min-w-0 flex-1" style={{ gap: "var(--space-1)" }}>
          <span className="t-title ink-primary truncate">{bank.type}</span>
          <span className="t-meta ink-tertiary truncate">
            {shortName} · <span className="nums">{bank.accountNumber}</span>
          </span>
        </div>
      </div>

      {/* The two documents, as one sheet with a seam. Takes the card's spare
        * height so every card in a grid row ends its foot on the same line. */}
      <div
        className="flex flex-col"
        style={{
          width: "100%",
          flex: 1,
          padding: "var(--space-2)",
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        {statementIn && pair ? (
          <FilledSlot
            kind="statement"
            title={statementFile?.filename ?? pair.bank.accountNumber}
            meta={
              statementFile
                ? `${statementFile.sizeLabel} · Issued ${pair.bank.issue}`
                : `Issued ${pair.bank.issue}`
            }
          />
        ) : (
          <EmptySlot
            kind="statement"
            title={acceptsUploads ? "Add statement" : "Not uploaded"}
            hint={acceptsUploads ? "Drop or click · PDF, CSV" : undefined}
            ariaLabel={`Upload statement for ${label}`}
            onUpload={acceptsUploads ? onUploadStatement : undefined}
          />
        )}

        <Seam
          statementIn={statementIn}
          ledgerIn={ledgerIn}
          failed={failed}
          stage={runtime?.stage}
          progress={runtime?.comparingProgress ?? 0}
          period={pair?.bank.period ?? ""}
        />

        {ledgerIn && pair ? (
          <FilledSlot
            kind="ledger"
            title={pair.ledger.cashAccount}
            meta={`Exported ${pair.ledger.exported}`}
          />
        ) : statementIn ? (
          <EmptySlot
            kind="ledger"
            title={acceptsUploads ? "Add Yardi ledger" : "Not uploaded"}
            hint={acceptsUploads ? "Drop or click · CSV, XLSX" : undefined}
            ariaLabel={`Upload Yardi ledger for ${label}`}
            onUpload={acceptsUploads ? onUploadLedger : undefined}
          />
        ) : (
          /* The reducer only advances a ledger onto an account that already has
           * a statement, so offering the ledger slot first would be an
           * affordance that silently does nothing. It waits, visibly.
           *
           * Unless nothing is coming. On a failed session the statement slot
           * above already reads "Not uploaded", and a card that says the ledger
           * is waiting on a statement no one can now add describes a queue that
           * is not running. Both halves say the same thing there. */
          <EmptySlot
            kind="ledger"
            title={failed ? "Not uploaded" : "Waiting on the statement"}
          />
        )}
      </div>

      <Foot
        runtime={runtime}
        runState={runState}
        stageLabel={stageLabel}
        statementIn={statementIn}
        ledgerIn={ledgerIn}
      />
    </article>
  );
}

/* ----- The seam -----
 *
 * The join between the two slots, and the whole of this layout's answer to
 * variation 1's wire. Three parts on one 20px row: a rule reaching in from the
 * statement side, the mark, a rule reaching in from the ledger side.
 *
 * The rules are what carry the live state. During matching they stop being
 * rules and become two tracks that fill INWARD — the statement half from the
 * left, the ledger half from the right — so the motion converges on the mark
 * rather than travelling across it. That is the shape of the work: two sources
 * being resolved into one verdict, not something flowing from A to B. */
function Seam({
  statementIn,
  ledgerIn,
  failed,
  stage,
  progress,
  period,
}: {
  statementIn: boolean;
  ledgerIn: boolean;
  failed: boolean;
  stage?: BankRuntime["stage"];
  progress: number;
  period: string;
}) {
  const tied = statementIn && ledgerIn;
  const comparing = stage === "comparing";
  const settled = stage === "reconciled" || stage === "posted";
  const working =
    stage === "scanning" ||
    stage === "parsing" ||
    stage === "normalizing" ||
    stage === "normalized" ||
    stage === "posting";

  /* Decorative throughout: every state the mark shows is also named in words in
    * the card's foot, so announcing the glyph as well would read the state
    * twice. */
  const mark = failed ? (
    <TriangleAlert
      size={14}
      strokeWidth={1.75}
      aria-hidden
      style={{ color: "var(--status-danger)" }}
    />
  ) : settled ? (
    <Check
      size={14}
      strokeWidth={1.75}
      aria-hidden
      style={{ color: "var(--status-ok-ink)" }}
    />
  ) : tied ? (
    <Link2
      size={14}
      strokeWidth={1.75}
      aria-hidden
      style={{
        color:
          comparing || working
            ? "var(--status-info)"
            : "var(--ink-secondary)",
      }}
    />
  ) : (
    /* An open link, not a closed one dimmed. A dimmed closed link says "this is
      * tied but unimportant"; the account is not tied at all.
      *
      * Quiet by ink, not by opacity: a stroked glyph at 0.65 reads washed out
      * rather than quiet, and --ink-tertiary is already the bottom of the ramp
      * (docs/design-system/icons.md, Rules). */
    <Unlink2
      size={14}
      strokeWidth={1.75}
      aria-hidden
      style={{ color: "var(--ink-tertiary)" }}
    />
  );

  /* The one fact the seam states in words, and only where it is load-bearing:
    * both documents are present and the reason they can be compared is that
    * they cover the same span. Everywhere else the rules and the mark say
    * enough, and a label would just be four repetitions of the canvas heading.
    *
    * Not during matching, even though the figure is right there in `progress`.
    * The foot already reads "Matching… 42%", and printing 42% twice on a card
    * this small made the two say it at each other. The converging fill is the
    * seam's account of the same thing, and it does not need a caption. */
  const label =
    tied && !comparing && !settled && !working && !failed ? period : null;

  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        height: 20,
        /* Matched to the slots' own text inset so the rails start and stop where
          * the two documents' names do, rather than floating wider than the
          * thing they join. */
        padding: "0 var(--space-5)",
        gap: "var(--space-4)",
      }}
    >
      {/* Tone lives on the mark, not on the rails.
        *
        * Tinting the rails as well meant a settled account said "green" three
        * times over — rails, check, and the matched figure below — and the
        * status tints are so pale at 2px that the rail effectively vanished
        * into the sheet while doing it. The rails answer one question only:
        * is this half's document here. That leaves the one colour they DO
        * take, the matching fill, unmistakable. */}
      <SeamRail
        solid={statementIn}
        fill={comparing ? progress : 0}
        from="left"
      />
      <span
        className="inline-flex items-center shrink-0"
        style={{ gap: "var(--space-3)" }}
      >
        {mark}
        {label && (
          <span
            className="t-meta nums ink-tertiary"
            style={{ whiteSpace: "nowrap" }}
          >
            {label}
          </span>
        )}
      </span>
      <SeamRail
        solid={ledgerIn}
        fill={comparing ? progress : 0}
        from="right"
      />
    </div>
  );
}

function SeamRail({
  solid,
  fill,
  from,
}: {
  solid: boolean;
  fill: number;
  from: "left" | "right";
}) {
  return (
    <span
      className="flex-1"
      style={{
        minWidth: "var(--space-4)",
        height: 2,
        borderRadius: 999,
        background: solid ? "var(--line-soft)" : "var(--line-hair)",
        overflow: "hidden",
        display: "flex",
        justifyContent: from === "left" ? "flex-start" : "flex-end",
      }}
    >
      <span
        style={{
          display: "block",
          width: `${Math.round(fill * 100)}%`,
          height: "100%",
          borderRadius: 999,
          background: "var(--status-info)",
          transition: "width 120ms linear",
        }}
      />
    </span>
  );
}

/* ----- Slots ----- */

function FilledSlot({
  kind,
  title,
  meta,
}: {
  kind: "statement" | "ledger";
  title: string;
  meta: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-1)",
      }}
    >
      <SlotLabel kind={kind} />
      <span className="t-body ink-primary truncate" style={{ width: "100%" }}>
        {title}
      </span>
      <span className="t-meta ink-tertiary truncate" style={{ width: "100%" }}>
        {meta}
      </span>
    </div>
  );
}

/* The recessed well. A filled slot sits flush on the sheet and an empty one is
 * sunk into it, so a card that still owes a document has a visible hole in it
 * from across the canvas — which is the thing a reader is scanning for in the
 * draft phase. */
function EmptySlot({
  kind,
  title,
  hint,
  ariaLabel,
  onUpload,
}: {
  kind: "statement" | "ledger";
  /* Reads two ways on purpose. Where the slot takes a file the title is the
   * invitation ("Add statement") and the hint says how. Where it cannot — the
   * ledger before its statement, any slot in a failed session — the slot names
   * itself and the title states why it is empty, because "Drop or click" on a
   * target that ignores both is the worst kind of affordance. */
  title: string;
  hint?: string;
  ariaLabel?: string;
  onUpload?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);

  const interactive = !!onUpload;

  const visual = drag
    ? {
        background: "#FFFFFF",
        border: "1px solid var(--dot-active)",
        boxShadow: `0 0 0 3px ${DRAG_GLOW}`,
      }
    : hover && interactive
    ? {
        background: "#FFFFFF",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-depth-1)",
      }
    : {
        background: "var(--surface-input)",
        border: "1px solid transparent",
        boxShadow: "none",
      };

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onUpload}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUpload?.();
        }
      }}
      onDragEnter={(e) => {
        if (!interactive) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => {
        if (interactive) e.preventDefault();
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!interactive) return;
        e.preventDefault();
        setDrag(false);
        onUpload?.();
      }}
      className="flex flex-row items-center transition"
      style={{
        width: "100%",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
        background: visual.background,
        border: visual.border,
        boxShadow: visual.boxShadow,
        cursor: interactive ? "pointer" : "default",
        opacity: interactive ? 1 : 0.7,
        transition:
          "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      }}
    >
      {interactive && (
        /* The slot receives a file rather than sending one, so the glyph is
          * FileUp. `Upload` is reserved for buttons. */
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--control-md)",
            height: "var(--control-md)",
            borderRadius: "var(--radius-control)",
            background: "#FFFFFF",
            border: "1px solid var(--line-menu)",
            boxShadow: "var(--shadow-chip)",
            color: "var(--ink-secondary)",
          }}
        >
          <FileUp size={14} strokeWidth={1.75} />
        </span>
      )}
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: "var(--space-1)" }}>
        {!interactive && <SlotLabel kind={kind} />}
        <span
          className={`t-body truncate ${
            interactive ? "ink-primary" : "ink-tertiary"
          }`}
          style={{
            width: "100%",
            fontWeight: interactive
              ? "var(--weight-medium)"
              : "var(--weight-regular)",
          }}
        >
          {title}
        </span>
        {hint && (
          <span
            className="t-meta ink-tertiary truncate"
            style={{ width: "100%" }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/* Statement and Ledger are the contract's two words for the two documents, and
 * the slot names them rather than leaving the reader to infer it from position.
 * The glyphs match variation 1's: the statement is a document, the ledger is a
 * table of GL entries. */
function SlotLabel({ kind }: { kind: "statement" | "ledger" }) {
  const Icon = kind === "statement" ? FileText : Table;
  return (
    <span
      className="inline-flex items-center t-label"
      style={{ gap: "var(--space-3)" }}
    >
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden
        style={{ flexShrink: 0 }}
      />
      {kind === "statement" ? "Statement" : "Ledger"}
    </span>
  );
}

/* ----- The foot -----
 *
 * One line per card, and because the grid stretches every card in a row to the
 * same height these lines land on one baseline across the canvas. That is the
 * scan line: "which accounts are ready" is read here, left to right, without
 * opening anything. */
function Foot({
  runtime,
  runState,
  stageLabel,
  statementIn,
  ledgerIn,
}: {
  runtime?: BankRuntime;
  runState: string;
  stageLabel: string | null;
  statementIn: boolean;
  ledgerIn: boolean;
}) {
  /* Everything below is wrapped in this row rather than returned bare. The card
    * is a stretching flex column, so a chip returned on its own grew to the full
    * card width and read as a coloured banner instead of a label. */
  const row = (children: ReactNode) => (
    <div
      className="flex flex-row items-baseline flex-wrap"
      style={{ width: "100%", gap: "var(--space-5)" }}
    >
      {children}
    </div>
  );

  if (runState === "failed") {
    return row(<StatusChip tone="danger" label="Failed" />);
  }

  const stage = runtime?.stage;

  /* The one place the shared stage line is NOT used. `stageLabelFor` renders a
   * finished account as "52 approved · 16 flagged", which are two of the words
   * the consistency contract retires in favour of Matched and Exception, and it
   * flattens the run's whole result into one grey chip. The figures are the
   * payoff of the session, so they are set as figures.
   *
   * Figures, but not a lead metric. `--type-metric` is for the one number a
   * screen is about, and there are two of these on each of up to five cards —
   * none of them is that number. Title-size semibold gives them the weight of a
   * result without either one claiming to be the headline. */
  if (stage === "reconciled" || stage === "posted") {
    const matched = runtime?.approvedCount ?? 0;
    const exceptions = runtime?.exceptionCount ?? 0;

    /* Some sessions carry no per-account split — a cycle the seed records only
      * as failed, re-run from this canvas, produces a clean run with nothing to
      * report against it. Two noughts there read as a run that matched nothing,
      * which is the opposite of what happened, so the state says its name
      * instead. Variation 1 resolves the same case the same way. */
    if (matched + exceptions === 0) {
      return row(
        <StatusChip
          tone="ok"
          label={stage === "posted" ? "Completed" : "Reconciled"}
        />
      );
    }

    return row(
      <>
        <Figure value={matched} label="matched" ink="var(--status-ok-ink)" />
        <Figure
          value={exceptions}
          label={exceptions === 1 ? "exception" : "exceptions"}
          /* Zero exceptions is not a danger, it is the absence of one, so the
            * figure goes quiet rather than painting a red nought. */
          ink={
            exceptions > 0
              ? "var(--status-danger-ink)"
              : "var(--ink-tertiary)"
          }
        />
      </>
    );
  }

  /* Everything the agents are doing right now comes through the shared stage
    * line, so the two layouts cannot narrate one stage two different ways.
    *
    * Variation 1 suppresses these during running / reconciling / updating-yardi
    * and lets the agents panel carry the status alone. This layout does not:
    * its cards are compact enough that four live stage lines read as one
    * progress board rather than as noise, and per-account progress is most of
    * why you would choose this layout while a run is in flight. */
  if (stageLabel) {
    return row(<StatusChip tone="info" label={stageLabel} />);
  }

  if (statementIn && ledgerIn) {
    return row(<StatusChip tone="neutral" label="Ready to run" />);
  }
  if (statementIn) {
    return row(<StatusChip tone="neutral" label="Ledger needed" />);
  }
  return row(<StatusChip tone="neutral" label="Not started" />);
}

function Figure({
  value,
  label,
  ink,
}: {
  value: number;
  label: string;
  ink: string;
}) {
  return (
    <span className="inline-flex items-baseline" style={{ gap: "var(--space-3)" }}>
      <span
        className="nums"
        style={{
          fontSize: "var(--type-title)",
          lineHeight: "var(--leading-ui)",
          letterSpacing: "var(--tracking-title)",
          fontWeight: "var(--weight-semibold)",
          color: ink,
        }}
      >
        {value}
      </span>
      <span className="t-meta ink-tertiary">{label}</span>
    </span>
  );
}

function BankLogo({ src, dim }: { src: string; dim: boolean }) {
  return (
    <span
      className="shrink-0 flex items-center justify-center"
      style={{
        width: "var(--control-lg)",
        height: "var(--control-lg)",
        borderRadius: "var(--radius-control)",
        background: "#FFFFFF",
        border: "1px solid var(--line-menu)",
        overflow: "hidden",
      }}
    >
      <Image
        src={src}
        width={20}
        height={20}
        alt=""
        style={{
          objectFit: "contain",
          filter: dim ? "grayscale(0.85)" : undefined,
        }}
      />
    </span>
  );
}
