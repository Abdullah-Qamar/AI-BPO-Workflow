"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  SquareChevronLeft,
  SquareChevronRight,
  X,
} from "lucide-react";
import {
  activeProperty,
  otherWorkspaces,
  type PropertyWorkspace,
  type WorkspaceStatus,
} from "@/lib/seed";
import { StatusDot } from "./StatusDot";
import { useOptionalSession } from "@/lib/session/SessionProvider";
import type { RunState } from "@/lib/session/types";

type SortKey = "activity" | "az" | "urgency";
type StatusKey = "all" | "attention" | "active" | "complete";

const SORT_LABELS: Record<SortKey, string> = {
  activity: "Latest activity",
  az: "A–Z",
  urgency: "Status urgency",
};

const STATUS_LABELS: Record<StatusKey, string> = {
  all: "All",
  attention: "Needs attention",
  active: "Active",
  complete: "Complete",
};

/* Priority per status when sorting by urgency: attention first, then active,
 * then complete, then unmarked. */
const URGENCY_RANK: Record<string, number> = {
  failed: 0,
  active: 1,
  complete: 3,
  null: 2,
};

/* Maps the live runState onto the WorkspaceStatus the session row uses to
 * pick its colored dot. Only the user's active session reflects runState —
 * other sessions keep their seeded snapshot status. */
function statusForRunState(runState: RunState): WorkspaceStatus {
  switch (runState) {
    case "complete":
      return "complete";
    case "draft":
    case "running":
    case "reconciling":
    case "review":
    case "updating-yardi":
    default:
      return "active";
  }
}

export function WorkspaceNav({
  selectedSessionId,
  onSelectSession,
  collapsed = false,
  onToggle,
}: {
  /* null = no session opened yet — the canvas shows the empty workspace. */
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (collapsed) {
    /* Sliver matches the LeftRail's visual weight: same 56-px column, same
     * icon-button geometry. Lighter than before so the collapsed nav reads
     * as a peer of the rail, not a competing surface. */
    return (
      <aside
        className="flex flex-col items-start shrink-0"
        style={{
          width: 56,
          padding: "20px 10px",
          gap: 12,
          borderRight: "1px solid var(--line)",
          background: "transparent",
          /* Sticky — the workspaces nav stays anchored while the canvas scrolls. */
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
          zIndex: 15,
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center justify-center transition"
          style={{
            width: 36,
            height: 36,
            padding: 8,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--text-2)",
            cursor: "pointer",
          }}
          aria-label="Expand workspaces"
          title="Expand workspaces"
        >
          <SquareChevronRight size={18} strokeWidth={1.75} />
        </button>
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
        style={{ width: "100%", height: 18 }}
      >
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-2)",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          Workspaces
        </span>
        <button
          onClick={onToggle}
          style={{
            width: 18,
            height: 18,
            color: "var(--text-2)",
            cursor: "pointer",
          }}
          aria-label="Collapse workspaces"
          title="Collapse workspaces"
        >
          <SquareChevronLeft size={18} strokeWidth={1.75} />
        </button>
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
}: {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activity");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");

  const all = useMemo(
    () => [activeProperty, ...otherWorkspaces],
    []
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = all.filter((w) => {
      if (statusFilter === "attention" && w.status !== "failed") return false;
      if (statusFilter === "active" && w.status !== "active") return false;
      if (statusFilter === "complete" && w.status !== "complete") return false;
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
        (a, b) =>
          (URGENCY_RANK[a.status ?? "null"] ?? 99) -
          (URGENCY_RANK[b.status ?? "null"] ?? 99)
      );
    }
    // "activity" sort keeps the seeded order (active property first).
    return rows;
  }, [all, query, sort, statusFilter]);

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
              fontSize: 12,
              lineHeight: "15px",
              color: "var(--text-2)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-1)" }}>
              No workspaces match
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
        height: 30,
        padding: "6px 6px 6px 10px",
        gap: 8,
        background: focused ? "#FFFFFF" : "var(--surface-input)",
        border: focused
          ? "1px solid rgba(0, 26, 255, 0.35)"
          : "1px solid var(--line-inner-white)",
        borderRadius: 8,
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      <Search size={13} strokeWidth={1.75} color="#63696E" />
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
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-1)",
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
            color: "var(--text-2)",
            cursor: "pointer",
          }}
        >
          <X size={12} strokeWidth={1.75} />
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
  statusFilter: StatusKey;
  setStatusFilter: (s: StatusKey) => void;
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
          width: 30,
          height: 30,
          background: open || badgeCount > 0 ? "#FFFFFF" : "var(--surface-input)",
          border:
            open || badgeCount > 0
              ? "1px solid rgba(0, 26, 255, 0.35)"
              : "1px solid var(--line-inner-white)",
          borderRadius: 8,
          cursor: "pointer",
          color: "var(--text-2)",
        }}
        title="Sort and filter"
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
              fontSize: 9,
              lineHeight: "14px",
              fontWeight: 600,
              textAlign: "center",
              boxShadow: "0 0 0 2px #FFFFFF",
            }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Sort and filter workspaces"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 30,
            width: 240,
            padding: 12,
            background: "var(--surface-card)",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-depth-3)",
            borderRadius: 12,
            backgroundImage: "var(--surface-card-glow)",
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
            style={{ gap: 6, marginTop: 4 }}
          >
            {(Object.keys(STATUS_LABELS) as StatusKey[]).map((k) => (
              <FilterChip
                key={k}
                label={STATUS_LABELS[k]}
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
      style={{
        fontSize: 11,
        lineHeight: "14px",
        color: "var(--text-2)",
        marginBottom: 6,
      }}
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
        height: 30,
        padding: "0 8px",
        gap: 8,
        background: selected
          ? "var(--surface-chip)"
          : hover
          ? "rgba(255,255,255,0.7)"
          : "transparent",
        border: selected ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13,
        lineHeight: "16px",
        color: "var(--text-1)",
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
        <Check size={12} strokeWidth={2} />
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
        height: 24,
        padding: "0 10px",
        background: selected ? "var(--surface-chip)" : "rgba(255,255,255,0.6)",
        border: selected
          ? "1px solid rgba(0, 26, 255, 0.35)"
          : "1px solid var(--line-soft)",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12,
        lineHeight: "14px",
        color: "var(--text-1)",
        fontFamily: "inherit",
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
}: {
  workspace: PropertyWorkspace;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
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
      >
        <div className="relative shrink-0" style={{ width: 16, height: 16, marginTop: 1 }}>
          <Building2 size={16} strokeWidth={1.25} color="#656C76" />
          {workspace.status && (
            <span
              className="absolute"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                right: -2,
                bottom: -2,
                background:
                  workspace.status === "active"
                    ? "var(--dot-active)"
                    : workspace.status === "failed"
                    ? "var(--dot-failed)"
                    : "var(--dot-complete)",
              }}
            />
          )}
        </div>
        <div
          className="flex flex-col justify-center items-stretch flex-1 min-w-0"
          style={{ gap: 2 }}
        >
          <span
            className="truncate"
            style={{
              fontSize: 14,
              lineHeight: "18px",
              color: "var(--text-1)",
            }}
          >
            {workspace.address}
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: "15px",
              color: "var(--text-2)",
            }}
          >
            {workspace.meta}
          </span>
        </div>
        <span
          className="shrink-0"
          style={{ width: 16, height: 16, color: "#43484E", marginTop: 1 }}
        >
          {expanded ? (
            <ChevronDown size={16} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={16} strokeWidth={1.5} />
          )}
        </span>
      </button>

      {expanded && workspace.sessions.length > 0 && (
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
          <div
            className="flex flex-col items-start"
            style={{ width: "100%", gap: 2 }}
          >
            {workspace.sessions.map((s) => {
              const selected = s.id === selectedSessionId;
              // For the currently selected session, override the seeded
              // status with the live runState so the dot moves with the cycle.
              // Falls back to the seeded status when no run has started yet.
              const liveStatus =
                selected && liveRunState
                  ? statusForRunState(liveRunState)
                  : s.status;
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
                    status={liveStatus}
                    onClick={() => onSelectSession(s.id)}
                  />
                </div>
              );
            })}
          </div>
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
  status,
  onClick,
}: {
  label: string;
  selected: boolean;
  status: WorkspaceStatus;
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
      className="flex flex-row justify-center items-center flex-1 text-left transition"
      style={{
        height: 28,
        padding: "6px 10px",
        gap: 8,
        background,
        border,
        boxShadow: shadow,
        borderRadius: 6,
        transition:
          "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
      }}
    >
      <StatusDot status={status} />
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-1)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
