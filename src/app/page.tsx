"use client";

/* The shell: the rail, and one destination at a time.
 *
 * Route keys were renamed with the rail and no aliases were kept. A key called
 * "workspace" rendering a screen called Reconcile is exactly the drift the
 * vocabulary contract exists to prevent, and leaving one behind guarantees the
 * next person adds a second.
 *
 * ---------------------------------------------------------------------------
 * What this file stopped holding
 *
 * It used to carry the whole session lifecycle: a selected session id, a draft
 * property, a draft cycle, a resolver that turned those three into one property
 * and one session, and a SessionProvider mounted around the hub. All of it
 * served one screen, and that screen has been replaced — Reconcile now works on
 * one account for one period and reads the match list directly.
 *
 * The plumbing is gone rather than kept "in case", because a shell holding
 * state nothing reads is where the next reader loses an hour. The components it
 * fed — HubCanvas, AgentsPanel, ReviewDrawer, DashboardCanvas — are untouched in
 * the tree and still compile. What they hold that the new screens do not is the
 * live run theatre, and that is the half of the Reconcile spec still to build.
 */

import { useState } from "react";
import { BookOpen, Gauge } from "lucide-react";
import { LeftRail, type Route } from "@/components/LeftRail";
import { CloseCanvas } from "@/components/CloseCanvas";
import { ReconcileCanvas } from "@/components/ReconcileCanvas";
import { AccountsCanvas } from "@/components/AccountsCanvas";
import {
  SurfacePlaceholder,
  RULES_PLACEHOLDER,
  QUALITY_PLACEHOLDER,
} from "@/components/SurfacePlaceholder";

export default function Page() {
  const [route, setRoute] = useState<Route>("close");

  /* Accounts owns its own list and detail state internally. Clicking it in the
   * rail while already inside a property detail was a no-op, because the route
   * never changed and so nothing reset. Bumping this key on every navigation to
   * the route remounts the canvas back to the roster. */
  const [accountsKey, setAccountsKey] = useState(0);

  return (
    <div
      className="flex flex-row items-stretch"
      style={{ minHeight: "100vh", background: "transparent" }}
    >
      <LeftRail
        route={route}
        onNavigate={(next) => {
          if (next === "accounts") setAccountsKey((k) => k + 1);
          setRoute(next);
        }}
      />

      {/* ---------- Close ----------
        * DashboardCanvas is retired here. It led on tokens used and first-pass
        * accuracy, counted matched records nobody acts on, and offered "New
        * session" — but the calendar creates the work, not a button. */}
      {route === "close" && (
        <CloseCanvas onOpenAccount={() => setRoute("reconcile")} />
      )}

      {/* ---------- Reconcile ----------
        * The three-agent canvas is retired here. It showed Intake,
        * Reconciliation and Summary, which are the names of parts of the
        * machine, and a person navigates by the object they are working on
        * rather than by the component working on it. Four lanes now, over the
        * five jobs, three of which have no model in them. */}
      {route === "reconcile" && <ReconcileCanvas />}

      {/* ---------- Accounts ----------
        * The standing world. PropertiesCanvas is retired here: it pointed at
        * the property, and waiting items live on the ACCOUNT — a property is a
        * folder above it and cannot be proven. This screen has no month. */}
      {route === "accounts" && <AccountsCanvas key={accountsKey} />}

      {/* ---------- Rules and Quality ----------
        * Destinations before they are screens, so each says what it is for and
        * where it is specified. Quality deliberately does NOT render the old AI
        * Performance page: that page leads on tokens used and first-pass
        * accuracy, the two figures the specs remove from it by name, and
        * putting it behind a label reading "Quality" would be the rail
        * promising what the screen breaks. */}
      {route === "rules" && (
        <SurfacePlaceholder spec={{ ...RULES_PLACEHOLDER, Icon: BookOpen }} />
      )}
      {route === "quality" && (
        <SurfacePlaceholder spec={{ ...QUALITY_PLACEHOLDER, Icon: Gauge }} />
      )}
    </div>
  );
}
