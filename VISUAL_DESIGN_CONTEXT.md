# Application Architecture And Navigation Context

This file intentionally replaces the old visual design context. The current screen presentation and design direction are not valid design inputs. Use this document to understand how the application works before designing a new interface from scratch.

Do not use this file for presentation guidance. The only screen concept retained here is navigation.

## Source Of Truth

- Product and architecture context: `PRODUCT.md`
- Reconciliation workflow contract: `RECONCILIATION_FLOW_HANDOFF.md`
- Implementation surface: the Next.js app under `app/` (App Router, Tailwind, GSAP). There is no prior implementation to reference for design.

## Navigation To Preserve

The app has three hash routes:

- `#dashboard`
- `#workspace`
- `#properties`

Primary navigation should keep these destinations:

- Dashboard
- Reconciliation
- Properties

Reconciliation navigation should keep the property workspace model:

- Properties are the parent workspace grouping.
- Sessions belong to a property workspace.
- A workspace can have multiple monthly sessions.
- Workspaces can be searched.
- Workspaces can be sorted by latest month, oldest month, status, or property.
- Workspaces can be expanded and collapsed.
- Starting a new run from a workspace uses that workspace property.
- Opening a session selects the session property and moves to `#workspace`.

Navigation selection rules:

- Dashboard and Properties own their own selected route state.
- Reconciliation owns the selected session state.
- Workspace expansion should not be treated as session selection.
- The active session should remain discoverable under its property workspace.

## Product Architecture

The app is a single React POC with local state in `App`.

Core state groups:

- `sessions`: monthly reconciliation sessions.
- `properties`: property setup and bank mappings.
- `selectedSession`: active session ID.
- `selectedProperty`: active property object.
- `cycle`: selected accounting period.
- `uploaded`: statement upload state by workspace bank ID.
- `ledgerUploads`: ledger upload state by workspace bank ID.
- `bankStage`: current processing stage by workspace bank ID.
- `recordsByBank`: approved and exception buckets by workspace bank ID.
- `comparisonProgress`: simulated reconciliation progress by workspace bank ID.
- `events`: run event stream.
- `runState`: current lifecycle state.
- `activeStep`: current automation step.
- `reviewBankId`: bank currently open for record review.
- `yardiProgress`: simulated final posting progress.

Derived state:

- `workspaceBanks` comes from `selectedProperty.banks`.
- `uploadedBanks` filters workspace banks by uploaded statement state.
- `runBanks` are uploaded banks when any exist, otherwise all workspace banks.
- `runTotals` aggregates approved, exception, and bank counts.

## Product Workflow

1. Property setup

Users maintain properties and bank mappings. Properties can be created manually or imported from CSV. CSV import consolidates repeated property rows and merges bank-account mappings.

2. Session start

Creating a session generates a property-scoped workspace ID, stores the period, selects the property, resets run state, and opens the workspace route.

3. Input collection

Users upload bank statements and optional ledger files. Uploads are mocked. The app tracks statement and ledger readiness by bank.

4. Automation run

Starting reconciliation moves the run from `draft` to `running`. Timed mock steps represent Yardi access, ledger extraction, parsing, normalization, artifact save, and handoff.

5. Matching

The run moves to `reconciling`. Bank comparisons progress in parallel. Seeded reconciliation data produces approved and exception buckets.

6. Review

The run moves to `review`. Users can open bank review, move records between approved and exception buckets, bulk move selected records, and add comments.

7. Posting

The user starts final posting. The run moves to `updating-yardi`, then `complete` after mocked posting and report generation.

## Data Contracts

Property:

```js
{
  id,
  code,
  ledgerPropertyId,
  legalEntity,
  name,
  address,
  market,
  type,
  units,
  owner,
  accountant,
  ledgerSource,
  fiscalCalendar,
  period,
  closeStatus,
  openItems,
  exceptions,
  tieOut,
  lastReconciled,
  banks
}
```

Bank mapping:

```js
{
  id,
  name,
  type,
  account,
  gl,
  bankId
}
```

Session:

```js
{
  id,
  workspaceId,
  propertyId,
  property,
  cycle,
  status,
  detail
}
```

Record:

```js
{
  id,
  title,
  date,
  amount,
  meta,
  confidence,
  reason,
  evidence,
  comments,
  guidanceCaptured
}
```

Event:

```js
{
  id,
  type,
  title,
  copy,
  at
}
```

## Redesign Constraints

For the next design pass:

- Start the product screens from scratch.
- Do not preserve the current screen presentation.
- Preserve the navigation model and product behavior.
- Treat the current React implementation as a behavior prototype, not a design prototype.
