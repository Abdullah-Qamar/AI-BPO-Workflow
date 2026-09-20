"use client";

/* Close — the month's work.
 *
 * Replaces DashboardCanvas, which was a metrics wall. The real job is twelve
 * properties a month, and the single-run theatre cannot be the home screen.
 *
 * ---------------------------------------------------------------------------
 * What was removed, and why each one had to go
 *
 * Tokens used, 1.24M. An accountant cannot act on a token and the figure is
 * mildly alarming. Cost belongs on Quality, in dollars per reconciliation,
 * which is the unit a buyer compares against a salary.
 *
 * First-pass accuracy, 90%. A school report about the machine, and one of four
 * names this codebase used for two numbers.
 *
 * The Matched column, 196. Nobody acts on 196.
 *
 * The Updated column, "4h ago". What matters is how long something has been
 * WAITING, which is a different measurement and the one the rows now carry.
 *
 * The Ledgers fraction, 3 / 4. That is not a measurement, it is a state: the
 * account is waiting for a file. It belongs in the stuck list with a button
 * beside it, and that is where it now is.
 *
 * New session. You do not create the work, the calendar does. When a period
 * opens, every account due gets a reconciliation. What replaces it is "Open
 * June", and only when the next period is not open yet.
 *
 * ---------------------------------------------------------------------------
 * The order of the sections is the argument
 *
 * Stuck first and never collapsible, because it is the only thing on this
 * screen that cannot move without a person. Then decisions, sorted by money
 * rather than by property or by time, because money is what makes attention
 * worth spending. Then signatures, kept separate on purpose: signing is a
 * different act from deciding, it takes fifteen seconds and needs no thinking,
 * and mixing it into the queue above hides the quick wins.
 *
 * Spec: docs/BUILD_PROMPTS.md S4, docs/UX_SPECS.md section 1.
 */

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountRow } from "@/components/entities/AccountRow";
import { StuckRow } from "@/components/entities/StuckRow";
import { PropertyRollup } from "@/components/entities/PropertyRollup";
import { stateWords } from "@/components/entities/AccountRow";
import {
  accountRows,
  clearBlock,
  daysUntilClose,
  getClearedBlocks,
  provenCount,
  stuckDocuments,
  subscribeBlocks,
  totalUnexplained,
  OPEN_PERIOD,
  type AccountRow as Row,
} from "@/lib/close";
import { money } from "@/lib/money";
import { SpotCheckCanvas } from "@/components/SpotCheckCanvas";
import { getFindings, queuedSince, sampleQueue, subscribe } from "@/lib/sampling";
import { ageInDays } from "@/components/entities/OpenItemRow";
import { NOW } from "@/lib/period";
import { ConfirmPopoverButton } from "@/components/ui/ConfirmPopoverButton";
import { closeReadiness, nextPeriod, OPEN_PERIOD_ID } from "@/lib/period";
import { atRiskOfMissingClose } from "@/lib/close";
import { waitingItems, WESTLAKE_OPERATING_ID } from "@/lib/accounts";
import { sumDollars } from "@/lib/money";
import { toCents } from "@/lib/money";

/* ---------- Section furniture ---------- */

function SectionHead({
  title,
  count,
  total,
  note,
}: {
  title: string;
  count?: number;
  /* A money figure that belongs to THIS list, printed on its heading.
   *
   * The portfolio's unexplained total used to sit in the page header beside
   * the proven count, where it was the second big figure and nobody could act
   * on it: you do not fix a portfolio, you fix an account. On the heading of
   * the nine rows it is the sum of, it is the size of the queue underneath
   * it. */
  total?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <div
        className="flex flex-row items-baseline"
        style={{ gap: "var(--space-4)" }}
      >
        <span className="t-title ink-primary">{title}</span>
        {count !== undefined && (
          <span className="t-body nums ink-tertiary">{count}</span>
        )}
        {total && (
          <span className="t-body ink-secondary">
            <span className="nums">{total}</span> unexplained
          </span>
        )}
      </div>
      {note && <span className="t-meta ink-tertiary">{note}</span>}
    </div>
  );
}

/* The column header for the money. One label, on the one column that needs it.
 *
 * A figure like 8,476.16 at the end of a row is unreadable to somebody seeing
 * this screen for the first time: it could be the account's balance, what the
 * run matched, or the gap. Naming the column is the whole fix.
 *
 * Labels only, no leading glyph — a glyph here would be the loudest thing in
 * the quietest band and would cost the column width the figures want.
 * Spec: docs/design-system/decisions.md §3. */
function MoneyColumnHead({ label }: { label: string }) {
  return (
    <div
      className="flex flex-row items-baseline"
      style={{
        padding: "var(--space-2) var(--space-5)",
        gap: "var(--space-6)",
      }}
    >
      <span className="flex-1" />
      <span className="t-label" style={{ flexShrink: 0 }}>
        {label}
      </span>
    </div>
  );
}

/* Measured off the reference rather than guessed, so the marks keep its
 * proportions at our scale. Pitch 8 = a 3px mark and a 5px gap.
 *
 *   gap : mark          1.67   (reference 1.68)
 *   mark : pitch        0.375  (reference 0.379)
 *   height : mark       8.0    (reference 8.06)
 *   unproven : proven   0.875  (reference 0.858)
 *
 * The last one is the ratio that was wrong first time. A short unproven mark
 * reads as an empty slot waiting to be filled, which is a progress bar; a mark
 * nearly as tall as its neighbour reads as an account that exists and has not
 * been proven yet, which is what it is. The reference is centred, not sitting
 * on a baseline, and that is why: neither end of the pair is the floor. */
const MARK_W = 3;
const MARK_GAP = 5;
const MARK_H = 24;
const MARK_H_UNPROVEN = 21;

/* ProvenMeter — the month's progress as one tick per account.
 *
 * ONE TICK PER ACCOUNT, not a percentage of a bar. The headline above it says
 * why: it is "deliberately a COUNT rather than a percentage", because "64%"
 * invites the question "of what" and eight accounts short of a close is the
 * thing a person acts on. A meter that rendered that same count as a filled
 * proportion would reintroduce the percentage as a picture, so it does not —
 * there are twenty-two marks here and you can count them.
 *
 * That is also why the numbers sit at BOTH ends. A bar closed at one end is a
 * progress bar and invites reading the gap as "nearly there"; closed at both,
 * it states two counts that add up to the portfolio, and the one on the right
 * is the one with work in it.
 *
 * The filled marks take --status-ok because proven IS the completed state and
 * that is what the token means. Deliberately NOT the reference's orange: amber
 * in this app is --status-warn, which means waiting on a person, and tinting
 * the proven accounts with it would say the opposite of what they are.
 *
 * Spec: docs/design-system/decisions.md §4. */
function ProvenMeter({ proven, due }: { proven: number; due: number }) {
  /* The strip is exactly as wide as its marks need. */
  const width = due * MARK_W + (due - 1) * MARK_GAP;

  return (
    /* Just the marks. The "10 proven / 12 still to prove" counts that used to
      * sit beneath the strip are gone: they restated the headline's own "10 of
      * 22" one line below it, and a picture of a count does not also need the
      * count spelled out under it. The strip now sits directly beneath the
      * figure it visualises, so the number and its picture read as one thing.
      *
      * Narrow marks with air between them, and the strip only as wide as
      * twenty-two of them need. Stretched across the canvas the same marks
      * become fat blocks and the thing stops reading as a tally of accounts and
      * starts reading as a progress bar, which is the percentage coming back in
      * through the side door.
      *
      * Decorative, so it is hidden: every figure it encodes is in the headline
      * above it, and a screen reader announcing twenty-two marks would be
      * reading that count twice. */
    <div
      className="flex flex-row items-center"
      style={{ height: MARK_H, gap: MARK_GAP, width }}
      aria-hidden
    >
      {Array.from({ length: due }, (_, i) => (
        <span
          key={i}
          style={{
            width: MARK_W,
            /* The unproven marks are a little shorter as well as paler. Colour
             * alone would carry this for most readers and not for one with a
             * red or green deficiency. */
            height: i < proven ? MARK_H : MARK_H_UNPROVEN,
            borderRadius: 1,
            background: i < proven ? "var(--status-ok)" : "var(--line-soft)",
          }}
        />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-5)",
        gap: "var(--space-2)",
      }}
    >
      {children}
    </div>
  );
}

/* A section that starts folded. Used only for the two that are genuinely
 * secondary — some people think in buildings, and closed work is reference. */
function Folded({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col" style={{ gap: "var(--space-5)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex flex-row items-center self-start"
        style={{
          gap: "var(--space-3)",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          color: "var(--ink-tertiary)",
        }}
      >
        {open ? (
          <ChevronDown size="var(--icon-md)" strokeWidth="var(--stroke-md)" />
        ) : (
          <ChevronRight size="var(--icon-md)" strokeWidth="var(--stroke-md)" />
        )}
        <SectionHead title={title} count={count} note={note} />
      </button>
      {open && children}
    </section>
  );
}

/* ---------- The screen ---------- */

export function CloseCanvas({
  onOpenAccount,
}: {
  onOpenAccount?: (reconciliationId: string) => void;
}) {
  /* Spot checks live on Close rather than in the rail. Sampling is part of
   * the month's work, and a sixth destination for it would make it a place you
   * visit rather than a thing you do — which is how a queue that can always be
   * postponed becomes a queue that never happens. */
  const [checking, setChecking] = useState(false);
  /* Set when a person locks the period. Closing is irreversible by design, so
   * there is no setter back to false — the screen moves to the locked notice and
   * stays there. The prototype does not roll the board on to June; an honest
   * acknowledgement of what the lock did beats faking a month we have no data
   * for. */
  const [locked, setLocked] = useState(false);
  const findings = useSyncExternalStore(subscribe, getFindings, getFindings);

  /* Clearing a block changes the board, not just the Stuck list: the account
   * leaves the rail's count and the proven tally re-reads. Subscribing here
   * rather than holding the cleared ids in component state is what keeps those
   * three numbers one number. */
  useSyncExternalStore(subscribeBlocks, getClearedBlocks, getClearedBlocks);

  const rows = accountRows();
  const { proven, due } = provenCount();
  const stuck = stuckDocuments();
  const days = daysUntilClose();

  /* Sorted by unexplained money, descending. Not by property, not by time.
   * A person working a queue should spend their attention where the most of it
   * is at stake, and the sort is what makes that happen without them choosing
   * it every morning. */
  const decisions = rows
    .filter((r) => r.reconciliation.state === "review")
    .sort(
      (a, b) =>
        Math.abs(toCents(b.reconciliation.unexplained)) -
        Math.abs(toCents(a.reconciliation.unexplained))
    );

  /* Accounts with no documents yet. `reading` and `matching` are deliberately
   * NOT here: the machine has those and a person cannot help, which is the
   * whole reason the run starts on its own. `draft` is the one state where the
   * work cannot begin without somebody fetching something. */
  const waitingForFiles = rows.filter(
    (r) => r.reconciliation.state === "draft"
  );

  /* Proven but not yet signed or sent. Separated from the queue above on
   * purpose: this is authorising, not deciding, and it is the cheapest work on
   * the screen. */
  const signatures = rows.filter((r) => r.reconciliation.state === "proven");

  const closedRecently = rows.filter((r) =>
    ["posted", "signed"].includes(r.reconciliation.state)
  );

  /* A close package completes when every one of its accounts is posted, and the
   * PERIOD locks when every package is complete. Two counts and whether they
   * are equal — not a percentage, and not a judgement anybody makes.
   *
   * Counted in accounts, which is the same condition stated in the unit this
   * screen is already using. The package grouping this used to build served
   * only to produce a sentence in a second denominator; see closeReadiness. */
  const postedAccounts = rows.filter((r) =>
    ["posted", "signed", "closed"].includes(r.reconciliation.state)
  ).length;
  const readiness = closeReadiness(postedAccounts, rows.length);
  const carrying = waitingItems(WESTLAKE_OPERATING_ID);
  /* Accounts that have been waiting longer than the days left before the lock.
   * Ageing rather than escalating: escalation needs somebody to escalate to,
   * and this product has one person in it. */
  const atRisk = atRiskOfMissingClose(days);
  /* The same set, as ids, so the rows can mark themselves. Derived from the
   * one function rather than recomputed per row: the headline's count and the
   * marked rows have to be the same accounts or the screen contradicts
   * itself. */
  const atRiskIds = new Set(atRisk.map((r) => r.reconciliation.id));
  const into = nextPeriod(OPEN_PERIOD_ID);

  const byProperty = Array.from(
    rows.reduce((map, r) => {
      const list = map.get(r.property.id) ?? [];
      list.push(r);
      map.set(r.property.id, list);
      return map;
    }, new Map<string, Row[]>())
  );

  const everythingProven = proven === due;

  const queue = sampleQueue();
  const done = findings.length;
  const problems = findings.filter((f) => f.verdict === "problem").length;

  const renderRow = (r: Row) => (
    <AccountRow
      key={r.reconciliation.id}
      propertyLabel={r.property.shortAddress}
      accountLabel={r.account.type}
      accountNumber={r.account.account}
      state={r.reconciliation.state}
      unexplained={r.reconciliation.unexplained}
      itemsWaiting={r.reconciliation.itemsWaiting}
      oldestOpenItemDays={r.reconciliation.oldestOpenItemDays}
      atRisk={atRiskIds.has(r.reconciliation.id)}
      illustrative={r.illustrative}
      onOpen={onOpenAccount ? () => onOpenAccount(r.reconciliation.id) : undefined}
    />
  );

  if (checking) {
    return <SpotCheckCanvas onBack={() => setChecking(false)} />;
  }

  /* Once locked, the screen is not the month's work any more — it is the record
   * that the month is shut. No countdown (there is nothing left to race), no
   * sections (nothing on them can move), and no button back (the lock is
   * irreversible by design; a correction from here goes into the next period).
   * Just what the lock did, stated plainly. */
  if (locked) {
    const carriedWorth = Math.abs(
      sumDollars(carrying.map((i) => i.amount))
    ).toFixed(2);
    return (
      <main
        className="canvas-scope flex-1 min-w-0"
        style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
      >
        <div
          className="canvas-pad"
          style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            <h1 className="t-label" style={{ margin: 0 }}>
              Close · {OPEN_PERIOD.label}
            </h1>
            <div
              className="flex flex-row items-baseline flex-wrap"
              style={{ gap: "var(--space-6)" }}
            >
              <span
                className="t-display ink-primary"
                style={{ lineHeight: "var(--leading-tight)" }}
              >
                {OPEN_PERIOD.label} is locked
              </span>
            </div>
            <span className="t-body ink-secondary" style={{ maxWidth: "68ch" }}>
              <span className="nums">{carrying.length}</span> open items handed
              forward to {into?.label ?? "the next period"} with their age, worth{" "}
              <span className="nums">{carriedWorth}</span>. A correction from here
              goes into {into?.label ?? "the next period"}, not back into{" "}
              {OPEN_PERIOD.label.split(" ")[0]}.
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="canvas-scope flex-1 min-w-0"
      style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
    >
      <div
        className="canvas-pad"
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
      >
        <div
          className="flex flex-col"
          style={{ gap: "var(--space-9)", paddingBottom: "var(--space-10)" }}
        >
          {/* ---------- The headline ---------- */}
          <div
            className="flex flex-row items-end justify-between"
            style={{ gap: "var(--space-7)" }}
          >
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              {/* An h1, styled as the eyebrow it looks like. The screen leads
                * with a count rather than a title, so there was no heading
                * element on it at all and a screen reader landed on a page with
                * no name.
                *
                * The countdown rides on the eyebrow rather than on its own line
                * under the count. It and the period line said one idea between
                * them — which month, and when it locks — and the month was
                * named twice ("May 2026", then "May closes…"). Chained here with
                * the same `·` the eyebrow already uses, the duplicate "May" is
                * gone and the raw figure sits where screen metadata belongs. The
                * urgency a person acts on is the at-risk sentence below; this is
                * just the date. */}
              <h1 className="t-label" style={{ margin: 0 }}>
                Close · {OPEN_PERIOD.label} · closes in{" "}
                <span className="nums">{days}</span>{" "}
                {days === 1 ? "day" : "days"}
              </h1>
              {/* A count and a date. The only large figure on the screen, and
                * deliberately a COUNT rather than a percentage: "64%" invites
                * the question "of what", and eight accounts short of a close is
                * the thing a person acts on. */}
              <div
                className="flex flex-row items-baseline flex-wrap"
                style={{ gap: "var(--space-6)" }}
              >
                <span
                  className="nums-lead ink-primary"
                  style={{
                    fontSize: "var(--type-metric)",
                    lineHeight: "var(--leading-tight)",
                  }}
                >
                  {proven} of {due}
                </span>
                <span className="t-title ink-secondary">accounts proven</span>
              </div>
              {/* ---------- The month, one mark per account ----------
                * Directly beneath the count it visualises, not a separate band
                * lower down: the figure and its picture are one statement, so
                * they sit together. A small top margin lifts it off the 32px
                * metric's descenders — the column's own 4px rhythm reads as
                * cramped under a figure that large. */}
              <div style={{ marginTop: "var(--space-2)" }}>
                <ProvenMeter proven={proven} due={due} />
              </div>
              {/* What happens when nobody acts, said as arithmetic rather than
                * as a nudge. An account that has waited longer than the days
                * left is on course to miss the lock, which is a sentence a
                * person does something about. */}
              {atRisk.length > 0 && (
                <span className="t-meta ink-secondary">
                  <span className="nums">{atRisk.length}</span>{" "}
                  {atRisk.length === 1 ? "account has" : "accounts have"} been
                  waiting longer than the {days} days left, so{" "}
                  {atRisk.length === 1 ? "it is" : "they are"} on course to miss
                  the lock.
                </span>
              )}
            </div>

            {/* Closing is the only act in this corner, and that is deliberate.
              *
              * There is no "Open June" beside it. Opening a period is not a
              * decision a person makes — the calendar makes it. When a period
              * comes due the schedule creates a reconciliation for every account
              * in it; a button that "opens" the month is the same click-with-no-
              * decision that "New session" was, and it went for the same reason.
              * Starting a month EARLY is the one real manual case, and it is rare
              * enough to belong wherever early-start lives, not standing in the
              * close screen's corner every day.
              *
              * Closing, by contrast, is a person's act: it locks the month, it is
              * irreversible, and from then on a correction has to go into the
              * next period. Its consequence is invisible until afterwards, which
              * is exactly the shape of act that needs its effect stated first, so
              * the confirm carries the carry-forward the way the rule composer
              * carries its preview. */}
            <div className="flex flex-col items-end" style={{ gap: "var(--space-4)" }}>
              <div
                className="flex flex-row items-center"
                style={{ gap: "var(--space-8)" }}
              >
                <ConfirmPopoverButton
                  label={`Close ${OPEN_PERIOD.label.split(" ")[0]}`}
                  variant="primary"
                  size="lg"
                  disabled={!readiness.allowed}
                  confirmTitle={`Lock ${OPEN_PERIOD.label}`}
                  confirmBody={`${carrying.length} open items hand forward to ${
                    into?.label ?? "the next period"
                  } with their age, worth ${Math.abs(
                    sumDollars(carrying.map((i) => i.amount))
                  ).toFixed(2)}. After the lock a correction goes into ${
                    into?.label ?? "the next period"
                  } rather than back into this one.`}
                  confirmLabel="Lock it"
                  onConfirm={() => setLocked(true)}
                />
              </div>
              {/* A switched-off button says why, and the sentence comes from
                * the guard rather than being written again here.
                *
                * The carry-forward is stated beside it rather than only inside
                * the confirm, because the confirm cannot be opened while the
                * button is off — and what closing would DO is the part worth
                * knowing before you are able to do it. Locking a preview behind
                * the precondition it is meant to inform is the mistake the rule
                * composer exists to avoid. */}
              {!readiness.allowed && (
                /* Left-aligned, and sitting under the button it belongs to.
                 *
                 * It was right-aligned prose wrapping over two lines, which
                 * gives every line a different starting x and leaves the last
                 * word stranded on its own. Ragged-left is hard to read at any
                 * length and this is the smallest type on the screen. Worse,
                 * floating in the corner it read as help text for both buttons
                 * rather than as the reason one of them is off. */
                <div
                  className="flex flex-col"
                  style={{ gap: 2, maxWidth: 320, textAlign: "left" }}
                >
                  <span className="t-meta ink-secondary">
                    {readiness.because}
                  </span>
                  <span className="t-meta ink-tertiary">
                    When it locks, {carrying.length} open items hand forward to{" "}
                    {into?.label ?? "the next period"} with their age.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ---------- Empty state ---------- */}
          {everythingProven ? (
            /* One thing. Not a congratulation, and not a dashboard of nothing:
             * when every account is proven the only question left is whether to
             * lock the period. */
            <div
              className="flex flex-col items-start"
              style={{
                background: "var(--surface-card)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
                padding: "var(--space-9)",
                gap: "var(--space-6)",
              }}
            >
              <span className="t-body ink-secondary">
                Every account is proven and sent. Closing locks {OPEN_PERIOD.label}{" "}
                and hands the open items forward with their age.
              </span>
              {/* The same act as the header's, so it wears the same confirm and
                * does the same thing — a screen with two Close buttons that
                * behaved differently would be the "same action, two treatments"
                * bug the specs call out. */}
              <ConfirmPopoverButton
                label={`Close ${OPEN_PERIOD.label.split(" ")[0]}`}
                variant="primary"
                size="lg"
                confirmTitle={`Lock ${OPEN_PERIOD.label}`}
                confirmBody={`${carrying.length} open items hand forward to ${
                  into?.label ?? "the next period"
                } with their age, worth ${Math.abs(
                  sumDollars(carrying.map((i) => i.amount))
                ).toFixed(2)}. After the lock a correction goes into ${
                  into?.label ?? "the next period"
                } rather than back into this one.`}
                confirmLabel="Lock it"
                onConfirm={() => setLocked(true)}
              />
            </div>
          ) : (
            <>
              {/* ---------- 1 · Stuck ---------- */}
              {stuck.length > 0 && (
                <section
                  className="flex flex-col"
                  style={{ gap: "var(--space-5)" }}
                >
                  <SectionHead
                    title="Stuck"
                    count={stuck.length}
                    note="A read failed. Nothing here moves without a person."
                  />
                  <div
                    className="flex flex-col"
                    style={{ gap: "var(--space-4)" }}
                  >
                    {stuck.map((d) => (
                      <StuckRow
                        key={d.id}
                        accountLabel={d.accountLabel}
                        documentName={d.documentName}
                        reason={d.reason}
                        explanation={d.explanation}
                        subject={d.subject}
                        atRisk={atRiskIds.has(d.id)}
                        missingField={d.missingField}
                        movesTo={d.movesTo}
                        /* The action a person took is passed through rather
                         * than discarded: which way out they chose is the
                         * decision, and a store that recorded only THAT they
                         * acted could not tell a discarded duplicate from one
                         * confirmed as superseding the earlier file. */
                        onAct={(label, outcome) =>
                          clearBlock(d.id, label, outcome)
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ---------- 1b · Waiting for files ----------
                *
                * This section exists because an account was falling through the
                * floor. The screen rendered blocked, review, proven and posted
                * accounts and nothing else, so 1500 Park · Operating — in
                * `draft`, with no statement and no ledger — appeared in no
                * section at all. Twenty-one of twenty-two accounts were on a
                * screen whose whole job is the month's work.
                *
                * It is not stuck: nothing failed. It is not a decision: there
                * is nothing yet to decide. What it needs is a file, and the
                * person who chases the bank for one is the same person reading
                * this screen.
                *
                * Above the decisions on purpose. A missing document four days
                * before the lock is the longest pole on the screen — everything
                * else is work that can at least be started. */}
              {waitingForFiles.length > 0 && (
                <section
                  className="flex flex-col"
                  style={{ gap: "var(--space-5)" }}
                >
                  <SectionHead
                    title="Waiting for files"
                    count={waitingForFiles.length}
                    note="No statement or ledger has arrived. Nothing can run until one does."
                  />
                  <Card>{waitingForFiles.map(renderRow)}</Card>
                </section>
              )}

              {/* ---------- 2 · Needs a decision ---------- */}
              {decisions.length > 0 && (
                <section
                  className="flex flex-col"
                  style={{ gap: "var(--space-5)" }}
                >
                  <SectionHead
                    title="Needs a decision"
                    count={decisions.length}
                    /* Summed from the rows below rather than from the
                     * portfolio, so the heading and its list cannot disagree.
                     * They happen to be the same figure — an unexplained
                     * amount only exists on an account in review — and
                     * deriving it from anything but these nine rows would be
                     * trusting that to stay true. */
                    total={money(
                      sumDollars(
                        decisions.map((r) => r.reconciliation.unexplained)
                      )
                    )}
                    /* The second sentence is the prototype telling the truth
                     * about itself. One of these figures was computed from a
                     * real statement through the match contract and the proof;
                     * the other twenty-one are seeded, and every one of those
                     * rows says so. Stating it once here means a reader does
                     * not have to notice the absence of a word to work it out. */
                    note="Most money first. One account is worked out from a real statement; the rest are marked illustrative."
                  />
                  <Card>
                    <MoneyColumnHead label="Unexplained" />
                    {decisions.map(renderRow)}
                  </Card>
                </section>
              )}

              {/* ---------- 3 · Needs a signature ---------- */}
              {signatures.length > 0 && (
                <section
                  className="flex flex-col"
                  style={{ gap: "var(--space-5)" }}
                >
                  <SectionHead
                    title="Needs a signature"
                    count={signatures.length}
                    note="Proven, nothing left to decide. Fifteen seconds each."
                  />
                  <Card>{signatures.map(renderRow)}</Card>
                </section>
              )}

              {/* ---------- 4 · Spot checks ---------- */}
              <section
                className="flex flex-col"
                style={{ gap: "var(--space-5)" }}
              >
                <SectionHead
                  title="Spot checks"
                  count={queue.length - done}
                  /* It waits rather than interrupting, so it has to age in the
                    * open. A number that is getting worse and has somebody's
                    * name on it is the pressure that works on a professional;
                    * a modal is the pressure they learn to click through. */
                  note={
                    done > 0
                      ? `${done} of ${queue.length} checked${
                          problems > 0
                            ? ` · ${problems} ${
                                problems === 1 ? "problem" : "problems"
                              } found`
                            : ""
                        }`
                      : `waiting ${ageInDays(queuedSince(), NOW)} days`
                  }
                />
                <Card>
                  <div
                    className="flex flex-row items-center justify-between"
                    style={{
                      padding: "var(--space-5)",
                      gap: "var(--space-6)",
                    }}
                  >
                    <span className="t-prose ink-secondary">
                      Work nobody flagged, checked on purpose. This list grows as
                      the system does more of the work on its own, which is the
                      point of it rather than a backlog you are failing at.
                    </span>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setChecking(true)}
                    >
                      {done === queue.length ? "Look again" : "Start checking"}
                    </Button>
                  </div>
                </Card>
              </section>

              {/* ---------- 5 · By property ---------- */}
              <Folded
                title="By property"
                count={byProperty.length}
                note="Some people think in buildings. A property counts; it never proves."
              >
                <Card>
                  {byProperty.map(([propertyId, list]) => (
                    <PropertyRollup
                      key={propertyId}
                      propertyLabel={`${list[0].property.shortAddress} · ${list[0].property.cityState}`}
                      accounts={list.map((r) => ({
                        id: r.reconciliation.id,
                        label: r.account.type,
                        proven: [
                          "proven",
                          "signed",
                          "posting",
                          "posted",
                          "closed",
                        ].includes(r.reconciliation.state),
                        stateWords: stateWords(r.reconciliation.state),
                      }))}
                      onOpenAccount={onOpenAccount}
                    />
                  ))}
                </Card>
              </Folded>

              {/* ---------- 6 · Recently closed ---------- */}
              <Folded title="Recently closed" count={closedRecently.length}>
                <Card>{closedRecently.map(renderRow)}</Card>
              </Folded>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
