"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquarePlus,
  MessageSquareText,
  RotateCcw,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import {
  getBankMeta,
  type PropertyRecord,
  type PropertySession,
  type RecordBankId,
  type RecordItem,
  type RecordStatus,
} from "@/lib/seed";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/Status";
import { useOptionalSession } from "@/lib/session/SessionProvider";

/* Review canvas — destination of the Summary agent's "Review N records" CTA.
 *
 * The canvas fades + slides in as it mounts (200ms ease-out) so the swap from
 * the workspace/upload view is perceptibly a state change, not an instant
 * teleport. The AgentsPanel simultaneously collapses to its sliver via a
 * width transition — the two animations run in parallel and land together,
 * giving the reviewer a clean "focus mode" gesture. */

/* The tab vocabulary and the record vocabulary are deliberately different
 * words for the same bucket. `RecordStatus` is data ("flagged") and is not
 * user-visible; the tab is the contract's word for it ("Exceptions"). This
 * table is the one place the two meet, so neither leaks into the other.
 * Spec: docs/design-system/decisions.md §1. */
type FilterTab = "exceptions" | "approved" | "all";
const TAB_STATUS: Record<"exceptions" | "approved", RecordStatus> = {
  exceptions: "flagged",
  approved: "approved",
};

type BankFilter = "all" | RecordBankId;

/* One account, in the shape the logo filter needs. Derived from the session's
 * own accounts rather than a hardcoded list, so a property with one account
 * shows one chip and a property with four shows four. */
type BankOption = { key: RecordBankId; logoSrc: string; shortName: string };

/* Per-record reviewer state. With a session in scope this is a projection of
 * the reducer's recordStatusOverrides/recordComments — the source of truth,
 * since the review surface unmounts on close and decisions must outlive it.
 * The local useState copy only serves renders outside a SessionProvider.
 *
 * commentText is the actual reviewer feedback — persisted per record when
 * the user saves. Undefined means no comment; "" means an in-flight draft
 * we haven't saved yet. */
type RecordOverride = {
  status?: RecordStatus;
  commentText?: string;
};

type Toast = {
  id: string;
  kind: "approved" | "exception";
  message: string;
  detail?: string;
  onUndo?: () => void;
};

export function ReviewCanvas({ onBack }: { onBack: () => void }) {
  /* Optional so the canvas still renders in isolation (e.g. design review
   * outside a session). With a session present, record moves dispatch to the
   * shared reducer — the workspace's summary band, bank rows, and "Review N"
   * CTA all track the review as it happens. */
  const session = useOptionalSession();
  /* A live review lands on the exceptions, which are the work. A posted run
   * has no work left, so it lands on the whole record instead of on a filter
   * that is usually empty by then. */
  const [tab, setTab] = useState<FilterTab>(() =>
    session && session.state.runState !== "review" ? "all" : "exceptions"
  );
  /* Opens filtered to one account when the reviewer arrived by clicking that
   * account's progress row in the agents panel. That row dispatches
   * `openReview(bankId)`; before this read, the reducer stored the id and
   * nothing ever looked at it, so a click that clearly meant "show me this
   * account" landed on all four. */
  const [bankFilter, setBankFilter] = useState<BankFilter>(
    () => session?.state.reviewOpenBankId ?? "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localOverrides, setOverrides] = useState<
    Record<string, RecordOverride>
  >({});

  /* Everything the canvas describes belongs to the open session. Reading the
   * module-level `activeProperty` / `reconciledRecords` / `selectedMonth`
   * instead meant every session, whichever property it belonged to, rendered
   * 1849 Westlake's address and 1849 Westlake's 204 records. */
  const property = session?.property ?? null;
  const propertySession = session?.session ?? null;
  const records = useMemo(() => session?.records ?? [], [session]);
  const banks = session?.banks;

  /* A run is only editable while it is waiting on a person. The reducer has
   * always gated `moveRecord` on `runState === "review"`, but the canvas is
   * reachable after posting too — so an approve click on a posted run flashed
   * the row and raised a toast while the reducer quietly discarded it. The
   * controls are gone in that state rather than lying about what they do. */
  const runState = session?.state.runState ?? "review";
  const readOnly = runState !== "review";
  const failed = runState === "failed";

  const bankOptions = useMemo<BankOption[]>(
    () =>
      (banks ?? []).map((b) => {
        const meta = getBankMeta(b.id);
        return {
          key: b.id,
          logoSrc: meta.logoSrc,
          shortName: meta.shortName,
        };
      }),
    [banks]
  );

  /* Session state wins when present so decisions survive the drawer
   * unmounting; the local map only carries provider-less renders. */
  const overrides = useMemo<Record<string, RecordOverride>>(() => {
    if (!session) return localOverrides;
    const out: Record<string, RecordOverride> = {};
    for (const [id, status] of Object.entries(
      session.state.recordStatusOverrides
    )) {
      out[id] = { status };
    }
    for (const [id, commentText] of Object.entries(
      session.state.recordComments
    )) {
      out[id] = { ...out[id], commentText };
    }
    return out;
  }, [session, localOverrides]);
  /* Just-moved ids so the row can flash a brief "moved" acknowledgement
   * before settling into its new bucket. Cleared 900ms after the action. */
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  /* When the user clicks the comment icon on a collapsed row we auto-expand
   * AND queue a focus request for its textarea. RecordDetail consumes this
   * flag on mount and clears it after focusing. */
  const [focusCommentFor, setFocusCommentFor] = useState<string | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      window.setTimeout(() => dismissToast(t.id), 4200);
    },
    [dismissToast]
  );

  const toggleStatus = useCallback(
    (r: RecordItem) => {
      /* Belt and braces with the hidden controls above: nothing here may run
       * on a run the reducer will not accept a move for. */
      if (readOnly) return;
      const currentStatus = r.status;
      const nextStatus: RecordStatus =
        currentStatus === "flagged" ? "approved" : "flagged";
      if (session) {
        session.moveRecord(r.id, r.bankId, nextStatus);
      } else {
        setOverrides((prev) => ({
          ...prev,
          [r.id]: { ...prev[r.id], status: nextStatus },
        }));
      }
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

      const toastId = `t-${r.id}-${nextStatus}-${toasts.length}`;
      pushToast({
        id: toastId,
        kind: nextStatus === "approved" ? "approved" : "exception",
        message:
          nextStatus === "approved"
            ? "Moved to Approved"
            : "Moved to Exceptions",
        detail: r.title,
        onUndo: () => {
          if (session) {
            session.moveRecord(r.id, r.bankId, currentStatus);
          } else {
            setOverrides((prev) => {
              const copy = { ...prev };
              const cur = copy[r.id];
              if (cur) {
                const { status: _s, ...rest } = cur;
                copy[r.id] =
                  Object.keys(rest).length > 0
                    ? (rest as RecordOverride)
                    : {};
                if (Object.keys(copy[r.id]).length === 0) delete copy[r.id];
              }
              return copy;
            });
          }
          dismissToast(toastId);
        },
      });
    },
    [dismissToast, pushToast, toasts.length, session, readOnly]
  );

  /* Comment icon click. Two behaviors depending on current state:
   *   - row collapsed → expand it AND set focus target so the textarea
   *     auto-focuses on mount. Feels like one gesture: click comment →
   *     you're immediately typing.
   *   - row expanded  → focus the textarea (no collapse; the click here
   *     just re-enters the note field). */
  const openCommentEditor = useCallback((r: RecordItem) => {
    setExpandedId(r.id);
    setFocusCommentFor(r.id);
  }, []);

  const setCommentText = useCallback(
    (id: string, text: string | undefined) => {
      if (session) {
        session.setRecordComment(id, text);
        return;
      }
      setOverrides((prev) => {
        const copy = { ...prev };
        const cur = copy[id] ?? {};
        if (text === undefined || text.trim() === "") {
          const { commentText: _c, ...rest } = cur;
          copy[id] = rest as RecordOverride;
          if (Object.keys(copy[id]).length === 0) delete copy[id];
        } else {
          copy[id] = { ...cur, commentText: text };
        }
        return copy;
      });
    },
    [session]
  );

  const clearFocusCommentFor = useCallback(() => setFocusCommentFor(null), []);

  const effective = useMemo(() => {
    return records.map((r) => {
      const ov = overrides[r.id];
      return ov?.status
        ? ({ ...r, status: ov.status } as RecordItem)
        : r;
    });
  }, [records, overrides]);

  const counts = useMemo(() => {
    let exceptions = 0;
    let approved = 0;
    for (const r of effective) {
      if (r.status === "flagged") exceptions++;
      else approved++;
    }
    return { exceptions, approved, all: effective.length };
  }, [effective]);

  const visible = useMemo(() => {
    return effective.filter((r) => {
      if (tab !== "all" && r.status !== TAB_STATUS[tab]) return false;
      if (bankFilter !== "all" && r.bankId !== bankFilter) return false;
      return true;
    });
  }, [effective, tab, bankFilter]);

  /* The unreconciled delta: what the open exceptions add up to, signed, so a
   * $4,318 unmatched deposit and a $210 unmatched refund do not cancel into
   * silence. It used to be the literal "$0.00" sitting beside eight
   * unmatched records, which is the one figure on the band nobody could
   * check. If it does net to zero it now does so as a fact. */
  const netDifference = useMemo(
    () =>
      effective.reduce(
        (sum, r) => (r.status === "flagged" ? sum + r.amount : sum),
        0
      ),
    [effective]
  );

  /* Posting is the review's exit, so its CTA lives here at the frontier of
   * the work — not back on the workspace. Only offered while the session is
   * actually in review; re-reading records after posting gets no button. */
  const canPost = runState === "review" && !!session;

  /* Leaving clears the "opened for this account" pointer, so coming back in by
   * a route that did not name an account starts on all of them. */
  const leave = () => {
    session?.closeReview();
    onBack();
  };
  const onPost = () => {
    session?.startYardiUpdate();
    leave();
  };

  return (
    <main
      className="flex flex-col items-start flex-1 min-w-0 relative overflow-auto scroll-thin canvas-pad review-canvas-enter"
      style={{ gap: "var(--space-6)", background: "var(--bg-grad)" }}
    >
      <Header
        onBack={leave}
        property={property}
        session={propertySession}
        cycle={session?.state.cycle}
        total={counts.all}
        notice={failed ? null : readOnlyNotice(runState)}
        onPost={canPost ? onPost : undefined}
      />
      {failed ? (
        <FailedState
          note={session?.state.failureNote}
          onRetry={session?.retryRun}
        />
      ) : (
        <>
          <StatsBand counts={counts} netDifference={netDifference} />
          <FiltersRow
            tab={tab}
            setTab={setTab}
            bankFilter={bankFilter}
            setBankFilter={setBankFilter}
            counts={counts}
            bankOptions={bankOptions}
          />
          <RecordList
            records={visible}
            total={counts.all}
            expandedId={expandedId}
            onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
            onToggleStatus={toggleStatus}
            onCommentClick={openCommentEditor}
            overrides={overrides}
            recentlyMoved={recentlyMoved}
            focusCommentFor={focusCommentFor}
            clearFocusCommentFor={clearFocusCommentFor}
            setCommentText={setCommentText}
            readOnly={readOnly}
          />
        </>
      )}

      <ToastLayer toasts={toasts} onDismiss={dismissToast} />

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

/* One quiet line saying why the approve and exception controls are not here.
 * A surface that silently drops its controls reads as broken; one that says
 * "this is a record of what was decided" reads as finished. */
function readOnlyNotice(runState: string): string | null {
  if (runState === "review") return null;
  if (runState === "complete") {
    return "This session is posted. Its records are a record of what was decided.";
  }
  if (runState === "updating-yardi") {
    return "This session is posting to Yardi. Its records are settled and can no longer be changed.";
  }
  return "This session is not in review, so its records can no longer be changed.";
}

/* ---------- Header ---------- */

function Header({
  onBack,
  property,
  session,
  cycle,
  total,
  notice,
  onPost,
}: {
  onBack: () => void;
  property: PropertyRecord | null;
  session: PropertySession | null;
  cycle: string | undefined;
  total: number;
  notice: string | null;
  onPost?: () => void;
}) {
  /* Identity, then which run, then how much of it. `session.label` already
   * carries the "May 2026 · Re-run" disambiguation, so the canvas never has
   * to invent one; the cycle is the fallback for a session the seed has no
   * row for yet. */
  const parts = [
    property?.shortAddress,
    property?.code,
    session?.label ?? cycle,
    onPost ? `${total} records ready for Yardi` : `${total} records`,
  ].filter(Boolean);

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: "var(--space-6)", paddingTop: 4 }}
    >
      <Button
        variant="secondary"
        size="md"
        onClick={onBack}
        leftIcon={<ArrowLeft size={14} strokeWidth={1.75} />}
      >
        Back to session
      </Button>
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: "var(--space-5)" }}
      >
        <div
          className="flex flex-col items-start flex-1 min-w-0"
          style={{ gap: "var(--space-2)" }}
        >
          <h1
            className="truncate t-heading"
            style={{ width: "100%", color: "var(--ink-primary)" }}
          >
            Review records
          </h1>
          <span
            className="truncate t-body"
            style={{ width: "100%", color: "var(--ink-secondary)" }}
          >
            {parts.join(" · ")}
          </span>
          {notice && (
            <span
              className="truncate t-meta"
              style={{ width: "100%", color: "var(--ink-tertiary)" }}
            >
              {notice}
            </span>
          )}
        </div>
        {onPost && (
          <Button
            variant="primary"
            size="md"
            onClick={onPost}
            rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
          >
            Post to Yardi
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Failed run ---------- */

/* A failed session produced no records at all, so the filters, the stats band
 * and the empty list would all be furniture around an absence. It names the
 * reason the run stopped instead, and offers the only move that helps. */
function FailedState({
  note,
  onRetry,
}: {
  note?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: "100%",
        padding: "var(--space-8)",
        gap: "var(--space-5)",
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: "var(--status-danger-bg)",
          color: "var(--status-danger-ink)",
        }}
      >
        <TriangleAlert size={20} strokeWidth={1.5} aria-hidden />
      </span>
      <div className="flex flex-col items-start" style={{ gap: "var(--space-3)" }}>
        <span className="t-title" style={{ color: "var(--ink-primary)" }}>
          This session failed, so there are no records to review
        </span>
        <span className="t-prose" style={{ color: "var(--ink-secondary)" }}>
          {note ??
            "The run stopped before it reconciled anything, and no reason was recorded."}
        </span>
      </div>
      {onRetry && (
        <Button
          variant="primary"
          size="md"
          onClick={onRetry}
          leftIcon={<RotateCcw size={14} strokeWidth={1.75} />}
        >
          Retry run
        </Button>
      )}
    </div>
  );
}

/* ---------- Stats band ---------- */

/* Four readings, not five. "Settled on its own" measured the agent rather than
 * the review: it was the one figure on the band that never moved while the
 * reviewer worked, and it answered a question the workspace's summary band had
 * already answered before anyone got here.
 *
 * What is left divides cleanly. Three counts of the same thing on the left,
 * hairline-separated, which is the set the tab strip below filters by; the
 * money on the right, alone, because a signed dollar delta is not a fourth
 * count and reading it as one is how a band like this gets misread. */
function StatsBand({
  counts,
  netDifference,
}: {
  counts: { exceptions: number; approved: number; all: number };
  netDifference: number;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "var(--space-7) var(--space-8)",
        gap: "var(--space-8)",
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <Stat label="Records" value={String(counts.all)} />
      <Divider />
      <Stat
        label="Approved"
        value={String(counts.approved)}
        tone="ok"
      />
      <Divider />
      <Stat
        label="Exceptions"
        value={String(counts.exceptions)}
        tone="danger"
      />
      <div style={{ flex: 1 }} />
      <Stat label="Net difference" value={formatAmount(netDifference)} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div className="flex flex-col items-start" style={{ gap: "var(--space-3)" }}>
      <span className="t-body" style={{ color: "var(--ink-secondary)" }}>
        {label}
      </span>
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-3)" }}
      >
        {tone && <StatusDot tone={tone} ring />}
        <span
          className="nums t-heading"
          style={{
            color: tone
              ? tone === "ok"
                ? "var(--status-ok-ink)"
                : "var(--status-danger-ink)"
              : "var(--ink-primary)",
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

/* Filters row — one tab strip recipe, the app's (decisions.md §2): the active
 * tab is `--surface-tab-active` under a white hairline, not a colour of its
 * own. Bank filter sits at the right edge as a logo cluster; clicking a logo
 * toggles that account's filter — click again to clear. All accounts
 * selected == "all". */
function FiltersRow({
  tab,
  setTab,
  bankFilter,
  setBankFilter,
  counts,
  bankOptions,
}: {
  tab: FilterTab;
  setTab: (t: FilterTab) => void;
  bankFilter: BankFilter;
  setBankFilter: (b: BankFilter) => void;
  counts: { exceptions: number; approved: number; all: number };
  bankOptions: BankOption[];
}) {
  const options: {
    key: FilterTab;
    label: string;
    tone?: "ok" | "danger";
    count: number;
  }[] = [
    {
      key: "exceptions",
      label: "Exceptions",
      tone: "danger",
      count: counts.exceptions,
    },
    { key: "approved", label: "Approved", tone: "ok", count: counts.approved },
    { key: "all", label: "All", count: counts.all },
  ];
  return (
    <div
      className="flex flex-row items-center"
      style={{ width: "100%", gap: "var(--space-4)" }}
    >
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-2)" }}
      >
        {options.map((o) => (
          <TabButton
            key={o.key}
            active={o.key === tab}
            onClick={() => setTab(o.key)}
            tone={o.tone}
            label={o.label}
            count={o.count}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <BankLogoCluster
        bankFilter={bankFilter}
        setBankFilter={setBankFilter}
        bankOptions={bankOptions}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  tone,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "ok" | "danger";
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-row items-center"
      style={{
        height: "var(--control-md)",
        padding: "0 10px",
        gap: "var(--space-3)",
        background: active ? "var(--surface-tab-active)" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-control)",
        cursor: "pointer",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
        fontFamily: "inherit",
      }}
    >
      {tone && <StatusDot tone={tone} />}
      <span>{label}</span>
      <span
        className="nums"
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: active ? "var(--ink-secondary)" : "var(--ink-tertiary)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* Bank logo cluster — the account filter, drawn from the session's own
 * accounts. It used to be a hardcoded four, which meant a property with one
 * account still offered four chips, three of which filtered to nothing. */
function BankLogoCluster({
  bankFilter,
  setBankFilter,
  bankOptions,
}: {
  bankFilter: BankFilter;
  setBankFilter: (b: BankFilter) => void;
  bankOptions: BankOption[];
}) {
  if (bankOptions.length === 0) return null;
  return (
    <div
      className="flex flex-row items-center"
      style={{
        gap: "var(--space-2)",
        padding: "var(--space-2)",
        background: "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
      }}
    >
      <BankLogoButton
        active={bankFilter === "all"}
        onClick={() => setBankFilter("all")}
        ariaLabel="Show all accounts"
      >
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            padding: "0 8px",
            color:
              bankFilter === "all"
                ? "var(--ink-primary)"
                : "var(--ink-tertiary)",
          }}
        >
          All
        </span>
      </BankLogoButton>
      {bankOptions.map((b) => (
        <BankLogoButton
          key={b.key}
          active={bankFilter === b.key}
          onClick={() => setBankFilter(bankFilter === b.key ? "all" : b.key)}
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
      data-hint={title}
      className="flex items-center justify-center transition"
      style={{
        height: "var(--control-md)",
        minWidth: 28,
        padding: 2,
        background: active
          ? "var(--surface-tab-active)"
          : hover
          ? "var(--surface-control-hover)"
          : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: 999,
        cursor: "pointer",
        color: "var(--ink-primary)",
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
  total,
  expandedId,
  onToggle,
  onToggleStatus,
  onCommentClick,
  overrides,
  recentlyMoved,
  focusCommentFor,
  clearFocusCommentFor,
  setCommentText,
  readOnly,
}: {
  records: RecordItem[];
  /* How many the session has before either filter is applied. Nothing at all
   * and nothing THIS filter matches are different facts, and saying the second
   * where the first is true sends the reader hunting for a filter to clear. */
  total: number;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onToggleStatus: (r: RecordItem) => void;
  onCommentClick: (r: RecordItem) => void;
  overrides: Record<string, RecordOverride>;
  recentlyMoved: Set<string>;
  focusCommentFor: string | null;
  clearFocusCommentFor: () => void;
  setCommentText: (id: string, text: string | undefined) => void;
  readOnly: boolean;
}) {
  if (records.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center t-body"
        style={{
          width: "100%",
          padding: "var(--space-9) 0",
          color: "var(--ink-secondary)",
        }}
      >
        {total === 0
          ? "This session reconciled no records."
          : "No records match the current filter."}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: "100%", gap: "var(--space-4)", paddingBottom: 48 }}
    >
      {records.map((r) => (
        <RecordRow
          key={r.id}
          record={r}
          expanded={r.id === expandedId}
          onToggle={() => onToggle(r.id)}
          onToggleStatus={() => onToggleStatus(r)}
          onCommentClick={() => onCommentClick(r)}
          commentText={overrides[r.id]?.commentText}
          moved={recentlyMoved.has(r.id)}
          focusCommentOnMount={focusCommentFor === r.id}
          onCommentFocused={clearFocusCommentFor}
          onSaveComment={(text) => setCommentText(r.id, text)}
          readOnly={readOnly}
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
  onCommentClick,
  commentText,
  moved,
  focusCommentOnMount,
  onCommentFocused,
  onSaveComment,
  readOnly,
}: {
  record: RecordItem;
  expanded: boolean;
  onToggle: () => void;
  onToggleStatus: () => void;
  onCommentClick: () => void;
  commentText: string | undefined;
  moved: boolean;
  focusCommentOnMount: boolean;
  onCommentFocused: () => void;
  onSaveComment: (text: string | undefined) => void;
  readOnly: boolean;
}) {
  const commented = !!commentText;
  const meta = getBankMeta(record.bankId);
  const isException = record.status === "flagged";
  const Chevron = expanded ? ChevronUp : ChevronDown;
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
          ? "var(--status-info-bg)"
          : lifted
          ? "#FFFFFF"
          : "transparent",
        border: lifted
          ? moved
            ? "1px solid var(--status-info)"
            : "1px solid var(--line-row-hover)"
          : "1px solid var(--line-hair)",
        boxShadow: lifted ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        transition:
          "background 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{
          width: "100%",
          padding: "var(--space-5) var(--space-6)",
          gap: "var(--space-5)",
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
            gap: "var(--space-5)",
            cursor: "pointer",
          }}
        >
          <StatusDot tone={isException ? "danger" : "ok"} size={8} ring />
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
            className="shrink-0 nums t-body"
            style={{ color: "var(--ink-secondary)", width: 64 }}
          >
            {formatDate(record.date)}
          </span>
          <div
            className="flex flex-col items-start flex-1 min-w-0"
            style={{ gap: "var(--space-1)" }}
          >
            {/* One line, truncating: --leading-ui, never prose leading. */}
            <span
              className="truncate t-body"
              style={{ width: "100%", color: "var(--ink-primary)" }}
            >
              {record.title}
            </span>
            <span
              className="truncate t-meta"
              style={{ width: "100%", color: "var(--ink-secondary)" }}
            >
              {meta.shortName} · {record.reason}
            </span>
          </div>
          <ConfidenceChip value={record.confidence} />
          <span
            className="shrink-0 nums"
            style={{
              fontSize: "var(--type-title)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
              minWidth: 112,
              textAlign: "right",
            }}
          >
            {formatAmount(record.amount)}
          </span>
        </button>
        <div
          className="flex flex-row items-center shrink-0"
          style={{ gap: "var(--space-2)" }}
        >
          {/* The move control only exists while the run can actually accept a
            * move. See the readOnly note at the top of the file. */}
          {!readOnly && (
            <ActionButton
              label={isException ? "Move to approved" : "Move to exceptions"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus();
              }}
              tone={isException ? "approve" : "exception"}
              icon={
                isException ? (
                  <Check size={14} strokeWidth={1.75} />
                ) : (
                  <TriangleAlert size={14} strokeWidth={1.75} />
                )
              }
            />
          )}
          {/* A note is a change to the record like any other, so it goes the
            * same way the move control does once the run is settled — the
            * header two feet above says the records "can no longer be changed"
            * and the pencil was still there offering to write on them.
            *
            * Kept where a note already exists: on a settled run it stops being
            * an editor and becomes the only thing on the collapsed row that
            * says a person wrote here, and it still opens the row to read it. */}
          {(!readOnly || commented) && (
            <ActionButton
              label={
                readOnly ? "View note" : commented ? "Edit note" : "Add note"
              }
              onClick={(e) => {
                e.stopPropagation();
                onCommentClick();
              }}
              tone="comment"
              active={commented}
              icon={
                commented ? (
                  <MessageSquareText size={14} strokeWidth={1.75} />
                ) : (
                  <MessageSquarePlus size={14} strokeWidth={1.75} />
                )
              }
            />
          )}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 flex items-center justify-center transition"
            style={{
              width: "var(--control-md)",
              height: "var(--control-md)",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 999,
              color: "var(--ink-secondary)",
              cursor: "pointer",
            }}
            aria-label={expanded ? "Collapse record" : "Expand record"}
            data-hint={expanded ? "Collapse" : "Expand"}
          >
            <Chevron size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {expanded && (
        <RecordDetail
          record={record}
          commentText={commentText}
          focusOnMount={focusCommentOnMount}
          onFocused={onCommentFocused}
          onSave={onSaveComment}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

/* Action button with full interaction state matrix.
 *
 *   default  — subtle lifted chip, muted icon
 *   hover    — brighter surface, tone-tinted icon
 *   focus    — same as hover, plus focus ring (browser native + custom outline)
 *   pressed  — depth compresses, background darkens for 90ms
 *   active   — for the note toggle: tone-tinted persistent bg once acted
 *
 * Each tone (approve / exception / comment) carries its own hover tint so the
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
  tone: "approve" | "exception" | "comment";
  icon: React.ReactNode;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const palette =
    tone === "approve"
      ? {
          color: "var(--status-ok-ink)",
          hoverBg: "var(--status-ok-bg)",
          hoverBorder: "var(--status-ok)",
        }
      : tone === "exception"
      ? {
          color: "var(--status-danger-ink)",
          hoverBg: "var(--status-danger-bg)",
          hoverBorder: "var(--status-danger)",
        }
      : {
          /* The note tone is deliberately colourless. A reviewer's own note is
           * not a state of the record, and borrowing a status colour for it
           * would make a written note look like a verdict. */
          color: "var(--ink-primary)",
          hoverBg: "var(--surface-control-hover)",
          hoverBorder: "var(--line-row-hover)",
        };

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
        background: "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
      };

  const iconColor = hover || active ? palette.color : "var(--ink-secondary)";

  return (
    <button
      type="button"
      data-hint={label}
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
        width: "var(--control-md)",
        height: "var(--control-md)",
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
  /* High confidence reads as settled, low as a problem; the band in between
   * gets no colour rather than a third meaning. */
  const tone = value >= 80 ? "ok" : value >= 50 ? "neutral" : "danger";

  return (
    <span
      className="shrink-0 inline-flex items-center nums"
      style={{
        /* The chip scale, like every other chip in the app. 22 was a one-off
         * that left it sitting a pixel low against the 28px controls beside
         * it (decisions.md §2). */
        height: "var(--control-sm)",
        padding: "0 10px",
        gap: "var(--space-3)",
        background: "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-primary)",
        minWidth: 64,
      }}
    >
      <StatusDot tone={tone} />
      <span>{value}%</span>
    </span>
  );
}

/* ---------- Expanded detail ---------- */

/* Expanded row detail — reason + evidence + reviewer note. The reviewer
 * note is a two-mode area:
 *   view mode   → saved note reads back as a quoted block with Edit /
 *                 Clear controls
 *   edit mode   → textarea + Save / Cancel; Cmd/Ctrl+Enter saves; Esc
 *                 cancels. Auto-enters edit mode on first open (no note
 *                 yet) OR when the parent flags a focus request (user
 *                 clicked the note icon).
 *
 * The two-mode approach keeps saved notes readable at a glance (the
 * common case for a reviewer scanning back through a run), while still
 * letting the reviewer amend them without an extra dialog step. */
function RecordDetail({
  record,
  commentText,
  focusOnMount,
  onFocused,
  onSave,
  readOnly,
}: {
  record: RecordItem;
  commentText: string | undefined;
  focusOnMount: boolean;
  onFocused: () => void;
  onSave: (text: string | undefined) => void;
  /* A third mode, and the one the two above had no answer for. On a settled
   * run there is nothing to write, so `editing` never opens: expanding a
   * record with no note used to drop straight into a focused textarea and a
   * Save button on a session the header had just called finished. */
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(!readOnly && !commentText);
  const [draft, setDraft] = useState(commentText ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* When the row was opened via the note icon, the parent sets
   * focusOnMount. We enter edit mode + focus, then clear the parent flag
   * so the same request doesn't refire on unrelated re-renders. */
  useEffect(() => {
    if (focusOnMount && readOnly) {
      /* The same click on a settled run means "show me the note", and the row
       * is already open by the time this runs. Clear the request so it does
       * not sit pending against the next record the reader opens. */
      onFocused();
      return;
    }
    if (focusOnMount) {
      setEditing(true);
      setDraft(commentText ?? "");
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const el = textareaRef.current;
        if (el) el.selectionStart = el.selectionEnd = el.value.length;
      });
      onFocused();
    }
  }, [focusOnMount, commentText, onFocused, readOnly]);

  const startEdit = () => {
    setDraft(commentText ?? "");
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onSave(undefined);
    } else {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(commentText ?? "");
    setEditing(false);
  };

  const clear = () => {
    onSave(undefined);
    setDraft("");
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div
      className="flex flex-col items-start"
      style={{
        width: "100%",
        /* 72 is the date column's left edge: the row's own 16 of padding, plus
         * the 8px status mark and the 24px bank logo with a --space-5 gap on
         * either side. The detail belongs to the record, so it starts where the
         * record's content starts and clears the two marks that identify it.
         * The 56 it replaces landed inside the logo tile — level with nothing
         * in the row above it. */
        padding: "0 var(--space-6) var(--space-6) 72px",
        gap: "var(--space-6)",
        background: "transparent",
      }}
    >
      <div
        className="flex flex-row items-start"
        style={{ width: "100%", gap: "var(--space-6)" }}
      >
        <DetailColumn label="Reason">
          <span className="t-body" style={{ color: "var(--ink-primary)" }}>
            {record.reason}
          </span>
        </DetailColumn>
        <DetailColumn label="Evidence">
          <ul
            className="t-body"
            style={{
              margin: 0,
              paddingLeft: 14,
              color: "var(--ink-primary)",
            }}
          >
            {record.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </DetailColumn>
      </div>

      {/* On a settled run with no note there is nothing under this heading and
        * no way to put anything there, so the heading goes too rather than
        * standing over an empty space. */}
      {(!readOnly || commentText) && (
        <div
          className="flex flex-col items-start"
          style={{ width: "100%", gap: "var(--space-3)" }}
        >
          <div
            className="flex flex-row items-center"
            style={{ width: "100%", gap: "var(--space-4)" }}
          >
            <span className="t-meta" style={{ color: "var(--ink-secondary)" }}>
              Reviewer note
            </span>
            <div className="flex-1" />
            {!readOnly && !editing && commentText && (
              <>
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear
                </Button>
              </>
            )}
          </div>

          {editing && !readOnly ? (
            <div
              className="flex flex-col items-start"
              style={{ width: "100%", gap: "var(--space-4)" }}
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancel();
                  }
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    commit();
                  }
                }}
                placeholder="Explain your decision, flag context for the controller, or leave a note for next cycle…"
                rows={3}
                maxLength={500}
                className="t-body"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "#FFFFFF",
                  border: "1px solid var(--status-info)",
                  borderRadius: "var(--radius-sheet)",
                  color: "var(--ink-primary)",
                  fontFamily: "inherit",
                  resize: "vertical",
                  minHeight: 68,
                  outline: "none",
                  boxShadow: "var(--shadow-depth-1)",
                }}
              />
              <div
                className="flex flex-row items-center"
                style={{ width: "100%", gap: "var(--space-4)" }}
              >
                <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
                  {draft.length}/500 · Cmd/Ctrl+Enter to save · Esc to cancel
                </span>
                <div className="flex-1" />
                {commentText !== undefined && (
                  <Button variant="secondary" size="md" onClick={cancel}>
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={commit}
                  disabled={draft.trim().length === 0 && !commentText}
                >
                  {commentText ? "Save changes" : "Save note"}
                </Button>
              </div>
            </div>
          ) : commentText ? (
            <div
              className="t-body"
              style={{
                width: "100%",
                padding: "6px 12px",
                background: "var(--surface-list)",
                borderLeft: "3px solid var(--line)",
                borderRadius: "var(--radius-row)",
                color: "var(--ink-primary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {commentText}
            </div>
          ) : null}
        </div>
      )}
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
    <div
      className="flex flex-col items-start flex-1 min-w-0"
      style={{ gap: "var(--space-2)" }}
    >
      <span className="t-meta" style={{ color: "var(--ink-secondary)" }}>
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

/* ---------- Toast layer ----------
 *
 * Bottom-right stack. Each toast is a dark pill with a colored leading
 * icon (a check for approved, a triangle for an exception), primary line,
 * detail line (the record title so the reviewer knows which one was just
 * moved), an Undo button, and a subtle close X. Auto-dismiss at 4.2s
 * (matches the ReviewCanvas timeout — long enough for a considered undo,
 * short enough not to loiter).
 *
 * Pinned to the CANVAS, not to the window, and the `position: fixed` is only
 * half the reason: the review canvas keeps a transform after `review-in`
 * finishes (`animation-fill-mode: both` holds the `translateY(0)`), and a
 * transformed ancestor becomes the containing block for anything fixed inside
 * it. So the offsets below are measured from the canvas's own edges whatever
 * they say, and the old `right: 108` — written to step over the collapsed
 * AgentsPanel sliver from the window edge — was stepping over it twice and
 * leaving the stack ~60px adrift of where it was meant to sit. Measuring from
 * the canvas is what the numbers were always doing; now they say so, and the
 * gutter tracks the canvas at every width instead of assuming one. */
function ToastLayer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--space-8)",
        right: "var(--space-8)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column-reverse",
        gap: "var(--space-5)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(12px, 8px) scale(0.98); }
          to   { opacity: 1; transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const isApproved = toast.kind === "approved";
  return (
    <div
      role="status"
      style={{
        pointerEvents: "auto",
        minWidth: 320,
        maxWidth: 380,
        padding: "var(--space-5)",
        gap: "var(--space-5)",
        display: "flex",
        alignItems: "center",
        background: "var(--action-primary)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-depth-3)",
        color: "var(--action-on-primary)",
        animation: "toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <span
        aria-hidden
        className="flex items-center justify-center shrink-0"
        style={{
          width: "var(--control-sm)",
          height: "var(--control-sm)",
          borderRadius: 999,
          background: isApproved
            ? "var(--status-ok)"
            : "var(--status-danger)",
          color: "#FFFFFF",
        }}
      >
        {isApproved ? (
          <Check size={14} strokeWidth={1.75} />
        ) : (
          <TriangleAlert size={14} strokeWidth={1.75} />
        )}
      </span>

      <div className="flex flex-col min-w-0" style={{ flex: 1, gap: "var(--space-1)" }}>
        <span
          className="t-body"
          style={{ color: "var(--action-on-primary)" }}
        >
          {toast.message}
        </span>
        {toast.detail && (
          <span
            className="truncate t-meta"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {toast.detail}
          </span>
        )}
      </div>

      {toast.onUndo && (
        <button
          type="button"
          onClick={toast.onUndo}
          className="inline-flex items-center transition"
          style={{
            height: "var(--control-md)",
            padding: "0 10px",
            gap: "var(--space-3)",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 999,
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--action-on-primary)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Undo2 size={14} strokeWidth={1.75} />
          Undo
        </button>
      )}

      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="shrink-0 flex items-center justify-center transition"
        style={{
          width: "var(--control-sm)",
          height: "var(--control-sm)",
          background: "transparent",
          border: "none",
          borderRadius: 999,
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.9)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.55)";
        }}
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
