"use client";

/* Surface — base lifted card with a subtle inner light-gradient.
 * The references use a soft top-to-bottom highlight on big cards; this
 * primitive captures it so we use it consistently. */

import type { CSSProperties, ReactNode } from "react";

export type SurfaceTone = "flat" | "glow";
export type SurfaceDepth = 1 | 2 | 3;
export type SurfaceRadius = "sm" | "md" | "lg" | "xl";

const RADIUS: Record<SurfaceRadius, number> = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const SHADOW: Record<SurfaceDepth, string> = {
  1: "var(--shadow-depth-1)",
  2: "var(--shadow-depth-2)",
  3: "var(--shadow-depth-3)",
};

export function Surface({
  tone = "flat",
  depth = 2,
  radius = "md",
  children,
  style,
  className,
}: {
  tone?: SurfaceTone;
  depth?: SurfaceDepth;
  radius?: SurfaceRadius;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background:
          tone === "glow" ? "var(--surface-card-glow)" : "var(--surface-card)",
        boxShadow: SHADOW[depth],
        borderRadius: RADIUS[radius],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
