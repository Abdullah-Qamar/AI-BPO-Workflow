"use client";

/* A working surface for the balance proof, fixture-backed.
 *
 * Deliberately its own route rather than a card dropped onto the existing
 * session canvas. That canvas is driven by `lib/seed.ts` — a synthetic
 * portfolio of 204 records across four accounts — and this proof is computed
 * from the ONE real month in `fixtures/`: 14 bank lines and 16 ledger rows for
 * the Chase operating account. Rendering a proof of thirty rows under a header
 * claiming 204 would make the panel's "calculated, not estimated" line false in
 * the first place a reader checked it.
 *
 * The two data sets meet properly when the review surface is rebuilt on the
 * match contract. Until then this route is where the proof is honest.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BalanceProof } from "@/components/reconciliation/BalanceProof";
import { Button } from "@/components/ui/Button";
import type { Match } from "@/lib/reconciliation/match";
import { buildProof } from "@/lib/reconciliation/proof";
import {
  ACCOUNT_LABEL,
  ACCOUNT_NUMBER,
  CYCLE,
  westlakeMatches,
} from "@/lib/reconciliation/westlakeMatches";
import {
  controlTotals,
  ledgerRows,
  ledgerTotals,
} from "@/lib/fixtures/westlakeOperating";

/* The same month after both decisions have been taken.
 *
 * Hand-derived rather than produced by the resolution actions, which do not
 * exist yet — they are the next piece of work. It is here because a proof panel
 * whose zero state has never been looked at is a panel that is half designed,
 * and because the two transitions are worth writing down before anything is
 * built on top of them:
 *
 *   The returned payment takes a correcting entry of -1,275.00. It stays a
 *   `needs-adjustment` match, because that is what it is, and starts feeding
 *   the BOOK side only because a person decided it should.
 *
 *   The ambiguous refund is not resolved in place. Choosing a candidate turns
 *   it into a plain `matched` pair, and the ledger row that LOST becomes a
 *   `timing` item of its own — an outstanding refund that has not cleared. That
 *   is the shape the real action has to produce: one decision, two matches.
 *
 * And the lesson the fixture was built to carry: the proof reaches 0.00 either
 * way. Pick the wrong refund and it still ties, and the wrong tenant is repaid.
 */
/* The three statement items the books never recorded, and the entry each one
 * needs. Amounts are read off the bank line rather than restated here, so a
 * change to the fixture cannot leave a stale figure behind.
 *
 * These used to require nothing: the proof applied them the moment the matcher
 * classified them. They now wait for a person, so the resolved month has to
 * carry their authorisations like any other decision. */
const BOOKED: Record<string, string> = {
  "m-stripe-payout-0512":
    "Card settlement reached the bank on 12 May. Booking it to rental income for the period.",
  "m-interest-0531":
    "Interest credited by the bank. Booking it to interest income.",
  "m-service-fee-0529":
    "Account analysis fee. Booking it to bank charges.",
};

function resolvedMonth(): Match[] {
  const chosen = "gl-v20901";
  const loser = "gl-v20907";

  return westlakeMatches
    .map((m): Match => {
      if (BOOKED[m.id]) {
        return {
          ...m,
          resolution: {
            kind: "add-correcting-entry",
            /* The statement line's own figure. A reviewer booking a fee at a
             * different amount is a real case the contract allows for, and it
             * is not this one. */
            amount: m.bankLines[0].amount,
            reason: BOOKED[m.id],
            by: "N. Okafor",
            at: "2026-06-02T09:38:00Z",
          },
        };
      }

      if (m.id === "m-returned-payment-308") {
        return {
          ...m,
          resolution: {
            kind: "add-correcting-entry",
            amount: -1275,
            reason:
              "Rent for unit 308 was reversed. The books still record it as received, so the ledger needs the entry.",
            by: "N. Okafor",
            at: "2026-06-02T09:41:00Z",
          },
        };
      }

      if (m.id === "m-refund-4912-ambiguous") {
        return {
          ...m,
          outcome: "matched",
          /* Narrowed from both candidate rows to the chosen one. The loser is
           * handed to a timing match below, which is the shape the real action
           * has to produce: one decision, two matches. */
          ledgerRows: [ledgerRowById(chosen)],
          rule: m.candidates[0].rule,
          resolution: {
            kind: "correct-the-match",
            selectedCandidateId: "cand-refund-4912",
            reason:
              "The memo names invoice 4912, which is Tenant 115's. Tenant 119's refund on 4913 has not cleared.",
            by: "N. Okafor",
            at: "2026-06-02T09:44:00Z",
          },
        };
      }

      return m;
    })
    .concat([
      {
        id: "m-refund-4913-outstanding",
        accountId: westlakeMatches[0].accountId,
        cycle: westlakeMatches[0].cycle,
        outcome: "timing",
        bankLines: [],
        ledgerRows: [ledgerRowById(loser)],
        rule: null,
        candidates: [],
        pattern: null,
        resolution: null,
        reason: "Refund on invoice 4913 issued, not yet presented",
        ageDays: 15,
      },
    ]);
}

/* The loser's row, read back off the fixture rather than restated. */
function ledgerRowById(id: string) {
  const row = ledgerRows.find((r) => r.id === id);
  if (!row) throw new Error(`No ledger row ${id}`);
  return {
    id: row.id,
    date: row.postDate,
    amount: row.amount,
    description: `${row.payee} · ${row.description}`,
    reference: row.controlNo,
  };
}

export default function ProofPage() {
  const [resolved, setResolved] = useState(false);

  const proof = buildProof({
    matches: resolved ? resolvedMonth() : westlakeMatches,
    statementClosing: controlTotals.closingBalance,
    ledgerClosing: ledgerTotals().bookBalance,
    periodEndLabel: "May 31",
  });

  return (
    <div
      className="canvas-scope"
      style={{ minHeight: "100dvh", background: "var(--bg-grad)" }}
    >
      <div
        className="canvas-pad"
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
      >
        <div
          className="flex flex-col"
          style={{ gap: "var(--space-7)", paddingTop: "var(--space-6)" }}
        >
          {/* The left rail lives inside app/page.tsx, so it exists at "/" and
           * nowhere else. This route had no way back at all, which made it a
           * dead end — the one defect the flows document says this product has
           * characteristically. The design system page solves it the same way,
           * with a ghost pill and ArrowLeft at 14/1.75, so this matches it
           * rather than inventing a second treatment. */}
          <Link
            href="/"
            className="inline-flex items-center t-body ink-primary self-start"
            style={{
              height: "var(--control-md)",
              padding: "0 12px",
              gap: 6,
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            <ArrowLeft
              size="var(--icon-sm)"
              strokeWidth="var(--stroke-sm)"
            />
            Back to Reconciliation
          </Link>

          <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            <h1 className="canvas-title ink-primary">
              1849 Westlake Ave N, Seattle, WA 98109
            </h1>
            <span className="t-meta ink-tertiary">
              TH-1247 · Chase Operating · May 2026
            </span>
          </div>

          {/* A design-review control, not product chrome: it swaps between the
           * month as the matcher left it and the month after both decisions,
           * so the panel's two states can be compared side by side. It goes
           * when the resolution actions land and the transition is real. */}
          <div className="flex flex-row" style={{ gap: "var(--space-4)" }}>
            <Button
              variant={resolved ? "secondary" : "primary"}
              size="sm"
              onClick={() => setResolved(false)}
            >
              First pass
            </Button>
            <Button
              variant={resolved ? "primary" : "secondary"}
              size="sm"
              onClick={() => setResolved(true)}
            >
              After both decisions
            </Button>
          </div>

          <BalanceProof
            proof={proof}
            accountLabel={ACCOUNT_LABEL}
            accountNumber={ACCOUNT_NUMBER}
            cycle={CYCLE}
            onReview={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
