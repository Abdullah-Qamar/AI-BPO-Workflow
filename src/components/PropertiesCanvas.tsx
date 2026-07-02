"use client";

/* PropertiesCanvas — the #properties route.
 *
 * Properties is a portfolio reference / setup surface, not a daily-use page.
 * The reconciler arrives here to (a) onboard a property (CSV import + manual
 * create), (b) look up where a property stands, (c) fix a bank mapping, or
 * (d) start a session from the property's home page.
 *
 * View states (one owns the canvas at a time — never side-by-side):
 *   list   — portfolio roster (default landing once any property exists)
 *   detail — single property's home page (identity / accounting / banks /
 *            recent sessions). Opened by clicking a row. Back chip returns. */

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  House,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  properties,
  propertiesStats,
  type CloseStatus,
  type PropertyBankMapping,
  type PropertyRecord,
  type PropertyRecentSession,
} from "@/lib/seed";

type View = "list" | "detail";

type StatusFilter = "all" | "open" | "review" | "closed" | "failed";

type SortKey = "lastReconciled" | "address" | "openItems";

const CLOSE_STATUS_PALETTE: Record<
  CloseStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  open: {
    bg: "var(--surface-chip)",
    border: "#FFFFFF",
    text: "var(--text-1)",
    label: "Open",
  },
  draft: {
    bg: "var(--surface-chip)",
    border: "#FFFFFF",
    text: "var(--text-2)",
    label: "Draft",
  },
  "in-review": {
    bg: "#E8EBFF",
    border: "#B7C0FF",
    text: "#001AAE",
    label: "In review",
  },
  "needs-input": {
    bg: "var(--chip-failed-bg)",
    border: "var(--chip-failed-border)",
    text: "#A40000",
    label: "Needs input",
  },
  closed: {
    bg: "#E8F8E4",
    border: "#B8E2A8",
    text: "#0B5E00",
    label: "Closed",
  },
  failed: {
    bg: "var(--chip-failed-bg)",
    border: "var(--chip-failed-border)",
    text: "#A40000",
    label: "Failed",
  },
};

const STATUS_DOT_BY_CLOSE: Record<CloseStatus, string> = {
  open: "var(--dot-active)",
  draft: "var(--line)",
  "in-review": "var(--dot-active)",
  "needs-input": "var(--dot-failed)",
  closed: "var(--dot-complete)",
  failed: "var(--dot-failed)",
};

interface PropertiesCanvasProps {
  /* When the user clicks "Start a session" from a property detail, hand the
   * property id up to the host so it can switch routes. The host today routes
   * to workspace; the property id is informational for future wiring. */
  onStartSession?: (propertyId: string) => void;
}

export function PropertiesCanvas({ onStartSession }: PropertiesCanvasProps) {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "detail" && selectedId) {
    const property = properties.find((p) => p.id === selectedId);
    if (property) {
      return (
        <PropertyDetail
          property={property}
          onBack={() => setView("list")}
          onStartSession={() => onStartSession?.(property.id)}
        />
      );
    }
  }

  return (
    <PropertiesList
      onOpen={(id) => {
        setSelectedId(id);
        setView("detail");
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
 * LIST VIEW
 * ───────────────────────────────────────────────────────────── */

function PropertiesList({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("lastReconciled");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = properties.filter((p) => {
      if (statusFilter === "open" && !(p.closeStatus === "open" || p.closeStatus === "draft"))
        return false;
      if (
        statusFilter === "review" &&
        !(p.closeStatus === "in-review" || p.closeStatus === "needs-input")
      )
        return false;
      if (statusFilter === "closed" && p.closeStatus !== "closed") return false;
      if (statusFilter === "failed" && p.closeStatus !== "failed") return false;
      if (q.length === 0) return true;
      return (
        p.address.toLowerCase().includes(q) ||
        p.shortAddress.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.legalEntity.toLowerCase().includes(q) ||
        p.market.toLowerCase().includes(q)
      );
    });
    rows = rows.slice().sort((a, b) => {
      if (sort === "address") return a.address.localeCompare(b.address);
      if (sort === "openItems") return b.openItems - a.openItems;
      // lastReconciled — "Never" floats to the bottom, otherwise newest first
      const aN = a.lastReconciled === "Never";
      const bN = b.lastReconciled === "Never";
      if (aN !== bN) return aN ? 1 : -1;
      return b.lastReconciled.localeCompare(a.lastReconciled);
    });
    return rows;
  }, [query, statusFilter, sort]);

  return (
    <main
      className="flex flex-col items-center flex-1 min-w-0 relative overflow-auto scroll-thin"
      style={{
        padding: "28px 60px 48px",
        background: "var(--bg-grad)",
      }}
    >
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1120, gap: 24 }}
      >
        <ListHeader total={propertiesStats.total} />
        <FilterBar
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sort={sort}
          setSort={setSort}
        />
        {visible.length === 0 ? (
          <EmptyResults onClear={() => {
            setQuery("");
            setStatusFilter("all");
          }} />
        ) : (
          <PropertyRoster rows={visible} onOpen={onOpen} />
        )}
      </div>
    </main>
  );
}

function ListHeader({ total: _total }: { total: number }) {
  return (
    <div className="flex flex-col items-start" style={{ width: "100%", gap: 8 }}>
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 12, height: 34 }}
      >
        <House size={28} strokeWidth={1.25} color="#464A51" />
        <h1
          className="flex-1 truncate"
          style={{
            fontSize: 28,
            lineHeight: "34px",
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          Properties
        </h1>
        <HeaderChip icon={<Upload size={14} strokeWidth={1.6} />} label="Import CSV" />
        <PrimaryChip
          icon={<Plus size={14} strokeWidth={2} />}
          label="New property"
        />
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        Portfolio roster — bank mappings and accounting setup.
      </div>
    </div>
  );
}

function HeaderChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className="flex flex-row items-center"
      style={{
        height: 35,
        padding: "8px 14px",
        gap: 8,
        background: "#F2F4FB",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--text-1)",
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: "17px",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function PrimaryChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className="flex flex-row items-center"
      style={{
        height: 35,
        padding: "8px 14px 8px 12px",
        gap: 8,
        background: "var(--action-primary)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "var(--shadow-depth-2)",
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--action-on-primary)",
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: "17px",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function FilterBar({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
}: {
  query: string;
  setQuery: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "12px 14px",
        gap: 12,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{
          flex: "1 1 320px",
          minWidth: 240,
          height: 35,
          padding: "8px 12px",
          gap: 10,
          background: "var(--surface-input)",
          border: "1px solid var(--line-inner-white)",
          borderRadius: 8,
        }}
      >
        <Search size={15} strokeWidth={1.75} color="#63696E" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by address, code, or entity"
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 16,
            lineHeight: "19px",
            color: "var(--text-1)",
            fontFamily: "Lato, var(--font-sans)",
          }}
        />
      </div>

      <StatusTabs current={statusFilter} setCurrent={setStatusFilter} />

      <SortDropdown sort={sort} setSort={setSort} />
    </div>
  );
}

function StatusTabs({
  current,
  setCurrent,
}: {
  current: StatusFilter;
  setCurrent: (s: StatusFilter) => void;
}) {
  const items: { key: StatusFilter; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All", count: propertiesStats.total },
    {
      key: "open",
      label: "Open",
      count: propertiesStats.open,
      dot: "var(--dot-active)",
    },
    {
      key: "review",
      label: "Review",
      count: propertiesStats.inReview,
      dot: "var(--dot-active)",
    },
    {
      key: "closed",
      label: "Closed",
      count: propertiesStats.closed,
      dot: "var(--dot-complete)",
    },
    {
      key: "failed",
      label: "Failed",
      count: propertiesStats.failed,
      dot: "var(--dot-failed)",
    },
  ];
  return (
    <div className="flex flex-row items-center" style={{ gap: 4 }}>
      {items.map((it) => {
        const active = it.key === current;
        return (
          <button
            key={it.key}
            onClick={() => setCurrent(it.key)}
            className="flex flex-row items-center"
            style={{
              padding: "6px 12px",
              gap: 8,
              background: active ? "var(--surface-tab-active)" : "transparent",
              border: active ? "1px solid #FFFFFF" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              lineHeight: "17px",
              color: active ? "var(--text-1)" : "var(--text-placeholder)",
              fontFamily: "inherit",
            }}
          >
            {it.dot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: it.dot,
                  display: "inline-block",
                }}
              />
            )}
            <span>{it.label}</span>
            <span
              style={{
                fontSize: 12,
                lineHeight: "14px",
                color: active ? "var(--text-2)" : "var(--text-4)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {it.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Sort is a tertiary affordance — quieter than the search input and the
 * status tabs. Renders as a text-link with a chevron, no lifted surface,
 * so the hierarchy reads: search (primary tool) → tabs (scoping) → sort. */
function SortDropdown({
  sort,
  setSort,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    sort === "lastReconciled"
      ? "Latest reconciled"
      : sort === "address"
      ? "Address A–Z"
      : "Open items first";
  const options: { key: SortKey; label: string }[] = [
    { key: "lastReconciled", label: "Latest reconciled" },
    { key: "address", label: "Address A–Z" },
    { key: "openItems", label: "Open items first" },
  ];
  return (
    <div className="relative" style={{ flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-row items-center"
        style={{
          height: 35,
          padding: "0 6px",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-2)",
        }}
      >
        <span>Sort by</span>
        <span style={{ color: "var(--text-1)" }}>{label}</span>
        <ChevronDown size={13} strokeWidth={1.5} color="#43484E" />
      </button>
      {open && (
        <div
          className="absolute"
          style={{
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            padding: 4,
            background: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "var(--shadow-depth-3)",
            borderRadius: 10,
            zIndex: 20,
          }}
        >
          {options.map((o) => {
            const active = o.key === sort;
            return (
              <button
                key={o.key}
                onClick={() => {
                  setSort(o.key);
                  setOpen(false);
                }}
                className="flex flex-row items-center"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  gap: 10,
                  background: active ? "var(--surface-chip)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  lineHeight: "16px",
                  color: "var(--text-1)",
                  textAlign: "left",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropertyRoster({
  rows,
  onOpen,
}: {
  rows: PropertyRecord[];
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 12,
        gap: 4,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      {rows.map((p) => (
        <PropertyRow key={p.id} property={p} onOpen={() => onOpen(p.id)} />
      ))}
    </div>
  );
}

function PropertyRow({
  property,
  onOpen,
}: {
  property: PropertyRecord;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  const palette = CLOSE_STATUS_PALETTE[property.closeStatus];
  const dotColor = STATUS_DOT_BY_CLOSE[property.closeStatus];
  const hasOpen = property.openItems > 0;

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      className="flex flex-col text-left"
      style={{
        width: "100%",
        padding: "12px 14px",
        gap: 6,
        background: hover ? "#FFFFFF" : "transparent",
        border: hover ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: 10,
        cursor: "pointer",
        transition:
          "background 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        fontFamily: "inherit",
      }}
    >
      {/* Row 1 — status anchor cluster on the right: close pill + open-items
       * urgency badge (when > 0). Bank cluster moved to row 2 as quieter
       * context so the address ↔ status read becomes the primary axis. */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 10 }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dotColor,
            boxShadow: hover
              ? "0 0 0 2px #FFFFFF, 0 0 0 3px rgba(48,59,69,0.08)"
              : "0 0 0 2px #F7F8FA",
            flexShrink: 0,
          }}
        />
        <span
          className="truncate"
          style={{
            fontSize: 16,
            lineHeight: "19px",
            color: "var(--text-1)",
          }}
        >
          {property.address}
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-4)",
          }}
        >
          ·
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {property.code}
        </span>

        <div className="flex-1" />

        {hasOpen && <OpenBadge count={property.openItems} />}
        <CloseStatusPill palette={palette} />
        <span
          style={{
            width: 18,
            height: 18,
            color: "var(--text-2)",
            opacity: hover ? 0.85 : 0,
            transition: "opacity 140ms ease",
          }}
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </span>
      </div>

      {/* Row 2 — reference context: entity · market · type/units. Right
       * side carries "Last closed" and the quieted bank cluster so banks
       * read as a property attribute, not a status signal. */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8, paddingLeft: 18 }}
      >
        <span
          className="truncate"
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-3)",
            fontStyle: "italic",
            maxWidth: 320,
          }}
        >
          {property.legalEntity}
        </span>
        <Sep />
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
          }}
        >
          {property.market}
        </span>
        <Sep />
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
          }}
        >
          {property.type} · {property.units} units
        </span>
        <div className="flex-1" />
        <span
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-4)",
            whiteSpace: "nowrap",
          }}
        >
          {property.lastReconciled === "Never"
            ? "Never reconciled"
            : `Last closed ${property.lastReconciled}`}
        </span>
        <BankCluster banks={property.banks} hover={hover} />
      </div>
    </button>
  );
}

/* Urgency badge — surfaces "N open" right next to the close-status pill so
 * the property-with-problems jumps out on scan. Red dot anchor + count;
 * stays quiet when count is 0 (the row simply omits it). */
function OpenBadge({ count }: { count: number }) {
  return (
    <span
      className="flex flex-row items-center"
      style={{
        height: 22,
        padding: "0 8px 0 6px",
        gap: 5,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: 11,
        lineHeight: "14px",
        color: "#A40000",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: "var(--dot-failed)",
          display: "inline-block",
        }}
      />
      {count} open
    </span>
  );
}

function Sep() {
  return (
    <span
      style={{
        fontSize: 12,
        lineHeight: "14px",
        color: "var(--text-4)",
      }}
    >
      ·
    </span>
  );
}

/* Bank cluster — quieted to row-2 context. Smaller dots, softer ring, no
 * shadow under each tile. Reads as "these are the bank accounts" without
 * competing with the close-status pill on row 1. */
function BankCluster({
  banks,
  hover,
}: {
  banks: PropertyBankMapping[];
  hover: boolean;
}) {
  const visible = banks.slice(0, 4);
  const extra = banks.length - visible.length;
  const ringColor = hover ? "#FFFFFF" : "#F7F8FA";

  return (
    <div className="flex flex-row items-center" style={{ flexShrink: 0 }}>
      {visible.map((b, i) => (
        <div
          key={b.id}
          style={{
            width: 20,
            height: 20,
            marginLeft: i === 0 ? 0 : -6,
            borderRadius: 999,
            background: "#FFFFFF",
            boxShadow: `0 0 0 1.5px ${ringColor}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: visible.length - i,
            position: "relative",
            transition: "box-shadow 140ms ease",
          }}
        >
          <Image
            src={b.logoSrc}
            alt=""
            width={20}
            height={20}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -6,
            paddingInline: 5,
            height: 20,
            minWidth: 20,
            borderRadius: 999,
            background: "var(--surface-chip)",
            boxShadow: `0 0 0 1.5px ${ringColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            lineHeight: "12px",
            color: "var(--text-2)",
            position: "relative",
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

function CloseStatusPill({
  palette,
}: {
  palette: (typeof CLOSE_STATUS_PALETTE)[CloseStatus];
}) {
  return (
    <span
      style={{
        padding: "4px 10px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "14px",
        color: palette.text,
        whiteSpace: "nowrap",
      }}
    >
      {palette.label}
    </span>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: "100%",
        padding: "48px 24px",
        gap: 16,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--surface-chip)",
          border: "1px solid #FFFFFF",
        }}
      >
        <Search size={20} strokeWidth={1.4} color="#7C8C9A" />
      </div>
      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 16,
            lineHeight: "19px",
            color: "var(--text-1)",
          }}
        >
          No properties match
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
          }}
        >
          Try a different search term or clear the active filter.
        </span>
      </div>
      <button
        onClick={onClear}
        style={{
          height: 32,
          padding: "0 14px",
          background: "#F2F4FB",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-1)",
        }}
      >
        Clear filters
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * DETAIL VIEW
 * ───────────────────────────────────────────────────────────── */

function PropertyDetail({
  property,
  onBack,
  onStartSession,
}: {
  property: PropertyRecord;
  onBack: () => void;
  onStartSession: () => void;
}) {
  return (
    <main
      className="flex flex-col items-center flex-1 min-w-0 relative overflow-auto scroll-thin"
      style={{ padding: "28px 60px 48px", background: "var(--bg-grad)" }}
    >
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1120, gap: 24 }}
      >
        <DetailHeader
          property={property}
          onBack={onBack}
          onStartSession={onStartSession}
        />
        {/* Order = the reconciler's journey through this property:
         *   1. "Where does this stand right now?"  → StatusStrip (hero)
         *   2. "Are the bank mappings correct?"    → BankMappingsCard (most-edited)
         *   3. "Accounting setup OK?"              → AccountingCard (config)
         *   4. "Who owns it / who's responsible?"  → IdentityCard (reference)
         *   5. "What's happened lately?"           → RecentSessionsCard (trail) */}
        <StatusStrip property={property} />
        <BankMappingsCard banks={property.banks} />
        <AccountingCard property={property} />
        <IdentityCard property={property} />
        {property.recentSessions && property.recentSessions.length > 0 && (
          <RecentSessionsCard sessions={property.recentSessions} />
        )}
      </div>
    </main>
  );
}

/* StatusStrip — hero at the top of the detail body. Surfaces the at-a-glance
 * "where does this property stand right now" as a single calibrated row so
 * the eye doesn't have to drill into the Accounting card to learn it. Mirrors
 * the Dashboard OverviewCard pattern: one bento, metric columns separated by
 * thin inset dividers. */
function StatusStrip({ property }: { property: PropertyRecord }) {
  const palette = CLOSE_STATUS_PALETTE[property.closeStatus];
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "18px 24px",
        gap: 24,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <StatusMetric label="Close status">
        <CloseStatusPill palette={palette} />
      </StatusMetric>
      <StripDivider />
      <StatusMetric label="Last reconciled">
        <span
          style={{
            fontSize: 18,
            lineHeight: "22px",
            color:
              property.lastReconciled === "Never"
                ? "var(--text-4)"
                : "var(--text-1)",
            fontStyle: property.lastReconciled === "Never" ? "italic" : "normal",
          }}
        >
          {property.lastReconciled === "Never"
            ? "Never"
            : property.lastReconciled}
        </span>
      </StatusMetric>
      <StripDivider />
      <StatusMetric label="Open items">
        <span
          style={{
            fontSize: 22,
            lineHeight: "26px",
            color:
              property.openItems > 0 ? "#A40000" : "var(--text-1)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {property.openItems}
        </span>
      </StatusMetric>
      <StripDivider />
      <StatusMetric label="Exceptions">
        <span
          style={{
            fontSize: 22,
            lineHeight: "26px",
            color:
              property.exceptions > 0 ? "#A40000" : "var(--text-1)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {property.exceptions}
        </span>
      </StatusMetric>
    </div>
  );
}

function StatusMetric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ gap: 6, flex: 1, minWidth: 0 }}
    >
      <span
        style={{
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function StripDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 36,
        background: "var(--line-soft)",
        flexShrink: 0,
      }}
    />
  );
}

function DetailHeader({
  property,
  onBack,
  onStartSession,
}: {
  property: PropertyRecord;
  onBack: () => void;
  onStartSession: () => void;
}) {
  /* The detail header used to repeat the close-status pill + entity/code/
   * type/units beneath the title — but those facts now live in the
   * StatusStrip (close status) and IdentityCard (entity, code, type, units)
   * below. Header keeps just the back chip, the house icon with its status
   * dot, the address, and the Start-a-session CTA. */
  const dot = STATUS_DOT_BY_CLOSE[property.closeStatus];
  return (
    <div className="flex flex-col items-start" style={{ width: "100%", gap: 12 }}>
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
          fontFamily: "inherit",
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to properties
      </button>

      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 16, minHeight: 40 }}
      >
        <div className="relative shrink-0" style={{ width: 32, height: 32 }}>
          <House size={32} strokeWidth={1.25} color="#464A51" />
          <span
            className="absolute"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              right: -2,
              bottom: -2,
              background: dot,
              boxShadow: "0 0 0 2px #ECEEF3",
            }}
          />
        </div>
        <h1
          className="flex-1 truncate"
          style={{
            fontSize: 28,
            lineHeight: "34px",
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          {property.address}
        </h1>
        <button
          onClick={onStartSession}
          className="flex flex-row items-center shrink-0"
          style={{
            height: 40,
            padding: "0 18px 0 14px",
            gap: 10,
            background: "var(--action-primary)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "var(--shadow-depth-2)",
            borderRadius: 999,
            cursor: "pointer",
            color: "var(--action-on-primary)",
            fontFamily: "inherit",
            fontSize: 14,
            lineHeight: "17px",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={13} strokeWidth={2} />
          </span>
          <span>Start a session</span>
          <ArrowUpRight size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function DetailCard({
  eyebrow,
  count,
  onEdit,
  children,
  action,
}: {
  eyebrow: string;
  count?: string;
  onEdit?: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 24,
        gap: 16,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8 }}
      >
        <span
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
          }}
        >
          {eyebrow}
        </span>
        {count && (
          <span
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-4)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            · {count}
          </span>
        )}
        <div className="flex-1" />
        {action}
        {onEdit && <EditPencil onClick={onEdit} />}
      </div>
      {children}
    </div>
  );
}

function EditPencil({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--text-2)",
      }}
      aria-label="Edit"
      title="Edit"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-chip)";
        e.currentTarget.style.borderColor = "#FFFFFF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <Pencil size={14} strokeWidth={1.6} />
    </button>
  );
}

function FieldGrid({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div
      className="grid"
      style={{
        width: "100%",
        gridTemplateColumns: "1fr 1fr",
        rowGap: 16,
        columnGap: 32,
      }}
    >
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col" style={{ gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-2)",
            }}
          >
            {r.label}
          </span>
          <span
            style={{
              fontSize: 14,
              lineHeight: "17px",
              color: "var(--text-1)",
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function IdentityCard({ property }: { property: PropertyRecord }) {
  return (
    <DetailCard eyebrow="Identity" onEdit={() => {}}>
      <FieldGrid
        rows={[
          { label: "Legal entity", value: property.legalEntity },
          { label: "Property code", value: property.code },
          { label: "Ledger property ID", value: property.ledgerPropertyId },
          { label: "Market", value: property.market },
          { label: "Asset type", value: property.type },
          { label: "Units", value: `${property.units}` },
          { label: "Owner", value: property.owner },
          { label: "Accountant", value: property.accountant },
        ]}
      />
    </DetailCard>
  );
}

/* Accounting card — now pure setup. The dynamic status signals (close
 * status, open items, exceptions, last reconciled) live in the StatusStrip
 * above; this card carries only the configurable / rarely-changing fields
 * so it reads as "how is accounting wired up" rather than "how is this
 * property doing." */
function AccountingCard({ property }: { property: PropertyRecord }) {
  return (
    <DetailCard eyebrow="Accounting setup" onEdit={() => {}}>
      <FieldGrid
        rows={[
          { label: "Ledger source", value: property.ledgerSource },
          { label: "Fiscal calendar", value: property.fiscalCalendar },
          { label: "Current period", value: property.period },
          { label: "Tie-out", value: property.tieOut },
        ]}
      />
    </DetailCard>
  );
}

/* Brand catalog — the three banks the prototype supports. Picking a brand
 * auto-derives logo, full name, short name, and routing number, so the
 * editor form only needs to capture the property-specific fields (type,
 * masked account, GL). */
const BRAND_OPTIONS: {
  shortName: string;
  name: string;
  logoSrc: string;
  bankId: string;
}[] = [
  {
    shortName: "Chase",
    name: "JPMorgan Chase Bank, N.A.",
    logoSrc: "/logos/chase.png",
    bankId: "021000021",
  },
  {
    shortName: "Wells Fargo",
    name: "Wells Fargo Bank, N.A.",
    logoSrc: "/logos/wells-fargo.png",
    bankId: "121000248",
  },
  {
    shortName: "BoA",
    name: "Bank of America, N.A.",
    logoSrc: "/logos/boa.png",
    bankId: "026009593",
  },
];

const TYPE_OPTIONS = [
  "Operating",
  "Reserve",
  "Escrow",
  "Security Deposit",
  "Construction",
  "CapEx",
];

type BankCardMode =
  | { kind: "normal" }
  | { kind: "adding" }
  | { kind: "editing"; id: string }
  | { kind: "removing"; id: string };

/* Bank mappings card — owns the local list of bank mappings and the
 * lightweight state machine for the inline add / edit / remove flows.
 * Each row can swap to an editor or a delete-confirm in place, so the
 * card never reflows or pushes the user into a modal.
 *
 * Reset semantics: PropertyDetail re-mounts when navigating between
 * properties (PropertiesCanvas keys on selectedId via the conditional
 * render), so the local banks state always starts from the seed for the
 * property being viewed. */
function BankMappingsCard({ banks: initialBanks }: { banks: PropertyBankMapping[] }) {
  const [banks, setBanks] = useState<PropertyBankMapping[]>(initialBanks);
  const [mode, setMode] = useState<BankCardMode>({ kind: "normal" });

  const handleSave = (next: PropertyBankMapping) => {
    if (mode.kind === "editing") {
      setBanks((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    } else if (mode.kind === "adding") {
      setBanks((prev) => [...prev, next]);
    }
    setMode({ kind: "normal" });
  };

  const handleRemove = (id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    setMode({ kind: "normal" });
  };

  const addDisabled = mode.kind !== "normal";

  return (
    <DetailCard
      eyebrow="Bank mappings"
      count={`${banks.length}`}
      action={
        <button
          onClick={() => setMode({ kind: "adding" })}
          disabled={addDisabled}
          className="flex flex-row items-center"
          style={{
            height: 30,
            padding: "0 12px 0 10px",
            gap: 6,
            background: "#F2F4FB",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-chip)",
            borderRadius: 999,
            cursor: addDisabled ? "not-allowed" : "pointer",
            opacity: addDisabled ? 0.45 : 1,
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-1)",
          }}
        >
          <Plus size={14} strokeWidth={2} color="#43484E" />
          Add bank account
        </button>
      }
    >
      {banks.length === 0 && mode.kind !== "adding" ? (
        <EmptyBanksState onAdd={() => setMode({ kind: "adding" })} />
      ) : (
        <div className="flex flex-col" style={{ width: "100%", gap: 8 }}>
          {banks.map((b) => {
            if (mode.kind === "editing" && mode.id === b.id) {
              return (
                <BankRowEditor
                  key={b.id}
                  initial={b}
                  onSave={handleSave}
                  onCancel={() => setMode({ kind: "normal" })}
                />
              );
            }
            if (mode.kind === "removing" && mode.id === b.id) {
              return (
                <BankRowDeleteConfirm
                  key={b.id}
                  bank={b}
                  onCancel={() => setMode({ kind: "normal" })}
                  onConfirm={() => handleRemove(b.id)}
                />
              );
            }
            return (
              <BankMappingRow
                key={b.id}
                bank={b}
                onEdit={() => setMode({ kind: "editing", id: b.id })}
                onRemove={() => setMode({ kind: "removing", id: b.id })}
                editingBlocked={mode.kind !== "normal"}
              />
            );
          })}
          {mode.kind === "adding" && (
            <BankRowEditor
              onSave={handleSave}
              onCancel={() => setMode({ kind: "normal" })}
            />
          )}
        </div>
      )}
    </DetailCard>
  );
}

/* Bank mapping row — hierarchy:
 *   1. shortName + type pill           (identity, primary weight)
 *   2. Account number (tabular)        (the scan target — leads metadata)
 *   3. GL · Routing                    (small + muted, reference only)
 * Uses `shortName` instead of the verbose legal name ("Chase" vs
 * "JPMorgan Chase Bank, N.A.") so properties with multiple accounts at
 * the same bank don't read as repetition. Full name lives in the
 * row's title attribute for hover. */
function BankMappingRow({
  bank,
  onEdit,
  onRemove,
  editingBlocked,
}: {
  bank: PropertyBankMapping;
  onEdit: () => void;
  onRemove: () => void;
  editingBlocked: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      title={bank.name}
      style={{
        width: "100%",
        padding: "12px 14px",
        gap: 14,
        background: hover ? "#FFFFFF" : "transparent",
        border: hover ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: 10,
        transition:
          "background 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#FFFFFF",
          border: "1px solid rgba(157,179,197,0.35)",
          boxShadow: "var(--shadow-chip)",
        }}
      >
        <Image
          src={bank.logoSrc}
          alt=""
          width={20}
          height={20}
          style={{ objectFit: "contain" }}
        />
      </span>
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ gap: 4 }}
      >
        <div
          className="flex flex-row items-center"
          style={{ gap: 8 }}
        >
          <span
            className="truncate"
            style={{
              fontSize: 15,
              lineHeight: "19px",
              color: "var(--text-1)",
            }}
          >
            {bank.shortName}
          </span>
          <TypePill label={bank.type} />
        </div>
        <div
          className="flex flex-row items-center"
          style={{ gap: 8, fontVariantNumeric: "tabular-nums" }}
        >
          <span
            style={{
              fontSize: 13,
              lineHeight: "16px",
              color: "var(--text-1)",
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {bank.account}
          </span>
          <span style={{ fontSize: 11, lineHeight: "14px", color: "var(--text-4)" }}>·</span>
          <span style={{ fontSize: 11, lineHeight: "14px", color: "var(--text-2)" }}>
            GL {bank.gl}
          </span>
          <span style={{ fontSize: 11, lineHeight: "14px", color: "var(--text-4)" }}>·</span>
          <span style={{ fontSize: 11, lineHeight: "14px", color: "var(--text-4)" }}>
            Routing {bank.bankId}
          </span>
        </div>
      </div>
      <div
        className="flex flex-row items-center"
        style={{
          gap: 2,
          opacity: hover && !editingBlocked ? 1 : 0,
          transition: "opacity 140ms ease",
          pointerEvents: hover && !editingBlocked ? "auto" : "none",
        }}
      >
        <RowIconButton label="Edit bank mapping" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.6} />
        </RowIconButton>
        <RowIconButton label="Remove bank mapping" onClick={onRemove} danger>
          <Trash2 size={14} strokeWidth={1.6} />
        </RowIconButton>
      </div>
    </div>
  );
}

function RowIconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        background: hover ? (danger ? "var(--chip-failed-bg)" : "var(--surface-chip)") : "transparent",
        border: hover
          ? `1px solid ${danger ? "var(--chip-failed-border)" : "#FFFFFF"}`
          : "1px solid transparent",
        borderRadius: 999,
        color: danger && hover ? "#A40000" : "var(--text-2)",
        cursor: "pointer",
        transition: "background 120ms, color 120ms, border-color 120ms",
      }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function TypePill({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        background: "var(--surface-chip)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: 11,
        lineHeight: "14px",
        color: "var(--text-2)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* Inline editor — swaps in place of a normal row when the user clicks
 * Edit, or appears at the end of the list when they click Add. Captures
 * brand (picker), type (datalist), masked account, and GL. The routing
 * number derives from the brand and is shown as a confirmation chip so
 * the user doesn't have to type a 9-digit number they'd just copy from
 * the bank's home page. */
function BankRowEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PropertyBankMapping;
  onSave: (b: PropertyBankMapping) => void;
  onCancel: () => void;
}) {
  const [brandIdx, setBrandIdx] = useState(() => {
    if (!initial) return 0;
    const i = BRAND_OPTIONS.findIndex((o) => o.shortName === initial.shortName);
    return i >= 0 ? i : 0;
  });
  const [type, setType] = useState(initial?.type ?? "Operating");
  const [account, setAccount] = useState(initial?.account ?? "");
  const [gl, setGl] = useState(initial?.gl ?? "");
  const brand = BRAND_OPTIONS[brandIdx];

  const canSave =
    type.trim().length > 0 && account.trim().length > 0 && gl.trim().length > 0;

  const commit = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? `bm-new-${brand.shortName.toLowerCase()}-${account.slice(-4) || "x"}-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: brand.name,
      shortName: brand.shortName,
      logoSrc: brand.logoSrc,
      bankId: brand.bankId,
      type: type.trim(),
      account: account.trim(),
      gl: gl.trim(),
    });
  };

  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 16,
        gap: 14,
        background: "#FFFFFF",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-depth-2)",
        borderRadius: 12,
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8 }}
      >
        <span
          style={{
            fontSize: 12,
            lineHeight: "15px",
            color: "var(--text-2)",
          }}
        >
          {initial ? "Edit bank account" : "Add bank account"}
        </span>
        <div className="flex-1" />
        <span
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-4)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Routing {brand.bankId}
        </span>
      </div>

      {/* Brand picker — 3 tiles. Selected tile gets a primary border + soft
       * inner glow so it reads as "chosen" without competing with the form
       * controls below. */}
      <div className="flex flex-row items-center" style={{ gap: 8 }}>
        {BRAND_OPTIONS.map((b, i) => {
          const active = i === brandIdx;
          return (
            <button
              key={b.shortName}
              type="button"
              onClick={() => setBrandIdx(i)}
              className="flex flex-row items-center"
              style={{
                height: 36,
                padding: "0 12px 0 6px",
                gap: 8,
                background: active ? "#FFFFFF" : "var(--surface-card)",
                border: active
                  ? "1px solid var(--dot-active)"
                  : "1px solid rgba(157,179,197,0.35)",
                boxShadow: active
                  ? "0 0 0 3px rgba(0, 26, 255, 0.12), var(--shadow-chip)"
                  : "var(--shadow-chip)",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: "16px",
                color: "var(--text-1)",
                transition: "all 120ms ease",
              }}
            >
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "#FFFFFF",
                  border: "1px solid rgba(157,179,197,0.35)",
                  boxShadow: "var(--shadow-chip)",
                }}
              >
                <Image
                  src={b.logoSrc}
                  alt=""
                  width={16}
                  height={16}
                  style={{ objectFit: "contain" }}
                />
              </span>
              {b.shortName}
            </button>
          );
        })}
      </div>

      {/* Form fields — 3 columns of label/input. Type uses a datalist so the
       * common purposes autocomplete but custom values are still allowed
       * (the PRODUCT.md contract leaves type open). */}
      <div
        className="grid"
        style={{
          width: "100%",
          gridTemplateColumns: "1fr 1fr 1.4fr",
          gap: 12,
        }}
      >
        <EditorField label="Type">
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            list="bank-type-options"
            placeholder="Operating"
            style={editorInputStyle}
          />
          <datalist id="bank-type-options">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </EditorField>
        <EditorField label="Account">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="******3421"
            style={{ ...editorInputStyle, fontVariantNumeric: "tabular-nums" }}
          />
        </EditorField>
        <EditorField label="GL account">
          <input
            value={gl}
            onChange={(e) => setGl(e.target.value)}
            placeholder="1010 — Operating Cash"
            style={editorInputStyle}
          />
        </EditorField>
      </div>

      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 8 }}
      >
        <Landmark
          size={12}
          strokeWidth={1.5}
          color="var(--text-4)"
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-4)",
          }}
        >
          {brand.name}
        </span>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          style={{
            height: 32,
            padding: "0 14px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: "16px",
            color: "var(--text-2)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={commit}
          disabled={!canSave}
          className="flex flex-row items-center"
          style={{
            height: 32,
            padding: "0 14px 0 12px",
            gap: 6,
            background: canSave ? "var(--action-primary)" : "rgba(48,59,69,0.18)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: canSave ? "var(--shadow-depth-1)" : "none",
            borderRadius: 999,
            cursor: canSave ? "pointer" : "not-allowed",
            color: "var(--action-on-primary)",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: "16px",
            opacity: canSave ? 1 : 0.6,
          }}
        >
          <Check size={13} strokeWidth={2.2} />
          {initial ? "Save changes" : "Add bank account"}
        </button>
      </div>
    </div>
  );
}

const editorInputStyle: React.CSSProperties = {
  width: "100%",
  height: 35,
  padding: "8px 10px",
  background: "var(--surface-input)",
  border: "1px solid var(--line-inner-white)",
  borderRadius: 8,
  outline: "none",
  fontSize: 14,
  lineHeight: "17px",
  color: "var(--text-1)",
  fontFamily: "inherit",
};

function EditorField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-2)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/* Inline delete confirm — the row stays in place but its body is replaced
 * with a "Remove X · Y?" message and two buttons. Same height + radius as
 * a normal row so the list doesn't reflow. */
function BankRowDeleteConfirm({
  bank,
  onCancel,
  onConfirm,
}: {
  bank: PropertyBankMapping;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "12px 14px",
        gap: 14,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 10,
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#FFFFFF",
          border: "1px solid rgba(157,179,197,0.35)",
          boxShadow: "var(--shadow-chip)",
          opacity: 0.6,
        }}
      >
        <Image src={bank.logoSrc} alt="" width={20} height={20} style={{ objectFit: "contain" }} />
      </span>
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
        <span
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--text-1)",
          }}
        >
          Remove this bank mapping?
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {bank.shortName} · {bank.type} · {bank.account}
        </span>
      </div>
      <button
        onClick={onCancel}
        style={{
          height: 32,
          padding: "0 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "16px",
          color: "var(--text-2)",
        }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="flex flex-row items-center"
        style={{
          height: 32,
          padding: "0 14px 0 12px",
          gap: 6,
          background: "#A40000",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "var(--shadow-depth-1)",
          borderRadius: 999,
          cursor: "pointer",
          color: "#FFFFFF",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "16px",
        }}
      >
        <Trash2 size={13} strokeWidth={2} />
        Remove
      </button>
    </div>
  );
}

/* Empty state — shown when a property has zero bank mappings. Friendly
 * prompt to add one because reconciliation literally cannot start without
 * at least one bank linked. */
function EmptyBanksState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: "100%",
        padding: "32px 24px",
        gap: 14,
        background: "rgba(255,255,255,0.45)",
        border: "1px dashed rgba(157,179,197,0.5)",
        borderRadius: 12,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--surface-card)",
          border: "1px solid #FFFFFF",
          boxShadow: "var(--shadow-chip)",
        }}
      >
        <Landmark size={18} strokeWidth={1.4} color="#7C8C9A" />
      </div>
      <div className="flex flex-col items-center" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 15,
            lineHeight: "19px",
            color: "var(--text-1)",
          }}
        >
          No bank accounts linked yet
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
            maxWidth: 340,
          }}
        >
          Add at least one bank account so reconciliation can match
          statements to ledger activity.
        </span>
      </div>
      <button
        onClick={onAdd}
        className="flex flex-row items-center"
        style={{
          height: 34,
          padding: "0 14px 0 10px",
          gap: 8,
          background: "var(--action-primary)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "var(--shadow-depth-2)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--action-on-primary)",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "16px",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={12} strokeWidth={2} />
        </span>
        Add bank account
      </button>
    </div>
  );
}


function RecentSessionsCard({
  sessions,
}: {
  sessions: PropertyRecentSession[];
}) {
  return (
    <DetailCard
      eyebrow="Recent sessions"
      count={`${sessions.length}`}
    >
      <div className="flex flex-col" style={{ width: "100%", gap: 4 }}>
        {sessions.map((s) => (
          <SessionMiniRow key={s.id} session={s} />
        ))}
      </div>
    </DetailCard>
  );
}

function SessionMiniRow({ session }: { session: PropertyRecentSession }) {
  const [hover, setHover] = useState(false);
  const dotColor =
    session.status === "active"
      ? "var(--dot-active)"
      : session.status === "failed"
      ? "var(--dot-failed)"
      : "var(--dot-complete)";
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "10px 14px",
        gap: 12,
        background: hover ? "#FFFFFF" : "transparent",
        border: hover ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition:
          "background 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor,
          boxShadow: hover
            ? "0 0 0 2px #FFFFFF, 0 0 0 3px rgba(48,59,69,0.08)"
            : "0 0 0 2px #F7F8FA",
        }}
      />
      <span
        style={{
          fontSize: 14,
          lineHeight: "17px",
          color: "var(--text-1)",
        }}
      >
        {session.cycle}
      </span>
      <span
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-4)",
        }}
      >
        ·
      </span>
      <span
        style={{
          fontSize: 12,
          lineHeight: "14px",
          color: "var(--text-2)",
        }}
      >
        {session.statusLabel}
      </span>
      <div className="flex-1" />
      <span
        style={{
          width: 16,
          height: 16,
          color: "var(--text-2)",
          opacity: hover ? 0.85 : 0,
          transition: "opacity 140ms ease",
        }}
      >
        <ChevronRight size={16} strokeWidth={1.5} />
      </span>
    </button>
  );
}
