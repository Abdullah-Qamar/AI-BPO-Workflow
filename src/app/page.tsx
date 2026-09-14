"use client";

import { useMemo, useState } from "react";
import { LeftRail } from "@/components/LeftRail";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { HubCanvas } from "@/components/v2/HubCanvas";
import { ReviewDrawer } from "@/components/v2/ReviewDrawer";
import { AgentsPanel } from "@/components/AgentsPanel";
import { DashboardCanvas } from "@/components/DashboardCanvas";
import { AIQualityDetail } from "@/components/AIQualityDetail";
import { PropertiesCanvas } from "@/components/PropertiesCanvas";
import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import {
  CURRENT_CYCLE,
  banksFor,
  findSession,
  propertyById,
  type PropertyRecord,
} from "@/lib/seed";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { SessionProvider } from "@/lib/session/SessionProvider";

type Route = "dashboard" | "workspace" | "properties" | "observability";

export default function Page() {
  const [route, setRoute] = useState<Route>("dashboard");
  /* Properties owns its own list/detail state internally. Clicking Properties
   * in the rail while already sitting inside a property detail was a no-op —
   * the route never changed, so nothing reset. Bumping this key on every
   * navigation to the route remounts the canvas back to the roster. */
  const [propertiesKey, setPropertiesKey] = useState(0);
  /* Opens the reconciled-records drawer over the hub. */
  const [reviewOpen, setReviewOpen] = useState(false);
  /* null = no session opened yet — the workspace renders an empty canvas
   * placeholder and hides the agents panel until the user picks a session.
   * Once selected, the SessionProvider mounts and the full lifecycle UI
   * (canvas + agents) materializes. */
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  /* Set when a property is opened that has no session in the current cycle —
   * "Start a session" on a Not started property. The workspace then mounts a
   * fresh draft against that property rather than dead-ending. */
  const [draftPropertyId, setDraftPropertyId] = useState<string | null>(null);
  /* The cycle a draft was started for. A property picked for a cycle it has
   * never been run in opens a draft IN that cycle, so its statements carry that
   * period rather than the current one. */
  const [draftCycle, setDraftCycle] = useState(CURRENT_CYCLE);
  const {
    navCollapsed,
    setNavCollapsed,
    agentsCollapsed,
    setAgentsCollapsed,
  } = useResponsiveLayout();

  /* Resolve whatever is open into one property + one session id.
   *
   * The two used to be resolved separately and against different keys — the
   * new-session modal handed up a property *id* and the host looked it up by
   * *code*, so the Dashboard's primary action matched nothing and landed on
   * the empty canvas every single time. There is one resolution now and every
   * entry point feeds it a property id. */
  const open = useMemo(() => {
    const found = findSession(selectedSessionId);
    if (found) {
      return {
        property: found.property,
        sessionId: found.session.id,
        /* The session's own cycle, not "now" — a Feb 2026 session has to show
         * February's statements and ledger export dates. */
        cycle: found.session.cycle,
      };
    }
    const property = draftPropertyId ? propertyById[draftPropertyId] : null;
    if (property) {
      /* A property with no session this cycle still opens: the canvas is that
       * session, in its draft state, waiting for documents. */
      return {
        property,
        sessionId: `draft-${property.id}-${draftCycle}`,
        cycle: draftCycle,
      };
    }
    return null;
  }, [selectedSessionId, draftPropertyId, draftCycle]);

  /* Opens a property in the workspace: its live session where it has one,
   * otherwise a fresh draft. */
  const openProperty = (
    propertyId: string,
    sessionId?: string,
    cycle?: string
  ) => {
    const property: PropertyRecord | undefined = propertyById[propertyId];
    setRoute("workspace");
    setReviewOpen(false);
    if (sessionId) {
      setSelectedSessionId(sessionId);
      setDraftPropertyId(null);
      return;
    }
    /* A cycle without a session id comes from the new-session picker: open that
     * property's session in that cycle if it has one, and a draft if it does
     * not. Without this the picker's cycle was accepted and then ignored. */
    const live = cycle
      ? property?.sessions.find((x) => x.cycle === cycle)
      : property?.currentSession ?? property?.sessions[0];
    setSelectedSessionId(live?.id ?? null);
    setDraftPropertyId(live ? null : propertyId);
    setDraftCycle(cycle ?? CURRENT_CYCLE);
  };

  return (
    <div
      className="flex flex-row items-stretch"
      style={{ minHeight: "100vh", background: "transparent" }}
    >
      <LeftRail
        route={route}
        onNavigate={(next) => {
          if (next === "properties") setPropertiesKey((k) => k + 1);
          setRoute(next);
        }}
      />
      {route === "observability" && (
        /* A top-level destination now, not a view nested inside the Dashboard.
         * It was reachable only by a link on one screen, which made a whole page
         * of the product hard to find and impossible to return to directly. */
        <AIQualityDetail />
      )}
      {route === "dashboard" && (
        <DashboardCanvas
          onOpenObservability={() => setRoute("observability")}
          onOpenSession={(propertyId, sessionId, cycle) =>
            openProperty(propertyId, sessionId, cycle)
          }
        />
      )}
      {route === "workspace" && (
        <>
          <WorkspaceNav
            selectedSessionId={selectedSessionId}
            onSelectSession={(id) => {
              // Every session selection re-mounts the provider (keyed by id)
              // so each session starts on its own clean lifecycle.
              setSelectedSessionId(id);
              setDraftPropertyId(null);
              setReviewOpen(false);
            }}
            onStartSession={(propertyId) => openProperty(propertyId)}
            collapsed={navCollapsed}
            onToggle={() => setNavCollapsed(!navCollapsed)}
          />
          {open === null ? (
            <EmptyWorkspace />
          ) : (
            <SessionProvider
              key={open.sessionId}
              property={open.property}
              bankIds={banksFor(open.property).map((b) => b.id)}
              cycle={open.cycle}
              selectedSessionId={open.sessionId}
              gateReconciliation
              parallelReconciliation
            >
              {/* Hub + agents share one continuous surface; relative so the
               * review drawer positions against this column, not the viewport. */}
              <div
                className="flex flex-row items-stretch flex-1 min-w-0 relative"
                style={{ background: "var(--bg-grad)" }}
              >
                <HubCanvas
                  onViewRecords={() => setReviewOpen(true)}
                  onSelectSession={(id) => {
                    setSelectedSessionId(id);
                    setDraftPropertyId(null);
                  }}
                />
                <AgentsPanel
                  avatarVariant="orb"
                  collapsed={agentsCollapsed}
                  onToggle={() => setAgentsCollapsed(!agentsCollapsed)}
                  onInspect={() => setReviewOpen(true)}
                />
                <ReviewDrawer
                  open={reviewOpen}
                  onClose={() => setReviewOpen(false)}
                />
              </div>
            </SessionProvider>
          )}
        </>
      )}
      {route === "properties" && (
        <PropertiesCanvas
          key={propertiesKey}
          onStartSession={(propertyId, sessionId) =>
            openProperty(propertyId, sessionId)
          }
        />
      )}
    </div>
  );
}
