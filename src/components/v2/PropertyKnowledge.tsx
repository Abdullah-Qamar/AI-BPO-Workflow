"use client";

/* PropertyKnowledge — the Knowledge tab's surface.
 *
 * Standing instructions for one property: local facts a human knows and the
 * agents cannot infer from the documents.
 *
 * Three passes preceded this one, and each failure is worth naming because the
 * pull back toward it is strong. A flat stack of same-weight cards had no
 * hierarchy. Grouping by kind gave it hierarchy but bought it with containers —
 * four instructions arriving in four boxes, reading as an index of categories.
 * Folding those into one bordered card with hairline rows and a coloured left
 * rail per row fixed the box count and replaced it with visual noise: a rail, a
 * separator and a header divider all doing the work one icon could do.
 *
 * This pass follows the reference set in `Illustration Animation References/`:
 * discrete soft cards, generous radius, a tinted icon tile carrying the type,
 * title over grey body, and no rules anywhere. No section heading either — the
 * tab is already named Knowledge, so a title repeating it is a line of chrome.
 *
 * `hits` is the observability half, and the reason this surface exists at all:
 * an instruction that never fires is stale, and one firing on every bank every
 * month is a portfolio-wide rule wearing a property-scoped costume. */

import { useState } from "react";
import { Ban, Clock, Fingerprint, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AMBER, SUCCESS } from "./DocRow";
import type { HubPhase } from "@/lib/v2/hub";
import {
  NOTE_KIND_LABEL,
  type NoteKind,
  type PropertyNote,
} from "@/lib/v2/propertyNotes";

/* Type is carried by a tinted icon tile, not a rail. The tile identifies at a
 * glance, sits where the eye already enters the card, and costs no line.
 *
 * These are CATEGORIES, so none of them may borrow a status colour: `exclusion`
 * used to take AMBER, which is the mark for "open, waiting on a person" — a
 * note that excludes something is not a piece of outstanding work, and tinting
 * it that way put a warning colour on a rule that is functioning as intended.
 * The glyph is what identifies the kind; the tint only groups. */
const KIND_ACCENT: Record<NoteKind, string> = {
  identity: "var(--mark-human)",
  exclusion: "var(--ink-tertiary)",
  timing: "var(--agent-reconciliation)",
};

const KIND_ICON: Record<NoteKind, LucideIcon> = {
  identity: Fingerprint,
  exclusion: Ban,
  timing: Clock,
};

const KIND_ORDER: NoteKind[] = ["identity", "exclusion", "timing"];

/* Shown only in the composer. At the moment of writing an instruction the
 * distinction is a decision the user has to make; in the list it would be three
 * sentences explaining cards that already read clearly. */
const KIND_HINT: Record<NoteKind, string> = {
  identity: "The same entity written differently across sources",
  exclusion: "A charge with no counterpart to match against",
  timing: "An entry that settles outside its cycle",
};

export function PropertyKnowledge({
  phase,
  notes,
  onAdd,
}: {
  phase: HubPhase;
  /* The list is owned by the workspace, not by this tab: the tab strip badges
   * the count, so an instruction added here has to be visible to the header on
   * the same render. */
  notes: PropertyNote[];
  onAdd: (draft: {
    kind: NoteKind;
    title: string;
    body: string;
    appliesTo: string;
  }) => void;
}) {
  /* How many times an instruction fired is a result, so it stays hidden until
   * the agents have run — otherwise the cards assert "applied 4×" for a cycle
   * that has reconciled nothing. */
  const showHits =
    phase === "summary" || phase === "posting" || phase === "complete";

  const [composing, setComposing] = useState(false);

  const ordered = [...notes].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
  const applied = notes.reduce((n, note) => n + note.hits, 0);
  /* Only instructions that were in force during the run can be stale. One added
   * afterwards has no verdict yet. */
  const stale = notes.filter((n) => n.hits === 0 && !n.pending).length;

  return (
    <div
      className="flex flex-col"
      style={{ width: "100%", maxWidth: 880, gap: 12, paddingTop: 22 }}
    >
      {/* One line of context and the one control. No heading, no divider. */}
      <div className="flex flex-row items-center" style={{ gap: 16 }}>
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          Facts the agents cannot infer from the documents.
        </span>
        <span className="flex-1" />
        <span
          className="shrink-0"
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: showHits && stale > 0 ? AMBER : "var(--ink-tertiary)",
          }}
        >
          {showHits
            ? stale > 0
              ? `Applied ${applied}× · ${stale} never fired`
              : `Applied ${applied}× this cycle`
            : "In force this cycle"}
        </span>
        {!composing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setComposing(true)}
            leftIcon={<Plus size={14} strokeWidth={1.75} />}
          >
            Add instruction
          </Button>
        )}
      </div>

      {composing && (
        <Composer
          onCancel={() => setComposing(false)}
          onSave={(draft) => {
            onAdd(draft);
            setComposing(false);
          }}
        />
      )}

      {ordered.map((note) => (
        <NoteCard key={note.id} note={note} showHits={showHits} />
      ))}
    </div>
  );
}

/* ---------- Card ---------- */

function NoteCard({
  note,
  showHits,
}: {
  note: PropertyNote;
  showHits: boolean;
}) {
  /* Only meaningful once a run has produced verdicts. Before the run, an
   * instruction added a minute ago is in force for this cycle like any other —
   * it is only "from next run" if this cycle was already reconciled without
   * it. */
  const tooLate = note.pending === true && showHits;
  const unused = note.hits === 0 && !tooLate;
  const Icon = KIND_ICON[note.kind];
  const accent = KIND_ACCENT[note.kind];

  return (
    <div
      className="flex flex-row items-start"
      style={{
        gap: 14,
        padding: "16px 18px",
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      {/* Tinted tile. Low-alpha wash rather than a solid fill, so four of these
        * down a column read as a quiet key and not as four buttons. */}
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: `${accent}14`,
          border: `1px solid ${accent}24`,
        }}
      >
        <Icon size={15} strokeWidth={1.75} color={accent} />
      </span>

      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 5 }}>
        <div className="flex flex-row items-baseline" style={{ gap: 12 }}>
          <span
            className="flex-1"
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-primary)",
              fontWeight: "var(--weight-medium)",
            }}
          >
            {note.title}
          </span>
          <span
            className="shrink-0 nums"
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-prose)",
              color:
                showHits && !tooLate
                  ? unused
                    ? AMBER
                    : SUCCESS
                  : "var(--ink-tertiary)",
            }}
            title={
              tooLate
                ? "Added after this cycle was reconciled · applies from the next run"
                : showHits
                  ? unused
                    ? "Never applied this cycle · likely stale"
                    : "Times the agents applied this instruction this cycle"
                  : "In force for this cycle; usage is known once the run completes"
            }
          >
            {tooLate
              ? "from next run"
              : showHits
                ? unused
                  ? "never fired"
                  : `applied ${note.hits}×`
                : "in force"}
          </span>
        </div>

        {note.body && (
          <p
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-secondary)",
              margin: 0,
              maxWidth: "68ch",
            }}
          >
            {note.body}
          </p>
        )}

        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {NOTE_KIND_LABEL[note.kind]} · {note.appliesTo ?? "All banks"} ·{" "}
          {note.addedBy} · {note.addedOn}
        </span>
      </div>
    </div>
  );
}

/* ---------- Composer ----------
 *
 * The same card shape as the instructions it writes into, at the top of the
 * column. Four fields, in the order the thought arrives: what kind of thing this
 * is, what the agents should do, the fact behind it, and which accounts it
 * binds. */
function Composer({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (draft: {
    kind: NoteKind;
    title: string;
    body: string;
    appliesTo: string;
  }) => void;
}) {
  const [kind, setKind] = useState<NoteKind>("identity");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [appliesTo, setAppliesTo] = useState("");

  /* The instruction line is the only required field — it is the thing the agent
   * acts on. Everything else is provenance the card can live without. */
  const ready = title.trim().length > 0;

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "16px 18px",
        gap: 12,
        background: "#FFFFFF",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <div className="flex flex-row items-center" style={{ gap: 6 }}>
        {KIND_ORDER.map((k) => {
          const Icon = KIND_ICON[k];
          const on = kind === k;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="flex flex-row items-center transition"
              style={{
                height: 28,
                padding: "0 10px",
                gap: 6,
                borderRadius: 999,
                cursor: "pointer",
                background: on ? `${KIND_ACCENT[k]}14` : "transparent",
                border: `1px solid ${
                  on ? `${KIND_ACCENT[k]}30` : "rgba(157,179,197,0.30)"
                }`,
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: on ? "var(--ink-primary)" : "var(--ink-secondary)",
                fontFamily: "inherit",
              }}
            >
              <Icon
                size={13}
                strokeWidth={1.75}
                color={on ? KIND_ACCENT[k] : "var(--ink-tertiary)"}
              />
              {NOTE_KIND_LABEL[k]}
            </button>
          );
        })}
        <span className="flex-1" />
        <button
          onClick={onCancel}
          aria-label="Discard this instruction"
          className="flex items-center justify-center transition"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-secondary)",
          }}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
        }}
      >
        {KIND_HINT[kind]}
      </span>

      <Field
        value={title}
        onChange={setTitle}
        placeholder="What the agents should do — e.g. ignore the suite line in the statement address"
        autoFocus
      />
      <Field
        value={body}
        onChange={setBody}
        placeholder="The fact behind it, and why it is safe to rely on"
        multiline
      />

      <div className="flex flex-row items-center" style={{ gap: 12 }}>
        <div style={{ flex: "0 1 320px" }}>
          <Field
            value={appliesTo}
            onChange={setAppliesTo}
            placeholder="Applies to — leave empty for all banks"
          />
        </div>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          onClick={() => onSave({ kind, title, body, appliesTo })}
        >
          Save instruction
        </Button>
      </div>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  multiline,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const shared: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: 10,
    background: "var(--surface-card)",
    border: "1px solid rgba(157,179,197,0.34)",
    fontSize: "var(--type-body)",
    lineHeight: "var(--leading-prose)",
    color: "var(--ink-primary)",
    fontFamily: "inherit",
    outline: "none",
    resize: "none",
  };

  return multiline ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={shared}
    />
  ) : (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      style={shared}
    />
  );
}
