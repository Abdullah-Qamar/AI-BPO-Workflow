"use client";

/* Core — the square between the two document columns.
 *
 * It shows one thing: the active agent, animated. No status text, no counters,
 * no controls. Everything it used to carry has moved to a surface better suited
 * to it — what it is doing and what it just did are two adjacent lines in the
 * activity card, the running totals are in the summary band. What is left is the
 * sense that something is working.
 *
 * There is deliberately no caption under the square. A line of text hanging off
 * the bottom of the orb duplicated the activity card's present-tense line, and
 * it changed length every few seconds, so the one element whose whole job is to
 * hold still had a flickering strip attached to it. The only thing that appears
 * below the core now is a control, in the two phases that have one.
 *
 * Avatars are `thinking-orbs` presets — connecting for Intake, solving for
 * Reconciliation, weaving for Summary. See lib/v2/orb.ts for the map and for the
 * two package constraints that matter (fixed sizes, and pinning the theme). */

import { useState } from "react";
import { ArrowRight, FileUp, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThinkingOrb } from "thinking-orbs";
import { AGENT_ORB } from "@/lib/v2/orb";
import type { ActivityAgent } from "@/lib/v2/activity";
import { CORE_AVATAR, CORE_SIZE, type HubPhase } from "@/lib/v2/hub";

/* Which agent owns the square in each phase, and therefore which orb runs. */
const PHASE_AGENT: Record<HubPhase, { agent: ActivityAgent; live: boolean }> = {
  draft: { agent: "intake", live: false },
  identifying: { agent: "intake", live: true },
  intake: { agent: "intake", live: true },
  "intake-done": { agent: "intake", live: false },
  matching: { agent: "reconciliation", live: true },
  summary: { agent: "summary", live: false },
  posting: { agent: "summary", live: true },
  complete: { agent: "summary", live: false },
  /* Intake owns the failure: every seeded failure stops while reading the
   * documents or pulling the ledger, before matching begins. */
  failed: { agent: "intake", live: false },
};

export function Core({
  phase,
  onDropFiles,
}: {
  phase: HubPhase;
  onDropFiles: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isDraft = phase === "draft";
  const agent = PHASE_AGENT[phase];

  return (
    <div
      onDragOver={
        isDraft
          ? (e) => {
              e.preventDefault();
              setDragOver(true);
            }
          : undefined
      }
      onDragLeave={isDraft ? () => setDragOver(false) : undefined}
      onDrop={
        isDraft
          ? (e) => {
              e.preventDefault();
              setDragOver(false);
              onDropFiles();
            }
          : undefined
      }
      onClick={isDraft ? onDropFiles : undefined}
      role={isDraft ? "button" : undefined}
      tabIndex={isDraft ? 0 : undefined}
      aria-label={isDraft ? "Drop or browse documents" : undefined}
      className="flex items-center justify-center shrink-0 relative"
      style={{
        width: CORE_SIZE,
        height: CORE_SIZE,
        /* Layered, not flat. Same moulded-glass recipe as the app-icon set:
         * a vertical white→cool-grey wash so the plate has a lit crown, a
         * bright top rim, and a shadow that sits it above the canvas. */
        background:
          "linear-gradient(178deg, #FFFFFF 0%, #F7F8FB 46%, #EEF1F6 100%)",
        border: `1px solid ${
          dragOver ? "rgba(48,59,69,0.55)" : "rgba(255,255,255,0.95)"
        }`,
        borderRadius: 20,
        boxShadow: dragOver
          ? "0 18px 44px -14px rgba(37,49,63,0.32)"
          : "0 1px 0 rgba(255,255,255,0.9) inset, 0 -18px 28px -20px rgba(98,116,131,0.22) inset, var(--shadow-depth-3)",
        transition:
          "border-color 160ms ease, box-shadow 200ms ease, transform 200ms ease",
        transform: dragOver ? "scale(1.02)" : "scale(1)",
        cursor: isDraft ? "pointer" : "default",
        zIndex: 2,
      }}
    >
      {/* Inner well — the soft radial highlight behind the orb, so the agent
        * reads as sitting in a recessed chamber rather than printed on a card.
        *
        * The hairline ring that used to draw this well is gone. A square inside
        * a square 9px apart reads as two borders arguing about where the edge
        * is, and the plate already has one: its own 1px rim plus the inset
        * top-light. The recess is carried by the gradient and the inset shadow
        * on the plate, which is what was doing the work anyway. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 9,
          borderRadius: 13,
          background:
            "radial-gradient(closest-side at 50% 44%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 78%)",
          pointerEvents: "none",
        }}
      />
      {phase === "failed" ? (
        <div
          className="flex flex-col items-center relative"
          style={{ gap: "var(--space-4)", padding: "0 var(--space-5)" }}
        >
          <TriangleAlert
            size={24}
            strokeWidth={1.5}
            color="var(--status-danger)"
            aria-hidden
          />
          <span
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
              textAlign: "center",
            }}
          >
            Run stopped
          </span>
        </div>
      ) : isDraft ? (
        /* Draft has no working agent, so it gets the upload affordance instead
         * of an avatar. Squaring the core was about the working states — putting
         * a paused agent field here removed the only cue that this is where
         * files go, which is the one thing the phase has to communicate. */
        <div
          className="flex flex-col items-center relative"
          style={{ gap: "var(--space-4)", padding: "0 var(--space-5)" }}
        >
          <FileUp
            size={24}
            strokeWidth={1.5}
            color={dragOver ? "var(--ink-primary)" : "var(--ink-secondary)"}
            style={{ transition: "color 160ms ease" }}
          />
          <span
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
              textAlign: "center",
            }}
          >
            Drop documents
          </span>
        </div>
      ) : (
        /* Never paused. A frozen orb reads as broken rather than quiet, so a
         * settled agent keeps animating and recedes in opacity instead — the orb
         * has no ink-colour prop, so contrast has to come from the wrapper. */
        <span
          className="relative"
          style={{
            /* 0.42 worked for the old dot field but loses the orb's structure —
             * these are far more detailed, so the settled state needs more. */
            opacity: agent.live ? 1 : 0.6,
            transition: "opacity 240ms ease",
          }}
        >
          <ThinkingOrb
            state={AGENT_ORB[agent.agent]}
            size={CORE_AVATAR}
            theme="light"
            aria-label={`${agent.agent} agent`}
          />
        </span>
      )}
    </div>
  );
}

/* ---------- The phase action ----------
 *
 * Absolutely positioned below the square rather than stacked under it. In flow
 * it either shifted the core when it appeared — dragging every strand endpoint
 * with it — or it had to be paid for with a permanently reserved height that sat
 * empty through most of the run. Out of flow it costs nothing in the phases that
 * have no action, and the core cannot move in the two that do. */

/* The draft phase's standing requirement, with the count it implies.
 *
 * Two documents per bank account — one statement, one ledger — so the expected
 * total is derived, never stored: four accounts expect eight documents. The
 * account list comes from the open session, which is the whole reason this is a
 * prop rather than a module constant.
 *
 * The count and the requirement are one sentence, not two. "0 of 8 expected" on
 * its own line above "a bank statement and a Yardi ledger for each account" is
 * the same fact told twice — the second line is what explains the 8, so it
 * belongs in the same breath as it.
 *
 * Draft means nothing has docked yet (`hubPhase` returns "identifying" the
 * moment the queue starts), so the numerator is honestly 0. Once documents are
 * arriving the session header takes over the running count with "1 of 2
 * identified", the same figure counted up. */
function draftRequirement(accountCount: number): string {
  const requirement = "a bank statement and a Yardi ledger";
  if (accountCount < 1) return `${requirement} for each account`;
  const scope =
    accountCount === 1 ? "the account" : `each of ${accountCount} accounts`;
  return `0 of ${accountCount * 2} expected — ${requirement} for ${scope}`;
}

export function CoreAction({
  phase,
  accountCount,
  onDropFiles,
  onStartReconciliation,
  onRetry,
  failureNote,
}: {
  phase: HubPhase;
  /* Bank accounts on the property this session is open against. */
  accountCount: number;
  onDropFiles: () => void;
  onStartReconciliation: () => void;
  onRetry: () => void;
  failureNote?: string;
}) {
  if (phase !== "draft" && phase !== "intake-done" && phase !== "failed") {
    return null;
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        paddingTop: 16,
        /* Wider than the square: "Start reconciliation" wraps at the plate's
         * width, and the requirement line below wants room to sit on one line. */
        width: 300,
        textAlign: "center",
        gap: 10,
      }}
    >
      {phase === "draft" && (
        <>
          <Button variant="secondary" size="sm" onClick={onDropFiles}>
            Browse files
          </Button>
          {/* The one thing the draft phase has to communicate that the square
            * itself cannot: how many documents it is waiting for, and why that
            * is the number — each account needs both halves of the pair. This
            * is a standing requirement, not agent narration; it is the same
            * sentence for the whole phase, so it does not flicker.
            *
            * Tertiary ink and .t-meta: supporting text under an affordance and
            * a heading, not a third thing competing with them. Line height is
            * the prose step because at 300px this wraps. */}
          <span
            className="t-meta"
            style={{
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-tertiary)",
            }}
          >
            {draftRequirement(accountCount)}
          </span>
        </>
      )}
      {/* A failed run stops here and offers the one action that helps. Without
        * this branch the phase rendered as a draft: it accepted documents,
        * docked every one of them, and then could not start, because the
        * reducer's runState was "failed" and nothing offered a way out of it. */}
      {phase === "failed" && (
        <>
          <span
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              fontWeight: "var(--weight-medium)",
              color: "var(--status-danger-ink)",
            }}
          >
            {failureNote ?? "The run stopped"}
          </span>
          <Button variant="secondary" size="md" onClick={onRetry}>
            Retry run
          </Button>
        </>
      )}
      {phase === "intake-done" && (
        <Button
          variant="primary"
          size="md"
          onClick={onStartReconciliation}
          rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
        >
          Start reconciliation
        </Button>
      )}
    </div>
  );
}
