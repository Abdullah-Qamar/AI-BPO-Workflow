# Walkthrough script

For a recorded video of about 20 minutes, walking the board at
`board.html` (published as an artifact). Fourteen stations. Narration is
first person and written to be spoken, not read.

Record the narration separately and cut the board movement to it. Say the
honest frame in the first thirty seconds, before anyone can find it themselves.

| Station | Title | Target |
|---|---|---|
| 0 | Open | 0:40 |
| 1 | The job | 1:20 |
| 2 | The proof | 1:30 |
| 3 | Balance is not correctness | 1:30 |
| 4 | Two worlds | 1:20 |
| 5 | The unit of work | 1:20 |
| 6 | Three layers | 2:00 |
| 7 | The placement test | 1:20 |
| 8 | The five jobs | 2:00 |
| 9 | The bounced payment | 1:40 |
| 10 | The state machine | 1:20 |
| 11 | Earning autonomy | 1:40 |
| 12 | How it learns | 1:30 |
| 13 | The screens | 1:20 |
| 14 | What I would say about it | 1:00 |

Total about 21 minutes with pauses.

---

## 0 · Open

> This is Reconciler. It is a design prototype for bank reconciliation in
> property accounting.
>
> Two things before anything else, because you will work them out anyway.
>
> The interface and the model behind it are real. The automation is acted out
> by timers. There is no server, no file reader and no connection to an
> accounting system.
>
> And one month of data in here was reconciled by hand, by me, so every figure
> you see on that account is arithmetic you can check. Everything else is
> marked illustrative, on screen, in the product.
>
> What I want to show you is not the interface. It is the model underneath it,
> and the eight places my first version was wrong.

---

## 1 · The job

> At the end of every month, the bank's record and the property's books
> disagree. That is normal, and this is the part most people get wrong about
> this job.
>
> A cheque written on the 28th has not been cashed. A deposit made on the 31st
> lands on the 1st. The bank charged a fee nobody has written down yet.
>
> So reconciling is not comparing two lists. It is proving that two balances
> agree once every difference between them is explained. Nobody can close the
> month until that is done, and a property manager does it for every bank
> account, every month.
>
> That distinction sounds academic. It is not. My first version was built as a
> list comparison, and almost every mistake I am going to show you comes from
> that one wrong idea.

---

## 2 · The proof

> Here is the thing the whole product exists to produce.
>
> Two journeys. From the bank's side you take the closing balance and remove
> what the bank has not seen yet: cheques not cashed, deposits not landed. From
> the books' side you add what the books have not recorded: a payment that
> arrived, a fee, some interest.
>
> If the two land on the same number, everything is accounted for.
>
> These are real figures from the month I did by hand. Bank closing 301,980.10,
> less 18,450.50 waiting, plus 9,315.00 in transit. Adjusted bank 292,844.60.
> Book balance 289,944.00, plus the four corrections, gives 292,844.60.
>
> Still unexplained: zero.
>
> My first version had no balances in it anywhere. Not on an account, not on a
> session, nowhere. The screen that is the entire reason this job exists did
> not exist.

---

## 3 · Balance is not correctness

> Now the thing I am most pleased to have found, because it changed how I think
> about automated systems generally.
>
> Suppose tenant A paid 1,200 and tenant B paid 1,200, and the system swaps
> them. The totals still agree. The proof still reaches zero. The month closes
> clean. And two tenant records are wrong, one of them gets a late notice, and
> nobody finds out until somebody complains.
>
> A matching engine can be one hundred per cent balanced and substantially
> wrong.
>
> This is not hypothetical in my data. There are two refunds in that month,
> both exactly 210.00. The reviewer has to pick one. Whichever they pick, the
> waiting items total 18,450.50 and the proof reaches zero.
>
> So the product has a moment where it cannot tell you that you just made a
> mistake. Designing for that is most of what follows.

---

## 4 · Two worlds

> The object model. My first version had one tree and it needed two.
>
> On the left, things that stay: the property, the bank account, the rules.
> Edited when something real happens. A refinance, a new account, a property
> sold.
>
> On the right, things made fresh every month: the month itself, the
> reconciliation, the matches, the proof, the entries that get sent.
>
> The interesting part is not either tree. It is the two places they touch.
>
> First, waiting items live on the **account**, not on the month. A cheque
> written in May is still the account's problem in July. That single decision
> is what turns this from comparing two files into a record of an account over
> time.
>
> Second, rules are read by every run and rewritten by corrections. Which means
> every run has to record which version of each rule fired, or you can never
> explain a decision from March once the rules have changed.

---

## 5 · The unit of work

> This is the correction everything else waited behind.
>
> My first version made a session — one property, one month — the unit, and
> showed one status for it. Here it is. It says "tied".
>
> But a property never ties out. There is no such thing as proving a property's
> cash. Four bank accounts prove separately, each against its own statement,
> each with its own unexplained figure.
>
> So that badge can only do one of two things: lie, or go red for the three
> accounts that are perfectly fine.
>
> The unit is **one bank account for one month**. The property above it is a
> container that counts. It says "three of four proven" and never a single
> badge.
>
> That was not a missing field. It was the unit being wrong, which meant every
> count and every headline number in the product was attached to an object that
> could not carry it.

---

## 6 · Three layers

> This is the part I would most like to be asked about.
>
> People usually draw AI products as a row of agents. I draw mine as three
> layers, because that is what it actually is.
>
> At the bottom, the **harness**. The state machine and its guards. The record
> of every run: which files came in and a fingerprint proving they were not
> swapped, which rules fired at which version, every suggestion the model made
> and whether it was accepted, every human action with a name and a time. Tags
> that make sending something twice impossible. The freeze taken at signing.
>
> In the middle, the **jobs**. Five steps that produce the output.
>
> At the top, the **model**. Called by some of the jobs. Trusted by none of
> them on its own.
>
> And here is the sentence: the model is the smallest layer. The harness is the
> largest. The jobs are where the work is.
>
> That is not an apology. That is what a reliable AI product looks like when
> you draw it honestly.

---

## 7 · The placement test

> How do I decide what goes where? Four questions, and they are a test rather
> than a preference.
>
> Must two runs on the same files give the identical answer? Then rules.
>
> Does the output get signed, or land in the accounting system? Then rules.
>
> Is the input messy — a scanned page, a layout nobody agreed on? Then a model.
>
> Is the output a sentence written for a person to read? Then a model.
>
> The short version is that the model never decides what is true. It decides
> what to read, and what to say. It sits at the two edges, where documents come
> in and where words go out to a person. Everything in the middle that touches
> money is rules.
>
> This is the part that transfers. It works on any workflow, not just this one.

---

## 8 · The five jobs

> Apply that test and you get five jobs.
>
> The **Reader** turns documents into rows. It is the one place a model earns
> its keep, and only for messy formats. For the file I actually built for, a
> parser does it perfectly, so a model there would add cost, latency and
> uncertainty for nothing. The model is a fallback, not the default.
>
> The guard is the good part: the document marks its own homework. Every
> statement prints its own totals. The extracted rows must reproduce them
> exactly. If they do not, the run stops rather than reconcile against half a
> statement. That check costs nothing, because the answer is printed on the
> input.
>
> The **Matcher** has no model at all. It works down a written list of rules.
> This is where being wrong costs money, and where "why did these two match"
> needs an answer an auditor accepts. And because it is rules, I can test it
> against a month somebody closed by hand, which is where an honest accuracy
> number comes from.
>
> The **Pattern finder** proposes. Arithmetic confirms.
>
> The **Ranker** writes the one sentence that separates two candidates, and can
> never be checked, by definition.
>
> The **Poster** has no model either. It sends entries one at a time, each
> tagged so it cannot be sent twice.
>
> Count them. Three of five have no model in them. On the format I built for,
> four of five. The most consequential step in the product is the least
> intelligent, and those two facts are related.

---

## 9 · The bounced payment

> This is my favourite thing in the data, and it is a routine event my first
> version called a mystery.
>
> On the 3rd, the bank shows rent in for unit 308, 1,275.00. On the 20th it
> shows 1,200.00 going back out, and a 75.00 fee. The books show one thing:
> rent received.
>
> My first version reported this as "amounts do not match, 1,200 versus 1,275"
> and flagged it as an anomaly. But 1,200 plus 75 is 1,275. It is not an
> anomaly. It is a bounced payment, which is one of the most common events in
> property management.
>
> So: the model reads the descriptions and proposes that this is a returned
> payment. Then deterministic code goes and checks. Is there an earlier credit
> sharing that reference? Does the return plus the fee equal it exactly? Is the
> fee in a fee code band?
>
> All three pass, so the product states it as fact. Three lines become one
> story. If the arithmetic had not tied, it would be shown as a guess and
> labelled as one.
>
> A model proposes. Arithmetic asserts. That is the mechanic.
>
> And one more thing it produces, which is not a reconciliation output at all:
> tenant 308 still owes rent. The product says so and hands it on.

---

## 10 · The state machine

> Fourteen states, and one of them matters more than the rest.
>
> My first version ran "updating accounting system" then "complete". Reading
> was allowed to fail. Sending was not. That is exactly backwards: the one step
> that writes into the books was the only step that could not go wrong.
>
> So now sending has half-sent, failed and reversed, every entry carries a tag
> so a retry cannot duplicate it, and a finished send has a visible undo.
>
> The missing state was **stuck** — a read that failed and needs a person. It
> had nowhere to live, which is why my old build announced "two files
> unclassified" and gave you two chips that did nothing.
>
> And then the guard that is the whole product. You cannot reach "proved" until
> unexplained is exactly zero. Not rounded, not a warning you can click past.
> That is how the accounting system everybody already uses works, and it is the
> rule that stops the product from ever quietly passing a broken month along.

---

## 11 · Earning autonomy

> Here is the idea I would want to be remembered for.
>
> Autonomy is not one dial on the system. Individual situations climb four
> levels on evidence. Watched, where a person decides every time and the system
> only counts. Suggested, where it proposes and agreement is measured. Trial,
> where it decides and a person checks afterwards. And on its own.
>
> Three things make that safe.
>
> Dropping back down is automatic. If people start overriding a situation more
> often, it falls a level by itself. Nobody has to notice. That is what
> separates earning autonomy from drifting into it.
>
> Second, and this is the part that looks wrong until you think about it: the
> spot checking goes **up** as trust goes up, not down. Whatever you automate is
> what people stop watching. And remember that two wrong matches of the same
> amount still cancel out, so the proof reaches zero while the month is wrong.
> The better this gets, the more deliberately you have to look.
>
> Third, some things never climb at all. When two answers both look right,
> because by definition the system does not know. Tenant deposit accounts,
> because that money is protected by law. And the final send, because somebody
> has to answer "who signed this".
>
> Naming what can never be automated is what makes the rest believable.

---

## 12 · How it learns

> This is the only genuinely agentic loop in the product, and it took me a
> while to see that.
>
> Someone resolves three items the same way. The model notices the repetition
> and drafts a rule from it — where it applies, when it fires, what it does, in
> plain words.
>
> Then the system replays last month through that draft and reports what would
> have changed. "This would have changed fourteen items, worth 3,120." Then it
> checks the draft against every active rule and shows you any that disagree.
> Then a person approves.
>
> After that it is measured every cycle. Overridden often means wrong. Stopped
> firing means dead.
>
> The preview is the part everybody forgets, and it is the difference between a
> setting and a decision you actually understand.
>
> One more thing, and it is the cheapest trust feature in the product: tell
> people what their correction did. "The rule you approved in April has matched
> thirty-one items since, and been overridden twice."
>
> Notice the shape. A model drafts. Deterministic gates check. A person
> approves. It is measured and can be demoted. That is a loop, and it is the
> reason I would call this an AI-native product even though most of its steps
> have no model in them.

---

## 13 · The screens

> Five screens, and one rule: each is about one thing, answers one question and
> shows one number.
>
> **Close** is what you open in the morning. What is left before the month can
> close. Anything stuck sits at the top, because it is the only thing on that
> screen that cannot move without you.
>
> **Reconcile** is where you work one account. The picture in the middle
> changes when the work finishes: while it runs you watch the machine, and when
> it is done that same area becomes the proof.
>
> **Accounts** is the bank account as an ongoing thing, with the running list of
> what is still waiting and how old it is.
>
> **Rules** is what the system has been taught, sorted by how often people
> disagree with it, so the rules that are probably wrong are at the top.
>
> **Quality** asks whether the thing is getting better or worse. Override rate,
> and errors that got through.
>
> And something I took off the home screen: it used to show tokens used. An
> accountant does not know what a token is, cannot act on it, and is mildly
> alarmed by it. Cost belongs on Quality, in dollars.

---

## 14 · What I would say about it

> So, honestly.
>
> This is a design prototype. The interface and the state model are real, the
> automation is simulated, and I would not claim otherwise in a room.
>
> What I think it demonstrates is a way of working. I took a product I had
> already built, stress-tested my own model against how the domain actually
> works, and found eight places it was wrong. My data contract could not express
> the reviewer's most important action. My exception categories collapsed
> "normal" and "broken" into one bucket. And a completely routine bank event was
> modelled as an anomaly.
>
> A design with no holes in it is less interesting than one whose author found
> eight, because the method is the part that transfers.
>
> And if you take one thing: the strongest claim I can make about this product
> is not what I added the AI to. It is which parts I took the AI out of, and
> why. Almost nobody says that, and it is the part that decides whether a system
> like this can be trusted with money.

---

## Recording notes

- Record narration separately, then cut board movement to it.
- Record the board at 1440px wide or more, 2x DPR, export 1920x1080 or
  2560x1440 at 60fps.
- Use the station buttons rather than dragging on camera. Dragging reads as
  fumbling; a jump reads as a cut.
- Pause a full second after arriving at a station before speaking. It gives the
  editor something to cut on.
- Say "mocked integration" out loud the first time the accounting system
  appears.
- Stations 3, 9 and 11 are the ones that land. Slow down on those and let them
  breathe.
