# Reconciliation Flow Handoff
 
## Purpose

This document is the non-visual handoff for the reconciliation agent POC. It captures how the application works, what data it uses, how navigation should behave, and which contracts a scratch redesign must preserve.

The current screen presentation is not a design reference. Preserve navigation and behavior only.

## Current Build

- App type: Next.js 15 (App Router), React, GSAP, Tailwind CSS, lucide-react. Scaffolded under `app/`.
- No prior screen presentation is preserved.
- Local run command: `cd app && npm run dev`.
- Build verification: `cd app && npm run build`.

## Navigation Contract

Hash routes:

- `#dashboard`: portfolio/session overview.
- `#workspace`: selected reconciliation session.
- `#properties`: property setup and bank mapping management.

Primary nav destinations:

- Dashboard
- Reconciliation
- Properties

Reconciliation nav:

- Groups sessions by property workspace.
- Uses property address as the durable workspace label.
- Keeps session children under the property.
- Supports workspace search.
- Supports sort modes: latest month, oldest month, status, property.
- Supports expand/collapse.
- Keeps active workspace expanded.
- Allows starting a new monthly run from the workspace property.

Session navigation effects:

- Selecting a session resolves its property.
- The selected property becomes active.
- Workspace banks are derived from that property.
- Run state resets to `draft`.
- Events reset to a new "session ready" event.
- Route changes to `#workspace`.

Property navigation effects:

- Selecting a property changes `selectedProperty`.
- Starting a session from Properties creates a session for that property and opens `#workspace`.

New session flow:

- Opens from primary nav or dashboard.
- User selects a property.
- App creates a new session with a generated workspace ID.
- App opens `#workspace`.

## Application State Ownership

`App` owns all state. There is no backend, store library, router library, or persistence layer.

Primary state:

- `sessions`: list of reconciliation sessions.
- `properties`: list of property records.
- `selectedSession`: active session ID.
- `selectedProperty`: active property.
- `railOpen`: current POC observability visibility, not a required redesign pattern.
- `cycle`: active accounting period.
- `uploaded`: statement readiness by bank ID.
- `ledgerUploads`: ledger readiness by bank ID.
- `events`: run events.
- `runState`: lifecycle state.
- `activeStep`: current automation step.
- `bankStage`: per-bank processing stage.
- `comparisonProgress`: per-bank comparison progress.
- `recordsByBank`: approved and exception records by bank ID.
- `reviewBankId`: selected bank for record review.
- `yardiProgress`: final posting progress.
- `yardiStepIndex`: current final posting step.
- `newSessionOpen`: new-session picker state.

Derived state:

- `workspaceBanks = getWorkspaceBanks(selectedProperty)`.
- `uploadedBanks = workspaceBanks.filter(uploaded[bank.id])`.
- `runBanks = uploadedBanks.length > 0 ? uploadedBanks : workspaceBanks`.
- `reviewBank = workspaceBanks.find(bank.id === reviewBankId)`.
- `runTotals = getRunTotals(recordsByBank, runBanks)`.

## State Machine

Run states:

```js
"draft"
"running"
"reconciling"
"review"
"updating-yardi"
"complete"
```

Meanings:

- `draft`: session is open and inputs can be prepared.
- `running`: mocked Yardi import, parsing, normalization, and artifact save are running.
- `reconciling`: mocked comparison is running per active bank.
- `review`: approved and exception buckets are ready for reviewer action.
- `updating-yardi`: approved records and exception flags are being posted through mocked Yardi work.
- `complete`: posting and report artifact generation are complete.

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

Automation step keys:

```js
"yardi-queued"
"yardi-login"
"ledgers-found"
"parsing-started"
"normalizing-chase"
"normalizing-wells"
"normalizing-boa"
"artifacts-saved"
"handoff"
```

Final posting steps:

```js
"Verifying target records in Yardi"
"Posting approved records"
"Flagging exceptions"
"Preparing report package"
```

## Workflow Contract

1. Property setup

Properties can be created, edited, deleted, or imported from CSV. Manual property creation captures identity, accounting setup, and bank mappings. CSV import groups repeated property rows and merges bank mappings.

2. Session creation

`createSession(propertyOverride)` creates a session for the selected or supplied property. It generates a workspace ID, stores property ID/address, sets cycle, status, and detail, selects the new session, selects the property, closes the new-session picker, routes to workspace, and resets run state.

3. Session opening

`openDashboardSession(session)` resolves the session property, selects session and property, resets run state with that property's banks, sets the cycle, and opens workspace.

4. Input preparation

`uploadStatement(bankId)` simulates statement upload and sets that bank to `statement-ready`. `removeStatement(bankId)` clears statement and ledger state for that bank. `uploadLedger(bankId)` simulates a ledger pair only after the statement exists.

5. Reconciliation start

`startRun()` requires at least one uploaded bank and `runState === "draft"`. It moves to `running`, marks active banks as importing, and appends a run-start event.

6. Mock automation

When `runState === "running"`, an effect walks through `automationSteps`. It updates `activeStep`, appends events, mutates session status/detail, and updates bank stages. The last step moves the app to `reconciling`.

7. Mock comparison

When `runState === "reconciling"`, an effect resets comparison progress, marks active banks as comparing, increments progress, then marks active banks ready for review and moves run state to `review`.

8. Record review

`openReview(bankId)` opens review only during `review` or `complete`. `moveRecord` and `moveSelectedRecords` move records between approved and exception arrays. `addRecordComment` appends a comment and marks guidance captured.

9. Final posting

`startYardiUpdate()` moves to `updating-yardi`, updates the active session, appends a posting event, and starts final posting progress. A completion effect eventually moves to `complete`.

10. Reset behavior

Changing sessions or creating a session calls `resetWorkspaceRun(targetBanks, event)`. It clears uploads, ledgers, records, progress, review selection, final posting state, events, run state, bank stages, and active step.

## Data Contracts

Property:

```js
{
  id: string,
  code: string,
  ledgerPropertyId: string,
  legalEntity: string,
  name: string,
  address: string,
  market: string,
  type: string,
  units: number,
  owner: string,
  accountant: string,
  ledgerSource: "Yardi" | "Manual" | "Hybrid" | string,
  fiscalCalendar: string,
  period: string,
  closeStatus: string,
  openItems: number,
  exceptions: number,
  tieOut: string,
  lastReconciled: string,
  banks: BankMapping[]
}
```

Bank mapping:

```js
{
  id: string,
  name: string,
  type: string,
  account: string,
  gl: string,
  bankId: string
}
```

Session:

```js
{
  id: string,
  workspaceId: string,
  propertyId: string,
  property: string,
  cycle: string,
  status: string,
  detail: string
}
```

Workspace bank:

```js
{
  id: string,
  name: string,
  shortName: string,
  brandClass: string,
  logo: string,
  account: string,
  statement: string,
  ledger: string,
  transactions: number,
  inflow: string,
  outflow: string,
  balance: string,
  confidence: string,
  type: string,
  gl: string,
  bankId: string,
  reconciliationKey: string
}
```

Reconciliation bank bucket:

```js
{
  statementTotal: string,
  ledgerTotal: string,
  netDifference: string,
  matchRate: string,
  approved: RecordItem[],
  exceptions: RecordItem[]
}
```

Record item:

```js
{
  id: string,
  title: string,
  date: string,
  amount: string,
  meta: string,
  confidence: string,
  reason: string,
  evidence: string[],
  comments: CommentItem[],
  guidanceCaptured?: boolean
}
```

Comment:

```js
{
  author: string,
  copy: string,
  at: "now" | string
}
```

Event:

```js
{
  id: string,
  type: "user" | "system" | "agent",
  title: string,
  copy: string,
  at: "now" | string
}
```

## CSV Import Contract

Accepted property columns include common variants:

- `property_name`, `name`, `property`
- `address`, `property_address`, `street_address`
- `property_code`, `code`, `property_id`
- `ledger_property_id`, `yardi_property_id`, `external_property_id`, `pms_property_id`
- `legal_entity`, `entity`, `ownership_entity`
- `market`, `region`, `city`
- `property_type`, `asset_type`, `type`
- `units`, `unit_count`, `doors`
- `owner`, `ownership_group`, `client`
- `accountant`, `property_accountant`, `controller`
- `ledger_source`, `pms`, `accounting_system`
- `fiscal_calendar`, `fiscal_year`, `calendar`
- `period`, `current_period`, `close_period`
- `close_status`, `status`
- `open_items`, `prior_open_items`
- `exceptions`, `exception_count`
- `tie_out`, `tieout`, `reconciliation_status`
- `last_reconciled`, `last_close`, `last_close_date`

Accepted bank columns include:

- `bank_accounts`, `banks`, `associated_banks`
- `bank_name`, `bank`, `financial_institution`
- `bank_type`, `account_type`, `cash_account_type`
- `bank_account_last4`, `account_last4`, `bank_account`, `account`
- `gl_account`, `cash_gl`, `cash_account_gl`, `gl`
- `bank_id`, `bank_identifier`, `external_bank_id`, `aba_id`

Bank-account text can also be parsed from semicolon or newline-separated values. Pipe-delimited rows can carry bank, purpose, account, GL, and bank ID.

## Agent Contract

Intake:

- Tracks statement upload, statement scanning, Yardi ledger extraction, normalization, and handoff.

Reconciliation:

- Tracks comparison of bank rows to ledger rows.
- Produces approved and exception buckets.

Exception:

- Tracks review package assembly, reasoning/evidence, comments, and guidance capture.

Summary:

- Tracks review summary, Yardi updates, exception flags, and report artifacts.

Agent names and responsibilities can be redesigned, but the workflow responsibilities must remain represented somewhere in the product.

## Scratch Redesign Guardrails

Do not preserve current screen patterns. Preserve only these things:

- The three route destinations.
- Property workspace to session navigation.
- Property setup and CSV import workflow.
- Session lifecycle.
- Reconciliation state machine.
- Record movement/comment behavior.
- Final posting workflow.
- Data contracts.

The next design can invent a new layout, new information hierarchy, new components, and new presentation of the same product behavior.

## QA Checklist For Behavior

- `npm run build` passes.
- Dashboard route loads.
- Workspace route loads.
- Properties route loads.
- Creating a session selects the property and opens workspace.
- Opening an existing session resolves the correct property.
- Property CSV import merges repeated property rows and dedupes bank mappings.
- Statement upload changes the bank to ready.
- Removing a statement clears related ledger state.
- Ledger upload is blocked until statement upload exists.
- Starting reconciliation requires uploaded bank input.
- Running state advances through mocked automation.
- Reconciliation state advances into review.
- Review can open only in review or complete states.
- Records can move between approved and exception lists.
- Comments attach to records and mark guidance captured.
- Yardi update advances to complete.
- Navigation remains usable across all states.
