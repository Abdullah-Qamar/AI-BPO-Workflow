"use client";

import { useMemo, useState } from "react";
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

/* The review canvas — destination of the Summary agent's "Review 68 records"
 * CTA. Shows the reconciled bucket in a scannable list with a quiet master/
 * detail expansion. Flagged is the default tab because that's where the
 * reviewer's attention belongs; approved sits one tab away as confirmation.
 *
 * Counts shown in the tab labels come from the canonical agent panel data
 * (52 approved · 16 flagged). The seeded list itself is illustrative — it
 * doesn't enumerate all 68 records, just enough to demonstrate the layout. */

type FilterTab = "flagged" | "approved" | "all";
type BankFilter = "all" | RecordBankId;

const TAB_COUNT_OVERRIDES: Record<FilterTab, number> = {
  // Match the agent panel's authoritative counts. The seeded record list is
  // a smaller representative subset.
  flagged: 16,
  approved: 52,
  all: 68,
};

export function ReviewCanvas({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<FilterTab>("flagged");
  const [bankFilter, setBankFilter] = useState<BankFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return reconciledRecords.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (bankFilter !== "all" && r.bankId !== bankFilter) return false;
      return true;
    });
  }, [tab, bankFilter]);

  return (
    <main
      className="flex flex-col items-start flex-1 min-w-0 relative overflow-auto scroll-thin canvas-pad"
      style={{ gap: 16, background: "var(--bg-grad)" }}
    >
      <Header onBack={onBack} />
      <StatsBand />
      <FilterTabs tab={tab} setTab={setTab} />
      <BankFilterRow
        bankFilter={bankFilter}
        setBankFilter={setBankFilter}
      />
      <RecordList
        records={visible}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
      />
    </main>
  );
}

/* ---------- Header ---------- */

/* Sub-page treatment: the workspace's giant property title is gone. A pill-
 * shaped Back affordance up top makes the navigation move explicit, and
 * "Review records" reads as the sub-page title — with property + cycle
 * relegated to a subtitle line so the user feels nested inside the run
 * rather than on a peer screen. */
function Header({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: 14, paddingTop: 4 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex flex-row items-center"
        style={{
          gap: 6,
          height: 30,
          padding: "0 12px 0 10px",
          background: "var(--surface-card-glow)",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
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

function StatsBand() {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "12px 16px",
        gap: 16,
        background: "var(--surface-card)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <Stat label="Total records" value="68" />
      <Divider />
      <Stat
        label="Approved"
        value="52"
        valueColor="#001AFF"
        dotColor="#001AFF"
      />
      <Divider />
      <Stat
        label="Flagged"
        value="16"
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
  /* Sentence-case eyebrow at 13/16, value at 20/24 — matches the locked
   * dashboard typography (no uppercase eyebrows anywhere on the canvas). */
  return (
    <div className="flex flex-col items-start" style={{ gap: 3 }}>
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
            fontSize: 20,
            lineHeight: "24px",
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
      style={{ width: 1, height: 28, background: "var(--line-soft)" }}
    />
  );
}

/* ---------- Filter tabs ---------- */

function FilterTabs({
  tab,
  setTab,
}: {
  tab: FilterTab;
  setTab: (t: FilterTab) => void;
}) {
  const options: { key: FilterTab; label: string; dotColor?: string }[] = [
    { key: "flagged", label: "Flagged", dotColor: "#FF0000" },
    { key: "approved", label: "Approved", dotColor: "#001AFF" },
    { key: "all", label: "All" },
  ];
  return (
    <div className="flex flex-row items-center" style={{ gap: 6 }}>
      {options.map((o) => {
        const active = o.key === tab;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTab(o.key)}
            className="flex flex-row items-center"
            style={{
              padding: "8px 14px",
              gap: 8,
              background: active ? "var(--surface-tab-active)" : "transparent",
              border: active
                ? "1px solid #FFFFFF"
                : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              lineHeight: "17px",
              color: active ? "var(--text-1)" : "var(--text-placeholder)",
            }}
          >
            {o.dotColor && (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: o.dotColor,
                  border: "1px solid #FFFFFF",
                  display: "inline-block",
                }}
              />
            )}
            <span>{o.label}</span>
            <span
              style={{
                fontSize: 12,
                lineHeight: "14px",
                color: active ? "var(--text-2)" : "var(--text-4)",
              }}
            >
              {TAB_COUNT_OVERRIDES[o.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Bank filter ---------- */

const BANK_FILTER_OPTIONS: { key: BankFilter; label: string }[] = [
  { key: "all", label: "All banks" },
  { key: "bank-chase-op", label: "Chase Op" },
  { key: "bank-wells-sd", label: "Wells SD" },
  { key: "bank-boa-res", label: "BoA Res" },
  { key: "bank-chase-escrow", label: "Chase Escrow" },
];

/* Bank filter is a scoping concern, NOT a parallel tab system. Rendered as
 * text-link chips with an underline+color shift on active — no lifted
 * surface, no shadow. This reads as a quieter "filter by" row beneath the
 * primary tabs so the two filter strata don't compete visually. */
function BankFilterRow({
  bankFilter,
  setBankFilter,
}: {
  bankFilter: BankFilter;
  setBankFilter: (b: BankFilter) => void;
}) {
  return (
    <div
      className="flex flex-row items-center flex-wrap"
      style={{ gap: 14 }}
    >
      <span
        style={{
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-2)",
        }}
      >
        Filter by bank
      </span>
      {BANK_FILTER_OPTIONS.map((o) => {
        const active = o.key === bankFilter;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setBankFilter(o.key)}
            style={{
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              lineHeight: "16px",
              color: active ? "var(--text-1)" : "var(--text-2)",
              textDecoration: active ? "underline" : "none",
              textUnderlineOffset: 4,
              textDecorationColor: active
                ? "var(--text-1)"
                : "transparent",
              textDecorationThickness: 1.5,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Record list ---------- */

function RecordList({
  records,
  expandedId,
  onToggle,
}: {
  records: RecordItem[];
  expandedId: string | null;
  onToggle: (id: string) => void;
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
        />
      ))}
    </div>
  );
}

function RecordRow({
  record,
  expanded,
  onToggle,
}: {
  record: RecordItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = getBankMeta(record.bankId);
  const dot = record.status === "flagged" ? "#FF0000" : "#001AFF";
  const Chevron = expanded ? ChevronUp : ChevronDown;
  const isFlagged = record.status === "flagged";
  const [hover, setHover] = useState(false);

  /* Resting rows are quiet hairlines on the canvas — stacked 60+ deep, full
   * bento chrome reads as visual noise. Hover or expansion lifts the row to
   * the card surface with the depth-2 shadow, signalling focus. */
  const lifted = hover || expanded;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-start transition"
      style={{
        width: "100%",
        background: lifted ? "var(--surface-card)" : "transparent",
        border: lifted
          ? "1px solid #FFFFFF"
          : "1px solid rgba(157, 179, 197, 0.18)",
        boxShadow: lifted ? "var(--shadow-card)" : "none",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        transition:
          "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
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
        {/* Main clickable region (everything except action icons) toggles the
         * expanded detail. Actions on the right are their own buttons. */}
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
        {/* Action icons — always present, top-right of the card. Tooltip via
         * title. Move icon flips based on the record's current bucket. */}
        <div
          className="flex flex-row items-center shrink-0"
          style={{ gap: 4 }}
        >
          <IconAction
            label={isFlagged ? "Move to approved" : "Move to flagged"}
            icon={
              isFlagged ? (
                <Check size={14} strokeWidth={1.75} color="#001AFF" />
              ) : (
                <Flag size={14} strokeWidth={1.75} color="#FF0000" />
              )
            }
          />
          <IconAction
            label="Add comment"
            icon={
              <MessageSquarePlus
                size={14}
                strokeWidth={1.75}
                color="var(--text-1)"
              />
            }
          />
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 flex items-center justify-center"
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

/* Icon-only action button. The accessible label is supplied via `title` so
 * the native tooltip surfaces what the icon means — keeps the card visually
 * tight without sacrificing discoverability. */
function IconAction({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="shrink-0 flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        background: "var(--surface-card-glow)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  /* Neutral chip surface + a colored tier dot. The earlier near-invisible
   * 8% color tints read as washed-out; pulling the color signal into a
   * single 6px dot keeps the % the readable focal point and lets a glance
   * skim the column for low-confidence outliers. */
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
  // "2026-05-12" → "May 12"
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
