# Build prompts — the rebuild of the shell

Working document, 19 September 2026. Prompts for the next block of work: the
left rail, the parts every screen is made of, and the Close screen.

Use in order. Each one assumes the one before it has landed and the tree still
compiles. Paste one at a time into a fresh agent session.

These continue `RECONCILER_PLAYBOOK.md` Part 8, which covers the data layer
(prompts 1 to 8 there). These are numbered S0 to S4 so the two sets do not
collide.

---

## S0 — standing context

Paste this at the top of every prompt below, or point the agent at it once per
session.

```
Read these four documents before you write anything. They are the spec and they
disagree with the current code on purpose.

  docs/TAXONOMY_AND_IA.md   what things exist, and the five screens
  docs/AI_ARCHITECTURE.md   the five jobs and what each may never do
  docs/FLOWS.md             the state machine and its guards
  docs/UX_SPECS.md          one spec per screen

Ignore DESIGN.md and VISUAL_DESIGN_CONTEXT.md at the repo root. They are stale
and they tell you to start the interface from scratch. Do not.

Visual rules, highest authority first:
  1. src/app/globals.css   the tokens, with the reasoning in the comments
  2. /design-system        the live page. If a rule and a component disagree,
                           the component is wrong
  3. docs/design-system/*.md

Hard constraints for everything below:
  - No new colour, no new text size, no new control height. The ramp is five
    text steps and three control heights, and they are enough.
  - Buttons are ui/Button only. Radius 999 at every size. Every label 13px.
  - Negative numbers use U+2212, never a hyphen.
  - No em dashes in any user-visible string, aria-labels included. Use a middot.
  - Money is worked out from records. Never seeded, never stored as a summary.
  - npx tsc --noEmit must exit 0 when you are done. There is no test runner.

Tell me what you are going to change before you change it.
```

---

## S1 — the unit of work

This has to land before the Close screen, because Close counts accounts and the
current model has no per-account state to count. It changes types only.

```
Make the unit of reconciliation ONE BANK ACCOUNT for ONE ACCOUNTING PERIOD.

Today SessionState holds one session per property per period, with a banks map
beneath it and a single runState across the whole thing. That cannot work. A
session never ties out. Each account proves on its own, against its own
statement, with its own unexplained figure. A badge above four accounts can only
either lie, or go red for the three that are fine.

Change the types in src/lib/session/types.ts:

  Reconciliation   one account, one period. Has its own state and its own
                   unexplained figure. THIS IS THE UNIT.
  ClosePackage     one property, one period. Holds reconciliations. It counts.
                   It never proves and it has no single status.
  Run              one attempt at a reconciliation. A reconciliation can be run
                   more than once, for example against a partial statement
                   mid-month and again when the final one arrives. Only the last
                   one is signed. The seed already says "May 2026 · Re-run" with
                   no object behind it.

Retire the word "session" everywhere a person can see it.

Replace RunState with the state machine in docs/FLOWS.md Part 2. Fourteen
states. The one that does not exist today and matters most is `blocked`: a read
that failed and needs a person. Today reading is allowed to fail and sending is
not, which is exactly the wrong way round.

Write the guards as code, not as comments:
  - Cannot reach `proved` until unexplained is exactly 0.00. Not rounded, not
    a warning someone can click past.
  - Cannot reach `signed` without a person. Never automatically, at any
    trust level.
  - Cannot post into a closed period.

Keep every record id stable. SessionState.recordStatusOverrides and
recordComments are keyed by them, and changing them would silently throw away
every decision a reviewer has already made in a running session.

This must compile green against the existing screens BEFORE any screen is
redesigned. PropertiesCanvas (3,703 lines), AgentsPanel (2,363) and
ReviewCanvas (1,777) all read the old shape. Migrate them. Do not redesign them.

Show me the types and the migration before you touch a component.
```

---

## S2 — the left rail

Do this first. It is cheap, it is visible, and it forces the two missing screens
into the open instead of leaving them as panels nobody can find.

```
Rebuild the left rail to five destinations.

    Close        the month's work. Carries a count
    Reconcile    one account at a time
    Accounts     the bank accounts and what is still waiting on them
    ──────────
    Rules        what the system has been taught
    Quality      is it working, and is that changing

The rule behind the divider: the top three are DOING the work, the bottom two
are GOVERNING the work. Same person, different moments. The line says so.

Route keys today are "dashboard" | "workspace" | "properties" | "observability"
in src/app/page.tsx and src/components/LeftRail.tsx. Change them to
"close" | "reconcile" | "accounts" | "rules" | "quality" and update every call
site. Do not leave aliases behind.

Why each label changed, so you do not talk me out of it:
  - "Dashboard" names a shape, not a job. Every product has one.
  - "Properties" points at the wrong object. Waiting items live on the ACCOUNT,
    not the property, and an account is the thing that can be proven. A property
    is a folder above it.
  - "AI Performance" is written from our side of the screen. The reader is an
    accountant who wants to know if the work can be trusted.
  - Rules and the trust levels currently have no destination at all.

The count:
  - ONLY Close carries one. A badge that counts everything is noise.
  - It counts things that need a person in the open period: blocked documents,
    plus accounts waiting for a decision, plus accounts proven but not yet sent.
  - It is computed. If you find yourself typing a number, stop.

Rules and Quality do not have screens yet. Give each an honest placeholder that
names what will live there and links to the spec section in docs/UX_SPECS.md.
Not a blank page. Not a fake chart. Not a spinner.

Icons: keep the existing lucide set. Building2 goes with the Properties label,
so swap it for something that reads as an account rather than a building. Keep
Gauge for Quality and GitCompareArrows for Reconcile.

Done when: every rail item lands on a real screen, the count is derived from
reconciliation state rather than typed in, and tsc exits 0.
```

---

## S3 — the parts every screen is made of

Build these before any screen. Four of the five screens are lists of the same
few things, and building them once is what stops the fourth screen inventing its
own row.

Put them in `src/components/entities/`. Each one gets a short header comment
saying what it is for and what it must never do.

```
Build ten components. They are the pieces every screen is assembled from. Build
them in isolation first, with a small preview route at /entities, and wire them
into screens in a later prompt.

For each one I have given the props, the states it must handle, and a "never".
The "never" is the part that matters. If you can only get one thing right,
get that.

1 · AccountRow
   The primary row in the product. One bank account, one period.
   Props: property, account name, state, unexplained, items waiting,
          age of oldest item, how long it has been sitting.
   States: waiting for files · reading · stuck · pairing · waiting for you ·
           proved · signed · sending · sent · half sent · failed
   Never: never shows a bare percentage. Never colours the state using the
          status ramp — a cheque that has not cleared is normal, and tinting it
          amber teaches people to ignore every colour on the screen.

2 · StuckRow
   A document that could not be read, with the way out beside it.
   Props: account, reason code, one-line explanation, one or two actions.
   The five reason codes and their actions:
     incomplete read  -> Re-upload · Try another export format
     unreadable line  -> Fill in the missing field
     wrong period     -> Open <that period> · Confirm this is a re-statement
     wrong account    -> Move to <that account>
     duplicate        -> Discard · Replace the earlier one
   Never: never renders without at least one action. This component exists
          because the current build announces problems and offers nothing.

3 · PropertyRollup
   A property and its accounts.
   Props: property, an array of accounts each with proven true or false.
   Renders the property name and one chip per account. Filled chip means proven.
   Never: never renders a single badge for the property. A property cannot be
          proven. Only its accounts can.

4 · OpenItemRow
   One thing still waiting to clear, on an account.
   Props: description, amount, date written, age in days.
   Age is computed from the date, never passed in as a stored number.
   Marked when age is over 90 days.
   Never: never renders without an age.

5 · MatchCard
   The item view. The most important surface in the product.
   Props: bank line (one), ledger rows (an ARRAY), the rule that fired or null,
          candidates with a rejection reason each, an optional model sentence,
          the four actions.
   Layout: bank line left, ledger rows right, how it was decided beneath,
           then the candidates, then the model sentence, then the actions.
   The ledger side is a list because one deposit can cover three rents. That is
   the ordinary case. The old type could not express it at all.
   Candidates are selectable. Choosing one is the most common thing a person
   does in this job.
   Never: never presents the model sentence as a finding. It sits in a box
          labelled as a suggestion. Never offers "approve" as one of the four
          actions.

6 · RuleRow
   Props: scope, the condition in plain words, owner, expires, times fired,
          times overridden.
   Never: never renders without an owner and an expiry.

7 · PatternRow
   Props: name, level (1 to 4), times seen, agreement rate, sampling rate.
   The sampling indicator gets LONGER as the level goes up. That inversion is
   the point of the whole design, so make it visible rather than stating it in
   a caption.
   Never: never renders a permanently-excluded pattern as though it were at
          level 1. Excluded is a different kind of thing, not a low score.

8 · ProofLadder
   The balance proof. Two short columns that meet at one figure.
   Props: the records. It computes everything. Nothing is passed in pre-summed.
   The unexplained figure uses --type-metric. Nothing else on the screen does.
   Carries "worked out, not estimated", and that has to be true.
   Never: never accepts a pre-computed total as a prop. If it does, the claim
          in the caption becomes a lie.

9 · Money
   Renders a figure. Host Grotesk numerals, tabular, U+2212 for negatives,
   two decimals always.
   Never: never uses a hyphen for a negative.

10 · OutcomeChip
   The five outcomes: matched · timing · bank only · ledger only · needs fixing.
   Gets its own token set, kept apart from --status-*, exactly as --agent-* is
   already kept apart for the same reason.
   Never: never maps an outcome onto --status-ok/warn/danger/info/neutral.
          Status answers "how is this going". An outcome answers "what kind of
          thing is this". They are different questions.

Done when: /entities renders every component in every state listed, and
tsc exits 0. No screen has changed yet.
```

---

## S4 — the Close screen

```
Replace DashboardCanvas with the Close screen. Spec is docs/UX_SPECS.md
section 1. Build it from the entities in src/components/entities/.

THE HEADLINE
  "14 of 22 accounts proven" and, beside it, "May closes in 4 days".
  That is a count and a date. It is the only large figure on the screen.

REMOVE, and do not negotiate with me about these:
  - "Tokens used 1.24M". An accountant cannot act on a token and it is mildly
    alarming. Cost belongs on Quality, in dollars.
  - "First-pass accuracy 90%". It is a school report about the machine. It is
    also one of four names this codebase uses for two numbers.
  - The "Matched" column. Nobody acts on 196.
  - The "Updated 4h ago" column. What matters is how long something has been
    WAITING, not when it last moved.
  - The "Ledgers 3 / 4" fraction. That is not a measurement, it is a state:
    that account is waiting for a file. It belongs in the stuck list with a
    button next to it.
  - "New session". You do not create the work, the calendar does. When a period
    opens, every account due gets a reconciliation. Replace it with "Open June",
    shown only when the next period is not open yet.

SECTIONS, in this order, top to bottom:

  1. Stuck
     Only rendered when there is something in it. StuckRow.
     Always at the top and never collapsible. It is the only thing on this
     screen that cannot move without a person.

  2. Needs a decision
     AccountRow, one per account, SORTED BY UNEXPLAINED MONEY, DESCENDING.
     Not by property. Not by time. The money is what makes attention worth
     spending.

  3. Needs a signature
     Accounts that are proved but not sent. Separated out deliberately: signing
     is a different act from deciding. It takes fifteen seconds and needs no
     thinking, and mixing it into the queue above hides the quick wins.

  4. Spot checks
     "4 items to check", with one line saying this list grows as the system
     does more. Nobody should read it as a backlog they are failing at.

  5. By property
     PropertyRollup, folded away. Some people think in buildings. This is where
     "3 of 4 proven" lives, and it is secondary.

  6. Recently closed
     Folded.

THE EMPTY STATE IS A REAL DESIGN
  When all 22 are proven, this screen shows one thing: a single action to close
  the month. Not a congratulations. Not a dashboard of nothing.

Done when: nothing on the screen is seeded, every figure derives from
reconciliation state, the sort is by money, a stuck item cannot be scrolled
past, and tsc exits 0.
```

---

## What comes after

In this order, and each one is its own prompt when we get there.

| # | Prompt | Why it waits |
|---|---|---|
| S5 | Reconcile, part one: the shell, the lanes, and the queue | Needs the entities from S3 |
| S6 | Reconcile, part two: the item view and the four actions | The heart of the product. Beat 4 |
| S7 | Reconcile, part three: the canvas hands off to the proof | Needs the proof to exist. Beat 6 |
| S8 | Accounts, and the running list of waiting items | This is where carry-forward becomes visible |
| S9 | Rules, and the four-step way to write one | The preview is the part that matters |
| S10 | Quality, rebuilt around override rate and escaped errors | Outside the recorded walkthrough |

## One warning about S2 to S4

`PropertiesCanvas` is 3,703 lines, `AgentsPanel` 2,363 and `ReviewCanvas` 1,777,
and all three still read `RecordItem` and the two-value status directly. None of
these three prompts redesigns them. They must keep compiling the whole way
through. If an agent offers to "clean up while it is in there", say no. That is
S4 onwards, and it is a separate risk.
