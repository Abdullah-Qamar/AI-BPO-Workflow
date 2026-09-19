# Agent and AI architecture

Working document, 19 September 2026. Revises the four-job roster in
`docs/teardown/04-where-agents-belong` and `RECONCILER_PLAYBOOK.md` Part 4 into
something specified tightly enough to design screens against.

A styled version with diagrams exists as a published page; this file is the
canonical text.

Depends on `docs/TAXONOMY_AND_IA.md`, which settles the unit of work, retires
roles in favour of one human, and specifies what actually gets posted.

---

## Part 1 — The honest frame

**This is a workflow with intelligent steps, not a team of agents.** Nothing in
the roster below plans, selects its own tools, or decides what to do next. Each
job has a fixed input, a fixed output and a fixed successor. Saying so is not a
concession — it is the strongest available claim, because the vaguer version is
what invites the sceptical question.

### But two things here genuinely are agentic, and they are where the design should go

An agentic loop is *decide → act → observe the result → decide again*, with a
termination condition. This product has exactly two:

1. **The Reader's recovery loop.** Read the document, grade the read against the
   document's own control totals, and on failure choose a different strategy and
   try again — different parse, different segmentation, or a specific request to
   a person. It terminates on a passing grade or an escalation.
2. **The knowledge loop.** A correction becomes a proposed rule, previewed
   against last month, approved, then measured every cycle and promoted or
   demoted on the evidence.

Everything else is a pipeline. **Naming which part of the system is agentic and
which is a state machine is the credible answer**, and it is rarer than a diagram
with four robots on it.

---

## Part 2 — The placement method

The reusable part, and the thing worth putting in a case study, because it works
on any workflow.

> **The model never decides what is true. It decides what to read, and what to
> say.**

Four questions place any step:

| Question | If yes |
|---|---|
| Must two runs on the same input give the identical answer? | **rules** |
| Does the output get signed, or land in the accounting system? | **rules** |
| Is the input messy — a scanned page, a layout nobody agreed on, free text? | **model** |
| Is the output a sentence written for a person to read? | **model** |

The model sits **at the edges** — where documents come in and where words go out
to a person. Everything that touches money is rules.

---

## Part 3 — The roster: five jobs, three without a model

The teardown proposes four. This is five, because the Explainer was doing two
incompatible jobs under one name. Each is named after **the kind of thinking it
does**, which is the only naming that survives a hard question.

### 1 · Reader — model, graded

**In:** a statement file (BAI2 today) and a ledger export.
**Out:** clean rows, *and a proposed identity for the document*.

A model earns this. There are roughly 8,900 US banks, a small owner is more
likely to bank with a local one, and no set of templates survives that.

**The guard — the document grades its own homework.** Every statement states its
opening balance, closing balance and control totals. The extracted rows must
reproduce them exactly. If they do not, the read failed and the run stops. This
is the design move that makes model-based document reading acceptable in an
accounting product, and it costs nothing, because the answer is printed on the
input.

**Never** invents, corrects or tidies a figure it could not read. An unreadable
line is reported as unreadable.

#### The failure taxonomy

"Totals do not reproduce, so stop" is one state. There are five, and each needs a
different route out for the person. This is missing from every existing document.

| Failure | How it is detected | What the person is asked |
|---|---|---|
| **Incomplete read** | Extracted totals ≠ declared control totals | Re-upload, or supply a different export format |
| **Unreadable line** | The line parses partially | Confirm or type the missing field; the run continues without inventing it |
| **Wrong period** | Statement period ≠ the reconciliation's period | Open the right period, or confirm this is a re-statement |
| **Wrong account** | Account number resolves to a different account | Re-route the file to the account it belongs to |
| **Duplicate** | File fingerprint matches one already ingested | Discard, or confirm this supersedes the earlier one |

#### Identity resolution belongs here

*Identity is an output of intake, not an input* is the project's best existing
decision, and nothing currently owns it. It is the Reader's second output, and it
is **deterministic, not a model judgement**: the account number carried on the
statement is matched against the account registry in the standing world.

| Result | State |
|---|---|
| Exactly one account matches | Bound. The document is now "1849 Westlake · Operating · May 2026" |
| No account matches | **Unclassified** — the state the two inert file chips have been waiting for. Offer: map this account number to an existing account, or create one |
| More than one matches | Ambiguous. A person picks. Rare, and usually a setup error worth surfacing |

### 2 · Matcher — no model at all

**In:** the Reader's rows **and the account's open items carried forward.**
**Out:** `Match` objects, each carrying the rule and version that fired, and the
candidates considered and rejected with reasons.

Pairs by descending a written rule ladder: same amount same day → same amount
within N days → amount plus reference → one deposit against several rows summing
to it.

**The input correction that matters.** The teardown describes the Matcher as
taking two files. It takes three things. Cheque 1042 is written in May and
presented in July; in July it is matched against an *open item on the account*,
not against a July ledger row — the ledger row is four months old and already
accounted for. A Matcher that only sees this month's two files cannot clear a
carried-forward item at all, which is gap 6 showing up as a missing input.

**The Matcher also owns ageing and staleness**, because both are arithmetic:
age = period end − item date, stale = age > 90 days.

No model, because this is where being wrong costs money and where *why did these
match* must have an answer an auditor accepts. A rule gives that answer. And
because it is rules, it is **testable** against a hand-reconciled month, which is
where an honest accuracy number comes from.

### 3 · Pattern proposer — model, confirmable

**In:** everything the Matcher could not pair.
**Out:** a named pattern over a group of lines, marked confirmed or unconfirmed.

Proposes that several lines are one story. The returned payment first: find a
debit whose description suggests a return, locate the original deposit earlier in
the period, and confirm that return + fee equals the original.

**Confirmed** — present the three lines as one linked event that nets to zero,
noting that the tenant now owes rent.
**Unconfirmed** — present it as a guess, and say so.

The confirmation is deterministic, which is the whole point: **a model proposes,
arithmetic asserts.** That property is also what lets a pattern climb the
autonomy ladder.

### 4 · Candidate ranker — model, never confirmable

**In:** one ambiguous match with two or more candidates.
**Out:** a ranking and one sentence explaining the difference.

> "Both rows match the amount — but row 142 shares the payment reference and row
> 154 is three days closer."

**Why this is split out of the Explainer.** A pattern can be checked; a candidate
ranking cannot, ever, by definition — this queue exists precisely because the
system does not know. Leaving both under one name gave them one confidence
number answering two incompatible questions, which is gap 8 reappearing one level
above the data. Split, the taxonomy explains itself: **the pattern proposer can
climb the autonomy ladder; the ranker is a permanent exclusion.**

**Never** moves an item, changes a status, or touches the balance proof. Its
entire contribution is the middle sentence — and that sentence is what makes the
person's decision take two seconds instead of two minutes.

### 5 · Poster — no model at all

**In:** the authorised resolutions.
**Out:** correcting journal entries and cleared marks, sent one at a time, each
carrying an idempotency key.

Handles partial completion, failure, and reversal. Supports a visible undo.

Nothing here is a judgement. **The most consequential step in the product is the
least intelligent, and those two facts are related.**

---

## Part 4 — The authority table

One row per job. The right-hand column is the one that matters.

| Job | Model? | May | May never |
|---|---|---|---|
| Reader | yes, graded | Extract rows, propose an identity | Invent, correct or tidy a figure it could not read |
| Matcher | **no** | Pair, age, classify into the five outcomes | Explain, or guess when the ladder is exhausted |
| Pattern proposer | yes | Propose and name a pattern | Assert one without a confirming check |
| Candidate ranker | yes | Rank candidates, write the reason | Move an item, change a status, touch the proof |
| Poster | **no** | Send, retry, reverse | Decide what to send |

---

## Part 5 — Rules, patterns and prompts

Three different things, routinely collapsed into one, with three different
owners.

| | What it is | Owner | Changes in | Testable |
|---|---|---|---|---|
| **Rule** | A deterministic instruction: pair these rows, never do that | Customer or team, scoped | Minutes | Yes |
| **Pattern** | A named situation across several lines, confirmed by a check | Team | A release | Yes |
| **Prompt** | The instruction given to a model | Team only | A release | No |

**Rules are data. Patterns are product. Prompts are code.**

The consequence: **a customer may never edit a prompt.** The moment a user's
correction changes a prompt, nobody can say why the system behaved differently
last Tuesday. Guardrails belong in code — *never post into a closed period*,
*never auto-approve above $500*, *never create an entry without a reason* —
because a prompt shapes behaviour while a guardrail prevents an outcome.

### The knowledge base has to change shape

It currently holds prose:

> "Tenant ACH returns for unit 308 are a known recurring issue with broken
> auto-pay. Approve manually." — `seed.ts:766`
> "Refunds under $250 are routine. Auto-approve and skip the ambiguity check."
> — `seed.ts:778`

Both are prompts wearing a rule's clothes. The first tells the books a tenant
paid when they did not. The second disables the exact safeguard the walkthrough's
fourth beat is built on, because both refund candidates in the fixture are $210.
Neither can be tested, previewed, or used to reconstruct a past decision.

A rule becomes structured: **scope · condition · action · owner · created ·
expires**. Which makes it previewable before approval — *"this would have changed
14 items last month, worth $3,120"* — versionable, and measurable afterwards.

### A rule has a life, not just a birth

```
proposed -> previewed against last month -> approved -> active (scoped, dated,
owned, expiring) -> measured every cycle -> promoted, or retired
```

Overridden often means wrong. Stopped firing means dead. And the loop runs both
ways: *"the rule you approved in April has matched 31 items since, and been
overridden twice."*

---

## Part 6 — The autonomy ladder

Autonomy is not one dial on the system. Individual **patterns** climb four rungs
on evidence.

| Rung | Who decides | Human involvement | Sampling |
|---|---|---|---|
| 1 · Observed | Human, every time | Decides | — system only watches and counts |
| 2 · Proposed | System suggests | Confirms or overrides; agreement measured | every item |
| 3 · Provisional | System | Reviews afterwards | heavy |
| 4 · Autonomous | System | — | fixed rate, forever |

Three things make it safe:

- **Demotion is automatic.** A pattern whose override rate rises falls back a
  rung by itself. This is what separates earning autonomy from drifting into it.
- **Sampling rises as autonomy rises**, not falls. The pattern you automate is
  the pattern that stops being watched, and two wrong matches of equal amounts
  still net to zero — so the proof reaches zero while the month is wrong.
- **Some things never climb**, and naming them is what makes the rest credible:

| Permanent exclusion | Why |
|---|---|
| Ambiguous matches — the candidate ranker's whole output | By definition the system does not know |
| Anything touching a security-deposit account | Legally segregated funds |
| The final write | Someone has to answer "who signed this" |

### What the human does at each rung

The three kinds of involvement from `TAXONOMY_AND_IA.md` Part 5 are not equally
replaceable, and conflating them is the mistake:

- **Decide** — cannot be replaced, by definition; this queue only holds things
  the system said it did not know. Can be *assisted* enormously: rank, explain,
  pre-select. Every decision here is training data, and rung 2 is where it is
  counted.
- **Authorise** — cannot be replaced, for accountability rather than capability.
  Can be assisted by making the consequence plain: here is exactly what will be
  written, here is the undo.
- **Sample** — must *grow* as autonomy grows. A model may choose what to sample,
  biasing toward newly-promoted patterns, large amounts and unusual accounts. A
  human must do the looking, because a machine checking its own work finds
  nothing it did not already believe.

---

## Part 7 — What the AI was taken out of

The shape of the answer, and the line to close an interview on.

You start with three agents doing everything. You end with a model at each edge
— one reading documents nobody can template, one writing the sentences that make
a queue manageable, one proposing explanations that arithmetic then confirms —
and **rules in the middle, where the money is**.

Three of five jobs have no model in them: the Matcher, the Poster, and identity
resolution inside the Reader.

> The strongest thing you can say about an AI product is which part you took the
> AI out of, and why. Almost nobody says it.

---

## Open

- **Lane naming on screen.** Reading · Matching · Reviewing · Posting are four
  lanes over five jobs — the pattern proposer and the ranker both sit in
  Reviewing. Whether the person sees four lanes or five is undecided; leaning
  four, because the split is a design fact, not a user-facing one.
- **Does the Reader's recovery loop get a visible surface**, or does the person
  only ever see its final state? A retry storm hidden inside a spinner is the
  classic agent-observability failure.
- **Where the per-bank code dictionary is administered.** Type codes vary by
  bank, especially in the 900s. The account record is probably right; it is
  phase 9.
- **How a rule's own observability is surfaced** — where a reader sees that the
  rule they added is working.
