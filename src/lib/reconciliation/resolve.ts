/* The four resolution actions, applied.
 *
 * Replaces moving a row between two buckets. Each action changes one input to
 * the balance proof's sum, which is the property that makes these answers
 * rather than filing — the unexplained figure moves the moment one is taken,
 * in front of the person who took it.
 *
 * Every function here is pure and returns a NEW match list. Nothing mutates,
 * because the screen keeps the list in state and an undo has to be able to hand
 * back the exact set that was there before.
 *
 * ---------------------------------------------------------------------------
 * "Correct the match" is the one with real consequences
 *
 * The other three settle a match in place. Choosing a candidate does not: it
 * SPLITS one match into two, and getting that wrong is how a month ends up
 * balanced and incorrect.
 *
 * The fixture's refund is the case. One bank debit of -210.00 against two
 * ledger rows of -210.00 each. Picking Tenant 115 pairs that row with the bank
 * line and leaves Tenant 119's refund with no counterpart — which makes it an
 * outstanding item on the account, not a leftover to be dropped. Drop it and
 * 210.00 vanishes from the books with nobody noticing, because the proof would
 * still reach zero.
 *
 * So one decision produces two matches: the chosen pairing, and a `timing`
 * match carrying whatever was left over, with its age measured from the period
 * end like every other open item.
 *
 * Spec: docs/FLOWS.md F3, docs/UX_SPECS.md section 2.
 */

import {
  isAmbiguous,
  type Match,
  type Resolution,
  type ResolutionKind,
} from "./match";

/* Whole days between a ledger date and the close. Measured from the period end
 * and never from today, so re-opening May in September still says seven days. */
function ageAtClose(date: string, periodEnd: string): number {
  const days =
    (Date.parse(`${periodEnd}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
    86_400_000;
  return Math.max(0, Math.round(days));
}

/* Whether an action can be taken on a match at all, and why not when it cannot.
 *
 * Returns the reason rather than a bare false, for the same reason the state
 * guards do: a screen must never render a switched-off button without the
 * sentence to put beside it. */
export function actionAvailable(
  match: Match,
  kind: ResolutionKind,
  selectedCandidateId: string | null
): { allowed: true } | { allowed: false; because: string } {
  if (match.resolution) {
    return { allowed: false, because: "Already settled · undo first" };
  }

  if (kind === "correct-the-match") {
    if (!isAmbiguous(match)) {
      return {
        allowed: false,
        because: "Only one candidate was in range",
      };
    }
    if (!selectedCandidateId) {
      return { allowed: false, because: "Choose a candidate first" };
    }
  }

  if (kind === "accept-as-timing" && match.outcome === "bank-only") {
    /* A fee on the statement is not waiting to clear — it has already cleared,
     * and the books are the side that is behind. Offering "it is just timing"
     * here would let a reviewer file a real difference as a non-event, which is
     * the same move as the old approve button under a different name. */
    return {
      allowed: false,
      because: "The bank has already taken this · the books need the entry",
    };
  }

  return { allowed: true };
}

/* ---------- Applying one ---------- */

export function applyResolution(
  matches: Match[],
  matchId: string,
  kind: ResolutionKind,
  input: {
    reason: string;
    by: string;
    at: string;
    amount?: number;
    selectedCandidateId?: string;
    periodEnd: string;
  }
): Match[] {
  const target = matches.find((m) => m.id === matchId);
  if (!target) return matches;

  const resolution: Resolution = {
    kind,
    reason: input.reason,
    by: input.by,
    at: input.at,
    amount: input.amount,
    selectedCandidateId: input.selectedCandidateId,
  };

  /* ----- Pick a different match: one decision, two matches ----- */
  if (kind === "correct-the-match" && input.selectedCandidateId) {
    const candidate = target.candidates.find(
      (c) => c.id === input.selectedCandidateId
    );
    if (!candidate) return matches;

    const won = target.ledgerRows.filter((r) =>
      candidate.ledgerRowIds.includes(r.id)
    );
    const lost = target.ledgerRows.filter(
      (r) => !candidate.ledgerRowIds.includes(r.id)
    );

    const paired: Match = {
      ...target,
      outcome: "matched",
      ledgerRows: won,
      /* The rule that the WINNING candidate was considered under. The match now
       * has an auditable answer to "why did these pair", and it is the rule the
       * matcher actually used, not one invented at resolution time. */
      rule: candidate.rule,
      resolution,
    };

    /* Everything the choice did not pair. One match each, because each is its
     * own open item on the account and will age and clear separately. */
    const leftovers: Match[] = lost.map((row) => ({
      id: `${target.id}-leftover-${row.id}`,
      accountId: target.accountId,
      cycle: target.cycle,
      outcome: "timing",
      bankLines: [],
      ledgerRows: [row],
      rule: null,
      candidates: [],
      pattern: null,
      resolution: null,
      reason: `Not selected when ${target.bankLines[0]?.description ?? "the bank line"} was paired · has not cleared`,
      ageDays: ageAtClose(row.date, input.periodEnd),
    }));

    return matches.flatMap((m) => (m.id === matchId ? [paired, ...leftovers] : [m]));
  }

  /* ----- Accept as timing: reclassify, and it carries forward ----- */
  if (kind === "accept-as-timing") {
    return matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            outcome: "timing",
            resolution,
            ageDays:
              m.ageDays ??
              (m.ledgerRows[0]
                ? ageAtClose(m.ledgerRows[0].date, input.periodEnd)
                : undefined),
          }
        : m
    );
  }

  /* ----- Add a correcting entry, and set aside -----
   *
   * Both leave the outcome alone and record the decision. The difference is
   * what `proofContribution` then does with them: a correcting entry moves the
   * book side, and a set-aside moves nothing — so a month with anything set
   * aside cannot reach zero and cannot claim to be proven. That is the point of
   * having the action at all. */
  return matches.map((m) => (m.id === matchId ? { ...m, resolution } : m));
}

/* ---------- Undoing one ---------- */

/* Puts back the set that was there before, including collapsing the leftover
 * matches a candidate choice created. Without this, undoing an ambiguous match
 * would leave an orphan `timing` row that nothing owns and the proof still
 * counts. */
export function undoResolution(matches: Match[], matchId: string): Match[] {
  /* The rows that were split off, collected BEFORE the leftovers are removed.
   *
   * Reading them back off the leftover matches is the only place they exist:
   * the paired match was narrowed to the winning row when the choice was made.
   * An earlier version filtered the leftovers out and then tried to restore
   * from the target's own `ledgerRows`, which had already lost them — so undo
   * silently deleted a real ledger row and the proof moved by 210.00 with no
   * action on screen to explain it. */
  const splitOff = matches
    .filter((m) => m.id.startsWith(`${matchId}-leftover-`))
    .flatMap((m) => m.ledgerRows);

  return matches
    .filter((m) => !m.id.startsWith(`${matchId}-leftover-`))
    .map((m) => {
      if (m.id !== matchId) return m;

      if (m.resolution?.kind === "correct-the-match") {
        /* Every row that was in play, back in the order the fixture had them,
         * so the card looks the way it did before the click. */
        const restored = [...m.ledgerRows, ...splitOff].sort((a, b) =>
          a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)
        );
        return {
          ...m,
          outcome: "needs-adjustment",
          ledgerRows: restored,
          rule: null,
          resolution: null,
        };
      }

      if (m.resolution?.kind === "accept-as-timing") {
        return { ...m, outcome: "needs-adjustment", resolution: null };
      }

      return { ...m, resolution: null };
    });
}
