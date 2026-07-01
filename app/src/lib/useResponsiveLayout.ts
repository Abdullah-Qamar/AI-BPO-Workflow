"use client";

import { useEffect, useState } from "react";

/* Drives layout collapse thresholds:
 *   ≥ 1360  → nav open,    agents open
 *   1200–1359 → nav collapsed, agents open
 *   < 1200  → nav collapsed, agents collapsed
 *
 * Threshold lowered after the nav was tightened to 300 px — it now fits inside
 * common laptop widths without forcing the canvas to fight for space.
 *
 * Resize re-evaluates each time. User manual toggle still wins until the next
 * resize threshold crossing. */
export function useResponsiveLayout() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);

  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      setNavCollapsed(w < 1360);
      setAgentsCollapsed(w < 1200);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return {
    navCollapsed,
    setNavCollapsed,
    agentsCollapsed,
    setAgentsCollapsed,
  };
}
