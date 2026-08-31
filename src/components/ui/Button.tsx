"use client";

/* Button primitives.
 *
 *   primary   — dark pill, white text. The strong call-to-action.
 *               Use sparingly: one per screen / section.
 *   secondary — light lifted chip (matches month-picker + nav chips).
 *               Default for most actions.
 *   ghost     — text-only, no background. Inline links and tertiary actions.
 *
 * All three share the same height + radius scale so they line up beside each
 * other if you ever stack them. */

import { useState, type ReactNode, type CSSProperties } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
}

/* Compact scale, matched to the reference (Compact UI References/README.md).
 * Was 32 / 40 / 48 at 14 / 15 / 16px. Controls step down ~25%, and the label
 * settles on --type-body (13px) across all three so buttons stop out-shouting
 * the content they sit beside. */
const SIZE: Record<
  ButtonSize,
  { height: number; padX: number; gap: number; font: string; line: string }
> = {
  sm: { height: 24, padX: 8, gap: 4, font: "var(--type-meta)", line: "16px" },
  md: { height: 28, padX: 12, gap: 6, font: "var(--type-body)", line: "17px" },
  lg: { height: 32, padX: 14, gap: 6, font: "var(--type-body)", line: "17px" },
};

export function Button({
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  onClick,
  children,
  style,
  type = "button",
  ariaLabel,
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const s = SIZE[size];

  const visual = computeVisual(variant, hover, press, disabled);

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      /* The real attribute, not just the look. A control that reads as
       * disabled and stays in the tab order announces as enabled to a screen
       * reader and takes focus a keyboard user cannot act on. */
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      className={`inline-flex items-center transition ${
        fullWidth && (leftIcon || rightIcon)
          ? "justify-between"
          : "justify-center"
      }`}
      style={{
        height: s.height,
        padding: `0 ${s.padX}px`,
        gap: s.gap,
        fontSize: s.font,
        lineHeight: s.line,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        background: visual.background,
        color: visual.color,
        border: visual.border,
        boxShadow: visual.boxShadow,
        ...style,
      }}
    >
      {leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
    </button>
  );
}

function computeVisual(
  variant: ButtonVariant,
  hover: boolean,
  press: boolean,
  disabled: boolean | undefined
) {
  if (variant === "primary") {
    return {
      background: hover
        ? "var(--action-primary-hover)"
        : "var(--action-primary)",
      color: "var(--action-on-primary)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      boxShadow: disabled
        ? "none"
        : press
        ? "var(--shadow-depth-1)"
        : "var(--shadow-depth-2)",
    };
  }
  if (variant === "secondary") {
    return {
      background: hover
        ? "var(--surface-control-hover)"
        : "var(--surface-control)",
      color: "var(--ink-primary)",
      border: "1px solid #FFFFFF",
      boxShadow: press ? "var(--shadow-depth-1)" : "var(--shadow-chip)",
    };
  }
  // ghost
  return {
    background: hover ? "var(--surface-control)" : "transparent",
    color: "var(--ink-primary)",
    border: "1px solid transparent",
    boxShadow: "none",
  };
}

/* Icon-only round button (used for compact controls like the "+" / arrow
 * buttons in the references). 24 / 28 / 32 sizes, matching --control-*. */
export function IconButton({
  variant = "secondary",
  size = "md",
  onClick,
  disabled,
  ariaLabel,
  children,
  style,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const visual = computeVisual(variant, hover, false, disabled);
  const d = size === "sm" ? 24 : size === "md" ? 28 : 32;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center justify-center transition"
      style={{
        width: d,
        height: d,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: visual.background,
        color: visual.color,
        border: visual.border,
        boxShadow: visual.boxShadow,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
