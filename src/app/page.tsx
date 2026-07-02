"use client";

import { useState } from "react";
import { LeftRail } from "@/components/LeftRail";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { MainCanvas } from "@/components/MainCanvas";
import { ReviewCanvas } from "@/components/ReviewCanvas";
import { AgentsPanel } from "@/components/AgentsPanel";
import { DashboardCanvas } from "@/components/DashboardCanvas";
import { PropertiesCanvas } from "@/components/PropertiesCanvas";
import { propertyBanks, selectedMonth } from "@/lib/seed";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { SessionProvider } from "@/lib/session/SessionProvider";

type Route = "dashboard" | "workspace" | "properties";
/* The canvas has two surfaces within the workspace route:
 *   upload — bank statement intake (default, hosts the live lifecycle)
 *   review — reconciled records, opened from Summary agent's inspect CTA */
type CanvasView = "upload" | "review";

export default function Page() {
  const [route, setRoute] = useState<Route>("dashboard");
  const [canvasView, setCanvasView] = useState<CanvasView>("upload");
  /* null = no session opened yet — the workspace renders an empty canvas
   * placeholder and hides the agents panel until the user picks a session.
   * Once selected, the SessionProvider mounts and the full lifecycle UI
   * (canvas + agents) materializes. */
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const {
    navCollapsed,
    setNavCollapsed,
    agentsCollapsed,
    setAgentsCollapsed,
  } = useResponsiveLayout();

  return (
    <div
      className="flex flex-row items-stretch"
      style={{
        minHeight: "100vh",
        background: "transparent",
        /* Insets the app inside the darker body gradient. The 8px padding on
         * the outer edges + 8px gap between panels lets the darker "outer
         * container" show as a frame around every brighter surface (main
         * canvas, workspace nav, agents panel), so each floats inside the
         * outer container rather than sitting flush against the viewport. */
        padding: 8,
        gap: 8,
      }}
    >
      <LeftRail route={route} onNavigate={setRoute} />
      {route === "dashboard" && (
        <DashboardCanvas
          onStartSession={() => {
            setRoute("workspace");
          }}
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
              setCanvasView("upload");
            }}
            collapsed={navCollapsed}
            onToggle={() => setNavCollapsed(!navCollapsed)}
          />
          {selectedSessionId === null ? (
            <EmptyWorkspace />
          ) : (
            <SessionProvider
              key={selectedSessionId}
              bankIds={propertyBanks.map((b) => b.id)}
              cycle={selectedMonth}
              selectedSessionId={selectedSessionId}
            >
              {canvasView === "upload" && <MainCanvas />}
              {canvasView === "review" && (
                <ReviewCanvas onBack={() => setCanvasView("upload")} />
              )}
              {/* Review is a focus mode — the agents panel collapses to its
               * sliver so the user stays on the records. The upload view
               * keeps the panel at the user-controlled size. */}
              <AgentsPanel
                collapsed={canvasView === "review" ? true : agentsCollapsed}
                onToggle={() => setAgentsCollapsed(!agentsCollapsed)}
                onInspect={() => setCanvasView("review")}
              />
            </SessionProvider>
          )}
        </>
      )}
      {route === "properties" && (
        <PropertiesCanvas
          onStartSession={() => {
            setRoute("workspace");
          }}
        />
      )}
    </div>
  );
}

/* Empty workspace placeholder — shown when the user is on the Reconciliation
 * route but hasn't opened a session yet. Minimal and quiet: a single muted
 * line, centered. The workspace nav on the left already has all the entry
 * points; the canvas should not duplicate them or hard-sell a "resume" CTA. */
function EmptyWorkspace() {
  return (
    <main
      className="flex flex-col items-center justify-center flex-1 min-w-0"
      style={{ background: "var(--bg-grad)" }}
    >
      <p
        style={{
          fontSize: 13,
          lineHeight: "18px",
          color: "var(--text-2)",
          letterSpacing: "0.01em",
        }}
      >
        Open a session from the workspaces list to begin.
      </p>
    </main>
  );
}

