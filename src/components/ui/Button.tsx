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

const SIZE: Record<
  ButtonSize,
  { height: number; padX: number; gap: number; font: number; line: string }
> = {
  sm: { height: 32, padX: 12, gap: 6, font: 14, line: "17px" },
  md: { height: 40, padX: 18, gap: 8, font: 15, line: "19px" },
  lg: { height: 48, padX: 22, gap: 10, font: 16, line: "19px" },
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
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      className="inline-flex items-center justify-center transition"
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
        transform: press ? "translateY(0)" : "translateY(0)",
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
      background: hover ? "#EFF3F8" : "#F2F4FB",
      color: "var(--text-1)",
      border: "1px solid #FFFFFF",
      boxShadow: press ? "var(--shadow-depth-1)" : "var(--shadow-chip)",
    };
  }
  // ghost
  return {
    background: hover ? "rgba(0, 0, 0, 0.03)" : "transparent",
    color: "var(--text-1)",
    border: "1px solid transparent",
    boxShadow: "none",
  };
}

/* Icon-only round button (used for compact controls like the "+" / arrow
 * buttons in the references). 32 / 40 / 48 sizes. */
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
  const d = size === "sm" ? 32 : size === "md" ? 36 : 40;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
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
