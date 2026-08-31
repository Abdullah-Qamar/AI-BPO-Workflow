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
 *   idle       thin solid      file landed, nothing happening
 *   working    travelling      a luminous band runs along the path
 *   settled    white chrome    done or flagged — the verdict lives on the rows,
 *                              not the wire; tinting the strands flooded the
 *                              canvas whenever several banks carried flags
 *
 * Direction is meaningful: the band travels toward the node during intake and
 * reconcile, and away from it while posting to Yardi. */

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

/* Settled strands — done AND exception — are bright white chrome, like the
 * original wire.svg cable. Colouring them killed the composition twice over:
 * with every bank flagged the amber flooded the whole canvas, and the tint
 * carried no information the row glyphs and counts weren't already carrying.
 * The strand says "connected and settled"; the verdict lives on the rows. */
const STROKE: Record<StrandState, string> = {
  ghost: "rgba(98,116,131,0.30)",
  idle: "rgba(98,116,131,0.46)",
  working: "rgba(98,116,131,0.46)",
  done: "rgba(255,255,255,0.96)",
  exception: "rgba(255,255,255,0.96)",
};

function pathFor(from: StrandSpec["from"], to: StrandSpec["to"]): string {
  const dx = to.x - from.x;
  /* 0.55 keeps the curve reading as an S at every span without ever
   * overshooting into a loop when the row sits close to the core's centre. */
  const c = dx * 0.55;
  return `M ${from.x} ${from.y} C ${from.x + c} ${from.y}, ${to.x - c} ${to.y}, ${to.x} ${to.y}`;
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
        <filter id={`${uid}-glow`} x="-40%" y="-200%" width="180%" height="500%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {strands.map((s) => {
        const d = pathFor(s.from, s.to);
        const stroke = STROKE[s.state];
        const opacity = s.dim ? 0.16 : 1;
        const settled = s.state === "done" || s.state === "exception";
        return (
          <g
            key={s.key}
            style={{ opacity, transition: "opacity 200ms ease" }}
          >
            {/* White ink needs an edge to exist against a near-white canvas, so
             * a settled strand carries a soft dark keyline underneath — the
             * same trick that keeps the white card borders legible. It doubles
             * as the hover highlight, widening when the strand is lit. */}
            {(settled || s.lit) && (
              <path
                d={d}
                stroke="#25313F"
                strokeWidth={s.lit ? 4.5 : 3.2}
                strokeLinecap="round"
                opacity={s.lit ? 0.22 : 0.14}
                filter={`url(#${uid}-glow)`}
              />
            )}

            {/* Ghost strands skip the draw-in: the animation has to own
              * stroke-dasharray, which would stamp out the dotted pattern for
              * the duration and make an unplugged slot look like a live one. */}
            <path
              className={s.state === "ghost" ? undefined : "strand-base"}
              d={d}
              pathLength={1}
              stroke={stroke}
              strokeWidth={s.lit ? 2.2 : settled ? 1.6 : 1}
              strokeLinecap="round"
              strokeDasharray={s.state === "ghost" ? "0.006 0.018" : undefined}
              style={{ transition: "stroke-width 160ms ease, stroke 200ms ease" }}
            />

            {/* The travelling band is two stacked paths, not one filtered
              * stroke: a wide soft halo under a thin bright core. A single
              * blurred dark stroke reads as a smudge crawling along the wire
              * rather than light moving inside it. */}
            {s.state === "working" && (
              <>
                <path
                  className={`strand-flow${flowOutward ? " out" : ""}`}
                  d={d}
                  pathLength={1}
                  stroke="rgba(48,59,69,0.16)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray="0.22 0.78"
                />
                <path
                  className={`strand-flow${flowOutward ? " out" : ""}`}
                  d={d}
                  pathLength={1}
                  stroke="rgba(48,59,69,0.72)"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeDasharray="0.09 0.91"
                />
              </>
            )}
          </g>
        );
      })}

      {/* Nodes only exist where something terminates. In draft there are no
        * rows and therefore no strands, and a bare pair of dots flanking the
        * core reads as debris. */}
      {(strands.length > 0 ? nodes : []).map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={6.5}
            fill="none"
            stroke="rgba(98,116,131,0.34)"
            strokeWidth={1}
          />
          <circle
            cx={n.x}
            cy={n.y}
            r={2.4}
            fill="rgba(98,116,131,0.62)"
            className={anyWorking ? "node-pulse" : undefined}
          />
        </g>
      ))}
    </svg>

      <style jsx>{`
        .strand-base {
          animation: strand-draw 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes strand-draw {
          from {
            stroke-dasharray: 1 1;
            stroke-dashoffset: 1;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .strand-flow {
          animation: strand-flow 1600ms linear infinite;
        }
        .strand-flow.out {
          animation-direction: reverse;
        }
        @keyframes strand-flow {
          from {
            stroke-dashoffset: 1;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .node-pulse {
          animation: node-pulse 1600ms ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes node-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.62;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .strand-base,
          .strand-flow,
          .node-pulse {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
