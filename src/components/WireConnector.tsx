import { useId } from "react";

/* Socket — the ringed port glyph rendered at each end of the inactive wire.
 * Kept in its own fixed-size SVG (16×16) so it doesn't inherit the horizontal
 * stretch that the dotted path relies on. Anchored to the wire path's actual
 * endpoint x-percentage (9/305 ≈ 2.95% left, 283/305 ≈ 92.79% right) so the
 * socket's center coincides with where the wire terminates at any slot
 * width — otherwise the socket sits at the container edge while the wire
 * endpoint drifts inward at wider slots. Socket center-x is 8px inside its
 * 16×16 SVG, so we shift left by that half-width. */
function Socket({ side }: { side: "left" | "right" }) {
  const topPct = side === "left" ? "38.74%" : "55.15%";
  const horiz =
    side === "left"
      ? { left: "calc(2.95% - 8px)" }
      : { right: "calc(7.21% - 8px)" };
  const style: React.CSSProperties = {
    position: "absolute",
    top: topPct,
    ...horiz,
    transform: "translate(0, -50%)",
    width: 16,
    height: 16,
    pointerEvents: "none",
  };
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-hidden
    >
      <circle
        cx={8}
        cy={8}
        r={6}
        fill="none"
        stroke="rgba(98, 116, 131, 0.35)"
        strokeWidth={1}
      />
      <circle cx={8} cy={8} r={2.2} fill="rgba(98, 116, 131, 0.55)" />
    </svg>
  );
}


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
     * The dotted path stretches horizontally with the flex slot (viewBox has
     * preserveAspectRatio="none"), but the socket circles are rendered in
     * SEPARATE fixed-size SVGs positioned absolutely at each end — otherwise
     * the same non-uniform scale that stretches the path would turn the
     * circles into ellipses. The endpoints' vertical positions match where
     * the path enters/exits the viewBox (101.5 / 262 ≈ 38.7% for the bank
     * side; 144.5 / 262 ≈ 55.2% for the ledger side). */
    return (
      <div
        style={{
          position: "relative",
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          pointerEvents: "none",
          userSelect: "none",
        }}
        aria-hidden
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 305 262"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path
            d="M9.17676 101.254C26.8406 101.138 73.3334 103.772 112.216 114.581C160.161 127.909 181.189 137.528 237.125 142.512C248.9 143.786 283.177 144.25 283.177 144.25"
            stroke="rgba(98, 116, 131, 0.4)"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeDasharray="1.5 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <Socket side="left" />
        <Socket side="right" />
      </div>
    );
  }

  const ids = {
    path: `${uid}-path`,
    drop: `${uid}-drop`,
    b1: `${uid}-b1`,
    b05: `${uid}-b05`,
    glow: `${uid}-glow`,
    midGlow: `${uid}-midGlow`,
    chrome: `${uid}-chrome`,
    capL: `${uid}-capL`,
    capR: `${uid}-capR`,
  };

  /* Mirrors the Figma Wire.svg export 1:1 — three chrome paths (main + two
   * blurred variants), two teardrop endpoint caps, and a drop shadow wrapping
   * the whole thing, all inside a single 305×262 viewBox. preserveAspectRatio
   * is "none" so the entire assembly stretches together as the slot widens;
   * the caps sit at the same start/end x-coordinates as the wire paths, so
   * they scale in lockstep and never disconnect from the wire endpoints.
   * Anything pulled OUT of the SVG (previously the caps) drifts away from
   * the stretched path endpoints — hence the regression the user reported. */
  return (
    <div
      style={{
        position: "relative",
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        pointerEvents: "none",
        userSelect: "none",
      }}
      aria-hidden
      className={uid}
    >
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 305 262"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ display: "block", position: "absolute", inset: 0 }}
    >
      <defs>
        {/* Shared main path — reused by the shimmer sweeps in the active state. */}
        <path
          id={ids.path}
          d="M9.17676 101.254C26.8406 101.138 73.3334 103.772 112.216 114.581C160.161 127.909 181.189 137.528 237.125 142.512C248.9 143.786 283.177 144.25 283.177 144.25"
        />
        {/* filter0_d — drop shadow wrapping the whole wire, matches Figma. */}
        <filter
          id={ids.drop}
          x="-1.33301"
          y="-6"
          width="307.333"
          height="274"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="1.6" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow"
            result="shape"
          />
        </filter>
        {/* filter1_f — blur 1 for the middle chrome path. */}
        <filter
          id={ids.b1}
          x="7.17676"
          y="99.75"
          width="279.007"
          height="48"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="0.6" result="effect1_foregroundBlur" />
        </filter>
        {/* filter2_f — blur 0.5 for the outermost chrome sheen path. */}
        <filter
          id={ids.b05}
          x="8.13965"
          y="99.75"
          width="277.08"
          height="47"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="0.3" result="effect1_foregroundBlur" />
        </filter>
        {/* filter3_f — blur 1.5 for the right teardrop cap. */}
        <filter
          id={ids.capR}
          x="265.701"
          y="119"
          width="36.2988"
          height="50.8945"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="1.5" result="effect1_foregroundBlur" />
        </filter>
        {/* filter4_f — blur 1.5 for the left teardrop cap. */}
        <filter
          id={ids.capL}
          x="3"
          y="78"
          width="37"
          height="52"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="1.5" result="effect1_foregroundBlur" />
        </filter>
        {/* Shimmer glow filters used only when active. */}
        <filter id={ids.glow} x="-5%" y="-300%" width="110%" height="700%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id={ids.midGlow} x="-5%" y="-200%" width="110%" height="500%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        {/* paint0_linear — chrome gradient for the sharp path. */}
        <linearGradient
          id={`${ids.chrome}-0`}
          x1="9.01532"
          y1="101.234"
          x2="287.119"
          y2="137.221"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A5B0C0" />
        </linearGradient>
        {/* paint1_linear — chrome gradient for the b1 middle path. */}
        <linearGradient
          id={`${ids.chrome}-1`}
          x1="9.01473"
          y1="102.234"
          x2="288.1"
          y2="138.48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A5B0C0" />
        </linearGradient>
        {/* paint2_linear — chrome gradient for the b05 sheen path. */}
        <linearGradient
          id={`${ids.chrome}-2`}
          x1="9.01473"
          y1="101.234"
          x2="288.308"
          y2="136.683"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A5B0C0" />
        </linearGradient>
        {/* Chrome gradient still exposed under the base id for the shimmer. */}
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
        {/* paint3_linear — right teardrop cap gradient. */}
        <linearGradient
          id={`${ids.capR}-grad`}
          x1="274.488"
          y1="144.01"
          x2="289.666"
          y2="144.01"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        {/* paint4_linear — left teardrop cap gradient. */}
        <linearGradient
          id={`${ids.capL}-grad`}
          x1="31.0796"
          y1="103.551"
          x2="15.5498"
          y2="103.551"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="295.333" height="262" transform="translate(4.66699)" />
        </clipPath>
      </defs>

      {/* Mirrors the Figma export tree: everything sits under filter0_d
       * (drop shadow) and clip0, then the three chrome paths and the two
       * teardrop caps render in the same paint order the file specifies. */}
      <g filter={`url(#${ids.drop})`}>
        <g clipPath={`url(#${uid}-clip)`}>
          <g className="wc-base">
            <path
              d="M9.17676 101.254C26.8406 101.138 73.3334 103.772 112.216 114.581C160.161 127.909 181.189 137.528 237.125 142.512C248.9 143.786 283.177 144.25 283.177 144.25"
              stroke={`url(#${ids.chrome}-0)`}
            />
            <g filter={`url(#${ids.b1})`}>
              <path
                d="M9.17676 102.25C77.9268 102.25 108.6 130.734 199.962 132.734C211.526 133.775 257.265 144.88 284.177 145.25"
                stroke={`url(#${ids.chrome}-1)`}
              />
            </g>
            <g filter={`url(#${ids.b05})`}>
              <path
                d="M9.17676 104.994C33.4105 103.212 71.1923 95.8894 101.748 108.435C143.263 125.482 191.74 151.736 284.177 143.788"
                stroke={`url(#${ids.chrome}-2)`}
              />
            </g>
          </g>
          {/* Right teardrop — filter3_f + paint3. */}
          <g className="wc-cap wc-cap-r" filter={`url(#${ids.capR})`}>
            <path
              d="M296.56 166.896C300.98 153.634 298.401 131.44 296.56 122C293.613 138.024 276.759 142.951 268.701 143.412C286.752 144.333 295.332 159.989 296.56 166.896Z"
              fill={`url(#${ids.capR}-grad)`}
            />
          </g>
          {/* Left teardrop — filter4_f + paint4. */}
          <g className="wc-cap wc-cap-l" filter={`url(#${ids.capL})`}>
            <path
              d="M8.96966 127C4.67905 113.708 5.80336 90.4615 7.59112 81C10.4515 97.0615 29.1786 102.5 37 102.962C19.48 103.885 10.1615 120.077 8.96966 127Z"
              fill={`url(#${ids.capL}-grad)`}
            />
          </g>

          {active && (
            <g className="wc-shimmer">
              <use href={`#${ids.path}`} className="wc-shim-lr-halo" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeDasharray="34 700" filter={`url(#${ids.glow})`} />
              <use href={`#${ids.path}`} className="wc-shim-lr-mid" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="26 700" filter={`url(#${ids.midGlow})`} />
              <use href={`#${ids.path}`} className="wc-shim-lr-core" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeDasharray="20 700" />
              <use href={`#${ids.path}`} className="wc-shim-rl-halo" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeDasharray="34 700" filter={`url(#${ids.glow})`} />
              <use href={`#${ids.path}`} className="wc-shim-rl-mid" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="26 700" filter={`url(#${ids.midGlow})`} />
              <use href={`#${ids.path}`} className="wc-shim-rl-core" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeDasharray="20 700" />
            </g>
          )}
        </g>
      </g>

      <style>{`
        .${uid} .wc-cap { transform-box: fill-box; transform-origin: center; animation: ${uid}-capBreath 5.4s ease-in-out infinite; }
        .${uid} .wc-cap-r { animation-delay: -2.4s; }
        .${uid} .wc-base { animation: ${uid}-wireBreath 7.2s ease-in-out infinite; }
        .${uid} .wc-shim-lr-halo { stroke-opacity: 0.32; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-lr-mid  { stroke-opacity: 0.6; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-lr-core { stroke-opacity: 0.95; animation: ${uid}-shimLR 4.4s linear infinite; }
        .${uid} .wc-shim-rl-halo { stroke-opacity: 0.26; animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        .${uid} .wc-shim-rl-mid  { stroke-opacity: 0.48;  animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        .${uid} .wc-shim-rl-core { stroke-opacity: 0.85; animation: ${uid}-shimRL 5.1s linear infinite -1.8s; }
        @keyframes ${uid}-capBreath { 0%, 100% { opacity: 0.5; transform: scale(0.96); } 50% { opacity: 0.92; transform: scale(1.03); } }
        @keyframes ${uid}-wireBreath { 0%, 100% { opacity: 0.86; } 50% { opacity: 1; } }
        @keyframes ${uid}-shimLR { from { stroke-dashoffset: 70; } to { stroke-dashoffset: -700; } }
        @keyframes ${uid}-shimRL { from { stroke-dashoffset: -700; } to { stroke-dashoffset: 70; } }
      `}</style>
    </svg>
    </div>
  );
}

