"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CURRENT_CYCLE,
  STATUS_META,
  STORED_STATES,
  findSession,
  workspaces,
  type PropertyWorkspace,
  type StatusKey,
} from "@/lib/seed";
import { StatusDot } from "./ui/Status";
import { Button, IconButton } from "./ui/Button";
import { useOptionalSession } from "@/lib/session/SessionProvider";
import type { RunState } from "@/lib/session/types";

type SortKey = "activity" | "az" | "urgency";
/* The filter is "all, or one display state". It used to be its own four-value
 * enum compared against the stored WorkspaceStatus, which is why it could only
 * offer three of the five states and spelled two of them differently from every
 * other surface. */
type FilterKey = "all" | StatusKey;

const SORT_LABELS: Record<SortKey, string> = {
  activity: "Latest activity",
  az: "A–Z",
  urgency: "Status urgency",
};

/* Only the states a stored session can be in, plus "all". "active" is a
 * runtime state — a run executing right now — and no session in the list is
 * ever in it, so offering it as a chip would be offering a filter that always
 * comes back empty. The row's own dot still turns "active" while a session is
 * running. */
const FILTER_KEYS: FilterKey[] = ["all", ...STORED_STATES];

function filterLabel(key: FilterKey): string {
  return key === "all" ? "All" : STATUS_META[key].label;
}

/* Priority per state when sorting by urgency: what wants a person first. Same
 * ordering the seed's own nav rank uses. */
const URGENCY_RANK: Record<StatusKey, number> = {
  failed: 0,
  review: 1,
  active: 2,
  "not-started": 3,
  completed: 4,
};

/* Maps the live runState onto the display state the session row's mark uses.
 * Only the user's active session reflects runState — other sessions keep their
 * seeded snapshot state. */
function stateForRunState(runState: RunState): StatusKey {
  switch (runState) {
    case "complete":
      return "completed";
    case "failed":
      return "failed";
    case "review":
      return "review";
    case "draft":
    case "running":
    case "reconciling":
    case "updating-yardi":
    default:
      return "active";
  }
}

export function WorkspaceNav({
  selectedSessionId,
  onSelectSession,
  onStartSession,
  collapsed = false,
  onToggle,
}: {
  /* null = no session opened yet — the canvas shows the empty workspace. */
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  /* Opens a fresh session on a property that has none this cycle. */
  onStartSession?: (propertyId: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (collapsed) {
    /* Sliver matches the LeftRail's collapsed column: same 60-px width, same
     * centred single file of controls, so the two read as one icon gutter
     * rather than two nearly-identical ones. It said 56 and was left-aligned,
     * which put its toggle off the rail's own centre line by four pixels and
     * off centre in its own column by seven.
     *
     * The vertical padding stays at 20 rather than following the rail's 12:
     * expanded, the collapse control sits in a header row at that offset, and
     * matching it is what keeps the button from jumping when you fold the
     * panel away. */
    return (
      <aside
        className="flex flex-col items-center shrink-0"
        style={{
          width: 60,
          padding: "var(--space-7) 0",
          gap: 12,
          borderRight: "1px solid var(--line)",
          background: "transparent",
          /* Sticky — the sessions nav stays anchored while the canvas scrolls. */
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
          zIndex: 15,
        }}
      >
        <IconButton
          variant="ghost"
          size="md"
          onClick={onToggle}
          ariaLabel="Expand sessions panel"
        >
          <PanelLeftOpen size={16} strokeWidth={1.5} />
        </IconButton>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 300,
        borderRight: "1px solid var(--line)",
        background: "transparent",
        /* Sticky — pinned to viewport; internal list scrolls independently. */
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        zIndex: 15,
      }}
    >
      <NavHeader onToggle={onToggle} />

      <NavList
        selectedSessionId={selectedSessionId}
        onSelectSession={onSelectSession}
        onStartSession={onStartSession}
      />
    </aside>
  );
}

/* Search + filter + sort — compact, all three condensed into one header
 * region. The search input is functional (typed value filters the list live).
 * The sort/filter icon opens a popover with a small radio group for sort and
 * a chip row for status filter so both dimensions coexist in one compact UI. */
function NavHeader({ onToggle }: { onToggle?: () => void }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ padding: "20px 16px 14px", gap: 12 }}
    >
      <div
        className="flex flex-row justify-between items-center"
        style={{ width: "100%", height: "var(--control-md)" }}
      >
        {/* "Sessions", not "Workspaces": the rail item and the page are called
          * Reconciliation, and what this column picks is a session. */}
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          Sessions
        </span>
        <IconButton
          variant="ghost"
          size="md"
          onClick={onToggle}
          ariaLabel="Collapse sessions panel"
          style={{ marginRight: -6 }}
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </div>
  );
}

/* NavList — owns the query / sort / status state and renders the search bar
 * + filter popover + filtered rows. Header lives in NavHeader; this holds the
 * interactive controls right above the scrollable list. */
function NavList({
  selectedSessionId,
  onSelectSession,
  onStartSession,
}: {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onStartSession?: (propertyId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activity");
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = workspaces.filter((w) => {
      if (statusFilter !== "all" && w.state !== statusFilter) return false;
      if (!q) return true;
      return (
        w.address.toLowerCase().includes(q) ||
        w.shortAddress.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.cityState.toLowerCase().includes(q)
      );
    });
    if (sort === "az") {
      rows = [...rows].sort((a, b) =>
        a.shortAddress.localeCompare(b.shortAddress)
      );
    } else if (sort === "urgency") {
      rows = [...rows].sort(
        (a, b) => URGENCY_RANK[a.state] - URGENCY_RANK[b.state]
      );
    }
    // "activity" sort keeps the seeded order (what wants a person, first).
    return rows;
  }, [query, sort, statusFilter]);

  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (sort !== "activity" ? 1 : 0);

  return (
    <>
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
        <SearchInput value={query} onChange={setQuery} />
        <FilterSortButton
          sort={sort}
          setSort={setSort}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          badgeCount={activeFilters}
        />
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: "24px 16px",
              gap: 4,
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-tertiary)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: "var(--type-body)",
                color: "var(--ink-primary)",
              }}
            >
              No properties match
            </span>
            <span>Try clearing the filter or a different search term.</span>
          </div>
        ) : (
          visible.map((w) => (
            <WorkspaceItem
              key={w.id}
              workspace={w}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              onStartSession={onStartSession}
            />
          ))
        )}
      </div>
    </>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex flex-row items-center flex-1"
      style={{
        height: "var(--control-md)",
        padding: "0 6px 0 10px",
        gap: 8,
        background: focused ? "#FFFFFF" : "var(--surface-input)",
        border: focused
          ? "1px solid rgba(0, 26, 255, 0.35)"
          : "1px solid var(--line-inner-white)",
        borderRadius: "var(--radius-control)",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search"
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
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex items-center justify-center"
          style={{
            width: 16,
            height: 16,
            background: "transparent",
            border: "none",
            padding: 0,
            color: "var(--ink-secondary)",
            cursor: "pointer",
          }}
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

function FilterSortButton({
  sort,
  setSort,
  statusFilter,
  setStatusFilter,
  badgeCount,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
  statusFilter: FilterKey;
  setStatusFilter: (s: FilterKey) => void;
  badgeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Sort and filter"
        aria-expanded={open}
        className="relative flex items-center justify-center transition"
        style={{
          width: "var(--control-md)",
          height: "var(--control-md)",
          background: open || badgeCount > 0 ? "#FFFFFF" : "var(--surface-input)",
          border:
            open || badgeCount > 0
              ? "1px solid rgba(0, 26, 255, 0.35)"
              : "1px solid var(--line-inner-white)",
          borderRadius: "var(--radius-control)",
          cursor: "pointer",
          color: "var(--ink-secondary)",
        }}
        data-hint="Sort and filter"
      >
        <SlidersHorizontal size={14} strokeWidth={1.75} />
        {badgeCount > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 14,
              height: 14,
              padding: "0 4px",
              background: "var(--dot-active)",
              color: "#FFFFFF",
              borderRadius: 999,
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              fontWeight: "var(--weight-medium)",
              textAlign: "center",
              boxShadow: "0 0 0 2px #FFFFFF",
            }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        /* The contract's popover recipe, now `.glass`: fill, hairline, rim and
         * depth all come from the one class, so this sheet cannot drift from
         * every other menu. Radius and the 4px inset stay here because they are
         * this popover's own geometry — the sections carry their own inset so
         * the rows still line up with the chips below them. */
        <div
          role="dialog"
          aria-label="Sort and filter properties"
          className="glass"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 30,
            width: 240,
            padding: 4,
            borderRadius: "var(--radius-sheet)",
          }}
        >
          <SectionLabel>Sort by</SectionLabel>
          <div className="flex flex-col" style={{ gap: 2, marginBottom: 12 }}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <MenuRadio
                key={k}
                label={SORT_LABELS[k]}
                selected={sort === k}
                onClick={() => setSort(k)}
              />
            ))}
          </div>
          <SectionLabel>Filter by status</SectionLabel>
          <div
            className="flex flex-row flex-wrap"
            style={{ gap: 6, marginTop: 4, padding: "0 4px 4px" }}
          >
            {FILTER_KEYS.map((k) => (
              <FilterChip
                key={k}
                label={filterLabel(k)}
                selected={statusFilter === k}
                onClick={() => setStatusFilter(k)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="t-label"
      style={{ padding: "4px 8px 0", marginBottom: 6 }}
    >
      {children}
    </div>
  );
}

function MenuRadio({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center transition text-left"
      style={{
        width: "100%",
        height: "var(--row-md)",
        padding: "0 8px",
        gap: 8,
        /* Translucent white on a translucent sheet — an opaque fill here would
         * punch a hole in the one blurred surface on screen. Same 0.72 every
         * menu row in the app hovers to. */
        background: selected
          ? "var(--surface-chip)"
          : hover
          ? "rgba(255, 255, 255, 0.72)"
          : "transparent",
        border: selected ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-primary)",
        fontFamily: "inherit",
      }}
    >
      <span
        aria-hidden
        className="flex items-center justify-center shrink-0"
        style={{
          width: 14,
          height: 14,
          color: selected ? "var(--dot-active)" : "transparent",
        }}
      >
        <Check size={14} strokeWidth={1.75} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center transition"
      style={{
        height: "var(--control-sm)",
        padding: "0 10px",
        background: selected ? "var(--surface-chip)" : "rgba(255,255,255,0.6)",
        border: selected
          ? "1px solid rgba(0, 26, 255, 0.35)"
          : "1px solid var(--line-soft)",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        color: "var(--ink-primary)",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function WorkspaceItem({
  workspace,
  selectedSessionId,
  onSelectSession,
  onStartSession,
}: {
  workspace: PropertyWorkspace;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onStartSession?: (propertyId: string) => void;
}) {
  const [expanded, setExpanded] = useState(!!workspace.expanded);
  /* useOptionalSession because the nav also renders before a session is opened,
   * which means there's no SessionProvider in scope yet. */
  const session = useOptionalSession();
  const liveRunState: RunState | null = session?.state.runState ?? null;

  return (
    <div
      className="flex flex-col items-start"
      style={{
        padding: "14px 0",
        gap: 8,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex flex-row items-start text-left"
        style={{ width: "100%", padding: "0 16px", gap: 10 }}
        aria-expanded={expanded}
        aria-label={`${workspace.address} · ${workspace.meta} · ${
          STATUS_META[workspace.state].label
        }`}
        /* Ten of the twelve addresses are longer than the 215px this column
         * gives them, so the row that names the property is the one row on the
         * screen a reader cannot finish. The accessible name already carried
         * the whole thing; the hint is how a sighted reader gets at it. */
        data-hint={workspace.address}
        data-hint-side="right"
      >
        <div
          className="relative shrink-0"
          style={{ width: 16, height: 16, marginTop: 1 }}
        >
          <Building2 size={16} strokeWidth={1.5} color="var(--ink-tertiary)" />
          <StatusDot
            status={workspace.state}
            style={{ position: "absolute", right: -3, bottom: -3 }}
          />
        </div>
        <div
          className="flex flex-col justify-center items-stretch flex-1 min-w-0"
          style={{ gap: 2 }}
        >
          <span
            className="truncate"
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
            }}
          >
            {workspace.address}
          </span>
          <span
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              letterSpacing: "var(--tracking-meta)",
              color: "var(--ink-tertiary)",
            }}
          >
            {workspace.meta}
          </span>
        </div>
        <span
          className="shrink-0"
          style={{
            width: 16,
            height: 16,
            color: "var(--ink-secondary)",
            marginTop: 1,
          }}
        >
          {expanded ? (
            <ChevronDown size={16} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={16} strokeWidth={1.5} />
          )}
        </span>
      </button>

      {expanded && (
        <div
          className="flex flex-col items-start"
          style={{ width: "100%", gap: 8 }}
        >
          <div
            style={{
              marginLeft: 16,
              marginRight: 16,
              alignSelf: "stretch",
              height: 1,
              background: "var(--line)",
            }}
          />
          {workspace.sessions.length === 0 ? (
            /* Expanding a property with nothing under it used to rotate the
             * chevron and reveal an empty gap. One property in the portfolio is
             * genuinely in this state, and what it needs is the way out of it. */
            <div
              className="flex flex-col items-start"
              /* Same gutters as the session rows this block stands in for, so
               * the two states of one list are inset identically. */
              style={{ width: "100%", padding: "0 12px 0 26px", gap: 8 }}
            >
              <span
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  letterSpacing: "var(--tracking-meta)",
                  color: "var(--ink-tertiary)",
                }}
              >
                No session for {CURRENT_CYCLE}.
              </span>
              {onStartSession && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStartSession(workspace.id)}
                >
                  Start a session
                </Button>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-start"
              style={{ width: "100%", gap: 2 }}
            >
              {workspace.sessions.map((s) => {
                const selected = s.id === selectedSessionId;
                // For the currently selected session, override the seeded
                // state with the live runState so the mark moves with the cycle.
                // Falls back to the seeded state when no run has started yet.
                const liveState =
                  selected && liveRunState
                    ? stateForRunState(liveRunState)
                    : s.statusKey;
                /* A failed session carries the reason it failed. The nav row is
                 * where the reader meets that session first, so it says why
                 * rather than making them open the run to find out. The note is
                 * on the session record, not on the nav's slimmer row type. */
                const note =
                  liveState === "failed"
                    ? findSession(s.id)?.session.note
                    : undefined;
                return (
                  <div
                    key={s.id}
                    className="flex flex-row items-start"
                    style={{
                      width: "100%",
                      padding: "0 12px 0 26px",
                      gap: 8,
                    }}
                  >
                    <SessionNavRow
                      label={s.label}
                      selected={selected}
                      state={liveState}
                      note={note}
                      onClick={() => onSelectSession(s.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* SessionNavRow — child of WorkspaceItem. Pulled into its own component so it
 * can carry per-row hover state without re-rendering siblings. Unselected rows
 * get a quiet white-translucent hover so the user has feedback that the row is
 * interactive; selected rows keep the lifted chip surface. */
function SessionNavRow({
  label,
  selected,
  state,
  note,
  onClick,
}: {
  label: string;
  selected: boolean;
  state: StatusKey;
  note?: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  const background = selected
    ? "var(--surface-chip)"
    : hover
    ? "rgba(255, 255, 255, 0.55)"
    : "transparent";
  const border = selected
    ? "1px solid #FFFFFF"
    : hover
    ? "1px solid rgba(255, 255, 255, 0.65)"
    : "1px solid transparent";
  const shadow = selected ? "var(--shadow-chip)" : "none";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-start flex-1 min-w-0 text-left transition"
      aria-label={`Open ${label} session · ${STATUS_META[state].label}`}
      aria-current={selected ? "true" : undefined}
      style={{
        minHeight: "var(--row-sm)",
        padding: "6px 10px",
        gap: 8,
        background,
        border,
        boxShadow: shadow,
        borderRadius: "var(--radius-row)",
        transition:
          "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      }}
    >
      {/* Nudged onto the first line's optical centre, since the row grows to
        * two lines when a failure note is present. */}
      <StatusDot status={state} style={{ marginTop: 5 }} />
      <span className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          {label}
        </span>
        {note && (
          <span
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              letterSpacing: "var(--tracking-meta)",
              color: "var(--status-danger-ink)",
            }}
          >
            {note}
          </span>
        )}
      </span>
    </button>
  );
}
