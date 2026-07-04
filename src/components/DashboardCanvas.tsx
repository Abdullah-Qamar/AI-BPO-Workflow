"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  dashboardCyclePulse,
  dashboardInFlight,
  dashboardNeedsYou,
  dashboardRecent,
  selectedMonth,
  type DashboardSession,
  type SessionDotKind,
} from "@/lib/seed";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { aiObservability } from "@/lib/seed";
import { NewSessionModal } from "./NewSessionModal";
import { AIQualityDetail } from "./AIQualityDetail";

type DashTab = "needs" | "flight" | "completed";
type DashView = "inbox" | "ai-quality";

interface DashboardCanvasProps {
  onStartSession?: (propertyId: string, cycle: string) => void;
}

export function DashboardCanvas({ onStartSession }: DashboardCanvasProps) {
  const [tab, setTab] = useState<DashTab>("needs");
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<DashView>("inbox");

  const rows =
    tab === "needs"
      ? dashboardNeedsYou
      : tab === "flight"
      ? dashboardInFlight
      : dashboardRecent;

  if (view === "ai-quality") {
    return <AIQualityDetail onBack={() => setView("inbox")} />;
  }

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
        style={{ width: "100%", maxWidth: 1120, gap: 32 }}
      >
        <Header />
        <OverviewCard onOpenAIDetails={() => setView("ai-quality")} />
        <ActionCard tab={tab} setTab={setTab} rows={rows} />
        <PrimaryCTA onClick={() => setModalOpen(true)} />
      </div>

      <NewSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(propertyId, cycle) => {
          setModalOpen(false);
          onStartSession?.(propertyId, cycle);
        }}
      />
    </main>
  );
}

function PrimaryCTA({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center justify-between"
      style={{
        width: "100%",
        height: 64,
        padding: "10px 14px 10px 22px",
        background: "var(--action-primary)",
        border: "none",
        borderRadius: 32,
        cursor: "pointer",
        color: "var(--action-on-primary)",
        boxShadow: "0 8px 24px rgba(20, 28, 38, 0.16), 0 2px 6px rgba(20, 28, 38, 0.08)",
        transition: "transform 160ms ease, background 160ms ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        fontFamily: "inherit",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ gap: 12 }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={16} strokeWidth={2} />
        </div>
        <span
          style={{
            fontSize: 16,
            lineHeight: "19px",
            color: "var(--action-on-primary)",
          }}
        >
          Start new reconciliation run
        </span>
      </div>

      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.20)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowUpRight size={18} strokeWidth={2} />
      </div>
    </button>
  );
}

function Header() {
  return (
    <div className="flex flex-col items-start" style={{ width: "100%", gap: 12 }}>
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 12, height: 34 }}
      >
        <LayoutDashboard size={28} strokeWidth={1.25} color="#464A51" />
        <h1
          className="flex-1 truncate"
          style={{
            fontSize: 28,
            lineHeight: "34px",
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          Dashboard
        </h1>
        <button
          className="flex flex-row justify-center items-center"
          style={{
            height: 35,
            padding: "8px 12px 8px 16px",
            gap: 10,
            background: "#F2F4FB",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-chip)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-1)",
            }}
          >
            {selectedMonth}
          </span>
          <ChevronDown size={16} strokeWidth={1.5} color="#43484E" />
        </button>
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        Sessions across your portfolio that need your attention.
      </div>
    </div>
  );
}

function OverviewCard({ onOpenAIDetails }: { onOpenAIDetails: () => void }) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <CycleRow />
      <div
        style={{
          height: 1,
          background: "var(--line-soft)",
          margin: "0 24px",
        }}
      />
      <AIQualityRow onOpenDetails={onOpenAIDetails} />
    </div>
  );
}

function CycleRow() {
  const { label, closed, total, counts } = dashboardCyclePulse;
  const pct = Math.round((closed / total) * 100);

  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "16px 24px",
        gap: 28,
      }}
    >
      <RowLabel title={label} sub={`${closed} of ${total} closed`} />

      <RowDivider />

      <div
        className="flex flex-row items-center flex-1 min-w-0"
        style={{ gap: 12 }}
      >
        <div
          className="flex-1"
          style={{
            height: 6,
            background: "rgba(48,59,69,0.08)",
            borderRadius: 999,
            overflow: "hidden",
            minWidth: 80,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, #1ECF00 0%, #75E55E 100%)",
              borderRadius: 999,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            lineHeight: "17px",
            color: "var(--text-2)",
            whiteSpace: "nowrap",
          }}
        >
          {pct}%
        </span>
      </div>

      <div className="flex flex-row items-center" style={{ gap: 18 }}>
        <PulseCount
          color="var(--dot-active)"
          label={`${counts.review} review`}
        />
        <PulseCount
          color="var(--dot-failed)"
          label={`${counts.failed} failed`}
        />
        <PulseCount
          color="var(--dot-active)"
          label={`${counts.inFlight} in flight`}
        />
      </div>
    </div>
  );
}

function RowLabel({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 4, width: 184, flexShrink: 0 }}>
      <span
        style={{
          fontSize: 13,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 14,
          lineHeight: "17px",
          color: "var(--text-1)",
          whiteSpace: "nowrap",
        }}
      >
        {sub}
      </span>
    </div>
  );
}

function AIQualityRow({ onOpenDetails }: { onOpenDetails: () => void }) {
  const o = aiObservability;
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "16px 24px",
        gap: 28,
      }}
    >
      <RowLabel title="AI quality" sub="Across all sessions" />

      <RowDivider />

      <div
        className="flex flex-row items-center flex-1 min-w-0"
        style={{ gap: 32 }}
      >
        <AIMetric
          value={`${o.accuracy}%`}
          label="accurate"
          trend={o.accuracyTrend}
          higherIsBetter={true}
        />
        <AIMetric
          value={`${o.overrides}%`}
          label="overridden"
          trend={o.overridesTrend}
          higherIsBetter={false}
        />
      </div>

      <button
        onClick={onOpenDetails}
        className="flex flex-row items-center"
        style={{
          height: 32,
          padding: "0 12px",
          gap: 6,
          background: "transparent",
          border: "1px solid var(--line-soft)",
          borderRadius: 999,
          cursor: "pointer",
          color: "var(--text-1)",
          fontFamily: "inherit",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ fontSize: 13, lineHeight: "17px" }}>View details</span>
        <ArrowRight size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}

function RowDivider() {
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

function AIMetric({
  value,
  label,
  trend,
  higherIsBetter,
}: {
  value: string;
  label: string;
  trend: number;
  higherIsBetter: boolean;
}) {
  const flat = trend === 0;
  const positive = higherIsBetter ? trend > 0 : trend < 0;
  const trendColor = flat
    ? "var(--text-3)"
    : positive
    ? "#1A7048"
    : "#A32626";

  return (
    <div
      className="flex flex-row items-baseline"
      style={{ gap: 8, whiteSpace: "nowrap" }}
    >
      <span
        style={{
          fontSize: 22,
          lineHeight: "26px",
          color: "var(--text-1)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 13,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        {label}
      </span>
      <span
        className="flex flex-row items-center"
        style={{ gap: 3, color: trendColor, marginLeft: 4 }}
      >
        {flat ? (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "currentColor",
              opacity: 0.45,
            }}
          />
        ) : positive ? (
          <TrendingUp size={11} strokeWidth={2} />
        ) : (
          <TrendingDown size={11} strokeWidth={2} />
        )}
        <span style={{ fontSize: 11, lineHeight: "14px" }}>
          {flat
            ? "unchanged"
            : `${trend > 0 ? "+" : ""}${trend} pts`}
        </span>
      </span>
    </div>
  );
}

function PulseCount({ color, label }: { color: string; label: string }) {
  return (
    <button
      className="flex flex-row items-center"
      style={{
        gap: 6,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          boxShadow: "0 0 0 2px #F7F8FA",
        }}
      />
      <span
        style={{
          fontSize: 14,
          lineHeight: "17px",
          color: "var(--text-1)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function ActionCard({
  tab,
  setTab,
  rows,
}: {
  tab: DashTab;
  setTab: (t: DashTab) => void;
  rows: DashboardSession[];
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 12,
        gap: 8,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 16,
      }}
    >
      <Tabs tab={tab} setTab={setTab} />
      <div className="flex flex-col" style={{ width: "100%", gap: 4 }}>
        {rows.map((r) => (
          <SessionRow key={r.id} session={r} />
        ))}
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
}: {
  tab: DashTab;
  setTab: (t: DashTab) => void;
}) {
  const items: { key: DashTab; label: string; count: number }[] = [
    { key: "needs", label: "Needs you", count: dashboardNeedsYou.length },
    { key: "flight", label: "In flight", count: dashboardInFlight.length },
    {
      key: "completed",
      label: "Recently completed",
      count: dashboardRecent.length,
    },
  ];

  return (
    <div
      className="flex flex-row items-center"
      style={{ gap: 4, padding: "4px 4px 0" }}
    >
      {items.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex flex-row items-center"
            style={{
              padding: "8px 14px",
              gap: 8,
              background: active
                ? "var(--surface-tab-active)"
                : "transparent",
              border: active
                ? "1px solid #FFFFFF"
                : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: "19px",
              color: active ? "var(--text-1)" : "var(--text-placeholder)",
              fontFamily: "inherit",
            }}
          >
            <span>{t.label}</span>
            <span
              style={{
                fontSize: 12,
                lineHeight: "14px",
                color: active ? "var(--text-2)" : "var(--text-4)",
              }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SessionRow({ session }: { session: DashboardSession }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col text-left"
      style={{
        width: "100%",
        padding: "12px 12px 12px 14px",
        gap: 6,
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid rgba(157, 179, 197, 0.35)"
          : "1px solid transparent",
        borderRadius: 10,
        cursor: "pointer",
        transition:
          "background 140ms ease, border-color 140ms ease",
        fontFamily: "inherit",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 10 }}
      >
        <SessionDot kind={session.dotKind} hover={hover} />
        <span
          className="truncate"
          style={{
            fontSize: 16,
            lineHeight: "19px",
            color: "var(--text-1)",
          }}
        >
          {session.sessionLabel}
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
          title={`${session.fullAddress} · ${session.legalEntity}`}
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-2)",
            borderBottom: "1px dotted var(--line-soft)",
            cursor: "help",
          }}
        >
          {session.shortName}
        </span>

        <div className="flex-1" />

        <BankCluster banks={session.banks} hover={hover} />
        <StatusPill kind={session.dotKind} text={session.statusText} />
        {session.statusText === "Failed" && <RerunPill />}
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

      <div
        className="flex flex-row items-baseline"
        style={{ width: "100%", gap: 8, paddingLeft: 18 }}
      >
        <span
          className="truncate"
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-3)",
            fontStyle: "italic",
          }}
        >
          {session.detail}
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
          {session.startedAt}
        </span>
      </div>
    </button>
  );
}

function RerunPill() {
  const [hover, setHover] = useState(false);
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    // Prototype: visual affordance only. Real wiring would dispatch a rerun
    // action on the session and transition it to `running`.
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      style={{
        gap: 5,
        height: 24,
        padding: "0 10px",
        background: hover ? "#FFFFFF" : "transparent",
        border: "1px solid var(--line-soft)",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--text-1)",
        transition: "background 140ms ease",
        flexShrink: 0,
      }}
    >
      <RotateCcw size={11} strokeWidth={1.75} />
      <span style={{ fontSize: 12, lineHeight: "14px" }}>Rerun</span>
    </span>
  );
}

function SessionDot({
  kind,
  hover,
}: {
  kind: SessionDotKind;
  hover: boolean;
}) {
  const color =
    kind === "blocking"
      ? "var(--dot-failed)"
      : kind === "complete"
      ? "var(--dot-complete)"
      : "var(--dot-active)";

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        boxShadow: hover
          ? "0 0 0 2px #FFFFFF, 0 0 0 3px rgba(48,59,69,0.08)"
          : "0 0 0 2px #F7F8FA",
        flexShrink: 0,
        transition: "box-shadow 140ms ease",
      }}
    />
  );
}

function BankCluster({
  banks,
  hover,
}: {
  banks: DashboardSession["banks"];
  hover: boolean;
}) {
  const visible = banks.slice(0, 4);
  const extra = banks.length - visible.length;
  const ringColor = hover ? "#FFFFFF" : "#F7F8FA";

  return (
    <div className="flex flex-row items-center" style={{ flexShrink: 0 }}>
      {visible.map((b, i) => (
        <div
          key={i}
          style={{
            width: 28,
            height: 28,
            marginLeft: i === 0 ? 0 : -9,
            borderRadius: 999,
            background: "#FFFFFF",
            boxShadow: `0 0 0 2px ${ringColor}, 0 1px 2px rgba(0,0,0,0.06)`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 140ms ease",
            zIndex: visible.length - i,
            position: "relative",
          }}
        >
          <Image
            src={`/logos/${b}.png`}
            alt=""
            width={28}
            height={28}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -9,
            paddingInline: 6,
            height: 28,
            minWidth: 28,
            borderRadius: 999,
            background: "var(--surface-chip)",
            boxShadow: `0 0 0 2px ${ringColor}, 0 1px 2px rgba(0,0,0,0.06)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
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

function StatusPill({
  kind,
  text,
}: {
  kind: SessionDotKind;
  text: string;
}) {
  const palette =
    kind === "blocking"
      ? {
          bg: "var(--chip-failed-bg)",
          border: "var(--chip-failed-border)",
          text: "#A40000",
        }
      : kind === "complete"
      ? {
          bg: "#E8F8E4",
          border: "#B8E2A8",
          text: "#0B5E00",
        }
      : kind === "working"
      ? {
          bg: "#E8EBFF",
          border: "#B7C0FF",
          text: "#001AAE",
        }
      : {
          bg: "var(--surface-chip)",
          border: "#FFFFFF",
          text: "var(--text-1)",
        };

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
      {text}
    </span>
  );
}

