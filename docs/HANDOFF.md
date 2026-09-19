# Handoff

Checkpoint, 19 September 2026. Written for an agent with no memory of the
session that produced `docs/REBUILD_PLAN.md`, so that it can resume at Phase 2
without re-deriving the contract, the fixture, or the design decisions.

The tree compiles: `npx tsc --noEmit` exits 0, verified against this commit.
Nothing here is broken.

---

## 1. Read these first, in this order

| # | File | Why |
|---|---|---|
| 1 | `docs/RECONCILER_PLAYBOOK.md` | Canonical. The domain, the eight gaps, the argument. Part 8 holds the numbered build prompts; Part 11 the order of work. Everything else is downstream of this. |
| 2 | `docs/REBUILD_PLAN.md` | The execution plan and **the spine of this handoff**. Part 4 records five design decisions already taken; Part 5 the ten phases. |
| 3 | `fixtures/` + `src/lib/fixtures/westlakeOperating.ts` | The one real month. Every figure the product claims is arithmetic over these rows. |
| 4 | `src/lib/reconciliation/match.ts` | The contract Phase 2 builds on. Its header comment argues the outcome taxonomy; read that before adding an outcome. |
| 5 | `docs/teardown/01`–`06` (HTML) | Screen-by-screen teardown. Reference, not sequence — Part 1 of the plan prunes a good deal of it. |

### The design-document trap

**`DESIGN.md` and `VISUAL_DESIGN_CONTEXT.md` at the repo root are stale and
actively misleading.** They date from the initial commit. `DESIGN.md` opens
with *"There is no approved visual direction for this application"* and
instructs a reader to start the interface from scratch; both describe three hash
routes (`#dashboard`, `#workspace`, `#properties`) against an app that now has
four rail destinations. Taken at face value they would cause a fresh agent to
discard a heavily-reasoned design system — tokens, a numeral subset chosen by
measurement, a binding vocabulary contract — as unapproved.

Authority order, highest first:

1. **`src/app/globals.css`** — the tokens, with the reasoning in the comments.
   Read the Host Grotesk header block before touching anything numeric.
2. **`/design-system`** — the live spec page (`src/app/design-system/page.tsx`).
   Its own rule: when a rule and a component disagree, the component is wrong.
3. **`docs/design-system/*.md`** — `decisions.md` (the consistency contract),
   `typography.md`, `icons.md`.

One caveat on the third: `decisions.md` carries a scope note reading *"V1 only
(`/`); `/v2` is a parked experiment and is not touched"*. Commit `7e296fe`
promoted the V2 hub to `/` and deleted the V1 canvas, so that note is now false
and the contract applies to the hub. The rest of the file is current and binding.

---

## 2. What is done

### Phase 1 — the match contract (the architectural work)

Two new files, no component touched. This is deliberate: playbook prompt 1
requires the types and the migration to land before any screen moves.

`src/lib/reconciliation/match.ts` (348 lines) makes a `Match` a first-class
object. Both sides are **arrays** of `MatchLine`, because the returned-payment
pattern is three bank lines against one ledger row and a single bank side could
not hold it; a one-element array covers the ordinary case at no cost. Alongside:
a five-value `MatchOutcome`, `RuleRef` with versions, `Candidate[]` carrying
rejection reasons, `PatternRef` gated on a `confirmed` flag, `Resolution` over
the four resolution actions, and the derivations `difference`,
`proofContribution`, `proofAmount`, `needsDecision`, `isAmbiguous`, `isStale`.

**The fact to carry forward, because Phase 2 rests on it:** the five outcomes
are not a taste taxonomy. They are exactly the set of categories the balance
proof's arithmetic consumes — `matched` nets out, `timing` feeds the bank side,
`bank-only` and a resolved `needs-adjustment` feed the book side, and
`ledger-only` feeds nothing and is therefore the reason a proof can fail to
reach zero. Classifying the fixture by them and applying only those rules
reproduces adjusted bank = adjusted book = 292,844.60, unexplained 0.00.
`proofContribution` and `proofAmount` exist to feed the ladder and nothing else.

`src/lib/reconciliation/migrate.ts` (323 lines) is a pure `RecordItem -> Match`
migration. Record ids are preserved, because `SessionState.recordStatusOverrides`
and `recordComments` are keyed by them and changing them would silently discard
every reviewer decision in a running session. Classification of the eight
hand-authored exceptions is an **explicit reviewed table keyed by record id**,
not a regex over `reason` prose — prose gets rewritten for tone, and a
classification that moves when copy moves would move the proof with it.

Two things `migrate.ts` discloses that matter downstream:

- **It produces no `timing` records at all.** That is gap 2 showing up as an
  absence: the seed was built on two buckets, so a routine outstanding cheque
  had no bucket that wasn't labelled a problem and none was ever written. Do not
  invent one here — an invented cheque adjusts the proof by a number nobody can
  trace to a document. The full five-outcome spread lives in the fixture.
- A migrated match knows **which** ledger rows were considered but not **what
  they said**, because the old seed held no ledger amounts or dates. Any
  two-sided row renderer must handle `ledgerRows` empty while `candidates` is not.

### The fixture, and its self-check

`src/lib/fixtures/westlakeOperating.ts` (634 lines) exists and is complete —
14 bank lines and 16 ledger rows transcribed by hand from `fixtures/`, one
signed number per line (positive = cash into the account, so a GL **Debit** to
cash is positive, which is correct double-entry and the opposite of the
everyday sense of the word). BAI2 implied decimals are divided out once, here,
so no consumer can forget to.

`verifyFixture()` was executed against this commit. All six checks pass:

| Check | Expected | Actual |
|---|---|---|
| Credit total (cents) | 4,958,560 | 4,958,560 |
| Credit item count | 6 | 6 |
| Debit total (cents) | 3,300,550 | 3,300,550 |
| Debit item count | 8 | 8 |
| Opening + credits − debits = closing | 30,198,010 | 30,198,010 |
| Lines whose sign disagrees with their type-code band | 0 | 0 |

`ledgerTotals()` returns cash in 54,540.00, cash out 49,996.00, book balance
289,944.00 — the figures `docs/REBUILD_PLAN.md` Part 3 hand-computed. It sums in
integer cents deliberately, because thirteen decimal additions drift.

### Phase 0 — the contradictions

| What | Where |
|---|---|
| "Approved" → "Matched" at user-visible labels. Internal keys (`"approved"`, `RecordStatus`) untouched on purpose — renaming them is Phase 1 migration work, not a copy fix. | `ReviewCanvas.tsx`, `AgentsPanel.tsx:1164` |
| The confidence chip names the question it answers: "Match 92%", with a hint carrying the full sentence. A bare percentage is a quantity with no question attached. | `ReviewCanvas.tsx` `ConfidenceChip` |
| Radius 999 at every size, and `sm`'s label raised from `--type-meta` (11px) to `--type-body` — a button label is not metadata. `sm` padX 8→10 because a 999 radius spends its first pixels on the curve. | `src/components/ui/Button.tsx` |
| `radius="lg"` (16px) retired from the type. Zero call sites. | `src/components/ui/Surface.tsx` |
| The clipped per-agent token widget removed from the rail; AI Performance promoted to a fourth peer destination. An accountant cannot act on a token, and at 220px the rail clipped it to "S…ary 89%" anyway. | `src/components/LeftRail.tsx` |
| **An expected-document count in draft** — `draftRequirement()` renders "0 of 8 expected — a bank statement and a Yardi ledger for each of 4 accounts", derived from the session's own account list rather than stored. Wired through `accountCount` from `HubCanvas`. | `src/components/v2/Core.tsx`, `HubCanvas.tsx:409` |
| The BAI2 return-fee type code. See below. | `fixtures/bai2-westlake-operating-2026-05.bai` |

The fixture defect is worth reading in full at `REBUILD_PLAN.md` Part 3, because
the diagnosis is sharper than "wrong band". `398` is specifically
*Miscellaneous Fee Refund* — the code a bank sends when it **gives a fee back**
— so the line was charging a fee using the code for refunding one. Deriving the
credit/debit split from the type-code bands, which is how anyone reading a real
file derives it, made the detail report 7 credits and 7 debits against an `03`
header declaring 6 and 8: the file contradicted itself, and the contradiction
had stayed invisible only because the arithmetic was checked by reading amounts
rather than by trusting codes to classify them. It is now **`567`, "Return Item
Fee"** — standard ASC X9, 5xx band, sitting directly beneath the `555`
"Deposited Item Returned" line it belongs to. Only the code moved, not the
amount, so nothing in the ladder shifts.

---

## 3. What is next

**Immediate next action: Phase 2, the balance proof — put balances on the model
(statement opening and closing, book balance, outstanding, in transit, a
computed adjusted balance per side) and render the ladder, reading every figure
through `proofContribution`/`proofAmount` from the fixture's records.**

Read `docs/RECONCILER_PLAYBOOK.md` Part 8 prompt 2 and `REBUILD_PLAN.md`
Phase 2 before writing. Three constraints from those, restated because they are
the whole point of the phase:

- **Every figure computed, none seeded.** The panel carries "calculated, not
  estimated", and that claim has to be true.
- The unexplained figure is the screen's primary element; everything else
  supports it. `--type-metric` (32px) already exists for exactly this and
  **no new size may be added** — see Part 4 decision 3.
- Part 3's ladder is the regression test. It ties to 0.00 today and must stay
  tied.

`match.ts` speaks of a `proof.ts` in the present tense ("`proof.ts` performs
that computation"). **That file does not exist yet** — the comment describes the
file Phase 2 creates, and `src/lib/reconciliation/proof.ts` is the obvious home.
The 292,844.60 result is verified by hand in Part 3, not yet by running code.

After that, Phases 3–9 in `REBUILD_PLAN.md` Part 5: resolution actions, the
pattern layer, the canvas handoff, carry-forward and periods, posting failure
states, the autonomy ladder, then the post-recording work. Part 1 is the scope
test — a surface earns its place by appearing in one of the eight walkthrough
beats.

### The migration has not started

No component reads the new contract. Nothing under `src/components/` imports
from `src/lib/reconciliation/` or `src/lib/fixtures/` at all, and
`outcomeToLegacyStatus()` in `migrate.ts` — the intended bridge, and intended to
double as the migration checklist — currently has **zero call sites**. The
checklist is empty because the migration has not begun, not because it is
finished. `PropertiesCanvas` (3,703 lines), `AgentsPanel` (2,363),
`ReviewCanvas` (1,770) and the v2 hub all still read `RecordItem` and the
two-value status directly.

---

## 4. Decisions already taken — do not relitigate

Full reasoning in `docs/REBUILD_PLAN.md` Part 4. Summarised so that a fresh
agent does not re-open settled questions:

**1. The canvas hands off; it does not lose the hub.** The teardown says kill
the centre orb, `WORKSPACE_V2.md` locks the core as a square with one job, and
both are half right. So the canvas is phase-dependent: the hub owns it while
work is in flight, and once reconciliation lands the canvas hands off to the
balance proof. A mechanism is the right picture for work in progress; a proof is
the right picture for work that is finished. The handoff is itself beat 6.

**2. Match outcomes are an identity set, not a status ramp.** They must not be
mapped onto `--status-ok/warn/danger/info/neutral`. Status answers *how is this
going*; an outcome answers *what kind of thing is this*. Map them one-to-one and
a routine uncleared cheque gets tinted as a warning — gap 2 reappearing as
colour after the model has stopped making the mistake. Outcomes get their own
tokens, as `--agent-*` is already kept apart from `--status-*`. Security-deposit
accounts take the same treatment.

**3. The type tokens already exist.** `--type-metric` for the unexplained
figure, a ladder of peers at `--type-body .nums` beneath it. Host Grotesk
already gives uniform digit advance at every weight with `$`, comma, period and
true-minus pulled into the same face, so a bold total holds a column's right
edge. Negatives use `U+2212`, never the hyphen. No new size.

**4. Vocabulary additions** — Unexplained (never Variance/Delta), Proven (never
Tied/Reconciled), Outstanding, In transit, Book/Bank reconciling item, Age. Part
4 §4 has the table. **These rows are not in `docs/design-system/decisions.md`
yet**, and adding them needs one conflict resolved: §1 of that file currently
lists "Outstanding" as a *Never* — the forbidden alternative to "Open" for the
unresolved subset of exceptions. Part 4 wants "Outstanding" as the primary word
for written-and-recorded-but-not-yet-cleared. Both are legitimate accounting
uses of the word and one of them has to give way. Settle it before the money
pass, because that contract exists precisely to stop this kind of drift.

**5. Tokens leave the accountant's screens.** Cost belongs on AI Performance in
dollars per reconciliation, with tokens as the engineering detail beneath. This
knowingly reverses commit `54fd569`.

---

## 5. How to verify

**Types.** `npx tsc --noEmit` must exit 0. It does, at this commit. There is no
test runner and no lint script in `package.json` — `tsc` plus the fixture's own
`verifyFixture()` are the whole verification surface, which is part of why
`verifyFixture()` returns a structured result instead of throwing: a screen can
render the fixture's integrity as a visible fact rather than the import taking
the app down.

**The fixture.** With Node 24 there is no build step needed:

```
node --experimental-strip-types -e '
  import("./src/lib/fixtures/westlakeOperating.ts").then(m =>
    console.log(m.verifyFixture(), m.ledgerTotals()))'
```

**The app.** Run it through the project's launch config rather than `npm run
dev` directly: `.claude/launch.json` defines `bpo-dev` with `autoPort: true`,
because **port 3000 is occupied by an unrelated application on this machine**
and a bare `next dev` will collide. Note that `.claude/` is gitignored, so that
launch config is **not in the repository** — on a fresh clone it must be
recreated, or the dev server started on an explicit free port.

**The design system.** `/design-system` is the live reference page. Check any
token or control question against it before against the markdown.

---

## 6. Open items and known bugs

### The seeded rule that approves a bounced payment

`src/lib/seed.ts:766` (`g-5`) seeds a knowledge-base rule reading *"Tenant ACH
returns for unit 308 are a known recurring issue with broken auto-pay. Approve
manually."* Approving a returned payment tells the books a tenant paid when they
did not. Playbook Part 8 prompt 8 and the knowledge-base section of the teardown
require this be replaced with a rule that **books the reversal and the fee**.
Not done.

There is a second, unlogged instance of the same class two entries down.
`seed.ts:778` (`g-6`) reads *"Refunds under $250 are routine. Auto-approve and
skip the ambiguity check."* Both of the fixture's refund candidates are **$210**,
so this rule instructs the system to auto-approve precisely the ambiguity that
walkthrough beat 4 is built on demonstrating. It should be fixed in the same
pass, and it is arguably the more damaging of the two because it names the
safeguard it is disabling.

### Known bug: an already-complete session renders a bare core

`src/components/v2/HubCanvas.tsx:150` — `docked` initialises to an empty `Set`
and fills only from the intake drop queue via `handleDock`. Opening a session
that is already complete therefore renders a bare core: no document rows, no
strands, while the rail reports a finished run. The settled state currently has
no picture at all.

**Phase 5 is the fix, not a patch.** Part 4 decision 1 gives the settled phases
the balance proof, which means the bare hub stops being the thing that renders
there. Do not paper over it by back-filling `docked` — that restores a mechanism
diagram to a state that should be showing a proof. The bug is unchanged by this
commit; the only edit to `HubCanvas.tsx` here was the `accountCount` prop.

### Smaller open threads

- **The unclassified-file chips.** Phase 0 lists "give the two unclassified-file
  chips somewhere to go" as an item. It is **not done**, and it is contested
  rather than merely pending: `FileChip` in `AgentsPanel.tsx` carries a
  deliberate decision that the chips are inert — *"there is no parsed content
  behind it to open or download… looking like a control it is not would be the
  worse defect."* Either find them a real destination or strike the Phase 0 item.
- `REBUILD_PLAN.md` Part 6 and the Open section carry three unsettled
  questions: whether the balance proof gets its own route or lives only as the
  settled canvas; where the per-bank code dictionary lives; and whether a proof
  ladder plus a session roll-up wants two metrics on one screen, which needs
  checking against the `--type-metric` guard before anything is invented.

### Concurrency note

Several agents were writing this tree while this checkpoint was being taken.
`docs/REBUILD_PLAN.md` was rewritten mid-read — Part 3's "One defect to fix"
became "One defect, fixed" — and the branch and its first commit were created by
another agent while these claims were being checked. Everything above was
verified against the tree as committed, and no file was found in a half-written
state: `REBUILD_PLAN.md` reads as finished prose, and the three new modules
compile and run.
