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
  note,
}: {
  title: string;
  count?: number;
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
      </div>
      {note && <span className="t-meta ink-tertiary">{note}</span>}
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

  /* Proven but not yet signed or sent. Separated from the queue above on
   * purpose: this is authorising, not deciding, and it is the cheapest work on
   * the screen. */
  const signatures = rows.filter((r) => r.reconciliation.state === "proven");

  const closedRecently = rows.filter((r) =>
    ["posted", "signed"].includes(r.reconciliation.state)
  );

  /* A close package completes when every one of its accounts is posted, and the
   * PERIOD locks when every package is complete. Two counts and whether they
   * are equal — not a percentage, and not a judgement anybody makes. */
  const packages = Array.from(
    rows.reduce((map, r) => {
      const list = map.get(r.property.id) ?? [];
      list.push(r);
      map.set(r.property.id, list);
      return map;
    }, new Map<string, Row[]>())
  );
  const packagesComplete = packages.filter(([, list]) =>
    list.every((r) =>
      ["posted", "signed", "closed"].includes(r.reconciliation.state)
    )
  ).length;
  const readiness = closeReadiness(packagesComplete, packages.length);
  const carrying = waitingItems(WESTLAKE_OPERATING_ID);
  /* Accounts that have been waiting longer than the days left before the lock.
   * Ageing rather than escalating: escalation needs somebody to escalate to,
   * and this product has one person in it. */
  const atRisk = atRiskOfMissingClose(days);
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
      waitingSince={r.reconciliation.waitingSince}
      illustrative={r.illustrative}
      onOpen={onOpenAccount ? () => onOpenAccount(r.reconciliation.id) : undefined}
    />
  );

  if (checking) {
    return <SpotCheckCanvas onBack={() => setChecking(false)} />;
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
                * no name. The visual is unchanged; only the element is. */}
              <h1 className="t-label" style={{ margin: 0 }}>
                Close · {OPEN_PERIOD.label}
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
              <span className="t-body ink-secondary">
                {OPEN_PERIOD.label.split(" ")[0]} closes in{" "}
                <span className="nums">{days}</span>{" "}
                {days === 1 ? "day" : "days"} ·{" "}
                <span className="nums">{money(totalUnexplained())}</span>{" "}
                unexplained across the portfolio
              </span>
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

            <div className="flex flex-col items-end" style={{ gap: "var(--space-3)" }}>
              <div className="flex flex-row" style={{ gap: "var(--space-4)" }}>
                {/* Not "New session". The calendar creates the work; when a
                  * period opens, every account due gets a reconciliation. */}
                <Button variant="secondary" size="lg">
                  Open June
                </Button>

                {/* Closing is irreversible and its consequence is invisible
                  * until afterwards, which is exactly the shape of act that
                  * needs its effect stated first. So the confirm carries the
                  * carry-forward, item by item, the way the rule composer
                  * carries its preview. */}
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
                  onConfirm={() => {}}
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
                <div
                  className="flex flex-col items-end"
                  style={{ gap: 2, maxWidth: 340, textAlign: "right" }}
                >
                  <span className="t-meta ink-tertiary">
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
              <Button variant="primary" size="lg">
                Close {OPEN_PERIOD.label}
              </Button>
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
                        /* The action a person took is passed through rather
                         * than discarded: which way out they chose is the
                         * decision, and a store that recorded only THAT they
                         * acted could not tell a discarded duplicate from one
                         * confirmed as superseding the earlier file. */
                        onAct={(label) => clearBlock(d.id, label)}
                      />
                    ))}
                  </div>
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
                    /* The second sentence is the prototype telling the truth
                     * about itself. One of these figures was computed from a
                     * real statement through the match contract and the proof;
                     * the other twenty-one are seeded, and every one of those
                     * rows says so. Stating it once here means a reader does
                     * not have to notice the absence of a word to work it out. */
                    note="Most money first. One account is worked out from a real statement; the rest are marked illustrative."
                  />
                  <Card>{decisions.map(renderRow)}</Card>
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
