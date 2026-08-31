# Workspace V2 — locked design context

Redesign of column 3 (the workspace canvas). Driven by three complaints about V1:

1. The statement / ledger widgets and the wire UI are weak.
2. The UI reads as 4 columns; agents should fold into the workspace column, making it 3.
3. The review screen transition is abrupt and the right panel adds confusion there.

Route: `/v2`. V1 at `/` stays untouched until V2 wins.

---

## Shell

```
┌─ LeftRail ─┬─ Sessions ─┬──────────── WORKSPACE ────────────┐
│  Dashboard │            │                                   │
│  Workspace │            │        the hub lives here         │
│  Properties│            │                                   │
│  Knowledge │            │                                   │
└────────────┴────────────┴───────────────────────────────────┘
```

Three columns. `Knowledge` is promoted out of the workspace to a top-level rail
destination, because rules are global assets and not session state.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Workspace** | All of column 3 — the canvas. |
| **Core** | The square block in the middle. Holds the currently-active agent. |
| **Rows** | The 68px doc rows — statements left, ledgers right. |
| **Strands** | The curved wires from rows into the convergence node. |
| **Node** | The single point on each side of the core where all 4 strands meet. |
| **Trail** | The thin row of ticked chips above the core — finished agents. |

## Hub composition

One hub for the whole session. Four banks → 4 statement rows left, 4 ledger rows
right, one core between them.

```
[Chase Op  ]────╮
[Wells SD  ]────┤   ┌───────────┐   ╭────[Chase Op  ldgr]
[BoA Res   ]────┼──●   Recon    ●───┼────[Wells SD  ldgr]
[Chase Escr]────╯   └───────────┘   ├────[BoA Res   ldgr]
                                    ╰────[Chase Escr ldgr]
   statements      the core            ledgers
```

Strands converge to a **single node per side**. Per-bank identity is therefore
*not* carried by the wire — it lives on the rows and inside the core, and is
recoverable on the wire only by hover isolation.

## Doc rows

- Resting height **68px**: bank logo, name, masked account, state glyph.
- Click expands **in place to ~200px**: filename, size, period, rows parsed,
  account holder, export timestamp. Neighbours push down; the strand re-curves.
- 4 × 68 + gaps ≈ **308px** per side, leaving the core real vertical room.
  (V1 cards were 295×262 — four stacked exceeded the viewport, which is why the
  hub composition was impossible before this change.)

## Strand language

| State | Rendering |
| --- | --- |
| No file | ghost dotted |
| File landed, idle | thin solid |
| Being worked | luminous band travelling toward the node |
| Settled (done **or** flagged) | bright white chrome over a soft dark keyline |

Settled strands are deliberately not tinted. Colouring them killed the
composition twice over: with every bank flagged the amber flooded the whole
canvas, and the tint carried nothing the row glyphs and counts weren't already
carrying. The strand says "connected and settled"; the verdict lives on the
rows. White ink needs an edge on a near-white canvas, so each settled strand
rides a blurred dark keyline — the same trick that keeps the white card borders
legible — which also widens as the hover highlight.

Direction is meaningful: light flows **inward** during intake and reconcile,
**outward** during Yardi posting.

**Hover isolation** — hovering a row thickens and brightens only its strand and
drops the other seven to ~20%. This is how per-bank traceability survives the
single-node geometry.

## The core

Present-tense. Shows **one agent at a time** — big, uncluttered, never a list.
Finished agents leave a thin horizontal **trail** of ticked chips above the core;
clicking a chip re-opens that agent's log in place.

Phase ladder:

| Phase | Core shows | Advances by |
| --- | --- | --- |
| Draft | "Drop your documents" — core is the dropzone | user drops files |
| Intake | Intake agent working; files fly out to their rows | auto |
| Intake done | Result + **Start reconciliation** | user clicks |
| Reconciling | Reconciliation agent, per-bank progress | auto |
| Summary | Result + **View records** | user clicks |
| Review | — (drawer takes over) | — |

The phase CTA lives **inside the core**, at the frontier of the work.

## Draft

Core only — centred, alone, asking for documents. **No ghost rows.** Each file
that lands materialises its row and draws its strand; the hub assembles itself.

Drag and drop anywhere on the core. The **intake agent identifies and routes**
each file to its bank. Individual rows accept targeted drops as the repair path.

> **Open consequence:** with no visible manifest, "you're missing the Wells SD
> ledger" must come from the intake agent's report in the core. The two-inputs-
> per-bank rule is satisfied by intake's *output*, not by an empty-state
> checklist.

## Identity is an output of intake, not an input

The first pass got this backwards and it broke the story. Rows appeared already
carrying a bank logo, an account number and a column assignment the instant the
drop landed, because the arrival loop iterated the seed rather than the files.
Three lies, and they compounded:

1. **Identity before inspection** — the account number was displayed before
   anything had been opened.
2. **Sorting before classification** — files were placed in the statement or
   ledger column before anything knew which they were.
3. **Pairing before matching** — the strand asserted a verified pair, so
   intake's headline finding ("every statement matched to a ledger") merely
   restated what the canvas had claimed ten seconds earlier.

The corrected sequence:

| Step | What is known | Where it shows |
| --- | --- | --- |
| **Land** | filename, size, extension — all the OS gives you | anonymous stack at the core |
| **Read** | nothing yet; the document is open | core, with a spinner |
| **Resolve** | institution, account, statement-or-ledger | core, held for a beat |
| **Dock** | which bank, which side | row flies out and slots in |
| **Pair** | both halves present | strand completes |
| **Parse** | transactions, ledger rows | row state + core |

`lib/v2/intake.ts` keeps the answer key nested under `truth` rather than as
plain fields on the document, specifically so that reading it before the
`reading` stage ends is conspicuous rather than accidental.

Two consequences worth keeping:

- The arrival order is deliberately unsorted and interleaved, and the first
  document is a **ledger whose statement has not landed yet** — the case the
  shared reducer silently drops ([reducer.ts:28](src/lib/session/reducer.ts:28)).
  `makeDockBuffer` holds those until their statement arrives.
- Row visibility comes from a V2-local `docked` set, **not** from the bank's
  session stage, because a ledger can be identified before its statement and
  `BankStage` has no ledger-only state to express that.

Filenames are a mix of descriptive and useless on purpose. `document (4).pdf`
cannot be classified without opening it — intake reads contents, it does not
trust labels.

## Session header

The header is the session's **dossier**, and it caps the stage the hub sits on.
The division against the core is what keeps the two from competing:

- **Core** — present tense. What the active agent is doing this second.
- **Header** — standing facts. Identity, scope, and totals that are true before
  the run starts and still true after it ends.

So the header states ("4 banks · 8 documents · 4 notes active") and never
narrates ("reading wells-sd.pdf").

Tabs: **Workspace** | **Activity** | **Knowledge**. The hub anchors directly
beneath, hugging its content rather than stretching — the ~200px hole between
title and composition came from dead-centring the hub in the viewport. The slack
now falls below the hub, where the activity ribbon occupies it.

## Reading order

The workspace column reads **outcome → record → work**:

```
Header            property · facts · Workspace | Knowledge
Summary band      the answer (only once there is one)
Activity  20 ⌄    the account of how it got there + agent pills
Hub               the mechanism — rows, strands, square core
                  caption: what the agent is doing right now
```

Nothing unproduced is rendered, so the column shortens toward the top rather
than holding empty slots.

## The core is a square with one job

It shows the active agent, animated, and nothing else. No status text, no
counters, no controls. Everything it used to carry moved somewhere better
suited: the one-liner sits directly beneath it, the phase action below that, the
totals into the summary band, the task record into the activity list.

Avatars are V1's `DotGridAvatar` fields — stars for Intake, pulse for
Reconciliation, the traced loop for Summary — at **64px inside a 188px square**.
Small on purpose: a field filling the square read as a texture swatch, where one
small mark surrounded by air reads as deliberate.

They are **never paused**. Freezing at t=0 leaves only the handful of dots lit on
the first frame, so a settled agent looked like an empty square rather than a
quiet one. The field keeps moving and drops contrast instead.

**Draft is the exception, and squaring the core nearly cost it.** There is no
working agent yet, so the square carries the upload affordance — glyph plus
"Drop documents" — not an avatar. Replacing that with a paused agent field
removed the only cue that this is where files go, which is the one thing the
phase has to communicate.

### The composition holds still

Files landing must not move the square. Three things had to be pinned:

| Reserved | Why |
| --- | --- |
| Caption 36px, action 40px | both always present, empty or not — the columns are centred on the core, so a second caption line or the gate's button appearing would shift the square and drag every strand endpoint |
| Column `min-height` = 4 rows | docking rows fill into existing space instead of growing the column and re-centring the core against it |
| Activity rows `min-height` = 4 rows | the activity block sits above the hub, so growing from empty pushed the whole composition down mid-upload |

Verified: the square holds at the same offset through draft, all eight docks, and
the gate. The cost is a reserved gap in draft where activity has nothing to show
yet — stability was the explicit priority.

The caption and action slots overhang the square (300px, negative margins) rather
than widening the middle flex column. Sizing that column to the text pushed the
composition 112px past what a narrow workspace can hold.

The caption is measured **outside** the square so its changing text length can't
drag the strand convergence nodes up and down. It deliberately duplicates the
newest activity row: the list is the record, the caption is the label on the
thing you're watching, and having to look away from the animation to learn what
it's doing would defeat the point.

## Reconciliation runs in parallel

Four accounts have no dependency on each other, so sequential matching was an
artefact of the controller, not a description of the work — and it made the
canvas claim three banks were idle while one ran. `parallelReconciliation` on the
provider advances all of them at once, each with a different tick count so they
don't finish in lockstep (a synchronised finish reads as fake).

V1 stays sequential: its `AgentsPanel` narrates one active bank at a time.
V2 needed no strand changes — `rowState` already derives "working" from each
bank's own stage rather than from the single `activeBankId` pointer.

## Observability

The core is present-tense by design, and the first pass let that become an
excuse: the trail above it carried three phase chips and no account of any task,
so dropping V1's `AgentsPanel` dropped its per-agent timelines with it. The
workspace had no memory.

Agent pills sit **under** the log, not in its header — as a header element they
competed with the label and the count for the same first read; underneath they
read as a footer naming who did the work. Chrome-free: no chip background, no
border, no shadow, just the mark and the label. Avatar while working, tick when
done, dot while idle.

### What the summary shows, and why only that

The ops lead is deciding one thing: whether they can close the cycle.

| Figure | Why it's there |
| --- | --- |
| Reconciled | the denominator — did it look at everything? |
| Settled on its own | how much it handled without a human. The single best measure of whether the system earns its place, and what AI Quality leads with at portfolio level |
| Need review | the work still owed |
| Net difference | whether the books actually tie. A reconciliation leaving a non-zero difference isn't finished regardless of match counts — this number can veto the others |

Deliberately excluded: per-bank splits (already on the rows and in activity),
durations (belong on the pills), confidence spread (belongs to record review,
where a specific decision can be interrogated).

`lib/v2/activity.ts` rebuilds that record as an append-only log derived from the
same session state the hub renders, so it cannot drift out of step with what is
on screen. Entries are keyed and deduped, so an effect re-firing on an unrelated
state change cannot double-log.

One surface, two sizes. Collapsed shows four rows newest-first with the tail
fading; the count doubles as the disclosure control and expanding reveals the
whole log in a capped scroll well, so the hub below doesn't get pushed off the
page. There is no Activity tab — the record belongs beside the work, not behind
navigation.

**Property notes appear in the log.** A note that silently changes a match is
worse than no note at all — if human knowledge alters an outcome, the alteration
has to be visible next to the work it changed. Identity notes are attributed to
Intake (they are what let it resolve holders and addresses that don't match
literally); exclusion and timing notes to Reconciliation, whose verdicts they
changed.

## Motion

The intake sequence originally stacked four moving parts on a ~640ms cadence: a
bordered card sliding in per document, a pending-file list shifting up beneath
it, a stepping meter, and a row flying out on the far side. Four simultaneous
animations meant none could be followed.

- The core now holds **one stable line** whose text crossfades — no card swap,
  no pending list (the count carries it).
- Cadence slowed to ~800ms per document (520 read + 280 hold) so the read and
  the placement register as two separate beats.
- The row entrance is the only real movement left: 16px rather than 28px, eased
  over 420ms so it settles rather than darts.
- The meter eases instead of tweening linearly, so its once-per-document jump
  doesn't lurch.

## Knowledge tab

The first pass was a flat stack of same-weight cards left-aligned in a wide
canvas: nothing established hierarchy, the kind chip competed with the title and
the hit count competed with both, and the column floated against dead space.

Now it borrows the AI Quality page's shell (a card with an uppercase `SubHead`
per group), **groups notes by kind**, and leads with a summary row so the *set*
is legible before any single note is. Kind is carried as a coloured left rail
rather than a chip, which groups and identifies in one mark and leaves the title
as the only thing competing for the first read.

### Property knowledge

Distinct from the global rule library on the rail. A global rule is true
everywhere; these are local facts a human knows and the agents cannot infer —
how the landlord's name is printed, which recurring charge has no Yardi
counterpart, when a particular account's interest actually posts.

`hits` is the observability half: a note that never fires is stale, and one
firing constantly is a portfolio rule wearing a property-scoped costume. Hit
counts stay hidden until the run has produced results — before that the honest
statement is "in force", not "applied 4×".

## Review

A **drawer**, not a canvas swap. Slides in from the right, **16px narrower than
the workspace**, sitting over the hub. Back button slides it out. The hub keeps
its state untouched underneath, so returning costs nothing.

Knowledge capture stays at the point of decision: resolving an exception offers
an inline "Teach this rule" affordance (`RecordItem.guidanceCaptured` already
models this). The library itself lives in the left rail.

### Review decisions live in the reducer, not the drawer

The drawer unmounts on close, and the first wiring kept record moves in
`ReviewCanvas` component state — so a decision evaporated the moment the drawer
slid out, while the bank counts it had already adjusted survived. Two surfaces,
two stories, one click apart. Statuses and reviewer comments now live on
`SessionState` (`recordStatusOverrides` / `recordComments`, deviations only)
and `moveRecord` adjusts the owning bank's live counts in the same dispatch.

Consequences that are the point:

- Moving a record burns the workspace down in real time: header "N need
  review", summary band amber figure, the bank row's "N flagged", and the
  "Review N" CTA all track each decision, drawer open or closed.
- **"Settled on its own" does not improve when a human approves leftovers.**
  `setBankCounts` freezes the agent's verdict into `agentApprovedCount` /
  `agentExceptionCount`; the autonomy figure reads only those. Approve all 8
  exceptions and it still says 88% — it is a claim about the agent.
- The activity log stays append-only: reconcile-time entries keep their
  original counts. The log is the record of what happened, not a view that
  rewrites history.

### One list, one truth

The drawer's stats band used to hardcode "68" and "76%" over a 14-record
sample list, while the workspace band derived 60/8 from the reducer, and V1's
summary agent copy said 52/16. All three now count the same thing: the seed
enumerates the full 68 records (8 handwritten flagged + 60 approved, the
mundane tail generated from per-bank tuples), per-bank totals 14/18/22/14, and
both bands derive from session state. "Match rate" is gone from the drawer —
it now states "Settled on its own" with the same definition as the workspace.

### Posting is the review's exit

"Post to Yardi" sits in the drawer header while `runState === "review"` —
at the frontier of the work, same rule as the other phase CTAs. Clicking it
dispatches `startYardiUpdate` and closes the drawer, so the user lands on the
hub just as the outward flow starts. The tail of the lifecycle:

- Core caption: "Writing reconciled entries back to Yardi" → "Posted. This
  cycle is closed."
- Activity: "Posting N entries to Yardi" (exceptions are flagged, not posted),
  then "Posted to Yardi · cycle closed" with entries written / flagged /
  report saved.
- Summary band: the CTA slot flips to a quiet "✓ Posted to Yardi · N flagged
  for follow-up" — the figures to its left are the news; this just says they
  made it into Yardi.

---

## Scaffolding

```
src/app/
  page.tsx            ← V1, untouched
  design-system/      ← existing precedent for a parallel route
  v2/page.tsx         ← NEW
src/components/
  MainCanvas.tsx      ← V1, untouched
  AgentsPanel.tsx     ← V1, untouched
  v2/                 ← NEW: Hub, Core, DocRow, Strands, ReviewDrawer
src/lib/session/      ← SHARED — same reducer, same real lifecycle
src/lib/seed.ts       ← SHARED
src/app/globals.css   ← SHARED tokens
```

V2 is driven by the **real** `SessionProvider` state, not mocks — the
transitions are the thing being redesigned, so they have to be real. A V1/V2
switch in the left rail footer allows side-by-side comparison.

Zero shared component files means zero risk to V1. When V2 wins, the route
swaps and the old tree is deleted.

---

## Resolved during the first build pass

- **Paired row expansion** — expanding a statement does *not* expand its ledger.
  Expansion is an independent, deliberate act per side. Hovering either row
  still highlights its partner, so the pairing stays legible without coupling
  the two.
- **Horizontal budget** — 220 row / 84 span / 330 core / 84 span / 220 row =
  938px, which fits the workspace column at 1440 with the nav expanded (980px
  available). Rows and core shrink toward minimums (170 / 290) below that.
- **The trail** sits directly above the core, centred on it — not spanning the
  workspace. It reads as the core's own history rather than a page-level
  breadcrumb.
- **Amber needs content.** Every bank in the seed carries exceptions, so an
  amber glyph alone discriminated nothing and flooded the canvas. Rows now
  carry the count ("3 flagged" / "Clear") once reconciliation lands, and the
  amber strand is deliberately quieter than the green one.
- **Nodes only render when strands exist** — a bare pair of dots flanking the
  core in draft read as debris.

## Still open

- Knowledge as a 4th rail destination still needs its glyph. The rail glyphs are
  now vector (`NavGlyph.tsx`), so a fourth is drawable rather than blocked on a
  render.
- **A document intake cannot identify** has no designed state yet. The model
  supports it — the doc simply never docks — but there is no "couldn't read
  this, assign it manually" affordance at the core.
- **A missing eighth document** likewise: intake would finish with three banks
  paired and one half-open, and the gate copy ("nothing is missing") has no
  failing counterpart written.
- Intake currently identifies strictly one document at a time. Real intake would
  fan out; the sequential read is a legibility choice, not a claim about how it
  works.
- After complete there is no "Start next cycle" affordance in V2 —
  `startNextCycle` exists on the provider (and clears review decisions), but
  nothing on the canvas offers it.

Resolved since the first build pass: the Yardi-posting tail is designed and
reachable (see "Posting is the review's exit"), and the record-count
disagreement is gone (see "One list, one truth").

## Notes for whoever iterates next

The preview pane pauses `requestAnimationFrame` and every animation timeline
when it is hidden (`document.visibilityState === "hidden"`). Sampling a
transition from JS in that state reports it frozen at `currentTime: 0`, which
looks exactly like a broken transition. Verify motion from screenshots, which
force a frame, rather than from timed DOM polling.

**Never gate visibility on `requestAnimationFrame`.** `DocRow`'s entrance drove
opacity from a rAF-set flag, so any environment where rAF doesn't fire — a hidden
tab, a backgrounded window — left every row at `opacity: 0`. The slide-in is now
a CSS keyframe on `transform` only, with opacity reserved for hover isolation, so
the worst case is a 16px offset rather than invisible content. A mount animation
must never be able to hide the thing it animates.

**A bare `/* */` comment inside JSX renders as visible text.** Wrapping a
returned branch in a fragment turns any comment that was previously sitting in
expression position into JSX children — it must become `{/* */}`. This shipped
to the screen once. Grep for `^\s*/\* ` directly after a line ending in `>` when
touching JSX structure.

The same applies to timing: Chrome throttles `setTimeout` to roughly 1/second in
a hidden page. The intake queue's 420ms read + 220ms hold becomes ~2s per
document there, so an eight-document run that takes ~5s in a visible tab appears
to take ~16s. Don't retune the constants based on what the hidden pane reports.
