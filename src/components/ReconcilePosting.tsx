"use client";

/* Sending, and the three ways it goes wrong.
 *
 * THE UI MUST SHOW WHICH ENTRIES LANDED AND WHICH DID NOT. That is the
 * requirement, and it is why this is a list of entries rather than a spinner
 * and a result. "Some of it went through" is only a crisis when nobody can say
 * which parts.
 *
 * ---------------------------------------------------------------------------
 * The key is printed, not just held
 *
 * Every entry shows its idempotency key. It is derived from the reconciliation
 * and the entry's own identity and nothing else, so it is the same key on the
 * first attempt and the fourth — which is the reason a retry after a dropped
 * connection cannot create a second copy of something that already landed.
 *
 * Showing it is the difference between asking somebody to trust a retry and
 * letting them see why it is safe. It costs one line of eleven-pixel text.
 *
 * ---------------------------------------------------------------------------
 * Undo is the strongest trust feature in the product
 *
 * It reverses what LANDED, which on a partial post is not the whole batch: the
 * rejected entries never reached the ledger, and writing a correction for
 * something that does not exist is its own kind of error. The button says how
 * many it will reverse, before it is pressed.
 *
 * And it is gated on the period being open. After close, an undo becomes a
 * correction in the NEXT period rather than a rewrite of this one — the guard
 * is in code, in session/types.ts, and this screen reads it rather than
 * restating it.
 *
 * Spec: docs/RECONCILER_PLAYBOOK.md Part 8 prompt 6, docs/FLOWS.md F5.
 */

import { useEffect, useState } from "react";
import { Check, RotateCcw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmPopoverButton } from "@/components/ui/ConfirmPopoverButton";
import { Money } from "@/components/entities/Money";
import {
  batchOutcome,
  counts,
  retryBatch,
  reverseBatch,
  settleEntry,
  type PostedEntry,
  type PostingBatch,
} from "@/lib/posting";
import { canReverse, type Period, type Reconciliation } from "@/lib/session/types";

const SEND_MS = 130;

/* ---------- One entry ---------- */

function EntryRow({ entry }: { entry: PostedEntry }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{
        minHeight: "var(--row-lg)",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-row)",
        background:
          entry.state === "rejected" ? "var(--status-danger-bg)" : "transparent",
      }}
    >
      <span className="shrink-0" style={{ marginTop: 3, lineHeight: 0 }}>
        {entry.state === "sent" ? (
          <Check
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{ color: "var(--status-ok-ink)" }}
            aria-hidden
          />
        ) : entry.state === "rejected" ? (
          <X
            size="var(--icon-sm)"
            strokeWidth="var(--stroke-sm)"
            style={{ color: "var(--status-danger-ink)" }}
            aria-hidden
          />
        ) : (
          <span
            aria-hidden
            style={{
              display: "block",
              width: 6,
              height: 6,
              margin: "4px 4px",
              borderRadius: 999,
              background: "var(--line)",
            }}
          />
        )}
      </span>

      <div className="flex flex-col min-w-0 flex-1" style={{ gap: 2 }}>
        <span className="t-body ink-primary truncate">
          {entry.description}
        </span>
        <span className="t-meta ink-tertiary nums truncate">
          {entry.kind === "correcting-entry"
            ? "journal entry"
            : "cleared mark"}{" "}
          · {entry.glAccount} · {entry.idempotencyKey}
        </span>
        {entry.rejectedBecause && (
          <span
            className="t-prose"
            style={{ color: "var(--status-danger-ink)" }}
          >
            {entry.rejectedBecause}
          </span>
        )}
      </div>

      {entry.amount !== undefined && (
        <Money
          amount={entry.amount}
          form="signed"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

/* ---------- The screen ---------- */

export function ReconcilePosting({
  initial,
  reconciliation,
  period,
  onUndone,
  onDismiss,
}: {
  initial: PostingBatch;
  reconciliation: Reconciliation;
  period: Period;
  /* Called when a post is reversed, so the screen above can release the
   * signature and let the month be signed again. */
  onUndone: () => void;
  /* Called when the person is finished reading the reversal. Separate from
   * `onUndone` on purpose: an undo that vanishes the screen it happened on
   * leaves somebody staring at a proof wondering whether it worked. The
   * reversal states what came back out, and clearing it is their decision. */
  onDismiss: () => void;
}) {
  const [batch, setBatch] = useState<PostingBatch>(initial);

  /* Entries go one at a time. Not decoration: sending a batch as one call is
   * what makes "some of it landed" unanswerable, and the whole point of the
   * keys is that each entry is its own unit. */
  useEffect(() => {
    if (batch.state !== "posting") return;
    const next = batch.entries.findIndex((e) => e.state === "waiting");
    if (next === -1) {
      setBatch((b) => ({ ...b, state: batchOutcome(b.entries) }));
      return;
    }
    const id = window.setTimeout(() => {
      setBatch((b) => ({
        ...b,
        entries: b.entries.map((e, i) =>
          i === next ? settleEntry(e, b.attempt) : e
        ),
      }));
    }, SEND_MS);
    return () => window.clearTimeout(id);
  }, [batch]);

  const c = counts(batch.entries);
  const reverseGuard = canReverse(
    { ...reconciliation, state: "posted" },
    period
  );

  const headline =
    batch.state === "posting"
      ? `Sending · ${c.sent + c.rejected} of ${c.total}`
      : batch.state === "posted"
        ? "Sent"
        : batch.state === "partially-posted"
          ? `Half sent · ${c.sent} of ${c.total} landed`
          : batch.state === "post-failed"
            ? "Nothing landed"
            : "Reversed";

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
      <div
        className="flex flex-col"
        style={{
          background: "var(--surface-card)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-7)",
          gap: "var(--space-6)",
        }}
      >
        <div
          className="flex flex-row items-end justify-between flex-wrap"
          style={{ gap: "var(--space-6)" }}
        >
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="t-label">
              Into {batch.period}
              {batch.attempt > 1 && ` · attempt ${batch.attempt}`}
            </span>
            <span className="t-title ink-primary">{headline}</span>
            <span className="t-meta ink-tertiary nums">
              {c.corrections} journal{" "}
              {c.corrections === 1 ? "entry" : "entries"} · {c.marks} cleared
              marks
            </span>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
          {batch.entries.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </div>
      </div>

      {/* ---------- What to do about it ---------- */}
      {batch.state !== "posting" && (
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
          {batch.state === "partially-posted" || batch.state === "post-failed" ? (
            <>
              <span className="t-prose ink-secondary">
                {c.sent} of {c.total} reached the ledger and {c.rejected} did
                not. Retrying re-sends only what failed, and every entry keeps
                the key it already had, so anything that already landed cannot
                land twice.
              </span>
              <div
                className="flex flex-row flex-wrap"
                style={{ gap: "var(--space-4)" }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={
                    <RotateCcw
                      size="var(--icon-sm)"
                      strokeWidth="var(--stroke-sm)"
                    />
                  }
                  onClick={() => setBatch(retryBatch(batch))}
                >
                  Retry the {c.rejected} that failed
                </Button>
                <ConfirmPopoverButton
                  label={`Reverse the ${c.sent} that landed`}
                  variant="secondary"
                  size="lg"
                  confirmTitle="Reverse what landed"
                  confirmBody={`${c.sent} ${
                    c.sent === 1 ? "entry" : "entries"
                  } reached the ledger and will be backed out. The ${
                    c.rejected
                  } that were refused never got there, so there is nothing to reverse for them.`}
                  confirmLabel="Reverse them"
                  disabled={!reverseGuard.allowed}
                  onConfirm={() => {
                    setBatch(reverseBatch(batch));
                    onUndone();
                  }}
                />
              </div>
            </>
          ) : batch.state === "posted" ? (
            <>
              <span className="t-prose ink-secondary">
                Every entry landed. The month is written into {batch.period},
                and a frozen copy of the documents, the rules that ran and your
                name went with it.
              </span>
              {/* The undo. Cheap to build, and the single strongest thing this
                * product can show somebody who has to sign for the result. */}
              <div className="flex flex-col items-start" style={{ gap: "var(--space-3)" }}>
                <ConfirmPopoverButton
                  label="Undo this post"
                  variant="secondary"
                  size="lg"
                  leftIcon={
                    <Undo2
                      size="var(--icon-sm)"
                      strokeWidth="var(--stroke-sm)"
                    />
                  }
                  confirmTitle={`Back out all ${c.sent} entries?`}
                  confirmBody={`${c.corrections} journal ${
                    c.corrections === 1 ? "entry" : "entries"
                  } and ${c.marks} cleared marks come back out of ${
                    batch.period
                  }. The reconciliation returns to proven and can be signed again.`}
                  confirmLabel="Undo it"
                  disabled={!reverseGuard.allowed}
                  onConfirm={() => {
                    setBatch(reverseBatch(batch));
                    onUndone();
                  }}
                />
                {/* A switched-off button says why, and the sentence comes from
                  * the guard rather than being written twice. */}
                {!reverseGuard.allowed && (
                  <span className="t-meta ink-tertiary">
                    {reverseGuard.because}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start" style={{ gap: "var(--space-5)" }}>
              <span className="t-prose ink-secondary">
                {c.total - c.rejected > 0
                  ? `${c.total - c.rejected} entries have been backed out of ${batch.period}.`
                  : `Nothing had landed, so nothing came back out.`}{" "}
                The reconciliation is proven again and waiting for a signature.
                Their idempotency keys are unchanged, so signing again re-sends
                the same entries under the same keys.
              </span>
              <Button variant="secondary" size="md" onClick={onDismiss}>
                Back to the proof
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
