/* The Westlake operating account, May 2026 — the demo's one real month.
 *
 * Transcribed by hand from the two files in `fixtures/`:
 *
 *   fixtures/bai2-westlake-operating-2026-05.bai   — 14 bank lines
 *   fixtures/yardi-gl-westlake-operating-2026-05.csv — 16 ledger rows
 *
 * Those files stay the source of truth. This module exists because the
 * product cannot ship a BAI2 parser and a CSV parser just to draw a
 * prototype, and because typed data is what every screen actually wants.
 * If the files change, this module is wrong until someone changes it too —
 * which is what `verifyFixture()` at the bottom is for.
 *
 * ---------- BAI2 amounts carry an implied 2 decimals ----------
 *
 * A BAI2 `16` detail record states its amount as an unsigned integer number
 * of cents with no decimal point: `1245000` is $12,450.00. The declared
 * control totals in the `03` header are the same — `28540000` is the
 * $285,400.00 opening balance. Every figure below has been divided by 100
 * once, here, so that no consumer has to remember to do it and no consumer
 * can forget.
 *
 * ---------- The sign convention, and why ----------
 *
 * Neither source file signs its amounts. BAI2 encodes direction in the type
 * code's band — 100–399 is the credit band, 400–699 the debit band — and the
 * Yardi export encodes it in which of two columns the figure lands in,
 * `Debit` or `Credit`, against the cash account.
 *
 * Both are preserved here as **one signed number per line, positive = money
 * into the bank account, negative = money out.** Three reasons. The balance
 * proof is a walk — opening plus credits less debits equals closing — and a
 * walk wants addition, not a branch on a band or a column name. A bank line
 * and a ledger row must be comparable to be matched, and they are only
 * comparable if they are signed the same way. And the sign a reviewer reads
 * on screen is the sign of the cash movement, so storing anything else means
 * every renderer re-derives it.
 *
 * The one thing worth stating plainly, because it inverts for half the rows:
 * a GL **Debit** to the cash account is cash **in** and is therefore positive
 * here, and a GL **Credit** is cash out and is negative. That is correct
 * double-entry and it is the opposite of the everyday sense of the words. The
 * separate `Debit`/`Credit` string columns are deliberately not carried over,
 * because every consumer wants the signed figure and keeping both invites a
 * screen that reads the wrong one.
 *
 * ---------- Why verifyFixture() exists ----------
 *
 * Everything the product claims rests on this data. The balance proof, the
 * bounced-payment pattern, the "still unexplained: 0.00" that the whole case
 * study argues for — all of it is arithmetic over the rows below. A single
 * mistyped digit here would not crash anything. It would produce a proof that
 * quietly fails to reach zero, or worse, one that reaches zero for the wrong
 * reason, and the demo would be making a false claim with a straight face.
 *
 * So the declared control totals from the `03` header are stored separately
 * from the detail lines, and `verifyFixture()` recomputes the detail and
 * compares. It returns a structured result rather than throwing, so a screen
 * can render the fixture's own integrity as a visible fact instead of the
 * import crashing the app. See `docs/REBUILD_PLAN.md` Part 3 for the
 * hand-reconciliation this parse must reproduce. */

/* ---------- Types ----------
 *
 * Narrow on purpose, and all prefixed `Fixture`. These describe *this file's
 * two documents as transcribed*, not the reconciliation domain — matching,
 * outcomes and the proof are a separate contract, and a type called `Match`
 * or `BalanceProof` living in a fixture module would be the wrong home for
 * it and would collide with the real one. */

export type FixtureBankLine = {
  /* Derived from the bank reference, which is the bank's own unique key for
   * the line. That makes an id stable under any reordering and greppable
   * straight back to the raw `.bai` file, which a positional `line-7` is
   * not. Note the two `BR0520...` lines: the return and its fee share a date
   * and a customer reference and are only told apart by this sequence. */
  id: string;
  /* The BAI2 type code as a number, kept raw. It is the fixture's most
   * load-bearing detail — the band decides the sign, and the code itself is
   * what a per-bank code dictionary would one day be keyed on — so it is
   * stored as the file states it rather than folded into `typeMeaning`. */
  typeCode: number;
  /* The code's plain-English meaning, denormalised onto each line so that no
   * renderer needs a lookup table to label a row. Short phrasings of the
   * canonical ASC X9 descriptions. */
  typeMeaning: string;
  /* ISO date.
   *
   * Worth knowing: a BAI2 `16` record has no date field. The only date in
   * the file is on the `02` group header (`260601`, the 1 June as-of date),
   * which covers the whole group and cannot date an individual line. These
   * per-line dates are therefore read off this fixture's bank-reference
   * convention, `BR<MMDD><seq>` — `BR0504001` is 4 May. Real files vary, and
   * a real parser would need the per-bank convention or the `88` continuation
   * records; the demo does not, because the fixture is internally regular. */
  postDate: string;
  /* Signed dollars. Positive = into the account. See the header. */
  amount: number;
  bankRef: string;
  customerRef: string;
  description: string;
};

export type FixtureLedgerRow = {
  /* From the Yardi control number, the export's own unique key per row. */
  id: string;
  postDate: string;
  batchRef: string;
  controlNo: string;
  /* Absent on rows that moved no cheque — receipts, the journal transfer, and
   * the two ACH refunds. Optional rather than an empty string, so that "this
   * row has no cheque number" cannot be confused with "the cheque number is
   * blank in the file", and so the outstanding-cheque logic can test
   * presence instead of truthiness on `""`. */
  checkNo?: string;
  payee: string;
  description: string;
  /* Signed dollars. Positive = cash in, i.e. a GL Debit to the cash
   * account. See the header — this is the sign that inverts. */
  amount: number;
};

/* The `03` account header's declared totals, kept apart from the detail so
 * that the two can be compared. This is the whole point: if these were
 * computed from the lines below they would agree by construction and prove
 * nothing. They are what the *bank said*, transcribed. */
export type FixtureControlTotals = {
  /* Type code 010, the prior period's closing balance. */
  openingBalance: number;
  /* Type code 015, the balance the month must end on. */
  closingBalance: number;
  /* Type code 100 — the credit-band total and its item count. */
  creditTotal: number;
  creditCount: number;
  /* Type code 400 — the debit-band total and its item count. */
  debitTotal: number;
  debitCount: number;
};

/* ---------- The bank statement ----------
 *
 * In file order, which is not date order: the bank groups its credits before
 * its debits, as BAI2 files generally do. Preserved as-is so that a line
 * here sits at the same index as the line in the `.bai` file, which makes a
 * transcription error findable by reading the two side by side. */
export const bankLines: FixtureBankLine[] = [
  {
    id: "bank-br0504001",
    typeCode: 165,
    typeMeaning: "ACH credit",
    postDate: "2026-05-04",
    /* The deposit that covers three rents — 4,200 + 4,150 + 4,100 on the
     * ledger side. The one-to-many case the current contract cannot hold. */
    amount: 12450.0,
    bankRef: "BR0504001",
    customerRef: "RENTPAY0504",
    description: "ACH CREDIT RENTPAY BATCH 0504",
  },
  {
    id: "bank-br0503001",
    typeCode: 165,
    typeMeaning: "ACH credit",
    postDate: "2026-05-03",
    /* Unit 308's rent. This is the payment that bounces on the 20th: the
     * 1,200.00 return plus its 75.00 fee reverse exactly this figure. */
    amount: 1275.0,
    bankRef: "BR0503001",
    customerRef: "RP308",
    description: "ACH CREDIT RENT UNIT 308",
  },
  {
    id: "bank-br0506001",
    typeCode: 175,
    typeMeaning: "Check deposit package",
    postDate: "2026-05-06",
    /* The clean one-to-one match: same amount, same date, same batch. */
    amount: 8900.0,
    bankRef: "BR0506001",
    customerRef: "DEP0506",
    description: "DEPOSIT CHECK PACKAGE",
  },
  {
    id: "bank-br0512001",
    typeCode: 165,
    typeMeaning: "ACH credit",
    postDate: "2026-05-12",
    /* The Stripe payout the bank received and the books never recorded — no
     * ledger row corresponds to it. A book reconciling item, and the
     * +4,318.42 on the book side of the proof. */
    amount: 4318.42,
    bankRef: "BR0512001",
    customerRef: "STRIPE0512",
    description: "ACH CREDIT STRIPE PAYOUT ST-88412",
  },
  {
    id: "bank-br0518001",
    typeCode: 175,
    typeMeaning: "Check deposit package",
    postDate: "2026-05-18",
    amount: 22600.0,
    bankRef: "BR0518001",
    customerRef: "DEP0518",
    description: "DEPOSIT CHECK PACKAGE",
  },
  {
    id: "bank-br0531002",
    typeCode: 354,
    typeMeaning: "Interest earned",
    postDate: "2026-05-31",
    /* Interest, not in the books. Nets against the 185.00 analysis fee to the
     * proof's "less a service charge, plus interest earned (142.82)". */
    amount: 42.18,
    bankRef: "BR0531002",
    customerRef: "INT0531",
    description: "INTEREST EARNED",
  },
  {
    id: "bank-br0507001",
    typeCode: 475,
    typeMeaning: "Check paid",
    postDate: "2026-05-07",
    amount: -4120.0,
    bankRef: "BR0507001",
    customerRef: "1038",
    description: "CHECK PAID 1038",
  },
  {
    id: "bank-br0511001",
    typeCode: 475,
    typeMeaning: "Check paid",
    postDate: "2026-05-11",
    amount: -2875.5,
    bankRef: "BR0511001",
    customerRef: "1040",
    description: "CHECK PAID 1040",
  },
  {
    id: "bank-br0515001",
    typeCode: 451,
    typeMeaning: "ACH debit",
    postDate: "2026-05-15",
    /* One refund cleared the bank. The ledger holds *two* identical 210.00
     * refunds — invoice 4912 and invoice 4913 — and this line can only be
     * one of them. The reviewer must choose, and the proof reaches 0.00
     * either way, which is the demo's sharpest thirty seconds. */
    amount: -210.0,
    bankRef: "BR0515001",
    customerRef: "4912",
    description: "ACH DEBIT REFUND INV 4912",
  },
  {
    id: "bank-br0520001",
    typeCode: 555,
    typeMeaning: "Returned item",
    postDate: "2026-05-20",
    amount: -1200.0,
    bankRef: "BR0520001",
    customerRef: "RP308",
    description: "RETURNED ITEM UNIT 308",
  },
  {
    id: "bank-br0520002",
    /* 567, "Return Item Fee". This line read `398` until 19 September 2026;
     * 398 is "Miscellaneous Fee Refund", a *credit*-band code, so the file
     * was charging a fee with the code for refunding one. See
     * `docs/REBUILD_PLAN.md` Part 3. */
    typeCode: 567,
    typeMeaning: "Return item fee",
    postDate: "2026-05-20",
    /* 1,200.00 + 75.00 = 1,275.00, exactly reversing the 3 May rent. That
     * identity is what lets the bounced-payment pattern be confirmed by a
     * deterministic check rather than asserted by a model. */
    amount: -75.0,
    bankRef: "BR0520002",
    customerRef: "RP308",
    description: "RETURN ITEM FEE",
  },
  {
    id: "bank-br0522001",
    typeCode: 475,
    typeMeaning: "Check paid",
    postDate: "2026-05-22",
    amount: -9340.0,
    bankRef: "BR0522001",
    customerRef: "1045",
    description: "CHECK PAID 1045",
  },
  {
    id: "bank-br0526001",
    typeCode: 495,
    typeMeaning: "Transfer out",
    postDate: "2026-05-26",
    amount: -15000.0,
    bankRef: "BR0526001",
    customerRef: "TRF0526",
    description: "TRANSFER TO RESERVE XXXX9034",
  },
  {
    id: "bank-br0529001",
    typeCode: 698,
    typeMeaning: "Service fee",
    postDate: "2026-05-29",
    /* The bank's monthly analysis fee, never entered in the books. */
    amount: -185.0,
    bankRef: "BR0529001",
    customerRef: "AA0529",
    description: "ACCOUNT ANALYSIS FEE",
  },
];

/* ---------- The Yardi general ledger export ----------
 *
 * Every row is account 1010-000, Cash - Operating, on property wl1849, post
 * month 05/2026. Those four columns are constant across all sixteen rows and
 * are dropped rather than repeated — this module is one account for one
 * month, and carrying the key on every row would imply it could vary.
 *
 * The export's `Cleared` and `ClearedDate` columns are `N` and empty on all
 * sixteen rows, so they are dropped too. That is the honest starting state:
 * nothing is cleared until this product clears it, and a cleared flag
 * transcribed as a constant `false` would be a field pretending to be data. */
export const ledgerRows: FixtureLedgerRow[] = [
  {
    id: "gl-r11488",
    postDate: "2026-05-03",
    batchRef: "CR-26050301",
    controlNo: "R-11488",
    payee: "Tenant 308",
    description: "Rent - unit 308",
    /* The rent that bounces. The books still believe this was paid, which is
     * the whole reason a returned item is a book reconciling item. */
    amount: 1275.0,
  },
  {
    id: "gl-r11501",
    postDate: "2026-05-04",
    batchRef: "CR-26050401",
    controlNo: "R-11501",
    payee: "Tenant 101",
    description: "Rent - unit 101",
    amount: 4200.0,
  },
  {
    id: "gl-r11502",
    postDate: "2026-05-04",
    batchRef: "CR-26050401",
    controlNo: "R-11502",
    payee: "Tenant 204",
    description: "Rent - unit 204",
    amount: 4150.0,
  },
  {
    id: "gl-r11503",
    postDate: "2026-05-04",
    batchRef: "CR-26050401",
    controlNo: "R-11503",
    payee: "Tenant 312",
    description: "Rent - unit 312",
    /* With R-11501 and R-11502 this completes the 12,450.00 deposit. All
     * three share batch CR-26050401, which is the deterministic hook: the
     * one-to-many match is provable from the batch reference, not guessed
     * from a subset sum. */
    amount: 4100.0,
  },
  {
    id: "gl-r11510",
    postDate: "2026-05-06",
    batchRef: "CR-26050601",
    controlNo: "R-11510",
    payee: "Various",
    description: "Deposit - check batch 0506",
    amount: 8900.0,
  },
  {
    id: "gl-v20881",
    postDate: "2026-05-07",
    batchRef: "AP-26050701",
    controlNo: "V-20881",
    checkNo: "1038",
    payee: "Bayview Landscaping",
    description: "Grounds maintenance - May",
    amount: -4120.0,
  },
  {
    id: "gl-v20894",
    postDate: "2026-05-11",
    batchRef: "AP-26051101",
    controlNo: "V-20894",
    checkNo: "1040",
    payee: "Harbor Plumbing Co",
    description: "Unit 207 repair",
    amount: -2875.5,
  },
  {
    id: "gl-v20901",
    postDate: "2026-05-14",
    batchRef: "AP-26051401",
    controlNo: "V-20901",
    payee: "Tenant 115",
    description: "Refund - invoice 4912",
    /* One of the two identical refunds. Its invoice number matches the bank's
     * 15 May ACH debit and its date is one day earlier, which is ordinary
     * settlement lag — so the reference points here while the amount alone
     * cannot distinguish it from V-20907 below. */
    amount: -210.0,
  },
  {
    id: "gl-v20907",
    postDate: "2026-05-16",
    batchRef: "AP-26051601",
    controlNo: "V-20907",
    payee: "Tenant 119",
    description: "Refund - invoice 4913",
    /* The other identical refund. Whichever of the two the reviewer leaves
     * unmatched is an outstanding item of exactly 210.00, so the outstanding
     * total is 18,450.50 and the proof reaches 0.00 on either choice. Balance
     * is not evidence of correctness; this is that claim, on real numbers. */
    amount: -210.0,
  },
  {
    id: "gl-r11533",
    postDate: "2026-05-18",
    batchRef: "CR-26051801",
    controlNo: "R-11533",
    payee: "Various",
    description: "Deposit - check batch 0518",
    amount: 22600.0,
  },
  {
    id: "gl-v20915",
    postDate: "2026-05-22",
    batchRef: "AP-26052201",
    controlNo: "V-20915",
    checkNo: "1045",
    payee: "Summit Roofing LLC",
    description: "Roof section B",
    amount: -9340.0,
  },
  {
    id: "gl-v20922",
    postDate: "2026-05-24",
    batchRef: "AP-26052401",
    controlNo: "V-20922",
    checkNo: "1042",
    payee: "Delta HVAC Services",
    description: "Chiller service call",
    /* Cheque 1042 never appears on the statement. Outstanding, entirely
     * normal, carries into June — and under the current two-bucket contract
     * it would have to be filed as a problem. */
    amount: -3200.0,
  },
  {
    id: "gl-j04417",
    postDate: "2026-05-26",
    batchRef: "JE-26052601",
    controlNo: "J-04417",
    payee: "Internal",
    description: "Transfer to capital reserve",
    /* A journal entry, not a cheque — hence no check number. It matches the
     * bank's 495 transfer on the same date. */
    amount: -15000.0,
  },
  {
    id: "gl-v20930",
    postDate: "2026-05-28",
    batchRef: "AP-26052801",
    controlNo: "V-20930",
    checkNo: "1051",
    payee: "Pacific Mutual Insurance",
    description: "Property premium Q2",
    /* Outstanding cheque two. */
    amount: -8450.0,
  },
  {
    id: "gl-v20938",
    postDate: "2026-05-29",
    batchRef: "AP-26052901",
    controlNo: "V-20938",
    checkNo: "1055",
    payee: "Kerr & Associates",
    description: "Legal - lease review",
    /* Outstanding cheque three. 3,200.00 + 8,450.00 + 6,590.50 + one 210.00
     * refund = the 18,450.50 the bank side of the proof subtracts. */
    amount: -6590.5,
  },
  {
    id: "gl-r11560",
    postDate: "2026-05-31",
    batchRef: "CR-26053101",
    controlNo: "R-11560",
    payee: "Various",
    description: "Deposit - rent batch 0531",
    /* Banked on the 31st, lands on the 1st. The deposit in transit, added
     * back on the bank side of the proof. */
    amount: 9315.0,
  },
];

/* ---------- What the bank declared ----------
 *
 * From the single `03` record:
 *
 *   03,000000003421,USD,010,28540000,,,015,30198010,,,100,4958560,6,,400,3300550,8,/
 *
 * Read as: account 3421, USD, then (type, amount, item count, funds type)
 * quadruples — 010 opening 28540000, 015 closing 30198010, 100 credits
 * 4958560 over 6 items, 400 debits 3300550 over 8 items. The balance codes
 * carry no item count, which is why only the 100 and 400 counts appear
 * below. */
export const controlTotals: FixtureControlTotals = {
  openingBalance: 285400.0,
  closingBalance: 301980.1,
  creditTotal: 49585.6,
  creditCount: 6,
  debitTotal: 33005.5,
  debitCount: 8,
};

/* ---------- Verification ---------- */

export type FixtureCheck = {
  /* Human-readable, because this is meant to be rendered as well as asserted. */
  label: string;
  expected: number;
  actual: number;
  ok: boolean;
};

export type FixtureVerification = {
  /* True only when every check passed. */
  ok: boolean;
  checks: FixtureCheck[];
};

/* Dollars are stored as JS numbers, so a naive sum of 42.18 and 4,318.42 and
 * eleven other decimals drifts into the fifteenth place and an `===` against
 * a declared total fails for a fixture that is in fact correct. Summing in
 * integer cents removes the drift instead of hiding it behind an epsilon,
 * which matters here: the whole point of this function is that a comparison
 * failing means the data is wrong, so the comparison must not be able to fail
 * for any other reason. */
function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function sumCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + toCents(amount), 0);
}

function check(label: string, expected: number, actual: number): FixtureCheck {
  return { label, expected, actual, ok: expected === actual };
}

/* Recompute everything the bank declared, from the detail lines alone, and
 * report each comparison.
 *
 * Deliberately does not throw. A transcription error is a data defect, not a
 * crash — and a module that threw on import would take the whole app down
 * rather than let a screen say "the fixture does not tie", which is the more
 * useful failure and is itself a demonstration of the product's argument.
 *
 * All figures in the returned checks are in cents, so that `expected` and
 * `actual` are exact integers a caller can compare or print without
 * re-introducing the float problem this function exists to avoid. */
export function verifyFixture(): FixtureVerification {
  const credits = bankLines.filter((line) => line.amount > 0);
  const debits = bankLines.filter((line) => line.amount < 0);

  const creditCents = sumCents(credits.map((line) => line.amount));
  /* Negated so the check compares against the declared debit total, which
   * BAI2 states unsigned. */
  const debitCents = -sumCents(debits.map((line) => line.amount));

  const checks: FixtureCheck[] = [
    check("Credit total", toCents(controlTotals.creditTotal), creditCents),
    check("Credit item count", controlTotals.creditCount, credits.length),
    check("Debit total", toCents(controlTotals.debitTotal), debitCents),
    check("Debit item count", controlTotals.debitCount, debits.length),
    /* The walk. Opening plus credits less debits must equal the declared
     * closing balance — this is the one check that ties the two control
     * totals to each other rather than to the detail, and a sign error
     * anywhere above shows up here even if both totals pass. */
    check(
      "Opening + credits - debits = closing",
      toCents(controlTotals.closingBalance),
      toCents(controlTotals.openingBalance) + creditCents - debitCents
    ),
    /* Not a control total, but a check on the transcription itself: BAI2
     * assigns direction by band, so a positive amount on a 400–699 code (or a
     * negative one on 100–399) means the sign convention was applied wrongly
     * to that line. This is exactly the defect that the `398` fee line was —
     * a debit wearing a credit-band code — and this check is what would have
     * caught it. Expressed as a count so the failure says how many. */
    check(
      "Lines whose sign disagrees with their type code band",
      0,
      bankLines.filter((line) => {
        const creditBand = line.typeCode >= 100 && line.typeCode <= 399;
        const signedAsCredit = line.amount > 0;
        return creditBand !== signedAsCredit;
      }).length
    ),
  ];

  return { ok: checks.every((c) => c.ok), checks };
}

/* The book side, for symmetry with the bank side above.
 *
 * The ledger export declares no control totals — a Yardi GL extract is rows,
 * not a statement — so there is nothing to compare these against and they are
 * not part of `verifyFixture()`. They are exported because the book balance is
 * the opening figure for the book journey of the balance proof, and because
 * `docs/REBUILD_PLAN.md` Part 3 records the hand-computed values (cash in
 * 54,540.00, cash out 49,996.00, book balance 289,944.00) that these must
 * reproduce. */
export function ledgerTotals(): {
  cashIn: number;
  cashOut: number;
  bookBalance: number;
} {
  const cashIn = sumCents(
    ledgerRows.filter((row) => row.amount > 0).map((row) => row.amount)
  );
  const cashOut = -sumCents(
    ledgerRows.filter((row) => row.amount < 0).map((row) => row.amount)
  );
  const opening = toCents(controlTotals.openingBalance);
  return {
    cashIn: cashIn / 100,
    cashOut: cashOut / 100,
    bookBalance: (opening + cashIn - cashOut) / 100,
  };
}
