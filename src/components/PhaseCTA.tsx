"use client";

import { Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "./ui/Button";
import { ConfirmPopoverButton } from "./ui/ConfirmPopoverButton";
import { StatusDot } from "./ui/Status";
import { useSession } from "@/lib/session/SessionProvider";
import { hasAnyPairReady } from "@/lib/session/reducer";

/* Header CTA. Owns the actions that belong at the session's altitude:
 *
 *   draft           → Run reconciliation
 *   running         → Importing ledgers…   (disabled, loader)
 *   reconciling     → Reconciling…         (disabled, loader)
 *   review          → (none — Summary agent owns Review + Post)
 *   updating-yardi  → Posting to Yardi…    (disabled, loader — ambient status)
 *   failed          → Retry run
 *   complete        → Start next cycle
 *
 * Post to Yardi has moved into the Summary agent panel where it lives beside
 * the Review records CTA and the insight it commits. The header stays quiet
 * once the reviewer's attention needs to shift right. */

export function PhaseCTA() {
  const { state, startRun, startNextCycle, retryRun } = useSession();
  const { runState } = state;

  /* A broken run's only useful header action is to run it again. Before this
   * branch existed a failed session fell through to the draft CTA and offered
   * "Run reconciliation" as though nothing had happened. */
  if (runState === "failed") {
    return (
      <Button
        variant="primary"
        size="md"
        onClick={retryRun}
        leftIcon={<RotateCcw size={14} strokeWidth={1.75} />}
      >
        Retry run
      </Button>
    );
  }

  if (runState === "draft") {
    const ready = hasAnyPairReady(state);
    return (
      <Button
        variant="primary"
        size="md"
        disabled={!ready}
        onClick={startRun}
        rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
      >
        Run reconciliation
      </Button>
    );
  }

  if (runState === "running") {
    return <BusyButton label="Importing ledgers…" />;
  }

  if (runState === "reconciling") {
    return <BusyButton label="Reconciling…" />;
  }

  if (runState === "review") {
    /* No arrow. This is a status, not a control — it reports where the run has
     * got to and the Summary agent beside it carries the action. An arrow
     * inside something that cannot be clicked is the same broken promise as a
     * chevron on a menu that does not open. */
    return <QuietStatus label="Ready for review" />;
  }

  if (runState === "updating-yardi") {
    return <BusyButton label="Posting to Yardi…" />;
  }

  // complete
  return (
    <ConfirmPopoverButton
      label="Start next cycle"
      variant="secondary"
      confirmTitle="Reset for the next cycle?"
      confirmBody={
        <>
          The current cycle&apos;s posted records stay in Yardi. This canvas
          will clear so you can upload new statements for the next month.
        </>
      }
      confirmLabel="Start next cycle"
      onConfirm={startNextCycle}
    />
  );
}

function BusyButton({ label }: { label: string }) {
  return (
    <Button
      variant="primary"
      size="md"
      disabled
      leftIcon={
        <Loader2
          size={14}
          strokeWidth={1.75}
          className="animate-spin"
          style={{ opacity: 0.85 }}
        />
      }
    >
      {label}
    </Button>
  );
}

/* Quiet header-anchored status label. Non-actionable pill that reads as an
 * ambient hint rather than a call to action — because the actual action has
 * moved to the Summary agent.
 *
 * On --control-lg, which is where it belongs: it sits in a header row beside a
 * 28px button and a 32px chip, and at its old 40px it was both the tallest
 * thing in that row and the only height in the app off the control scale. */
function QuietStatus({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: "var(--control-lg)",
        padding: "0 12px",
        gap: "var(--space-3)",
        background: "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      <StatusDot status="review" />
      {label}
    </span>
  );
}
