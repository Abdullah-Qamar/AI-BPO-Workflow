"use client";

/* ConfirmPopoverButton — button + dismissible popover for irreversible actions.
 *
 * Popover anchors to the button's bottom-right edge and closes on outside
 * click, Escape, or Cancel. Confirm dispatches the wrapped action.
 *
 * Used by PhaseCTA ("Start next cycle") and the Summary agent panel
 * ("Post to Yardi") — two commit surfaces that both need the same
 * "are you sure?" gesture, hence extracted into a shared primitive. */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button, type ButtonVariant, type ButtonSize } from "./Button";

export function ConfirmPopoverButton({
  label,
  sublabel,
  variant,
  size = "md",
  rightIcon,
  leftIcon,
  fullWidth,
  confirmTitle,
  confirmBody,
  confirmLabel,
  onConfirm,
  disabled,
  align = "right",
  style,
  ariaLabel,
}: {
  label: string;
  sublabel?: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  rightIcon?: ReactNode;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  confirmTitle: string;
  confirmBody: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  /* Which edge of the trigger the popover aligns to. */
  align?: "left" | "right";
  style?: CSSProperties;
  ariaLabel?: string;
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
    <div
      ref={ref}
      style={{
        position: "relative",
        width: fullWidth ? "100%" : "auto",
        ...style,
      }}
    >
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen((o) => !o)}
        rightIcon={rightIcon}
        leftIcon={leftIcon}
        fullWidth={fullWidth}
        disabled={disabled}
        ariaLabel={ariaLabel ?? label}
      >
        {sublabel ? (
          <span
            className="flex flex-col items-start"
            style={{ gap: 2, lineHeight: 1 }}
          >
            <span>{label}</span>
            <span
              style={{
                fontSize: 11,
                lineHeight: "13px",
                opacity: 0.7,
              }}
            >
              {sublabel}
            </span>
          </span>
        ) : (
          label
        )}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={confirmTitle}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [align]: 0,
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
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
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
