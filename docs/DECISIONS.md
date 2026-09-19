# Decisions

Working document, 19 September 2026. Settles every question the four specs left
open, and records why. A question that has been answered somewhere in a commit
message but nowhere in a document gets re-asked, so this is the place it stops.

Eleven questions were open across `UX_SPECS.md`, `FLOWS.md`,
`TAXONOMY_AND_IA.md` and `AI_ARCHITECTURE.md`. Five were already answered by
what got built and only needed writing down. Six needed deciding.

Where a spec carried a leaning, the leaning is named and either followed or
overruled explicitly. None of them was overruled.

---

## 1 — Four lanes over five jobs

> *UX_SPECS, AI_ARCHITECTURE. Leaning: four.*

**Four.** Reading · Pairing · Checking · Sending.

The five jobs are the Reader, the Matcher, the pattern proposer, the candidate
ranker and the Poster. The proposer and the ranker share the Checking lane.

The split between those two is real and load-bearing — a pattern can be confirmed
by arithmetic and a candidate ranking never can, which is why one may climb the
autonomy ladder and the other is a permanent exclusion. But that is a fact about
how the system is built, not about what the person in front of it is doing. They
are watching one thing happen: the machine deciding what it could not pair.

Five lanes would put an internal boundary on screen and invite the question
"what is the difference?", to which the honest answer is a paragraph about
confirmability that changes nothing they do next.

**Where it lives:** `ReconcileCanvas.tsx`, the lane strip.

---

## 2 — Does the Reader's retry loop get a visible surface?

> *UX_SPECS, AI_ARCHITECTURE. No leaning stated.*

**Yes, and it gets its own beat.**

A retry storm hidden inside a spinner is the classic agent-observability
failure, and this is the one place the product uses a model on something that
lands in the books.

So reading is two beats, not one. The Reader extracts rows, then grades them
against the totals the statement declares in its own header, and the screen
states the grade with its figures: the file declares 49,585.60 in six credits
and 33,005.50 in eight debits, closing at 301,980.10, and the extracted rows
reproduce all five. Had they not, the run would have stopped there.

That check is what makes model-based document reading acceptable in an
accounting product, and it costs nothing because the answer is printed on the
input. Hiding it would be hiding the argument.

**Not built:** the loop's intermediate attempts. The prototype has no parser, so
there is nothing to retry. What is designed is the surface the grade occupies;
a real Reader's second and third strategies would appear in the same place.

**Where it lives:** `ReconcileRun.tsx`, the grading phase.

---

## 3 — Where is the per-bank code dictionary administered?

> *AI_ARCHITECTURE. Leaning: the account record.*

**On the account.** Followed.

Type codes are not fully standard — banks publish proprietary ranges, especially
in the 900s — so "code 555 means a returned deposit" is a mapping that belongs
to a bank and not to the format. The Accounts screen shows the nine codes this
account's statements actually used, their bands, how often each appeared, and a
version.

It is built from the fixture's own lines rather than a constant, so the
dictionary and the statement it describes cannot disagree.

**Where it lives:** `lib/accounts.ts` `codeDictionary`, rendered on
`AccountsCanvas.tsx`.

---

## 4 — Where does a close package live?

> *TAXONOMY_AND_IA. Leaning: a grouping inside Close.*

**A grouping inside Close.** Followed.

A close package counts; it never proves. Giving it its own surface would make it
look like a thing you work on, and the thing you work on is an account. It
appears as the folded "By property" section, rendering one chip per account and
a count, never a badge.

**Where it lives:** `CloseCanvas.tsx`, the By property section.

---

## 5 — How is a rule's own observability surfaced?

> *AI_ARCHITECTURE. No leaning stated.*

**On the rule, and on Quality.**

Every rule row carries how many times it fired and how often somebody overrode
it, with the override rate printed once there are at least five firings — below
that a rate is a number that will be believed far past what it can support.

The rules list is sorted worst first, so the ones most likely to be wrong are
the ones a reader meets. And Quality's override measure opens into a breakdown
by rule, because a portfolio rate is volume-weighted and can sit under one
percent while a single rule is wrong nearly half the time.

**Not built:** the loop running the other way — "the rule you approved in April
has matched 31 items since, and been overridden twice." It needs a history this
prototype does not have.

**Where it lives:** `RuleRow.tsx`, `RulesCanvas.tsx`, `QualityCanvas.tsx`.

---

## 6 — Can a person sign a reconciliation they prepared?

> *FLOWS. Leaning: yes, and worth stating on the screen.*

**Yes, and it is now stated on the screen.** Followed.

The control that matters in accounting is that whoever prepared the work is not
whoever approves it. That is not a headcount rule. AI prepares, a person
approves, and it satisfies the control better than two people would, because the
preparer's every step is recorded and replayable.

So the answer to "did you prepare this?" is no — the machine did. The screen
says so where somebody is about to put their name to it, rather than leaving the
reader to reconstruct the argument.

**Where it lives:** `ReconcileCanvas.tsx`, the "Who did what" panel.

---

## 7 — Does the balance proof get its own address?

> *UX_SPECS, TAXONOMY_AND_IA. Leaning: no route until something needs to link
> to it.*

**No route.** Followed, and the scaffolding route has been deleted.

The proof is the settled state of Reconcile. Nothing needs to link to it
separately: Close links to an account, the account opens Reconcile, and when the
month is proven that screen's middle becomes the proof.

`/proof` existed as a working surface while the Reconcile screen still ran on
three agents and could not show a proof at all. That stopped being true, and a
route that exists because of how the build went rather than because of what the
product needs is exactly the kind of thing that quietly becomes permanent. It is
gone, along with its design-review toggle, which was never product chrome.

**If this reverses:** the thing that would justify a route is a close package
wanting to link to one specific account's proof for an auditor. That is a real
future need and it does not exist yet.

---

## 8 — Does the spot check queue interrupt, or wait?

> *UX_SPECS, FLOWS. No leaning, and a warning: a queue you can always put off is
> a queue that never happens.*

**It waits, and it ages in the open.**

The warning is right and an interrupt is still the wrong instrument.

Blocking somebody from closing a month until they have sampled makes sampling
the thing standing between them and their deadline, and the first workaround
anybody finds is to click through it. Worse, an interrupt lands mid-decision on
a real exception, which is where their attention is worth most and where
breaking it is most expensive.

So the pressure is a number rather than a modal. The Close screen shows the
queue with how long it has been waiting, and that figure grows. A count that is
getting worse and has somebody's name on it is what works on a professional; a
dialog is what they learn to dismiss.

**The honest risk:** this is the softer answer, and if sampling turns out not to
happen, the escalation to try next is making the close confirm state how many
checks are outstanding — naming it at the moment of signing without blocking the
signature.

**Where it lives:** `lib/sampling.ts` `queuedSince`, `CloseCanvas.tsx` spot
check section.

---

## 9 — How many runs does the interface show?

> *TAXONOMY_AND_IA. Undecided.*

**All of them, with only the last signable.**

A reconciliation can be attempted several times — mid-month against a partial
statement, then again when the final one lands. Silently superseding the earlier
attempts would destroy the meaning of the first-pass figure, which is frozen at
the machine's verdict: frozen at *which* verdict?

A figure that moved between attempts is also the thing somebody asks about in
six months. "The machine got 2,900.60 on the partial statement and 2,900.60
again on the final one" is a different fact from either number alone, and it is
the fact that says the partial statement was not the problem.

Superseded runs are shown quieter and labelled as superseded. Only the last can
be signed.

**Where it lives:** `ReconcileCanvas.tsx`, the run list in "Who did what".

---

## 10 — Does `blocked` live on the reconciliation, or on the document?

> *FLOWS. Leaning: on the document, with the reconciliation reporting the worst
> state of its documents.*

**On the document.** Followed.

A statement can be perfectly fine while the ledger export is the wrong period. A
reconciliation carrying one `blocked` flag cannot say which of its two inputs is
the problem, and that is the difference between a person knowing to re-export
from Yardi and a person re-uploading the bank file for no reason.

It matters for recovery too. `blocked` clears when a new document arrives, and a
document is the thing that arrives; a flag on the reconciliation would have to be
cleared by guessing which upload was meant to fix it.

The reconciliation's reading state is derived from its documents, worst wins. One
blocked file blocks the run, because reconciling against half a statement is
what the Reader's grade exists to prevent.

**Where it lives:** `lib/session/types.ts`, `ReconciliationDocument` and
`readingStateOf`.

---

## 11 — What happens when nobody acts?

> *FLOWS and TAXONOMY_AND_IA, listed in both. Ageing, nudging and escalating
> named as part of the workflow.*

**Ageing, not escalating, and the deadline does the work.**

Escalation needs somebody to escalate to, and this product has one person in it.
Deliberately: there are no roles, no permissions matrix and no second human, and
inventing a notification layer to carry a nudge nobody receives would be a
feature that cannot be shown working.

What is computable and useful is the deadline. An account that has been waiting
longer than the days left before the lock is on course to miss the close, and
the Close screen says so in those words, with a count. Every row already carries
how long it has been waiting, which is the measurement the old "updated 4h ago"
column was failing to make.

**Not built:** notifications, reminders, and anything that reaches a person who
is not looking at the screen. Those need a delivery channel and a second party,
and both are out of this product's scope.

**Where it lives:** `lib/close.ts` `atRiskOfMissingClose`, `CloseCanvas.tsx`
headline.

---

## What is still genuinely open

Not questions the specs asked, but things this build deliberately left:

- **The Reader's intermediate retries.** Designed for, not built, because there
  is no parser to fail.
- **A rule's observability running backwards** — telling somebody what the rule
  they approved has done since. Needs months of history.
- **Trust accounting.** Security-deposit accounts are scoped out of v1 and the
  product says so on the account rather than pretending otherwise.
- **Anything reaching a person who is not on the screen.** See decision 11.
