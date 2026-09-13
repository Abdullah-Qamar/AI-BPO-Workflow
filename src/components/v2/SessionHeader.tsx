"use client";

/* SessionHeader — the session's dossier.
 *
 * The first pass had a bare property title floating above ~200px of nothing,
 * with no relationship to the hub below it. This replaces it with a header that
 * earns its place and caps the stage the hub sits on.
 *
 * The division of labour against the core matters, or the two compete:
 *
 *   core   — present tense. What the active agent is doing this second.
 *            Transient; it is replaced as the run advances.
 *   header — standing facts. Identity, scope, and the running totals that are
 *            true before the run starts and still true once it ends.
 *
 * So the header never narrates ("reading wells-sd.pdf") · it states
 * ("4 accounts · 8 documents · 12 records"). */

import { Building2 } from "lucide-react";
import { CyclePicker } from "@/components/ui/CyclePicker";
import { cycleOptions } from "@/lib/seed";

import type { PropertyNote } from "@/lib/v2/propertyNotes";
import type { HubPhase } from "@/lib/v2/hub";
import type { SessionState } from "@/lib/session/types";
import { useSession } from "@/lib/session/SessionProvider";

/* No Activity tab: the run's record belongs beside the work, not behind
 * navigation, so it lives in the workspace above the hub. */
export type WorkspaceTab = "workspace" | "knowledge";

/* Only the cycles this property has actually been run for, with the one open
 * guaranteed present. Offering the portfolio-wide list would promise months
 * this property has no session behind. */
function propertyCycles(
  property: { sessions: { cycle: string }[] },
  current: string
): string[] {
  const seen = new Set<string>([current]);
  for (const x of property.sessions) seen.add(x.cycle);
  return cycleOptions.filter((c) => seen.has(c));
}

export function SessionHeader({
  cycle,
  phase,
  state,
  docsIdentified,
  docsTotal,
  noteCount,
  tab,
  onTabChange,
  onSelectCycle,
  showTabs = true,
}: {
  cycle: string;
  phase: HubPhase;
  state: SessionState;
  docsIdentified: number;
  docsTotal: number;
  noteCount: number;
  tab: WorkspaceTab;
  onTabChange: (t: WorkspaceTab) => void;
  /* Switching the cycle switches to that cycle's session on this property. */
  onSelectCycle?: (sessionId: string) => void;
  /* The Workspace/Knowledge tabs are dropped on the route that carries the
   * agent panel instead — the panel is the record now. */
  showTabs?: boolean;
}) {
  /* The property whose session is open. This used to read the module-level
   * `activeProperty`, so every property's header announced 1849 Westlake's
   * address and code. */
  const { property } = useSession();
  return (
    <div
      className="flex flex-col shrink-0"
      style={{ width: "100%", gap: 14 }}
    >
      <div className="flex flex-row items-start" style={{ width: "100%", gap: 12 }}>
        <Building2
          size={20}
          strokeWidth={1.5}
          color="var(--ink-secondary)"
          className="shrink-0"
          style={{ marginTop: 3 }}
        />
        <div className="flex flex-col min-w-0 flex-1" style={{ gap: 3 }}>
          <h1
            className="truncate"
            style={{
              fontSize: "var(--type-heading)",
              lineHeight: "var(--leading-tight)",
              color: "var(--ink-primary)",
              letterSpacing: "var(--tracking-display)",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            {property.address}
          </h1>
          <SessionFacts
            phase={phase}
            state={state}
            docsIdentified={docsIdentified}
            docsTotal={docsTotal}
          />
        </div>
        {/* The real picker, not a chip with a chevron drawn on it. This was a
          * 33px hand-rolled button carrying two retired hexes, a ChevronDown and
          * no handler at all — the exact "a chevron is a promise" case
          * `ui/CyclePicker` was written to end. It offers only the cycles this
          * property has actually been run for. */}
        <CyclePicker
          value={cycle}
          options={propertyCycles(property, cycle)}
          onChange={(next) => {
            const target = property.sessions.find((x) => x.cycle === next);
            if (target) onSelectCycle?.(target.id);
          }}
        />
      </div>

      {/* Tab strip sits on the stage's top edge; the hairline is what stops the
        * header reading as a floating label. */}
      {showTabs && (
        <div
          className="flex flex-row items-end"
          style={{
            width: "100%",
            gap: 4,
            borderBottom: "1px solid rgba(157,179,197,0.34)",
          }}
        >
          <Tab
            label="Workspace"
            active={tab === "workspace"}
            onClick={() => onTabChange("workspace")}
          />
          <Tab
            label="Knowledge"
            count={noteCount}
            active={tab === "knowledge"}
            onClick={() => onTabChange("knowledge")}
          />
        </div>
      )}
    </div>
  );
}

/* One line of standing facts. Phase changes what is worth stating, but never
 * turns this into a progress narration — that is the core's job. */
function SessionFacts({
  phase,
  state,
  docsIdentified,
  docsTotal,
}: {
  phase: HubPhase;
  state: SessionState;
  docsIdentified: number;
  docsTotal: number;
}) {
  const { property } = useSession();
  /* The property whose session is open, not the module-level "active" one.
   * Reading that constant printed 1849 Westlake's code and account count on
   * every property's header — 100 Bridgeway, which has two accounts and 23
   * records, announced itself as "SAU-1900 · 4 banks · 204 records". */
  const parts: string[] = [
    property.code,
    `${state.bankOrder.length} ${
      state.bankOrder.length === 1 ? "account" : "accounts"
    }`,
  ];

  if (phase === "failed") {
    /* A failed run received nothing, so it cannot claim a document count. The
     * `else` branch used to catch this phase and print "4 documents" on a
     * session where none had been read. */
    parts.push(state.failureNote ?? "run stopped");
  } else if (phase === "draft") {
    parts.push("awaiting documents");
  } else if (phase === "identifying") {
    parts.push(`${docsIdentified} of ${docsTotal} identified`);
  } else {
    parts.push(`${docsTotal} documents`);
  }

  if (phase === "summary" || phase === "posting" || phase === "complete") {
    const approved = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
      0
    );
    const exceptions = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.exceptionCount ?? 0),
      0
    );
    parts.push(`${approved + exceptions} records`);
    /* "Open", the contract's word for an exception still waiting on a person.
     * "Need review" was a fourth phrasing of it. */
    if (exceptions > 0) parts.push(`${exceptions} open`);
  }

  /* No note count here. "4 notes active" was a standing fact about the Knowledge
   * tab wearing the costume of a session fact, and it sat in the line the eye
   * reads to answer "what am I looking at" — where the count of instructions is
   * not part of the answer. The tab's own badge already carries it, and how many
   * times a note fired belongs on the tab that can show which ones. */

  return (
    <span
      className="truncate"
      style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-prose)", color: "var(--ink-secondary)" }}
    >
      {parts.join(" · ")}
    </span>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-row items-center transition"
      style={{
        height: 34,
        padding: "0 12px",
        gap: 7,
        background: "transparent",
        border: "none",
        /* Overlaps the container's hairline so the active tab reads as
         * connected to the stage rather than sitting above it. */
        borderBottom: `2px solid ${active ? "var(--ink-primary)" : "transparent"}`,
        marginBottom: -1,
        cursor: "pointer",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: active ? "var(--surface-tab-active)" : "rgba(157,179,197,0.2)",
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-prose)",
            color: "var(--ink-secondary)",
            textAlign: "center",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
