# Research — associating a bank account with a property

**Date:** 2026-08-26
**Trigger:** the Properties detail "Add bank account" editor offered a three-way brand
picker (Chase / Wells Fargo / BoA). That is not a design, it's a stub. This note
establishes what the interaction should actually be.

---

## 1. The question behind the question

"Add a bank" reads like one job. It is two, and conflating them is why the picker
looked reasonable in the first place.

| Job | What it establishes | Who does it | How often |
| --- | --- | --- | --- |
| **A. Account of record** | *This property's cash sits in this account, and its activity posts to this GL line.* | Controller / onboarding | Once per account, then edited on rare events (refi, new escrow, bank change) |
| **B. Statement delivery** | *Here is how each month's statement for that account reaches us.* | Reconciler | Every cycle |

Our product only needs **A**. We are reconciling an uploaded statement against a
Yardi ledger — no money moves, no balances are read live, no credentials are held.
That single fact rules out most of the consumer prior art (see §3) and changes
which fields are load-bearing.

---

## 2. Why the brand picker fails

There are roughly **4,300 FDIC-insured banks and ~4,650 credit unions** in the US
— about 8,900 institutions ([FDIC Q1 2026](https://www.fdic.gov/news/press-releases/2026/fdic-insured-institutions-reported-return-assets-126-percent-and-net),
[bankbonus](https://bankbonus.com/statistics/how-many-banks-are-in-the-us/)). Plaid,
which is aggressive about coverage, supports **~10,000 US institutions**
([Plaid Institutions](https://plaid.com/docs/institutions/)).

Commercial real estate skews *away* from the money-center banks, not toward them.
A single-asset SPV holding one 24-unit building in Oakland is exactly the customer
a regional or community bank courts — construction draws, local relationships,
escrow and reserve accounts opened at the same branch as the loan. A three-brand
picker isn't merely incomplete; it encodes a wrong mental model, and every property
outside those three brands hits a dead end with no path forward.

It also fails a second way: it makes the **logo** the identifier. Logos are
decoration. Two accounts at the same bank look identical; a bank we have no asset
for cannot be represented at all.

---

## 3. Prior art, and what each one is actually solving

**Plaid Link** — a short "featured institutions" grid (up to 18, configurable, and
regionally weighted) with a search field beneath it covering the full ~10k list
([Link institution customization](https://plaid.com/blog/link-institutions-flexibility/),
[embedded institution search](https://plaid.com/docs/link/embedded-institution-search/)).
The featured grid is a *shortcut*, never the whole surface. Worth stealing: the
two-tier structure. Not worth stealing: the OAuth credential handoff — we don't
need account access, so asking for banking credentials would be an unforced
security and trust liability.

**Federal Reserve E-Payments Routing Directory / FedACH** — the canonical registry.
Every US institution that can receive an ACH or wire has a nine-digit ABA routing
number, and the directory maps routing number → institution name, city, state; it
is synchronised daily ([FRB Services](https://www.frbservices.org/resources/routing-number-directory),
[FAQ](https://www.frbservices.org/resources/routing-number-directory/faqs.html)).
Open implementations exist — [moov-io/fed](https://github.com/moov-io/fed) serves
fuzzy name *and* routing-number lookup over the FedACH and Fedwire files, and
[frb-participants](https://github.com/wealthsimple/frb-participants) ships the same
data as JSON.

**This is the key finding.** The routing number is a real, free, authoritative
primary key for "which bank". It is nine digits, it is printed on every statement
and every check, and the person doing this task is looking at a statement while
they do it. We should build the interaction around it rather than around a name.

**Yardi Voyager** — a bank account is unusable until a **property** and a **GL
account** are attached to it; without that, transactions post to the wrong cash
account or never appear on the reconciliation screen at all
([Lynx Systems](https://lynxsystemsinc.com/bank-reconciliations-in-yardi-best-practices/),
[BC Solutions troubleshooting guide](https://www.bcsolut.com/resources/yardi-bank-reconciliation-troubleshooting-guide)).
The most frequent cause of a failed Yardi bank rec is a **missing bank account
setup on a newly acquired property**. That is our exact failure mode, and it tells
us the GL field is not optional metadata — it is half the point of the record.

**Statement formats** — reconciliation systems ingest BAI2, OFX/QFX, CAMT.053 or
CSV; BAI2 is the bank-native cash-management standard and can carry several
accounts in one file, CSV needs a date/description/amount minimum
([NetSuite import guides](https://www.docuclipper.com/blog/how-to-import-bank-statement-into-netsuite/)).
Which format a bank emits is a property of the *institution*, so capturing the
institution properly also tells the intake agent how to parse next month's upload.

---

## 4. Recommended interaction

**One field, two entry paths, converging on the same resolved institution.**

```
┌─ Bank ───────────────────────────────────────────────┐
│  Search by bank name or routing number                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 1210002…                                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Used elsewhere in this portfolio                     │
│  ● Chase        ● Wells Fargo      ● Bank of America  │
│  ─────────────────────────────────────────────────    │
│  Wells Fargo Bank, N.A.        San Francisco, CA      │
│  121000248                                            │
└───────────────────────────────────────────────────────┘
```

1. **Type a name** → fuzzy match against the directory. Results show
   `Legal name · City, State · Routing`, because "First National Bank" is a dozen
   different institutions and the city is what disambiguates them.
2. **Type nine digits** → resolve directly to one institution and echo the name
   back for confirmation. This is the fast path, and the one a reconciler with a
   statement in front of them will actually use.

**Suggested-first, not brand-first.** The shortcut row is seeded from *banks
already used elsewhere in this portfolio*, not from a hardcoded top-three. In a
portfolio of 12 buildings that will cover the large majority of adds, and it
degrades gracefully — an empty portfolio just shows the search field.

**Monogram fallback, not missing logo.** Institution identity renders as a
two-letter monogram tile with a deterministic tint, upgraded to a real logo only
where we have the asset. Nothing about the flow may depend on having a logo.

**Confirm, don't re-type.** Once resolved, routing number and legal name are shown
as a locked confirmation block, not editable fields. The user's job is to
recognise, not transcribe.

---

## 5. Fields, and why each earns its place

| Field | Required | Source | Why |
| --- | --- | --- | --- |
| Institution (name + routing) | ✅ | resolved from directory | Primary key; determines statement format and parser |
| Account purpose | ✅ | picker, free text allowed | Operating / Reserve / Escrow / Security Deposit / Construction / CapEx — drives which reconciliation rules apply |
| Account number (last 4) | ✅ | typed | Matches the uploaded statement header to the right record; full number never stored |
| GL cash account | ✅ | property's chart of accounts | Yardi will not reconcile without it (§3); the single most common onboarding failure |
| Account holder | optional | defaults to property's legal entity | SPVs and parent entities often hold the account; only shown when it differs |
| Statement source | optional | Upload / Direct feed | Sets the reconciler's expectation for how next month's file arrives |
| Nickname | ✗ | — | Purpose + last-4 already disambiguates; a free-text label invites drift |

### Validation worth doing

- **ABA checksum** on the routing number: `3(d₁+d₄+d₇) + 7(d₂+d₅+d₈) + (d₃+d₆+d₉) ≡ 0 (mod 10)`.
  Catches a transposed digit *before* it becomes an unmatched statement. Cheap,
  offline, and it is what makes the routing-number path trustworthy enough to lead with.
- **Last-4 must be exactly four digits**, and must be unique within the property —
  two accounts at the same bank ending in the same four digits is a data-entry error.
- **GL account must be unique within the property.** Two bank accounts posting to
  one GL line makes the reconciliation ambiguous by construction.

### What we deliberately do not ask for

Online-banking credentials, full account numbers, balances, signatory names, or
micro-deposit verification. Micro-deposits prove *ownership* — they exist to protect
money movement. We move no money, so the cost (two extra days, a dropped-off user,
a funds-transfer surface we'd have to secure) buys nothing.

---

## 6. What the prototype implements

- Seeded directory of ~40 real US institutions — money-center, regional, community
  and credit union — each with its true ABA routing number, city and state.
- One combobox accepting either a name fragment or a routing number, with live ABA
  checksum validation on the numeric path.
- "Used elsewhere in this portfolio" shortcut row derived from the seed data.
- Monogram fallback tiles; the three logo assets we have are an upgrade, not a gate.
- Confirmation block for the resolved institution, then purpose / last-4 / GL.
- Per-property uniqueness checks on last-4 and GL, surfaced inline.

## Open questions for the real product

1. Where does the directory live — bundled snapshot, or a lookup service against
   the FedACH file? The file changes daily but institution *identity* rarely does;
   a monthly snapshot is probably enough.
2. Should the GL field read the property's actual chart of accounts from Yardi
   rather than accepting free text? Almost certainly yes, and it would kill the
   uniqueness-collision class entirely.
3. Do we want to capture expected statement format per institution up front, or
   infer it from the first upload? Inferring is less setup burden, and the intake
   agent already has to sniff the format anyway.
