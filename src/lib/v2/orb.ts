/* Agent orbs — the per-agent animation from `thinking-orbs`.
 *
 * One map so the core square and the activity pills can never drift into
 * showing different animations for the same agent.
 *
 * Two constraints from the package worth knowing before changing anything:
 *
 *   size   Only 64 and 20 exist. They are separately hand-tuned designs — dot
 *          count, dot size and speed are each retuned per preset — not a scale
 *          factor. Passing any other number is a type error, and picking the
 *          wrong one is a design decision, not a sizing one.
 *
 *   theme  Defaults to `auto`, which resolves from an ancestor `data-theme` /
 *          `dark` class and then from `prefers-color-scheme`. This app is
 *          light-only, so `auto` would paint light ink on our light canvas for
 *          anyone whose OS is in dark mode — invisible orbs, on their machine
 *          only. Always pin `light`. */

import type { OrbState } from "thinking-orbs";
import type { ActivityAgent } from "./activity";

export const AGENT_ORB: Record<ActivityAgent, OrbState> = {
  /* a constellation wires itself, packets running the edges — intake pulling
   * documents together into pairs */
  intake: "connecting",
  /* bands scramble in quarter turns, then click back — matching */
  reconciliation: "solving",
  /* three strands plait around the sphere — the summary braiding results */
  summary: "weaving",
};
