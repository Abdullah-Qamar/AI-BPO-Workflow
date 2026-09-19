"use client";

/* The entities preview.
 *
 * Every shared component, in every state it has to handle, on one page and
 * before any screen uses it. Four of the five surfaces are lists of the same
 * few things, and building them once is what stops the fourth screen inventing
 * its own row — which is how this codebase ended up drawing status eight
 * structurally different ways and spelling one state five different spellings.
 *
 * The match cards are driven by the real fixture rather than by invented props,
 * so the preview and the product are looking at the same month. Where a
 * component's states cannot come from the fixture (an account that is mid-post,
 * a rule that expires next March) the values are written here and nowhere else.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AccountRow, stateWords } from "@/components/entities/AccountRow";
import { StuckRow, type StuckReason } from "@/components/entities/StuckRow";
import { PropertyRollup } from "@/components/entities/PropertyRollup";
import { OpenItemRow } from "@/components/entities/OpenItemRow";
import { MatchCard } from "@/components/entities/MatchCard";
import { RuleRow } from "@/components/entities/RuleRow";
import { PatternRow, type Rung } from "@/components/entities/PatternRow";
import { ProofLadder } from "@/components/entities/ProofLadder";
import { Money } from "@/components/entities/Money";
import {
  OutcomeChip,
  outcomeMeaning,
} from "@/components/entities/OutcomeChip";

import type { ReconciliationState } from "@/lib/session/types";
import type { MatchOutcome } from "@/lib/reconciliation/match";
import { westlakeMatches } from "@/lib/reconciliation/westlakeMatches";
import { controlTotals, ledgerTotals } from "@/lib/fixtures/westlakeOperating";

/* ---------- Page furniture ---------- */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--space-6)" }}>
      <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
        <h2 className="t-heading ink-primary">{title}</h2>
        <p className="t-prose ink-secondary">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
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

/* ---------- Fixture lookups ---------- */

const byId = (id: string) => {
  const m = westlakeMatches.find((x) => x.id === id);
  if (!m) throw new Error(`No match ${id}`);
  return m;
};

/* ---------- Written-here data ---------- */

const ACCOUNT_STATES: ReconciliationState[] = [
  "draft",
  "reading",
  "blocked",
  "matching",
  "review",
  "proven",
  "signed",
  "posting",
  "posted",
  "partially-posted",
  "post-failed",
];

const STUCK: {
  reason: StuckReason;
  explanation: string;
  subject?: string;
  documentName: string;
}[] = [
  {
    reason: "incomplete-read",
    documentName: "bai2-shattuck-operating-2026-05.bai",
    explanation:
      "The file declares a closing balance of 148,220.40 and its own lines add up to 144,880.15. The read is 3,340.25 short, so the run stopped rather than reconcile against half a statement.",
  },
  {
    reason: "unreadable-line",
    documentName: "gl-broadway-operating-2026-05.csv",
    explanation:
      "Row 41 has an amount and a date but no control number. Nothing has been guessed; the run will carry on once somebody supplies it.",
  },
  {
    reason: "wrong-period",
    subject: "April 2026",
    documentName: "bai2-christie-reserve-2026-04.bai",
    explanation:
      "The statement covers 01 to 30 April. This reconciliation is May, so one of the two is wrong.",
  },
  {
    reason: "wrong-account",
    subject: "Reserve ••••9034",
    documentName: "bai2-westlake-9034-2026-05.bai",
    explanation:
      "The account number on the statement is 9034, which is the capital reserve account, not the operating account this file was dropped on.",
  },
  {
    reason: "duplicate",
    documentName: "bai2-larkin-operating-2026-05 (2).bai",
    explanation:
      "Byte for byte the same file as one taken in on 02 June at 09:12. Taking it twice would double every line in it.",
  },
];

const PATTERNS: {
  name: string;
  rung: Rung;
  timesSeen: number;
  agreementRate: number | null;
  excludedBecause?: string;
}[] = [
  {
    name: "Returned payment",
    rung: 3,
    timesSeen: 214,
    agreementRate: 0.97,
  },
  {
    name: "Transfer between own accounts",
    rung: 4,
    timesSeen: 1180,
    agreementRate: 0.99,
  },
  {
    name: "Bank fee not booked",
    rung: 2,
    timesSeen: 63,
    agreementRate: 0.88,
  },
  {
    name: "Lockbox deposit split across tenants",
    rung: 1,
    timesSeen: 9,
    agreementRate: null,
  },
  {
    name: "Ambiguous match",
    rung: "excluded",
    timesSeen: 41,
    agreementRate: null,
    excludedBecause: "by definition the system does not know",
  },
  {
    name: "Anything on a security deposit account",
    rung: "excluded",
    timesSeen: 0,
    agreementRate: null,
    excludedBecause: "legally segregated funds",
  },
  {
    name: "The final write",
    rung: "excluded",
    timesSeen: 0,
    agreementRate: null,
    excludedBecause: "somebody has to answer who signed this",
  },
];

/* The gallery is grouped rather than stacked.
 *
 * All ten components in every state comes to about 7,400px in one column,
 * which is not a page anyone reads — it is a scroll people give up on, and a
 * reference nobody can find anything in. The groups are how the pieces are
 * actually reached for: the primitives everything else is built from, the rows
 * that make up four of the five screens, the two surfaces that carry a whole
 * decision, and the knowledge rows. */
const TABS = [
  { key: "primitives", label: "Primitives" },
  { key: "rows", label: "Rows" },
  { key: "stuck", label: "Stuck" },
  { key: "match", label: "Match card" },
  { key: "knowledge", label: "Knowledge" },
  { key: "proof", label: "Proof" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const OUTCOMES: MatchOutcome[] = [
  "matched",
  "timing",
  "bank-only",
  "ledger-only",
  "needs-adjustment",
];

export default function EntitiesPage() {
  const [tab, setTab] = useState<TabKey>("primitives");

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
          style={{ gap: "var(--space-10)", paddingBottom: "var(--space-10)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
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
              <ArrowLeft size="var(--icon-sm)" strokeWidth="var(--stroke-sm)" />
              Back to Reconciliation
            </Link>
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              <h1 className="canvas-title ink-primary">Entities</h1>
              <p className="t-prose ink-secondary">
                The ten pieces every screen is assembled from, in every state
                they have to handle. Each one carries a rule about what it must
                never do, and the rule is the part that matters.
              </p>
            </div>
          </div>

          {/* The tab strip recipe from the design system: 28px pills, the
            * active one on --surface-tab-active. */}
          <div
            className="flex flex-row flex-wrap"
            role="tablist"
            aria-label="Component groups"
            style={{ gap: "var(--space-3)" }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  style={{
                    height: "var(--control-md)",
                    padding: "0 12px",
                    borderRadius: 999,
                    border: active ? "1px solid #FFFFFF" : "1px solid transparent",
                    background: active
                      ? "var(--surface-tab-active)"
                      : "var(--surface-control)",
                    fontSize: "var(--type-body)",
                    lineHeight: "var(--leading-ui)",
                    fontWeight: active
                      ? "var(--weight-medium)"
                      : "var(--weight-regular)",
                    color: "var(--ink-primary)",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ---------- 9 · Money ---------- */}
          {tab === "primitives" && (
          <Section
            title="Money"
            note="Three forms, and never a hyphen for a negative. The numeral face is mapped by unicode range and that range excludes the hyphen, so a figure signed with one renders its sign in the text face at a different width and frays the column."
          >
            <Sheet>
              {[
                { form: "plain" as const, label: "plain · a magnitude" },
                { form: "signed" as const, label: "signed · U+2212" },
                {
                  form: "accounting" as const,
                  label: "accounting · the ladder convention",
                },
              ].map((f) => (
                <div
                  key={f.form}
                  className="flex flex-row items-baseline justify-between"
                  style={{ padding: "var(--space-4) var(--space-5)" }}
                >
                  <span className="t-meta ink-tertiary">{f.label}</span>
                  <span
                    className="flex flex-row"
                    style={{ gap: "var(--space-8)" }}
                  >
                    <Money amount={18450.5} form={f.form} />
                    <Money amount={-1065} form={f.form} />
                    <Money amount={0} form={f.form} />
                  </span>
                </div>
              ))}
            </Sheet>
          </Section>
          )}

          {/* ---------- 10 · OutcomeChip ---------- */}
          {tab === "primitives" && (
          <Section
            title="Outcome chip"
            note="What kind of thing a match is, never how it is going. Its own token ramp, kept apart from status: tint an uncleared cheque amber and it reads as a problem, and once half the warnings are nothing nobody believes any colour on the screen."
          >
            <Sheet>
              {OUTCOMES.map((o) => (
                <div
                  key={o}
                  className="flex flex-row items-center"
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    gap: "var(--space-6)",
                  }}
                >
                  <span style={{ width: 120 }}>
                    <OutcomeChip outcome={o} />
                  </span>
                  <span className="t-meta ink-tertiary">
                    {outcomeMeaning(o)}
                  </span>
                </div>
              ))}
            </Sheet>
          </Section>
          )}

          {/* ---------- 1 · AccountRow ---------- */}
          {tab === "rows" && (
          <Section
            title="Account row"
            note="The primary row in the product. Never a bare percentage, and never a state coloured off the status ramp — urgency is carried by which section a row sits in, because position cannot cry wolf the way a tint can."
          >
            <Sheet>
              {ACCOUNT_STATES.map((state, i) => (
                <AccountRow
                  key={state}
                  propertyLabel="1849 Westlake"
                  accountLabel={
                    ["Operating", "Reserve", "Escrow", "Security deposit"][i % 4]
                  }
                  accountNumber="••••3421"
                  state={state}
                  unexplained={state === "review" ? 2900.6 : 0}
                  itemsWaiting={state === "review" ? 5 : 0}
                  oldestOpenItemDays={state === "draft" ? null : 17}
                  waitingSince="2026-06-02T09:14:00Z"
                  illustrative={state !== "review"}
                  onOpen={() => {}}
                />
              ))}
            </Sheet>
            <p className="t-meta ink-tertiary">
              The state reads {ACCOUNT_STATES.map(stateWords).join(" · ")}.
            </p>
          </Section>
          )}

          {/* ---------- 2 · StuckRow ---------- */}
          {tab === "stuck" && (
          <Section
            title="Stuck row"
            note="A document that could not be read, with the way out beside it. It cannot render without at least one action, because the actions are looked up from the reason code rather than passed in — there is no prop through which to leave them off."
          >
            <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
              {STUCK.map((s) => (
                <StuckRow
                  key={s.reason}
                  accountLabel="2390 Shattuck · Operating"
                  documentName={s.documentName}
                  reason={s.reason}
                  explanation={s.explanation}
                  subject={s.subject}
                  onAct={() => {}}
                />
              ))}
            </div>
          </Section>
          )}

          {/* ---------- 3 · PropertyRollup ---------- */}
          {tab === "rows" && (
          <Section
            title="Property rollup"
            note="A property and its accounts. Never a single badge: a property cannot be proven, only its accounts can, and one badge over four accounts has to choose between claiming the property is fine and going red for the three that are."
          >
            <Sheet>
              <PropertyRollup
                propertyLabel="1849 Westlake Ave N, Seattle, WA"
                accounts={[
                  { id: "a", label: "Operating", proven: false, stateWords: "waiting for you" },
                  { id: "b", label: "Reserve", proven: true, stateWords: "sent" },
                  { id: "c", label: "Escrow", proven: true, stateWords: "proved" },
                  { id: "d", label: "Security deposit", proven: true, stateWords: "sent" },
                ]}
                onOpenAccount={() => {}}
              />
              <PropertyRollup
                propertyLabel="871 Broadway, Oakland, CA"
                accounts={[
                  { id: "e", label: "Operating", proven: true, stateWords: "sent" },
                  { id: "f", label: "Reserve", proven: true, stateWords: "sent" },
                ]}
                onOpenAccount={() => {}}
              />
            </Sheet>
          </Section>
          )}

          {/* ---------- 4 · OpenItemRow ---------- */}
          {tab === "rows" && (
          <Section
            title="Open item row"
            note="One thing still waiting to clear. The age is never passed in: the row takes the date written and the date the period ended and subtracts, because an item outlives periods and a stored age is a number that was right once."
          >
            <Sheet>
              <OpenItemRow
                description="Delta HVAC Services · Chiller service call"
                reference="Cheque 1042"
                amount={-3200}
                writtenOn="2026-05-24"
                periodEnd="2026-05-31"
              />
              <OpenItemRow
                description="Pacific Mutual Insurance · Property premium Q2"
                reference="Cheque 1051"
                amount={-8450}
                writtenOn="2026-05-28"
                periodEnd="2026-05-31"
              />
              <OpenItemRow
                description="Kerr & Associates · Legal, lease review"
                reference="Cheque 1055"
                amount={-6590.5}
                writtenOn="2026-05-29"
                periodEnd="2026-05-31"
              />
              <OpenItemRow
                description="Northgate Glazing · Window replacement"
                reference="Cheque 0987"
                amount={-2140}
                writtenOn="2026-02-11"
                periodEnd="2026-05-31"
              />
            </Sheet>
            <p className="t-meta ink-tertiary">
              The last row is the same component at 109 days. Stale says its own
              name rather than taking a tint: the proof still ties with it in
              place, so the month is not wrong, and the item needs chasing,
              voiding or writing back.
            </p>
          </Section>
          )}

          {/* ---------- 5 · MatchCard ---------- */}
          {tab === "match" && (
          <Section
            title="Match card"
            note="The item view. Never offers approve, because approving was never an answer to a difference. Never presents the model's sentence as a finding. Both sides are arrays, because one deposit covering three rents is the ordinary case."
          >
            <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
              <MatchCard match={byId("m-rent-batch-0504")} onAct={() => {}} />
              <MatchCard
                match={byId("m-refund-4912-ambiguous")}
                modelSentence="Both rows match the amount to the cent and sit one day either side of the statement. The memo on the bank line reads INV 4912, which is Tenant 115's invoice, so that row is the likelier of the two. Nothing here can be checked by a rule."
                onAct={() => {}}
              />
              <MatchCard
                match={byId("m-returned-payment-308")}
                onAct={() => {}}
              />
              <MatchCard match={byId("m-stripe-payout-0512")} onAct={() => {}} />
              <MatchCard
                match={byId("m-cheque-1042-outstanding")}
                onAct={() => {}}
              />
            </div>
          </Section>
          )}

          {/* ---------- 6 · RuleRow ---------- */}
          {tab === "knowledge" && (
          <Section
            title="Rule row"
            note="Never renders without an owner and an expiry, and both are required props. An owner makes a rule answerable; an expiry makes it get reviewed. Without them it is a permanent unattributed change to how money is classified."
          >
            <Sheet>
              <RuleRow
                condition="A deposit matching three or more rent rows that sum to it"
                scope="global"
                owner="Product"
                expires="2027-01-31"
                timesFired={1842}
                timesOverridden={11}
                onOpen={() => {}}
              />
              <RuleRow
                condition="Refunds issued on the same day as the bank debit, to the cent"
                scope="property"
                scopeLabel="1849 Westlake"
                owner="N. Okafor"
                expires="2026-09-30"
                timesFired={64}
                timesOverridden={9}
                onOpen={() => {}}
              />
              <RuleRow
                condition="Never post into a closed period"
                scope="global"
                owner="Engineering"
                expires="2030-01-01"
                timesFired={3}
                timesOverridden={0}
                onOpen={() => {}}
              />
            </Sheet>
            <p className="t-meta ink-tertiary">
              The third has fired three times, so no override rate is printed.
              A rate off one disagreement gets believed far past what it can
              support.
            </p>
          </Section>
          )}

          {/* ---------- 7 · PatternRow ---------- */}
          {tab === "knowledge" && (
          <Section
            title="Pattern row"
            note="The sampling bar grows as the rung climbs, and that inversion is the design. The pattern you automate is the pattern that stops being watched, so the work nobody flagged has to be checked harder the less anyone looks at it."
          >
            <Sheet>
              {PATTERNS.map((p) => (
                <PatternRow key={p.name} {...p} onOpen={() => {}} />
              ))}
            </Sheet>
            <p className="t-meta ink-tertiary">
              The last three are excluded, which is a different kind of thing
              from a low score. They carry no rung, no agreement rate and no
              ladder position, because they are not competing.
            </p>
          </Section>
          )}

          {/* ---------- 8 · ProofLadder ---------- */}
          {tab === "proof" && (
          <Section
            title="Proof ladder"
            note="Never accepts a pre-computed total. It takes the matches and the two balances the documents declare, and works out everything else. If it took a total, the caption in its corner would be a lie the first time somebody passed a stale one."
          >
            <ProofLadder
              matches={westlakeMatches}
              statementClosing={controlTotals.closingBalance}
              ledgerClosing={ledgerTotals().bookBalance}
              periodEndLabel="May 31"
              accountLabel="Chase Operating"
              accountNumber="••••3421"
              cycle="May 2026"
            />
            <p className="t-meta ink-tertiary">
              The tied state, with both journeys landing on 292,844.60 and the
              figure reaching 0.00, is at{" "}
              <Link href="/proof" style={{ textDecoration: "underline" }}>
                /proof
              </Link>
              .
            </p>
          </Section>
          )}
        </div>
      </div>
    </div>
  );
}
