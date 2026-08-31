# Consistency contract — 2026-08-26

The single set of answers for things the app previously said more than one way.
Everything here is **binding**: if a component disagrees, the component is wrong.

Scope of the pass: **V1 only** (`/`). `/v2` is a parked experiment and is not
touched.

---

## 1. Vocabulary

One word per concept. These are user-visible strings.

| Concept | The word | Never |
|---|---|---|
| One reconciliation of one property for one cycle | **Session** | Run, Job |
| The place sessions happen (rail item, page title) | **Reconciliation** | Workspace |
| The accounting period | **Cycle** | Period, Month |
| A reconciled line item | **Record** | Transaction, Line |
| Records the agent matched | **Matched** | Reconciled, Tied |
| Records the agent could not settle (`records − matched`) | **Exception** | Flagged, Unapproved |
| The subset of exceptions still unresolved right now | **Open** | Outstanding, Unmatched |
| A bank account linked to a property | **Account** | Bank mapping |
| The bank institution itself | **Bank** | Institution (UI copy) |
| The uploaded PDF | **Statement** | Document |
| The Yardi export | **Ledger** | GL export |

`Open ⊆ Exceptions ⊆ Records`. Exceptions is what the agent handed back this
run; Open is how much of that is still sitting there. A completed session has
exceptions and zero open — that is what "completed" means. A failed session has
matched 0, so every record is an exception and every exception is open.

### Status labels

| State | Label | Everywhere |
|---|---|---|
| finished and posted | **Completed** | tabs, chips, filters, session rows |
| waiting on a person | **Review** | |
| in flight | **Active** | |
| broke | **Failed** | |
| never run | **Not started** | |

"Complete", "Done", "Posted", "Closed", "Needs attention", "Needs review",
"Need review", "Running" are all retired as *status labels*. ("Posting to
Yardi" as an agent's present-tense action line is not a status label and stays.)

### Punctuation

No em dashes in user-visible strings, `aria-label`s included. Use `·` for
apposition and `—` never. Session labels that need disambiguating read
`May 2026 · Re-run`, not `May 2026 (2)` and not `May 2026 — 2`.

---

## 2. Controls

### Buttons

`ui/Button` is the only button chrome. Variants `primary | secondary | ghost`,
sizes `sm | md | lg` → 24 / 28 / 32px, **radius 999 for all of them**.

- No hand-rolled `<button>` with its own padding/radius/fill for anything that
  is conceptually a button. `QuietButton` and the square primaries are gone.
- **Every button label is `--type-body` (13px)**, at every size. The three sizes
  differ by height and padding, not by type. The rule used to read "no label
  below 13px, and `sm` is 12px and is the floor", which contradicted itself and
  named a step the ramp does not have — `sm` was in fact shipping 11px, the size
  reserved for genuine metadata. A button label is not metadata.
- No control height outside `--control-sm/md/lg` (24/28/32). The 33px, 35px,
  36px and 40px one-offs are gone.

Icon-only → `ui/IconButton`, same three diameters.

### Tabs

One tab strip recipe, the Dashboard's: height `--control-md`, radius
`--radius-control`, label `--type-body`, active = `--surface-tab-active` +
`1px solid #FFFFFF` + `--shadow-chip`, inactive = transparent. Counts ride
alongside at `--type-meta`.

### Cycle picker

`ui/CyclePicker` on every screen scoped to a cycle. A chevron is a promise —
there is no such thing as a decorative one.

### Popovers, menus and tooltips

Every floating surface is frosted glass: the class **`.glass`**, plus
`borderRadius: var(--radius-sheet)` and `padding: 4`. It carries its own fill,
blur, border and shadow, so a call site sets none of those. Menu-row hover is
`rgba(255, 255, 255, 0.72)`, not an opaque fill, or it covers the frost it is
sitting on.

**`.glass-raised`** is the second tier, for something that must read as lifted
off its own card rather than off the page — the AI page's token bar.

A floating surface says "I am above what you were looking at, and you have not
lost it" by letting the backdrop show through, blurred. An opaque white sheet
says "I am another card that happens to be on top."

Outside-click **and** Escape, both, always.

### Modals

`ui/Overlay` + `ui/OverlayCard`. Scrim `--scrim`, card radius
`--radius-panel`, shadow `--shadow-depth-4`. No bespoke gradients or
hand-rolled backdrops.

### Disabled

`ui/Button` and `ui/IconButton` set the real DOM `disabled` attribute. A
control that looks disabled must be out of the tab order.

---

## 3. Surfaces

| Role | Radius | Fill | Border | Shadow |
|---|---|---|---|---|
| Panel / rail / modal card | `--radius-panel` (20) | `--surface-card` | none | `--shadow-depth-2` |
| Content card on canvas | `--radius-card` (12) | `--surface-card` | none | `--shadow-card` |
| Bright inner sheet inside a card | `--radius-sheet` (10) | `--surface-list` | none | `--shadow-depth-1` |
| Row inside a sheet | `--radius-row` (8) | transparent | transparent | none |
| Chip / control | `--radius-control` (8) or 999 | `--surface-control` | `#FFFFFF` | `--shadow-chip` |

16px and 14px card radii are retired — both become `--radius-card`.

### Listing rows

One hover, everywhere: lift to `#FFFFFF`, `1px solid var(--line-row-hover)`,
`--shadow-chip`, radius `--radius-row`. The resting border is transparent so
nothing shifts. `--surface-row-hover` is retired.

### Canvas gutters

One class, `.canvas-pad`, on every canvas: 40 / 32 / 24px horizontally as the
viewport steps down. Widening it there widens all five screens together. No
canvas may add its own horizontal padding on its outermost content column.

### Table headers

Labels only. No leading glyphs on column headers: they were the loudest thing
in the band meant to be the quietest, and they cost each column ~20px of width
the figures below wanted. Column widths are measured against the label alone.

### Dashed borders

None. Hover paints `1px solid var(--line)`; drag-over paints
`1px solid var(--dot-active)`.

---

## 4. Colour

### Status

Use the semantic pairs, never a raw hex:

| Meaning | ink | fill | mark |
|---|---|---|---|
| ok / completed | `--status-ok-ink` | `--status-ok-bg` | `--status-ok` |
| review / open | `--status-warn-ink` | `--status-warn-bg` | `--status-warn` |
| failed / exception | `--status-danger-ink` | `--status-danger-bg` | `--status-danger` |
| active / in flight | `--status-info-ink` | `--status-info-bg` | `--status-info` |
| not started | `--ink-tertiary` | `--surface-control` | `--line` |

The five greens (`#1EFF00`, `#2FA35F`, `#22C55E`, `#4B7F63`, `#1A7048`), three
ambers and four reds collapse into these. `--dot-active/failed/complete` remain
as the *mark* aliases only.

### Agent identity

Agents are identified by `--agent-intake`, `--agent-reconciliation`,
`--agent-summary`. **Status colours must never be reused as agent identity** —
a red dot beside "Summary" reads as a failure in a UI where red means failed.

There are **three** agents: Intake, Reconciliation, Summary. Every surface
shows the same three.

### Ink

`--ink-primary / --ink-secondary / --ink-tertiary` only. The literals
`#7F7F87` (fails AA at 3.74:1), `#43484E`, `#63696E`, `#656C76`, `#464A51`,
`#111827`, `#6B7280`, `#818893` are retired, as are the `--text-*` aliases.

---

## 5. Typography

Five text sizes, three leadings, three weights, plus `--type-metric` (32px) for
lead figures only — `docs/design-system/typography.md`. No numeric `fontSize`.
Nothing below `--type-meta` (11px).

Prefer the role classes (`.t-display`, `.t-heading`, `.t-title`, `.t-body`,
`.t-prose`, `.t-meta`, `.t-label`) over re-assembling the bundle inline: a role
set by class can never be half-applied.

Page and canvas `<h1>` is `.t-display` — **semibold**, with
`--tracking-display`. Panel headings are `.t-heading`, also semibold. The
400-weight headings in MainCanvas and ReviewCanvas were the outliers.

`--leading-prose` is for running text only. A single line that truncates takes
`--leading-ui`.

---

## 6. Icons

Lucide only. Four pairings, nothing else: **14/1.75, 16/1.5, 20/1.5, 24/1.5**.
No `strokeWidth={2}`, no 12/13/15/18/22px glyphs.

| Concept | Glyph |
|---|---|
| Open / unresolved | `CircleAlert` |
| Exception | `TriangleAlert` |
| Completed | `Check` |
| Disclosure | `ChevronRight` / `ChevronDown` |
| Panel collapse / expand | `PanelLeftClose` / `PanelLeftOpen` |
| Upload target (dropzone) | `FileUp` |
| Upload action | `Upload` |

`AlertCircle` is the deprecated alias of `CircleAlert` — use the current name.

---

## 7. Data invariants

Enforced in `src/lib/seed.ts`; no surface may restate them differently.

- `matched + exceptions = records`, and `open ≤ exceptions`, for every session.
  A completed session has `open = 0`; a failed one has `matched = 0`.
- A property's current state is derived from its newest session in the selected
  cycle. No session in that cycle → **Not started**.
- `sessionCount` / `bankCount` / `meta` are derived from the arrays they count.
- One cycle per session: statements cover it, the ledger exports just after it,
  and the records are dated inside it.
- One legal entity, one GL chart, one set of account purposes per property.

---

## 8. Workspace layouts

The reconciliation canvas has **two** layouts and a switcher in its header:

- **Statement and ledger pairs** — the original. One full-width row per account:
  statement card, wire, ledger card.
- **One card per account** — a wrapping grid. Identity stated once per card, the
  two document slots as two halves of one sheet, and the claim that they get
  compared carried on the seam between them rather than by a wire.

Two, not three. Variation 1 must keep rendering exactly as it does; a change
that improves the grid at its expense belongs in a separate pass.

---

## 9. Failure copy

A failed session's `note` is written by the SYSTEM, in the register of a log
line: two or three words naming the fault, no counts, no narration.

> "Ledger export timed out", not "The Yardi export did not complete in time, so
> 2 of 2 accounts could not be read."

A failure is raised by the pipeline before any agent has an opinion. Copy that
reads as though something reasoned about it claims a diagnosis nothing
performed.

Distinguish the two failures that sound alike: an **exception** is a record the
agent could not settle; an **unclassified file** is one it could not identify at
all, a stage earlier.
