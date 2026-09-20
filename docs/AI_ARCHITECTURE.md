# Agent and AI architecture

Working document, revised 20 September 2026. Replaces the four-job roster in
`docs/teardown/04-where-agents-belong` and `RECONCILER_PLAYBOOK.md` Part 4.

A styled version exists as a published page. This file is the full text.

Depends on `docs/TAXONOMY_AND_IA.md` for the objects and
`docs/FLOWS.md` for the state machine.

**Revision note.** The 19 September version of this file described the Reader as
a model with a grader, and the pattern proposer as a model that runs on every
unpaired row. Both were wrong and both are corrected below. It also had no
harness layer at all, which turned out to be the largest part of the system.

---

## Part 1 — Three layers

Most people draw an AI product as a row of agents. That is not what this is.

| Layer | What it is | Size |
|---|---|---|
| **The model** | Called by a job. Trusted by no job on its own | smallest |
| **The jobs** | The five steps that produce the output | where the work is |
| **The harness** | Everything that makes running it safe | largest |

### The harness, named

This layer was doing the most work and had no name, which is why it kept
leaking into other documents as "and also we record...". It is:

- **The state machine and its guards.** Fourteen states. Unexplained must be
  exactly 0.00 before anything can be proved. Nothing posts into a closed
  period. A person signs; the system never does.
- **The run record.** Which documents came in and a fingerprint proving they
  were not swapped. Which rules were active and at which version. Which model
  and prompt version ran, where one ran at all. Every suggestion the model
  made and whether a person accepted it. Every human action with a name and a
  time. Every send attempt and its result.
- **Idempotency and recovery.** A tag on every posted entry so a retry cannot
  duplicate it. Partial sends, failures and reversals as real states.
- **The freeze at signing.** An immutable snapshot of everything above, taken
  at the moment a person accepts responsibility.
- **Scheduling.** Periods open, reconciliations get created, documents bind,
  runs start. Nobody clicks to make work exist.
- **The Reader's recovery loop.** Read, grade, and on failure pick a different
  strategy or escalate with a specific ask.

**The sentence this layer earns:** the model is the smallest layer, the harness
is the largest, and the jobs are where the work is. That is not an apology. It
is what a reliable AI product looks like drawn honestly.

---

## Part 2 — What is actually agentic

An agentic loop is *decide → act → observe → decide again*, with a stopping
condition. This product has exactly two, and neither of them is the pipeline.

1. **The Reader's recovery loop.** Read the document, grade the read against
   the document's own control totals, and on failure choose a different
   strategy and try again. Stops on a pass or an escalation.
2. **The knowledge loop.** A correction becomes a proposed rule, previewed
   against last month, conflict-checked, approved, then measured every cycle
   and promoted or demoted on the evidence.

Everything else is a pipeline: fixed input, fixed output, fixed successor.
Saying so is the credible answer, and it is rarer than a diagram with four
robots on it.

The second loop is where most of the remaining design value sits, because it is
the only place a model does something no rule can do.

---

## Part 3 — The placement method

> **The model never decides what is true. It decides what to read, and what to
> say.**

| Question | If yes |
|---|---|
| Must two runs on the same input give the identical answer? | **rules** |
| Does the output get signed, or land in the accounting system? | **rules** |
| Is the input messy — a scan, a layout nobody agreed on, free text? | **model** |
| Is the output a sentence written for a person to read? | **model** |

The model sits at the two edges. Everything in the middle that touches money is
rules. This is the part that transfers to any workflow.

---

## Part 4 — The roster

### 1 · Reader — **a router, not a model**

**In:** a statement file and a ledger export.
**Out:** clean rows, plus a resolved identity for each document.

The previous version of this file said a model reads the documents. That is
wrong for the format this product is built around, and the numbers say so.

BAI2 is a fixed-format flat file maintained by ASC X9. Numbered record types,
delimited fields, published code bands. A parser reads it exactly.

| | Parser | Model |
|---|---|---|
| Calls | 0 | 1 or more |
| Cost per run | ~0 | recurring |
| Time | milliseconds | seconds |
| Same answer twice | always | not guaranteed |
| Accuracy on a well-formed file | exact | high, not certain |
| Failure states to design | 1 | 5 |

The fixture proves it: `src/lib/fixtures/westlakeOperating.ts` was transcribed by
hand and `verifyFixture()` checks all six control totals by arithmetic. No model
touched any of it.

**So the Reader routes by format:**

| Input | Path |
|---|---|
| BAI2, camt.053, MT940 | deterministic parser · **no model** |
| PDF, arbitrary CSV, scanned page | model · **fallback only** |
| Both | **the same grader** |

**The grader — the document marks its own homework.** Every statement prints its
own opening balance, closing balance and control totals. The extracted rows must
reproduce them exactly. If they do not, the read failed and the run stops rather
than reconcile against half a statement. This costs nothing, because the answer
is printed on the input, and it applies to both paths — a parser can be wrong
about a malformed file just as a model can be wrong about a scan.

**Never** invents, corrects or tidies a figure it could not read.

#### The failure taxonomy

| Failure | How it is detected | What the person is asked |
|---|---|---|
| **Incomplete read** | Extracted totals ≠ declared control totals | Re-upload, or supply a different export format |
| **Unreadable line** | The line parses partially | Fill in the missing field; nothing is guessed |
| **Wrong period** | Statement period ≠ the reconciliation's period | Open the right period, or confirm a re-statement |
| **Wrong account** | Account number resolves elsewhere | Move the file to the account it belongs to |
| **Duplicate** | File fingerprint matches one already ingested | Discard, or confirm it supersedes the earlier one |

#### Identity resolution belongs here, and is not a model judgement

The account number on the statement, matched against the account registry.

| Result | State |
|---|---|
| Exactly one account matches | Bound |
| No account matches | **Unclassified** — offer to map the number, or create an account |
| More than one matches | Ambiguous. A person picks. Usually a setup error worth surfacing |

### 2 · Matcher — no model at all

**In:** the Reader's rows **and the account's open items carried forward.**
**Out:** `Match` objects carrying the rule and version that fired, and every
candidate considered and rejected with its reason.

Descends a written ladder: same amount same day → same amount within N days →
amount plus reference → one deposit against several rows summing to it.

**The input correction:** it takes three things, not two files. A cheque written
in May and presented in July is matched in July against an *open item on the
account*, not against a July ledger row. A Matcher that only sees this month's
files cannot clear a carried-forward item at all.

It also owns ageing and staleness, because both are arithmetic.

No model, because this is where being wrong costs money and where *why did these
match* needs an answer an auditor accepts. Being rules, it is **testable**
against a hand-reconciled month, which is the only honest source of an accuracy
number.

**Never** explains, and never guesses once the ladder is exhausted.

### 3 · Pattern layer — **known patterns are rules; the model proposes new ones**

The previous version of this file implied a model proposes the returned-payment
pattern on every run. It should not. Once a pattern is known, recognising it is
deterministic and belongs in the rule set.

**A known pattern is a rule.** The returned payment is: find a debit whose
description matches the return vocabulary, locate an earlier credit sharing the
reference, confirm that return + fee equals the original exactly, confirm the fee
line sits in a fee code band. Four checks, no model, same answer every time.

Applied to the fixture: a 1,275.00 credit on 3 May, a 1,200.00 return and a 75.00
fee on 20 May, sharing reference RP308. 1,200.00 + 75.00 = 1,275.00 exactly. Code
567 is Return Item Fee. Confirmed.

What it produces is the interesting part:
- The 3 May match **breaks**. The rent was not received, so its outcome moves
  from `matched` to `needs-adjustment`.
- Two book reconciling items are proposed: reverse the receipt, record the fee.
- The proof moves by −1,275.00 on the book side.
- **Tenant 308 now owes May rent.** That is a receivables fact, not a
  reconciliation fact. The product states it and hands it on.

**The model's job is finding candidates for patterns nobody has coded yet.** It
looks across unpaired rows, and across months, for groups that keep moving
together, and proposes one to a person. If the person agrees, it becomes a rule
with a confirming check, and from then on no model is involved in recognising it.

**Never** states a pattern the arithmetic could not confirm. An unconfirmed
proposal is shown as a guess and labelled as one.

### 4 · Candidate ranker — model, never confirmable

**In:** one ambiguous match with two or more candidates.
**Out:** a ranking and one sentence explaining the difference.

> "Both rows match the amount — but row 142 shares the payment reference and row
> 154 is three days closer."

A pattern can be checked by arithmetic. A ranking never can, because this queue
exists precisely because the system does not know. Keeping the two under one name
gave them one confidence number answering two incompatible questions, which is
gap 8 reappearing above the data. Split, the taxonomy explains itself: **the
pattern layer can climb the autonomy ladder; the ranker is a permanent
exclusion.**

**Never** moves an item, changes a status, or touches the balance proof.

### 5 · Poster — no model at all

**In:** the authorised resolutions.
**Out:** correcting journal entries and cleared marks, sent one at a time, each
carrying an idempotency key.

Handles partial completion, failure and reversal. Supports a visible undo.

**The most consequential step in the product is the least intelligent, and those
two facts are related.**

**Never** decides what to send.

### Not a job: the sampler

An earlier draft listed spot-check selection as a sixth job. It is not one. Its
whole contribution is choosing which already-approved items a person should look
at, and a rule does that:

```
5% at random
+ every item over a value threshold
+ everything decided by a pattern promoted in the last 60 days
```

A person does the looking, because a machine checking its own work finds nothing
it did not already believe. Demoting this from a job is the honest call, and it
loses nothing.

---

## Part 5 — How often a model actually runs

Worth stating plainly, because it is the strongest number in the architecture.

| Job | Model runs when |
|---|---|
| Reader | the format is unstructured. **Never on BAI2** |
| Matcher | never |
| Pattern layer | a *new* candidate pattern is being proposed. **Never for known ones** |
| Candidate ranker | there is a genuinely ambiguous match |
| Poster | never |

**So a clean month, on a structured statement, with only known patterns, uses no
model at all.** The model appears exactly when something is novel or genuinely
ambiguous — which is the only place it is the right tool.

---

## Part 6 — The authority table

| Job | Model | May | May never |
|---|---|---|---|
| Reader | fallback only | Route, extract, propose an identity | Invent, correct or tidy a figure it could not read |
| Matcher | **no** | Pair, age, classify | Explain, or guess when the ladder is exhausted |
| Pattern layer | new candidates only | Propose and name a pattern | Assert one without a confirming check |
| Candidate ranker | yes | Rank, write the reason | Move an item, change a status, touch the proof |
| Poster | **no** | Send, retry, reverse | Decide what to send |

---

## Part 7 — Rules, patterns, guardrails and prompts

Four different things, routinely collapsed into one.

| | What it is | Owner | Changes in | Testable |
|---|---|---|---|---|
| **Rule** | Pair these rows. Recognise this known pattern | Customer or team, scoped | Minutes | Yes |
| **Pattern** | A named situation, once it has a confirming check | Team | A release | Yes |
| **Guardrail** | Never do that | Team only | A release | Yes |
| **Prompt** | The wording given to a model | Team only | A release | No |

**Rules are data. Patterns are product. Guardrails are law. Prompts are code.**

### Guardrails are counted differently, and this matters

A matching rule that fired 1,842 times **worked** 1,842 times. A guardrail that
fired 3 times **blocked** three attempts to do something forbidden.

Those are opposite kinds of event. They must never share a column or a word. A
matching rule's count is a performance figure; a guardrail's count is closer to
an incident log, and three blocks is something to investigate rather than
celebrate. Surface them as **"blocked 3 attempts"**, with a way to see them.

This is gap 8 one level up again: one number, two meanings.

### A customer may never edit a prompt

The moment a person's edit changes a model's instructions, nobody can say why the
system behaved differently last Tuesday. Guardrails belong in code — *never post
into a closed period*, *never auto-approve above $500*, *never create an entry
without a reason* — because a prompt shapes behaviour while a guardrail prevents
an outcome.

### The knowledge base has to change shape

It currently holds prose:

> "Tenant ACH returns for unit 308 are a known recurring issue with broken
> auto-pay. Approve manually." — `seed.ts:766`
> "Refunds under $250 are routine. Auto-approve and skip the ambiguity check."
> — `seed.ts:778`

Both are prompts wearing a rule's clothes. The first tells the books a tenant
paid when they did not. The second disables the exact safeguard beat 4 depends
on, because both refund candidates in the fixture are $210.

A rule becomes structured: **scope · condition · action · owner · created ·
expires**. Which makes it previewable, versionable and measurable.

### A rule has a life

```
proposed -> previewed against last month -> conflict-checked -> approved
  -> active (scoped, dated, owned, expiring) -> measured every cycle
  -> promoted, or retired
```

Overridden often means wrong. Stopped firing means dead. And the loop runs both
ways: *"the rule you approved in April has matched 31 items since, and been
overridden twice."*

---

## Part 8 — The autonomy ladder

Individual **patterns** climb four rungs on evidence.

| Rung | Who decides | Sampling |
|---|---|---|
| 1 · Watched | Human, every time | — |
| 2 · Suggested | System suggests, human confirms | every item |
| 3 · Trial | System decides, human reviews after | heavy |
| 4 · On its own | System decides | fixed rate, forever |

- **Demotion is automatic** when the override rate rises. Nobody is asked.
- **Sampling rises as autonomy rises.** Whatever is automated stops being
  watched, and two wrong matches of equal amounts still net to zero.
- **Three things never climb:** ambiguous matches (the ranker's entire output),
  anything touching a security-deposit account, and the final write.

### The three kinds of human involvement

- **Decide** — cannot be replaced, by definition. Can be assisted heavily.
- **Authorise** — cannot be replaced, for accountability not capability.
- **Sample** — must *grow* as autonomy grows. A rule picks what to look at; a
  person does the looking.

---

## Part 9 — What the AI was taken out of

Three of five jobs have no model in them. On the format this product is actually
built for, with patterns it already knows, **the number of model calls in a clean
month is zero.**

The model is there for exactly two things: reading a document nobody standardised,
and writing the sentence that separates two answers a person has to choose
between.

> The strongest thing you can say about an AI product is which part you took the
> AI out of, and why. Almost nobody says it.

---

## Open

- **Lane naming on screen.** Reading · Pairing · Checking · Sending is four lanes
  over five jobs. Leaning four, because the split is a design fact rather than a
  user-facing one.
- **Does the Reader's recovery loop get a visible surface**, or only its final
  state? A retry storm hidden inside a spinner is the classic failure.
- **Where the per-bank code dictionary is administered.** Phase 9.
- **How a rule's own observability is surfaced** — where a reader sees that the
  rule they added is working.
