"use client";

/* PatternRow — one pattern and the rung it has earned.
 *
 * NEVER renders a permanently excluded pattern as though it were stuck at rung
 * one. Excluded is a different KIND of thing, not a low score, and the type says
 * so: `rung` is 1 | 2 | 3 | 4 | "excluded", so an excluded pattern cannot be
 * compared to a numbered one or sorted below it by accident.
 *
 * Naming the permanent exclusions is what makes the rest of the ladder
 * credible. A system that claims everything can eventually be automated is
 * making a promise about ambiguous matches that it cannot keep — by definition
 * the candidate ranker's queue exists because the system does not know. The
 * other two are a legal boundary and an accountability one: security-deposit
 * accounts hold legally segregated funds, and somebody has to be able to answer
 * "who signed this".
 *
 * ---------------------------------------------------------------------------
 * The inversion is the design, so it is drawn rather than captioned
 *
 * Sampling RISES as autonomy rises. That is the opposite of what every
 * automation dashboard implies, and the reason is the trap the whole ladder
 * exists to avoid: the pattern you automate is the pattern that stops being
 * watched. At rung 1 a person decides every case, so there is no unwatched work
 * to sample. By rung 4 nobody is looking at any of it, and two wrong matches of
 * equal amounts still net to zero — so the proof reaches zero while the month is
 * wrong, and a sample is the only thing that can find it.
 *
 * The bar therefore grows to the right as the rung climbs. Stating it in a
 * caption would let a reader skim past the one claim in this product that
 * sounds wrong until you think about it.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §7, docs/AI_ARCHITECTURE.md Part 6.
 */

import { Tooltip } from "@/components/ui/Tooltip";

export type Rung = 1 | 2 | 3 | 4 | "excluded";

const RUNG_WORDS: Record<1 | 2 | 3 | 4, { name: string; who: string }> = {
  1: { name: "Observed", who: "A person decides every time" },
  2: { name: "Proposed", who: "The system suggests, a person confirms" },
  3: { name: "Provisional", who: "The system decides, a person reviews after" },
  4: { name: "Autonomous", who: "The system decides" },
};

/* How much of the unflagged work is checked, by rung. Zero at rung 1 is not an
 * omission: a person is already seeing every case, so there is nothing
 * unwatched to sample. */
const SAMPLING: Record<1 | 2 | 3 | 4, { share: number; words: string }> = {
  1: { share: 0, words: "nothing to sample yet" },
  2: { share: 0.25, words: "agreement measured on every item" },
  3: { share: 0.6, words: "sampled heavily" },
  4: { share: 1, words: "sampled at a fixed rate, forever" },
};

function SamplingBar({ share }: { share: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: 84,
        height: 4,
        borderRadius: 999,
        background: "var(--surface-control)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${Math.round(share * 100)}%`,
          height: "100%",
          borderRadius: 999,
          /* Not a status colour. How much is being checked is not a verdict on
           * how the pattern is doing, and a bar that goes green at full length
           * would read as "good" when what it actually means is "this one is
           * watched hardest because nobody sees it any more". */
          background: "var(--ink-tertiary)",
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

export function PatternRow({
  name,
  rung,
  timesSeen,
  agreementRate,
  excludedBecause,
  onOpen,
}: {
  name: string;
  rung: Rung;
  timesSeen: number;
  /* 0..1, how often a person agreed. Null before there is enough to divide. */
  agreementRate: number | null;
  /* Required when rung is "excluded", and meaningless otherwise. The reason is
   * the whole value of naming an exclusion. */
  excludedBecause?: string;
  onOpen?: () => void;
}) {
  const excluded = rung === "excluded";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="list-row flex flex-row items-center w-full text-left"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-6)",
        borderRadius: "var(--radius-row)",
        background: "transparent",
        border: "1px solid transparent",
        cursor: onOpen ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">{name}</span>
        <span className="t-meta ink-tertiary truncate">
          {excluded ? (
            /* No rung, no agreement rate, no ladder position. An excluded
              * pattern is not competing. */
            <>Never climbs · {excludedBecause}</>
          ) : (
            <>
              {RUNG_WORDS[rung].who}
              {" · seen "}
              <span className="nums">{timesSeen}</span>
              {agreementRate !== null && (
                <>
                  {" · agreed "}
                  <span className="nums">
                    {Math.round(agreementRate * 100)}%
                  </span>
                </>
              )}
            </>
          )}
        </span>
      </div>

      {excluded ? (
        <span
          className="t-meta shrink-0"
          style={{
            color: "var(--ink-tertiary)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          Excluded
        </span>
      ) : (
        <div
          className="flex flex-row items-center shrink-0"
          style={{ gap: "var(--space-5)" }}
        >
          <span
            className="t-meta shrink-0"
            style={{
              color: "var(--ink-secondary)",
              fontWeight: "var(--weight-medium)",
              width: 76,
              textAlign: "right",
            }}
          >
            {rung} · {RUNG_WORDS[rung].name}
          </span>
          <Tooltip
            label={`Sampling · ${SAMPLING[rung].words}`}
            side="left"
            tone="neutral"
          >
            <span style={{ display: "inline-flex" }}>
              <SamplingBar share={SAMPLING[rung].share} />
            </span>
          </Tooltip>
        </div>
      )}
    </button>
  );
}
