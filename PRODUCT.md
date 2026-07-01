# Product Context

## Register

product

## Purpose

This is a property-accounting reconciliation agent for monthly bank close work. It helps an accounting team prepare property-specific reconciliation sessions, collect bank statements and ledger exports, compare bank activity to Yardi or manual ledger activity, review exceptions, and post approved results back to Yardi.

The current visual implementation is not a source of truth. Future product design should start from scratch. Preserve only the navigation model, product workflows, state model, and data contracts described here.

## Users

- Property accountants who prepare monthly close packages.
- Controllers who review exceptions and approve posting.
- Operations or implementation users who maintain property and bank-account mappings.

## Navigation Model

Navigation is the only screen structure that should be retained.

- `#dashboard`: portfolio/session overview.
- `#workspace`: active reconciliation session.
- `#properties`: property and bank-account setup.

Primary navigation should expose those three destinations only:

- Dashboard
- Reconciliation
- Properties

Reconciliation has a secondary navigation concept:

- Property workspaces group reconciliation sessions.
- A workspace belongs to one property.
- Sessions sit under their property workspace.
- Workspace groups support search, sorting, expansion, and starting a new run for that property.
- The selected session is the active child. Workspace expansion is separate from selection.

Session entry points:

- Dashboard row can open a session.
- Reconciliation workspace session row can open a session.
- Properties can start a session for the selected property.
- New session flow starts by selecting a property.

## Core Objects

Property:

- Property identity: code, ledger property ID, legal entity, name, address, market, asset type, units, owner, accountant.
- Accounting setup: ledger source, fiscal calendar, period, close status, open items, exceptions, tie-out state, last reconciled date.
- Bank mappings: one or more associated bank accounts.

Bank account mapping:

- Bank name.
- Account purpose/type.
- Masked account or last four.
- Cash GL account.
- Optional external bank ID.

Session:

- Session ID.
- Workspace ID.
- Property ID.
- Property address label.
- Accounting period.
- Status.
- Detail text.

Workspace bank:

- Derived from a property bank mapping.
- Enriched with mock bank logo/template data while the app remains a POC.
- Carries a reconciliation key so property-specific bank IDs can map back to mocked reconciliation seeds.

Reconciliation record:

- Title, date, amount, metadata, confidence, reason, evidence list, comments, optional guidance marker.

Event:

- User, system, or agent event.
- Title, copy, timestamp label.

## Application Workflow

1. Maintain properties

Users create, edit, delete, or import properties. CSV import may arrive as one row per property or one row per property-bank account. Imported rows merge by property code, address, or name. Bank mappings dedupe by bank name, account type, account, GL, and bank ID.

2. Start or open a session

A session is property-scoped. Opening or creating a session selects its property, derives workspace banks, resets run state, and moves to `#workspace`.

3. Prepare inputs

The session starts in `draft`. Users upload at least one bank statement. Ledger upload is simulated and attached per uploaded bank. The current POC does not process real files beyond CSV property import.

4. Run reconciliation

Starting the run locks the selected inputs. Mock automation steps simulate Yardi access, ledger import, parsing, normalization, artifact save, and handoff to reconciliation.

5. Compare records

The app moves to `reconciling`. Each active bank gets mocked approved and exception buckets from the reconciliation seed. Progress is simulated per bank.

6. Review exceptions

The app moves to `review`. Users can open a bank review, inspect approved and exception records, move individual or selected records between buckets, and add comments. Comments represent reviewer feedback and may mark guidance as captured.

7. Post to Yardi

After review, the user starts the Yardi update. The app moves to `updating-yardi`, simulates posting approved records, flagging exceptions, and preparing report artifacts.

8. Complete session

The app moves to `complete`. Approved, exception, and bank totals remain available as run output. Final artifacts are mocked.

## State Model

Run states:

```js
"draft"
"running"
"reconciling"
"review"
"updating-yardi"
"complete"
```

Bank stages:

```js
"waiting"
"uploading"
"scanning"
"statement-ready"
"ledger-importing"
"ledger-imported"
"parsing"
"normalizing"
"normalized"
"comparing"
"review"
"complete"
"excluded"
```

Session statuses used by navigation and dashboard summaries:

```js
"Draft"
"Importing"
"Parsing"
"Reconciling"
"Needs input"
"Needs review"
"Ready for handoff"
"Updating"
"Complete"
```

Agent roles:

- Intake: statement and ledger intake, normalization, artifact preparation.
- Reconciliation: matching bank activity to ledger records.
- Exception: exception grouping, record reasoning, reviewer guidance capture.
- Summary: posting output, exception flags, reporting artifacts.

## Implementation Boundaries

- Current app is a Next.js 15 (App Router) React POC, scaffolded under `app/`.
- Styling is built on Tailwind CSS. Animation is built on GSAP.
- Data is seeded in memory. There is no backend persistence.
- Timed effects (setTimeout / setInterval / GSAP timelines) simulate automation.
- CSV property import is the only real file parsing path.
- Bank statement and ledger upload behavior is mocked.
- Yardi posting is mocked.

## Redesign Rule

Start visual design from scratch. Do not preserve the current screen presentation. Preserve only:

- Hash routes.
- Primary navigation destinations.
- Property workspace to session navigation.
- Product workflow.
- State machine.
- Data contracts.
