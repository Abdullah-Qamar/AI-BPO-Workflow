"use client";

/* Spot checks — the flow that had no screen.
 *
 * Work nobody flagged, looked at on purpose. Without it the escaped-error count
 * has no source at all, and a reviewer who only ever sees exceptions slowly
 * forgets what normal looks like.
 *
 * ---------------------------------------------------------------------------
 * Why the cards here have no buttons on them
 *
 * A spot check is not a decision. The machine already made one, and the job is
 * to look at it and say whether it holds. So the match renders read-only and
 * the only two answers are "looks right" and "found a problem" — four disabled
 * resolution buttons would invite a click and then refuse it, which is worse
 * than not offering the row.
 *
 * ---------------------------------------------------------------------------
 * The queue says why it picked each one
 *
 * A model aims the attention; a person does the looking, because a machine
 * checking its own work finds nothing it did not already believe. Each item
 * carries its reason, and one in four is drawn at random — the only stratum
 * that can turn up something nobody suspected, because a sample made purely of
 * what the system already suspects inherits the system's blind spots.
 *
 * ---------------------------------------------------------------------------
 * Finding a problem does something, in front of you
 *
 * It lands in the escaped-error count on Quality, and it moves the situation's
 * override rate. Whether that crosses the demotion line is arithmetic, and the
 * screen shows the arithmetic either way — including the case where one finding
 * against 1,180 observations correctly changes nothing. A screen that demoted
 * something dramatically on a single click would be teaching the wrong lesson
 * about what evidence is.
 *
 * Spec: docs/FLOWS.md F8, docs/AI_ARCHITECTURE.md Part 6.
 */

import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, Check, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MatchCard } from "@/components/entities/MatchCard";
import { Money } from "@/components/entities/Money";
import { difference } from "@/lib/reconciliation/match";
import {
  demotionCheck,
  getFindings,
  record,
  sampleQueue,
  STRATUM_WORDS,
  subscribe,
  type SampleItem,
} from "@/lib/sampling";

const REVIEWER = "N. Okafor";

function useFindings() {
  return useSyncExternalStore(subscribe, getFindings, getFindings);
}

/* ---------- The queue ---------- */

function QueueRow({
  item,
  verdict,
  selected,
  onOpen,
}: {
  item: SampleItem;
  verdict: "confirmed" | "problem" | null;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-row items-center w-full text-left"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
        background: selected ? "#FFFFFF" : "transparent",
        border: `1px solid ${selected ? "var(--line-row-hover)" : "transparent"}`,
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        cursor: "pointer",
        fontFamily: "inherit",
        opacity: verdict ? 0.6 : 1,
      }}
    >
      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">
          {item.match.bankLines[0]?.typeMeaning ??
            item.match.ledgerRows[0]?.description ??
            "Item"}
        </span>
        <span className="t-meta ink-tertiary truncate">
          {STRATUM_WORDS[item.stratum]}
          {verdict === "confirmed" && " · looked right"}
          {verdict === "problem" && " · problem found"}
        </span>
      </div>
      <Money
        amount={Math.abs(
          item.match.bankLines[0]?.amount ??
            item.match.ledgerRows[0]?.amount ??
            0
        )}
        form="plain"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

/* ---------- The screen ---------- */

export function SpotCheckCanvas({ onBack }: { onBack: () => void }) {
  const queue = sampleQueue();
  const findings = useFindings();
  const [openId, setOpenId] = useState<string | null>(queue[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);

  const item = queue.find((q) => q.id === openId) ?? null;
  const verdictFor = (id: string) =>
    findings.find((f) => f.itemId === id)?.verdict ?? null;
  const currentFinding = item
    ? findings.find((f) => f.itemId === item.id) ?? null
    : null;

  const checked = queue.filter((q) => verdictFor(q.id)).length;
  const problems = findings.filter((f) => f.verdict === "problem").length;

  const confirm = () => {
    if (!item || currentFinding) return;
    record({
      itemId: item.id,
      verdict: "confirmed",
      note: "",
      situationId: item.situationId,
      by: REVIEWER,
      at: new Date().toISOString(),
    });
  };

  const report = () => {
    if (!item || !note.trim()) return;
    record({
      itemId: item.id,
      verdict: "problem",
      note: note.trim(),
      situationId: item.situationId,
      by: REVIEWER,
      at: new Date().toISOString(),
    });
    setNote("");
    setWriting(false);
  };

  const demotion =
    currentFinding?.verdict === "problem" && item?.situationId
      ? demotionCheck(item.situationId)
      : null;

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
          style={{ gap: "var(--space-7)", paddingBottom: "var(--space-10)" }}
        >
          {/* ---------- Header ---------- */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                <ArrowLeft
                  size="var(--icon-sm)"
                  strokeWidth="var(--stroke-sm)"
                />
              }
              onClick={onBack}
              style={{ alignSelf: "flex-start" }}
            >
              Back to Close
            </Button>

            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-4)" }}
            >
              <ShieldQuestion
                size="var(--icon-lg)"
                strokeWidth="var(--stroke-md)"
                style={{ color: "var(--ink-tertiary)" }}
                aria-hidden
              />
              <h1 className="canvas-title ink-primary">Spot checks</h1>
            </div>

            <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <span className="t-prose ink-secondary">
                Work nobody flagged, looked at on purpose. This list grows as the
                system does more of the work on its own, because whatever gets
                automated is what stops being watched. It is not a backlog you
                are behind on.
              </span>
              <span className="t-meta ink-tertiary nums">
                {checked} of {queue.length} checked
                {problems > 0 &&
                  ` · ${problems} ${
                    problems === 1 ? "problem" : "problems"
                  } found`}
              </span>
            </div>
          </div>

          {/* ---------- Queue and item ---------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 320px) minmax(340px, 1fr)",
              gap: "var(--space-5)",
              alignItems: "start",
            }}
          >
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
              <div
                className="flex flex-col"
                style={{ padding: "var(--space-3) var(--space-5)", gap: 2 }}
              >
                <span className="t-label">Chosen for you to look at</span>
                <span className="t-meta ink-tertiary">
                  Three by risk, one at random.
                </span>
              </div>
              {queue.map((q) => (
                <QueueRow
                  key={q.id}
                  item={q}
                  verdict={verdictFor(q.id)}
                  selected={openId === q.id}
                  onOpen={() => {
                    setOpenId(q.id);
                    setWriting(false);
                    setNote("");
                  }}
                />
              ))}
            </div>

            {item ? (
              <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
                {/* Why this one. A queue that does not say why it picked
                  * something teaches a reviewer to work it mechanically. */}
                <div
                  className="flex flex-col"
                  style={{
                    background: "var(--surface-card)",
                    borderRadius: "var(--radius-card)",
                    boxShadow: "var(--shadow-card)",
                    padding: "var(--space-6)",
                    gap: "var(--space-3)",
                  }}
                >
                  <span className="t-label">
                    Why this one · {STRATUM_WORDS[item.stratum]}
                  </span>
                  <span className="t-prose ink-secondary">
                    {item.chosenBecause}
                  </span>
                  <span className="t-meta ink-tertiary">
                    A model chose what to look at. You do the looking, because a
                    machine checking its own work finds nothing it did not
                    already believe.
                  </span>
                </div>

                {/* Read-only: this is a look, not a decision. */}
                <MatchCard match={item.match} readOnly />

                {/* ---------- The verdict ---------- */}
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
                  {currentFinding ? (
                    <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                      <div
                        className="flex flex-row items-center"
                        style={{ gap: "var(--space-3)" }}
                      >
                        <Check
                          size="var(--icon-sm)"
                          strokeWidth="var(--stroke-sm)"
                          style={{ color: "var(--ink-secondary)" }}
                          aria-hidden
                        />
                        <span
                          className="t-body ink-primary"
                          style={{ fontWeight: "var(--weight-medium)" }}
                        >
                          {currentFinding.verdict === "confirmed"
                            ? "Checked and it holds"
                            : "Problem recorded"}
                        </span>
                      </div>
                      {currentFinding.note && (
                        <span className="t-prose ink-secondary">
                          {currentFinding.note}
                        </span>
                      )}
                      <span className="t-meta ink-tertiary">
                        {currentFinding.by} · this check is now part of the run
                        record.
                      </span>

                      {currentFinding.verdict === "problem" && (
                        <div
                          className="flex flex-col"
                          style={{
                            gap: "var(--space-3)",
                            paddingTop: "var(--space-5)",
                            borderTop: "1px solid var(--line-hair)",
                          }}
                        >
                          <span className="t-label">What it did</span>
                          <span className="t-prose ink-secondary">
                            It counts toward errors that got through, on
                            Quality. That figure has two sources and this is
                            one of them.
                          </span>
                          {/* The arithmetic, either way. A screen that demoted
                            * something dramatically on one click would teach
                            * the wrong lesson about what evidence is. */}
                          {demotion && (
                            <span className="t-prose ink-secondary">
                              {demotion.sentence}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : writing ? (
                    <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                      <span className="t-label">
                        What is wrong with it · required
                      </span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="What the machine got wrong, and how you know."
                        className="t-body"
                        style={{
                          padding: "var(--space-5)",
                          borderRadius: "var(--radius-control)",
                          border: "1px solid var(--line-menu)",
                          background: "#FFFFFF",
                          color: "var(--ink-primary)",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <span className="t-meta ink-tertiary">
                        A problem without a description cannot be counted or
                        learned from. It would be a feeling.
                      </span>
                      <div
                        className="flex flex-row"
                        style={{ gap: "var(--space-4)" }}
                      >
                        <Button
                          variant="primary"
                          size="md"
                          disabled={!note.trim()}
                          onClick={report}
                        >
                          Record the problem
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            setWriting(false);
                            setNote("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                      <span className="t-body ink-secondary">
                        Does this hold? The difference on it is{" "}
                        <Money
                          amount={difference(item.match)}
                          form="signed"
                          style={{
                            fontSize: "var(--type-body)",
                            lineHeight: "var(--leading-ui)",
                          }}
                        />
                        , and nobody has looked at it before now.
                      </span>
                      <div
                        className="flex flex-row flex-wrap"
                        style={{ gap: "var(--space-4)" }}
                      >
                        <Button variant="primary" size="md" onClick={confirm}>
                          Looks right
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => setWriting(true)}
                        >
                          Found a problem
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-start"
                style={{
                  background: "var(--surface-card)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "var(--shadow-card)",
                  padding: "var(--space-9)",
                  gap: "var(--space-4)",
                }}
              >
                <span className="t-title ink-primary">Nothing to check</span>
                <span className="t-prose ink-secondary">
                  The queue fills at a rate set by how much the system is doing
                  on its own.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
