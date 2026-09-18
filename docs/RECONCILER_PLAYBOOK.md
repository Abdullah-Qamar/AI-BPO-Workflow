# The Reconciler Playbook

Working document, September 2026. Records the design pivots this project is being
rebuilt around. Read this before making design or architecture changes.

A styled version with diagrams exists as a published page; this file is the
canonical text.

---

## Part 1 — The honest frame

### What this project is

A serious piece of **AI product design**: ~29,000 lines of interface, a state
machine modelling how close work proceeds, and hand-authored fixture data.
There is no backend, no document parsing, no matching engine, no model, and no
Yardi integration. Timed effects simulate the automation.

That is a legitimate artifact. Describing it as an engineering build is not.
"Three agents reconcile statements and post to Yardi" is a claim the artifact
cannot cash.

**The positioning that works:** "I designed the contract between an autonomous
system and the person who signs the close — what runs alone, what the system
must prove, where a human decides, and how that decision changes the next run."

### Three things to settle first

1. **The 96% claim.** Published guidance puts Yardi's own automatic bank
   reconciliation auto-clear rates at 60–80% after optimisation. Either label
   the figure illustrative, or replace it with a real number from a
   hand-reconciled month.
2. **Git attribution.** Six of twenty commits are authored by a colleague,
   including the portfolio docs. Name the collaborator or fix the identity.
3. **AI-drafted material.** Fine to use, fatal to carry into an interview
   undefended. Everything here is borrowed until it can be explained cold.

---

## Part 2 — The domain (learn this properly)

> Reconciliation is not comparing two lists of transactions. It is proving that
> two balances agree, and that every difference between them is explained.

The bank's record and the books are *supposed* to disagree at month end. A
cheque written on the 28th hasn't cleared. A deposit banked on the 31st lands
on the 1st. The bank charged a fee not yet entered. None of that is an error.

### The balance proof

```
Bank statement balance, 31 May                     301,980.10
Less cheques written but not yet cleared (4)       (18,450.50)
Plus deposit banked but not yet landed (1)           9,315.00
                                                   ----------
Adjusted bank balance                              292,844.60

Balance in the books, 31 May                       289,944.00
Plus a payout the bank received, never entered       4,318.42
Less a returned rent payment and its fee            (1,275.00)
Less a service charge, plus interest earned           (142.82)
                                                   ----------
Adjusted book balance                              292,844.60

STILL UNEXPLAINED                                        0.00
```

Two journeys meeting. From the bank's side, remove what the bank hasn't seen
yet. From the books' side, add what the books haven't recorded yet. If they
meet, everything is accounted for.

### The insight that matters most

**Balance is not evidence of correctness.** If Tenant A paid $1,200 and Tenant B
paid $1,200 and the system swaps them, the totals still tie. The proof still
reaches zero. Two tenant records are wrong, one gets a late notice, and nobody
finds out until someone disputes it.

A matching engine can be 100% balanced and substantially wrong.

### Vocabulary

- **Outstanding cheque** — written and recorded, not yet presented to the bank.
  Normal. Carries forward until it clears. Over 90 days it is *stale-dated* and
  becomes its own problem.
- **Deposit in transit** — banked, not yet on the statement. The mirror image.
- **Returned item / NSF** — non-sufficient funds; a payment bounced. Bank shows
  the deposit then a reversal, usually with a fee. The books show one payment
  and think rent was paid. Very common in property management.
- **Book reconciling item** — the ledger is wrong and needs an entry (fees,
  interest, the bounced payment). **Bank reconciling item** — the bank erred.
  Yardi's own vocabulary; use it.
- **Period close** — periods lock. Once May is closed you post a correcting
  entry into June, not into May.
- **Trust accounting** — security deposits are frequently legally segregated
  funds, rules varying by jurisdiction. Scoping v1 to operating accounts is a
  defensible judgement, stated out loud.

### Self-test

- Why should a statement and a ledger disagree at month end?
- Walk the balance proof out loud, both journeys, under a minute.
- Why can a reconciliation tie to zero and still be wrong?
- What is an NSF, and why is $1,200 vs $1,275 usually not a mismatch?
- Book vs bank reconciling item?
- Why does an outstanding cheque break a two-files-in, one-result-out design?

---

## Part 3 — The eight gaps

Ordered by severity. All eight would still be wrong if the backend existed.

### 1. The reviewer can't fix a match — STRUCTURAL

When unsure the system says "two possible matches, can't choose". The only
buttons are approve and flag; the candidates exist only as words in a note.
Choosing when the machine is unsure is the most common human action in this job,
and the product gives nowhere to do it.

**Fix:** a match is an object with a bank side and a ledger side (an array, so
one-to-many works). Candidates become selectable.

### 2. Two buckets can't hold a normal month

An uncleared cheque matches nothing and is completely normal, but must be
called a problem. Once half the flags are nothing, nobody trusts the flag.

**Fix:** five outcomes — matched, bank-only, ledger-only, timing (will clear),
needs fixing.

### 3. Problems have nowhere to go

Bank says $1,200, books say $1,275. Moving it to approved doesn't make the $75
vanish, and the system sends it onward as approved.

**Fix:** four resolution actions, each visibly changing a number — accept as
timing, correct the match, add a correcting entry, set aside with a reason.

### 4. The proof the month is closed is missing

Counts, percentages, and a "tied" label that is a seeded string. No balances
anywhere in the model. That view is the entire reason reconciliation exists.

**Fix:** the ladder above, ending in *still unexplained*. Highest-value single
addition to the product.

### 5. A bounced payment is treated as a mystery

The seed contains a returned tenant payment reported as "amounts don't match,
$1,200 versus $1,275". The $75 is the bank's return fee — $1,200 + $75 *is*
$1,275. A routine event labelled an anomaly because the model has no concept of
it.

**Fix:** recognise known patterns by name, show the parts as one linked event
netting to zero, note that the tenant now owes rent.

### 6. Every month starts from nothing

A cheque written 28 March may not clear until May. It must stay visible with
its age. Right now it disappears.

**Fix:** carry open items forward with age. This turns the product from
"compare two files" into "a running record per bank account" — the deepest
change for whoever builds it.

### 7. The one step that can't fail is the dangerous one

Reading files has a failure state; posting only succeeds. Backwards, and it
contradicts the case study's own argument about irreversible writes.

**Fix:** partially-posted, failed, reversed. Idempotency key per entry. Visible
undo — the strongest trust feature in the product.

### 8. One percentage, two meanings

Confidence sits on approved and flagged items, but "how sure is this match" and
"how unusual is this" need opposite responses.

**Fix:** name the question beside the number. Part 4 dissolves this at the root.

---

## Part 4 — Where intelligence belongs

> The model never decides what is true. It decides what to read, and what to say.

### The dividing line is reproducibility

- Would two runs on the same files have to give the same answer? → **rules**
- Does the output get signed, or land in the accounting system? → **rules**
- Is the input a scanned page, a layout nobody agreed on, free text? → **model**
- Is the output a sentence for a person to read? → **model**

### Four jobs, two not intelligent at all

**Reader — model, checked.** Turns statements and ledger exports into clean
rows. A model earns this: ~8,900 US banks, every statement laid out
differently, no template survives.
*The guard:* every statement states its own opening balance, closing balance
and totals. The extracted rows must reproduce them. If they don't, the read
failed and the run stops. The document grades the Reader's homework.

**Matcher — no model at all.** Pairs rows by a written rule ladder: same amount
same day → same amount within N days → amount plus reference → one deposit
against several rows summing to it. Being wrong costs money here, and "why did
these match" needs an auditable answer. Because it's rules, it is *testable*
against a hand-reconciled month — that's how you get an honest accuracy number.

**Explainer — model, no authority.** Names the likely pattern, ranks the
candidates, writes the one-line reason. Proposes, never commits. A pattern is
asserted as fact only once a rule confirms it.

**Poster — no model at all.** Sends entries one at a time, each tagged so
sending twice is impossible. The most consequential step is the least
intelligent, and those facts are related.

### Rules are data. Prompts are code.

A prompt is an instruction a model may or may not follow; it can't be tested
per customer or used to reconstruct a past decision. Guardrails belong in code:
"never post to a closed period", "never auto-approve above $500", "never create
an entry without a reason". A prompt shapes behaviour; a guardrail prevents
outcomes.

### Naming

Stop calling it three agents — it is a workflow with intelligent steps. Name
lanes after the work: Reading, Matching, Reviewing, Posting. Mark how each
result was decided; "calculated, not estimated" on the balance proof is a real
trust feature.

---

## Part 5 — Earning autonomy

### You can remove the second human. You cannot remove the second party.

Separating preparation from approval is a control, not bureaucracy — but it
does not require two people. *AI prepares, human approves* satisfies it cleanly
and is stronger than one person doing both.

What can't happen is closing the loop: **an AI cannot be accountable.** When
someone asks who signed this reconciliation, the answer has to be a person.

**The settling argument:** if the AI does everything and produces a proof that
ties to zero, approving takes fifteen seconds. Removing that click saves
fifteen seconds and costs the audit answer, the last place errors surface, the
trust story with a finance buyer, and the sale to anyone with an auditor.

### "Once confidence is built" — built how?

The system agreeing with itself is not evidence. The reviewer not objecting is
not evidence — reviewers stop objecting when they stop looking closely, which
is what happens as things start working.

Real confidence needs three independent measurements: back-testing against
hand-reconciled months, deliberate sampling of unflagged work, and a count of
errors found afterwards. **Design the evidence before the autonomy.**

### The trap

**The pattern you automate is the pattern that stops being watched.** If the
reviewer only sees flagged items, failures on normal cases become structurally
invisible — and two wrong matches of equal amounts still net to zero, so the
proof reaches zero while the month is wrong.

**So sampling scales UP as autonomy increases, not down.**

### The ladder

Autonomy is not one dial. Individual **patterns** climb four rungs with
evidence:

1. **Observed** — human decides every time; system watches and counts.
2. **Proposed** — system suggests, human confirms, agreement rate measured.
3. **Provisional** — system decides, human reviews afterwards, sampled heavily.
4. **Autonomous** — system decides, sampled at a fixed rate, forever.

Three things make it safe:

- **Demotion is automatic.** A pattern whose override rate rises falls back a
  rung by itself. This is what separates progressive autonomy from progressive
  complacency.
- **Some patterns never climb:** ambiguous matches (by definition the system
  doesn't know), anything touching security-deposit accounts, and the final
  write. Naming the permanent exclusions is what makes the rest credible.
- **The final write never climbs.** Everything below it does.

### What the human does, once roles are gone

One person. Three kinds of involvement, and conflating them is the mistake:

- **Decide** — only the person can settle it.
- **Authorise** — the system decided; the person accepts consequences. The
  screen's job is to make consequences plain, not to make them think.
- **Sample** — checking work nobody flagged. Grows as autonomy grows.

The end state is a person who signs a proven package in thirty seconds instead
of working exceptions for three hours. That *is* AI-native — it is just honest
about where the signature lives.

**The sentence:** "I designed a system that earns autonomy one pattern at a
time, with evidence, and gives it back automatically when it stops deserving
it."

---

## Part 6 — The system model

### Two worlds, not one

**Standing world** (changes rarely): organisation → owner/portfolio → legal
entity → property → bank account with its ledger line. Plus rules.

**Moving world** (created each cycle): accounting period → reconciliation (one
account, one period) → statement and ledger lines → matches → exceptions →
resolutions → balance proof → posted entries.

**Where they touch — the interesting part:**
- **Open items** belong to the account, not the month. Each reconciliation ages
  or clears them.
- **Rules** are read by every run and changed by corrections — so a run must
  record which rule version it used.

### The hierarchy bug

A session covers one property and holds four bank accounts, but a session never
ties out — **each account ties out separately**. The unit of work is one
account for one period. The property-level thing above it is a close package
that completes when all its accounts are proven: "3 of 4 accounts proven",
never a single badge.

### Feedback: one correction, four destinations

1. **A local rule** — true at this property. Customer-owned, live in minutes.
2. **A pattern** — true for everyone. Team-owned, ships in a release.
3. **A test case** — a labelled example of the system being wrong. *The one
   almost nobody builds, and the only honest way to answer "is it getting
   better?"*
4. **An engineering change** — rare, reviewed, never automatic.

**A rule has a life:** proposed → previewed against last month ("would have
changed 14 items, $3,120") → approved → active, scoped, dated, owned, expiring
→ measured every cycle. Overridden often means wrong; stopped firing means
dead. Surface contradicting rules at approval time.

**The loop runs both ways:** tell people what their correction did — "the rule
you approved in April has matched 31 items since, and been overridden twice."

### Observability: one record, three audiences, three units

Same run record, read in the unit each audience thinks in: **minutes** for the
accountant, **dollars per reconciliation** for the buyer, **tokens and seconds**
for the engineer. Tokens do not belong on an accountant's dashboard.

**Reconstruct, don't just observe.** Every run permanently records: the
documents and a fingerprint proving they weren't swapped; which rules were
active and at which version; which model and prompt version; every model
suggestion and whether it was accepted; every human action with name and time;
every posting attempt and outcome.

**Measurements that matter:**

| Measure | Why |
|---|---|
| Unexplained difference at first pass | What the machine couldn't account for before any human touched it |
| First-pass match rate, frozen | Measured at the machine's verdict. Already done correctly |
| **Override rate** | How often a person disagreed. Rising means drift or stale rules. Most informative number in the system, currently missing |
| Escaped errors | Found after posting or by sampling. Scariest and most valuable |
| Reviewer minutes per reconciliation | The saving actually being sold |
| Cost per reconciliation, in dollars | Tokens in the unit a buyer compares against a salary |

**Governing rule:** every quality number belongs to either the machine or the
human, never both. A metric that improves when people work harder is not
measuring the system.

---

## Part 7 — Formats and the fixture

### What a statement arrives as

- **BAI2** — the answer for this product. Flat file of numbered record types,
  published 1987, maintained by ASC X9, dominant in US corporate banking, and
  **the format Yardi's automatic bank reconciliation is built around**. Every
  transaction carries a numeric type code. Design intake for this.
- **camt.053** (ISO 20022, XML) — richer and structured, replaces MT940, the
  international direction of travel. Support second; name it in interviews.
- **MT940** — fading. **CSV / OFX / PDF** — the real-world mess that justifies
  a model in the Reader.

**A missing design object:** type codes are not fully standard — banks vary and
publish proprietary codes, especially in the 900s. "Code 555 means a returned
deposit" is a per-bank mapping. The product needs a **per-bank code
dictionary**, administrator-owned, versioned, recorded against each run.

### Yardi already works the way the fixes say it should

Yardi's bank reconciliation is a **three-column view** — ledger, bank,
difference — where the bank side is adjusted for outstanding cheques and
deposits in transit, and **the difference must reach zero before anything can
post**. That is Gap 4, mandatory in the target system. It splits corrections
into book and bank reconciling items — Gap 3. It matches on **amount, date and
reference number** — a deterministic ladder, which is Part 4's argument made by
the incumbent.

The fixes were not opinions. They were the domain.

### The fixture

`fixtures/bai2-westlake-operating-2026-05.bai` and
`fixtures/yardi-gl-westlake-operating-2026-05.csv` — operating account, 1849
Westlake, May 2026. Fourteen bank lines, sixteen ledger rows, opening balance
tied at $285,400.

Contains: one deposit covering three rents · a clean match · the bounced
payment as three linked lines where $1,200 + $75 reverses the original $1,275 ·
two identical $210 refunds where the reviewer must choose · a payout on the
bank never entered in the books · a fee · interest · an inter-account transfer ·
three uncleared cheques · one deposit in transit.

Adjusted bank and adjusted book both land on **292,844.60**. Unexplained: 0.00.

**Reconcile this month by hand before touching any screens.** One hour with a
spreadsheet. It is what makes the knowledge yours, and it yields one honest
accuracy number with a stated source.

---

## Part 8 — Prompts for the build

Use in order. Each assumes the previous landed.

### 0 — context

```
Read docs/RECONCILER_PLAYBOOK.md end to end before doing anything.
It records the design pivots this project is being rebuilt around.
Then read PRODUCT.md, src/lib/session/types.ts and src/lib/seed.ts and tell
me, in plain language, which parts of the current data contract contradict
the playbook. Don't change anything yet.
```

### 1 — the match object (do this first)

```
Rewrite the reconciliation data contract so a match is a first-class object
rather than a single row. A match must carry: a bank side (one statement
line), a ledger side (an ARRAY of ledger rows, so one deposit covering three
rents is expressible), the rule that produced it, the candidates considered
and rejected, and a status from a five-value set: matched, bank-only,
ledger-only, timing (expected to clear), needs-adjustment.

Keep the existing seed data working — migrate it, don't delete it. Where a
seeded record was ambiguous with two candidates, represent both candidates
properly so a reviewer could choose between them.

Show me the new types and the migration before touching any component.
```

### 2 — the balance proof

```
Add balances to the model: bank statement opening and closing, book balance,
outstanding items, in-transit items, and a computed adjusted balance on each
side. Then build a BalanceProof component that renders the ladder:

  bank balance − outstanding + in transit = adjusted bank
  book balance + correcting entries        = adjusted book
  the difference between them              = STILL UNEXPLAINED

All figures computed from the records, never seeded. Show "calculated, not
estimated" on the panel. Use fixtures/ for the numbers — they tie to zero and
that must stay true. The unexplained figure is the primary element on the
screen; everything else is supporting.
```

### 3 — resolution actions

```
Replace move-between-buckets with four resolution actions on an exception:
accept as timing (carries forward), correct the match (pick a different
candidate), add a correcting entry (with amount and reason), set aside (with
a required reason).

Each action must visibly change the balance proof. Approving must no longer
be a valid response to a genuine difference. Show me the state changes each
action causes before building the UI.
```

### 4 — patterns, starting with the bounced payment

```
Add a pattern layer. A pattern proposes an explanation for a group of related
lines and is only asserted once a deterministic check confirms it.

Implement the returned-payment pattern first: find a debit whose description
suggests a return, locate the original deposit earlier in the period, and
confirm that return + fee equals the original amount. When confirmed, present
the three lines as ONE linked event that nets to zero, with a note that the
tenant now owes rent. When not confirmed, show it as an unconfirmed
suggestion, clearly marked as a guess.

Use the returned payment in fixtures/ as the test case.
```

### 5 — carry-forward and periods

```
Make the unit of reconciliation ONE ACCOUNT for ONE PERIOD, not a session for
a property. A session becomes a close package that completes when all its
accounts are proven — it shows "3 of 4 accounts proven", never a single badge.

Open items belong to the ACCOUNT, not the period. A reconciliation inherits
open items from the prior period, ages them in days, flags anything over 90
days as stale, and hands the unresolved ones forward on close.

Add period close state: a closed period cannot be posted into.
```

### 6 — posting can fail

```
Give posting real failure states. Add: partially-posted (40 of 60), failed,
and reversed. Each entry carries an idempotency key so a retry can never
create a duplicate. Add a visible undo for a completed post.

The UI must show which entries landed and which didn't. Also: the post action
must use the same confirm treatment everywhere it appears — right now the
review drawer fires immediately while the agents panel wraps it in a confirm,
and the drawer is the surface that gets demoed.
```

### 7 — the autonomy ladder

```
Add a per-pattern autonomy level: observed, proposed, provisional, autonomous.
Each pattern records how many times it's been seen, the human agreement rate,
and its current sampling rate. Promotion requires evidence; DEMOTION IS
AUTOMATIC when the override rate rises above a threshold.

Some patterns are permanently excluded from climbing: ambiguous matches,
anything touching security-deposit accounts, and the final write. Model that
exclusion explicitly rather than by omission.

Build a screen that shows every pattern and its rung, with the sampling rate
rising as autonomy rises — that inversion is the point of the design.
```

### 8 — the quick contradictions

```
Fix these, each under an hour:
- One name per number. Retire "match rate"; the contract says "settled on its
  own". Right now four names describe two numbers across four surfaces.
- The drawer says "Approved"; the vocabulary says "Matched". Pick one.
- Label the confidence chip with the question it answers, or remove it.
- Move token counts off the accountant's dashboard; show cost in dollars
  per reconciliation instead.
- Give the two unclassified-file chips somewhere to go.
- Show an expected-document count in the draft state ("0 of 8 expected").
```

---

## Part 9 — The case study

### The spine

> I designed a reconciliation product for property accounting, then
> stress-tested my own model against how the domain and the engineering
> actually work. I found that my data contract couldn't express the reviewer's
> most important action, that my exception taxonomy collapsed "normal" and
> "broken" into one bucket, and that a transaction I'd modelled as an anomaly
> was a standard bank-fee pattern. Here's the revised contract, and here's how
> each change moved the interface.

A design with no holes is less impressive than one whose author found eight,
because the method is the transferable thing.

### Decisions worth telling

Fixed shape: the situation, the wrong version, what was wrong with it, the fix,
what it cost.

- **Identity is an output of intake, not an input.** The first pass drew a bank
  row the instant a file landed — identity before inspection.
- **The agent that disappeared.** Early docs list four; the build has three.
  Explaining a non-match is inseparable from matching.
- **A metric that can't flatter itself.** The first-pass rate is frozen at the
  machine's verdict, so a human cleaning up cannot improve it.
- **The bounced payment.** The headline. A routine event the design called a
  mystery.
- **Taking the AI out of matching.** Naming what you removed the AI from is
  rarer and more valuable than listing what you added it to.

### Interview answers

**"Is this actually built?"** — say it first, before they find it. "It's a
design prototype. The interface and state model are real, the automation is
simulated. I built it to work out the interaction contract between an
autonomous system and the person who signs the close. What I can show you is
the model behind it and the eight places it was wrong."

**"Why are the agents not really agents?"** — "They're not, and I'd now call it
a workflow with intelligent steps. The vaguer claim is what invited the
scepticism. Two of the four jobs shouldn't involve a model at all."

**"How do you know the matching is right?"** — "You can't know from the balance
— two wrong matches of equal amounts still net to zero. That's why matching
moved to deterministic rules: testable against a hand-reconciled month, and
'why did these match' has an auditable answer. The measurement that matters is
override rate over time."

**"Your match rate is 96%. Where's that from?"** — don't defend it. "Illustrative
seed data, and above what the incumbent achieves — Yardi's own auto-reconciliation
is 60–80% after tuning. I've since built a fixture month I reconciled by hand so
I can quote a real number."

**"Shouldn't the AI eventually do all of it?"** — "You can remove the second
human but not the second party. An AI can't be accountable, and someone has to
answer 'who signed this'. And the trade is bad: the approval click takes fifteen
seconds; removing it costs the audit answer, the last place errors surface, and
the sale to anyone with an auditor."

**"What did you get wrong?"** — the best question. Have three ready: the
two-bucket taxonomy, the match with only one side, the bounced payment treated
as an anomaly.

**"How much of this did AI write?"** — answer plainly, then demonstrate
ownership by explaining something hard unprompted.

### What not to claim

- Don't say it posts to Yardi. Say the posting layer is a swappable port
  because Voyager credentials weren't available — true, and shows you
  understand coupling.
- Don't cite a framework you haven't read.
- Don't claim a number without a source.
- Don't present a collaborator's commits as yours.

---

## Part 10 — The walkthrough

### The arc

1. **The job, in thirty seconds.** Not "we reconcile bank statements" — "at
   month end the bank's record and the books disagree, and somebody has to
   explain every difference before the month can close."
2. **One real statement.** Open the BAI2 file. This separates you from every
   designer who invented their data.
3. **The run, unattended.** Reading, matching. Say out loud that matching
   involves no model, and why.
4. **The exception that needs you.** The ambiguous refund — and picking one
   changes what next month starts with.
5. **The bounced payment.** Three lines, one event, nets to zero. Let it
   breathe; this is the moment that lands.
6. **The proof.** The ladder reaching zero. "This is the only screen anyone
   signs."
7. **The signature.** Fifteen seconds. Say why it stays.
8. **The ladder.** How a pattern earns autonomy and loses it automatically.
   Close here — strongest idea.

### Recording notes

- Record from a clean commit; confirm the build passes.
- Record at 1440px or wider — at 1024px the workspace shows only the core.
- Disable the dev indicator or record a production build.
- Keep the tab visible; hidden tabs throttle timers and slow the cadence ~3×.
- Not-started property for the lifecycle; Westlake for the exception deep-dive.
- Vary seeded session counts — identical numbers read as generated data.
- Hold a row a full second for hover isolation; capture the undo toast.
- 2× DPR, 1920×1080 or 2560×1440 at 60fps.
- Record narration separately and cut the screen to it.
- Say "mocked integration" out loud when Yardi appears.

---

## Part 11 — Order of work

1. **Reconcile the fixture by hand.** One hour. Makes the knowledge yours.
2. **Fix the git attribution.** Ten minutes.
3. **Fix the 96% claim.**
4. **The match object** (prompt 1). Unlocks gaps 2, 3, 5.
5. **The balance proof screen** (prompt 2). Highest-value addition.
6. **Resolution actions and the bounced payment** (prompts 3, 4). The demo's
   emotional centre.
7. **Carry-forward and periods** (prompt 5). Deepest change; do before
   recording.
8. **Posting failure states** (prompt 6). Quick; removes a visible
   self-contradiction.
9. **The autonomy ladder** (prompt 7). Strongest original idea — give it a
   screen.
10. **The quick contradictions** (prompt 8). An afternoon.
11. **Write the case study** — only now, only in your own words.
12. **Rehearse the hard questions out loud** before recording.

---

## Sources

- [Yardi bank reconciliation troubleshooting guide — BC Solutions](https://www.bcsolut.com/resources/yardi-bank-reconciliation-troubleshooting-guide) — three-column model, BAI2 as primary format, 60–80% auto-clear, reconciling item types
- [Electronic bank statement formats — Ordway](https://ordwaylabs.com/blog/electronic-bank-statement-formats/) — BAI2 record types, MT940 tags, camt family
- [BAI2 file format: records, codes and validation](https://invoicedataextraction.com/blog/bai2-file-format) — field order, implied decimals, code ranges
- [BAI file format — Wikipedia](https://en.wikipedia.org/wiki/BAI_(file_format)) — history, ASC X9 stewardship
- [Bank statement formats compared — Gravam](https://gravam.com/blog/bank-statement-formats-mt940-camt053-bai2) — adoption, migration direction, per-bank variation
- [BAI codes — Goldman Sachs Developer](https://developer.gs.com/docs/services/transaction-banking/bai-codes/) — type code meanings
- [BAI2 type code reference — JA Technology Solutions](https://jatechnologysolutions.com/tools/bai2-type-code-reference/) — code list, proprietary 9xx ranges
