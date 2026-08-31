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
  guidanceEntries as seedGuidance,
  type GuidanceAgent,
  type GuidanceEntry,
} from "@/lib/seed";
import { useSession } from "@/lib/session/SessionProvider";
import { Button } from "./ui/Button";

/* ---- Agent identity ----
 * Which agent a rule steers, not how anything is going. These used to be the
 * status palette — intake #001AFF (--dot-active), reconciliation #1EFF00
 * (--dot-complete), summary #FF0000 (--dot-failed) — so a red dot sat beside
 * "Summary" in a UI where red means failed, and a blue one beside "Intake"
 * where blue means a run is in flight. Identity and status are kept
 * structurally apart now. Spec: docs/design-system/decisions.md §4. */
const AGENT_META: Record<
  GuidanceAgent,
  { label: string; dot: string }
> = {
  intake: { label: "Intake", dot: "var(--agent-intake)" },
  reconciliation: {
    label: "Reconciliation",
    dot: "var(--agent-reconciliation)",
  },
  summary: { label: "Summary", dot: "var(--agent-summary)" },
};

type View = "active" | "archived";

/* Rules carry an ISO capture date so they can be sorted; the panel formats it
 * here. Built from a fixed table rather than `toLocaleDateString` so the
 * server and the client render the same string. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCaptured(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function KnowledgePanel({
  /* Opens the record a rule was captured from. The host does not pass this
   * yet, so the provenance link degrades to plain text rather than offering a
   * click that goes nowhere. */
  onOpenRecord,
}: {
  onOpenRecord?: (recordId: string) => void;
} = {}) {
  const { property, session, state, records } = useSession();
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
   * then newest captured. The last step compares ISO dates, which sort
   * correctly as strings; the pre-formatted labels this used to hold put
   * "Dec 11" above "Sep 17" whatever year each belonged to. */
  const visible = useMemo(() => {
    const filtered = entries.filter((e) =>
      view === "active" ? !e.archived : e.archived
    );
    return [...filtered].sort((a, b) => {
      if (a.appliedThisCycle !== b.appliedThisCycle) {
        return b.appliedThisCycle - a.appliedThisCycle;
      }
      if (a.totalApplied !== b.totalApplied) {
        return b.totalApplied - a.totalApplied;
      }
      return b.capturedOn.localeCompare(a.capturedOn);
    });
  }, [entries, view]);

  const currentSessionLabel = session?.label ?? state.cycle;

  function handleAdd(rule: string, agent: GuidanceAgent) {
    const newEntry: GuidanceEntry = {
      id: `g-${Date.now()}`,
      rule,
      agent,
      capturedOn: todayISO(),
      /* Whoever is running this session. Every other rule store names an
       * author and a rule with none cannot be argued with later. */
      capturedBy: session?.ranBy ?? property.accountant,
      /* The run the rule was captured during — the open session, not the
       * hardcoded cycle the panel used to stamp on every rule regardless of
       * which session was open. */
      capturedFromSessionLabel: currentSessionLabel,
      appliedThisCycle: 0,
      totalApplied: 0,
      archived: false,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setComposerOpen(false);
  }

  /* Rules carry the title of the record they were captured from, not its id —
   * they outlive the session that produced them. The link is offered only when
   * that record is actually present in the open session; otherwise the
   * provenance stays plain text rather than promising a destination. */
  function recordIdFor(entry: GuidanceEntry): string | undefined {
    if (!entry.capturedFromRecordTitle) return undefined;
    return records.find((r) => r.title === entry.capturedFromRecordTitle)?.id;
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
        <span className="t-body" style={{ color: "var(--ink-secondary)" }}>
          {property.shortAddress} guidance
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
              recordId={recordIdFor(entry)}
              onOpenRecord={onOpenRecord}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Tabs (Active · Archived) ----------
 * The app's one tab recipe: --control-md tall, --radius-control, --type-body,
 * counts riding alongside at --type-meta. This strip was 24px at --type-meta
 * inside a 6px-radius track, which is a second tab design in a panel that
 * already has one at the top. Spec: docs/design-system/decisions.md §2. */

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
    <div className="flex flex-row items-center" style={{ gap: 2 }}>
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
        height: "var(--control-md)",
        padding: "0 10px",
        gap: 6,
        background: active ? "var(--surface-tab-active)" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-control)",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-body)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span
        className="nums t-meta"
        style={{
          color: active ? "var(--ink-secondary)" : "var(--ink-tertiary)",
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
        height: "var(--control-md)",
        padding: "0 10px 0 8px",
        gap: 4,
        background: active ? "#FFFFFF" : "var(--surface-card-glow)",
        border: "1px solid var(--line-inner-white)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--ink-primary)",
      }}
      aria-label={active ? "Close composer" : "Add guidance"}
    >
      {active ? (
        <X size={14} strokeWidth={1.75} />
      ) : (
        <Plus size={14} strokeWidth={1.75} />
      )}
      <span className="t-meta">{active ? "Cancel" : "Add"}</span>
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
        padding: "var(--pad-card)",
        gap: 10,
        background: "var(--surface-card-glow)",
        border: "1px solid var(--line-inner-white)",
        boxShadow: "var(--shadow-depth-1)",
        borderRadius: "var(--radius-sheet)",
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
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          letterSpacing: "var(--tracking-body)",
          color: "var(--ink-primary)",
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
        {/* Both on the shared primitive, so the disabled Save carries the real
         * DOM `disabled` attribute and leaves the tab order instead of only
         * looking unavailable. */}
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={!canSave}
          onClick={() => canSave && onSave(rule.trim(), agent)}
        >
          Save rule
        </Button>
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
      style={{ gap: 2 }}
      role="group"
      aria-label="Which agent this rule steers"
    >
      {(["intake", "reconciliation", "summary"] as GuidanceAgent[]).map((a) => {
        const meta = AGENT_META[a];
        const active = agent === a;
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            aria-pressed={active}
            className="flex flex-row items-center transition"
            style={{
              height: "var(--control-md)",
              padding: "0 10px",
              gap: 5,
              background: active ? "var(--surface-tab-active)" : "transparent",
              border: active ? "1px solid #FFFFFF" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: "var(--radius-row)",
              cursor: "pointer",
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              letterSpacing: "var(--tracking-body)",
              fontWeight: active
                ? "var(--weight-medium)"
                : "var(--weight-regular)",
              color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
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
  recordId,
  onOpenRecord,
}: {
  entry: GuidanceEntry;
  expanded: boolean;
  onToggle: () => void;
  onArchive: () => void;
  /* The source record's id, when it is present in the open session. */
  recordId?: string;
  onOpenRecord?: (recordId: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const isArchived = entry.archived;
  const canOpenRecord = !!recordId && !!onOpenRecord;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-start transition"
      style={{
        width: "100%",
        padding: 8,
        gap: 8,
        background: hover || expanded ? "#FFFFFF" : "var(--surface-card)",
        border: "1px solid",
        borderColor: hover || expanded ? "var(--line-row-hover)" : "transparent",
        borderRadius: "var(--radius-sheet)",
        boxShadow: hover || expanded ? "var(--shadow-chip)" : "none",
        cursor: "pointer",
        opacity: isArchived ? 0.72 : 1,
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      /* It announces as a button and it takes focus, so it has to answer the
       * keys a button answers. Without this the card was reachable by Tab,
       * drew a focus ring, and then did nothing at all. Space is prevented on
       * keydown as well as handled, or the page scrolls underneath it. */
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Rule sentence */}
      <p
        className="t-body"
        style={{
          margin: 0,
          color: "var(--ink-primary)",
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
          className="truncate t-meta"
          style={{
            color: "var(--ink-tertiary)",
            minWidth: 0,
            textAlign: "right",
          }}
          data-hint={
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
              <span className="t-meta" style={{ color: "var(--ink-secondary)" }}>
                From
              </span>
              {/* A link only when there is somewhere to go. The underline and
               * the arrow used to sit on a handler that did nothing but stop
               * the click propagating, which is a link that promises a
               * destination it has none of. */}
              {canOpenRecord ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecord?.(recordId!);
                  }}
                  className="flex flex-row items-center transition t-meta"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    gap: 4,
                    cursor: "pointer",
                    color: "var(--ink-primary)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    textDecorationColor: "rgba(48,59,69,0.3)",
                  }}
                  data-hint="Open source record"
                >
                  {entry.capturedFromRecordTitle}
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.75}
                    color="var(--ink-secondary)"
                  />
                </button>
              ) : (
                <span className="t-meta" style={{ color: "var(--ink-primary)" }}>
                  {entry.capturedFromRecordTitle}
                </span>
              )}
              <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
                · captured {formatCaptured(entry.capturedOn)} by{" "}
                {entry.capturedBy}
              </span>
            </div>
          ) : (
            <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
              Captured {formatCaptured(entry.capturedOn)} by {entry.capturedBy}{" "}
              · added directly
            </span>
          )}

          <div
            className="flex flex-row items-center"
            style={{ width: "100%", gap: 8 }}
          >
            <span className="t-meta" style={{ color: "var(--ink-secondary)" }}>
              Applied {entry.totalApplied}× since captured
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="flex flex-row items-center transition t-meta"
              style={{
                height: "var(--control-sm)",
                padding: "0 10px",
                gap: 4,
                background: "transparent",
                border: "1px solid var(--line-row-hover)",
                borderRadius: 999,
                cursor: "pointer",
                color: "var(--ink-secondary)",
              }}
            >
              {isArchived ? (
                <>
                  <RotateCcw size={14} strokeWidth={1.75} />
                  Restore
                </>
              ) : (
                <>
                  <Archive size={14} strokeWidth={1.75} />
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
        /* Off the control scale like every other chip; 20 was a one-off. */
        height: "var(--control-sm)",
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
      <span className="t-meta" style={{ color: "var(--ink-primary)" }}>
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
      <span className="t-meta nums" style={{ color: "var(--ink-tertiary)" }}>
        Applied {totalApplied}×
      </span>
    );
  }
  if (appliedThisCycle === 0) {
    return (
      <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
        Not applied this cycle
      </span>
    );
  }
  return (
    <span className="nums t-meta" style={{ color: "var(--ink-primary)" }}>
      Applied{" "}
      <strong style={{ fontWeight: "var(--weight-medium)" }}>
        {appliedThisCycle}×
      </strong>{" "}
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
  /* The two empty states are the same state twice, so they are built to the
   * same measurements: one tile size, one gap, one padding. They had drifted to
   * 48/12/40 and 56/14/32, which is two of them rather than one seen under two
   * filters — and 14 and 40 are not on the space scale at all. */
  if (view === "archived") {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{
          width: "100%",
          gap: "var(--space-5)",
          padding: "var(--space-9) var(--space-6)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-card)",
            background: "var(--surface-card-glow)",
            border: "1px solid var(--line-inner-white)",
            boxShadow: "var(--shadow-chip)",
          }}
        >
          <Archive size={20} strokeWidth={1.5} color="var(--ink-tertiary)" />
        </div>
        <span
          className="t-body"
          style={{ color: "var(--ink-secondary)", textAlign: "center" }}
        >
          No archived guidance for this property.
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center flex-1"
      style={{
        width: "100%",
        gap: "var(--space-5)",
        padding: "var(--space-9) var(--space-6)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-card)",
          background: "var(--surface-card-glow)",
          border: "1px solid var(--line-inner-white)",
          boxShadow: "var(--shadow-chip)",
        }}
      >
        <BookOpen size={20} strokeWidth={1.5} color="var(--ink-tertiary)" />
      </div>
      <div
        className="flex flex-col items-center"
        style={{ gap: 6, maxWidth: 280 }}
      >
        <span
          className="t-body"
          style={{
            color: "var(--ink-primary)",
            fontWeight: "var(--weight-medium)",
            textAlign: "center",
          }}
        >
          No guidance captured yet
        </span>
        <span
          className="t-prose"
          style={{ color: "var(--ink-secondary)", textAlign: "center" }}
        >
          As you leave guidance on records during review, it&apos;ll show up
          here for the AI to use next time.
        </span>
      </div>
      <Button
        variant="secondary"
        size="md"
        onClick={onAdd}
        leftIcon={<Plus size={14} strokeWidth={1.75} />}
      >
        Add a rule
      </Button>
    </div>
  );
}
