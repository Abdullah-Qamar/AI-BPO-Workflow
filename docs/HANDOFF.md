# Handoff

19 September 2026. Written for an agent with no memory of the session that
produced it. The previous handoff is deleted: it described resuming at "Phase 2"
and everything it listed as next is now built.

**The state of the tree.** `npx tsc --noEmit` exits 0 and `npm run build`
compiles. All five screens load with an empty console. Nothing here is broken
and nothing is half-finished.

**What changed.** The whole interface was rebuilt on the match contract. Thirteen
commits, `929eb8f` through `76574a9`. The three-agent canvas, the metrics-wall
dashboard and the properties roster are retired; five real screens replaced them.

**Then all nine flows were driven in a browser rather than read.** Every figure
in section 3 was reproduced by clicking, and the guards in section 4 were checked
against the DOM rather than the paint. One dead control turned up and is fixed —
see section 8. Nothing else in this document changed as a result, which is the
useful part of having run it.

---

## Update · 21 September 2026

Three bodies of work land on top of the 19 September rebuild. `npx tsc --noEmit`
still exits 0.

**The two governing screens got their actions.** Accounts and the Stuck section
were lists that named work and, in places, offered nothing that did it. They act
now:

- **Accounts · waiting items.** The three ways out the spec names — chase (writes
  nothing), cancel and re-issue, write back — are wired. The two that write a
  journal entry state it before they write it, and what they write appears in a
  new "Entries waiting to send" section. Nothing leaves the waiting list on the
  click, because the money has not moved until the entry posts, so the list and
  the proof's outstanding line stay the same four items and the same 18,450.50.
  Store, computed entries and undo live in `accounts.ts`, shaped like the
  findings store.
- **Accounts · the list sorts by age**, worst first, with illustrative accounts
  answering from a shared derivation (`illustrativeOldestDays`) so the same
  account never shows two ages on two screens. The screen answers "where are my
  problems" rather than being a directory.
- **Accounts · rules split into two lists.** Matching rules and guardrails have
  opposite counts — a matching rule "fired 1,842 times" is the system working; a
  guardrail "blocked 3 attempts" is three incidents — so `RuleKind` separates
  them and a guardrail carries no override rate.
- **Accounts · month by month has three states**, not two. A month that closed
  WITHOUT ever being proven now warns, where before it looked like one still open.
- **Close · Stuck routes every reason code somewhere real.** A misrouted
  statement offers to move to the sibling account it actually belongs to (the old
  copy offered to move it to the account it had just ruled out), an unreadable
  line opens a form to supply the one missing field, and the irreversible acts
  (move, discard) carry a confirm. A cleared block now carries a `ClearedOutcome`
  — `handed-back` sends the account to the machine, `moved-away` sends it back to
  waiting for a file — so it lands in the truthful section afterwards.

**The Close headline and the two period acts.**

- The eyebrow folded the countdown in ("Close · May 2026 · closes in 4 days"),
  and the proven meter lost its restating labels and moved directly under the
  count it visualises.
- **Open June is gone.** Opening a period is the calendar's job, not a button —
  the same argument that removed "New session". **Close May is wired**: the one
  real act in the corner, gated until every account is posted, and confirming it
  moves the screen to a locked notice stating what handed forward. Closing is
  irreversible by design, so there is no way back and no fake roll-over to June.
  It could not be exercised end to end because the fixture never reaches
  all-posted, so the disabled guard holds; the locked view and the wiring
  type-check.

**Every model output is marked as AI.** The candidate-ranker sentence already
wore a `Sparkles` "a suggestion, not a finding"; the unconfirmed pattern proposal
now wears the same mark. A CONFIRMED pattern deliberately does not — by then a
rule owns it, not the model. Sparkles is the one "from AI" glyph in the app; a
second would break one-meaning-one-mark.

**The docs moved too.** `AI_ARCHITECTURE.md` is rewritten around five jobs and a
named harness layer; `FLOWS.md`, `TAXONOMY_AND_IA.md`, `UX_SPECS.md`,
`RECONCILER_PLAYBOOK.md` and `BUILD_PROMPTS.md` are revised to match, and
`WALKTHROUGH_SCRIPT.md` (a fourteen-station recorded walkthrough) is new.

---

## 1 · Read these first, in this order

| # | File | Why |
|---|---|---|
| 1 | `docs/RECONCILER_PLAYBOOK.md` | The domain and the argument. Part 2 is the balance proof, Part 3 the eight gaps. Read Parts 1–7; Parts 8–11 are the old build order and are done. |
| 2 | `docs/DECISIONS.md` | **New, and the one that saves you time.** Every question the specs left open, settled, with reasoning and where the answer lives. Read it before re-opening anything. |
| 3 | `docs/TAXONOMY_AND_IA.md` | What things exist and the five surfaces. Part 3 joint 1 is carry-forward, which is the deepest idea in the product. |
| 4 | `docs/UX_SPECS.md` | One spec per screen. The "Never" lists are the load-bearing part. |
| 5 | `docs/FLOWS.md` | The fourteen states and the nine flows. Part 2's guard table is implemented in code. |
| 6 | `docs/AI_ARCHITECTURE.md` | The five jobs, and which three have no model in them. |
| 7 | `src/app/globals.css` | **Highest visual authority.** Tokens with the reasoning in the comments. Where a rule and a component disagree, the component is wrong. |

`docs/BUILD_PROMPTS.md` and `docs/REBUILD_PLAN.md` are history now. Every prompt
in both is built. Keep them for the reasoning, not for the sequence.

Visual authority order: `globals.css`, then `/design-system` (the live page),
then `docs/design-system/*.md`.

---

## 2 · The shape of the thing

```
src/lib/
  money.ts                    integer cents + the three money formats
  period.ts                   THE ONE CLOCK (NOW = 2026-06-06), periods, carry-forward
  close.ts                    the open period as 22 account rows; the rail's count;
                              an observable store of blocks a person has cleared
  accounts.ts                 the standing world: waiting items, code dictionary
  knowledge.ts                rules, situations, the rule PREVIEW (it really runs)
  assurance.ts                the quality measures
  sampling.ts                 the spot-check queue + an observable findings store
  posting.ts                  entries, idempotency keys, retry, reverse
  reconciliation/
    match.ts                  THE CONTRACT. Read its header before touching outcomes.
    proof.ts                  the balance ladder
    westlakeMatches.ts        the fixture as 16 matches
    resolve.ts                the four actions, as pure functions
    migrate.ts                old seed -> Match (still used by nothing; kept)

src/components/entities/      the ten shared parts. Preview at /entities.
src/components/*Canvas.tsx    the five screens
src/app/page.tsx             the shell: rail + one destination
```

**The five destinations** are `close | reconcile | accounts | rules | quality`.
No aliases were kept.

---

## 3 · The numbers, and how to check them

Everything the product claims is arithmetic over `fixtures/`. If you change the
fixture, these move, and several screens will quietly disagree until you re-run
them.

| Figure | Value | Where |
|---|---:|---|
| Unexplained, first pass | 2,900.60 | proof over `westlakeMatches` |
| Unexplained, all five settled | 0.00 | both journeys at 292,844.60 |
| Outstanding at the May close | 18,450.50 | 4 items, proof and Accounts agree |
| What gets posted | 4 entries + 11 marks | `buildBatch` |
| Portfolio | 22 accounts, 12 properties | seed |

**The four-step walk** the specs print, which the build reproduces exactly:

| Booked | Books | Unexplained |
|---|---:|---:|
| nothing yet | 289,944.00 | 2,900.60 |
| payment the bank received | 294,262.42 | (1,417.82) |
| bounced rent and its fee | 292,987.42 | (142.82) |
| bank fee | 292,802.42 | 42.18 |
| interest earned | 292,844.60 | 0.00 |

It crosses below zero and comes back. That is deliberate and the specs ask for
it: it shows the figure being worked out rather than counted down.

**To verify by hand:** Reconcile → Start the run → Skip to the end → book the
four corrections → pick a refund candidate. The middle becomes the proof.

---

## 4 · Two rules that are easy to break and expensive to get wrong

**One. `bank-only` must not feed the proof until a person resolves it.**

This was wrong once and the arithmetic hid it. A statement item the books never
recorded is a journal entry going into the ledger; applying it the moment the
matcher classified it means the machine moved the books on its own, and the
proof reaches the reviewer three corrections further along than the reviewer is.
`proofContribution` in `match.ts` gates it on a resolution. If first-pass
unexplained ever reads 1,065.00 again, this is what broke.

**Two. The ambiguous refund's surplus 210.00 feeds the bank side immediately.**

Two ledger rows of 210.00 against one bank debit of 210.00: exactly one has not
cleared, and that is true before anybody chooses and whichever they choose. Held
back until the decision, it understates what is waiting and overstates the
unexplained figure by the same amount.

Both are documented at their call sites. Do not "simplify" either.

---

## 5 · What is deliberately illustrative

One account is real. The Westlake Chase operating account is computed from
`fixtures/` through the contract and the proof. **The other 21 are seeded**, and
they carry an `illustrative` flag that the screens print.

That flag is not decoration. A screen showing 22 unexplained figures where one
came from a real document is making 21 claims it cannot support, and the panel
three clicks away says "worked out, not estimated".

Also seeded and marked: every trend line on Quality, the minutes and dollars
readings, and the rule firing counts. Escaped errors is **real** and starts at
zero — it counts findings from the spot-check queue.

If you add data, mark it. This project's whole argument is that its numbers can
be checked.

---

## 6 · Decisions already taken — read `DECISIONS.md` before re-opening any

Eleven, all settled. The six most likely to be re-litigated:

- **The proof has no route.** It is the settled state of Reconcile. `/proof`
  existed as scaffolding and is deleted.
- **Sampling waits, it does not interrupt.** It ages in the open instead.
- **All runs are visible**, superseded ones quieter, only the last signable.
- **`blocked` lives on the document**, not the reconciliation.
- **Ageing, not escalating.** One person, no notification layer.
- **Four lanes over five jobs.**

Four design rules run through everything and are worth internalising:

1. **An outcome is not a status.** `--outcome-*` exists apart from `--status-*`
   for the same reason `--agent-*` does. Tint an uncleared cheque amber and
   nobody believes any colour again.
2. **A switched-off button says why, and the sentence comes from the guard**
   rather than being written twice.
3. **Every quality number belongs to the machine or the person, never both.**
4. **No em dashes in user-visible copy.** Middots. The retired components still
   have them; live screens are clean.

---

## 7 · What is retired but still in the tree

Nothing routes to these. They compile, and they were left rather than deleted
because they hold the only live-run theatre and a lot of solved layout.

| File | Lines | Why it went |
|---|---:|---|
| `DashboardCanvas.tsx` | 947 | tokens and accuracy on the headline; "New session" |
| `PropertiesCanvas.tsx` | 3,703 | pointed at the property; items live on the account |
| `AgentsPanel.tsx` | 2,363 | three agents are parts of the machine, not destinations |
| `AIQualityDetail.tsx` | 2,333 | the two figures the specs remove by name |
| `ReviewCanvas.tsx` | 1,777 | two buckets, approve/flag |
| `v2/*` | ~3,000 | the hub canvas and its drawer |
| `SurfacePlaceholder.tsx` | 237 | the Rules/Quality placeholders, now real screens |

**Before deleting any of them**, note that `v2/HubCanvas`, `Core` and `Strands`
contain the document-docking animation, and `AgentsPanel` the only worked
example of the old activity feed. `ReconcileRun.tsx` replaced the idea, not the
artwork.

---

## 8 · Known gaps, honestly

The bullets are not bugs: they are things the build chose not to do, each
blocked on something real. What follows them is a bug that was found and fixed,
a dev-server trap, and an error in the specs — kept here because this is where
somebody looks when something does not behave.

- **The Reader's intermediate retries.** The grade is visible; the retry loop
  behind it is not, because there is no parser to fail. The surface is designed.
- **A rule's observability running backwards** — "the rule you approved in April
  has matched 31 items since". Needs months of history.
- **Trust accounting.** Security-deposit accounts are out of v1 and the Accounts
  screen says "not automated · segregated funds" as a plain fact.
- **Anything reaching a person not looking at the screen.** No delivery channel,
  by decision.
- **The dev server caches stale build errors.** If the console shows an error
  whose line number no longer matches the file, restart it. `npx tsc --noEmit`
  is the authority, not the browser console.

### One dead control, found by running the flows and now fixed

The Stuck section's buttons did nothing. `CloseCanvas` passed
`onAct={() => {}}`, so "Move to Operating ••••1145" and "Fill in the missing
field" rendered, enabled, and swallowed the click.

Worth understanding rather than just noting, because the shape of it recurs.
`StuckRow`'s header states that it can never render without a way out — the
actions are looked up from the reason code and there is no prop through which to
omit them — and that guarantee was real. The call site made it cosmetic anyway.
A component can only promise that an action is *offered*; whether it *does*
anything is always the caller's.

The fix is a cleared-blocks store in `close.ts`, shaped like `sampling.ts`'s
findings store. Where the block clears depends on what the person did (see the
21 September update): a `handed-back` document moves the account to `matching`,
and a `moved-away` one sends it back to `draft` — waiting for a file — because
the statement it needed has left. `matching` rather than `reading` for the first,
because F1 terminates every resolved branch there and parking a row in `reading`
would claim a read is under way that nothing here performs. The reasoning is at
the call site.

**What it caught on the way:** the first version worked and the rail badge still
read 13 while the row it counted had left the screen. `LeftRail` reads
`awaitingAPerson()` and its comment promises the badge and the rows "cannot
disagree" — but reading the same function is not enough once one of its inputs
can change. It subscribes now. If you add another store that feeds the board,
that badge is the thing that will quietly go stale.

### If the dev server dies with a heap OOM

Not an app leak, and worth knowing before you go looking for one. `.next`
artifacts encode paths relative to whatever workspace root built them. Serve a
cache built under one root from a server running another and the RSC client
manifest lookup fails —

> Could not find the module "[project]/…/src/app/page.tsx#default" in the React
> Client Manifest

— after which the server leaks hard and dies at about 8 GB. Measured with a
clean `.next`, the two root configurations are identical (788 → 962 MB versus
774 → 972 MB over fifty requests, roughly 4 MB a request). **`rm -rf .next`
after any change to `turbopack.root`, the lockfile layout, or where the project
lives.**

`next.config.ts` pins `turbopack.root` because a stray 93-byte
`package-lock.json` in the home directory, with no `package.json` beside it,
makes Turbopack choose `~` as the workspace root. Delete that file and the pin
can go.

### One real inconsistency found in the specs

`UX_SPECS` section 3 says the oldest waiting item is cheque 1042 at 99 days. The
unpicked refund is dated 14 May, ten days earlier, so it is older. The screen
computes the figure, so it reports the refund and the prose is what is wrong.
Left as-is; the code is right.

---

## 9 · How to verify in five minutes

```bash
npx tsc --noEmit          # must exit 0
npm run build             # must compile, 3 routes: / · /design-system · /entities
```

Then, in the app:

1. **Close** — headline reads "10 of 22 accounts proven", stuck section at the
   top and not collapsible, decisions sorted by money descending.
2. **Reconcile** — Start the run, watch the documents read and the grade state
   its figures, then work the five items and watch the figure reach 0.00.
3. **Sign and send** — 14 of 15 land, one is refused, retry, then undo. Check
   the idempotency keys are identical across both attempts.
4. **Accounts** — expand a waiting item; the carry-forward table should read
   7 / 37 / 68 / 99 days with the last marked stale and projected.
5. **Rules** — Write a rule, pick "auto-approve small refunds", preview it. It
   must report 1 item worth 210.00 and then block approval.
6. **Close → Start checking** — record a problem, then Quality's escaped errors
   goes from 0 to 1.
7. **Close → Stuck** — click both actions. The section empties, and the rail's
   badge counts 13 → 12 → 11 as it does. Proven stays at 10 of 22, because a
   cleared block hands the account to the machine and does not prove it.

If step 5 does not block, the conflict check is broken and that is the single
most important thing on that screen.

Step 7 is there because those buttons were wired to an empty function until
19 September and nothing in the tree noticed. **A control that changes nothing
is invisible to `tsc`, to the build, and to a reading of the component** — it is
only ever caught by clicking it.

Check the disabled states the same way, from the DOM rather than the paint.
`ui/Button` sets the real `disabled` attribute, so a control that merely looks
grey is a different bug from one that is genuinely out of the tab order, and the
two are indistinguishable in a screenshot. Steps 2 and 5 both turn on that
distinction.

---

## 10 · If you are picking up the next piece

The build list is finished. What is left is not "phase 11"; it is judgement
about what this artifact is for, which is a portfolio walkthrough rather than a
product.

Three things would most improve it, in order:

1. **Write the case study.** The playbook's Part 9 is a skeleton and the work it
   describes now exists. Nothing in the code needs to change for this.
2. **Rehearse the hard questions.** Part 10. The screens can now answer most of
   them by being shown rather than described.
3. **Delete the retired components**, once you are sure the live-run artwork is
   not wanted. That is ~14,000 lines and the tree would read very differently.

What would NOT improve it: more screens. Every surface the specs name exists,
and the next honest increment is a backend, which this artifact deliberately
does not have.
