"use client";

import { useState } from "react";
import {
  ArrowDownUp,
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  SquareChevronLeft,
  SquareChevronRight,
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
      }}
    >
      {/* Header: title + search. One step down from canvas type so the nav
       * reads as a quieter sibling, not a peer. */}
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
        <div
          className="flex flex-row items-center"
          style={{ width: "100%", gap: 8 }}
        >
          <div
            className="flex flex-row items-center flex-1"
            style={{
              height: 30,
              padding: "6px 8px 6px 10px",
              gap: 8,
              background: "var(--surface-input)",
              border: "1px solid var(--line-inner-white)",
              borderRadius: 8,
            }}
          >
            <Search size={13} strokeWidth={1.75} color="#63696E" />
            <span
              style={{
                fontSize: 13,
                lineHeight: "16px",
                color: "var(--text-placeholder)",
              }}
            >
              Search
            </span>
          </div>
          <button
            style={{
              width: 18,
              height: 18,
              color: "var(--text-2)",
              cursor: "pointer",
            }}
            aria-label="Sort"
          >
            <ArrowDownUp size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        <WorkspaceItem
          workspace={activeProperty}
          selectedSessionId={selectedSessionId}
          onSelectSession={onSelectSession}
        />
        {otherWorkspaces.map((w) => (
          <WorkspaceItem
            key={w.id}
            workspace={w}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
          />
        ))}
      </div>
    </aside>
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
  const shadow = selected
    ? "var(--shadow-chip)"
    : hover
    ? "var(--shadow-depth-1)"
    : "none";

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
