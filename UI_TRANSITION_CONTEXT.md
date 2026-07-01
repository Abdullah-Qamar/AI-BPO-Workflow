# UI Transition Context

The previous transition is cancelled. The current screen presentation and design direction do not work and should not be continued.

## New Direction

Start the product interface from scratch.

Do not carry forward the current screen presentation.

Keep only:

- Primary navigation destinations.
- Property workspace to session navigation.
- Application workflows.
- State machine.
- Data contracts.

## Navigation To Retain

Primary routes:

- Dashboard: `#dashboard`
- Reconciliation: `#workspace`
- Properties: `#properties`

Secondary reconciliation navigation:

- Property workspaces are parent groups.
- Sessions are children of workspaces.
- Workspaces can be searched, sorted, expanded, collapsed, and used to start another run.
- Opening a session sets the selected property, selected session, cycle, workspace banks, and workspace route.

## Context For New Design

Use these documents:

- `PRODUCT.md`
- `VISUAL_DESIGN_CONTEXT.md`
- `RECONCILIATION_FLOW_HANDOFF.md`

Despite its filename, `VISUAL_DESIGN_CONTEXT.md` now contains architecture and navigation context only.
