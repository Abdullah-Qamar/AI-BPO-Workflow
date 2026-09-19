"use client";

/* Quality — can the work be trusted, and is that getting better or worse.
 *
 * Replaces the AI Performance page, which led on tokens used and first-pass
 * accuracy. Both are gone from the headline: an accountant cannot act on a
 * token, and "first-pass accuracy 90%" was a school report about the machine
 * and one of four names this codebase used for two different numbers.
 *
 * ---------------------------------------------------------------------------
 * The one number is the scariest one
 *
 * Errors that got through. Found by a spot check, or reported after sending.
 * Putting the most uncomfortable figure at the top is the point: a system that
 * only looks good when the numbers are good is a system nobody trusts when they
 * are not.
 *
 * ---------------------------------------------------------------------------
 * Three readings, one record
 *
 * Minutes for the accountant, dollars for whoever pays, tokens and seconds for
 * an engineer — and the last of those is in a drawer that starts closed, which
 * is where AI usage belongs rather than on a headline.
 *
 * ---------------------------------------------------------------------------
 * Never hide a bad trend, so the screen that explains one is built
 *
 * The override rate opens into a breakdown by rule. An overall rate is
 * volume-weighted, so two rules firing four thousand times hold it under one
 * percent while a third is wrong nearly half the time. The average is not
 * lying; it is answering a different question from the one a reader has, and
 * the answer to theirs is which rule is responsible.
 *
 * Nothing broke. The world moved. That is what watching this number is for.
 *
 * Spec: docs/UX_SPECS.md section 5, docs/RECONCILER_PLAYBOOK.md Part 6.
 */

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, Gauge } from "lucide-react";
import { Sparkline, EmphasisBar } from "@/components/entities/Sparkline";
import {
  audiences,
  engineering,
  measures,
  overrideBreakdown,
  type Measure,
} from "@/lib/assurance";
import { getFindings, subscribe } from "@/lib/sampling";

/* ---------- Furniture ---------- */

function Card({
  children,
  pad = "var(--space-5)",
}: {
  children: React.ReactNode;
  pad?: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: pad,
        gap: "var(--space-2)",
      }}
    >
      {children}
    </div>
  );
}

/* Said once, wherever a figure is seeded. The screen whose job is to say
 * whether numbers can be trusted cannot invent its own without saying so. */
function Illustrative() {
  return (
    <span
      className="t-meta shrink-0"
      style={{
        color: "var(--ink-tertiary)",
        border: "1px solid var(--line-hair)",
        borderRadius: 999,
        padding: "0 8px",
        height: "var(--control-sm)",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      illustrative
    </span>
  );
}

/* ---------- A measure ---------- */

function MeasureTile({
  measure,
  expandable,
  expanded,
  onToggle,
  children,
}: {
  measure: Measure;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}) {
  const m = measure;
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-6)",
        gap: "var(--space-5)",
      }}
    >
      <div
        className="flex flex-row items-start justify-between"
        style={{ gap: "var(--space-5)" }}
      >
        <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
          {/* The label carries the QUESTION. A bare percentage gets read as
            * whatever the reader was already thinking. */}
          <span className="t-label">{m.label}</span>
          <div
            className="flex flex-row items-baseline"
            style={{ gap: "var(--space-4)" }}
          >
            <span
              className="nums ink-primary"
              style={{
                fontSize: "var(--type-heading)",
                lineHeight: "var(--leading-tight)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              {m.value}
            </span>
            {m.delta && (
              /* Text wears text tokens, never a series colour. The direction is
               * in the words rather than in a green or a red arrow: this screen
               * has to be readable when the news is bad. */
              <span className="t-meta ink-tertiary nums">{m.delta}</span>
            )}
          </div>
        </div>
        <div
          className="flex flex-col items-end shrink-0"
          style={{ gap: "var(--space-3)" }}
        >
          <Sparkline
            points={m.trend}
            illustrative
            ariaLabel={`${m.label}, last twelve periods`}
          />
          {m.provenance === "illustrative" && <Illustrative />}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
        <span className="t-meta ink-tertiary">{m.source}</span>
        {/* Every quality number belongs to one side or the other. A number that
          * improves when people work harder is not measuring the system. */}
        <span className="t-meta ink-tertiary">
          This one belongs to {m.belongsTo}.
        </span>
      </div>

      {expandable && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex flex-row items-center self-start"
          style={{
            gap: "var(--space-3)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            color: "var(--ink-secondary)",
          }}
        >
          {expanded ? (
            <ChevronDown size="var(--icon-sm)" strokeWidth="var(--stroke-sm)" />
          ) : (
            <ChevronRight size="var(--icon-sm)" strokeWidth="var(--stroke-sm)" />
          )}
          <span className="t-body">Break it down by rule</span>
        </button>
      )}

      {expanded && children}
    </div>
  );
}

/* ---------- The screen ---------- */

export function QualityCanvas() {
  /* Subscribed, so a problem recorded in the spot-check queue shows up here
   * without a reload. The two screens are the two ends of the same loop and a
   * stale figure between them would undo the point of building it. */
  useSyncExternalStore(subscribe, getFindings, getFindings);

  const all = measures();
  const headline = all[0];
  const rest = all.slice(1);
  const [openBreakdown, setOpenBreakdown] = useState(false);
  const [engineeringOpen, setEngineeringOpen] = useState(false);

  const breakdown = overrideBreakdown();
  const worstRate = Math.max(...breakdown.map((b) => b.rate), 0.0001);

  return (
    <main
      className="canvas-scope flex-1 min-w-0"
      style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
    >
      <div
        className="canvas-pad"
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
      >
        <div
          className="flex flex-col"
          style={{ gap: "var(--space-8)", paddingBottom: "var(--space-10)" }}
        >
          {/* ---------- The one number ---------- */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-4)" }}
            >
              <Gauge
                size="var(--icon-lg)"
                strokeWidth="var(--stroke-md)"
                style={{ color: "var(--ink-tertiary)" }}
                aria-hidden
              />
              <h1 className="canvas-title ink-primary">Quality</h1>
            </div>

            <div
              className="flex flex-row items-end justify-between flex-wrap"
              style={{ gap: "var(--space-7)" }}
            >
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span className="t-label">{headline.label}</span>
                <div
                  className="flex flex-row items-baseline"
                  style={{ gap: "var(--space-5)" }}
                >
                  {/* The figure the screen leads with. 32px rather than the 48
                    * a general charting guide would ask for: this design system
                    * has five text sizes and --type-metric is the top of the
                    * ramp, and "no new sizes" outranks a default from a system
                    * that is not this one. */}
                  <span
                    className="nums-lead ink-primary"
                    style={{
                      fontSize: "var(--type-metric)",
                      lineHeight: "var(--leading-tight)",
                    }}
                  >
                    {headline.value}
                  </span>
                  {headline.delta && (
                    <span className="t-body ink-secondary nums">
                      {headline.delta}
                    </span>
                  )}
                  {/* Only when it is. This chip was unconditional while the
                    * figure was seeded; the figure is now counted from the
                    * spot-check queue, and leaving the chip on would be the
                    * screen disowning its one real number. */}
                  {headline.provenance === "illustrative" && <Illustrative />}
                </div>
                <span className="t-prose ink-secondary">
                  {headline.source}
                </span>
              </div>
              <Sparkline
                points={headline.trend}
                width={140}
                height={36}
                illustrative
                ariaLabel="Errors that got through, last twelve periods"
              />
            </div>
          </div>

          {/* ---------- Three readings, one record ---------- */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="t-title ink-primary">
                The same record, read three ways
              </span>
              <span className="t-meta ink-tertiary">
                One run record, not three. Each audience reads it in the unit
                they think in.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--space-5)",
              }}
            >
              {audiences.map((a) => (
                <Card key={a.who} pad="var(--space-6)">
                  <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    <div
                      className="flex flex-row items-start justify-between"
                      style={{ gap: "var(--space-4)" }}
                    >
                      <span className="t-label">{a.who}</span>
                      {a.provenance === "illustrative" && <Illustrative />}
                    </div>
                    <div
                      className="flex flex-row items-baseline"
                      style={{ gap: "var(--space-4)" }}
                    >
                      <span
                        className="nums ink-primary"
                        style={{
                          fontSize: "var(--type-heading)",
                          lineHeight: "var(--leading-tight)",
                          fontWeight: "var(--weight-semibold)",
                        }}
                      >
                        {a.value}
                      </span>
                      <span className="t-body ink-secondary">{a.label}</span>
                    </div>
                    <span className="t-prose ink-secondary">{a.why}</span>
                  </div>
                </Card>
              ))}

              {/* The engineer's reading, in a drawer that starts closed. */}
              <Card pad="var(--space-6)">
                <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                  <span className="t-label">Engineers</span>
                  <button
                    type="button"
                    onClick={() => setEngineeringOpen(!engineeringOpen)}
                    aria-expanded={engineeringOpen}
                    className="flex flex-row items-center self-start"
                    style={{
                      gap: "var(--space-3)",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: "var(--ink-primary)",
                    }}
                  >
                    {engineeringOpen ? (
                      <ChevronDown
                        size="var(--icon-sm)"
                        strokeWidth="var(--stroke-sm)"
                      />
                    ) : (
                      <ChevronRight
                        size="var(--icon-sm)"
                        strokeWidth="var(--stroke-sm)"
                      />
                    )}
                    <span className="t-body">AI usage and timing</span>
                  </button>

                  {engineeringOpen ? (
                    <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
                      {engineering.map((e) => (
                        <div
                          key={e.label}
                          className="flex flex-row items-baseline justify-between"
                          style={{ gap: "var(--space-5)" }}
                        >
                          <span className="t-meta ink-tertiary">{e.label}</span>
                          <span className="t-body nums ink-primary">
                            {e.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="t-prose ink-secondary">
                      Useful, and not a headline. An accountant cannot act on a
                      token, and the figure above in dollars is this converted
                      into the unit a buyer compares against a salary.
                    </span>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* ---------- The measures ---------- */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="t-title ink-primary">The measures</span>
              <span className="t-meta ink-tertiary">
                Every one belongs to either the machine or the person, never
                both. A number that improves when people work harder is not
                measuring the system.
              </span>
              {/* The dotted line is the shape saying what the chip says in
                * words. Two of the four VALUES are worked out from the fixture;
                * none of the trends can be, because a trend needs months and
                * there is one month. */}
              <span className="t-meta ink-tertiary">
                Every trend line is dotted because every trend is seeded. A
                trend needs months, and this prototype has one month.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "var(--space-5)",
                alignItems: "start",
              }}
            >
              {rest.map((m) => (
                <MeasureTile
                  key={m.id}
                  measure={m}
                  expandable={m.id === "override-rate"}
                  expanded={m.id === "override-rate" && openBreakdown}
                  onToggle={() => setOpenBreakdown(!openBreakdown)}
                >
                  {/* Emphasis, not a categorical palette. The reader's question
                    * is "which one", and five rules in five colours of equal
                    * weight would bury the answer. */}
                  <div
                    className="flex flex-col"
                    style={{
                      gap: "var(--space-4)",
                      paddingTop: "var(--space-4)",
                      borderTop: "1px solid var(--line-hair)",
                    }}
                  >
                    {breakdown.map((b, i) => (
                      <div
                        key={b.rule.id}
                        className="flex flex-col"
                        style={{ gap: "var(--space-3)" }}
                      >
                        <div
                          className="flex flex-row items-baseline justify-between"
                          style={{ gap: "var(--space-5)" }}
                        >
                          <span className="t-meta ink-secondary truncate">
                            {b.rule.words}
                          </span>
                          <span className="t-meta ink-primary nums shrink-0">
                            {(b.rate * 100).toFixed(0)}%
                          </span>
                        </div>
                        <EmphasisBar
                          share={b.rate / worstRate}
                          emphasised={i === 0}
                        />
                      </div>
                    ))}
                    <span className="t-prose ink-secondary">
                      One rule carries most of the rise. It was approved in April
                      and the properties it covers changed their payment schedule
                      in July, so it has been firing on the wrong things since.
                      Nothing broke. The world moved.
                    </span>
                  </div>
                </MeasureTile>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
