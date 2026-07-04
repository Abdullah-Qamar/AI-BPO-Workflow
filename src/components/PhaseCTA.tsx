"use client";

import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import { ConfirmPopoverButton } from "./ui/ConfirmPopoverButton";
import { useSession } from "@/lib/session/SessionProvider";
import { hasAnyPairReady } from "@/lib/session/reducer";

/* Header CTA. Owns the actions that belong at the workspace altitude:
 *
 *   draft           → Run reconciliation
 *   running         → Importing ledgers…   (disabled, loader)
 *   reconciling     → Reconciling…         (disabled, loader)
 *   review          → (none — Summary agent owns Review + Post)
 *   updating-yardi  → Posting to Yardi…    (disabled, loader — ambient status)
 *   complete        → Start next cycle
 *
 * Post to Yardi has moved into the Summary agent panel where it lives beside
 * the Review records CTA and the insight it commits. The header stays quiet
 * once the reviewer's attention needs to shift right. */

export function PhaseCTA() {
  const { state, startRun, startNextCycle } = useSession();
  const { runState } = state;

  if (runState === "draft") {
    const ready = hasAnyPairReady(state);
    return (
      <Button
        variant="primary"
        size="md"
        disabled={!ready}
        onClick={startRun}
        rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
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
    return <QuietStatus label="Ready for review · see Summary →" />;
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
 * moved to the Summary agent. Kept at button-height so the header row
 * doesn't reflow when the run enters review. */
function QuietStatus({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: 40,
        padding: "0 16px",
        gap: 8,
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(157, 179, 197, 0.35)",
        borderRadius: 999,
        fontSize: 13,
        lineHeight: "16px",
        color: "var(--text-2)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: "var(--dot-active)",
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
