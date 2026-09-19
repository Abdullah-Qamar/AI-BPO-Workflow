"use client";

/* The balance proof panel.
 *
 * Gap 4 in the playbook: the product could report counts, percentages and a
 * "tied" label that was a seeded string, and had no balances anywhere in its
 * model. This panel is the view that reconciliation exists to produce.
 *
 * ---------------------------------------------------------------------------
 * The shape carries the argument
 *
 * Two journeys, side by side, neither privileged. The bank side removes what
 * the bank has not seen yet; the book side adds what the books have not
 * recorded yet. They are rendered as two sheets of equal width because they are
 * two equal halves of one claim, and because a reader has to be able to see
 * them ARRIVE at the same figure. When they do, both adjusted totals turn the
 * same colour at the same moment — the only piece of colour on this panel that
 * is doing real work.
 *
 * ---------------------------------------------------------------------------
 * Hierarchy: one number leads, and it is not a balance
 *
 * The unexplained figure is the only element at --type-metric; every other
 * figure is body size. That is deliberate and it inverts what the old screen
 * did, where a first-pass match rate was set large and the difference was a
 * caption. Position is the weaker signal here, so the figure sits at the FOOT
 * of the ladder where a proof's conclusion belongs, and earns attention by
 * size and contrast instead.
 *
 * ---------------------------------------------------------------------------
 * Why the band is tinted warn and not danger
 *
 * A non-zero figure at first pass is the normal state of a month that still has
 * work in it, not a failure. Tinting it red would be gap 2 reappearing as
 * colour: once routine things are painted as alarms, nobody reads the alarm.
 * Warn means "this wants a decision", ok means "this is proven", and those are
 * honestly the two states of a reconciliation. The band takes the `ink` of each
 * pair rather than the `mark`, because marks are solved for 6px dots and a
 * 32px figure set in one would not clear contrast at weight 600.
 */

import { ArrowRight } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/Status";
import { money, moneyAccounting, moneySigned } from "@/lib/money";
import type { BalanceProof as Proof, ProofLine, ProofSide } from "@/lib/reconciliation/proof";

/* ---------- One line of a ladder ---------- */

function Line({ line }: { line: ProofLine }) {
  return (
    <div
      className="flex flex-row items-start justify-between"
      style={{ gap: "var(--space-6)" }}
    >
      <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
        <span className="t-body ink-secondary">{line.label}</span>
        {line.detail && (
          <span className="t-meta ink-tertiary">{line.detail}</span>
        )}
      </div>
      {/* Accounting form: a deduction in parentheses. The label already says
       * "Less", and the redundancy is the convention every bank reconciliation
       * uses — the word serves a reader going line by line, the parentheses
       * serve one scanning only the figures column. */}
      <span
        className="t-body nums ink-primary shrink-0"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {moneyAccounting(line.amount)}
      </span>
    </div>
  );
}

/* ---------- One journey ---------- */

function Journey({
  heading,
  side,
  tied,
}: {
  heading: string;
  side: ProofSide;
  tied: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        /* The bright inner sheet, one step up from the card it sits on. Three
         * steps of nesting is the surface system's whole vocabulary, and using
         * it here is what makes the two journeys read as two objects rather
         * than one table with a rule down the middle. */
        background: "var(--surface-list)",
        borderRadius: "var(--radius-sheet)",
        boxShadow: "var(--shadow-depth-1)",
        padding: "var(--space-6)",
        gap: "var(--space-5)",
      }}
    >
      <span className="t-label">{heading}</span>

      {/* Where the journey starts: a figure read straight off the source
       * document, not derived from anything. */}
      <div
        className="flex flex-row items-start justify-between"
        style={{ gap: "var(--space-6)" }}
      >
        <span className="t-body ink-secondary">{side.balanceLabel}</span>
        <span
          className="t-body nums ink-primary shrink-0"
          style={{ fontWeight: "var(--weight-medium)" }}
        >
          {money(side.balance)}
        </span>
      </div>

      <div
        style={{ height: 1, background: "var(--line-hair)" }}
        aria-hidden
      />

      <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
        {side.lines.map((line) => (
          <Line key={line.id} line={line} />
        ))}
      </div>

      {/* A heavier rule under the last adjustment, the way a printed proof
       * draws one before a total. */}
      <div
        style={{ height: 1, background: "var(--line-soft)", marginTop: "auto" }}
        aria-hidden
      />

      <div
        className="flex flex-row items-start justify-between"
        style={{ gap: "var(--space-6)" }}
      >
        <span
          className="t-body ink-primary"
          style={{ fontWeight: "var(--weight-medium)" }}
        >
          {side.adjustedLabel}
        </span>
        <span
          className="t-body nums shrink-0"
          style={{
            fontWeight: "var(--weight-semibold)",
            /* The meeting point. Both sides turn ok at the same instant, which
             * is the one thing on this panel worth colouring: it is the proof
             * succeeding, rendered rather than asserted. */
            color: tied ? "var(--status-ok-ink)" : "var(--ink-primary)",
          }}
        >
          {money(side.adjusted)}
        </span>
      </div>
    </div>
  );
}

/* ---------- The panel ---------- */

export function BalanceProof({
  proof,
  accountLabel,
  accountNumber,
  cycle,
  onReview,
}: {
  proof: Proof;
  accountLabel: string;
  accountNumber: string;
  cycle: string;
  onReview?: () => void;
}) {
  const { tied, unexplained, openItems } = proof;

  const tone = tied
    ? { bg: "var(--status-ok-bg)", ink: "var(--status-ok-ink)" as const }
    : { bg: "var(--status-warn-bg)", ink: "var(--status-warn-ink)" as const };

  return (
    <Surface
      radius="md"
      depth={2}
      style={{ padding: "var(--space-7)", width: "100%" }}
    >
      {/* ---------- Header ---------- */}
      <div
        className="flex flex-row items-start justify-between"
        style={{ gap: "var(--space-6)", marginBottom: "var(--space-6)" }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="t-title ink-primary">Balance proof</span>
          <span className="t-meta ink-tertiary nums">
            {accountLabel} {accountNumber} · {cycle}
          </span>
        </div>

        {/* The provenance claim the playbook asks for. It is a statement about
         * how every figure below was arrived at, not a status, so it takes no
         * chip and no colour — it is set in tertiary ink beside the title and
         * left to be read. Its predecessor was a seeded "tied" string, which is
         * exactly the thing this line promises the panel no longer does. */}
        <span className="t-meta ink-tertiary shrink-0">
          Calculated, not estimated
        </span>
      </div>

      {/* ---------- The two journeys ---------- */}
      <div
        style={{
          display: "grid",
          /* Equal columns, because neither side is privileged. Collapses to one
           * column below 680px, where two ladders of figures would each be too
           * narrow to keep a label and its amount on one line. */
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "stretch",
        }}
      >
        <Journey heading="Bank" side={proof.bank} tied={tied} />
        <Journey heading="Books" side={proof.book} tied={tied} />
      </div>

      {/* ---------- The conclusion ---------- */}
      <div
        style={{
          marginTop: "var(--space-5)",
          background: tone.bg,
          borderRadius: "var(--radius-sheet)",
          padding: "var(--space-6)",
        }}
      >
        <div
          className="flex flex-row items-center justify-between"
          style={{ gap: "var(--space-6)" }}
        >
          <div className="flex flex-col" style={{ gap: 2 }}>
            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-3)" }}
            >
              <StatusDot tone={tied ? "ok" : "warn"} />
              <span
                className="t-body"
                style={{
                  fontWeight: "var(--weight-medium)",
                  color: tone.ink,
                }}
              >
                Still unexplained
              </span>
            </div>
            <span className="t-meta ink-secondary">
              {tied
                ? "Every difference between the two balances is accounted for."
                : `${openItems.length} ${
                    openItems.length === 1 ? "item owes" : "items owe"
                  } a decision before this month can be proven.`}
            </span>
          </div>

          {/* The one figure this card is about. `.nums-lead` is defined for
           * exactly that role and permits one per card. */}
          <span
            className="nums-lead shrink-0"
            style={{
              fontSize: "var(--type-metric)",
              lineHeight: "var(--leading-tight)",
              color: tone.ink,
            }}
          >
            {moneySigned(unexplained)}
          </span>
        </div>

      </div>

      {/* ---------- What is owed ----------
       *
       * Deliberately OUTSIDE the tinted band, on the card surface. Inside it,
       * the tint grew to about two fifths of the panel and a warm block that
       * size in a cool grey app reads as an alarm rather than as a state. The
       * band's job is the conclusion, so it stays one tight strip; this list is
       * the follow-on, and it belongs on the quiet surface.
       *
       * The amounts are UNSIGNED and the heading promises no total, which is a
       * correction rather than a preference. Each figure is the difference that
       * match leaves on its own terms, and those differences do NOT add up to
       * the unexplained figure: the returned payment will be settled by a
       * correcting entry on the BOOK side, while the ambiguous refund resolves
       * by moving 210.00 onto the BANK side, so one pushes the two journeys
       * together and the other pulls. Printing them signed under a signed total
       * invited a reader to add 1,275 and 210, get 1,485, and conclude the
       * panel could not add up.
       */}
      {openItems.length > 0 && (
        <div
          className="flex flex-col"
          style={{ marginTop: "var(--space-6)", gap: "var(--space-5)" }}
        >
          <span className="t-label">
            Owed before this month can be proven
          </span>

          <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
            {openItems.map((item) => (
              <div
                key={item.matchId}
                className="flex flex-row items-baseline justify-between"
                style={{ gap: "var(--space-6)" }}
              >
                <div
                  className="flex flex-row items-baseline min-w-0"
                  style={{ gap: "var(--space-4)" }}
                >
                  {/* No leading mark. A ring glyph here read as an unchecked
                   * radio button and invited a click the row does not offer. */}
                  <span className="t-body ink-primary truncate">
                    {item.label}
                  </span>
                  <span className="t-meta ink-tertiary truncate">
                    {item.question}
                  </span>
                </div>
                <span className="t-body nums ink-secondary shrink-0">
                  {money(item.amount)}
                </span>
              </div>
            ))}
          </div>

          {onReview && (
            <div className="flex flex-row justify-end">
              <Button
                variant="secondary"
                size="md"
                rightIcon={
                  <ArrowRight
                    size="var(--icon-sm)"
                    strokeWidth="var(--stroke-sm)"
                  />
                }
                onClick={onReview}
              >
                Review {openItems.length}{" "}
                {openItems.length === 1 ? "item" : "items"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
