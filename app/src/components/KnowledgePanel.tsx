"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  activeProperty,
  guidanceEntries as seedGuidance,
  type GuidanceAgent,
  type GuidanceEntry,
} from "@/lib/seed";

/* ---- Agent visuals ----
 * Mirrors AGENT_VISUAL in AgentsPanel — three agents, three accent colors
 * matched to the workspace status-dot palette so a glance at an entry's dot
 * tells the reviewer which agent the rule steers. */
const AGENT_META: Record<
  GuidanceAgent,
  { label: string; dot: string }
> = {
  intake: { label: "Intake", dot: "#001AFF" },
  reconciliation: { label: "Reconciliation", dot: "#1EFF00" },
  summary: { label: "Summary", dot: "#FF0000" },
};

type View = "active" | "archived";

export function KnowledgePanel() {
  const [entries, setEntries] = useState<GuidanceEntry[]>(seedGuidance);
  const [view, setView] = useState<View>("active");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCount = useMemo(
    () => entries.filter((e) => !e.archived).length,
    [entries]
  );
  const archivedCount = useMemo(
    () => entries.filter((e) => e.archived).length,
    [entries]
  );

  /* Sort: load-bearing first (applied this cycle desc), then totalApplied,
   * then by capturedAt (kept lexically rough — the seed labels share a year
   * scope so this is good enough for the prototype). */
  const visible = useMemo(() => {
    const filtered = entries.filter((e) =>
      view === "active" ? !e.archived : e.archived
    );
    return [...filtered].sort((a, b) => {
      if (a.appliedThisCycle !== b.appliedThisCycle) {
        return b.appliedThisCycle - a.appliedThisCycle;
      }
      return b.totalApplied - a.totalApplied;
    });
  }, [entries, view]);

  function handleAdd(rule: string, agent: GuidanceAgent) {
    const newEntry: GuidanceEntry = {
      id: `g-${Date.now()}`,
      rule,
      agent,
      capturedAt: "Today",
      capturedFromSessionLabel: "May 2026",
      appliedThisCycle: 0,
      totalApplied: 0,
      archived: false,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setComposerOpen(false);
  }

  function toggleArchive(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, archived: !e.archived } : e))
    );
    setExpandedId(null);
  }

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 16, minHeight: 0, flex: 1 }}
    >
      {/* Sub-header — eyebrow, segmented tabs, + Add, counter row */}
      <div
        className="flex flex-col items-start"
        style={{ width: "100%", gap: 10 }}
      >
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-2)",
          }}
        >
          {activeProperty.shortAddress} guidance
        </span>
        <div
          className="flex flex-row items-center"
          style={{ width: "100%", gap: 8 }}
        >
          <Segmented
            view={view}
            onChange={setView}
            activeCount={activeCount}
            archivedCount={archivedCount}
          />
          <div className="flex-1" />
          <AddPill
            active={composerOpen}
            onClick={() => setComposerOpen((v) => !v)}
          />
        </div>
      </div>

      {/* Inline composer — slides in above the list when + Add is clicked. */}
      {composerOpen && (
        <Composer
          onCancel={() => setComposerOpen(false)}
          onSave={handleAdd}
        />
      )}

      {/* Entry list (or empty state) */}
      {visible.length === 0 ? (
        <EmptyState view={view} onAdd={() => setComposerOpen(true)} />
      ) : (
        <div
          className="scroll-thin"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
            paddingRight: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {visible.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === entry.id ? null : entry.id))
              }
              onArchive={() => toggleArchive(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Segmented tabs (Active · Archived) ---------- */

function Segmented({
  view,
  onChange,
  activeCount,
  archivedCount,
}: {
  view: View;
  onChange: (v: View) => void;
  activeCount: number;
  archivedCount: number;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: 28,
        padding: 2,
        gap: 2,
        background: "var(--surface-input)",
        border: "1px solid var(--line-inner-white)",
        borderRadius: 8,
      }}
    >
      <SegmentedTab
        active={view === "active"}
        onClick={() => onChange("active")}
        label="Active"
        count={activeCount}
      />
      <SegmentedTab
        active={view === "archived"}
        onClick={() => onChange("archived")}
        label="Archived"
        count={archivedCount}
      />
    </div>
  );
}

function SegmentedTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-row items-center transition"
      style={{
        height: 24,
        padding: "0 10px",
        gap: 6,
        background: active ? "#FFFFFF" : "transparent",
        border: active ? "1px solid var(--line-inner-white)" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: 6,
        fontSize: 12,
        lineHeight: "14px",
        color: active ? "var(--text-1)" : "var(--text-placeholder)",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span
        className="tabular-nums"
        style={{
          fontSize: 11,
          lineHeight: "13px",
          color: active ? "var(--text-2)" : "var(--text-4)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ---------- + Add pill ---------- */

function AddPill({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-row items-center justify-center transition"
      style={{
        height: 28,
        padding: "0 10px 0 8px",
        gap: 4,
        background: active ? "#FFFFFF" : "var(--surface-card-glow)",
        border: "1px solid var(--line-inner-white)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--text-1)",
      }}
      aria-label={active ? "Close composer" : "Add guidance"}
    >
      {active ? (
        <X size={13} strokeWidth={1.75} color="var(--text-1)" />
      ) : (
        <Plus size={13} strokeWidth={1.75} color="var(--text-1)" />
      )}
      <span style={{ fontSize: 12, lineHeight: "14px" }}>
        {active ? "Cancel" : "Add"}
      </span>
    </button>
  );
}

/* ---------- Inline composer ---------- */

function Composer({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (rule: string, agent: GuidanceAgent) => void;
}) {
  const [rule, setRule] = useState("");
  const [agent, setAgent] = useState<GuidanceAgent>("reconciliation");

  const canSave = rule.trim().length > 0;

  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 12,
        gap: 10,
        background: "var(--surface-card-glow)",
        border: "1px solid var(--line-inner-white)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 10,
      }}
    >
      <textarea
        autoFocus
        value={rule}
        onChange={(e) => setRule(e.target.value)}
        placeholder="What should the AI remember about this property?"
        rows={3}
        className="scroll-thin"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "18px",
          color: "var(--text-1)",
          background: "transparent",
          border: "none",
          outline: "none",
          resize: "none",
          minHeight: 54,
        }}
      />
      <AgentSelect agent={agent} onChange={setAgent} />
      <div
        className="flex flex-row items-center justify-end"
        style={{ width: "100%", gap: 6, minWidth: 0 }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 28,
            padding: "0 12px",
            background: "transparent",
            border: "none",
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => canSave && onSave(rule.trim(), agent)}
          disabled={!canSave}
          className="flex flex-row items-center justify-center transition"
          style={{
            height: 28,
            padding: "0 14px",
            gap: 6,
            background: canSave
              ? "var(--action-primary)"
              : "rgba(26,31,37,0.35)",
            border: "1px solid var(--action-primary)",
            boxShadow: canSave ? "var(--shadow-chip)" : "none",
            borderRadius: 999,
            color: "var(--action-on-primary)",
            cursor: canSave ? "pointer" : "not-allowed",
            fontSize: 12,
            lineHeight: "14px",
          }}
        >
          Save rule
        </button>
      </div>
    </div>
  );
}

function AgentSelect({
  agent,
  onChange,
}: {
  agent: GuidanceAgent;
  onChange: (a: GuidanceAgent) => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: 24,
        padding: 2,
        gap: 2,
        background: "var(--surface-input)",
        border: "1px solid var(--line-inner-white)",
        borderRadius: 6,
      }}
    >
      {(["intake", "reconciliation", "summary"] as GuidanceAgent[]).map((a) => {
        const meta = AGENT_META[a];
        const active = agent === a;
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className="flex flex-row items-center"
            style={{
              height: 20,
              padding: "0 8px",
              gap: 4,
              background: active ? "#FFFFFF" : "transparent",
              border: active ? "1px solid var(--line-inner-white)" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 11,
              lineHeight: "13px",
              color: active ? "var(--text-1)" : "var(--text-placeholder)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: meta.dot,
                border: "1px solid #FFFFFF",
                display: "inline-block",
              }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Entry card ---------- */

function EntryCard({
  entry,
  expanded,
  onToggle,
  onArchive,
}: {
  entry: GuidanceEntry;
  expanded: boolean;
  onToggle: () => void;
  onArchive: () => void;
}) {
  const [hover, setHover] = useState(false);
  const meta = AGENT_META[entry.agent];
  const isArchived = entry.archived;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-start transition"
      style={{
        width: "100%",
        padding: 12,
        gap: 8,
        background: hover || expanded ? "#FFFFFF" : "var(--surface-card)",
        border: "1px solid",
        borderColor:
          hover || expanded ? "var(--line-inner-white)" : "transparent",
        boxShadow: hover || expanded ? "var(--shadow-chip)" : "none",
        borderRadius: 10,
        cursor: "pointer",
        opacity: isArchived ? 0.72 : 1,
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      {/* Rule sentence */}
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: "18px",
          color: "var(--text-1)",
          letterSpacing: "-0.005em",
          ...(expanded
            ? {}
            : {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }),
        }}
      >
        {entry.rule}
      </p>

      {/* Footer row — agent chip · applied count · provenance */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8, minWidth: 0 }}
      >
        <AgentChip agent={entry.agent} />
        <AppliedStat
          appliedThisCycle={entry.appliedThisCycle}
          totalApplied={entry.totalApplied}
          archived={isArchived}
        />
        <div className="flex-1 min-w-0" />
        <span
          className="truncate"
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-4)",
            minWidth: 0,
            textAlign: "right",
          }}
          title={
            entry.capturedFromRecordTitle
              ? `From ${entry.capturedFromRecordTitle} · ${entry.capturedFromSessionLabel}`
              : `Captured ${entry.capturedFromSessionLabel}`
          }
        >
          {entry.capturedFromSessionLabel}
        </span>
      </div>

      {/* Expanded — provenance line + action row */}
      {expanded && (
        <div
          className="flex flex-col items-start"
          style={{
            width: "100%",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(157,179,197,0.18)",
          }}
        >
          {entry.capturedFromRecordTitle ? (
            <div
              className="flex flex-row items-center"
              style={{ width: "100%", gap: 6 }}
            >
              <span
                style={{
                  fontSize: 11,
                  lineHeight: "14px",
                  color: "var(--text-2)",
                }}
              >
                From
              </span>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-row items-center transition"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  gap: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: "14px",
                  color: "var(--text-1)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  textDecorationColor: "rgba(48,59,69,0.3)",
                }}
                title="Open source record"
              >
                {entry.capturedFromRecordTitle}
                <ArrowUpRight
                  size={11}
                  strokeWidth={1.75}
                  color="var(--text-2)"
                />
              </button>
              <span
                style={{
                  fontSize: 11,
                  lineHeight: "14px",
                  color: "var(--text-4)",
                }}
              >
                · captured {entry.capturedAt}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-4)",
              }}
            >
              Captured {entry.capturedAt} · added directly
            </span>
          )}

          <div
            className="flex flex-row items-center"
            style={{ width: "100%", gap: 8 }}
          >
            <span
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-2)",
              }}
            >
              Applied {entry.totalApplied}× since captured
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="flex flex-row items-center transition"
              style={{
                height: 24,
                padding: "0 10px",
                gap: 4,
                background: "transparent",
                border: "1px solid rgba(157,179,197,0.35)",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 11,
                lineHeight: "13px",
                color: "var(--text-2)",
              }}
            >
              {isArchived ? (
                <>
                  <RotateCcw size={11} strokeWidth={1.75} />
                  Restore
                </>
              ) : (
                <>
                  <Archive size={11} strokeWidth={1.75} />
                  Archive
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentChip({ agent }: { agent: GuidanceAgent }) {
  const meta = AGENT_META[agent];
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: 20,
        padding: "0 8px 0 6px",
        gap: 5,
        background: "var(--surface-chip)",
        border: "1px solid var(--line-inner-white)",
        borderRadius: 999,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: meta.dot,
          border: "1px solid #FFFFFF",
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontSize: 11,
          lineHeight: "13px",
          color: "var(--text-1)",
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}

function AppliedStat({
  appliedThisCycle,
  totalApplied,
  archived,
}: {
  appliedThisCycle: number;
  totalApplied: number;
  archived: boolean;
}) {
  if (archived) {
    return (
      <span
        style={{
          fontSize: 11,
          lineHeight: "14px",
          color: "var(--text-4)",
        }}
      >
        Applied {totalApplied}×
      </span>
    );
  }
  if (appliedThisCycle === 0) {
    return (
      <span
        style={{
          fontSize: 11,
          lineHeight: "14px",
          color: "var(--text-4)",
        }}
      >
        Not applied this cycle
      </span>
    );
  }
  return (
    <span
      className="tabular-nums"
      style={{
        fontSize: 11,
        lineHeight: "14px",
        color: "var(--text-1)",
      }}
    >
      Applied <strong style={{ fontWeight: 500 }}>{appliedThisCycle}×</strong>{" "}
      this cycle
    </span>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({
  view,
  onAdd,
}: {
  view: View;
  onAdd: () => void;
}) {
  if (view === "archived") {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{ width: "100%", gap: 12, padding: "40px 16px" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--surface-card)",
            border: "1px solid var(--line-inner-white)",
            boxShadow: "var(--shadow-chip)",
          }}
        >
          <Archive size={20} strokeWidth={1.25} color="var(--text-4)" />
        </div>
        <span
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
            textAlign: "center",
          }}
        >
          No archived guidance for this property.
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center flex-1"
      style={{ width: "100%", gap: 14, padding: "32px 16px" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "var(--surface-card-glow)",
          border: "1px solid var(--line-inner-white)",
          boxShadow: "var(--shadow-chip)",
        }}
      >
        <BookOpen size={22} strokeWidth={1.25} color="#7C8C9A" />
      </div>
      <div
        className="flex flex-col items-center"
        style={{ gap: 6, maxWidth: 280 }}
      >
        <span
          style={{
            fontSize: 15,
            lineHeight: "19px",
            color: "var(--text-1)",
            textAlign: "center",
          }}
        >
          No guidance captured yet
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: "17px",
            color: "var(--text-2)",
            textAlign: "center",
          }}
        >
          As you leave guidance on records during review, it&apos;ll show up
          here for the AI to use next time.
        </span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-row items-center justify-center transition"
        style={{
          height: 30,
          padding: "0 14px 0 11px",
          gap: 6,
          background: "var(--surface-card-glow)",
          border: "1px solid var(--line-inner-white)",
          boxShadow: "var(--shadow-chip)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--text-1)",
        }}
      >
        <Plus size={13} strokeWidth={1.75} color="var(--text-1)" />
        <span style={{ fontSize: 12, lineHeight: "14px" }}>Add a rule</span>
      </button>
    </div>
  );
}
