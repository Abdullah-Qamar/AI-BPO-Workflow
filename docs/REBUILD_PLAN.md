# The Rebuild Plan

Working document, 19 September 2026. Sequences the rebuild that
`docs/RECONCILER_PLAYBOOK.md` calls for, and records the design decisions taken
along the way.

Read the playbook first — it holds the domain, the eight gaps and the argument.
This file holds the order of work, what the current contract cannot express, and
the design decisions that the playbook implies but does not settle.

Inputs: `docs/RECONCILER_PLAYBOOK.md` (canonical), `docs/teardown/01`–`06`
(the screen-by-screen teardown), `fixtures/`.

---

## Part 1 — The spec is the walkthrough

The playbook's Part 10 defines an eight-beat recorded walkthrough. **That arc is
the real specification.** Scope is judged by whether a surface appears in it, not
by exhaustive screen coverage.

| Beat | Surface it needs |
|---|---|
| 1. The job in thirty seconds | narration only |
| 2. One real statement | the BAI2 fixture, opened |
| 3. The run, unattended | the hub — rows, strands, core |
| 4. The exception that needs you | the ambiguous refund, pickable |
| 5. The bounced payment | the pattern layer |
| 6. The proof | the balance proof ladder |
| 7. The signature | posting, with a confirm and an undo |
| 8. The ladder | the autonomy screen |

What this prunes: money columns on the Properties listing, the AI Performance
rebuild, and the property record's cash position are all real work from
`docs/teardown/02-screens.html` that appear in **no beat**. They come after
recording, not before. What it adds: the autonomy ladder (beat 8) is the
strongest original idea in the project and currently has no screen at all.

---

## Part 2 — What the current contract cannot express

This is the answer to the playbook's prompt 0. It is not a list of missing
fields; the contract contradicts the playbook structurally, and every screen
change in the teardown is blocked behind it.

### There is no money in the model

**`"balance"` appears zero times in `src/lib/seed.ts`.** Not on an account, not
on a session, not on a record. `outstanding` at
[seed.ts:2154](../src/lib/seed.ts#L2154) is `session.openItems` under another
name — a count of items, not a sum of dollars.

Gap 4 — the balance proof, the playbook's highest-value single addition — has
nothing to stand on. Neither does any of the teardown's "show dollars at risk,
and sort by them", which is the same request repeated across five screens.

### A match has one side

[`RecordItem`](../src/lib/seed.ts#L2290) carries a single `amount`, a single
`title`, and `evidence: string[]`. There is no bank side, no ledger side, and no
candidate set.

The fixture's deposit covering three rents — 12,450.00 against 4,200.00 +
4,150.00 + 4,100.00 — is **not expressible in this type at all**. Neither is the
ambiguous refund, because there is nowhere to put two candidates. Gap 1.

### Two buckets, and bucket-swapping is the only verb

[`RecordStatus = "approved" | "flagged"`](../src/lib/seed.ts#L2275), and the only
action that touches it is `moveRecord` with `to: "approved" | "flagged"`
(`src/lib/session/types.ts`). An uncleared cheque is completely normal and must
be filed as a problem; a genuine $75 difference is resolved by declaring it
approved, which does not make the $75 go away. Gaps 2 and 3.

### The unit of work is the session, not the account

`SessionState` holds one session-wide `runState` over a `banks` map. But a
session never ties out — each account ties out separately, and the thing above it
is a close package that completes when all its accounts are proven.

This is the playbook's hierarchy bug, and it is a reducer rewrite rather than a
field addition. It is also why "3 of 4 accounts proven" cannot currently be
rendered: there is no per-account proven state to count.

### Posting cannot fail

`RunState` runs `updating-yardi` → `complete`. There is no partially-posted,
failed, or reversed state, and no idempotency key. The one irreversible step is
the only step that cannot go wrong, which contradicts the case study's own
argument. Gap 7.

### No pattern layer, and an unlabelled number

The returned payment is seeded as a mismatch rather than recognised as a known
event (gap 5), and `confidence: number` sits on records with no statement of
which question it answers (gap 8).

---

## Part 3 — The fixture is verified

Hand-reconciled 19 September 2026, by arithmetic rather than by trusting the
ladder in the playbook. **It ties.**

Every control total in the BAI2 `03` header reproduces from the `16` detail
lines:

```
opening (010)                     285,400.00
credits (100)   6 items            49,585.60   <- detail sums to 49,585.60
debits  (400)   8 items            33,005.50   <- detail sums to 33,005.50
closing (015)                     301,980.10   <- 285,400.00 + 49,585.60 - 33,005.50
```

Both journeys land on the same figure:

```
bank closing, 31 May               301,980.10
less outstanding (4)               (18,450.50)
plus in transit  (1)                 9,315.00
                                  -----------
adjusted bank                      292,844.60

book balance, 31 May               289,944.00
plus payout never entered            4,318.42
less returned rent and its fee      (1,275.00)
less service charge, plus interest    (142.82)
                                  -----------
adjusted book                      292,844.60

STILL UNEXPLAINED                        0.00
```

And `1,200.00 + 75.00 = 1,275.00` — the return plus its fee exactly reverses the
original deposit, which is what makes the bounced-payment pattern confirmable by
a deterministic check rather than asserted by a model.

### The thing the fixture does that nobody wrote down

The two refund candidates are **both $210**. So outstanding totals 18,450.50
whichever one the reviewer picks, and the proof reaches 0.00 either way.

Pick the wrong one and the month still closes, correctly balanced, with the wrong
tenant carrying a refund that already cleared.

That is the playbook's "balance is not evidence of correctness", live, in the
demo, on real numbers. Beat 4 should show it rather than assert it: pick a
candidate, watch the proof stay at zero, then say what just went wrong. It is the
strongest thirty seconds available in the build and it costs nothing to stage,
because the fixture already contains it.

### One defect, fixed

The return fee carried BAI type code `398`. The 100–399 band is credits, and
`398` in particular is "Miscellaneous Fee Refund" — the code a bank sends when
it *gives a fee back*. The line was charging a fee using the code for refunding
one.

That is not a question of taste, and the `03` header settles it. Derive the
credit/debit split from the type code bands, which is how anyone reading a real
file derives it, and the detail said seven credits and seven debits against a
header declaring six and eight. The fixture contradicted itself. The
contradiction stayed invisible only because the arithmetic had been checked by
reading the amounts rather than by trusting the codes to classify them.

**It is now `567`, "Return Item Fee"** — a debit-detail code in the canonical
ASC X9 list, and the one code in the standard that names this exact event. It
now sits directly beneath the `555` "Deposited Item Returned" line it belongs
to, so the return and its fee read as the pair they are. Two corrections to
what this document guessed a moment ago: the right answer is in the 5xx band,
not 4xx, and it is standard rather than proprietary. `555` turns out to be
standard too — "Deposited Item Returned", not a house code — which retires the
playbook's example of "code 555 means a returned deposit" as a per-bank
mapping. The per-bank code dictionary is still a real requirement; this fixture
simply does not exercise it, and a better example will have to be found for
Part 7.

Only the type code moved, not the amount, so nothing in the ladder above
shifts. Re-verified against the file after the change: credits 49,585.60 over 6
items, debits 33,005.50 over 8, opening plus credits less debits still 301,980.10
— and the `49` account trailer's control total of `75256230`, which is the four
`03` amounts plus all fourteen detail amounts, still ties. The band-derived
split is now 6 and 8, agreeing with the header for the first time.

---

## Part 4 — Design decisions

The playbook settles the domain. These are the interface questions it implies and
leaves open. Decided 19 September 2026.

### 1. The canvas hands off. It does not lose the hub.

`docs/teardown/02-screens.html` says to kill the centre orb.
`WORKSPACE_V2.md` locks the core as a square with one job. Both are half right:
the teardown is correct that a decorative orb cannot hold the most valuable
pixels while the number that decides the close sits in a side-panel caption, and
WORKSPACE_V2 is correct that the hub is the best-composed thing in the product.

**Decision: the canvas is phase-dependent.** The hub — rows, strands, core —
owns the canvas while work is in flight, because a mechanism is the right picture
for work in progress. Once reconciliation lands, the canvas hands off to the
balance proof, because a proof is the right picture for work that is finished.

| Phase | Canvas |
|---|---|
| `draft`, `identifying`, `intake`, `intake-done` | hub |
| `reconciling` | hub, strands working |
| `summary`, `posting`, `complete` | **balance proof**, hub demoted |
| `failed` | hub, with the fault |

Three things this buys. The composition survives. The proof gets the real estate
the teardown correctly demands. And the handoff is itself beat 6 of the
walkthrough — the moment the picture changes from *how it works* to *what it
proved* is a better transition than either state on its own.

It also fixes a live bug. `docked` in
[HubCanvas.tsx:150](../src/components/v2/HubCanvas.tsx#L150) initialises empty
and only fills from the intake queue, so **opening an already-complete session
renders a bare core** — no rows, no strands — while the rail reports a finished
run. The settled state currently has no picture at all. Giving it the proof is
the fix, not an addition.

### 2. Match outcomes are an identity set, not a status ramp

The five outcomes — matched, bank-only, ledger-only, timing, needs-fixing — must
**not** be mapped onto `--status-ok/warn/danger/info/neutral`.

They answer different questions. Status is *how is this going*. An outcome is
*what kind of thing is this*. Map them one-to-one and an uncleared cheque —
completely normal, carries forward, nothing wrong — gets tinted as a warning,
which is gap 2 reappearing as colour after the model has stopped making the
mistake.

So outcomes get their own token set, kept structurally apart from the status
ramp. The precedent is already in `globals.css`: `--agent-*` exists separately
from `--status-*` for exactly this reason, because tinting an agent with a status
colour once put a red dot beside "Summary".

Security-deposit accounts take the same treatment. "Legally segregated, excluded
from automation" is not a state of going well or badly, and the status ramp would
misread it.

### 3. Type: the tokens already exist

`--type-metric` (32px) is documented as *"the figures a screen is ABOUT, and
nothing else"*, with the guard *"if it has a letter in it that is not a unit, it
is not a metric"*. The unexplained figure is precisely that, and a ladder of
supporting lines at `--type-body .nums` beneath it is exactly the row-of-peers
case the token was written for. **No new size is needed and none may be added.**

The numeral work is already solved too. Host Grotesk has uniform digit advance at
every weight, so a bold total holds a column's right edge under regular rows, and
`$`, comma, period and true-minus are pulled into the same face so `$41,900.00`
measures identically at 400 and 600. The hardest part of "put the dollars back"
landed months ago. What is missing is the model, not the typography.

Negatives use `U+2212`, not the hyphen — the hyphen is deliberately excluded from
the numeral face because in this app it joins words far more often than it
negates.

### 4. Vocabulary additions

`docs/design-system/decisions.md` §1 is binding and needs these rows. Without
them the money pass will spell the same concept three ways, which is the exact
drift that contract was written to stop.

| Concept | The word | Never |
|---|---|---|
| The figure that must reach zero | **Unexplained** | Variance, Delta, Diff |
| An account whose difference is zero | **Proven** | Tied, Reconciled, Complete |
| Written and recorded, not yet cleared | **Outstanding** | Uncleared, Pending |
| Banked, not yet on the statement | **In transit** | Undeposited |
| The ledger is wrong and needs an entry | **Book reconciling item** | Adjustment |
| The bank erred | **Bank reconciling item** | Bank error |
| Days since an open item arose | **Age** | Days old |

And two retirements already overdue: "Approved" is still user-visible at
[ReviewCanvas.tsx:589](../src/components/ReviewCanvas.tsx#L589),
[:684](../src/components/ReviewCanvas.tsx#L684) and
[AgentsPanel.tsx:1164](../src/components/AgentsPanel.tsx#L1164) against a
contract that says **Matched**; and "match rate" must become **settled on its
own**, one name for one number.

### 5. Tokens leave the accountant's screens

`docs/teardown/02-screens.html` is right that an accountant cannot act on a
token, and the rail widget is additionally **clipped in every screenshot**
("…ary 89%", "…etails ›") — confirmed live, not an artefact of the captures.

Note this reverses commit `54fd569`, which added that widget deliberately. It
goes anyway: cost belongs on AI Performance, in dollars per reconciliation, with
tokens as the engineering detail beneath. The clipping is a bug either way.

---

## Part 5 — Order of work

Each phase assumes the previous landed. Phases 1 and 2 carry the risk; everything
after them is additive by comparison.

### Phase 0 — the contradictions (under a day)

Playbook prompt 8, plus the design-system drift found on 18 September.

- Fixture: correct the `398` return-fee code.
- "Approved" → "Matched" at the three call sites above.
- Label the confidence chip with the question it answers, or delete it.
- Give the two unclassified-file chips somewhere to go.
- Show an expected-document count in draft ("0 of 8 expected").
- Remove the token widget from every screen but AI Performance.
- Design-system drift: `ui/Button` ships `--radius-control` against a contract
  that says radius 999, and `sm` ships an 11px label against a contract that
  says every button label is 13px. Fix the code or amend the contract — but the
  live page's own rule is that when a rule and a component disagree, the
  component is wrong.
- `ui/Surface` still offers `radius="lg"` (16px), which the contract retired.

No dependencies. All visible. Good warm-up that leaves the repo more honest.

### Phase 1 — the match object (prompt 1)

A match becomes a first-class object: one bank side, a ledger side as an
**array**, the rule that produced it, the candidates considered and rejected, and
a status from the five-value set.

Migrate the existing seed; do not delete it. Where a seeded record was ambiguous,
represent both candidates properly.

**The constraint that matters:** `PropertiesCanvas` (3,703 lines), `AgentsPanel`
(2,363), `ReviewCanvas` (1,770) and the v2 hub all read `RecordItem` and the
two-value status directly. Changing the contract touches them whether or not they
get redesigned. So this phase is mostly migration with a thin new-types surface,
and it must **compile green against the existing screens** before any of them are
redesigned. Show the types and the migration before touching a component.

### Phase 2 — the balance proof (prompt 2)

Balances on the model — statement opening and closing, book balance, outstanding,
in transit, computed adjusted balance per side. Then the ladder, with **every
figure computed from the records and none of them seeded**, carrying "calculated,
not estimated".

Numbers come from `fixtures/`. They tie to zero today and that must stay true —
Part 3 is the regression test.

Highest-value single addition in the plan. Beat 6.

### Phase 3 — resolution actions (prompt 3)

Accept as timing, correct the match, add a correcting entry, set aside with a
required reason. Each must visibly move the unexplained figure. Approving stops
being a valid response to a real difference.

Beat 4. Stage the both-$210 discovery from Part 3 here.

### Phase 4 — the pattern layer (prompt 4)

Returned payment first: find the return, locate the original deposit, confirm
that return + fee equals it, and only then assert the pattern. Confirmed, the
three lines present as one linked event netting to zero, noting that the tenant
now owes rent. Unconfirmed, it shows as a guess and says so.

Beat 5, the emotional centre.

### Phase 5 — the canvas handoff

Implement Part 4 decision 1. Depends on phase 2 for something to hand off to, and
closes the bare-core bug.

### Phase 6 — carry-forward and periods (prompt 5)

Open items belong to the account, not the period. A reconciliation inherits them,
ages them in days, flags past 90 as stale, and hands the unresolved ones forward
on close. Period close state: a closed period cannot be posted into.

Deepest change in the plan, and it turns the product from "compare two files"
into "a running record per bank account". **Must precede recording.**

### Phase 7 — posting can fail (prompt 6)

Partially-posted, failed, reversed. An idempotency key per entry. A visible undo.
One confirm treatment everywhere the post action appears — the drawer currently
fires immediately while the agents panel wraps it in a confirm, and the drawer is
the surface that gets demoed.

Beat 7.

### Phase 8 — the autonomy ladder (prompt 7)

Per-pattern rung: observed, proposed, provisional, autonomous, with seen count,
agreement rate and sampling rate. Promotion needs evidence; **demotion is
automatic**. The permanent exclusions — ambiguous matches, security-deposit
accounts, the final write — are modelled explicitly rather than by omission.

The sampling rate must visibly **rise** as autonomy rises. That inversion is the
point of the design and the reason this gets its own screen.

Beat 8, and the note to close the walkthrough on.

### Phase 9 — after recording

Dashboard and Properties money columns as a pair, the property record's cash
position and per-bank code dictionary, and the AI Performance rebuild around
override rate and escaped errors. All real, all outside the arc.

---

## Part 6 — Deliberately not doing

- **A backend, a parser, or a matching engine.** The artifact is a design
  prototype and the positioning depends on saying so first.
- **Security-deposit automation.** Scoping v1 to operating accounts is the
  defensible judgement; the design states the exclusion rather than quietly
  lacking it.
- **camt.053 and MT940 intake.** BAI2 is the format Yardi's reconciliation is
  built around. Name the others in interviews; build one.
- **Removing the human signature.** Part 5 of the playbook is the argument and it
  is not reopened here.

## Open

- Does the balance proof get its own route, or live only as the settled canvas?
  Leaning canvas-only until something needs to link to it — the teardown wants
  "Net difference" to open the full proof, which a route would serve.
- Where the per-bank code dictionary lives. The property record is the
  teardown's answer and it is probably right, but it is phase 9.
- The `--type-metric` guard says one metric per screen, or a row of peers. A
  proof ladder plus a session roll-up may want two. Check it against the rule
  before inventing anything.
