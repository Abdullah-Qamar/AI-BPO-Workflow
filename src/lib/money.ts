/* Money: integer cents in, formatted strings out.
 *
 * Every figure in this product is a dollar amount stored as a JS number, and
 * the balance proof is a chain of about twenty additions that has to land on
 * an exact zero. Summed naively that chain drifts: 4318.42 + 42.18 - 185
 * evaluates to 4175.599999999999 in IEEE 754, and a proof that reads
 * "0.00000000001 unexplained" is a proof that failed, because the product's
 * whole claim is that the figure reaches zero and can be trusted there.
 *
 * `lib/fixtures/westlakeOperating.ts` already solved this privately with a
 * local toCents/sumCents pair for its own control-total checks. This module is
 * that idea made shared, because the proof, the resolution actions and every
 * screen that totals a column need it too, and two implementations of
 * rounding is how two surfaces come to disagree about the same month.
 *
 * The rule: ROUND ONCE, AT THE BOUNDARY. A dollar figure becomes cents the
 * moment it enters a calculation, stays an integer through every operation,
 * and becomes dollars again only to be displayed. Nothing in between is
 * allowed to be fractional.
 */

/* ---------- Conversion ---------- */

/* Dollars to integer cents. Math.round, not trunc: 12.34 * 100 is
 * 1233.9999999999998, and truncating it loses a cent on a value that was
 * exact in the source file. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}

/* Sum a list of DOLLAR amounts and return integer cents. The conversion
 * happens per item, before any addition, which is the entire point. */
export function sumCents(dollars: number[]): number {
  return dollars.reduce((total, amount) => total + toCents(amount), 0);
}

/* The same sum, handed back as dollars. For call sites that only want a total
 * to display and never do further arithmetic on it. */
export function sumDollars(dollars: number[]): number {
  return toDollars(sumCents(dollars));
}

/* ---------- Formatting ---------- */

/* Two decimals, thousands separated, no currency symbol and no sign.
 *
 * No symbol because a reconciliation is single-currency by construction — one
 * bank account, one denomination — so a "$" on every one of forty rows is
 * forty repetitions of a fact stated once in the account header. The figures
 * also have to align on the decimal in a column, and a symbol that only some
 * rows carry breaks that edge. */
const DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(dollars: number): string {
  return DECIMAL.format(Math.abs(dollars));
}

/* Signed, using U+2212 MINUS SIGN rather than U+002D HYPHEN-MINUS.
 *
 * Not a typographic nicety. globals.css maps numerals and their separators to
 * Host Grotesk by unicode-range, and that range deliberately EXCLUDES the
 * hyphen, because a hyphen is a word-joiner in prose far more often than it is
 * a minus. U+2212 is in the range. So a figure written with a hyphen renders
 * its sign in the text face and its digits in the numeral face, at a different
 * width, and the column's left edge frays. */
export function moneySigned(dollars: number): string {
  const sign = toCents(dollars) < 0 ? "−" : "";
  return `${sign}${money(dollars)}`;
}

/* Accounting form: a deduction in parentheses, "(18,240.50)".
 *
 * Used in the balance proof ladder, where each line already carries "Less" or
 * "Plus" in its label. The redundancy is deliberate and is the convention
 * every bank reconciliation uses: the words serve a reader going line by line,
 * the parentheses serve one scanning only the figures column, and a proof is
 * a document people check rather than read. */
export function moneyAccounting(dollars: number): string {
  return toCents(dollars) < 0 ? `(${money(dollars)})` : money(dollars);
}

/* Whether a figure is zero to the cent. The proof's central question, and the
 * reason it is a function: `unexplained === 0` is false for -1.4e-14, which is
 * exactly the value a float chain produces where the answer is zero. */
export function isZero(dollars: number): boolean {
  return toCents(dollars) === 0;
}
