"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flag,
  Check,
  MessageSquarePlus,
} from "lucide-react";
import {
  activeProperty,
  getBankMeta,
  reconciledRecords,
  selectedMonth,
  type RecordBankId,
  type RecordItem,
  type RecordStatus,
} from "@/lib/seed";

/* Review canvas — destination of the Summary agent's "Review N records" CTA.
 *
 * The canvas fades + slides in as it mounts (200ms ease-out) so the swap from
 * the workspace/upload view is perceptibly a state change, not an instant
 * teleport. The AgentsPanel simultaneously collapses to its sliver via a
 * width transition — the two animations run in parallel and land together,
 * giving the reviewer a clean "focus mode" gesture. */

type FilterTab = "flagged" | "approved" | "all";
type BankFilter = "all" | RecordBankId;

/* Per-record local action state so the design can demonstrate live
 * interaction states without wiring back to the session reducer. Kept in
 * component state; the reducer wiring is a follow-up. */
type RecordOverride = {
  status?: RecordStatus;
  commented?: boolean;
};

export function ReviewCanvas({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<FilterTab>("flagged");
  const [bankFilter, setBankFilter] = useState<BankFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, RecordOverride>>({});
  /* Just-moved ids so the row can flash a brief "moved" acknowledgement
   * before settling into its new bucket. Cleared 900ms after the action. */
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(new Set());

  const toggleStatus = useCallback((r: RecordItem) => {
    const currentStatus = r.status;
    const nextStatus: RecordStatus =
      currentStatus === "flagged" ? "approved" : "flagged";
    setOverrides((prev) => ({
      ...prev,
      [r.id]: { ...prev[r.id], status: nextStatus },
    }));
    setRecentlyMoved((prev) => {
      const next = new Set(prev);
      next.add(r.id);
      return next;
    });
    window.setTimeout(() => {
      setRecentlyMoved((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
    }, 900);
  }, []);

  const toggleComment = useCallback((r: RecordItem) => {
    setOverrides((prev) => ({
      ...prev,
      [r.id]: {
        ...prev[r.id],
        commented: !prev[r.id]?.commented,
      },
    }));
  }, []);

  const effective = useMemo(() => {
    return reconciledRecords.map((r) => {
      const ov = overrides[r.id];
      return ov?.status
        ? ({ ...r, status: ov.status } as RecordItem)
        : r;
    });
  }, [overrides]);

  const counts = useMemo(() => {
    let flagged = 0;
    let approved = 0;
    for (const r of effective) {
      if (r.status === "flagged") flagged++;
      else approved++;
    }
    return { flagged, approved, all: effective.length };
  }, [effective]);

  const visible = useMemo(() => {
    return effective.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (bankFilter !== "all" && r.bankId !== bankFilter) return false;
      return true;
    });
  }, [effective, tab, bankFilter]);

  return (
    <main
      className="flex flex-col items-start flex-1 min-w-0 relative overflow-auto scroll-thin canvas-pad review-canvas-enter"
      style={{ gap: 16, background: "var(--bg-grad)" }}
    >
      <Header onBack={onBack} />
      <StatsBand counts={counts} />
      <FiltersRow
        tab={tab}
        setTab={setTab}
        bankFilter={bankFilter}
        setBankFilter={setBankFilter}
        counts={counts}
      />
      <RecordList
        records={visible}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        onToggleStatus={toggleStatus}
        onToggleComment={toggleComment}
        overrides={overrides}
        recentlyMoved={recentlyMoved}
      />

      <style jsx>{`
        .review-canvas-enter {
          animation: review-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes review-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- Header ---------- */

function Header({ onBack }: { onBack: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 14, paddingTop: 4 }}
    >
      <button
        type="button"
        onClick={onBack}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex flex-row items-center transition"
        style={{
          gap: 6,
          height: 32,
          padding: "0 14px 0 12px",
          background: hover ? "#FFFFFF" : "var(--surface-card-glow)",
          border: hover
            ? "1px solid rgba(157, 179, 197, 0.4)"
            : "1px solid #FFFFFF",
          borderRadius: 999,
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-1)",
          cursor: "pointer",
        }}
        aria-label="Back to workspace"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to workspace
      </button>
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 12 }}
      >
        <div className="flex flex-col items-start flex-1 min-w-0" style={{ gap: 4 }}>
          <h1
            className="truncate"
            style={{
              width: "100%",
              fontSize: 22,
              lineHeight: "28px",
              color: "var(--text-1)",
              fontWeight: 400,
            }}
          >
            Review records
          </h1>
          <span
            className="truncate"
            style={{
              width: "100%",
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-2)",
            }}
          >
            {activeProperty.shortAddress} · {activeProperty.code} ·{" "}
            {selectedMonth} · 68 reconciled records ready for Yardi
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Stats band ---------- */

function StatsBand({
  counts,
}: {
  counts: { flagged: number; approved: number; all: number };
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "20px 24px",
        gap: 24,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <Stat label="Total records" value="68" />
      <Divider />
      <Stat
        label="Approved"
        value={String(counts.approved)}
        valueColor="#001AFF"
        dotColor="#001AFF"
      />
      <Divider />
      <Stat
        label="Flagged"
        value={String(counts.flagged)}
        valueColor="#FF0000"
        dotColor="#FF0000"
      />
      <Divider />
      <Stat label="Match rate" value="76%" />
      <div style={{ flex: 1 }} />
      <Stat label="Net difference" value="$0.00" />
    </div>
  );
}

function Stat({
  label,
  value,
  valueColor,
  dotColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  dotColor?: string;
}) {
  return (
    <div className="flex flex-col items-start" style={{ gap: 6 }}>
      <span
        style={{
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-2)",
        }}
      >
        {label}
      </span>
      <div className="flex flex-row items-center" style={{ gap: 6 }}>
        {dotColor && (
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: dotColor,
              border: "1px solid #FFFFFF",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              display: "inline-block",
            }}
          />
        )}
        <span
          className="tabular-nums"
          style={{
            fontSize: 22,
            lineHeight: "26px",
            color: valueColor || "var(--text-1)",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{ width: 1, height: 36, background: "var(--line-soft)" }}
    />
  );
}

/* ---------- Filters (tabs + bank logos) ---------- */

const BANK_LOGO_OPTIONS: { key: RecordBankId; logoSrc: string; shortName: string }[] = [
  { key: "bank-chase-op", logoSrc: "/logos/chase.png", shortName: "Chase Op" },
  { key: "bank-wells-sd", logoSrc: "/logos/wells-fargo.png", shortName: "Wells SD" },
  { key: "bank-boa-res", logoSrc: "/logos/boa.png", shortName: "BoA Res" },
  { key: "bank-chase-escrow", logoSrc: "/logos/chase.png", shortName: "Chase Escrow" },
];

/* Filters row — tabs sit on white lifted chips so they read against the grey
 * canvas (previous version was a mid-grey chip on a grey bg that failed a
 * WCAG contrast check for the labels). Bank filter moved to the right edge as
 * a logo cluster; clicking a logo toggles that bank filter — click again to
 * clear. All banks selected == "all". */
function FiltersRow({
  tab,
  setTab,
  bankFilter,
  setBankFilter,
  counts,
}: {
  tab: FilterTab;
  setTab: (t: FilterTab) => void;
  bankFilter: BankFilter;
  setBankFilter: (b: BankFilter) => void;
  counts: { flagged: number; approved: number; all: number };
}) {
  const options: {
    key: FilterTab;
    label: string;
    dotColor?: string;
    count: number;
  }[] = [
    { key: "flagged", label: "Flagged", dotColor: "#FF0000", count: counts.flagged },
    { key: "approved", label: "Approved", dotColor: "#001AFF", count: counts.approved },
    { key: "all", label: "All", count: counts.all },
  ];
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", gap: 8 }}
    >
      <div className="flex flex-row items-center" style={{ gap: 6 }}>
        {options.map((o) => {
          const active = o.key === tab;
          return (
            <TabButton
              key={o.key}
              active={active}
              onClick={() => setTab(o.key)}
              dotColor={o.dotColor}
              label={o.label}
              count={o.count}
            />
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <BankLogoCluster
        bankFilter={bankFilter}
        setBankFilter={setBankFilter}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  dotColor,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  dotColor?: string;
  label: string;
  count: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center transition"
      style={{
        padding: "8px 14px",
        gap: 8,
        /* White surface for both resting and active states — the difference is
         * shadow depth + border tint, not the background color. This keeps
         * the labels legible against the canvas grey (previous version put
         * the active tab on a mid-grey chip that muddied the label). */
        background: active
          ? "#FFFFFF"
          : hover
          ? "rgba(255, 255, 255, 0.8)"
          : "rgba(255, 255, 255, 0.55)",
        border: active
          ? "1px solid rgba(0, 26, 255, 0.25)"
          : "1px solid rgba(157, 179, 197, 0.35)",
        boxShadow: active ? "var(--shadow-depth-2)" : "var(--shadow-chip)",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 14,
        lineHeight: "17px",
        color: active ? "var(--text-1)" : "var(--text-2)",
        fontFamily: "inherit",
      }}
    >
      {dotColor && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: dotColor,
            border: "1px solid #FFFFFF",
            display: "inline-block",
          }}
        />
      )}
      <span>{label}</span>
      <span
        className="tabular-nums"
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: active ? "var(--text-2)" : "var(--text-4)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* Bank logo cluster — replaces the previous underlined-text bank filter row.
 * "All banks" is the default with all logos rendered; clicking a logo isolates
 * to just that bank, and clicking the same logo again returns to "all". */
function BankLogoCluster({
  bankFilter,
  setBankFilter,
}: {
  bankFilter: BankFilter;
  setBankFilter: (b: BankFilter) => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{ gap: 4, padding: 4, background: "rgba(255,255,255,0.5)", border: "1px solid rgba(157,179,197,0.3)", borderRadius: 999 }}
    >
      <BankLogoButton
        active={bankFilter === "all"}
        onClick={() => setBankFilter("all")}
        ariaLabel="Show all banks"
      >
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            padding: "0 8px",
            color:
              bankFilter === "all" ? "var(--text-1)" : "var(--text-2)",
          }}
        >
          All
        </span>
      </BankLogoButton>
      {BANK_LOGO_OPTIONS.map((b) => (
        <BankLogoButton
          key={b.key}
          active={bankFilter === b.key}
          onClick={() =>
            setBankFilter(bankFilter === b.key ? "all" : b.key)
          }
          ariaLabel={`Filter to ${b.shortName}`}
          title={b.shortName}
        >
          <Image
            src={b.logoSrc}
            width={18}
            height={18}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </BankLogoButton>
      ))}
    </div>
  );
}

function BankLogoButton({
  active,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className="flex items-center justify-center transition"
      style={{
        height: 28,
        minWidth: 28,
        padding: 2,
        background: active
          ? "#FFFFFF"
          : hover
          ? "rgba(255,255,255,0.75)"
          : "transparent",
        border: active
          ? "1px solid rgba(0, 26, 255, 0.35)"
          : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--text-1)",
        opacity: active || hover ? 1 : 0.75,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Record list ---------- */

function RecordList({
  records,
  expandedId,
  onToggle,
  onToggleStatus,
  onToggleComment,
  overrides,
  recentlyMoved,
}: {
  records: RecordItem[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onToggleStatus: (r: RecordItem) => void;
  onToggleComment: (r: RecordItem) => void;
  overrides: Record<string, RecordOverride>;
  recentlyMoved: Set<string>;
}) {
  if (records.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: "100%",
          padding: "32px 0",
          color: "var(--text-2)",
          fontSize: 13,
        }}
      >
        No records match the current filter.
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 8, paddingBottom: 48 }}
    >
      {records.map((r) => (
        <RecordRow
          key={r.id}
          record={r}
          expanded={r.id === expandedId}
          onToggle={() => onToggle(r.id)}
          onToggleStatus={() => onToggleStatus(r)}
          onToggleComment={() => onToggleComment(r)}
          commented={!!overrides[r.id]?.commented}
          moved={recentlyMoved.has(r.id)}
        />
      ))}
    </div>
  );
}

function RecordRow({
  record,
  expanded,
  onToggle,
  onToggleStatus,
  onToggleComment,
  commented,
  moved,
}: {
  record: RecordItem;
  expanded: boolean;
  onToggle: () => void;
  onToggleStatus: () => void;
  onToggleComment: () => void;
  commented: boolean;
  moved: boolean;
}) {
  const meta = getBankMeta(record.bankId);
  const dot = record.status === "flagged" ? "#FF0000" : "#001AFF";
  const Chevron = expanded ? ChevronUp : ChevronDown;
  const isFlagged = record.status === "flagged";
  const [hover, setHover] = useState(false);

  const lifted = hover || expanded || moved;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-start transition"
      style={{
        width: "100%",
        background: moved
          ? "rgba(226, 232, 255, 0.55)"
          : lifted
          ? "var(--surface-card)"
          : "transparent",
        border: lifted
          ? moved
            ? "1px solid rgba(0, 26, 255, 0.35)"
            : "1px solid rgba(157, 179, 197, 0.35)"
          : "1px solid rgba(157, 179, 197, 0.18)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        transition:
          "background 200ms ease, border-color 200ms ease",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{
          width: "100%",
          padding: "14px 14px 14px 16px",
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse record" : "Expand record"}
          className="flex flex-row items-center flex-1 min-w-0 text-left"
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            gap: 14,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            className="shrink-0"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: dot,
              border: "1px solid #FFFFFF",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          />
          <div
            className="shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: "#FFFFFF",
              border: "1px solid var(--line-soft)",
            }}
          >
            <Image
              src={meta.logoSrc}
              alt=""
              width={20}
              height={20}
              style={{ objectFit: "contain" }}
            />
          </div>
          <span
            className="shrink-0 tabular-nums"
            style={{
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-2)",
              width: 64,
            }}
          >
            {formatDate(record.date)}
          </span>
          <div
            className="flex flex-col items-start flex-1 min-w-0"
            style={{ gap: 3 }}
          >
            <span
              className="truncate"
              style={{
                width: "100%",
                fontSize: 15,
                lineHeight: "19px",
                color: "var(--text-1)",
              }}
            >
              {record.title}
            </span>
            <span
              className="truncate"
              style={{
                width: "100%",
                fontSize: 12,
                lineHeight: "15px",
                color: "var(--text-2)",
              }}
            >
              {meta.shortName} · {record.reason}
            </span>
          </div>
          <ConfidenceChip value={record.confidence} />
          <span
            className="shrink-0 tabular-nums"
            style={{
              fontSize: 16,
              lineHeight: "20px",
              color: "var(--text-1)",
              minWidth: 112,
              textAlign: "right",
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {formatAmount(record.amount)}
          </span>
        </button>
        <div
          className="flex flex-row items-center shrink-0"
          style={{ gap: 4 }}
        >
          <ActionButton
            label={isFlagged ? "Move to approved" : "Move to flagged"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
            tone={isFlagged ? "approve" : "flag"}
            icon={
              isFlagged ? (
                <Check size={14} strokeWidth={1.75} />
              ) : (
                <Flag size={14} strokeWidth={1.75} />
              )
            }
          />
          <ActionButton
            label={commented ? "Comment added" : "Add comment"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComment();
            }}
            tone="comment"
            active={commented}
            icon={
              <MessageSquarePlus size={14} strokeWidth={1.75} />
            }
          />
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 flex items-center justify-center transition"
            style={{
              width: 28,
              height: 28,
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 999,
              color: "var(--text-2)",
              cursor: "pointer",
            }}
            aria-label={expanded ? "Collapse record" : "Expand record"}
            title={expanded ? "Collapse" : "Expand"}
          >
            <Chevron size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {expanded && <RecordDetail record={record} />}
    </div>
  );
}

/* Action button with full interaction state matrix.
 *
 *   default  — subtle lifted chip, muted icon
 *   hover    — brighter surface, tone-tinted icon
 *   focus    — same as hover, plus focus ring (browser native + custom outline)
 *   pressed  — depth compresses, background darkens for 90ms
 *   active   — for the comment toggle: tone-tinted persistent bg once acted
 *
 * Each tone (approve / flag / comment) carries its own hover tint so the
 * user knows what the click is going to do BEFORE they click. */
function ActionButton({
  label,
  onClick,
  tone,
  icon,
  active,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tone: "approve" | "flag" | "comment";
  icon: React.ReactNode;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const palette =
    tone === "approve"
      ? { color: "#001AFF", hoverBg: "#E8EBFF", hoverBorder: "rgba(0,26,255,0.35)" }
      : tone === "flag"
      ? { color: "#FF0000", hoverBg: "#FFEDED", hoverBorder: "rgba(255,0,0,0.35)" }
      : { color: "var(--text-1)", hoverBg: "#F1EBFF", hoverBorder: "rgba(124,77,255,0.35)" };

  const activeVisual = active
    ? {
        background: palette.hoverBg,
        border: `1px solid ${palette.hoverBorder}`,
        boxShadow: "var(--shadow-chip)",
      }
    : hover
    ? {
        background: palette.hoverBg,
        border: `1px solid ${palette.hoverBorder}`,
        boxShadow: press ? "var(--shadow-depth-1)" : "var(--shadow-depth-2)",
      }
    : {
        background: "var(--surface-card-glow)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
      };

  const iconColor = hover || active ? palette.color : "var(--text-2)";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      className="shrink-0 flex items-center justify-center transition"
      style={{
        width: 28,
        height: 28,
        background: activeVisual.background,
        border: activeVisual.border,
        boxShadow: activeVisual.boxShadow,
        borderRadius: 999,
        cursor: "pointer",
        color: iconColor,
        transform: press ? "translateY(1px)" : "translateY(0)",
        transition:
          "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 90ms ease, color 120ms ease",
      }}
    >
      {icon}
    </button>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  let dot: string;
  if (value >= 80) dot = "#001AFF";
  else if (value >= 50) dot = "var(--text-2)";
  else dot = "#FF0000";

  return (
    <span
      className="shrink-0 inline-flex items-center tabular-nums"
      style={{
        height: 22,
        padding: "0 10px",
        gap: 6,
        background: "var(--surface-chip)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "14px",
        color: "var(--text-1)",
        minWidth: 64,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dot,
          flexShrink: 0,
        }}
      />
      <span>{value}%</span>
    </span>
  );
}

/* ---------- Expanded detail ---------- */

function RecordDetail({ record }: { record: RecordItem }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: "100%",
        padding: "0 16px 16px 56px",
        gap: 12,
        background: "transparent",
      }}
    >
      <div
        className="flex flex-row items-start"
        style={{ width: "100%", gap: 16 }}
      >
        <DetailColumn label="Reason">
          <span
            style={{
              fontSize: 13,
              lineHeight: "17px",
              color: "var(--text-1)",
            }}
          >
            {record.reason}
          </span>
        </DetailColumn>
        <DetailColumn label="Evidence">
          <ul
            style={{
              margin: 0,
              paddingLeft: 14,
              fontSize: 13,
              lineHeight: "18px",
              color: "var(--text-1)",
            }}
          >
            {record.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </DetailColumn>
      </div>
    </div>
  );
}

function DetailColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start flex-1 min-w-0" style={{ gap: 4 }}>
      <span
        style={{
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/* ---------- Utilities ---------- */

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = [
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
  const month = months[Number(m) - 1];
  return `${month} ${Number(d)}`;
}

function formatAmount(amount: number): string {
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${formatted}`;
}
