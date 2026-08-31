/* TieoutMark — the Tieout logo, "Tied columns".
 *
 * The mark is two heavy pillars (bank statement + ledger) interlocked by a
 * stepped seam down the middle: two ledgers that tie out. It inherits the
 * reference app-icon language from logo.png — a glossy off-white squircle with
 * soft depth and a bold, carved glyph.
 *
 * This component is the single source of truth for the glyph geometry. The
 * portable asset files (src/app/icon.svg, public/logo.svg, site/logo.svg)
 * mirror the same four rectangles; keep them in sync if the geometry changes.
 *
 * Canonical geometry (viewBox 0 0 100 100):
 *   bank (left)   — vertical bar 25,24,17×52  + top arm    25,24,29×17
 *   ledger (right)— vertical bar 58,24,17×52  + bottom foot 46,59,29×17
 *   4-unit seam gaps form the stepped Z-channel between the two forms.
 */

export type TieoutMarkProps = {
  /** Overall pixel size — the tile edge in "tile" variant, the glyph box in "glyph". */
  size?: number;
  /** "tile" wraps the glyph in the glossy squircle (app-icon). "glyph" is the bare mark. */
  variant?: "tile" | "glyph";
  /** "duo" gives the ledger pillar the brand blue; "mono" keeps the whole mark one ink. */
  tone?: "duo" | "mono";
  /** Ink for the bank side (and the whole mark in "mono"). Defaults to the carved near-black. */
  ink?: string;
  /** Accent for the ledger side in "duo". Defaults to the brand approved-blue. */
  accent?: string;
  className?: string;
  title?: string;
};

const INK = "#1A1B1F";
const ACCENT = "#1B2AF0";

/* Glossy squircle chrome, ported from the reference logo.png. */
const TILE_BG =
  "linear-gradient(158deg, #FDFDFE 0%, #F1F2F5 54%, #E4E6EB 100%)";
const TILE_SHADOW = [
  "0 6px 14px -6px rgba(24,30,44,0.34)",
  "0 1px 2px rgba(24,30,44,0.16)",
  "inset 0 1.5px 1.5px rgba(255,255,255,0.95)",
  "inset 0 -8px 16px -10px rgba(40,46,62,0.18)",
].join(", ");

export function TieoutMark({
  size = 32,
  variant = "tile",
  tone = "duo",
  ink = INK,
  accent,
  className,
  title = "Tieout",
}: TieoutMarkProps) {
  const bank = ink;
  const ledger = tone === "duo" ? accent ?? ACCENT : ink;
  const glyphPx = variant === "tile" ? Math.round(size * 0.58) : size;

  const glyph = (
    <svg
      width={glyphPx}
      height={glyphPx}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      style={{ display: "block" }}
    >
      <g fill={bank}>
        <rect x="25" y="24" width="17" height="52" rx="2.5" />
        <rect x="25" y="24" width="29" height="17" rx="2.5" />
      </g>
      <g fill={ledger}>
        <rect x="58" y="24" width="17" height="52" rx="2.5" />
        <rect x="46" y="59" width="29" height="17" rx="2.5" />
      </g>
    </svg>
  );

  if (variant === "glyph") {
    return (
      <span
        className={className}
        style={{ display: "inline-grid", placeItems: "center" }}
      >
        {glyph}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "26%",
        background: TILE_BG,
        boxShadow: TILE_SHADOW,
        display: "grid",
        placeItems: "center",
        flex: "none",
      }}
    >
      {glyph}
    </span>
  );
}
