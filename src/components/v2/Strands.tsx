"use client";

/* Strands — the wire layer.
 *
 * All four strands on a side converge to a single node. That geometry was
 * chosen for the drama of the convergence, and it costs per-bank traceability
 * on the wire; hover isolation is the agreed compensation, so it is not
 * decoration here — it is the only way a user can tell which strand is whose.
 *
 * Five states, each visually distinct at a glance — differentiated by hue AND
 * behaviour, never hue alone:
 *   ghost      faint dotted grey    no file in that slot yet (waiting)
 *   idle       thin slate cable     connected, nothing happening ("not working")
 *   working    slate + indigo comet a luminous droplet glides toward the core
 *   done       chrome cable, steady complete & clean (finished)
 *   exception  fine amber + pulse   complete but needs a human (attention)
 *
 * Per-state treatment is deliberate. Earlier the wire stayed neutral and the
 * verdict lived only on the rows — but the wire is now asked to express state on
 * its own. done is a polished, NON-green chrome cable (the app minimises green),
 * confident and steady, reading as "finished". exception is a FINE amber line
 * (from --status-warn) with a slow amber pulse — attention carried by hue and
 * motion, deliberately kept thin so it never shouts. The two never read alike
 * (chrome+steady vs amber+pulsing) and don't lean on colour alone.
 *
 * Direction is meaningful: the working light travels toward the node during
 * intake and reconcile, and away from it while posting to Yardi.
 *
 * Motion design:
 *   - The base wire carries a directional gradient — faint at the row, firmer
 *     at the node — so even at rest the strand leans toward the core. Its hue
 *     is per-state: slate for idle/working, chrome for done, amber for exception.
 *   - The travelling energy is a luminous comet — a bright indigo droplet with
 *     a soft glow and a trailing streak, not a repeating dash: light lives
 *     *inside* the wire, the way WireConnector's chrome cable does. The glow is
 *     built from stacked translucent strokes rather than an SVG blur, so eight
 *     comets stay cheap to paint. Each strand is phase-staggered so eight of
 *     them never pulse in lockstep.
 *   - Settled cables sit on a soft keyline for depth: dark slate under the chrome
 *     done cable, a thin amber ink under exception.
 *   - exception adds one slow breathing amber halo — the only settled state
 *     that moves — so "needs attention" is unmistakable beside steady done.
 *   - Nodes read as collector ports: a steady core with a ripple that breathes
 *     outward while any strand is working.
 *   - prefers-reduced-motion drops every strand to a calm static state (the
 *     comet freezes mid-wire, the amber halo holds at a mid opacity; nothing
 *     sweeps or pulses).
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

/* done — deliberately NON-green (the app minimises green). A polished chrome
 * cable — light steel → white → light steel — over a dark keyline reads as
 * "finished / settled" the way the V1 wire does, calm and neutral. */
const DONE_INK = "#25313f"; /*  dark keyline under the bright chrome          */

/* exception — the attention state. Amber from the app's --status-warn family,
 * but kept as a FINE line: the meaning is carried by hue + a slow pulse, not by
 * weight, so it never shouts. The mid stop is the token; the ends are a lighter
 * row-side tint and a deeper node-side tone. */
const WARN = "#d08616"; /*      --status-warn              */
const WARN_LIGHT = "#e7b25c"; /* row-side tint               */
const WARN_DEEP = "#c17b10"; /*  node-side tone             */
const WARN_INK = "#8a5300"; /*   --status-warn-ink (shadow)  */
const WARN_HALO = "#d9962e"; /*  the slow attention pulse    */

/* Directional slate for idle / working — quiet at the row, firmer at the node. */
const SLATE_STOPS: Array<[string, string]> = [
  ["0", "rgba(98,116,131,0.4)"],
  ["0.55", "rgba(90,107,124,0.6)"],
  ["1", "rgba(78,94,112,0.82)"],
];

function gradStops(state: StrandState): Array<[string, string]> {
  if (state === "done")
    /* Polished chrome — the V1 cable's look, neutral and finished. */
    return [
      ["0", "#b4bfcd"],
      ["0.5", "#ffffff"],
      ["1", "#c2ccd8"],
    ];
  if (state === "exception")
    return [
      ["0", WARN_LIGHT],
      ["0.55", WARN],
      ["1", WARN_DEEP],
    ];
  return SLATE_STOPS;
}

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

          {/* One directional gradient per strand, hued by state: slate for
            * idle/working, neutral chrome for done, warn-amber for exception.
            * (Ghost paints a flat dotted stroke and ignores its gradient.) */}
          {strands.map((s, i) => (
            <linearGradient
              key={`${uid}-grad-${i}`}
              id={`${uid}-grad-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={s.from.x}
              y1={s.from.y}
              x2={s.to.x}
              y2={s.to.y}
            >
              {gradStops(s.state).map(([o, c]) => (
                <stop key={o} offset={o} stopColor={c} />
              ))}
            </linearGradient>
          ))}
        </defs>

        {strands.map((s, i) => {
          const d = pathFor(s.from, s.to);
          const done = s.state === "done";
          const exception = s.state === "exception";
          const settled = done || exception;
          const ghost = s.state === "ghost";
          const grad = `url(#${uid}-grad-${i})`;
          const opacity = s.dim ? 0.14 : 1;
          /* Desynchronise the eight strands. A stable per-strand phase from the
           * index keeps the canvas from beating as one. */
          const phase = -(i * 0.29) + "s";
          const drawDelay = Math.min(i * 55, 240) + "ms";
          /* Settled/hover cables sit on a soft dark keyline for depth against the
           * near-white canvas — the chrome done cable needs it to read as a
           * lifted cable; exception uses its own amber ink, kept thin. */
          const keyline = exception ? WARN_INK : DONE_INK;

          return (
            <g key={s.key} style={{ opacity, transition: "opacity 220ms ease" }}>
              {/* Dark (or amber, for exception) shadow beneath a settled/hovered
                * cable — gives the wire weight and doubles as the hover highlight.
                * Exception's is kept thinner so that state stays light. */}
              {(settled || s.lit) && (
                <path
                  d={d}
                  stroke={keyline}
                  strokeWidth={s.lit ? 4.6 : exception ? 2.6 : 3.4}
                  strokeLinecap="round"
                  opacity={s.lit ? 0.22 : exception ? 0.13 : 0.16}
                  filter={`url(#${uid}-soft)`}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* exception: one slow breathing amber halo — the only settled
                * state that moves, so "needs a human" is legible at a glance and
                * never mistaken for the steady chrome of done. Kept slim so the
                * state reads as attention, not weight. */}
              {exception && (
                <path
                  className="strand-attn"
                  d={d}
                  pathLength={1}
                  stroke={WARN_HALO}
                  strokeWidth={s.lit ? 4.6 : 3.6}
                  strokeLinecap="round"
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
                strokeWidth={s.lit ? 2.4 : done ? 1.7 : exception ? 1.35 : 1.15}
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
        .strand-attn {
          opacity: 0.24;
          animation: strand-attn 2600ms ease-in-out infinite;
        }
        @keyframes strand-attn {
          0%,
          100% {
            opacity: 0.12;
          }
          50% {
            opacity: 0.36;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .strand-base,
          .strand-flow,
          .node-ripple,
          .node-core,
          .strand-attn {
            animation: none;
          }
          .strand-attn {
            opacity: 0.24;
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
