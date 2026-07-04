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
    cap: `${uid}-cap`,
    chrome: `${uid}-chrome`,
    capL: `${uid}-capL`,
    capR: `${uid}-capR`,
  };

  /* Active wire: the chrome path stretches to fill the slot (that's what
   * makes the wire visually bridge the two cards). But the endpoint caps and
   * shimmer glow blobs are decorative shapes that need to stay proportional —
   * so we wrap in a positioned container, keep the stretchy paths in a full-
   * bleed SVG, and render the caps as fixed-size anchored SVGs. */
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
      {/* Endpoint caps — decorative teardrop shapes that visually fuse the
       * wire with the bank / ledger card edges. Pulled OUT of the stretchy
       * SVG (which uses preserveAspectRatio="none" for the paths to reach
       * across variable-width slots) so the caps stay proportional at any
       * slot width. Anchored to the same left/right edge percentages as the
       * inactive sockets — the wire visually enters/exits at these points. */}
      <EndpointCap side="left" uid={uid} breathDelay="0s" />
      <EndpointCap side="right" uid={uid} breathDelay="-2.4s" />
    </div>
  );
}

/* EndpointCap — fixed-size decorative teardrop rendered as its own SVG so
 * it doesn't inherit the horizontal stretch that the wire's chrome path
 * uses. Vertical position matches where the wire path enters/exits the
 * viewBox on each side (~38.74% left, ~55.15% right). Horizontal position
 * matches the wire path's start/end x-coordinate percentage (9/305 ≈ 2.95%
 * on the left, 283/305 ≈ 92.79% on the right) so the cap's inner edge stays
 * aligned with where the wire terminates at ANY slot width — otherwise the
 * cap stays pinned to the container edge while the wire endpoint drifts
 * inward, opening a visible gap in wider slots. */
function EndpointCap({
  side,
  uid,
  breathDelay,
}: {
  side: "left" | "right";
  uid: string;
  breathDelay: string;
}) {
  const topPct = side === "left" ? "38.74%" : "55.15%";
  /* Left cap's "socket" (where the wire enters) is its right edge (viewBox
   * x=32); place cap.right at container 2.95%, i.e. cap.left = 2.95% - 32px.
   * Right cap's socket is its left edge (viewBox x=0); place cap.left at
   * container 92.79%, i.e. cap.right = 7.21% - 0px (with 32px width offset
   * flipped: cap.right = 7.21% relative to container's right edge minus
   * cap width so the LEFT edge lands at 92.79%). */
  const horiz =
    side === "left"
      ? { left: "calc(2.95% - 32px)" }
      : { right: "calc(7.21% - 32px)" };
  const style: React.CSSProperties = {
    position: "absolute",
    top: topPct,
    ...horiz,
    transform: "translateY(-50%)",
    width: 32,
    height: 48,
    pointerEvents: "none",
    animation: `${uid}-capBreath 5.4s ease-in-out infinite ${breathDelay}`,
    transformBox: "fill-box",
    transformOrigin: "center",
  };
  const gradId = `${uid}-cap-${side}-grad`;
  return (
    <svg
      width={32}
      height={48}
      viewBox="0 0 32 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradId}
          x1={side === "left" ? 26 : 6}
          y1="24"
          x2={side === "left" ? 10 : 26}
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A5B0C0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      {side === "left" ? (
        <path
          d="M4 46C-0.3 32.7 0.8 9.5 2.6 0C5.5 16.1 24.2 21.5 32 22C14.5 22.9 5.2 39.1 4 46Z"
          fill={`url(#${gradId})`}
          filter="blur(1.2px)"
        />
      ) : (
        <path
          d="M28 46C32.3 32.7 29.7 10.5 27.9 1C25 17 8.1 22 0 22.4C18.1 23.3 26.7 39 28 46Z"
          fill={`url(#${gradId})`}
          filter="blur(1.2px)"
        />
      )}
    </svg>
  );
}
