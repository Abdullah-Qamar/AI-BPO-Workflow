# Design Reset Context

There is no approved visual direction for this application.

The current screen presentation and previous visual direction should not be used as a reference. Start the product interface from scratch.

## What To Preserve

Only preserve navigation and product behavior:

- Dashboard route: `#dashboard`
- Reconciliation workspace route: `#workspace`
- Properties route: `#properties`
- Primary navigation with Dashboard, Reconciliation, and Properties.
- Reconciliation navigation where property workspaces group monthly sessions.
- Session creation and opening flows.
- Property setup and CSV import.
- Reconciliation lifecycle and state machine.
- Record review, movement, comments, and final posting workflow.
- Data contracts documented in `PRODUCT.md` and `RECONCILIATION_FLOW_HANDOFF.md`.

## What Not To Preserve

Do not preserve the current screen presentation or any prior external brand analysis.

## Navigation Contract

Primary destinations:

- Dashboard
- Reconciliation
- Properties

Reconciliation navigation:

- Property workspaces are parent groups.
- Sessions are children of a property workspace.
- A workspace can contain multiple monthly sessions.
- Workspaces can be searched, sorted, expanded, and collapsed.
- A workspace can start a new session for its property.
- Opening a session sets the active property, active cycle, active workspace banks, and the `#workspace` route.

## Context Files For The Next Design

Use these as the source of truth:

- `PRODUCT.md`
- `VISUAL_DESIGN_CONTEXT.md`
- `RECONCILIATION_FLOW_HANDOFF.md`
- `UI_TRANSITION_CONTEXT.md`

Despite the filename, `VISUAL_DESIGN_CONTEXT.md` now contains non-visual architecture and navigation context only.
