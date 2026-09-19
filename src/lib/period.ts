/* Periods, closing them, and what an open item does afterwards.
 *
 * The change that turns this product from "compare two files" into a running
 * record per bank account. An item that has not cleared does not belong to the
 * month that first had to report it — it belongs to the ACCOUNT, and every
 * close from then on inherits it, ages it, and hands it forward again.
 *
 * ---------------------------------------------------------------------------
 * One clock
 *
 * There were two, three months apart. The Close screen measured from 6 June and
 * said "May closes in 4 days"; the Accounts screen measured from 31 August so
 * that cheque 1042 would read the 99 days the spec's example prints. Both were
 * defensible on their own and together they were nonsense: a May period still
 * open at the end of August is a close three months late, which is a different
 * story from the one either screen was telling.
 *
 * NOW is 6 June 2026. May has just ended, its reconciliations are being worked,
 * and the period locks on the 10th. Every age in the product is measured from
 * this or from a period end, and nothing measures from `new Date()`, so a
 * screenshot taken next week says what it said today.
 *
 * ---------------------------------------------------------------------------
 * What that costs, and why it is worth paying
 *
 * At 6 June the fixture's four open items are between 8 and 23 days old and not
 * one of them is stale. The staleness case does not disappear; it moves from an
 * assertion to a projection, which is the more useful form of it anyway. A
 * cheque that will be stale at the August close if nobody acts is a reason to
 * ring the payee NOW. A cheque that is already stale is a reason to feel bad.
 *
 * Spec: docs/FLOWS.md F6, docs/TAXONOMY_AND_IA.md Part 3 joint 1,
 * docs/RECONCILER_PLAYBOOK.md Part 8 prompt 5.
 */

import { ageInDays, STALE_AFTER_DAYS } from "@/components/entities/OpenItemRow";

/* The demo's now. Fixed, so the ages are reproducible when somebody checks
 * them against the fixture. */
export const NOW = "2026-06-06";

export interface PeriodRef {
  id: string;
  label: string;
  /* ISO date of the last day. Every age at a close is measured from here, so
   * re-opening May in September still reports what it reported in June. */
  endsOn: string;
  closed: boolean;
}

/* The calendar the demo runs on. May is the open one; everything before it is
 * locked, and everything after is the future a carried item travels into. */
export const PERIODS: PeriodRef[] = [
  { id: "period-2026-01", label: "January 2026", endsOn: "2026-01-31", closed: true },
  { id: "period-2026-02", label: "February 2026", endsOn: "2026-02-28", closed: true },
  { id: "period-2026-03", label: "March 2026", endsOn: "2026-03-31", closed: true },
  { id: "period-2026-04", label: "April 2026", endsOn: "2026-04-30", closed: true },
  { id: "period-2026-05", label: "May 2026", endsOn: "2026-05-31", closed: false },
  { id: "period-2026-06", label: "June 2026", endsOn: "2026-06-30", closed: false },
  { id: "period-2026-07", label: "July 2026", endsOn: "2026-07-31", closed: false },
  { id: "period-2026-08", label: "August 2026", endsOn: "2026-08-31", closed: false },
];

export const OPEN_PERIOD_ID = "period-2026-05";

export function periodById(id: string): PeriodRef | undefined {
  return PERIODS.find((p) => p.id === id);
}

export function nextPeriod(id: string): PeriodRef | undefined {
  const i = PERIODS.findIndex((p) => p.id === id);
  return i === -1 ? undefined : PERIODS[i + 1];
}

export function daysUntilClose(closesOn = "2026-06-10"): number {
  return Math.max(0, ageInDays(NOW, closesOn));
}

/* ---------- The life of an open item ---------- */

/* What one close did, or will do, to one item.
 *
 * `inherited` is the field the whole design turns on. False at the first close
 * that had to report the item, true at every close after — which is the
 * difference between a month that produced a problem and a month that received
 * one, and the reason a reconciliation takes three inputs rather than two. */
export interface CarryStep {
  period: PeriodRef;
  ageAtClose: number;
  inherited: boolean;
  stale: boolean;
  /* Whether this close has happened. A projection is a different kind of
   * statement from a record and must never be printed as one. */
  projected: boolean;
}

/* Every close this item has been through, and the ones ahead of it if nobody
 * acts. Computed from the date it was written and the period ends — nothing is
 * stored, because a stored age is a number that was right once. */
export function carryForward(
  writtenOn: string,
  horizon = 4
): CarryStep[] {
  /* The first close that had to report it is the first period ending on or
   * after the day it was written. */
  const firstIndex = PERIODS.findIndex((p) => p.endsOn >= writtenOn);
  if (firstIndex === -1) return [];

  const openIndex = PERIODS.findIndex((p) => p.id === OPEN_PERIOD_ID);

  return PERIODS.slice(firstIndex, firstIndex + horizon).map((period, i) => {
    const ageAtClose = ageInDays(writtenOn, period.endsOn);
    return {
      period,
      ageAtClose,
      inherited: i > 0,
      stale: ageAtClose > STALE_AFTER_DAYS,
      /* Anything past the open period has not happened. The May close itself
       * has not happened either — the period locks on the 10th — but it is the
       * close being worked on, so its figures are the ones on screen and are
       * treated as current rather than projected. */
      projected: PERIODS.indexOf(period) > openIndex,
    };
  });
}

/* The close at which an item goes stale, if it has not cleared by then. The
 * sentence a person acts on: a cheque that WILL be a problem in August is a
 * reason to ring the payee today. */
export function goesStaleAt(writtenOn: string): PeriodRef | null {
  return (
    PERIODS.find((p) => ageInDays(writtenOn, p.endsOn) > STALE_AFTER_DAYS) ??
    null
  );
}

/* ---------- Closing a period ---------- */

export interface CloseReadiness {
  allowed: boolean;
  /* Why not, in one line, when it is not. */
  because?: string;
  packagesComplete: number;
  packagesTotal: number;
}

/* A period locks when every close package in it is complete, and a close
 * package completes when all of its accounts are posted. Not a percentage and
 * not a judgement: two counts and whether they are equal.
 *
 * This is the guard the playbook asks for in code rather than in a prompt. A
 * correction found after the lock goes into the NEXT period; it does not
 * reopen this one. */
export function closeReadiness(
  packagesComplete: number,
  packagesTotal: number
): CloseReadiness {
  const outstanding = packagesTotal - packagesComplete;
  return outstanding === 0
    ? { allowed: true, packagesComplete, packagesTotal }
    : {
        allowed: false,
        because: `${outstanding} of ${packagesTotal} properties still have an account that is not posted`,
        packagesComplete,
        packagesTotal,
      };
}

/* What closing would do to the items still open. Shown BEFORE the act, for the
 * same reason a rule is previewed before it is approved: an irreversible step
 * whose consequence is only visible afterwards is a step nobody can consent
 * to. */
export interface CarryPreview {
  items: { description: string; amount: number; ageNow: number; ageNext: number }[];
  total: number;
  intoPeriod: string;
}
