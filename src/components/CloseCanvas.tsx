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

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountRow } from "@/components/entities/AccountRow";
import { StuckRow } from "@/components/entities/StuckRow";
import { PropertyRollup } from "@/components/entities/PropertyRollup";
import { stateWords } from "@/components/entities/AccountRow";
import {
  accountRows,
  daysUntilClose,
  provenCount,
  spotCheckCount,
  stuckDocuments,
  totalUnexplained,
  OPEN_PERIOD,
  type AccountRow as Row,
} from "@/lib/close";
import { money } from "@/lib/money";
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
  const rows = accountRows();
  const { proven, due } = provenCount();
  const stuck = stuckDocuments();
  const days = daysUntilClose();
  const samples = spotCheckCount();

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

  const byProperty = Array.from(
    rows.reduce((map, r) => {
      const list = map.get(r.property.id) ?? [];
      list.push(r);
      map.set(r.property.id, list);
      return map;
    }, new Map<string, Row[]>())
  );

  const everythingProven = proven === due;

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
              <span className="t-label">Close · {OPEN_PERIOD.label}</span>
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
            </div>

            {/* Not "New session". The calendar creates the work; when a period
              * opens, every account due gets a reconciliation. This appears
              * only while the next period is still shut. */}
            <Button variant="secondary" size="lg">
              Open June
            </Button>
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
                        onAct={() => {}}
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
                <SectionHead title="Spot checks" count={samples} />
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
                    <Button variant="secondary" size="md">
                      Start checking
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
