"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  CURRENT_CYCLE,
  cycleOptions,
  workspaces,
  type PropertyWorkspace,
  type StatusKey,
} from "@/lib/seed";
import { Overlay, OverlayCard } from "./ui/Overlay";
import { IconButton } from "./ui/Button";
import { CyclePicker } from "./ui/CyclePicker";
import { StatusChip } from "./ui/Status";

interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  /* The host resolves the property by id. */
  onSelect: (propertyId: string, cycle: string) => void;
}

/* What wants a person, first. Same ordering as the Reconciliation nav, so a
 * reader who has just come from there finds the list in the order they left it. */
const STATE_RANK: Record<StatusKey, number> = {
  failed: 0,
  review: 1,
  active: 2,
  "not-started": 3,
  completed: 4,
};

export function NewSessionModal({ open, onClose, onSelect }: NewSessionModalProps) {
  const [query, setQuery] = useState("");
  /* The cycle the session will be started in. It used to be pinned to the
   * current one and handed up regardless, which made a modal whose whole job is
   * "start a session" unable to say which period it was starting. */
  const [cycle, setCycle] = useState(CURRENT_CYCLE);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCycle(CURRENT_CYCLE);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces
      .filter((p) => {
        if (!q) return true;
        return (
          p.address.toLowerCase().includes(q) ||
          p.shortAddress.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.cityState.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state]);
  }, [query]);

  return (
    <Overlay open={open} onDismiss={onClose}>
      <OverlayCard
        width={704}
        style={{
          height: "min(520px, calc(100vh - 48px))",
          borderRadius: "var(--radius-panel)",
          display: "flex",
          flexDirection: "column",
          padding: "var(--pad-panel)",
          gap: "var(--space-5)",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select a property"
          className="flex flex-col"
          style={{ flex: 1, minHeight: 0, gap: "var(--space-5)" }}
        >
          <Header cycle={cycle} onCycleChange={setCycle} onClose={onClose} />

          <div
            className="flex flex-col"
            style={{
              flex: 1,
              minHeight: 0,
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              background: "var(--surface-list)",
              borderRadius: "var(--radius-sheet)",
              boxShadow: "var(--shadow-depth-1)",
            }}
          >
            <SearchBar value={query} onChange={setQuery} />
            <List
              properties={filtered}
              onPick={(id) => onSelect(id, cycle)}
              emptyQuery={query.trim().length === 0}
            />
          </div>
        </div>
      </OverlayCard>
    </Overlay>
  );
}

function Header({
  cycle,
  onCycleChange,
  onClose,
}: {
  cycle: string;
  onCycleChange: (c: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex flex-row justify-between items-start"
      style={{ width: "100%", flexShrink: 0, gap: "var(--space-5)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="t-heading" style={{ color: "var(--ink-primary)" }}>
          Select a property
        </span>
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          Start a new reconciliation session
        </span>
      </div>

      <div
        className="flex flex-row items-center shrink-0"
        style={{ gap: "var(--space-4)" }}
      >
        <CyclePicker
          value={cycle}
          options={cycleOptions}
          onChange={onCycleChange}
        />
        <IconButton variant="ghost" size="md" onClick={onClose} ariaLabel="Close">
          <X size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  /* The ring belongs on the shell, not on the input: the input is a bare
   * transparent child, so a ring drawn on it would circle the text run alone
   * and collide with the search glyph beside it. `outline: none` below was
   * beating the app's global focus rule and leaving the field with no
   * indicator at all — the same 2px accent and offset are restored here.
   * React state rather than :focus-within because this surface is styled
   * inline. */
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        height: "var(--control-lg)",
        padding: "0 12px",
        gap: "var(--space-4)",
        background: "var(--surface-input)",
        border: "1px solid var(--line-inner-white)",
        borderRadius: "var(--radius-control)",
        flexShrink: 0,
        ...(focused
          ? { outline: "2px solid var(--dot-active)", outlineOffset: 2 }
          : {}),
      }}
    >
      <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search properties"
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-primary)",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function List({
  properties,
  onPick,
  emptyQuery,
}: {
  properties: PropertyWorkspace[];
  onPick: (id: string) => void;
  emptyQuery: boolean;
}) {
  if (properties.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          flex: 1,
          minHeight: 0,
          padding: 24,
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-secondary)",
          textAlign: "center",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: "var(--type-body)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          No properties match
        </span>
        <span>
          {emptyQuery
            ? "Add a property in Properties."
            : "Try a different name, code, or city."}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-y-auto scroll-thin"
      style={{ flex: 1, minHeight: 0 }}
    >
      {properties.map((p) => (
        <PropertyRow key={p.id} property={p} onPick={() => onPick(p.id)} />
      ))}
    </div>
  );
}

function PropertyRow({
  property,
  onPick,
}: {
  property: PropertyWorkspace;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="list-row flex flex-row justify-between items-center text-left shrink-0"
      style={{
        width: "100%",
        height: "var(--row-lg)",
        padding: "0 8px",
        gap: "var(--space-5)",
        /* The one listing-row hover: lift to white on a hairline, no fill
         * change loud enough to flash. Resting border is transparent so the row
         * does not shift under the pointer. */
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        transition: "background 140ms ease, border-color 140ms ease",
        fontFamily: "inherit",
      }}
    >
      <div className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
        <span
          className="t-title truncate"
          style={{ color: "var(--ink-primary)" }}
        >
          {property.shortAddress}
        </span>
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-meta)",
            color: "var(--ink-tertiary)",
          }}
        >
          {property.code} · {property.cityState}
        </span>
      </div>

      <div
        className="flex flex-col items-end"
        style={{ gap: 4, flexShrink: 0 }}
      >
        <StatusChip status={property.state} />
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-meta)",
            color: "var(--ink-tertiary)",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {property.meta} · Last closed {property.lastClosed}
        </span>
      </div>
    </button>
  );
}
