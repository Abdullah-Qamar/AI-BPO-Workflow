"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useSession } from "@/lib/session/SessionProvider";
import {
  hasAnyPairReady,
  totalApproved,
  totalExceptions,
} from "@/lib/session/reducer";

/* Single primary CTA pinned to the canvas header. Its label, action, and
 * disabled state derive entirely from runState — there is always at most one
 * primary action on the canvas, matching the "one obvious next step" rule.
 *
 * Phase map:
 *   draft           → Run reconciliation        (enabled when ≥1 pair ready)
 *   running         → Importing ledgers…        (disabled, loader)
 *   reconciling     → Reconciling…              (disabled, loader)
 *   review          → Post to Yardi             (enabled; confirm before commit)
 *   updating-yardi  → Posting to Yardi…         (disabled, loader)
 *   complete        → Start next cycle          (enabled; confirm before reset)
 *
 * Irreversible actions (Post to Yardi, Start next cycle) open a small
 * ConfirmPopover anchored to the button — count summary + Confirm/Cancel —
 * before dispatching. Reversible actions (Run reconciliation) dispatch
 * immediately. */

export function PhaseCTA() {
  const { state, startRun, startYardiUpdate, startNextCycle } = useSession();
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
    const approved = totalApproved(state);
    const exceptions = totalExceptions(state);
    return (
      <ConfirmCTA
        label="Post to Yardi"
        variant="primary"
        rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
        confirmTitle="Post approved records to Yardi?"
        confirmBody={
          <>
            You&apos;re committing{" "}
            <strong style={{ color: "#001AFF" }}>{approved} approved</strong>{" "}
            and flagging{" "}
            <strong style={{ color: "#FF0000" }}>
              {exceptions} exceptions
            </strong>
            . Posting writes to Yardi and can&apos;t be undone.
          </>
        }
        confirmLabel="Post to Yardi"
        onConfirm={startYardiUpdate}
      />
    );
  }

  if (runState === "updating-yardi") {
    return <BusyButton label="Posting to Yardi…" />;
  }

  // complete
  return (
    <ConfirmCTA
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

/* ConfirmCTA — button + dismissible popover for irreversible actions. The
 * popover anchors to the button's bottom edge and closes on outside click,
 * Escape, or Cancel. Confirm dispatches the underlying action. */
function ConfirmCTA({
  label,
  variant,
  rightIcon,
  confirmTitle,
  confirmBody,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  variant: "primary" | "secondary";
  rightIcon?: React.ReactNode;
  confirmTitle: string;
  confirmBody: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        variant={variant}
        size="md"
        onClick={() => setOpen((o) => !o)}
        rightIcon={rightIcon}
      >
        {label}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={confirmTitle}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 30,
            width: 320,
            padding: 16,
            background: "var(--surface-card)",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-depth-3)",
            borderRadius: 12,
            backgroundImage: "var(--surface-card-glow)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              lineHeight: "18px",
              color: "var(--text-1)",
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {confirmTitle}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: "18px",
              color: "var(--text-2)",
              marginBottom: 14,
            }}
          >
            {confirmBody}
          </div>
          <div
            className="flex flex-row items-center justify-end"
            style={{ gap: 8 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
