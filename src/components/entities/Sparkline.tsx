"use client";

/* Sparkline — twelve points of context beside a figure.
 *
 * ---------------------------------------------------------------------------
 * Why there is no colour in it
 *
 * The charting method says a single-series trend takes a sequential hue or one
 * categorical step. This design system has three ramps already spoken for and
 * each one answers a question this line is not asking: --status-* is how a
 * thing is going, --agent-* is which part of the machine, --outcome-* is what
 * kind of match. A fourth hue invented for a 24-pixel line would be the fourth
 * vocabulary a reader has to learn, to say something the shape already says.
 *
 * So it is emphasis rather than identity: the line in secondary ink, the last
 * point in primary, the fill absent. That is the form the method calls the most
 * underused one, and it is the honest answer here — the series is not the
 * subject, the direction is.
 *
 * It also means no categorical palette exists to validate. The colour-blindness
 * checks exist to keep adjacent HUES apart, and two steps of one ink ramp at
 * different weights have no hue to confuse.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does not have
 *
 * No axis, no grid, no value labels, no tooltip. A sparkline's whole job is
 * shape at a glance; every one of those turns it into a small bad chart. The
 * figure it sits beside carries the number, and the measure's own source line
 * carries where that number came from.
 */

export function Sparkline({
  points,
  width = 96,
  height = 24,
  /* Stated because every trend in this prototype is seeded — there is one month
   * of data. A dotted line is the shape saying so without a caption. */
  illustrative = false,
  ariaLabel,
}: {
  points: number[];
  width?: number;
  height?: number;
  illustrative?: boolean;
  ariaLabel: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  /* A flat series would divide by zero and, worse, would draw at the bottom of
   * the box as though it had collapsed. Flat is drawn flat, through the middle,
   * which is what it means. */
  const span = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - ((p - min) / span) * h;
    return [x, y] as const;
  });

  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ink-tertiary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={illustrative ? "3 3" : undefined}
      />
      {/* The current period, in the accent. The one point a reader is actually
        * looking for, and the only mark on the line. */}
      <circle
        cx={lastX}
        cy={lastY}
        r={2.5}
        fill="var(--ink-primary)"
        stroke="var(--surface-card)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/* ---------- The emphasis bar ----------
 *
 * One row per item, the culprit in primary ink and everything else in the soft
 * line colour. The method calls this emphasis, and it is right here for the
 * same reason the sparkline has no hue: the reader's question is "which one",
 * not "which are these". A categorical palette over five rules would bury the
 * answer in five colours of equal weight.
 */
export function EmphasisBar({
  share,
  emphasised,
  width = 120,
}: {
  /* 0..1 of the widest bar in the set, so the set is comparable. */
  share: number;
  emphasised: boolean;
  width?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height: 6,
        borderRadius: 999,
        background: "var(--surface-control)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${Math.max(2, Math.round(share * 100))}%`,
          height: "100%",
          /* 4px rounded data-end, anchored to the baseline at the left. */
          borderRadius: 999,
          background: emphasised
            ? "var(--ink-primary)"
            : "var(--line-soft)",
        }}
      />
    </div>
  );
}
