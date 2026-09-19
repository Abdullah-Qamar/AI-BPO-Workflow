"use client";

/* Rules — what the machine has been taught, and whether it is still right.
 *
 * Two tabs, because rules and situations are different things with different
 * lifespans, and keeping them on one surface is the argument: everything that
 * changes how the machine decides lives in one place.
 *
 * ---------------------------------------------------------------------------
 * Writing a rule is four steps, and step two is the one that matters
 *
 * Fill in the fields, PREVIEW against last month, check for conflicts, approve.
 * Every product of this kind ships step one and step four. Step two is the
 * difference between a setting and a decision somebody understands, and here it
 * actually runs: the draft condition is replayed over the fixture's month in
 * memory and reports what it would have changed.
 *
 * Which is how the seed's own worst rule gets refused in front of a person.
 * "Refunds under $250 are routine, auto-approve and skip the ambiguity check"
 * previews as: would have paired one 210.00 debit with Tenant 115 and never
 * shown the other candidate. Then the conflict check names what it breaks.
 *
 * ---------------------------------------------------------------------------
 * NEVER lets a customer see or edit the model's wording
 *
 * There is no prompt anywhere on this screen and no field that reaches one. The
 * moment a customer's edit changes the model's instructions, nobody can say why
 * last Tuesday was different. Rules are data, patterns are product, prompts are
 * code, and only the first of the three is editable here.
 *
 * NEVER lets a rule exist without a preview, an owner and an expiry. The
 * composer will not advance without all three.
 *
 * Spec: docs/UX_SPECS.md section 4, docs/FLOWS.md F7 and F9.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RuleRow } from "@/components/entities/RuleRow";
import { PatternRow } from "@/components/entities/PatternRow";
import { Money } from "@/components/entities/Money";
import {
  conditionWords,
  conflictsFor,
  exclusions,
  overrideRate,
  previewCondition,
  rules,
  rulesWorstFirst,
  situations,
  SAMPLING_AT_RUNG,
  type Condition,
} from "@/lib/knowledge";

const TABS = [
  { key: "rules", label: "Rules" },
  { key: "situations", label: "Situations" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/* The three drafts the composer offers. A closed set, because the preview has
 * to be able to RUN the condition and a free-text box would mean pretending to
 * understand a sentence. The third is the dangerous one, kept on purpose. */
const DRAFTS: { label: string; condition: Condition; words: string }[] = [
  {
    label: "Book small statement items the ledger is missing",
    condition: { kind: "auto-book-bank-only-under", amount: 250 },
    words: "Bank fees and interest under 250.00, booked without a person",
  },
  {
    label: "Widen the refund window to five days",
    condition: { kind: "match-within-days", days: 5 },
    words: "Pair refunds of the same amount within five days",
  },
  {
    label: "Auto-approve small refunds and skip the ambiguity check",
    condition: { kind: "auto-pick-ambiguous-under", amount: 250 },
    words: "Refunds under 250.00 are routine, so take the first candidate",
  },
];

/* ---------- Furniture ---------- */

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

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-start" style={{ gap: "var(--space-5)" }}>
      <span
        className="flex items-center justify-center shrink-0 t-meta nums"
        style={{
          width: "var(--control-sm)",
          height: "var(--control-sm)",
          borderRadius: 999,
          background: done ? "var(--action-primary)" : "var(--surface-control)",
          color: done ? "var(--action-on-primary)" : "var(--ink-tertiary)",
          fontWeight: "var(--weight-medium)",
          marginTop: 1,
        }}
      >
        {done ? (
          <Check size={12} strokeWidth="var(--stroke-sm)" aria-hidden />
        ) : (
          n
        )}
      </span>
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: "var(--space-4)" }}>
        <span
          className="t-body ink-primary"
          style={{ fontWeight: "var(--weight-medium)" }}
        >
          {title}
        </span>
        {children}
      </div>
    </div>
  );
}

/* ---------- The composer ---------- */

function Composer({ onClose }: { onClose: () => void }) {
  const [draftIndex, setDraftIndex] = useState<number | null>(null);
  const [owner, setOwner] = useState("");
  const [expires, setExpires] = useState("");
  const [previewed, setPreviewed] = useState(false);

  const draft = draftIndex === null ? null : DRAFTS[draftIndex];
  const preview = useMemo(
    () => (draft ? previewCondition(draft.condition) : null),
    [draft]
  );
  const conflicts = draft ? conflictsFor(draft.condition) : [];
  const blocked = conflicts.some((c) => c.blocking);

  const fieldsDone = draft !== null && owner.trim() !== "" && expires !== "";

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-7)",
        gap: "var(--space-7)",
      }}
    >
      <div className="flex flex-row items-start justify-between" style={{ gap: "var(--space-5)" }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="t-title ink-primary">Write a rule</span>
          <span className="t-meta ink-tertiary">
            Four steps, not a text box. Nothing is saved until the last one.
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* ---- 1 · the fields ---- */}
      <Step n={1} title="What it does, who owns it, when it stops" done={fieldsDone}>
        <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
          {DRAFTS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setDraftIndex(i);
                setPreviewed(false);
              }}
              className="flex flex-row items-start w-full text-left"
              style={{
                padding: "var(--space-5)",
                gap: "var(--space-5)",
                borderRadius: "var(--radius-row)",
                background: draftIndex === i ? "#FFFFFF" : "transparent",
                border: `1px solid ${
                  draftIndex === i ? "var(--line-row-hover)" : "var(--line-hair)"
                }`,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                aria-hidden
                className="shrink-0"
                style={{
                  width: 14,
                  height: 14,
                  marginTop: 2,
                  borderRadius: 999,
                  border: `1px solid ${
                    draftIndex === i ? "var(--action-primary)" : "var(--line)"
                  }`,
                  background:
                    draftIndex === i ? "var(--action-primary)" : "transparent",
                  boxShadow:
                    draftIndex === i ? "inset 0 0 0 3px #FFFFFF" : "none",
                }}
              />
              <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
                <span className="t-body ink-primary">{d.label}</span>
                <span className="t-meta ink-tertiary">
                  {conditionWords(d.condition)}
                </span>
              </div>
            </button>
          ))}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--space-5)",
              marginTop: "var(--space-3)",
            }}
          >
            <label className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <span className="t-label">Owner · required</span>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Who answers for this rule"
                className="t-body"
                style={{
                  height: "var(--control-lg)",
                  padding: "0 12px",
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--line-menu)",
                  background: "#FFFFFF",
                  color: "var(--ink-primary)",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <label className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <span className="t-label">Expires · required</span>
              <input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="t-body nums"
                style={{
                  height: "var(--control-lg)",
                  padding: "0 12px",
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--line-menu)",
                  background: "#FFFFFF",
                  color: "var(--ink-primary)",
                  fontFamily: "inherit",
                }}
              />
            </label>
          </div>
          <span className="t-meta ink-tertiary">
            An owner makes a rule answerable. An expiry makes it get reviewed.
            Without both it is a permanent unattributed change to how money is
            classified.
          </span>
        </div>
      </Step>

      {/* ---- 2 · the preview ---- */}
      <Step n={2} title="Preview it against last month" done={previewed}>
        {!fieldsDone ? (
          <span className="t-meta ink-tertiary">
            Pick what it does and fill in both fields first.
          </span>
        ) : !previewed ? (
          <div className="flex flex-col items-start" style={{ gap: "var(--space-4)" }}>
            <span className="t-prose ink-secondary">
              The draft is replayed over May in memory. Nothing is saved and
              nothing is changed.
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={() => setPreviewed(true)}
            >
              Replay May through it
            </Button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
            <span className="t-body ink-primary">{preview?.summary}</span>
            {preview?.hits.map((h) => (
              <div
                key={h.matchId}
                className="flex flex-row items-baseline justify-between"
                style={{
                  gap: "var(--space-5)",
                  padding: "var(--space-4) var(--space-5)",
                  borderRadius: "var(--radius-row)",
                  background: "var(--surface-list)",
                }}
              >
                <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
                  <span className="t-body ink-primary">{h.what}</span>
                  <span className="t-meta ink-tertiary">{h.effect}</span>
                </div>
                <Money
                  amount={h.amount}
                  form="signed"
                  style={{
                    fontSize: "var(--type-body)",
                    lineHeight: "var(--leading-ui)",
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Step>

      {/* ---- 3 · the conflict check ---- */}
      <Step n={3} title="What it disagrees with" done={previewed && !conflicts.length}>
        {!previewed ? (
          <span className="t-meta ink-tertiary">Runs after the preview.</span>
        ) : conflicts.length === 0 ? (
          <span className="t-body ink-secondary">
            Nothing active disagrees with this.
          </span>
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
            {conflicts.map((c) => (
              <div
                key={c.against}
                className="flex flex-row items-start"
                style={{
                  gap: "var(--space-4)",
                  padding: "var(--space-5)",
                  borderRadius: "var(--radius-row)",
                  background: c.blocking
                    ? "var(--status-danger-bg)"
                    : "var(--surface-list)",
                }}
              >
                <AlertTriangle
                  size="var(--icon-sm)"
                  strokeWidth="var(--stroke-sm)"
                  style={{
                    color: c.blocking
                      ? "var(--status-danger-ink)"
                      : "var(--ink-tertiary)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  aria-hidden
                />
                <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
                  <span
                    className="t-body"
                    style={{
                      fontWeight: "var(--weight-medium)",
                      color: c.blocking
                        ? "var(--status-danger-ink)"
                        : "var(--ink-primary)",
                    }}
                  >
                    {c.blocking ? "Blocks approval · " : "Worth knowing · "}
                    {c.against}
                  </span>
                  <span className="t-prose ink-secondary">{c.why}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Step>

      {/* ---- 4 · approve ---- */}
      <Step n={4} title="Approve it">
        <div className="flex flex-col items-start" style={{ gap: "var(--space-3)" }}>
          <Button
            variant="primary"
            size="lg"
            disabled={!previewed || blocked}
            onClick={onClose}
          >
            Approve and make it active
          </Button>
          {/* A switched-off button says why, right next to it. */}
          {(!previewed || blocked) && (
            <span className="t-meta ink-tertiary">
              {blocked
                ? "Blocked by a permanent exclusion above. This one cannot be approved."
                : "Preview it first. A rule cannot be approved without one."}
            </span>
          )}
        </div>
      </Step>
    </div>
  );
}

/* ---------- The screen ---------- */

export function RulesCanvas() {
  const [tab, setTab] = useState<TabKey>("rules");
  const [composing, setComposing] = useState(false);

  const ordered = rulesWorstFirst();
  const worst = ordered[0];
  const worstRate = overrideRate(worst);
  const fired = rules.reduce((n, r) => n + r.timesFired, 0);
  const overridden = rules.reduce((n, r) => n + r.timesOverridden, 0);
  const rate = fired === 0 ? 0 : overridden / fired;

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
          style={{ gap: "var(--space-8)", paddingBottom: "var(--space-10)" }}
        >
          {/* ---------- Header and the one number ---------- */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-4)" }}
            >
              <BookOpen
                size="var(--icon-lg)"
                strokeWidth="var(--stroke-md)"
                style={{ color: "var(--ink-tertiary)" }}
                aria-hidden
              />
              <h1 className="canvas-title ink-primary">Rules</h1>
            </div>

            <div
              className="flex flex-row items-end justify-between flex-wrap"
              style={{ gap: "var(--space-7)" }}
            >
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span className="t-label">
                  How often people disagree with a rule
                </span>
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
                    {(rate * 100).toFixed(1)}%
                  </span>
                  <span className="t-body ink-secondary nums">
                    {overridden} of {fired} firings
                  </span>
                </div>
                {/* Never hide a bad trend. A volume-weighted average sits under
                  * one percent while one rule is wrong nearly half the time,
                  * and the average is not lying — it is answering a different
                  * question from the one a reader has. So the culprit is named
                  * beside it rather than left to be found. */}
                {worstRate !== null && worstRate > 0.2 && (
                  <span className="t-meta ink-secondary">
                    {/* The rule's own words, uncased. An earlier version
                      * lowercased the whole sentence to make it read as a
                      * clause and turned Bayview Landscaping into a common
                      * noun — which is a vendor's name on an audit surface. */}
                    That average hides one. The rule about {worst.scopeLabel ?? "this portfolio"} is
                    overridden{" "}
                    <span className="nums">
                      {Math.round(worstRate * 100)}%
                    </span>{" "}
                    of the time: {worst.words}.
                  </span>
                )}
              </div>

              {!composing && (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={
                    <Plus
                      size="var(--icon-sm)"
                      strokeWidth="var(--stroke-sm)"
                    />
                  }
                  onClick={() => {
                    setTab("rules");
                    setComposing(true);
                  }}
                >
                  Write a rule
                </Button>
              )}
            </div>
          </div>

          {/* ---------- Tabs ---------- */}
          <div
            className="flex flex-row"
            role="tablist"
            aria-label="Knowledge"
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
                    border: active
                      ? "1px solid #FFFFFF"
                      : "1px solid transparent",
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

          {/* ---------- Rules ---------- */}
          {tab === "rules" && (
            <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
              {composing && <Composer onClose={() => setComposing(false)} />}
              <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                <span className="t-meta ink-tertiary">
                  Worst first, by override rate. The rules most likely to be
                  wrong are the ones worth reading.
                </span>
                <Card>
                  {ordered.map((r) => (
                    <RuleRow
                      key={r.id}
                      condition={r.words}
                      scope={r.scope}
                      scopeLabel={r.scopeLabel}
                      owner={r.owner}
                      expires={r.expires}
                      timesFired={r.timesFired}
                      timesOverridden={r.timesOverridden}
                      onOpen={() => {}}
                    />
                  ))}
                </Card>
              </div>
            </div>
          )}

          {/* ---------- Situations ---------- */}
          {tab === "situations" && (
            <div className="flex flex-col" style={{ gap: "var(--space-8)" }}>
              <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                <span className="t-meta ink-tertiary">
                  The spot-check bar gets longer as the level goes up. That looks
                  backwards until you think about it: whatever you automate is
                  what people stop watching, so that is exactly where somebody
                  has to look on purpose.
                </span>
                <Card>
                  {situations.map((s) => (
                    <div key={s.id} className="flex flex-col">
                      <PatternRow
                        name={s.name}
                        rung={s.rung}
                        timesSeen={s.timesSeen}
                        agreementRate={s.agreementRate}
                        excludedBecause={s.excludedBecause}
                        onOpen={() => {}}
                      />
                      {s.lastMove && (
                        <span
                          className="t-meta ink-tertiary"
                          style={{
                            padding: "0 var(--space-5) var(--space-4)",
                            marginTop: -2,
                          }}
                        >
                          {s.lastMove}
                        </span>
                      )}
                      {s.rung !== "excluded" && s.rung < 4 && (
                        <div
                          className="flex flex-row items-center"
                          style={{
                            padding: "0 var(--space-5) var(--space-5)",
                            gap: "var(--space-4)",
                          }}
                        >
                          <Button variant="secondary" size="sm">
                            Promote to level {s.rung + 1}
                          </Button>
                          {/* The trade, stated before it is made. */}
                          <span className="t-meta ink-tertiary">
                            spot checks go from {s.sampling} to{" "}
                            {SAMPLING_AT_RUNG[(s.rung + 1) as 2 | 3 | 4]}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </div>

              {/* Their own group, at the bottom. Excluded is a different kind of
                * thing from a low score, and naming these three is what makes
                * the rest of the ladder credible. */}
              <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                <span className="t-title ink-primary">Never automated</span>
                <span className="t-meta ink-tertiary">
                  Not situations stuck at level one. A different kind of thing,
                  and naming them is what makes the ladder above credible.
                </span>
                <Card>
                  {exclusions.map((s) => (
                    <PatternRow
                      key={s.id}
                      name={s.name}
                      rung={s.rung}
                      timesSeen={s.timesSeen}
                      agreementRate={s.agreementRate}
                      excludedBecause={s.excludedBecause}
                    />
                  ))}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
