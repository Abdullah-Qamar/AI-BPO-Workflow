"use client";

/* Accounts — one bank account as an ongoing thing.
 *
 * THIS SCREEN HAS NO MONTH, and never shows a single month's proof. It is about
 * the account itself, which outlives every period it appears in.
 *
 * ---------------------------------------------------------------------------
 * The waiting list is the whole point
 *
 * It is what turns the product from "compare two files" into a record of an
 * account over time. Cheque 1042 — Delta HVAC Services, 3,200.00, written 24
 * May — is not May's problem. It sits here, ageing, until it clears or somebody
 * writes it back, and each month's reconciliation inherits it, ages it at that
 * close, and hands it forward again.
 *
 * ---------------------------------------------------------------------------
 * The one number is an age, and a stale item is not an accounting problem
 *
 * The arithmetic is fine. Every month since May has proved correctly with that
 * cheque sitting in it. It is an operations problem — somebody needs to ring
 * Delta HVAC — which is why the actions are chase, cancel and re-issue, and
 * write back, and why two of the three go on to write to the ledger.
 *
 * Nothing here is tinted. A cheque nobody presented is a normal thing that
 * happens, and the screen says "stale, over 90 days" in words rather than
 * painting the row red over a month that is not wrong.
 *
 * Spec: docs/UX_SPECS.md section 3, docs/TAXONOMY_AND_IA.md Part 3 joint 1.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OpenItemRow, ageInDays } from "@/components/entities/OpenItemRow";
import { RuleRow } from "@/components/entities/RuleRow";
import { Money } from "@/components/entities/Money";
import { StatusDot } from "@/components/ui/Status";
import {
  accountIdentities,
  codeDictionary,
  fixtureActivity,
  monthHistory,
  oldestWaitingDays,
  rulesFor,
  waitingItems,
  CODE_DICTIONARY_VERSION,
  TODAY,
  WESTLAKE_OPERATING_ID,
  type AccountIdentity,
  type WaitingItem as WaitingItemData,
} from "@/lib/accounts";
import { sumDollars } from "@/lib/money";
import { carryForward, goesStaleAt } from "@/lib/period";

/* ---------- Furniture ---------- */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--space-5)" }}>
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="t-title ink-primary">{title}</span>
        {note && <span className="t-meta ink-tertiary">{note}</span>}
      </div>
      {children}
    </section>
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <span className="t-label">{label}</span>
      <span className="t-body ink-primary">{value}</span>
    </div>
  );
}

/* ---------- One item, and its life ---------- */

/* The row, plus every close it has been through and the ones ahead of it.
 *
 * This is joint 1 made visible. Cheque 1042 is not May's problem: it belongs to
 * the account, and each close inherits it, ages it and hands it forward. The
 * `inherited` column is the field the whole design turns on — false at the
 * close that first had to report it, true at every close after — because that
 * is the difference between a month that produced a problem and a month that
 * received one, and the reason a reconciliation takes three inputs rather than
 * two files.
 *
 * The future rows are marked as projections and drawn without the confidence of
 * the past ones. A projection is a different kind of statement from a record
 * and must never be printed as one. It is also the more useful half: a cheque
 * that WILL be stale in August is a reason to ring the payee today, where one
 * that is already stale is only a reason to feel bad. */
function WaitingItem({
  item,
  asOf,
}: {
  item: WaitingItemData;
  asOf: string;
}) {
  const [open, setOpen] = useState(false);
  const life = carryForward(item.writtenOn);
  const stale = goesStaleAt(item.writtenOn);

  return (
    <div className="flex flex-col">
      <OpenItemRow
        description={item.description}
        reference={item.reference}
        amount={item.amount}
        writtenOn={item.writtenOn}
        asOf={asOf}
      />
      <div
        className="flex flex-col"
        style={{ padding: "0 var(--space-5) var(--space-4)" }}
      >
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
            color: "var(--ink-secondary)",
          }}
        >
          {open ? (
            <ChevronDown size="var(--icon-sm)" strokeWidth="var(--stroke-sm)" />
          ) : (
            <ChevronRight size="var(--icon-sm)" strokeWidth="var(--stroke-sm)" />
          )}
          <span className="t-meta">
            {open
              ? "Hide what happens to it"
              : stale
                ? `Carries forward · stale at the ${stale.label.split(" ")[0]} close`
                : "Carries forward"}
          </span>
        </button>

        {open && (
          <div
            className="flex flex-col"
            style={{
              marginTop: "var(--space-4)",
              gap: "var(--space-3)",
              padding: "var(--space-5)",
              borderRadius: "var(--radius-row)",
              background: "var(--surface-list)",
            }}
          >
            {life.map((step) => (
              <div
                key={step.period.id}
                className="flex flex-row items-baseline justify-between"
                style={{
                  gap: "var(--space-5)",
                  opacity: step.projected ? 0.7 : 1,
                }}
              >
                <span className="t-meta ink-secondary">
                  {step.period.label}
                  {step.projected && " · projected"}
                </span>
                <span className="t-meta ink-tertiary">
                  {step.inherited ? "inherited" : "first reported here"} ·{" "}
                  <span className="nums">{step.ageAtClose}</span> days
                  {step.stale && (
                    <span
                      style={{
                        color: "var(--ink-secondary)",
                        fontWeight: "var(--weight-medium)",
                      }}
                    >
                      {" · stale"}
                    </span>
                  )}
                </span>
              </div>
            ))}
            <span className="t-prose ink-secondary">
              {stale
                ? `Nothing here is wrong. Every close proves correctly with it in place. It is an operations problem, and the ${stale.label} close is when it becomes one.`
                : "It hands forward at each close with its age until it clears or somebody writes it back."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- The roster ---------- */

function Roster({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: AccountIdentity[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-5)",
        gap: "var(--space-2)",
        maxHeight: "calc(100vh - var(--space-10) * 2)",
        overflowY: "auto",
      }}
    >
      {accounts.map((a) => {
        const oldest = oldestWaitingDays(a.id);
        const selected = a.id === selectedId;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className="flex flex-row items-center w-full text-left"
            style={{
              minHeight: "var(--row-lg)",
              padding: "var(--space-4) var(--space-5)",
              gap: "var(--space-4)",
              borderRadius: "var(--radius-row)",
              background: selected ? "#FFFFFF" : "transparent",
              border: `1px solid ${
                selected ? "var(--line-row-hover)" : "transparent"
              }`,
              boxShadow: selected ? "var(--shadow-chip)" : "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
              <span className="t-body ink-primary truncate">
                {a.property.shortAddress} · {a.account.type}
              </span>
              <span className="t-meta ink-tertiary nums truncate">
                {a.account.shortName} {a.account.account}
              </span>
            </div>
            {/* The roster's one figure is the age, because that is the screen's
              * one number. An account with nothing waiting shows nothing, not a
              * zero: it has no oldest item, and "0 days" would claim it does. */}
            {oldest !== null && (
              <span className="t-meta ink-secondary nums shrink-0">
                {oldest}d
              </span>
            )}
            <ChevronRight
              size="var(--icon-sm)"
              strokeWidth="var(--stroke-sm)"
              style={{ color: "var(--ink-tertiary)", flexShrink: 0 }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- The screen ---------- */

export function AccountsCanvas() {
  const accounts = accountIdentities();
  const [selectedId, setSelectedId] = useState(WESTLAKE_OPERATING_ID);

  const account =
    accounts.find((a) => a.id === selectedId) ?? accounts[0];
  const items = waitingItems(account.id);
  const oldest = oldestWaitingDays(account.id);
  const codes = codeDictionary(account.id);
  const months = monthHistory(account);
  const rules = rulesFor(account);
  const activity = fixtureActivity(account.id);
  const stale = items.filter((i) => ageInDays(i.writtenOn, TODAY) > 90).length;

  const asOfLabel = new Date(`${TODAY}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

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
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 320px) minmax(360px, 1fr)",
            gap: "var(--space-6)",
            alignItems: "start",
            paddingBottom: "var(--space-10)",
          }}
        >
          <Roster
            accounts={accounts}
            selectedId={account.id}
            onSelect={setSelectedId}
          />

          <div className="flex flex-col" style={{ gap: "var(--space-9)" }}>
            {/* ---------- What the account is ---------- */}
            <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
              <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                <div
                  className="flex flex-row items-center"
                  style={{ gap: "var(--space-4)" }}
                >
                  <Landmark
                    size="var(--icon-lg)"
                    strokeWidth="var(--stroke-md)"
                    style={{ color: "var(--ink-tertiary)" }}
                    aria-hidden
                  />
                  <h1 className="canvas-title ink-primary">
                    {account.property.shortAddress} · {account.account.type}
                  </h1>
                </div>
                <span className="t-prose ink-secondary">{account.purpose}</span>
              </div>

              {/* The one number: the age of the oldest waiting item. */}
              <div
                className="flex flex-row items-end flex-wrap"
                style={{ gap: "var(--space-7)" }}
              >
                {oldest !== null ? (
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span className="t-label">Oldest waiting item</span>
                    <div
                      className="flex flex-row items-baseline"
                      style={{ gap: "var(--space-5)" }}
                    >
                      <span
                        className="nums-lead ink-primary"
                        style={{
                          fontSize: "var(--type-metric)",
                          lineHeight: "var(--leading-tight)",
                        }}
                      >
                        {oldest}
                      </span>
                      <span className="t-title ink-secondary">days</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span className="t-label">Oldest waiting item</span>
                    <span className="t-body ink-secondary">
                      Nothing is waiting to clear on this account.
                    </span>
                  </div>
                )}
                <span className="t-meta ink-tertiary">
                  as of {asOfLabel}
                </span>
              </div>

              <Card>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "var(--space-6)",
                    padding: "var(--space-5)",
                  }}
                >
                  <Field label="Bank" value={account.account.name} />
                  <Field
                    label="Account"
                    value={
                      <span className="nums">{account.account.account}</span>
                    }
                  />
                  <Field
                    label="Posts to"
                    value={<span className="nums">{account.account.gl}</span>}
                  />
                  <Field
                    label="Property code"
                    value={
                      <span className="nums">{account.property.code}</span>
                    }
                  />
                  {activity && (
                    <Field
                      label="Last statement"
                      value={
                        <span className="nums">
                          {activity.bankLines} lines · {activity.ledgerRows}{" "}
                          ledger rows
                        </span>
                      }
                    />
                  )}
                  {/* Stated as a plain fact, never as a warning. Nothing is
                    * wrong: the law requires that money to be kept separately,
                    * so the product leaves it alone on purpose. */}
                  {account.segregated && (
                    <Field
                      label="Automation"
                      value="Not automated · segregated funds"
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* ---------- Waiting to clear ---------- */}
            <Section
              title="Waiting to clear"
              note={
                items.length
                  ? `${items.length} ${
                      items.length === 1 ? "item" : "items"
                    } · ${
                      stale
                        ? `${stale} past ninety days`
                        : "none past ninety days"
                    } · they belong to the account, not to any month`
                  : "Nothing outstanding. Items land here when a month closes with something unsettled."
              }
            >
              {items.length > 0 ? (
                <>
                  <Card>
                    {items.map((i) => (
                      <WaitingItem key={i.id} item={i} asOf={TODAY} />
                    ))}
                    <div
                      className="flex flex-row items-center justify-between"
                      style={{
                        padding: "var(--space-5)",
                        borderTop: "1px solid var(--line-hair)",
                        marginTop: "var(--space-3)",
                        gap: "var(--space-5)",
                      }}
                    >
                      <span
                        className="t-body ink-primary"
                        style={{ fontWeight: "var(--weight-medium)" }}
                      >
                        Total waiting
                      </span>
                      {/* The same 18,450.50 the balance proof takes off the bank
                        * side. Two screens, one arithmetic, and neither of them
                        * stores it. */}
                      <Money
                        amount={sumDollars(items.map((i) => i.amount))}
                        form="plain"
                        emphasis="medium"
                        style={{
                          fontSize: "var(--type-body)",
                          lineHeight: "var(--leading-ui)",
                        }}
                      />
                    </div>
                  </Card>

                  {/* The three ways out. Two of them write to the ledger, and
                    * saying which is the difference between an action and a
                    * button. */}
                  {stale > 0 && (
                    <div
                      className="flex flex-col"
                      style={{
                        background: "var(--surface-card)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: "var(--shadow-card)",
                        padding: "var(--space-6)",
                        gap: "var(--space-5)",
                      }}
                    >
                      <span className="t-prose ink-secondary">
                        The arithmetic is fine. Every month since May has proved
                        correctly with these sitting in it. This is not an
                        accounting problem, it is an operations problem, and two
                        of the three ways out write to the ledger.
                      </span>
                      <div
                        className="flex flex-row flex-wrap"
                        style={{ gap: "var(--space-4)" }}
                      >
                        <Button variant="secondary" size="md">
                          Chase the payee
                        </Button>
                        <Button variant="secondary" size="md">
                          Cancel and re-issue · writes to the ledger
                        </Button>
                        <Button variant="secondary" size="md">
                          Write back · writes to the ledger
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <span
                    className="t-body ink-tertiary"
                    style={{ padding: "var(--space-6) var(--space-5)" }}
                  >
                    Nothing is waiting on this account.
                  </span>
                </Card>
              )}
            </Section>

            {/* ---------- Rules that apply here ---------- */}
            <Section
              title="Rules that apply here"
              note="How often each fired, and how often somebody disagreed."
            >
              <Card>
                {rules.map((r) => (
                  <RuleRow key={r.condition} {...r} onOpen={() => {}} />
                ))}
              </Card>
            </Section>

            {/* ---------- What this bank's codes mean ---------- */}
            {codes.length > 0 && (
              <Section
                title="What this bank's codes mean"
                note={`Per bank and versioned · ${CODE_DICTIONARY_VERSION}`}
              >
                <Card>
                  {codes.map((c) => (
                    <div
                      key={c.code}
                      className="flex flex-row items-center"
                      style={{
                        minHeight: "var(--row-md)",
                        padding: "var(--space-3) var(--space-5)",
                        gap: "var(--space-5)",
                      }}
                    >
                      <span
                        className="t-body nums ink-primary shrink-0"
                        style={{ width: 48 }}
                      >
                        {c.code}
                      </span>
                      <span className="t-body ink-secondary flex-1 min-w-0 truncate">
                        {c.meaning}
                      </span>
                      <span className="t-meta ink-tertiary shrink-0">
                        {c.band} band
                      </span>
                      <span className="t-meta ink-tertiary nums shrink-0">
                        seen {c.seen}
                      </span>
                    </div>
                  ))}
                </Card>
              </Section>
            )}

            {/* ---------- One line per month ---------- */}
            <Section
              title="Month by month"
              note="Proven or not, and when. Never a proof · this screen has no month."
            >
              <Card>
                {months.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-row items-center"
                    style={{
                      minHeight: "var(--row-md)",
                      padding: "var(--space-3) var(--space-5)",
                      gap: "var(--space-5)",
                    }}
                  >
                    <StatusDot tone={m.proven ? "ok" : "neutral"} />
                    <span className="t-body ink-primary flex-1 min-w-0">
                      {m.period}
                    </span>
                    <span className="t-meta ink-tertiary shrink-0">
                      {m.note}
                    </span>
                  </div>
                ))}
              </Card>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
