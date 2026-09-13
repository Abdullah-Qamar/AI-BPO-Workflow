"use client";

/* Strands — the wire layer.
 *
 * All four strands on a side converge to a single node. That geometry was
 * chosen for the drama of the convergence, and it costs per-bank traceability
 * on the wire; hover isolation is the agreed compensation, so it is not
 * decoration here — it is the only way a user can tell which strand is whose.
 *
 * Four states carry meaning:
 *   ghost      dotted          no file in that slot
 *   idle       thin, drawn in  file landed, nothing happening
 *   working    a bead of light glides along the path toward (or from) the core
 *   settled    white chrome    done or flagged — the verdict lives on the rows,
 *                              not the wire; tinting the strands flooded the
 *                              canvas whenever several banks carried flags
 *
 * Direction is meaningful: the light travels toward the node during intake and
 * reconcile, and away from it while posting to Yardi.
 *
 * Motion design (2026 pass):
 *   - The base wire carries a directional gradient — faint at the row, firmer
 *     at the node — so even at rest the strand leans toward the core.
 *   - The travelling energy is a luminous comet — a bright indigo droplet with
 *     a soft glow and a trailing streak, not a repeating dash: light lives
 *     *inside* the wire, the way WireConnector's chrome cable does. The glow is
 *     built from stacked translucent strokes rather than an SVG blur, so eight
 *     comets stay cheap to paint. Each strand is phase-staggered so eight of
 *     them never pulse in lockstep.
 *   - Settled strands are polished chrome over a dark keyline, matching the V1
 *     wire's house style.
 *   - Nodes read as collector ports: a steady core with a ripple that breathes
 *     outward while any strand is working.
 *   - prefers-reduced-motion drops every strand to a calm static state (the
 *     energy freezes as a soft band mid-wire; nothing sweeps or pulses).
 *
 * Geometry note: the SVG viewBox is 1:1 with its pixel box (HubCanvas sizes it
 * from the client rect), so strokes are already crisp; vectorEffect keeps them
 * hairline should the box ever be scaled. Animated paths use pathLength={1} so
 * one set of dash values reads identically on a short strand and a long one. */

import { useId } from "react";
import type { StrandState } from "@/lib/v2/hub";

export interface StrandSpec {
  key: string;
  bankId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  state: StrandState;
  /* Dimmed by hover isolation — another bank is being inspected. */
  dim: boolean;
  /* This strand's bank is the hovered one. */
  lit: boolean;
}

/* Flat fallbacks. Idle/working paint from a per-strand directional gradient
 * built below; these cover the states that don't (ghost) or want a hard colour. */
const GHOST_STROKE = "rgba(98,116,131,0.32)";

/* The travelling energy — a luminous droplet of "data" drawn along the wire.
 * A cool indigo current (the app's own info/active family), restrained enough
 * to read as "charged" beside up to eight peers without colouring the canvas.
 * The droplet is the bright head; a soft, elongated streak trails it so the
 * motion has an unmistakable direction. */
const ENERGY_GLOW = "rgba(72,104,214,0.44)"; /* tight glow hugging the head    */
const ENERGY_CORE = "rgba(40,58,150,0.95)"; /*  the deep droplet of current   */
const ENERGY_WAKE = "rgba(78,110,210,0.3)"; /*  the trailing motion streak    */

/* One capsule always on the wire, with rests between passes. on + gap = TOTAL,
 * and the flow keyframes advance stroke-dashoffset by exactly TOTAL so the loop
 * is seamless. Values are in pathLength units (path normalised to 1). */
const FLOW_TOTAL = 1.4;
/* Centres the capsule mid-wire when animation is off (reduced motion). */
const FLOW_REST_OFFSET = 0.99;

function pathFor(from: StrandSpec["from"], to: StrandSpec["to"]): string {
  const dx = to.x - from.x;
  /* Asymmetric handles: a gentle sweep off the row, then a longer horizontal
   * reach into the node so the four strands *gather* into it in parallel rather
   * than stabbing in at four different angles. Still an S at any span, never a
   * loop when the row sits close to the core's centre. */
  const c1 = dx * 0.42;
  const c2 = dx * 0.62;
  return `M ${from.x} ${from.y} C ${from.x + c1} ${from.y}, ${to.x - c2} ${to.y}, ${to.x} ${to.y}`;
}

export function Strands({
  width,
  height,
  strands,
  nodes,
  flowOutward,
  anyWorking,
}: {
  width: number;
  height: number;
  strands: StrandSpec[];
  nodes: Array<{ x: number; y: number }>;
  flowOutward: boolean;
  anyWorking: boolean;
}) {
  const uid = useId().replace(/:/g, "");

  if (width <= 0 || height <= 0) return null;

  return (
    <>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <defs>
          {/* Soft pooled glow behind the working collector nodes. Only the two
            * nodes use it — their bbox is a small circle, so the blur is cheap.
            * The travelling comets are deliberately filter-free (stacked
            * translucent strokes instead) to stay fast with eight in flight. */}
          <filter id={`${uid}-glow`} x="-40%" y="-200%" width="180%" height="500%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          {/* Tighter blur for the dark keyline under settled / lit strands. */}
          <filter id={`${uid}-soft`} x="-30%" y="-120%" width="160%" height="340%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>

          {strands.map((s, i) => {
            const settled = s.state === "done" || s.state === "exception";
            const grad = `${uid}-grad-${i}`;
            return settled ? (
              /* Polished chrome, oriented along the run — the V1 cable's look. */
              <linearGradient
                key={grad}
                id={grad}
                gradientUnits="userSpaceOnUse"
                x1={s.from.x}
                y1={s.from.y}
                x2={s.to.x}
                y2={s.to.y}
              >
                <stop offset="0" stopColor="#B4BFCD" />
                <stop offset="0.5" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#C2CCD8" />
              </linearGradient>
            ) : (
              /* Directional slate — leans toward the node. */
              <linearGradient
                key={grad}
                id={grad}
                gradientUnits="userSpaceOnUse"
                x1={s.from.x}
                y1={s.from.y}
                x2={s.to.x}
                y2={s.to.y}
              >
                <stop offset="0" stopColor="rgba(98,116,131,0.4)" />
                <stop offset="0.55" stopColor="rgba(90,107,124,0.6)" />
                <stop offset="1" stopColor="rgba(78,94,112,0.82)" />
              </linearGradient>
            );
          })}
        </defs>

        {strands.map((s, i) => {
          const d = pathFor(s.from, s.to);
          const settled = s.state === "done" || s.state === "exception";
          const ghost = s.state === "ghost";
          const grad = `url(#${uid}-grad-${i})`;
          const opacity = s.dim ? 0.14 : 1;
          /* Desynchronise the eight strands. A stable per-strand phase from the
           * index keeps the canvas from beating as one. */
          const phase = -(i * 0.29) + "s";
          const drawDelay = Math.min(i * 55, 240) + "ms";

          return (
            <g key={s.key} style={{ opacity, transition: "opacity 220ms ease" }}>
              {/* White/chrome ink needs an edge against a near-white canvas, so
                * a settled strand carries a soft dark keyline underneath — the
                * same trick that keeps the white card borders legible. It
                * doubles as the hover highlight, widening when the strand is lit. */}
              {(settled || s.lit) && (
                <path
                  d={d}
                  stroke="#25313F"
                  strokeWidth={s.lit ? 4.6 : 3.2}
                  strokeLinecap="round"
                  opacity={s.lit ? 0.2 : 0.13}
                  filter={`url(#${uid}-soft)`}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Base wire. Ghost skips the draw-in: the animation owns
                * stroke-dasharray, which would stamp out the dotted pattern for
                * its duration and make an unplugged slot look live. */}
              <path
                className={ghost ? undefined : "strand-base"}
                d={d}
                pathLength={1}
                stroke={ghost ? GHOST_STROKE : grad}
                strokeWidth={s.lit ? 2.1 : settled ? 1.5 : 1.15}
                strokeLinecap="round"
                strokeDasharray={ghost ? "0.006 0.018" : undefined}
                vectorEffect="non-scaling-stroke"
                style={{
                  animationDelay: ghost ? undefined : drawDelay,
                  transition: "stroke-width 160ms ease",
                }}
              />

              {/* The travelling comet — a bright indigo droplet with a soft
                * glow and a trailing streak, drawn toward (or from) the core.
                * Not a repeating dash train; one droplet per pass. */}
              {s.state === "working" && (
                <FlowCapsule d={d} out={flowOutward} lit={s.lit} phase={phase} />
              )}
            </g>
          );
        })}

        {/* Nodes only exist where something terminates. In draft there are no
          * rows and therefore no strands, and a bare pair of dots flanking the
          * core reads as debris. */}
        {(strands.length > 0 ? nodes : []).map((n, i) => (
          <g key={i}>
            {anyWorking && (
              <>
                {/* Soft pooled glow — the port is receiving. */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={9}
                  fill="rgba(72,104,180,0.18)"
                  filter={`url(#${uid}-glow)`}
                />
                {/* Ripple breathing outward from the collector. */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={6.5}
                  fill="none"
                  stroke="rgba(80,100,140,0.5)"
                  strokeWidth={1}
                  className="node-ripple"
                  style={{ animationDelay: i === 1 ? "-0.85s" : undefined }}
                />
              </>
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={6.5}
              fill="none"
              stroke="rgba(98,116,131,0.36)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={2.4}
              fill="rgba(90,107,124,0.72)"
              className={anyWorking ? "node-core" : undefined}
            />
          </g>
        ))}
      </svg>

      <style>{`
        .strand-base {
          animation: strand-draw 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes strand-draw {
          from {
            stroke-dasharray: 0 1;
          }
          to {
            stroke-dasharray: 1 0;
          }
        }
        .strand-flow {
          animation: strand-flow-in 1700ms linear infinite;
        }
        .strand-flow.out {
          animation-name: strand-flow-out;
        }
        @keyframes strand-flow-in {
          from {
            stroke-dashoffset: ${FLOW_TOTAL};
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes strand-flow-out {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: ${FLOW_TOTAL};
          }
        }
        .node-ripple {
          animation: node-ripple 1700ms ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes node-ripple {
          0% {
            transform: scale(0.55);
            opacity: 0.5;
          }
          70%,
          100% {
            transform: scale(2.3);
            opacity: 0;
          }
        }
        .node-core {
          animation: node-core 1700ms ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes node-core {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.62;
          }
          50% {
            transform: scale(1.4);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .strand-base,
          .strand-flow,
          .node-ripple,
          .node-core {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

/* The travelling comet. A bright indigo droplet at the head, a tight glow
 * hugging it, and one soft elongated streak trailing behind so the motion has
 * an unmistakable direction — light being drawn along the wire, not a dash
 * train. The streak lags the head by a fixed phase, so head and tail move as
 * one object in both flow directions.
 *
 * Under reduced motion the shared strokeDashoffset default (FLOW_REST_OFFSET)
 * parks the comet mid-wire; the media query above kills the animation. */
function FlowCapsule({
  d,
  out,
  lit,
  phase,
}: {
  d: string;
  out: boolean;
  lit: boolean;
  phase: string;
}) {
  const cls = `strand-flow${out ? " out" : ""}`;
  const coreW = lit ? 2.4 : 2;
  const shared = {
    className: cls,
    d,
    pathLength: 1 as const,
    strokeLinecap: "round" as const,
    strokeDashoffset: FLOW_REST_OFFSET,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <>
      {/* long faint tail — the far reach of the wake, fading out behind */}
      <path
        {...shared}
        stroke={ENERGY_WAKE}
        strokeOpacity={0.45}
        strokeWidth={lit ? 2 : 1.7}
        strokeDasharray="0.34 1.06"
        style={{ animationDelay: `calc(${phase} + 0.2s)` }}
      />
      {/* trailing streak — elongated and soft, lagging the head. No blur of its
        * own: round caps and the head glow do the softening, and one blurred
        * filter per comet (the head glow) keeps eight of them cheap to paint. */}
      <path
        {...shared}
        stroke={ENERGY_WAKE}
        strokeWidth={lit ? 3.2 : 2.8}
        strokeDasharray="0.24 1.16"
        style={{ animationDelay: `calc(${phase} + 0.13s)` }}
      />
      {/* head glow — stacked translucent round-capped bands fake a soft bloom
        * without any SVG blur: a wide faint outer aura over a brighter inner
        * halo gives an opacity falloff toward the edges, and skipping the filter
        * keeps eight comets cheap to paint (the hard perf constraint here). */}
      <path
        {...shared}
        stroke={ENERGY_GLOW}
        strokeOpacity={0.38}
        strokeWidth={lit ? 8 : 6.8}
        strokeDasharray="0.08 1.32"
        style={{ animationDelay: phase }}
      />
      <path
        {...shared}
        stroke={ENERGY_GLOW}
        strokeOpacity={0.72}
        strokeWidth={lit ? 4.2 : 3.6}
        strokeDasharray="0.09 1.31"
        style={{ animationDelay: phase }}
      />
      {/* droplet — the bright crisp head */}
      <path
        {...shared}
        stroke={ENERGY_CORE}
        strokeWidth={coreW}
        strokeDasharray="0.07 1.33"
        style={{ animationDelay: phase }}
      />
    </>
  );
}
