import { useId } from "react";

/* Wire connector between bank statement card and ledger card.
 *
 * Inlines the Figma chrome cable SVG (was /wire.svg) so we can animate it:
 *   - Endpoint caps always breathe on independent rhythms — the wire feels
 *     alive at rest, never frozen.
 *   - When `active` is true, two luminous bands sweep through the cable in
 *     opposite directions (bank ↔ ledger), at unsynchronised periods so the
 *     motion never locks into a beat. No discrete dots — the light lives
 *     inside the wire.
 *
 * Animation is driven by CSS keyframes on stroke-dashoffset (not SMIL),
 * because React 19 does not reliably initialise SMIL <animateTransform>
 * timelines when the element mounts as a child of a state-driven branch.
 * The path length is ~280px so the dasharray "70 700" keeps one bright
 * band visible at any time while the rest of the path is fully transparent.
 *
 * Each instance derives a unique id prefix via useId so multiple wires on
 * the same page don't share gradient/filter IDs or keyframe names. */
export function WireConnector({
  width = "100%",
  height = "100%",
  active = false,
  inactive = false,
}: {
  /* Both dimensions default to 100% so the wire fills its flex container
   * responsively. Pass numeric values only when driving from a fixed slot. */
  width?: number | string;
  height?: number | string;
  active?: boolean;
  /* Inactive mode replaces the wire with a stylized blueprint: dotted trail
   * along the same path + a pair of ringed port sockets at each end.
   * Communicates "cable in place, unpowered" instead of a flat hairline. */
  inactive?: boolean;
}) {
  const raw = useId();
  const uid = `w${raw.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (inactive) {
    /* Blueprint mode.
     *
     * The path itself is drawn with a small dash pattern (2 units on, 6 off)
     * so the wire reads as a dotted line — "route present, current absent."
     * Two sockets sit at the bank/ledger terminals: a hollow outer ring +
     * inner filled dot. They mirror what an actual cable would plug into,
     * making the unplugged state feel intentional rather than incomplete. */
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 305 262"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden
        style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
      >
        <path
          d="M9.17676 101.254C26.8406 101.138 73.3334 103.772 112.216 114.581C160.161 127.909 181.189 137.528 237.125 142.512C248.9 143.786 283.177 144.25 283.177 144.25"
          stroke="rgba(98, 116, 131, 0.4)"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeDasharray="1.5 5"
        />
        {/* Left socket (bank side) */}
        <g>
          <circle
            cx={9.5}
            cy={101.5}
            r={6}
            fill="none"
            stroke="rgba(98, 116, 131, 0.35)"
            strokeWidth={1}
          />
          <circle cx={9.5} cy={101.5} r={2.2} fill="rgba(98, 116, 131, 0.55)" />
        </g>
        {/* Right socket (ledger side) */}
        <g>
          <circle
            cx={283.5}
            cy={144.5}
            r={6}
            fill="none"
            stroke="rgba(98, 116, 131, 0.35)"
            strokeWidth={1}
          />
          <circle
            cx={283.5}
            cy={144.5}
            r={2.2}
            fill="rgba(98, 116, 131, 0.55)"
          />
        </g>
      </svg>
    );
  }

  const ids = {
    path: `${uid}-path`,
    drop: `${uid}-drop`,
    b1: `${uid}-b1`,
    b05: `${uid}-b05`,
    glow: `${uid}-glow`,
    midGlow: `${uid}-midGlow`,
    cap: `${uid}-cap`,
    chrome: `${uid}-chrome`,
    capL: `${uid}-capL`,
    capR: `${uid}-capR`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 305 262"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
      className={uid}
    >
      <defs>
        <path
          id={ids.path}
          d="M9.17676 101.254C26.8406 101.138 73.3334 103.772 112.216 114.581C160.161 127.909 181.189 137.528 237.125 142.512C248.9 143.786 283.177 144.25 283.177 144.25"
        />
        <filter id={ids.drop} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <filter id={ids.b1} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={ids.b05} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
        <filter id={ids.glow} x="-5%" y="-300%" width="110%" height="700%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={ids.midGlow} x="-5%" y="-200%" width="110%" height="500%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={ids.cap} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <linearGradient
          id={ids.chrome}
          x1="9"
          y1="101"
          x2="287"
          y2="137"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A5B0C0" />
        </linearGradient>
        <linearGradient
          id={ids.capL}
          x1="31"
          y1="103"
          x2="15.5"
          y2="103"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient
          id={ids.capR}
          x1="274.5"
          y1="144"
          x2="289.7"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <g className="wc-base">
        <use href={`#${ids.path}`} stroke={`url(#${ids.chrome})`} filter={`url(#${ids.drop})`} />
        <path
          d="M9.17676 102.25C77.9268 102.25 108.6 130.734 199.962 132.734C211.526 133.775 257.265 144.88 284.177 145.25"
          stroke={`url(#${ids.chrome})`}
          filter={`url(#${ids.b1})`}
        />
        <path
          d="M9.17676 104.994C33.4105 103.212 71.1923 95.8894 101.748 108.435C143.263 125.482 191.74 151.736 284.177 143.788"
          stroke={`url(#${ids.chrome})`}
          filter={`url(#${ids.b05})`}
        />
      </g>

      {active && (
        <g className="wc-shimmer">
          <use href={`#${ids.path}`} className="wc-shim-lr-halo" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="70 700" filter={`url(#${ids.glow})`} />
          <use href={`#${ids.path}`} className="wc-shim-lr-mid" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeDasharray="55 700" filter={`url(#${ids.midGlow})`} />
          <use href={`#${ids.path}`} className="wc-shim-lr-core" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="40 700" />
          <use href={`#${ids.path}`} className="wc-shim-rl-halo" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="70 700" filter={`url(#${ids.glow})`} />
          <use href={`#${ids.path}`} className="wc-shim-rl-mid" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeDasharray="55 700" filter={`url(#${ids.midGlow})`} />
          <use href={`#${ids.path}`} className="wc-shim-rl-core" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="40 700" />
        </g>
      )}

      <g className="wc-cap wc-cap-l" filter={`url(#${ids.cap})`}>
        <path
          d="M8.96966 127C4.67905 113.708 5.80336 90.4615 7.59112 81C10.4515 97.0615 29.1786 102.5 37 102.962C19.48 103.885 10.1615 120.077 8.96966 127Z"
          fill={`url(#${ids.capL})`}
        />
      </g>
      <g className="wc-cap wc-cap-r" filter={`url(#${ids.cap})`}>
        <path
          d="M296.56 166.896C300.98 153.634 298.401 131.44 296.56 122C293.613 138.024 276.759 142.951 268.701 143.412C286.752 144.333 295.332 159.989 296.56 166.896Z"
          fill={`url(#${ids.capR})`}
        />
      </g>

      <style>{`
        .${uid} .wc-cap { transform-box: fill-box; transform-origin: center; animation: ${uid}-capBreath 5.4s ease-in-out infinite; }
        .${uid} .wc-cap-r { animation-delay: -2.4s; }
        .${uid} .wc-base { animation: ${uid}-wireBreath 7.2s ease-in-out infinite; }
        .${uid} .wc-shim-lr-halo { stroke-opacity: 0.55; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-lr-mid  { stroke-opacity: 0.75; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-lr-core { stroke-opacity: 0.95; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-rl-halo { stroke-opacity: 0.45; animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        .${uid} .wc-shim-rl-mid  { stroke-opacity: 0.6;  animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        .${uid} .wc-shim-rl-core { stroke-opacity: 0.85; animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        @keyframes ${uid}-capBreath { 0%, 100% { opacity: 0.58; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes ${uid}-wireBreath { 0%, 100% { opacity: 0.86; } 50% { opacity: 1; } }
        @keyframes ${uid}-shimLR { from { stroke-dashoffset: 70; } to { stroke-dashoffset: -700; } }
        @keyframes ${uid}-shimRL { from { stroke-dashoffset: -700; } to { stroke-dashoffset: 70; } }
      `}</style>
    </svg>
  );
}
