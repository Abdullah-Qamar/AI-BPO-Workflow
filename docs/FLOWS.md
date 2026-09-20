# Flows and the reconciliation state machine

Working document, 19 September 2026. The layer between the object model and the
screens: what states a reconciliation moves through, what guards each transition,
and the nine end-to-end flows the product has to support.

A styled version with diagrams exists as a published page; this file is the
canonical text.

Depends on `docs/TAXONOMY_AND_IA.md` (the unit of work, one human, what gets
posted) and `docs/AI_ARCHITECTURE.md` (the five jobs and their refusals).

---

## Part 1 — The rule this whole layer exists to enforce

> **Every state that names a problem must offer at least one action that changes
> it.**

This product's characteristic defect is not ugliness or missing features. It is
**dead ends** — surfaces that announce something is wrong and give the person
nowhere to go. Three live examples, and they are the same bug three times:

| Dead end | Where |
|---|---|
| "Two possible matches, can't choose" — and the only buttons are approve and flag | Gap 1. The candidates exist only as prose in a `reason` string |
| "2 files unclassified" with two chips that do nothing | `AgentsPanel` intake line. The product announces a problem and offers no route out |
| A genuine $75 difference resolved by moving it to *approved* | Gap 3. Approving does not make the $75 go away; it sends it onward labelled fine |

Every flow below is audited against that rule, and the audit is the point of the
document.

---

## Part 2 — The reconciliation state machine

Replaces `RunState`, which runs `updating-yardi → complete` — reading has a
failure state and posting does not, which is backwards, and there is no state at
all for *a read that needs a person*.

### States

| State | Meaning | Who moves it on |
|---|---|---|
| `draft` | Created for an account and period, awaiting documents. Shows "0 of 2 expected" | documents arriving |
| `reading` | Reader extracting and grading | the Reader |
| `blocked` | **New.** A read failed, with a named reason from the five-failure taxonomy | a person, or a new document |
| `matching` | Matcher, then pattern proposer, then ranker | the machine |
| `review` | Exceptions waiting on a person; unexplained ≠ 0.00 | a person |
| `proven` | Unexplained = 0.00 and nothing open | guard, see below |
| `signed` | A person authorised it. An immutable snapshot is taken here | a person |
| `posting` | Poster sending entries | the Poster |
| `posted` | Every entry landed | — |
| `partially-posted` | Some landed. Retry or reverse | a person |
| `post-failed` | None landed | a person |
| `reversed` | A completed post undone | a person |
| `closed` | The period is locked. Terminal | period close |
| `superseded` | A later run replaced this one | a later run |

### The guards, which are the design

| Transition | Guard |
|---|---|
| `review → proven` | **Unexplained must equal 0.00.** Not roundable, not overridable, not a warning. This is Yardi's own rule — the difference must reach zero before anything posts |
| `proven → signed` | A person. Never automatic, at any autonomy rung |
| `→ posting` | The period must be open |
| `posted → reversed` | The period must be open. After close, a correction goes into the next period |
| `blocked → reading` | Only a person or a new document. There is no timeout that turns a failed read into a successful one |

`blocked` is the state the product is missing, and its absence is why a read
failure currently has nowhere to live.

---

## Part 3 — The nine flows

| # | Flow | Beat | Unit |
|---|---|---|---|
| F1 | Open a period and bring documents in | 2 | close package |
| F2 | Run the reconciliation | 3 | reconciliation |
| F3 | Decide an exception | 4, 5 | one match |
| F4 | Prove | 6 | reconciliation |
| F5 | Sign and post | 7 | reconciliation |
| F6 | Close the period and carry forward | — | period |
| F7 | Correction to rule | — | rule |
| F8 | Sample | — | approved work |
| F9 | Review autonomy | 8 | pattern |

F6, F7 and F8 appear in no walkthrough beat but are structurally necessary: F6 is
what makes the product a running record rather than a file comparator, F7 is the
learning loop the positioning rests on, and F8 is the only source of the
escaped-error number.

---

### F1 · Open a period and bring documents in

**Trigger** a period opens for the entity, or a person starts a close early.
**Creates** one reconciliation per account, each in `draft`.

```
period opens
  -> N reconciliations created, each draft, each expecting 2 documents
  -> documents arrive (upload today; bank feed or mailbox later)
  -> Reader: extract -> grade against control totals -> resolve identity
     |
     +-- bound            -> reading complete, reconciliation -> matching
     +-- unclassified     -> blocked: map this account number, or create an account
     +-- ambiguous        -> blocked: a person picks; usually a setup error
     +-- wrong period     -> blocked: open the right period, or confirm a re-statement
     +-- wrong account    -> blocked: re-route the file
     +-- duplicate        -> blocked: discard, or confirm it supersedes
     +-- incomplete read  -> blocked: re-upload, or supply another export format
```

**Exit** every reconciliation is `matching`, or `blocked` with a named reason and
an action beside it.
**Dead-end audit** every branch above terminates in an action. The current build
has one branch (bound) and drops the rest on the floor.

---

### F2 · Run the reconciliation

**Trigger** both documents bound. **The run starts by itself.**
**Actor** the machine, unattended.

**No start button, and the reason matters.** Nothing in reading or pairing is
consequential, nothing is written anywhere, and nothing is irreversible. So a
person clicking Start is a click with no decision in it — the same argument that
removed "New session". The gate belongs at signing, where a person takes
responsibility.

What replaces it is **Stop, available while the run is in flight**. That
satisfies the planning-visibility pattern — the operator can halt it early —
without asking for a click that carries no thought.

```
matching
  -> inherit the account's open items      (joint 1 — not just this month's files)
  -> descend the rule ladder
  -> classify into the five outcomes
  -> pattern proposer over what did not pair
  -> candidate ranker over what is ambiguous
  -> freeze the first-pass figures
```

**Exit** `review`, carrying a **first-pass unexplained** figure and a count of
items needing a person.
**Frozen deliberately** the first-pass numbers are measured at the machine's
verdict and never improve when a human cleans up afterwards. A metric that rises
when people work harder is not measuring the system.
**Failure** if the Reader's grade failed, this flow never starts. The run stops
rather than reconciling against a half-read statement.

---

### F3 · Decide an exception — the heart of the product

**Trigger** a person opens the review queue.
**Unit** one match, not one row.

The item shows: both sides, the rule that fired or the reason none did, the
candidates considered and why each was rejected, and — where a model contributed
— one sentence of ranking, marked as a proposal.

**Four resolution actions. Each visibly moves the unexplained figure.**

| Action | What it does | Effect on the proof |
|---|---|---|
| **Accept as timing** | It is an outstanding cheque or a deposit in transit, and will clear | Moves to the bank side; carries forward on close |
| **Correct the match** | Pick a different candidate | Re-pairs; may change what carries forward |
| **Add a correcting entry** | The books are wrong. Amount and reason required | Adds a book reconciling item; becomes a posted journal entry |
| **Set aside** | Cannot be settled now. Reason required | Stays visible and unexplained. Does **not** let the proof reach zero |

**Approving is no longer a valid response to a real difference.** That is the
whole change from the two-bucket model.

#### The worked example, on the fixture's real numbers

At first pass, no book reconciling item has been booked yet:

```
adjusted bank (301,980.10 − 18,450.50 + 9,315.00)          292,844.60
book balance                                               289,944.00
                                                          -----------
UNEXPLAINED at first pass                                    2,900.60
```

Four resolutions walk it to zero, and the figure moves on every one:

| Resolution | Adjusted book | Unexplained |
|---|---:|---:|
| — first pass — | 289,944.00 | **2,900.60** |
| Add a correcting entry · Stripe payout received | 294,262.42 | −1,417.82 |
| Add a correcting entry · returned rent and its fee | 292,987.42 | −142.82 |
| Add a correcting entry · account analysis fee | 292,802.42 | 42.18 |
| Add a correcting entry · interest earned | 292,844.60 | **0.00** |

*(verified in integer cents against `fixtures/`)*

#### The ambiguous refund, and why it is beat 4

Two ledger rows, both 210.00 — tenant 115's refund and tenant 119's. The bank
shows one 210.00 debit. The reviewer picks one; the other becomes an outstanding
item.

**Outstanding totals 18,450.50 either way, and the proof reaches 0.00 either
way.** Pick the wrong one and the month closes, correctly balanced, with the
wrong tenant carrying a refund that already cleared.

That is *balance is not evidence of correctness*, live, on real numbers, and it
costs nothing to stage because the fixture already contains it. Beat 4 should
show it rather than assert it: pick a candidate, watch the proof stay at zero,
then say what just went wrong. It is also the argument for F8.

---

### F4 · Prove

**Trigger** every item in the queue has a resolution.
**Content** the ladder, every figure computed from the records and none seeded,
carrying "calculated, not estimated" — a claim that has to be true.

The unexplained figure is the primary element on the screen at `--type-metric`;
everything else supports it. If it is not zero, **the screen names what is
blocking it** — the `ledger-only` residue and the set-aside items — rather than
showing a red number with no route.

**Exit** `proven`, or back to `review` with the blockers named.

---

### F5 · Sign and post

```
proven -> [ a person signs ] -> signed -> posting
                                            |
                                            +-- posted
                                            +-- partially-posted (40 of 60)
                                            +-- post-failed
                                                  |
                                                  +-- retry (idempotency keys make it safe)
                                                  +-- reverse
```

**Before the click** the confirm states exactly what will be written: *4
correcting journal entries and 11 cleared marks into 05/2026*. The screen's job
here is to make consequences plain, not to make the person think — they have
already done the thinking in F3.

**One confirm treatment everywhere.** Today the review drawer fires immediately
while the agents panel wraps the same action in a confirm, and the drawer is the
surface that gets demoed.

**Undo is the strongest trust feature in the product.** Capture it on camera.

---

### F6 · Close the period and carry forward

**Trigger** every reconciliation in the close package is `posted`.

```
all accounts proven and posted
  -> close package complete ("4 of 4 accounts proven")
  -> period locks
  -> unresolved open items hand forward to the next period with their age
  -> anything over 90 days is flagged stale on the account
```

After lock, a correction goes into the **next** period. A closed period cannot be
posted into, and the guard is in code, not in a prompt.

---

### F7 · Correction to rule

**Trigger** a person resolves something the same way repeatedly, or explicitly
asks to make a resolution a rule.

```
resolution -> draft rule (scope · condition · action · owner · expiry)
  -> preview against last month: "would have changed 14 items, $3,120"
  -> conflict check against active rules, surfaced at approval time
  -> approved -> active
  -> measured every cycle -> promoted, or retired
```

The **preview** is the part every design of this kind forgets, and it is the
difference between a setting and an informed decision.

The loop runs both ways: *"the rule you approved in April has matched 31 items
since, and been overridden twice."*

---

### F8 · Sample

**Trigger** scheduled, at a rate set by the autonomy rung of the patterns
involved.
**Content** already-approved work that nobody flagged.

A model may choose *what* to sample — biasing toward newly-promoted patterns,
large amounts and unusual accounts. A person does the looking, because a machine
checking its own work finds nothing it did not already believe.

**Exit** confirmed, or an error found — which feeds the escaped-error count and
can demote a pattern automatically.

Without this flow the escaped-error number has no source, and the reviewer who
only ever sees exceptions slowly forgets what normal looks like.

---

### F9 · Review autonomy

**Trigger** a person opens Knowledge → Patterns.

Each pattern shows its rung, times seen, human agreement rate, and current
sampling rate. **Promotion requires evidence and a person. Demotion is automatic**
when the override rate crosses its threshold — no one is asked, and the pattern
is told why it fell.

The permanent exclusions are rendered as exclusions, not as patterns stuck at
rung 1: ambiguous matches, security-deposit accounts, the final write.

---

## Part 4 — What this prunes

Measured against the flows above, three things in `docs/teardown/02-screens`
belong to no flow and wait until after recording: money columns on the Properties
listing, the AI Performance rebuild, and the property record's cash position.

And one thing the flows demand that has no screen at all: **`blocked`**. Every
read failure in F1 currently renders as either a success or nothing.

---

## Open

- **Does `blocked` live on the reconciliation, or on the document?** A statement
  can be fine while the ledger export is the wrong period. Leaning: on the
  document, with the reconciliation reporting the worst state of its documents.
- **Can a person sign a reconciliation they prepared?** With one human and no
  roles, yes — the control is that the AI prepared it. Worth stating on the
  screen rather than leaving implicit.
- **What happens when nobody acts.** A reconciliation sitting in `review` for
  five days while the period is about to close is a real operational state.
  Ageing, nudging and escalating are part of F1's period, not an afterthought.
- **Does F8 interrupt, or queue?** Sampling that can be postponed indefinitely is
  sampling that never happens.
