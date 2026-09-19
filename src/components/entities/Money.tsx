"use client";

/* Money — the only way a figure is drawn.
 *
 * NEVER uses a hyphen for a negative. That is the whole reason this exists as a
 * component rather than a formatting call each surface makes for itself.
 *
 * globals.css maps numerals and their separators to Host Grotesk by
 * unicode-range, and that range deliberately EXCLUDES U+002D, because a hyphen
 * is a word-joiner in prose ("auto-pay", "first-time") far more often than it
 * is a minus. U+2212 is in the range. A figure written with a hyphen therefore
 * renders its sign in the text face and its digits in the numeral face, at
 * different widths, and a column of them frays down its left edge. The
 * formatters in lib/money.ts already do this correctly; wrapping them here is
 * what stops the twelfth call site doing `${amount}` and undoing it.
 *
 * Two decimals always, tabular, no currency symbol. No symbol because a
 * reconciliation is single-currency by construction — one bank account, one
 * denomination — so a "$" on forty rows is forty repetitions of a fact the
 * account header states once, and a symbol only some rows carry breaks the
 * decimal alignment that makes a column readable.
 */

import type { CSSProperties } from "react";
import { money, moneyAccounting, moneySigned } from "@/lib/money";

export type MoneyForm =
  /* No sign at all. For a magnitude, where the direction is carried by a label
   * or by the column the figure sits in. */
  | "plain"
  /* U+2212 on negatives. For a figure that is genuinely signed, like a
   * difference that can fall either side of zero. */
  | "signed"
  /* Parentheses on negatives. The bank reconciliation convention, for a ladder
   * whose labels already read "Less" and "Plus". */
  | "accounting";

export type MoneyEmphasis = "normal" | "medium" | "lead";

export function Money({
  amount,
  form = "signed",
  emphasis = "normal",
  tone,
  style,
}: {
  amount: number;
  form?: MoneyForm;
  emphasis?: MoneyEmphasis;
  /* An explicit colour, for the rare figure that carries a meaning of its own —
   * the unexplained total turning ok when it reaches zero. Left unset, a figure
   * takes primary ink, because a number is content and not a signal. */
  tone?: string;
  style?: CSSProperties;
}) {
  const text =
    form === "plain"
      ? money(amount)
      : form === "accounting"
        ? moneyAccounting(amount)
        : moneySigned(amount);

  /* `lead` is the figure a card is ABOUT, and globals.css permits one per card.
   * It carries its own weight and tracking, so it must not also take a weight
   * from here. */
  if (emphasis === "lead") {
    return (
      <span
        className="nums-lead"
        style={{ color: tone ?? "var(--ink-primary)", ...style }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className="nums"
      style={{
        fontWeight:
          emphasis === "medium"
            ? "var(--weight-medium)"
            : "var(--weight-regular)",
        color: tone ?? "var(--ink-primary)",
        ...style,
      }}
    >
      {text}
    </span>
  );
}
