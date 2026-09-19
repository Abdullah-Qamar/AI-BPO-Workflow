/* The standing world: one bank account as an ongoing thing.
 *
 * This module has NO MONTH in it, and that is the point. A reconciliation is
 * one account for one period; an account outlives every period it appears in,
 * and the things waiting to clear on it belong to the account rather than to
 * whichever close first had to report them.
 *
 * That is the single most important storage decision in the product. Cheque
 * 1042 — Delta HVAC Services, 3,200.00, written 24 May — is not May's problem.
 * It sits on the account, ageing, until it clears or somebody writes it back.
 * Each reconciliation INHERITS it, ages it at that close, and hands it forward
 * again if it is still open.
 *
 * ---------------------------------------------------------------------------
 * Age is worked out here too, and from a different date
 *
 * On a reconciliation an item's age is measured from the PERIOD END, so
 * re-opening May in September still reports seven days. On this screen it is
 * measured from TODAY, because the question is how long the cheque has actually
 * been sitting and nobody cares what it looked like in May. Both are correct
 * and they disagree on purpose; `OpenItemRow` takes the date to read at rather
 * than deciding.
 *
 * Spec: docs/UX_SPECS.md section 3, docs/TAXONOMY_AND_IA.md Part 3 joint 1.
 */

import {
  properties,
  type PropertyBankMapping,
  type PropertyRecord,
} from "@/lib/seed";
import { bankLines, ledgerRows } from "@/lib/fixtures/westlakeOperating";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { ageInDays } from "@/components/entities/OpenItemRow";

/* The one clock, from lib/period.ts.
 *
 * This used to be 31 August, chosen so cheque 1042 would read the 99 days the
 * spec's example prints, while the Close screen measured from 6 June and said
 * "May closes in 4 days". Two clocks three months apart, and together they told
 * a story neither screen meant: a May period still open at the end of August is
 * a close a quarter late.
 *
 * At 6 June the four items are 8 to 23 days old and none is stale. The
 * staleness case moves from an assertion to a projection, which is the more
 * useful form: a cheque that WILL be stale in August is a reason to ring the
 * payee today. */
import { NOW } from "@/lib/period";
export const TODAY = NOW;

export const WESTLAKE_OPERATING_ID = "bm-chase-operating-3421";

/* ---------- What the account is ---------- */

export interface AccountIdentity {
  id: string;
  property: PropertyRecord;
  account: PropertyBankMapping;
  /* What the account is used for, in a sentence. */
  purpose: string;
  /* True for a tenant deposit account. Stated as a plain fact and never as a
   * warning, because nothing is wrong: the law requires that money to be held
   * separately, so the product leaves it alone deliberately. */
  segregated: boolean;
}

const PURPOSE: Record<string, string> = {
  Operating: "Day-to-day cash. Rent in, vendors and payroll out.",
  "Security Deposit":
    "Tenants' deposits, held separately as the law requires.",
  Reserve: "Set aside for capital items. Usually required by the lender.",
  Escrow: "Property taxes and insurance, often controlled by the servicer.",
};

export function accountIdentities(): AccountIdentity[] {
  return properties.flatMap((property) =>
    property.banks.map((account) => ({
      id: account.id,
      property,
      account,
      purpose:
        PURPOSE[account.type] ??
        "A bank account belonging to this property.",
      segregated: account.type === "Security Deposit",
    }))
  );
}

/* ---------- What is waiting to clear ---------- */

export interface WaitingItem {
  id: string;
  description: string;
  reference?: string;
  amount: number;
  /* ISO date the cheque was written or the deposit banked. */
  writtenOn: string;
  /* Which close first had to report it. An item can appear in several, and the
   * earliest is the one worth naming. */
  firstSeenIn: string;
}

/* The Westlake operating account's real four.
 *
 * Read off the fixture through the matches rather than restated, so the four
 * items here and the 18,450.50 on the proof cannot drift apart. Three cheques
 * plus whichever 210.00 refund the reviewer did not pick — and since nobody has
 * picked yet, the older of the two is shown, which is the same conservative
 * choice the proof's "oldest" figure makes. */
function westlakeWaiting(): WaitingItem[] {
  /* Outstanding payments only, which is why the sign is tested.
   *
   * A deposit in transit is a timing item too — the fixture's 9,315.00 banked
   * on 31 May is one — but it lands on the statement within days. By any date
   * this screen is read at it has long cleared, and listing it as still waiting
   * three months later would be the screen reporting something it knows is no
   * longer true. What survives months on an account is a payment nobody
   * presented. */
  const fromTiming: WaitingItem[] = westlakeMatches
    .filter(
      (m) =>
        m.outcome === "timing" &&
        m.ledgerRows.length > 0 &&
        m.ledgerRows[0].amount < 0
    )
    .map((m) => {
      const row = m.ledgerRows[0];
      return {
        id: row.id,
        description: row.description,
        reference: row.reference,
        amount: row.amount,
        writtenOn: row.date,
        firstSeenIn: "May 2026",
      };
    });

  /* The refund nobody chose. It is one of two identical rows and the decision
   * is still open, so the account shows the older one: on a staleness list the
   * safe direction to be wrong is towards looking older, because overstating
   * age invites a second look and understating it suppresses one. */
  const ambiguous = westlakeMatches.find((m) => m.candidates.length > 1);
  const unpicked = ambiguous?.ledgerRows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (unpicked) {
    fromTiming.push({
      id: unpicked.id,
      description: unpicked.description,
      reference: unpicked.reference,
      amount: unpicked.amount,
      writtenOn: unpicked.date,
      firstSeenIn: "May 2026",
    });
  }

  /* Four items, and nothing invented to pad them.
   *
   * An earlier pass added a February cheque so the screen would have something
   * dramatically stale on it. It came straight back out: the spec's own worked
   * example is explicit that this list has FOUR items, three cheques and a
   * refund nobody picked, and inventing a fifth to make a point is exactly the
   * habit that put 116,763.50 on a reserve account earlier in this rebuild.
   * Read at 31 August, three of the four are already past ninety days, so the
   * staleness case makes itself.
   *
   * Worth knowing: the spec's prose says the oldest item is cheque 1042 at 99
   * days, and that is not what the data says. The unpicked refund is dated 14
   * May, ten days before the cheque, so it is 109 days old and it is the oldest
   * thing on the account. The figure at the top of the screen is computed, so
   * it reports 109 and the prose is the thing that is wrong. */
  return fromTiming.sort((a, b) => a.writtenOn.localeCompare(b.writtenOn));
}

export function waitingItems(accountId: string): WaitingItem[] {
  if (accountId === WESTLAKE_OPERATING_ID) return westlakeWaiting();
  /* Every other account is illustrative and carries none. An invented cheque on
   * an invented account teaches a reader nothing and would put twenty-one more
   * unverifiable figures on a screen whose one number is an age. */
  return [];
}

/* The one number on the screen. Null when nothing is waiting, which is a real
 * state and not a zero: an account with nothing outstanding has no oldest item,
 * and "0 days" would claim otherwise. */
export function oldestWaitingDays(accountId: string): number | null {
  const items = waitingItems(accountId);
  if (!items.length) return null;
  return Math.max(...items.map((i) => ageInDays(i.writtenOn, TODAY)));
}

/* ---------- What this bank's codes mean ---------- */

/* The per-bank code dictionary, which the playbook names as a missing design
 * object and nothing in the product owned.
 *
 * BAI2 type codes are not fully standard. The bands are — 100 to 399 credits,
 * 400 to 699 debits — but banks publish proprietary codes, especially in the
 * 900s, so "code 555 means a returned deposit" is a mapping that belongs to a
 * bank and not to the format. It is administrator-owned, versioned, and
 * recorded against each run, because a run that read 555 as a return in June
 * must stay explicable after the mapping changes in October.
 *
 * Built from the fixture's own lines rather than a constant, so the dictionary
 * and the statement it describes cannot disagree. */
export interface CodeEntry {
  code: number;
  meaning: string;
  band: "credit" | "debit";
  seen: number;
}

export const CODE_DICTIONARY_VERSION = "chase-bai2 v3 · 12 Mar 2026";

export function codeDictionary(accountId: string): CodeEntry[] {
  if (accountId !== WESTLAKE_OPERATING_ID) return [];
  const byCode = new Map<number, CodeEntry>();
  for (const line of bankLines) {
    const existing = byCode.get(line.typeCode);
    if (existing) {
      existing.seen += 1;
      continue;
    }
    byCode.set(line.typeCode, {
      code: line.typeCode,
      meaning: line.typeMeaning,
      band: line.typeCode >= 100 && line.typeCode <= 399 ? "credit" : "debit",
      seen: 1,
    });
  }
  return [...byCode.values()].sort((a, b) => a.code - b.code);
}

/* ---------- One line per month ---------- */

export interface MonthLine {
  id: string;
  period: string;
  proven: boolean;
  /* When it was proven, or what is holding it up. */
  note: string;
}

export function monthHistory(identity: AccountIdentity): MonthLine[] {
  const sessions = identity.property.sessions.slice(0, 6);
  return sessions.map((s, i) => {
    /* The open period is the one the reconciliation screens are working on, and
     * it is not proven until that work is done. Earlier ones are history. */
    const isOpen = i === 0;
    return {
      /* The session id, not the cycle. A cycle can appear twice: a
       * reconciliation may be attempted more than once — against a partial
       * statement mid-month, then again when the final one lands — and only the
       * last is signed. The seed already prints "May 2026 · Re-run", and keying
       * on the cycle collapsed the two into one row that React then complained
       * about. */
      id: s.id,
      period: s.pass ? `${s.cycle} · ${s.pass}` : s.cycle,
      proven: !isOpen && s.statusKey === "completed",
      note: isOpen
        ? "open · being worked on now"
        : s.statusKey === "completed"
          ? `proven ${s.finishedOn}`
          : s.statusKey === "failed"
            ? "a read failed · never proven"
            : "not proven",
    };
  });
}

/* ---------- Rules scoped to this account ---------- */

export interface AccountRule {
  condition: string;
  scope: "global" | "property" | "account";
  scopeLabel?: string;
  owner: string;
  expires: string;
  timesFired: number;
  timesOverridden: number;
}

export function rulesFor(identity: AccountIdentity): AccountRule[] {
  const base: AccountRule[] = [
    {
      condition: "A deposit matching three or more rent rows that sum to it",
      scope: "global",
      owner: "Product",
      expires: "2027-01-31",
      timesFired: 1842,
      timesOverridden: 11,
    },
    {
      condition: "Cheque number and amount agree with the voucher",
      scope: "global",
      owner: "Product",
      expires: "2027-01-31",
      timesFired: 4103,
      timesOverridden: 6,
    },
    {
      condition: "Never post into a closed period",
      scope: "global",
      owner: "Engineering",
      expires: "2030-01-01",
      timesFired: 3,
      timesOverridden: 0,
    },
  ];

  if (identity.id === WESTLAKE_OPERATING_ID) {
    base.unshift({
      condition:
        "Refunds issued within three days of the bank debit, matched to the cent",
      scope: "account",
      scopeLabel: `${identity.property.shortAddress} · Operating`,
      owner: "N. Okafor",
      expires: "2026-09-30",
      timesFired: 64,
      timesOverridden: 9,
    });
  }

  return base;
}

/* Every ledger row the fixture holds, for the count in the account header. A
 * fact about the account's activity rather than about any one month. */
export function fixtureActivity(accountId: string): {
  bankLines: number;
  ledgerRows: number;
} | null {
  if (accountId !== WESTLAKE_OPERATING_ID) return null;
  return { bankLines: bankLines.length, ledgerRows: ledgerRows.length };
}
