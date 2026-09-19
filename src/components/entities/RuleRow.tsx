"use client";

/* RuleRow — one rule the machine has been taught.
 *
 * NEVER renders without an owner and an expiry, and both are required props
 * rather than optional ones, so the rule is enforced by the type and not by
 * remembering.
 *
 * The reason is what the knowledge base currently holds. Two examples, both
 * real, both in the seed:
 *
 *   "Tenant ACH returns for unit 308 are a known recurring issue with broken
 *    auto-pay. Approve manually."
 *   "Refunds under $250 are routine. Auto-approve and skip the ambiguity check."
 *
 * Those are prompts wearing a rule's clothes. The first tells the books a tenant
 * paid when they did not. The second disables the exact safeguard the fixture's
 * two 210.00 refunds exist to demonstrate. Neither can be tested, previewed, or
 * used to reconstruct why March behaved differently from April — and neither
 * has anybody's name on it or a date it stops being true.
 *
 * An owner makes a rule answerable. An expiry makes it get reviewed. A rule
 * with neither is a permanent unattributed change to how money is classified,
 * which is the thing nobody intends to build and everybody ends up with.
 *
 * The two counts are the rule's own observability: overridden often means wrong,
 * stopped firing means dead.
 *
 * Spec: docs/BUILD_PROMPTS.md S3 §6, docs/AI_ARCHITECTURE.md Part 5,
 * docs/FLOWS.md F7.
 */

export type RuleScope = "global" | "portfolio" | "property" | "account";

const SCOPE_WORDS: Record<RuleScope, string> = {
  global: "Everywhere",
  portfolio: "This portfolio",
  property: "This property",
  account: "This account",
};

function overrideRate(fired: number, overridden: number): number | null {
  /* No rate until there is something to divide. A rule that has fired twice has
   * no override rate worth printing, and "50%" off one disagreement is a number
   * that will be believed far past what it can support. */
  if (fired < 5) return null;
  return overridden / fired;
}

export function RuleRow({
  condition,
  scope,
  scopeLabel,
  owner,
  expires,
  timesFired,
  timesOverridden,
  onOpen,
}: {
  /* The condition in plain words, as a person would say it out loud: "a deposit
   * matching three or more rent rows that sum to it". Not an expression. */
  condition: string;
  scope: RuleScope;
  /* The thing the scope names, when it names one: "1849 Westlake". */
  scopeLabel?: string;
  /* Required. A rule nobody owns is a rule nobody reviews. */
  owner: string;
  /* Required, ISO date. A rule that never expires never gets looked at again. */
  expires: string;
  timesFired: number;
  timesOverridden: number;
  onOpen?: () => void;
}) {
  const rate = overrideRate(timesFired, timesOverridden);
  const expiresOn = new Date(`${expires}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="list-row flex flex-row items-center w-full text-left"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-6)",
        borderRadius: "var(--radius-row)",
        background: "transparent",
        border: "1px solid transparent",
        cursor: onOpen ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">{condition}</span>
        <span className="t-meta ink-tertiary truncate">
          {scopeLabel ? `${SCOPE_WORDS[scope]} · ${scopeLabel}` : SCOPE_WORDS[scope]}
          {" · "}
          {owner}
          {" · expires "}
          <span className="nums">{expiresOn}</span>
        </span>
      </div>

      <div
        className="flex flex-col items-end shrink-0"
        style={{ gap: 2 }}
      >
        <span className="t-body nums ink-primary">
          {timesFired}
        </span>
        {/* The question is written beside the number, because a bare figure
          * gets read as whatever the reader was already thinking. */}
        <span className="t-meta ink-tertiary">
          {rate === null
            ? "times fired"
            : `fired · overridden ${Math.round(rate * 100)}%`}
        </span>
      </div>
    </button>
  );
}
