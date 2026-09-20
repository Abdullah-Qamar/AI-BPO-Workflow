# UX specs, screen by screen

Working document, 19 September 2026. One spec for each of the five screens.

A styled version exists as a published page. This file is the full text.

Reads from: `TAXONOMY_AND_IA.md` for the objects, `AI_ARCHITECTURE.md` for the
five jobs, `FLOWS.md` for the states. Visual rules come from
`src/app/globals.css` and `/design-system`. No new colour. No new text size. No
new button height.

---

## How to read a spec

Every screen below has the same seven parts.

| Part | What it tells you |
|---|---|
| **What it is for** | The one thing a person comes here to do |
| **The one number** | The main figure on the screen. There is only ever one |
| **What you see** | The picture, described from top to bottom |
| **What runs behind it** | Where each number comes from, and what is stored |
| **A real example** | The same screen filled with figures from the test month |
| **What you can do** | Every action on the screen |
| **Never** | What this screen must not show or allow |

The "what you see" and "what runs behind it" split matters. A lot of the work on
this product is deciding which numbers are worked out fresh and which are stored.
Get that wrong and the screen lies.

---

# 1. Close

## What it is for

This is the screen you open first thing in the morning. It shows what is left to
do before the month can be closed. It does not do any maths. It counts.

## The one number

**14 of 22 accounts proven.**

## What you see

**At the top.** The month, whether it is still open, and how many days are left
before it closes.

**Next, anything stuck.** Stuck means the system tried and could not carry on. It
is not the same as unfinished. Each stuck row says what went wrong in one short
line and has a button next to it that fixes it.

> Westlake Escrow. The statement you uploaded is for April, not May.
> `[ Open April instead ]` `[ Upload the right file ]`

Stuck items sit at the top because they are the only thing on this screen that
cannot move without you.

**Then the main list.** One row for each property. The row shows the property
name, then a small chip for each of its bank accounts. A filled chip means that
account is proven. A plain chip means it still needs work.

> 1849 Westlake   `Operating ✓`  `Security deposit ✓`  `Reserve ✓`  `Escrow`

You can see at a glance that three of the four are done, and which one is not.
The old design showed one badge for the whole property, which could only ever be
right or wrong for all four at once.

**Then the spot check queue.** This holds work the system already finished and
nobody flagged. It asks you to look at a few of them anyway. This list gets
*longer* as the system gets more trusted, not shorter.

**At the bottom.** Months already closed, folded away.

## What runs behind it

This screen reads state. It does not calculate money.

- Each chip reads one field on a reconciliation: proven, or not proven.
- The headline number is a count. Proven accounts over accounts due.
- The stuck list reads the document state that the Reader set, plus the reason
  code it returned. There are five reason codes and each one maps to its own
  buttons.
- The spot check queue is built from the trust levels of the situations used in
  those runs. Higher trust means a bigger queue.
- Nothing here is stored as a summary. If it were, it would go stale the moment
  someone finished an account in another tab.

## A real example

It is 3 June. May is open and closes in four days. There are 22 accounts due
across 6 properties. 14 are proven. Two are stuck because the wrong file was
uploaded. Six are waiting for someone to look at them.

You click the first stuck row. It says the file is for April. You upload the May
file instead. The row disappears from the stuck list and the account starts
reading.

## What you can do

Open an account to work on it. Fix a stuck file. Take a spot check. Open the
month. Close the month.

## Never

- **Never show one status for a whole property.** A property does not prove.
  Its accounts do, one at a time.
- **Never show AI usage numbers here.** An accountant cannot do anything with
  them.
- **Never let a stuck item scroll out of sight.**

---

# 2. Reconcile

## What it is for

Get one bank account to zero for one month, and then sign it. Most of the
product is this screen.

## The one number

**Unexplained.** It is the biggest thing on the screen. Nothing else gets that
size.

## What you see

**The header.** The account, the month, and the state, written as words.

> 1849 Westlake · Operating · May 2026 · waiting for you

**The middle of the screen changes when the work finishes.** This is deliberate.

While the work is running you see the machine working. The two documents, lines
joining them as rows get paired, and a count going up. A picture of a machine is
the right picture for work in progress.

Once the work is done, that same area becomes the proof. Two short columns of
figures that meet at the bottom. A proof is the right picture for work that is
finished.

**The lanes.** Four of them: Reading, Pairing, Checking, Sending. Each lane says
what it actually touched, not just that it is busy.

> Reading · read bai2-westlake-operating-2026-05.bai · 14 lines · totals matched

**The queue.** One row for each thing that needs you. Biggest money first,
because that is the order in which your attention is worth most.

**The item view.** This opens when you click a row, and it is the most important
surface in the product.

- **Left: the bank line.** Date, amount, description, and the bank's code with
  what that code means in words.
  > 20 May · −1,200.00 · RETURNED ITEM UNIT 308 · code 555, Deposited Item Returned
- **Right: the ledger rows.** This is a **list**, not one row. One deposit can
  cover three rents. That is normal, not an edge case, and the old data shape
  could not hold it at all.
- **How it was decided.** Either the rule that paired them, or the reason nothing
  did.
  > Rule 3 matched. Same amount, and the reference number is the same.
- **The candidates.** Every row that was considered, and **why each one was
  turned down**. These are clickable, because picking one is the most common
  thing a person does in this job.
  > Tenant 119 refund · 210.00 · 16 May
  > Turned down: the amount matches, but tenant 115 is two days closer.
- **The AI's sentence**, if there is one, inside a box labelled as a suggestion.
  It is never presented as a finding.
- **Four buttons.** It is just timing. Pick a different match. Add a correction.
  Set aside.

**Before the run, the documents themselves.** This is where a person can open
the real statement, and it is the thing the old pre-run screen was missing. Two
rows: file name, what it is, when it landed, how many lines, and the control
totals the statement declares about itself.

> bai2-westlake-operating-2026-05.bai · 14 lines
> declares 49,585.60 in 6 credits · 33,005.50 in 8 debits · closing 301,980.10

Showing those figures *before* the run is what makes the Reader's self-check
legible when it happens.

**There is no Start button.** The run begins when both documents bind. Nothing
in reading or pairing is consequential or irreversible, so a click there carries
no decision. What the person gets instead is **Stop**, while the run is in
flight.

**The bar at the bottom.** Whatever comes next: review 8 items, sign, or send.

## What runs behind it

- **The unexplained figure is worked out fresh every time you act.** It is never
  stored. Storing it is how a screen ends up showing a number that is no longer
  true.
- The sum is: adjusted bank, minus adjusted book.
- **Adjusted bank** = the statement's closing balance, minus items still waiting
  to clear, plus deposits that have not landed yet.
- **Adjusted book** = the balance in the books, plus every correction you have
  approved so far.
- Each of the four buttons changes one input to that sum. So the number moves the
  moment you click, in front of you.
- **The sign button is switched off** until unexplained is exactly 0.00. It is
  switched off with the reason written next to it. It is never switched on and
  then followed by a telling-off.
- **Signing takes a frozen copy** of everything: the two files and a fingerprint
  proving they were not swapped, which rules were on and at which version, which
  AI version ran, every suggestion it made and whether it was accepted, and your
  name and the time. This is what makes the month explainable in two years.

## A real example

The run finishes. Unexplained is **2,900.60**. Eight items are in the queue.

You work through them. Four are corrections the books are missing. As you approve
each one, the number moves in front of you:

| You approve | Books now say | Still unexplained |
|---|---:|---:|
| *(nothing yet)* | 289,944.00 | **2,900.60** |
| The payment the bank received | 294,262.42 | −1,417.82 |
| The bounced rent and its fee | 292,987.42 | −142.82 |
| The bank fee | 292,802.42 | 42.18 |
| The interest earned | 292,844.60 | **0.00** |

It goes below zero and comes back. That is normal and it is worth seeing,
because it shows the figure is being worked out rather than counted down.

Now the middle of the screen changes from the machine to the proof, and the sign
button turns on.

**One more item is worth watching.** Two ledger rows are both 210.00, one for
tenant 115 and one for tenant 119. The bank shows one payment of 210.00. You pick
one. The other becomes an item waiting to clear.

The total of waiting items is 18,450.50 **either way**. The proof reaches 0.00
**either way**. Pick the wrong one and the month closes, perfectly balanced, with
the wrong tenant carrying a refund that already went out. Nothing on this screen
can catch that. Only a spot check can.

## What you can do

Start the run. Open an item. Choose one of the four actions. Pick a candidate.
Sign. Send. Undo a send. Retry a half-finished send.

## Never

- **Never offer "approve" as an answer to a real difference.** Moving a 75.00 gap
  into an approved box does not make the 75.00 go away.
- **Never let the sign button work while unexplained is not 0.00.**
- **Never show a bare percentage.** A number gets the question it answers written
  next to it. "92%" means nothing. "Match confidence 92%" means something.
- **Never colour an outcome like a status.** A cheque that has not cleared yet is
  completely normal. If it is tinted amber it looks like a problem, and then
  nobody believes any of the colours.
- **Never send without a confirm**, and use the same confirm everywhere. Right
  now one screen asks and another fires straight away.

---

# 3. Accounts

## What it is for

Look at one bank account as an ongoing thing. This screen has no month. It is
about the account itself.

## The one number

**The age of the oldest waiting item.**

## What you see

**The list of accounts, on the left.** Every row carries **its own oldest
waiting item in days**, and the list sorts by it, worst first. Accounts with
nothing waiting sink to the bottom.

Without this the screen fails at its own job: to find the account carrying a
106-day item you would click through twenty accounts one at a time. The number
this screen is about has to be visible in the list, not only in the detail.

**At the top, what the account is.** Property, bank, the last four digits, what
the account is used for, and which line in the accounting system it posts to.

If it is a tenant deposit account, it says so, and says "not automated" next to
it. That is written as a plain fact, not as a warning, because there is nothing
wrong. The law requires that money to be kept separately, so we leave it alone on
purpose.

**In the middle, the main content: the list of waiting items.** Each row shows
what it is, the amount, the date it was written, and how old it is in days.

> Cheque 1042 · Delta HVAC Services · 3,200.00 · written 24 May · **99 days**

Past 90 days the row is marked. This list is the whole point of the screen. It is
what turns the product from "compare two files" into a record of an account over
time.

**Below that**, the rules that apply to this account, with how often each one
fired and how often somebody disagreed with it.

**Guardrails are listed separately from matching rules**, and counted
differently. A matching rule that fired 1,842 times worked 1,842 times. A
guardrail that fired 3 times **blocked three attempts** to do something
forbidden. Opposite events. They never share a column or a count word, and a
guardrail reads "blocked 3 attempts" with a way to see them.

**Then** what this bank's codes mean. Banks do not all use the same codes,
especially in the 900s, so this is per bank and it is versioned.

**At the bottom**, one line per month. Proven or not, and when.

## What runs behind it

- Waiting items are stored **on the account**, not on any month. This is the
  single most important storage decision in the product.
- **Age is worked out, not stored.** It is today's date minus the date the item
  was written. A stored age would be wrong the next morning.
- "Too old" is a rule, not a flag someone sets: age over 90 days.
- When a month closes, anything still unsettled is handed back to the account.
  Next month's run picks it up as an input.
- Chase writes nothing. Cancel and re-issue, and write back, both create an entry
  in the books, so both then go through the sending flow.

## A real example

You open 1849 Westlake, Operating. The oldest waiting item is 99 days old, so
that is the number at the top.

The list has four items. Three are cheques, one is a refund that was never
picked. The 99 day one is cheque 1042 to Delta HVAC for 3,200.00. Nobody cashed
it.

The maths is fine. Every month since May has proved correctly with this cheque
sitting in it. This is not an accounting problem. It is an operations problem:
somebody needs to ring Delta HVAC. You click "write back", which creates an entry
that cancels the cheque and puts the 3,200.00 back into cash.

## What you can do

On a waiting item: chase, cancel and re-issue, or write back. Edit the account's
details. Change which line it posts to, which is recorded more carefully than
other changes because it changes where money lands.

## Never

- **Never show a single month's proof here.** This screen has no month.
- **Never let a waiting item exist without an age.**

---

# 4. Knowledge

## What it is for

See what the system has been taught, and check whether it is still right. Every
setting that changes how the machine decides lives here, in one place.

## The one number

**How often people disagree with it.** The override rate.

## What you see

**Two tabs: Rules and Situations.** They are different things with different
lifespans, and keeping them together is the argument that everything governing
the machine belongs in one place.

### The Rules tab

A list. Each row says where the rule applies, what it does in plain words, who
owns it, when it expires, how many times it has fired, and how many times
somebody overrode it.

> 1849 Westlake only. Bayview Landscaping invoices arrive up to 5 days late, so
> allow a 5 day window. Owner: Sara. Expires 31 Dec. Fired 31 times. Overridden
> twice.

**Sorted worst first**, by override rate. That puts the rules that are probably
wrong at the top, which is the only sensible default.

Guardrails sit in their own group beneath, never mixed in. They cannot be
overridden, so an override rate is meaningless for them; what they carry is a
count of what they stopped.

**Writing a rule is four steps, not a text box.**

1. Fill in the fields. Where it applies. When it fires. What it does. Who owns
   it. When it expires.
2. **Preview.** The system replays last month's data through the draft rule and
   tells you what would have changed.
   > If this had been on last month, it would have changed 14 items worth 3,120.00.
3. **Conflict check.** It shows you any active rule that disagrees with this one.
4. **Approve.**

Step 2 is the one every product of this kind leaves out. It is the difference
between a setting and a decision you actually understand.

### The Situations tab

This is the trust ladder. Each situation shows its level, how many times it has
been seen, how often people agreed with it, and how much spot checking it gets.

The spot checking bar gets **longer** as the level goes up. That looks backwards
until you think about it: whatever you automate is what people stop watching, so
that is exactly where you need to look on purpose.

At the bottom, in their own group, the things that never get automated. They are
shown as their own kind of thing, not as situations stuck at level 1.

## What runs behind it

- A rule is a record with fields, not a sentence. It can be tested, replayed, and
  versioned. The sentences in the current build cannot.
- Every run writes down which rules fired and at which version. This is what lets
  you explain a decision from March in September, after the rules have changed
  six times.
- The override count comes from comparing what the rule did with what the person
  did afterwards. Nobody types it in.
- The preview runs last month's data through the draft rule in memory. Nothing is
  saved and nothing is changed.
- Levels go **up** only when a person approves it with the evidence in front of
  them. Levels go **down** on their own, with nobody asked, the moment the
  override rate crosses the line.

## A real example

You open the Rules tab. At the top sits a rule with 40 fires and 18 overrides.
That is a rule getting it wrong almost half the time. You read it, see the window
is too wide, narrow it from 5 days to 2, preview it, and approve.

On the Situations tab, the bounced payment situation is at level 3. It has been
seen 240 times and people agreed 97% of the time. Its spot check rate is 1 in 10.
You promote it to level 4. The spot check rate goes **up** to 1 in 5, and the
screen says so, because that is the trade you just made.

## What you can do

Write a rule. Preview it. Approve it. Retire it. Promote a situation. Read why
one was demoted.

## Never

- **Never let a customer see or edit the AI's wording.** If a person's edit
  changes the AI's instructions, nobody can explain why last Tuesday was
  different.
- **Never let a rule be created without a preview, an owner, and an expiry date.**

---

# 5. Assurance

## What it is for

Decide whether the system can be trusted, and see whether that is getting better
or worse.

## The one number

**Errors that got through.** Mistakes found after sending, or found by a spot
check. It is the scariest number and the most valuable one.

## What you see

**Three groups, because three different people read this page.**

| Who is reading | What they see | Why |
|---|---|---|
| The accountant | Minutes per reconciliation | This is the time they got back |
| Whoever pays for it | Dollars per reconciliation | This is what they compare against a salary |
| Engineers | AI usage and timing | Useful, but in a drawer that starts closed |

It is one record read three ways. Not three different records.

**Then the measures**, each with a small trend line:

- Unexplained before any person touched it
- How much settled on its own
- How often people overrode the system
- Errors that got through

## What runs behind it

- Every run writes a permanent record: the files and a fingerprint proving they
  were not swapped, which rules were on and at which version, which AI version
  ran, every suggestion it made and whether it was accepted, every action a
  person took with their name and the time, and every send attempt with its
  result.
- **"Settled on its own" is frozen** at the moment the machine gave its answer. A
  person tidying up afterwards cannot improve it. It is a claim about the
  machine, so a human must not be able to move it.
- Errors that got through come from two places: spot checks, and problems
  reported after sending.
- Cost per reconciliation is AI usage converted into money.

**The rule that governs all of them: every quality number belongs to either the
machine or the person, never both.** A number that goes up when people work
harder is not measuring the system.

## A real example

Override rate has risen from 6% to 11% over two months. Nothing else looks wrong.
You click it and the page breaks it down by rule. One rule is responsible for
most of the rise. It was approved in April and the properties it covers changed
their payment schedule in July, so it has been firing on the wrong things ever
since.

That is the whole point of watching this number. Nothing broke. The world moved.

## Never

- **Never put AI usage on the headline.**
- **Never hide a bad trend.** Design the screen that explains one. A system that
  only looks good when the numbers are good is a system nobody trusts when they
  are not.

---

# Rules that apply to every screen

1. **One main number per screen.** If a second number wants to be big, one of
   them is on the wrong screen.
2. **Every screen that says something is wrong must offer something that fixes
   it.** This is the rule the old build broke three times.
3. **Say how each thing was decided.** By a rule, by the AI as a suggestion, or
   by a person. "Worked out, not estimated" is a real trust feature and it has to
   be true.
4. **An outcome is not a status.** What kind of thing something is, and how well
   it is going, are different questions and they get different colours.
5. **The same action looks the same everywhere.**
6. **A switched-off button says why**, right next to it.
7. **Empty and stuck are designed states**, not gaps where a screen should be.

---

# Still open

- Four lanes over five jobs. The pattern finder and the ranker both sit in
  Checking. Leaning towards four, because the split matters to us and not to the
  person using it.
- Does the proof get its own address, or does it only ever appear as the finished
  state of Reconcile?
- Does the Reader's retry loop get a visible surface, or do you only ever see how
  it ended?
- Does the spot check queue interrupt you, or wait? A queue you can always put off
  is a queue that never gets done.
