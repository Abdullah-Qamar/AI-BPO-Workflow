"use client";

/* Activity log — the record of what the agents actually did.
 *
 * V2's core is present-tense by design: it shows the active agent and nothing
 * else. That was the right call for the core, but it left the workspace with no
 * memory — the trail above the core carried three phase chips and no account of
 * any task. V1's AgentsPanel had per-agent timelines (`AgentStatusLine` in
 * lib/seed.ts) and dropping the panel dropped the observability with it.
 *
 * This rebuilds that record as an append-only log derived from live session
 * state, so it stays in step with the run rather than being a second source of
 * truth. Entries are keyed and deduped, so an effect that re-fires on an
 * unrelated state change cannot double-log.
 *
 * Property notes appear here too. A note that silently changes a match is worse
 * than no note at all — if knowledge alters the outcome, the alteration has to
 * be visible next to the work it changed. */

import { useEffect, useRef, useState } from "react";
/* The session's own accounts are passed in. This file used to import the
 * module-level `propertyBanks`, so on any property but 1849 Westlake the log
 * announced account names that were not on the property, counted the wrong
 * number of them, and printed a raw `bm-…` id where a name should have been. */
import type { PropertyBank } from "@/lib/seed";
import { propertyNotes } from "./propertyNotes";
import type { SessionState } from "@/lib/session/types";
import type { IntakeQueue } from "./intake";
import type { HubPhase, Side } from "./hub";

export type ActivityAgent = "intake" | "reconciliation" | "summary";
export type ActivityTone = "neutral" | "good" | "flag" | "knowledge";

export interface ActivityEntry {
  id: string;
  agent: ActivityAgent;
  /* One line, past tense. What the agent did, not what it is doing. */
  text: string;
  detail?: string;
  tone: ActivityTone;
  /* Monotonic sequence rather than a wall clock, so the log is stable across
   * re-renders and does not need a timestamp source. */
  seq: number;
}

/* The agent's name, spelled the one way the whole app spells it. This read
 * "Reconcile" — a verb, and a fourth name for a thing already called
 * Reconciliation on the agents panel, the AI performance page and the rail. */
export const AGENT_LABEL: Record<ActivityAgent, string> = {
  intake: "Intake",
  reconciliation: "Reconciliation",
  summary: "Summary",
};

/* ---------- The present tense ----------
 *
 * One line for what is happening right now. This used to sit under the core as a
 * caption, which put the same sentence in two places and hung a shifting strip
 * of text off the bottom of the square. It belongs to the activity block: the
 * log's newest row is the past tense, this is its present, and they read as one
 * statement in one place.
 *
 * Copy rules, since this is the most-read string in the workspace: state the
 * work, not the mechanism; name a real number when there is one; never narrate
 * ("the agents are now beginning to..."). Present participle, no trailing
 * ellipsis, no exclamation. */
export function currentAction(
  phase: HubPhase,
  state: SessionState,
  banks: PropertyBank[],
  queue: IntakeQueue | null
): { text: string; agent: ActivityAgent; live: boolean } {
  switch (phase) {
    case "failed":
      return {
        /* The system's words, not an agent's. `state.failureNote` is written by
         * the pipeline before any agent has an opinion. */
        text: state.failureNote ?? "The run stopped",
        agent: "intake",
        live: false,
      };
    case "draft":
      return {
        text: "Waiting for documents",
        agent: "intake",
        live: false,
      };
    case "identifying": {
      const name = queue?.current?.filename;
      return {
        text: name ? `Identifying ${name}` : "Identifying documents",
        agent: "intake",
        live: true,
      };
    }
    case "intake":
      return {
        text: "Parsing transactions and ledger rows",
        agent: "intake",
        live: true,
      };
    case "intake-done":
      return {
        text: `${queue?.total ?? 0} documents paired across ${banks.length} ${
          banks.length === 1 ? "account" : "accounts"
        }`,
        agent: "intake",
        live: false,
      };
    case "matching": {
      const done = banks.filter((b) =>
        ["reconciled", "posting", "posted"].includes(
          state.banks[b.id]?.stage ?? ""
        )
      ).length;
      return {
        text: `Matching ${banks.length} accounts · ${done} complete`,
        agent: "reconciliation",
        live: true,
      };
    }
    case "summary":
      return {
        text: "Reconciliation complete",
        agent: "summary",
        live: false,
      };
    case "posting":
      return {
        text: "Posting entries to Yardi",
        agent: "summary",
        live: true,
      };
    case "complete":
      return { text: "Cycle closed", agent: "summary", live: false };
  }
}

/* The account's purpose ("Operating", "Capital Reserve") — what a person calls
 * it. Falling through to the raw id printed "bm-wells-operating-1145" in the
 * log, which is a database key, not a name. */
function bankName(banks: PropertyBank[], bankId: string): string {
  const b = banks.find((x) => x.id === bankId);
  return b ? `${b.name.split(",")[0]} ${b.type}` : "an account";
}

export function useActivityLog({
  state,
  banks,
  queue,
  docked,
}: {
  state: SessionState;
  /* The session's accounts. */
  banks: PropertyBank[];
  queue: IntakeQueue;
  docked: Set<string>;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const seen = useRef(new Set<string>());
  const seq = useRef(0);

  const push = useRef(
    (e: Omit<ActivityEntry, "seq">) => {
      if (seen.current.has(e.id)) return;
      seen.current.add(e.id);
      seq.current += 1;
      setEntries((prev) => [...prev, { ...e, seq: seq.current }]);
    }
  ).current;

  /* ----- Intake: documents arriving ----- */
  useEffect(() => {
    if (!queue.started) return;
    push({
      id: "recv",
      agent: "intake",
      text: `Received ${queue.total} documents`,
      detail: "Filenames only · nothing read yet",
      tone: "neutral",
    });
  }, [queue.started, queue.total, push]);

  useEffect(() => {
    for (const key of docked) {
      const [side, bankId] = key.split(":") as [Side, string];
      push({
        id: `dock-${key}`,
        agent: "intake",
        text: `Identified ${bankName(banks, bankId)} ${
          side === "statement" ? "statement" : "Yardi ledger"
        }`,
        detail:
          side === "statement"
            ? "Matched to a known account on this property"
            : "Routed to its statement's bank",
        tone: "neutral",
      });
    }
  }, [docked, push]);

  /* ----- Intake: the pairing finding, then the notes it leaned on ----- */
  const allPaired = banks.every(
    (b) => state.banks[b.id]?.stage !== "empty" &&
      state.banks[b.id]?.stage !== "statement-ready"
  );
  useEffect(() => {
    if (!queue.started || queue.stage !== "done" || !allPaired) return;
    push({
      id: "paired",
      agent: "intake",
      text: `Paired ${banks.length} ${
        banks.length === 1 ? "account" : "accounts"
      }`,
      detail: "Every statement matched to a Yardi ledger",
      tone: "good",
    });
    /* Identity notes are what let intake resolve holders and addresses that do
     * not match literally, so they are attributed here rather than to
     * reconciliation. */
    for (const note of propertyNotes.filter((n) => n.kind === "identity")) {
      push({
        id: `note-${note.id}`,
        agent: "intake",
        text: `Applied note · ${note.title}`,
        detail: note.appliesTo ?? "All banks",
        tone: "knowledge",
      });
    }
  }, [queue.started, queue.stage, allPaired, push]);

  /* ----- Reconciliation ----- */
  useEffect(() => {
    if (state.runState !== "matching") return;
    push({
      id: "recon-start",
      agent: "reconciliation",
      text: `Started matching ${banks.length} ${
        banks.length === 1 ? "account" : "accounts"
      }`,
      tone: "neutral",
    });
  }, [state.runState, push]);

  useEffect(() => {
    for (const b of banks) {
      const rt = state.banks[b.id];
      if (!rt) continue;
      if (rt.stage !== "reconciled" && rt.stage !== "posting" && rt.stage !== "posted")
        continue;
      const flagged = rt.exceptionCount;
      push({
        id: `recon-${b.id}`,
        agent: "reconciliation",
        text: `${b.type} · ${rt.approvedCount} matched${
          flagged > 0 ? `, ${flagged} flagged` : ""
        }`,
        detail: flagged > 0 ? "Flagged rows need a human decision" : "Clean",
        tone: flagged > 0 ? "flag" : "good",
      });
    }
  }, [state.banks, push]);

  /* ----- Summary ----- */
  useEffect(() => {
    if (state.runState !== "review") return;
    const approved = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
      0
    );
    const exceptions = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.exceptionCount ?? 0),
      0
    );
    /* Exclusion and timing notes act during matching, so they are attributed to
     * the agent whose verdicts they changed. */
    for (const note of propertyNotes.filter((n) => n.kind !== "identity")) {
      push({
        id: `note-${note.id}`,
        agent: "reconciliation",
        text: `Applied note · ${note.title}`,
        detail: note.appliesTo ?? "All banks",
        tone: "knowledge",
      });
    }
    push({
      id: "summary-done",
      agent: "summary",
      text: `${approved + exceptions} records reconciled`,
      detail: `${approved} matched · ${exceptions} need review`,
      tone: exceptions > 0 ? "flag" : "good",
    });
  }, [state.runState, state.banks, state.bankOrder, push]);

  /* ----- Posting ----- */
  useEffect(() => {
    if (state.runState !== "posting") return;
    const approved = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
      0
    );
    push({
      id: "post-start",
      agent: "summary",
      text: `Posting ${approved} entries to Yardi`,
      detail: "Exceptions are flagged in Yardi, not posted",
      tone: "neutral",
    });
  }, [state.runState, state.banks, state.bankOrder, push]);

  useEffect(() => {
    if (state.runState !== "posted") return;
    const approved = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.approvedCount ?? 0),
      0
    );
    const exceptions = state.bankOrder.reduce(
      (n, id) => n + (state.banks[id]?.exceptionCount ?? 0),
      0
    );
    push({
      id: "post-done",
      agent: "summary",
      text: "Posted to Yardi · cycle closed",
      detail: `${approved} entries written · ${exceptions} flagged for follow-up · report saved`,
      tone: "good",
    });
  }, [state.runState, state.banks, state.bankOrder, push]);

  return entries;
}
