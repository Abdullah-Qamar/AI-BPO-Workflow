# Taxonomy and information architecture

Working document, 19 September 2026. Settles the object model and the surface
map that `docs/RECONCILER_PLAYBOOK.md` Part 6 and `docs/teardown/05-system-model`
call for but do not specify.

A styled version with diagrams exists as a published page; this file is the
canonical text.

Read the playbook first for the domain. Read `docs/REBUILD_PLAN.md` for the order
of work. This file answers a narrower question: **what things exist, what each
screen is of, and what has to stop being called a session.**

---

## Part 1 — The correction

### The wrong version

`SessionState` holds one session per property per cycle, a `banks` map beneath
it, and a single `runState` across the whole thing. A session shows one status
and, at the end, one tied-out badge.

### Why it is wrong

**A session never ties out.** There is no such thing as proving that a property's
cash agrees. Each bank account proves separately, against its own statement, with
its own balance proof and its own unexplained figure. A badge above four accounts
can only ever be a summary pretending to be a proof, and the moment one account
is short the badge has to choose between lying and going red for the three that
are fine.

The teardown calls this the hierarchy bug. It is not a field that is missing. It
is the unit of work being wrong, which means every count, every status and every
headline number on every screen is currently attached to an object that cannot
carry them.

### The right version

**The unit of reconciliation is one bank account for one accounting period.**

The thing above it is a **close package** — a property for a period — which is a
container for tracking, not a thing that proves. It completes when all of its
accounts are proven, and it says "3 of 4 accounts proven", never a single badge.

```
Portfolio
  Property                       1849 Westlake
    Close package               1849 Westlake · May 2026        3 of 4 proven
      Reconciliation            Operating · May 2026            proven · 0.00
      Reconciliation            Security deposit · May 2026     proven · 0.00
      Reconciliation            Reserve · May 2026              proven · 0.00
      Reconciliation            Escrow · May 2026               open · unexplained
```

Only the operating account exists in the fixture; the three siblings are
illustrative and must be labelled as such wherever they appear.

Every figure in the product hangs off the third level. The second level counts.

### Why a property has several bank accounts

Each one is a separate account number at a bank, so **each one produces its own
statement** with its own opening and closing balance, and each one posts to its
own cash GL account in Yardi. They are never one file and never one ledger
column.

| Account | What it holds | Why it is separate |
|---|---|---|
| Operating | Day-to-day cash: rent in, vendors and payroll out | The working account |
| Security deposit | Tenants' deposits | Legally segregated in most US states; commingling with operating cash is unlawful |
| Reserve | Set aside for capital items — roof, boiler, plant | Usually required by the lender or the owner agreement |
| Escrow | Property taxes and insurance | Often held and controlled by the lender or servicer |

So a reconciliation compares **one statement against one cash GL account** —
`1010-000 Cash - Operating` in the fixture, with its siblings on their own codes.

**Four is not structural.** A small property may have one account; a large one
may have six, including a lockbox, a payroll account or a construction draw
account. The prototype's four is seed data. Nothing in the model may assume it.

---

## Part 2 — Two worlds

The single biggest structural correction after the unit of work: this design has
one tree and needs two. They have different lifespans and different edit
patterns, and mixing them is what makes products of this kind painful to build.

### The standing world — set up once, edited on events

| Object | Notes |
|---|---|
| Organisation | |
| Owner / portfolio | |
| Legal entity | The thing a period belongs to |
| Property | |
| **Bank account** | Belongs to a property and an entity. Carries its GL cash-account mapping, its bank, and its **open items**. Is *borrowed* by a reconciliation, never owned by one. |
| Bank | The institution, plus its **code dictionary** — administrator-owned, versioned, recorded against each run |
| Rule | Scoped to account / property / portfolio / global. Versioned, owned, dated, expiring |
| Pattern | Product-level. Carries an autonomy rung and its exclusions |

Edited on a refinance, a new escrow account, a property sold, a rule approved.
Rarely, deliberately, and with a record.

**There is no role object, and there will not be one.** See Part 6.

### The moving world — created each period, then frozen

| Object | Notes |
|---|---|
| Accounting period | Per entity. Has an **open / closed** state. A closed period cannot be posted into |
| **Reconciliation** | *The unit.* One account, one period |
| **Run** | One *attempt* at a reconciliation. A reconciliation can be run several times; only the last is signed |
| Close package | One property, one period. Aggregates reconciliations |
| Document | Statement or ledger export. Carries a fingerprint and a resolved identity |
| Statement line / ledger row | |
| Match | The object in `src/lib/reconciliation/match.ts` |
| Resolution | One of four actions, each of which moves the proof |
| Balance proof | Computed, never stored |
| Posting batch / posted entry | Each with an idempotency key |
| Run record | The permanent, replayable account of what happened |

Created fresh, then frozen forever as the record of what was decided and why.

---

## Part 3 — The two joints

This is the interesting part, and the part a one-tree model cannot express at
all. Exactly two things live in the standing world and are changed from the
moving world. Design these two carefully and the rest is bookkeeping.

### Joint 1 — Open items belong to the account

Cheque 1042 — Delta HVAC Services, $3,200.00, written 24 May — does not belong to
May. It belongs to the account, and May is merely the first period that had to
report it. It stays on the account, ageing, until it clears.

So a reconciliation **inherits** the account's open items, **ages** them, and on
close **hands the unresolved ones forward**. That is what turns this product from
"compare two files" into a running record per bank account, and it is the reason
carry-forward is the deepest change in `REBUILD_PLAN.md`.

```
Cheque 1042 · $3,200.00 · written 24 May 2026

  31 May 26   inherited: no        outstanding, age  7 days
  30 Jun 26   inherited: yes       outstanding, age 37 days
  31 Jul 26   inherited: yes       outstanding, age 68 days
  31 Aug 26   inherited: yes       STALE, age 99 days -> its own problem
```

1042 is real: it is one of the four open items that make up the fixture's
outstanding total of 18,450.50 — cheques 1042 (3,200.00), 1051 (8,450.00) and
1055 (6,590.50), plus whichever 210.00 refund the reviewer does not pick. Note
that the playbook's ladder says "cheques not yet cleared (4)" while Part 7 says
"three uncleared cheques"; both are correct and the fourth item is the refund.
Say four **open items**, not four cheques.

The age is a property of the item on the account. No period computes it from
scratch, and no period may quietly drop it.

**A stale item is not a reconciliation problem.** The arithmetic is fine — the
proof still ties. It is an operations problem: a cheque written three months ago
that the payee never presented. Three actions, and two of them write to the
ledger:

| Action | Writes to the ledger |
|---|---|
| Chase the payee | no |
| Void and reissue | yes — cancel 1042, raise a replacement |
| Write back | yes — a journal entry reversing the cheque, returning the cash |

It surfaces in two places doing two jobs: on the **reconciliation** it is one of
the outstanding items reducing the bank side of the proof; on the **account** it
lives permanently, ageing, until it clears or is written back.

### Joint 2 — Rules and patterns are read by every run and changed by corrections

**A rule pairs two rows. A pattern explains a group of them.**

A rule is deterministic and testable — *same amount and same date*, *same amount
within three days*, *amount plus reference number*, *one deposit against several
ledger rows summing to it*. Guardrails are rules too: *never post into a closed
period*, *never auto-approve above $500*. Rules can be local to one property and
customer-owned.

A pattern is a named situation across several lines. The fixture's returned
payment is the example: a $1,275.00 rent credit on 3 May, a $1,200.00 return and
a $75.00 fee on 20 May, against one ledger row. The model *proposes* the pattern;
a deterministic check *confirms* it by finding the original and verifying that
return + fee equals it exactly. Only then is it stated as fact. Patterns are
universal and ship in a release.

**Rules are data. Patterns are product. Prompts are code.** The knowledge base
today holds prose — "refunds under $250 are routine, auto-approve" — which is a
prompt wearing a rule's clothes: untestable, unpreviewable, and unable to explain
why March behaved differently from April. It becomes structured: scope,
condition, action, owner, expiry.

A run **reads** the rules and patterns that were active at that moment and
records which version of each fired. A reviewer's correction **writes** back into
the standing world — but not directly, and not always to the same place.

One correction, four possible destinations:

| Destination | True for | Owner | Speed |
|---|---|---|---|
| A local rule | This property | Customer | Minutes |
| A pattern | Everyone | Team | A release |
| A test case | A labelled example of the system being wrong | Team | Permanent |
| An engineering change | Rare | Team | Reviewed |

Because the run records versions, a March decision stays explicable in September
even though the rules have changed six times since. That is the difference
between "the system says so" and "here is what happened".

---

## Part 4 — Vocabulary consequences

### Session is retired

`docs/design-system/decisions.md` §1 defines **Session** as "one reconciliation of
one property for one cycle". That definition is the hierarchy bug written into
the vocabulary contract, so the word goes.

| Retired | Replacement | Why |
|---|---|---|
| Session | **Reconciliation** (the unit: one account, one period) | An accounting word for an accounting object |
| — | **Close package** (one property, one period) | Names the container as a container |

"Session" is a software word. Nothing in the trade calls it that, and keeping it
required the product to have a unit that could not prove anything.

### Two collisions to settle

**1. Cycle versus Period.** `decisions.md` §1 says the accounting period is
**Cycle**, never Period. But the domain needs *period close*, *closed period*,
*a closed period cannot be posted into*, and *prior period* — and "closed cycle"
is not a phrase anyone in accounting uses.

> **Recommendation: Period wins.** Retire Cycle. The product has to speak about
> periods locking, and no synonym survives that sentence.

**2. Outstanding.** `decisions.md` §1 lists Outstanding as a *Never* — the
forbidden alternative to **Open** for the unresolved subset of exceptions.
`REBUILD_PLAN.md` Part 4 wants Outstanding as the primary word for
written-and-recorded-but-not-yet-cleared.

> **Resolution: both survive, with no concept losing its word.** Reserve
> **Outstanding** for the accounting sense — Yardi's own usage. Leave **Open**
> where it is for the unresolved subset of exceptions. Change that row's *Never*
> column from "Outstanding, Unmatched" to "Unresolved, Unmatched".

### Additions

Carried from `REBUILD_PLAN.md` Part 4 §4, unchanged: Unexplained · Proven ·
Outstanding · In transit · Book reconciling item · Bank reconciling item · Age.

---

## Part 5 — The five surfaces

The discipline: **one object, one question, one number.** A surface that cannot
answer all three is not a surface, it is a panel on one.

| Surface | Its object | The question it answers | Its one number |
|---|---|---|---|
| **Close** | Period × portfolio | What still has to happen before this period can close? | accounts proven / accounts due |
| **Reconcile** | One reconciliation | Is this account proven, and if not, what is stopping it? | **Unexplained** |
| **Accounts** | One bank account (standing) | What is still outstanding here, and how old is it? | age of the oldest open item |
| **Knowledge** | One rule, one pattern | What governs the machine, who owns it, is it still right? | override rate |
| **Assurance** | The run record, aggregated | Is it getting better or worse? | escaped errors |

### What changed from the current four

- **Dashboard becomes Close.** It stops being a metrics wall and becomes the
  asynchronous work surface: what is due, what is blocked, what is waiting on me,
  and the scheduled sample queue. The real job is twelve properties a month;
  the hub is a single-run theatre and cannot be the home screen.
- **Properties becomes Accounts.** The standing world, with each account's
  running record — open items and their age — as the primary content. This is
  where joint 1 lives, and gap 6 finally has a home.
- **Knowledge is promoted from a panel to a destination, and absorbs the
  autonomy ladder.** Rules have a lifecycle; patterns have a rung. Both are
  knowledge that governs how the machine decides, both have an owner, and both
  are measured by override rate. One place, two tabs. The argument is that
  *everything that changes how the machine decides lives in one place*.
- **AI Performance becomes Assurance**, rebuilt around override rate and escaped
  errors, in three units for three audiences. Tokens are an engineering drawer,
  not a headline.

### The agent roster is not an IA node

Reader, Matcher, Explainer, Poster are the mechanism *inside* Reconcile. They are
not destinations, not peers of Accounts, and not a panel that follows the user
around. A person navigates by the object they are working on, never by the part
of the machine that is working on it.

### The three kinds of involvement, placed

| Involvement | Where it happens |
|---|---|
| **Decide** — only the person can settle it | Reconcile · the exception queue |
| **Authorise** — the system decided; the person accepts consequences | Reconcile · the proof and the signature |
| **Sample** — checking work nobody flagged | Close · the sample queue; results land in Assurance |

Sampling needs a queue of its own or it will not happen, and without it the
escaped-error number has no source.

---

---

## Part 6 — One human, no roles

The teardown proposes four roles — preparer, approver, administrator, observer.
**We are not building them**, and the reason is better than "out of scope".

The control that matters in accounting is that the person who *prepares* the work
is not the person who *approves* it. That is not a headcount rule. **AI prepares,
human approves** satisfies it completely, and satisfies it better than two people
would, because the preparer's every step is recorded and replayable.

| Teardown role | What happens instead |
|---|---|
| Preparer | **The AI.** It reads, matches, explains, and proposes the correcting entries |
| Approver | **The human.** Always. One person, one signature |
| Administrator | Not a role — a *privileged action*. Changing a GL mapping silently changes where money lands, so it is recorded differently. The AI may propose a mapping; a person confirms it |
| Observer | Read-only access, not a role. Dropped |

**Why the approver cannot be an AI**, and it is not about capability: when an
auditor asks who signed this, the answer has to be a legal person who can be
asked why, and who carries the consequence. An AI cannot be accountable. You can
remove the second human; you cannot remove the second party.

So there is no role object in the standing world, no permissions matrix, and no
faked login. What the product records instead is a fact on every run: **what the
AI prepared, and who approved it.** That is the honest version, and it is the
stronger claim.

---

## Part 7 — What actually gets posted

Nowhere in the existing docs is this stated plainly, and the Poster cannot be
specified without it.

**You do not post "the reconciliation".** You post two things.

### 1. Correcting journal entries

Real GL entries — a debit, a credit, a date, a description — that make the books
agree with what the bank actually did. The fixture produces four:

| Entry | Amount | Why it exists |
|---|---|---|
| Stripe payout received | 4,318.42 | The bank received it; the books never recorded it |
| Account analysis fee | 185.00 | The bank charged it; the books do not know |
| Interest earned | 42.18 | Same |
| Returned rent and its fee | 1,275.00 | Reverse the rent, book the 75.00 fee, tenant now owes |

These are the **book reconciling items**. Each one is generated by a resolution
the human authorised, and each carries the reason that produced it.

### 2. Cleared marks

For every transaction that cleared this period, a tick. Cheque 1038 cleared —
ticked. Cheque 1042 did not — left open, and it carries forward. Yardi then
records the reconciliation against its ending balance.

### What follows for the model

- Every posted entry carries an **idempotency key**, so a retry can never create
  a duplicate.
- Posting is therefore **partial by nature**: 40 of 60 entries land and the
  connection drops. `partially-posted`, `failed` and `reversed` are real states,
  and a completed post needs a visible undo.
- A **closed period cannot be posted into.** A correction discovered in
  September goes into September, not back into May.

## Open

- **Does the balance proof get a route?** It is the settled state of Reconcile
  per `REBUILD_PLAN.md` Part 4 decision 1. A route would let Close link straight
  to a proof. Leaning: no route until something needs to link to it.
- **Where does a close package live** — its own surface, or a grouping inside
  Close? Leaning: a grouping, because it counts rather than proves.
- **How many runs does the UI show?** A reconciliation may be attempted several
  times — mid-month against a partial statement, then again when the final one
  lands. Only the last is signed. Whether the earlier runs are visible history or
  silently superseded is undecided.
- **What happens when nobody acts.** A reconciliation sitting unreviewed for five
  days while the period is about to close is a real operational state and the
  product currently has nothing to say about it. Ageing, nudging and escalating
  are part of the workflow.
