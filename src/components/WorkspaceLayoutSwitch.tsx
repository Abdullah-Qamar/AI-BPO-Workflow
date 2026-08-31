"use client";

/* WorkspaceLayoutSwitch — chooses which of the two reconciliation layouts the
 * canvas draws.
 *
 *   pairs    — variation 1. One full-width row per account: statement card,
 *              wire, ledger card. The document-level view.
 *   accounts — variation 2. One card per account, laid across the canvas.
 *              The property-level view.
 *
 * Named for what the reader gets rather than for which was built first: the
 * choice is "am I looking at documents or at accounts", and "V1 / V2" answers
 * a question nobody using this app has.
 *
 * Icon-only, because of where it has to live. The header's control row already
 * carries the phase CTA and the cycle picker, and at the 620px canvas that the
 * app most often runs at, adding ~175px of labelled control is exactly enough
 * to push the whole group onto a second line. Two 28px cells cost 62px and the
 * row holds. The tooltip and the aria-label carry the name.
 *
 * The cells are the contract's tab recipe (§2) minus the text: --control-md
 * high, --radius-control, active = --surface-tab-active under a white hairline
 * with --shadow-chip, inactive transparent. They are not ui/Button, because a
 * segmented choice is a tab strip and pills sitting side by side do not read as
 * one control. */

import { LayoutGrid, Rows3 } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

export type WorkspaceLayout = "pairs" | "accounts";

export const LAYOUT_STORAGE_KEY = "tieout:workspace-layout";

const OPTIONS: {
  value: WorkspaceLayout;
  label: string;
  icon: typeof Rows3;
}[] = [
  { value: "pairs", label: "Statement and ledger pairs", icon: Rows3 },
  { value: "accounts", label: "One card per account", icon: LayoutGrid },
];

export function WorkspaceLayoutSwitch({
  value,
  onChange,
}: {
  value: WorkspaceLayout;
  onChange: (next: WorkspaceLayout) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Canvas layout"
      className="flex flex-row items-center shrink-0"
      style={{
        padding: "var(--space-1)",
        gap: "var(--space-1)",
        background: "var(--surface-input)",
        borderRadius: "var(--radius-sheet)",
      }}
    >
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = value === option;
        return (
          <Tooltip key={option} label={label} side="bottom">
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(option)}
              className="flex items-center justify-center"
              style={{
                width: "var(--control-md)",
                height: "var(--control-md)",
                background: active ? "var(--surface-tab-active)" : "transparent",
                border: active ? "1px solid #FFFFFF" : "1px solid transparent",
                boxShadow: active ? "var(--shadow-chip)" : "none",
                borderRadius: "var(--radius-control)",
                color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
                cursor: "pointer",
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
