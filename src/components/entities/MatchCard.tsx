"use client";

/* MatchCard — the item view. The most important surface in the product.
 *
 * TWO NEVERS, and they are the two failures this component was specified to
 * make impossible.
 *
 * NEVER offers "approve" as one of the four actions. Approving was never a
 * response to a real difference; it was a way of hiding one. The bank says
 * 1,200.00 and the books say 1,275.00, and moving that row into an approved
 * bucket does not make the 75.00 go away — it sends it onward labelled fine.
 * The four actions here each change a number in the balance proof, which is the
 * property that makes them answers rather than filing.
 *
 * NEVER presents the model's sentence as a finding. It sits in its own box,
 * under a heading that calls it a suggestion, below the rule and the candidates
 * rather than above them. The candidate ranker is a model reading free text and
 * guessing at intent; it may never move an item, change a status or touch the
 * proof, and a sentence rendered in the same voice as "rule 3 matched, same
 * amount and same reference" is that authority being taken by presentation.
 *
 * ---------------------------------------------------------------------------
 * Why the ledger side is a list
 *
 * One deposit covers three rents. That is the ordinary case, not an edge case —
 * the fixture's 12,450.00 ACH batch is 4,200 + 4,150 + 4,100 — and the old data
 * shape could not express it at all, which is why the review row had one amount
 * and one status and nowhere to put the other side.
 *
 * The two sides are drawn with equal width and equal weight. Neither the bank
 * nor the books is the authority: the whole method is two records that are
 * SUPPOSED to disagree, reconciled by explaining every difference.
 *
 * ---------------------------------------------------------------------------
 * Why the candidates are selectable
 *
 * Choosing between candidates is the most common thing a person does in this
 * job, and in the build this replaces they existed only as prose inside a
 * `reason` string: "2 candidate ledger entries · ambiguous", with approve and
 * flag as the only buttons. The product announced that it could not choose and
 * then offered nowhere to choose.
 *
 * Every candidate carries why it was turned down, or nothing if the matcher
 * turned down neither. An empty rejection reason on every candidate is the
 * honest rendering of "it could not decide", and writing one anyway to make the
 * shape look settled would be the product claiming a judgement it did not make.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §5, docs/UX_SPECS.md section 2,
 * docs/FLOWS.md F3.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Money } from "./Money";
import { OutcomeChip } from "./OutcomeChip";
import {
  bankTotal,
  difference,
  ledgerTotal,
  type Candidate,
  type Match,
  type MatchLine,
  type ResolutionKind,
} from "@/lib/reconciliation/match";

/* The four actions, in the words the specs use. "Approve" is absent by
 * construction: this list is the complete set and there is no fifth slot. */
const ACTIONS: { kind: ResolutionKind; label: string }[] = [
  { kind: "accept-as-timing", label: "It is just timing" },
  { kind: "correct-the-match", label: "Pick a different match" },
  { kind: "add-correcting-entry", label: "Add a correction" },
  { kind: "set-aside", label: "Set aside" },
];

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ---------- One line, on either side ---------- */

function Line({ line }: { line: MatchLine }) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <div
        className="flex flex-row items-baseline justify-between"
        style={{ gap: "var(--space-5)" }}
      >
        <span className="t-meta ink-tertiary nums shrink-0">
          {shortDate(line.date)}
        </span>
        <Money
          amount={line.amount}
          form="signed"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
          }}
        />
      </div>
      {/* The statement's own words, verbatim and in their own case.
        *
        * Upper case is retired everywhere else in this design language, and
        * this is the exception that proves the rule: a reviewer reading this
        * card may have the actual statement open beside it, and the point of
        * the line is that they can find it. Sentence-casing a document you are
        * quoting in an audit trail is editing evidence. */}
      <span className="t-meta ink-secondary" style={{ wordBreak: "break-word" }}>
        {line.description}
      </span>
      {(line.typeCode !== undefined || line.reference) && (
        <span className="t-meta ink-tertiary nums">
          {line.typeCode !== undefined && (
            <>
              code {line.typeCode}
              {line.typeMeaning && (
                <span style={{ fontVariantNumeric: "normal" }}>
                  {" · "}
                  {line.typeMeaning}
                </span>
              )}
            </>
          )}
          {line.typeCode !== undefined && line.reference && " · "}
          {line.reference}
        </span>
      )}
    </div>
  );
}

/* ---------- One side ---------- */

function Side({
  heading,
  lines,
  total,
  showTotal,
}: {
  heading: string;
  lines: MatchLine[];
  total: number;
  showTotal: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-list)",
        borderRadius: "var(--radius-sheet)",
        boxShadow: "var(--shadow-depth-1)",
        padding: "var(--space-6)",
        gap: "var(--space-5)",
      }}
    >
      <div
        className="flex flex-row items-baseline justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <span className="t-label">{heading}</span>
        {lines.length > 1 && (
          <span className="t-meta ink-tertiary nums">{lines.length} lines</span>
        )}
      </div>

      {lines.length === 0 ? (
        /* Nothing on this side is the WHOLE POINT of half the outcomes. A fee
          * the books never recorded has no ledger row, and an uncleared cheque
          * has no statement line. Saying so beats an empty panel. */
        <span className="t-body ink-tertiary">Nothing on this side</span>
      ) : (
        lines.map((line, i) => (
          <div key={line.id} className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            {i > 0 && (
              <div
                aria-hidden
                style={{ height: 1, background: "var(--line-hair)" }}
              />
            )}
            <Line line={line} />
          </div>
        ))
      )}

      {showTotal && lines.length > 1 && (
        <>
          <div
            aria-hidden
            style={{ height: 1, background: "var(--line-soft)" }}
          />
          <div
            className="flex flex-row items-baseline justify-between"
            style={{ gap: "var(--space-4)" }}
          >
            <span
              className="t-body ink-primary"
              style={{ fontWeight: "var(--weight-medium)" }}
            >
              Total
            </span>
            <Money
              amount={total}
              form="signed"
              emphasis="medium"
              style={{
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Candidates ---------- */

function CandidateList({
  candidates,
  ledgerRows,
  selected,
  onSelect,
}: {
  candidates: Candidate[];
  ledgerRows: MatchLine[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(ledgerRows.map((r) => [r.id, r]));

  return (
    <div
      className="flex flex-col"
      role="radiogroup"
      aria-label="Candidate matches"
      style={{ gap: "var(--space-4)" }}
    >
      {candidates.map((c) => {
        const rows = c.ledgerRowIds
          .map((id) => byId.get(id))
          .filter((r): r is MatchLine => Boolean(r));
        const isSelected = selected === c.id;

        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(c.id)}
            className="flex flex-row items-start w-full text-left"
            style={{
              padding: "var(--space-5)",
              gap: "var(--space-5)",
              borderRadius: "var(--radius-row)",
              background: isSelected ? "#FFFFFF" : "transparent",
              border: `1px solid ${
                isSelected ? "var(--line-row-hover)" : "var(--line-hair)"
              }`,
              boxShadow: isSelected ? "var(--shadow-chip)" : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 140ms ease, border-color 140ms ease",
            }}
          >
            {/* A real radio mark. The candidates are a choice between mutually
              * exclusive options and it should look like one; the build this
              * replaces offered no affordance at all. */}
            <span
              aria-hidden
              className="shrink-0"
              style={{
                width: 14,
                height: 14,
                marginTop: 2,
                borderRadius: 999,
                border: `1px solid ${
                  isSelected ? "var(--action-primary)" : "var(--line)"
                }`,
                background: isSelected ? "var(--action-primary)" : "transparent",
                boxShadow: isSelected ? "inset 0 0 0 3px #FFFFFF" : "none",
              }}
            />

            <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-row items-baseline justify-between"
                  style={{ gap: "var(--space-5)" }}
                >
                  <span className="t-body ink-primary truncate">
                    {r.description}
                  </span>
                  <span className="flex flex-row items-baseline shrink-0" style={{ gap: "var(--space-4)" }}>
                    <span className="t-meta ink-tertiary nums">
                      {shortDate(r.date)}
                    </span>
                    <Money
                      amount={r.amount}
                      form="signed"
                      style={{
                        fontSize: "var(--type-body)",
                        lineHeight: "var(--leading-ui)",
                      }}
                    />
                  </span>
                </div>
              ))}
              <span className="t-meta ink-tertiary">
                {/* "Considered", not "matched". The matcher matched neither of
                  * these — that is why the card is here — and writing "matched
                  * on same amount" under both would have the product claiming
                  * a judgement it explicitly did not make. */}
                {c.rejectedBecause
                  ? `Turned down: ${c.rejectedBecause}`
                  : `Considered on ${c.rule.label.toLowerCase()}`}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- The card ---------- */

export function MatchCard({
  match,
  modelSentence,
  onAct,
  available,
  readOnly,
}: {
  match: Match;
  /* The candidate ranker's one sentence, where it produced one. Optional
   * because most matches have no ambiguity for it to speak about. */
  modelSentence?: string;
  onAct?: (kind: ResolutionKind, candidateId: string | null) => void;
  /* Whether each action can be taken, and why not when it cannot. Supplied by
   * the screen rather than decided here, because the rules are about the
   * reconciliation's state as much as the match's — and a button that is off
   * for a reason this card invented would be a second opinion nobody asked
   * for. Falls back to the one rule the card can decide alone: you cannot pick
   * a different match without picking one. */
  available?: (
    kind: ResolutionKind,
    candidateId: string | null
  ) => { allowed: true } | { allowed: false; because: string };
  /* Hides the action row entirely. For a spot check, where the job is to LOOK
   * at a decision the machine already made rather than to take one — four
   * disabled buttons would invite a click and then refuse it, which is a worse
   * answer than not offering the row. */
  readOnly?: boolean;
}) {
  const ambiguous = match.candidates.length > 1;
  const [selected, setSelected] = useState<string | null>(
    ambiguous ? null : match.candidates[0]?.id ?? null
  );

  const diff = difference(match);

  return (
    <div
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-7)",
      }}
    >
      {/* ---------- Header ---------- */}
      <div
        className="flex flex-row items-start justify-between"
        style={{ gap: "var(--space-6)", marginBottom: "var(--space-6)" }}
      >
        <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
          <OutcomeChip outcome={match.outcome} />
          {match.pattern &&
            (match.pattern.confirmed ? (
              <span className="t-meta ink-tertiary">
                {match.pattern.label} · confirmed
              </span>
            ) : (
              /* An UNCONFIRMED pattern is the model speaking: it proposed this,
                * and the arithmetic has not committed it yet. So it wears the
                * same Sparkles the ranker sentence below does — "from the model,
                * not yet a finding" is one idea and the app marks it one way.
                * The confirmed case above drops the mark on purpose: once a rule
                * confirms it, a rule owns it, not the model. */
              <span
                className="t-meta ink-tertiary inline-flex items-center"
                style={{ gap: "var(--space-2)" }}
              >
                <Sparkles
                  size="var(--icon-sm)"
                  strokeWidth="var(--stroke-sm)"
                  style={{ color: "var(--ink-tertiary)" }}
                  aria-hidden
                />
                {match.pattern.label} · proposed, not confirmed
              </span>
            ))}
        </div>

        {diff !== 0 && (
          <div className="flex flex-col items-end" style={{ gap: 2 }}>
            <span className="t-label">Difference</span>
            <Money
              amount={diff}
              form="signed"
              emphasis="medium"
              style={{
                fontSize: "var(--type-title)",
                lineHeight: "var(--leading-ui)",
              }}
            />
          </div>
        )}
      </div>

      {/* ---------- The two sides ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "stretch",
        }}
      >
        <Side
          heading="Bank"
          lines={match.bankLines}
          total={bankTotal(match)}
          showTotal
        />
        {/* The ledger side shows every row in play, INCLUDING on an ambiguous
          * match where none of them has been committed yet.
          *
          * Hiding them was the first attempt and it broke the card's own
          * arithmetic: the difference in the header is worked out across both
          * sides, so the refund showed 210.00 above a ledger panel reading
          * "nothing on this side", and a reader had no way to see where 210.00
          * came from. Two rows of 210.00 against one bank debit of 210.00 makes
          * the figure checkable in a glance, and it is the fixture's whole
          * lesson: 210.00 is outstanding whichever row the reviewer picks.
          *
          * The candidate list below is the SELECTOR, not the inventory. */}
        <Side
          heading={ambiguous ? "Ledger · both in play" : "Ledger"}
          lines={match.ledgerRows}
          total={ledgerTotal(match)}
          showTotal
        />
      </div>

      {/* ---------- How it was decided ---------- */}
      <div
        className="flex flex-col"
        style={{ marginTop: "var(--space-6)", gap: "var(--space-3)" }}
      >
        <span className="t-label">How it was decided</span>
        <span className="t-prose ink-secondary">
          {match.rule
            ? `${match.rule.label} · rule ${match.rule.id} v${match.rule.version}`
            : "No rule paired these. " + match.reason}
        </span>
        {match.rule && (
          <span className="t-prose ink-secondary">{match.reason}</span>
        )}
        {match.pattern?.confirmed && match.pattern.confirmedBy && (
          <span className="t-prose ink-secondary">
            {match.pattern.confirmedBy}.
          </span>
        )}
      </div>

      {/* ---------- Candidates ---------- */}
      {ambiguous && (
        <div
          className="flex flex-col"
          style={{ marginTop: "var(--space-6)", gap: "var(--space-4)" }}
        >
          <span className="t-label">
            Candidates · pick the one that belongs to this line
          </span>
          <CandidateList
            candidates={match.candidates}
            ledgerRows={match.ledgerRows}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
      )}

      {/* ---------- The model's sentence ---------- */}
      {modelSentence && (
        <div
          style={{
            marginTop: "var(--space-6)",
            padding: "var(--space-5) var(--space-6)",
            borderRadius: "var(--radius-sheet)",
            /* Its own box, its own surface, its own heading. Set inline with
              * the rule above it and it would read as another finding. */
            background: "var(--surface-control)",
            border: "1px solid var(--line-hair)",
          }}
        >
          <div
            className="flex flex-row items-center"
            style={{ gap: "var(--space-3)", marginBottom: "var(--space-3)" }}
          >
            <Sparkles
              size="var(--icon-sm)"
              strokeWidth="var(--stroke-sm)"
              style={{ color: "var(--ink-tertiary)" }}
              aria-hidden
            />
            <span className="t-label">A suggestion, not a finding</span>
          </div>
          <span className="t-prose ink-secondary">{modelSentence}</span>
        </div>
      )}

      {!readOnly && (
        <>
      {/* ---------- The four actions ---------- */}
      <div
        className="flex flex-row flex-wrap"
        style={{ marginTop: "var(--space-7)", gap: "var(--space-4)" }}
      >
        {ACTIONS.map((a) => {
          /* Switched off rather than hidden. A button that comes and goes
            * teaches a person the screen is unpredictable, and hiding the one
            * action that does not apply hides the fact that it exists. */
          const needsCandidate = a.kind === "correct-the-match";
          const verdict =
            available?.(a.kind, selected) ??
            (needsCandidate && (!ambiguous || selected === null)
              ? { allowed: false as const, because: "Choose a candidate first" }
              : { allowed: true as const });

          return (
            <Button
              key={a.kind}
              variant={
                needsCandidate && ambiguous && selected !== null
                  ? "primary"
                  : "secondary"
              }
              size="md"
              disabled={!verdict.allowed}
              onClick={onAct ? () => onAct(a.kind, selected) : undefined}
            >
              {a.label}
            </Button>
          );
        })}
      </div>

      {/* Every switched-off action says why, in one line under the row. The
        * cross-screen rule is that a disabled control carries its reason right
        * beside it, and four buttons with four possible refusals is exactly
        * where a person otherwise starts clicking to find out. */}
      {(() => {
        const refusals = ACTIONS.map((a) => ({
          label: a.label,
          verdict:
            available?.(a.kind, selected) ??
            (a.kind === "correct-the-match" &&
            (!ambiguous || selected === null)
              ? { allowed: false as const, because: "choose a candidate above" }
              : { allowed: true as const }),
        })).filter((r) => !r.verdict.allowed);

        if (!refusals.length) return null;
        return (
          <div
            className="flex flex-col"
            style={{ marginTop: "var(--space-4)", gap: 2 }}
          >
            {refusals.map((r) => (
              <span key={r.label} className="t-meta ink-tertiary">
                {r.label} is off ·{" "}
                {!r.verdict.allowed ? r.verdict.because : ""}
              </span>
            ))}
          </div>
        );
      })()}
        </>
      )}
    </div>
  );
}
