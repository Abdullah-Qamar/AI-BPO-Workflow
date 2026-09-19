"use client";

/* PropertyRollup — a property and its accounts.
 *
 * NEVER renders a single badge for the property. A property cannot be proven.
 * Only its accounts can.
 *
 * This is the hierarchy bug made visible, and it is the one correction the whole
 * rebuild hangs off. A session used to show one status over four bank accounts,
 * and there is no honest value for that field: the moment one account is short,
 * a single badge has to choose between claiming the property is fine and going
 * red for the three accounts that are. Both are lies, and the second one is the
 * lie that trains people to ignore the badge.
 *
 * So the property renders a COUNT and one chip per account. "3 of 4 proven" is
 * a fact. A green tick on 1849 Westlake is not.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §3, docs/TAXONOMY_AND_IA.md Part 1.
 */

import { Tooltip } from "@/components/ui/Tooltip";

export interface RollupAccount {
  id: string;
  label: string;
  proven: boolean;
  /* What the account is doing, in words, for the chip's tooltip. A chip small
   * enough to sit four-across cannot carry its own label, so the hover does. */
  stateWords: string;
}

export function PropertyRollup({
  propertyLabel,
  accounts,
  onOpenAccount,
}: {
  propertyLabel: string;
  accounts: RollupAccount[];
  onOpenAccount?: (id: string) => void;
}) {
  const proven = accounts.filter((a) => a.proven).length;

  return (
    <div
      className="flex flex-row items-center"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-6)",
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">{propertyLabel}</span>
        {/* The count, and never a status. Two numbers and the word between
          * them, which is the most a container can honestly say about the
          * things it contains. */}
        <span className="t-meta ink-tertiary nums">
          {proven} of {accounts.length} accounts proven
        </span>
      </div>

      {/* One chip per account. Filled means proven, hollow means not yet, and
        * the difference is weight rather than hue: this row is a summary, and a
        * summary that is also the loudest thing on the screen is a summary
        * competing with the work. */}
      <div
        className="flex flex-row items-center shrink-0"
        style={{ gap: "var(--space-3)" }}
      >
        {accounts.map((a) => {
          const chip = (
            <button
              type="button"
              onClick={onOpenAccount ? () => onOpenAccount(a.id) : undefined}
              aria-label={`${a.label} · ${a.stateWords}`}
              className="flex items-center justify-center"
              style={{
                height: "var(--control-sm)",
                padding: "0 8px",
                borderRadius: 999,
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                letterSpacing: "var(--tracking-meta)",
                fontWeight: "var(--weight-medium)",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                cursor: onOpenAccount ? "pointer" : "default",
                background: a.proven
                  ? "var(--surface-tab-active)"
                  : "transparent",
                border: a.proven
                  ? "1px solid transparent"
                  : "1px solid var(--line-menu)",
                color: a.proven
                  ? "var(--ink-secondary)"
                  : "var(--ink-tertiary)",
              }}
            >
              {a.label}
            </button>
          );

          return (
            <Tooltip key={a.id} label={a.stateWords} side="top" tone="neutral">
              {chip}
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
