# Portfolio case study — working notes

Session date: 2026-09-13. Purpose: turn Reconciler into a portfolio case study and
video walkthrough that positions its designer as someone who designs **AI agentic
products**, not someone who decorated a dashboard.

The presentable version of this material is `portfolio-playbook.html` in this
folder — vocabulary cards, architecture diagrams, the timecoded video script, the
case-study outline, interview answers, and a recording checklist. Published copy:
<https://claude.ai/code/artifact/777cf882-86be-4fd6-b2f8-1479f5b8d4c4>

This file is the durable record of the reasoning and, more importantly, the
**audit of gaps** — the things that will be asked about, and the things that would
land badly if a viewer found them before we did.

---

## 1. The positioning thesis

Reconciler is not a chat product, and that is the point. The pitch:

> Three agents read statements and ledgers, match them, and post the result back
> to Yardi. The design work was the **contract between those agents and the
> controller who signs the close**: what runs unattended, what the system must
> prove, where a human decides, and how that decision changes the next run.

Four clauses, each with a surface that proves it:

| Clause | Proof in the product |
|---|---|
| **Autonomy boundary** | Intake and matching run unattended; matching runs four accounts in parallel. Posting to Yardi never starts without a click. |
| **Legibility** | Present-tense core, append-only activity log, per-record reason + evidence, confidence per match. |
| **Approval gates** | "Start reconciliation", "Review N records", "Post to Yardi" — each offered where the work stopped. |
| **Learning loop** | Reviewer corrections become prose rules, scoped to property or portfolio, with hit counts that expose stale rules. |

Autonomy was decided **per step**, against three tests: is the output a proposal
or a write, is it reversible, how big is the blast radius. Matching passes all
three. Posting fails two, so posting gets the only hard gate.

## 2. Decisions worth telling

Told in a fixed shape: the situation, the wrong version, what was actually wrong
with it, the fix, what it cost.

- **Identity is an output of intake, not an input.** The first pass drew a row per
  bank carrying logo and account number the instant a file landed — identity
  before inspection, sorting before classification, pairing before matching. Now
  a document lands anonymous and the canvas shows only what has been read.
- **The Exception agent that disappeared.** Early docs list four agents. The build
  has three: explaining a non-match is inseparable from matching, so a fourth
  agent added a handoff without adding a decision. Token accounting merged with
  it (486K + 238K → one 724K line).
- **A metric that cannot flatter itself.** `agentApprovedCount` is frozen at
  `reconciled`, so "settled on its own" does not improve when a reviewer approves
  the leftovers. It is a claim about the agent.
- **Review decisions belong to the session, not the drawer.** The drawer unmounts
  on close; decisions held in component state evaporated while the counts they
  had already changed survived.
- **Colour that lied.** Agents were once coloured with the status palette, so a
  red dot sat beside "Summary" in a product where red means failed. Agent
  identity and status are now structurally separate tokens.
- **The wire that flooded the canvas.** Tinting settled strands amber turned the
  whole composition amber on any property with exceptions everywhere, and carried
  nothing the row glyphs were not already carrying. A state that is true
  everywhere discriminates nothing.
- **Failure copy has a register.** A failed run's note is written by the system in
  the register of a log line, because the failure is raised before any agent has
  an opinion. Copy that reads as a diagnosis claims reasoning that never happened.

---

## 3. Gap audit

Found by reading the source and driving the running app. Split deliberately:
**scope we chose not to build** is a fine answer; **contradictions of our own
stated principles** are not, because the case study states those principles out
loud and a reader will hold the product against them.

### 3a. Contradicts what the case study will claim

| # | Gap | Where |
|---|---|---|
| 1 | **Post to Yardi is a single click in the review drawer.** The Agents-panel version wraps the same action in a confirm popover; the drawer version fires immediately. The "irreversible write gets the strongest gate" argument rests on this button, and the drawer is the surface that gets demoed. | `ReviewCanvas.tsx` post button vs `AgentsPanel.tsx` `ConfirmPopoverButton` |
| 2 | **Four names for two numbers.** Dashboard "first-pass accuracy 90%", AI Performance "Reconciliation success rate 90%", Summary copy "match rate 96%", summary band "settled on its own 96%". The consistency contract retired "match rate" and the agent still says it. | `AgentsPanel.tsx` status sentences, `seed.ts` summary body |
| 3 | **Drawer says "Approved", the contract says "Matched".** The vocabulary table names Matched as the word. | `ReviewCanvas.tsx` stats band |
| 4 | **Two unclassified files with nowhere to go.** Intake reports "2 files unclassified" with two chips. Nothing is clickable. The product announces a problem and offers no route out. | `AgentsPanel.tsx` intake line |
| 5 | **A manifest we already have is withheld.** Property setup knows the session needs 4 accounts × 2 documents. Draft shows an empty square and no expected count. "Identity is an output" survives a quiet "0 of 8 expected". | `BulkUploadCard.tsx` draft copy |
| 6 | **The core never stops moving.** In review and complete the dot field still pulses at full contrast, which reads as "still working". The spec says a settled agent drops contrast rather than freezing. | `DotGridAvatar` usage in the hub |

### 3b. What a controller or auditor would push back on

| # | Gap | Note |
|---|---|---|
| 7 | **No roles, so no segregation of duties.** The preparer can also post. Rules are dated, not signed. A free-text rule ("auto-approve refunds under $250") changes how money is handled with no author, no approval, no conflict check, no preview. | Prototype has no identity layer. Say so, and describe the control model that would follow. |
| 8 | **One property at a time.** The real job is twelve properties a month. No "run all due this cycle", no notify-and-return for a job that takes minutes per property. | The hub is a live theatre — excellent for a single run and for a demo. The dashboard is the asynchronous surface. |
| 9 | **Tokens on the accountant's dashboard hero.** "Tokens used 1.24M" sits beside first-pass accuracy on the user's home screen. An accountant does not know what a token is; it belongs on AI Performance. | `DashboardCanvas.tsx` metric pair |
| 10 | **Unlabelled confidence.** A 32% chip beside "no matching ledger entry" — confidence in what? Readers will guess fraud or error. | Label it or explain it in the expanded row. |
| 11 | **System prompts shown verbatim.** If end users see them they will ask to edit them, which is a governance problem; if they cannot, ask who the reader is. | `AIQualityDetail.tsx` agent cards |
| 12 | **Two trend figures go the wrong way** on a page arguing improvement: records matched −19% since Dec, tokens per record +49%, both unexplained. | Seed a story or be ready to tell one. |

### 3c. Seed and build quirks that read as bugs on camera

| # | Quirk | Fix |
|---|---|---|
| 13 | Dashboard "Failed 3" vs Properties "Failed 2" — legitimate (sessions vs properties, Westlake failed then re-ran) but looks like a bug. | Label the counts. |
| 14 | Every property has exactly 7 sessions. Identical counts down twelve rows read as generated data. | Vary before recording. |
| 15 | Real bank marks and Yardi by name. | Say "mocked integration" on camera; consider a disclaimer on the portfolio page. |
| 16 | The docs disagree about which workspace is the design: `WORKSPACE_V2.md` calls itself locked, `decisions.md` calls V2 a parked experiment. | **Resolved by this commit** — V2 is promoted to `/` and V1's canvas is deleted. `decisions.md` §8 still needs updating. |

**Verified and correct:** the eight exception amounts sum to exactly the net
difference of −$4,991.25. Accountants will add them up.

Items 1, 2, 3, 9 and 13 are each under an hour. Fix them before recording rather
than explaining them.

## 4. Open roadmap (already listed as open in `WORKSPACE_V2.md`)

Unclassified-document affordance · missing-document gate copy · named approvals ·
conflicting rules surfaced in the review row · fan-out intake (sequential is a
legibility choice) · "Start next cycle" after complete · an evaluation harness
behind the seeded figures · a shadow-review practice to counter reviewer
deskilling as reviewer hours fall.

## 5. Pre-recording checklist

- Record from a clean commit; confirm `npm run build` passes first.
- **Record at 1440px wide or more.** At 1024px the workspace shows only the core
  with no document rows or strands — the hub needs ~980px of canvas after the
  rail and sessions panel.
- Disable the Next.js dev indicator (`devIndicators: false`) or record a
  production build. It overlaps the AI Performance rail button.
- Use **1500 Park St** (the only Not-started property) for the full lifecycle;
  use **1849 Westlake** for the review deep-dive — it carries the eight
  handwritten exceptions with reasons and evidence.
- Keep the tab visible while recording. Hidden tabs throttle timers and pause
  animation frames, which makes the intake cadence look ~3× slower.
- Settle the typeface: `docs/design-system/typography.md` records that TASA
  Orbiter was not loading and every judgement was made against Geist.
- Capture hover isolation deliberately (hold one row a full second) and capture
  the Undo toast — that single interaction proves reversibility.
- 2× DPR, export 1920×1080 or 2560×1440 at 60fps; the strand animation and the
  dot-field avatars smear at 30.
- Record narration separately and cut the screen to it.

## 6. Frameworks to cite

Levels of automation (Parasuraman, Sheridan & Wickens) · Microsoft HAX guidelines
and Google's People + AI Guidebook · Anthropic's "Building effective agents"
(workflow vs agent — Reconciler is a workflow with agentic steps) · Bainbridge,
"Ironies of Automation" (cite alongside the 57% drop in reviewer hours) · Norman's
gulf of evaluation · Lee & See on calibrated trust.

Read the source before citing it, and describe it in your own words.
