"use client";

/* Workspace V2 — the experimental route.
 *
 * Three columns instead of four: the agents panel is gone and its job has
 * moved into the core at the centre of the workspace. V1 at `/` is untouched;
 * both routes share SessionProvider, the reducer, the seed, and the tokens, so
 * V2 runs on the real lifecycle rather than a mock.
 *
 * The one behavioural difference is the gate: V1 runs intake straight into
 * reconciliation, while V2 parks at the intake boundary and hands the user a
 * "Start reconciliation" CTA inside the core. That's what `gateReconciliation`
 * on the provider buys.
 *
 * See WORKSPACE_V2.md. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LeftRail } from "@/components/LeftRail";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { HubCanvas } from "@/components/v2/HubCanvas";
import { ReviewDrawer } from "@/components/v2/ReviewDrawer";
import { SessionProvider } from "@/lib/session/SessionProvider";
import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import {
  CURRENT_CYCLE,
  banksFor,
  findSession,
  properties,
} from "@/lib/seed";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";

export default function V2Page() {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { navCollapsed, setNavCollapsed } = useResponsiveLayout();

  return (
    <div
      className="flex flex-row items-stretch"
      style={{ minHeight: "100vh", background: "transparent" }}
    >
      {/* Dashboard and Properties still live on the V1 route; V2 only
       * reimagines the workspace, so those items navigate back. */}
      <LeftRail route="workspace" onNavigate={() => router.push("/")} />

      <WorkspaceNav
        selectedSessionId={selectedSessionId}
        onSelectSession={(id) => {
          setSelectedSessionId(id);
          setReviewOpen(false);
        }}
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed(!navCollapsed)}
      />

      {selectedSessionId === null ? (
        <EmptyWorkspace />
      ) : (
        <SessionProvider
          key={selectedSessionId}
          property={
            findSession(selectedSessionId)?.property ?? properties[0]
          }
          bankIds={banksFor(
            findSession(selectedSessionId)?.property ?? properties[0]
          ).map((b) => b.id)}
          /* The session's own cycle, not "now". An Apr 2026 session was
           * mounting with May's cycle, so its header chip, its statement
           * periods and its ledger export dates all named the wrong month. */
          cycle={
            findSession(selectedSessionId)?.session.cycle ?? CURRENT_CYCLE
          }
          selectedSessionId={selectedSessionId}
          gateReconciliation
          parallelReconciliation
        >
          {/* Relative so the review drawer can position against the workspace
           * column rather than the viewport — that's what keeps its 16px inset
           * measured from the hub and not from the rails. */}
          <div
            className="flex flex-row items-stretch flex-1 min-w-0 relative"
            style={{ background: "var(--bg-grad)" }}
          >
            <HubCanvas
              onViewRecords={() => setReviewOpen(true)}
              onSelectSession={(id) => {
                setSelectedSessionId(id);
                setReviewOpen(false);
              }}
            />
            <ReviewDrawer open={reviewOpen} onClose={() => setReviewOpen(false)} />
          </div>
        </SessionProvider>
      )}
    </div>
  );
}
