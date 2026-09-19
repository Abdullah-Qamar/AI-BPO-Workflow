"use client";

/* AgentOrb — the mark for a part of the machine, while it is working.
 *
 * One component, one map, so two surfaces cannot show different animations for
 * the same job. `lib/v2/orb.ts` did this for the three retired agents; this is
 * the same idea for the four lanes the live product actually has.
 *
 * ---------------------------------------------------------------------------
 * It marks a JOB, never a status
 *
 * The orb says "a machine is doing this", which is a third kind of fact
 * alongside the two the colour system already separates: `--status-*` answers
 * how something is going and `--outcome-*` answers what kind of thing it is.
 * So an orb never appears on a finished lane and never on a failed one — a
 * check and a reason are better at both — and it never carries a status tint.
 * Where it appears, the machine is working right now.
 *
 * That rule is what keeps it from becoming decoration. An orb beside every
 * mention of AI is a logo; an orb only where something is running is a status
 * light, and a reader learns within one screen which of the two they are
 * looking at.
 *
 * ---------------------------------------------------------------------------
 * Two constraints from the package, both load-bearing
 *
 *   size   Only 64 and 20 exist, and they are separately hand-tuned designs —
 *          dot count, dot size and speed retuned per preset — not a scale
 *          factor. Any other number is a type error.
 *
 *   theme  Defaults to `auto`, which resolves from an ancestor `data-theme` and
 *          then from `prefers-color-scheme`. This app is light-only, so `auto`
 *          paints light ink on our light canvas for anyone whose OS is dark:
 *          invisible orbs, on their machine only, which is the worst class of
 *          bug because it cannot be seen from here. Always pinned `light`.
 */

import { useEffect, useState } from "react";
import { ThinkingOrb, type OrbSize, type OrbState } from "thinking-orbs";

/* The four jobs a person watches, and the five behind them. Checking covers
 * both the pattern proposer and the candidate ranker, for the reason the lane
 * strip does: the split between them is a fact about how the system is built,
 * not about what the person is watching happen.
 *
 * Each state is chosen for what the animation DOES, not for variety:
 *
 *   reading   `searching`  — a scan meridian sweeps a dotted globe. The Reader
 *                            passes over a document and grades what it found.
 *   pairing   `connecting` — a constellation wires itself, packets running the
 *                            edges. Two sides being joined is the whole job.
 *   checking  `solving`    — bands scramble in quarter turns and click back.
 *                            Deciding what could not be paired.
 *   sending   `composing`  — an undulating multi-band sash. Entries being
 *                            written out in order.
 *   sampling  `shaping`    — a dotted outline morphs circle to triangle to
 *                            square. Choosing which shape of work to look at,
 *                            which is exactly what the sampler does. */
export type AgentJob =
  | "reading"
  | "pairing"
  | "checking"
  | "sending"
  | "sampling";

export const JOB_ORB: Record<AgentJob, OrbState> = {
  reading: "searching",
  pairing: "connecting",
  checking: "solving",
  sending: "composing",
  sampling: "shaping",
};

/* Reduced motion.
 *
 * The orb is a canvas animation driven by a frame loop, so the global CSS
 * `prefers-reduced-motion` rule this app uses for its shimmer cannot reach it.
 * Honoured here instead: the orb is replaced by a still dot that says the same
 * thing without moving. Not hidden — "a machine is doing this" is information,
 * and a reader who has asked for less motion has not asked for less
 * information. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function AgentOrb({
  job,
  size = 20,
  label,
}: {
  job: AgentJob;
  /* 20 inline beside text, 64 where the machine is the subject of the panel. */
  size?: OrbSize;
  /* What the machine is doing, for a screen reader. The orb is the only thing
   * on screen saying it in the places it appears alone, so it is not
   * decorative and does not take aria-hidden. */
  label: string;
}) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <span
        role="img"
        aria-label={label}
        style={{
          display: "inline-block",
          width: Math.round(size / 2.5),
          height: Math.round(size / 2.5),
          borderRadius: 999,
          background: "var(--ink-secondary)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      style={{ display: "inline-flex", lineHeight: 0, flexShrink: 0 }}
    >
      <ThinkingOrb state={JOB_ORB[job]} size={size} theme="light" />
    </span>
  );
}
