"use client";

/* CyclePicker — the accounting cycle a screen is scoped to.
 *
 * One control, shared by every screen that is scoped to a period, so the cycle
 * is stated once per screen and always in the same place (page header, right,
 * left of the primary action). It used to be a dead pill that looked like a
 * dropdown and was not one, which is worse than plain text: a chevron is a
 * promise.
 *
 * `cycleOptions` is derived from the session history, so every cycle the
 * picker offers is one the data can actually answer for. Choosing an earlier
 * one re-scopes the screen behind it. */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function CyclePicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange?: (cycle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  /* Close on an outside click or Escape. Both, because a menu that only closes
   * on one of the two is the kind of thing that traps a keyboard user. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Accounting cycle: ${value}. Change cycle.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex flex-row items-center"
        style={{
          height: "var(--control-md)",
          padding: "0 8px 0 10px",
          gap: "var(--space-3)",
          background:
            hover || open
              ? "var(--surface-control-hover)"
              : "var(--surface-control)",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
          borderRadius: "var(--radius-control)",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background 120ms ease",
        }}
      >
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          {value}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          color="var(--ink-tertiary)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 140ms ease",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Accounting cycle"
          /* Glass, not a flat white sheet. A menu floats above the page; on a
            * page whose ground is a soft gradient, an opaque white rectangle
            * reads as a hole punched in it. See globals.css `.glass`. */
          className="glass flex flex-col"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 148,
            zIndex: 40,
            borderRadius: "var(--radius-sheet)",
            padding: 4,
          }}
        >
          {options.map((o) => {
            const selected = o === value;
            return (
              <CycleOption
                key={o}
                label={o}
                selected={selected}
                onSelect={() => {
                  onChange?.(o);
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CycleOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      style={{
        height: "var(--row-md)",
        padding: "0 8px",
        gap: "var(--space-4)",
        background: hover ? "rgba(255, 255, 255, 0.7)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "background 120ms ease",
      }}
    >
      <span
        className="nums flex-1"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          fontWeight: selected
            ? "var(--weight-medium)"
            : "var(--weight-regular)",
          color: selected ? "var(--ink-primary)" : "var(--ink-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {/* Fixed-width slot so the labels line up whether or not a tick is drawn. */}
      <span
        className="inline-flex shrink-0"
        style={{ width: 14, justifyContent: "center" }}
        aria-hidden
      >
        {selected && (
          <Check size={14} strokeWidth={1.75} color="var(--ink-secondary)" />
        )}
      </span>
    </button>
  );
}
