# Typography

Part of the Tieout design system. Register: **product**. Type carries almost all
the information in this app, so this is the first subsystem to lock.

Tokens live in [`src/app/globals.css`](../../src/app/globals.css). This document
is the reasoning behind them and the rules for using them.

---

## 1. The face

```
--font-sans: "TASA Orbiter", var(--font-geist-sans), system-ui, sans-serif;
--font-mono: var(--font-geist-mono);
```

TASA Orbiter (Pangram Pangram) is the intended face. Geist Sans is the fallback.

**Known defect: TASA Orbiter does not currently render.** Verified in the running
app: `document.fonts` registers zero TASA Orbiter faces, and a width probe for
`"TASA Orbiter"` measures identically to a deliberately bogus family name, which
means it is falling through the stack. Every typographic judgement made in this
codebase so far has actually been made against Geist.

The cause is the loading strategy. `src/app/layout.tsx` pulls the face from
`api.fontshare.com` with a plain render-blocking `<link>`. That is a third-party
CDN request with no metric-matched fallback and no failure signal, so when it
does not arrive the app silently substitutes Geist and looks fine enough that
nobody notices.

Fix, in order:

1. Self-host the woff2 files under `public/fonts` and load through
   `next/font/local`, which gives preload hints and a generated metric-matched
   fallback. Drop the Fontshare `<link>`.
2. Ship weights **400, 500, 600** only. Weight 300 is requested today and used
   nowhere.
3. There is no italic. See the italic ban in section 8.

Until that lands, treat every size and leading below as tuned for Geist and
re-check the ramp once Orbiter actually renders. Orbiter is the wider face, so
expect to want slightly tighter tracking at the display end.

`font-feature-settings: "ss01" 1` is applied globally and is intentional
brand flavour. Keep it.

### Mono

Geist Mono is loaded and used in exactly one place: the design system page
itself. It appears nowhere in the product, and that is correct. Orbiter's
tabular figures handle column alignment (section 7), and a second family for
account numbers buys nothing. Reserve mono for machine identifiers such as
session and workspace IDs if those ever surface to users.

---

## 2. The ramp

Five text sizes and one figure size. `rem`, so the reader's own base font size
is honoured.

| Token | px | Ratio to previous | Role |
|---|---|---|---|
| `--type-meta` | 11 | | Labels, timestamps, badge text, captions |
| `--type-body` | 13 | 1.18 | **Default.** Row content, values, prose |
| `--type-title` | 16 | 1.23 | Card and section titles, tab labels |
| `--type-heading` | 20 | 1.25 | Panel and page headings |
| `--type-display` | 24 | 1.20 | Canvas h1 (the property address) |
| `--type-metric` | 32 | 1.33 | **Figures only.** See below |

### `--type-metric`, added 2026-08-27

The figures a screen is *about* — the Dashboard's accuracy and token readings —
and nothing else. It is not a heading size: no title anywhere may take it, and
it may not appear at two different levels of importance on one screen.

A **row of peers** is the case it was made for. Two readings set side by side and
read together are one pair; sizing one below the other would invent a hierarchy
that is not there. What is banned is a lead figure and a secondary figure both
claiming the size, or a second unrelated metric further down the page.

It exists because a lead metric is read as a quantity rather than as text. The
eye lands on it before it reads anything, and at `--type-display` it was the
same size as the page heading beside it, so the two competed for that first
landing. The fix is a step above display, not a heading demoted below it.

The guard against this becoming a sixth heading size is the rule, not the
token: **if it has a letter in it that is not a unit, it is not a metric.**
`90%`, `1.24M`, `204` qualify. "First-pass accuracy" is the label above it and
takes `.t-label`.

Every step is at least 1.18. That figure is the whole point: the audit found
sizes at 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 28 and 34, which is a
ratio of roughly 1.08 through the crowded middle. 14 next to 15 next to 16 is
not a hierarchy, it is noise that costs a reader effort without telling them
anything.

**13px is the body size, not 16px.** The general rule that body text should be
16px or larger is a prose rule. This is a dense reconciliation grid where an
accountant scans hundreds of rows, and density is a legitimate product-register
permission. What the rule correctly warns against is real here though: the
current app's most common size is 11 and 12px, which is too small for content
someone must actually read. The fix is not to inflate everything, it is to
reserve 11px for genuine metadata and move content up to 13.

**Nothing below 11px.** The old spec had a 10px badge and there is a stray 9px.
Sub-11px text in a financial product is an accessibility problem, and a badge is
not important enough to earn an exception.

---

## 3. Leading

Three tracks, unitless so they scale with the size token.

| Token | Value | Use |
|---|---|---|
| `--leading-ui` | 1.3 | Single-line UI text whose line box drives row height |
| `--leading-prose` | 1.55 | Multi-line running text |
| `--leading-tight` | 1.15 | Headings and display, 20px and up |

The audit found twenty distinct line-height values, with the same size getting
different leading in different files: 12px was set against 14, 15, 16 and 17px
leading; 13px against 16, 17 and 18px. That was not carelessness so much as an
unnamed distinction. The codebase was trying to serve two different needs with
one dimension.

Naming them fixes it. A bank row, a chip and a column header are single-line
text where the line box is really a layout measurement, and they want 1.3. An
exception reason, a reviewer note, an activity feed entry and empty-state
explanation are running text a person reads in sentences, and they want 1.55.
Ask which one you have, then use that token.

`--leading-prose` is the only track that needs a measure cap. `.t-prose` sets
`max-width: 68ch` for it.

---

## 4. Weight

| Token | Value | Role |
|---|---|---|
| `--weight-regular` | 400 | Body, all running text, data values |
| `--weight-medium` | 500 | Labels, column headers, active nav, card titles |
| `--weight-semibold` | 600 | Headings, display, the one leading number per card |

Across roughly 20,000 lines the audit found **nineteen** weight declarations.
Effectively the entire interface is 400. Hierarchy is being carried by size and
colour alone, and that is why the screens read flat and why sizes proliferated:
when weight is unavailable, the only way to make something look more important
is to make it bigger, so 15, 17, 18, 21 and 22 got invented one at a time.

The rule that replaces that habit:

> At a given size, step the **weight** or the **ink** to signal importance.
> Never introduce an intermediate size.

A workspace row and a session row are the same altitude. They were 18px and 16px.
They should both be `--type-title`, separated by weight and ink.

---

## 5. Tracking

Bound to size. Not chosen per call site.

| Token | Value | Applies at |
|---|---|---|
| `--tracking-display` | -0.015em | 20px and up |
| `--tracking-title` | -0.01em | 16px |
| `--tracking-body` | 0 | 13px |
| `--tracking-meta` | 0.01em | 11px |
| ~~`--tracking-caps`~~ | ~~0.06em~~ | Deprecated, see below |

Nine ad hoc values were in use, including four different tracking values on
uppercase labels (0.04, 0.05, 0.06 and 0.08em) for what is visually the same
element.

**Correction, 2026-08-22.** The first version of this spec locked uppercase
micro-labels as a role. That was wrong on two counts: the compact reference has no
uppercase text anywhere, and sentence case was already the user's stated preference
from 2026-06-28. All 8 uppercase sites are converted. Section labels now use
**`.t-label`** (11px, weight 500, tertiary ink, sentence case). `.t-caps` is
deprecated and `--tracking-caps` is unused.

---

## 6. Ink

Three levels. Text colour is part of typography, and this is where the audit
found an actual bug rather than an inconsistency.

| Token | Hex | vs card | vs chip | vs tab-active |
|---|---|---|---|---|
| `--ink-primary` | `#2c353e` | 11.76 | 11.22 | 10.50 |
| `--ink-secondary` | `#464f59` | 7.84 | 7.48 | 7.00 |
| `--ink-tertiary` | `#616a75` | 5.15 | 4.91 | 4.60 |

All three clear WCAG AA (4.5:1) on every common text surface, and they sit on an
even OKLCH lightness ramp (dL of about 0.10 per step) so the steps read as
evenly spaced rather than merely different.

**What was wrong.** There were six text colour tokens, and four of them
(`--text-2` `#627483`, `--text-3` `#63696e`, `--text-muted` `#656c76`,
`--text-placeholder` `#61717f`) sat inside a single 20% luminance band. They were
the same grey wearing four names. So the interface had two usable ink levels, not
the four it appeared to have, which is the other half of why the screens read
flat.

Worse, `--text-4` `#7f7f87` measured **3.74:1** on the card surface, below AA,
and it was the token used for 11px uppercase micro-labels. The smallest text in
the app had the weakest contrast.

**One remaining constraint.** `--ink-tertiary` measures 4.12 against
`--bg-side` `#dddfe8`, which is large-text-only. On the rails and side surfaces,
step up one ink level.

The old `--text-*` names are kept as aliases pointing at the new ramp so nothing
breaks. Migrate to `--ink-*` and delete them.

---

## 7. Numerals

This is a reconciliation product. Figures are the payload, so they get their own
rules rather than inheriting text defaults.

Body sets `lining-nums proportional-nums`. Numbers inside a sentence should set
like text.

`.nums` sets `tabular-nums lining-nums slashed-zero` and is for:

- money, in any position
- account numbers and masked last-four
- GL codes
- dates that appear in a column
- counts in badges
- anything that mutates in place, such as a progress percentage

> Any figure that sits in a column, or that changes without the layout
> changing, is tabular. Any figure inside a sentence is proportional.

Tabular figures stop digits shifting sideways as values update, which is
distracting in a progress readout and actively misleading in a column of
amounts. `slashed-zero` keeps 0 and O legible in masked account numbers, where
confusing them has real consequences.

`.nums-lead` is the figure a card is *about*: an unmatched total, a variance. It
adds weight 600 and display tracking. One per card, at most.

The instinct here was already right. `tabular-nums` appears 37 times in the
codebase. It was just applied by hand at each site rather than being part of the
system, so it is missing wherever someone forgot.

---

## 8. Rules and bans

**Use the role classes.** `.t-display` `.t-heading` `.t-title` `.t-body`
`.t-prose` `.t-meta` `.t-caps` each set size, leading, tracking and weight
together, so a role cannot be half-applied. Ink is separate because the same
role appears at different ink levels.

**No italic.** There are four `fontStyle: "italic"` uses today
(`DashboardCanvas.tsx:701`, `PropertiesCanvas.tsx:704` and `:1038`,
`AIQualityDetail.tsx:949`). The family ships no italic, so these render as
browser-synthesised oblique: a mechanical slant of the roman with wrong
letterforms and broken spacing. The dashboard session detail line is the most
visible instance. Replace with ink level or weight. The
`lastReconciled === "Never"` case in `PropertiesCanvas.tsx:1038` is using italic
to mean "no data", which `--ink-tertiary` says better.

**No synthesised bold.** The family has no 700. `font-weight: bold` and
`font-weight: 700` both synthesise. Use `--weight-semibold`.

**No gradient text.** `background-clip: text` on a gradient is a decorative
effect that carries no meaning. There are eight such utilities in `globals.css`
(`.text-grad-*` and the shimmer variants) used for agent status lines. Status is
already carried by the status dot and the label; the gradient is noise, and the
shimmer animates text colour to indicate "working" where a single solid colour
plus the existing dot would do. Slated for removal, tracked separately since it
touches the agents panel.

**No new sizes.** If something needs to feel more important, step weight or ink.

**Punctuation.** UI copy currently mixes separators: em dashes in
`"Wells Fargo ledger import failed — 3 files unreadable"`, a hyphen in
`"May 2026 - 2"`, and middots elsewhere. Standardise on the middot `·` for
inline separators and drop em dashes from product copy. Middot is already the
dominant pattern.

---

## 9. Role map

What each element uses. Ink in parentheses.

| Element | Role | Weight | Ink |
|---|---|---|---|
| Canvas h1 (property address) | `.t-display` (24) | 600 | primary |
| Page heading ("Dashboard") | `.t-heading` | 600 | primary |
| Panel title ("Workspaces") | `.t-heading` | 600 | primary |
| Card / section title | `.t-title` | 500 | primary |
| Workspace row | `.t-body` | 500 | primary |
| Session row | `.t-body` | 400 | primary |
| Tab label, active | `.t-body` | 500 | primary |
| Tab label, inactive | `.t-body` | 400 | tertiary |
| Row content, record title | `.t-body` | 400 | primary |
| Card field value | `.t-body` | 400 | primary |
| Card field label | `.t-meta` | 400 | tertiary |
| Amount in a row | `.t-body .nums` | 400 | primary |
| Card lead figure | `.t-title .nums-lead` | 600 | primary |
| Exception reason, reviewer note | `.t-prose` | 400 | secondary |
| Activity feed copy | `.t-prose` | 400 | secondary |
| Section eyebrow, note kind | `.t-label` | 500 | tertiary |
| Timestamp | `.t-meta .nums` | 400 | tertiary |
| Badge / counter | `.t-meta .nums` | 500 | varies |
| Placeholder | `.t-body` | 400 | tertiary |
| Button label | `.t-body` | 500 | inherits |

---

## 10. Migration

The tokens are additive and the old `--text-*` names still resolve, so nothing
is broken today. Migration is mechanical and can be done surface by surface.

Size mapping:

| Found | Goes to | Notes |
|---|---|---|
| 9, 10 | `--type-meta` | 11px floor |
| 11 | `--type-meta` | unchanged |
| **12** | `--type-meta` **or** `--type-body` | the judgement call, see below |
| 13 | `--type-body` | unchanged |
| 14, 15 | `--type-body` | down to 13 |
| 16, 17 | `--type-title` | |
| 18 | `--type-title` | down from 18; recover the emphasis with weight 500 |
| 20, 21, 22, 24 | `--type-heading` | |
| 28, 34 | `--type-display` | |

**The 12px split is the real work.** 12px is the single most common size in the
codebase, at 114 sites, and it has to divide between meta and body. The test:

> Is this something a person **reads**, or something they **refer to**?
>
> Read it, and it is `--type-body`. Refer to it (a label naming the thing next
> to it, a timestamp, a code, a count) and it is `--type-meta`.

Card field values are read. Card field labels are referred to. They are currently
both 12px, which is exactly the collapse this system is unwinding.

Suggested order, cheapest surface first:

1. `src/components/v2/*` (already closest to the system, uses 13px body)
2. `src/app/design-system/page.tsx` (the Typography section is now wrong and
   should render live tokens instead of a hardcoded seven-row table)
3. `DashboardCanvas.tsx`, `ReviewCanvas.tsx`
4. `PropertiesCanvas.tsx`, `AgentsPanel.tsx`, `AIQualityDetail.tsx`

---

## Appendix: audit numbers

Measured across `src/` at the time of writing.

- **16 distinct font sizes**: 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22,
  24, 28, 34. Top four (12, 11, 13, 14) account for 300 of about 360 uses.
  Seven sizes are used once or twice.
- **20 distinct line-heights**, ranging 12 to 38px, with the same font size
  taking three or four different values across files.
- **19 weight declarations total.** 400 (8), 600 (5), 500 (5), one conditional.
  Weight 300 is loaded and never used.
- **9 ad hoc letter-spacing values**, including four different values on
  uppercase labels.
- **6 text colour tokens**, of which four occupy one luminance band, and one
  (`--text-4`, used for the smallest text) fails WCAG AA at 3.74:1.
- **0 typography tokens.** Every value was an inline literal.
- `tabular-nums` applied 37 times by hand. `font-mono` used only in the design
  system page. 4 synthetic-italic uses. 8 gradient-text utilities.

---

## 11. Compact pass, 2026-08-22

The ramp above survived contact with the compact reference
(`Compact UI References/README.md`) almost intact, because the sizes were already
close. What changed is **usage** and everything around the type.

**Ramp:** only `--type-display` moved, 28px to 24px, matching the reference's
record title. The other four steps are unchanged.

**Usage, which is where the "large" feeling actually lived:**

| Element | Was | Now |
|---|---|---|
| Tab label | `--type-title` (16px) in a 37px pill | `--type-body` (13px) in a 28px pill |
| List row title | 16px | `--type-body` |
| Card / section title | 16px | `--type-title`, unchanged |
| Section label | uppercase 11px | `.t-label`, sentence case |

The rule: **`--type-title` is for card and section titles only.** List rows,
tabs, nav items and field values are all `--type-body`. Reaching for the title
step on a row is what made the app read a size larger than the reference.

**Density scale** now lives alongside the type tokens in `globals.css`:
`--control-sm/md/lg` (24/28/32, was 32/40/48), `--icon-sm/md/lg/mark`
(14/16/20/24, replacing an unmanaged 11 through 30), `--row-sm/md/lg` (28/32/44),
`--space-1..9`, and `--radius-control` / `--radius-row` at 8px.

**Canvas padding** went from `28px 60px` to `20px 32px`. That 28px of horizontal
padding was the single largest contributor to the roomy feel.

**Container paddings** all came down one step on the space scale.

### What this pass completed from the migration list

- Every `fontSize` literal in `src/components/**` is now a token. Zero remain.
- All 4 synthetic italics are gone, replaced by ink level.
- All 8 uppercase labels converted to sentence case.
- Icons collapsed from 12 distinct sizes to 14 / 16 / 20 / 24.
- The Lato fallback on the properties search input is gone.

---

## 12. QA cycle, 2026-08-22

A second pass against the same reference, looking for what the scripted migration
left behind. Everything below is fixed.

**Leadings, 201 sites.** Every px line-height in the product is now a token,
chosen by role and by measured ratio: `--leading-tight` for headings and display,
`--leading-prose` for the 25 sites whose ratio was already 1.45 or higher (real
running text, which the ui track would have flattened), `--leading-ui` for the
rest. 39 sites had been left stranded by the size remap, worst case an 11px label
on a 13px leading.

**Icon strokes, 73 sites.** There were **21 distinct size/stroke combinations**,
including eleven different weights at 14px, from hairline 1 to chunky 3. Now four:
14/1.75, 16/1.5, 20/1.5, 24/1.5, documented as `--stroke-sm` / `--stroke-md`.
Decorative SVG (WireConnector, NavGlyph, TieoutMark, PixelField, DotGridAvatar) is
exempt; that is artwork, not glyphs.

**Focus, the whole app.** There was **not one focus style anywhere**. Tailwind's
reset drops the UA outline and nothing replaced it, so every button and row was
invisible to a keyboard user. Added a `:focus-visible` ring on the existing accent
(`--dot-active`); pointer users never see it, so the mouse-driven design is
unchanged.

**Hit targets, 4 sites.** "Collapse workspaces" was 18x18 and the three status
legend chips were 17px tall with zero padding, all under the 24px floor. Grown to
`--control-sm` with negative margin so nothing moved visually.

**Off-scale controls, 10 sites.** `height: 35` appeared 8 times (month pickers,
search fields), plus a 30px icon button and a 36px rail item. All now
`--control-sm/md/lg`. Zero controls off the scale.

**Numerals.** The 37 raw `tabular-nums` utilities moved to `.nums`, which adds
`slashed-zero`. The two AI-quality figures were `--type-heading` at weight 400 with
*proportional* numerals; they are the number each metric is about and they change
in place, so they now take `.nums-lead`.

**Punctuation, 127 strings.** 105 short `label — qualifier` separators became
middots, matching the reference. 22 longer clause joins were repunctuated by hand
with colons, commas and periods, because a middot would have been wrong there. The
odd `"May 2026 - 2"` hyphen became `"May 2026 (2)"`. Code comments were left alone;
the ban is on UI copy. Zero em dashes remain in any user-visible string.

**Role drift.** Two headings were rendering at weight 500 and 400 against a spec of
600.

### Still open

- `src/app/design-system/page.tsx` is excluded from the migration and its
  Typography section still shows the old hardcoded 7-row table. It holds the last
  55 px line-heights and the last size literals.
- The 8 gradient-text utilities and the shimmer are still in place.
- TASA Orbiter still does not load. See section 1.
- The reference's labelled 278px sidebar is a navigation-model change, not a scale
  change, and was deliberately not adopted.

---

## 13. The numeral face: Host Grotesk

Figures render in **Host Grotesk**, self-hosted from `public/fonts` as a 20KB
variable woff2 (OFL, weights 300 to 800). Text keeps the sans stack.

**How it is applied.** Not per call site. An `@font-face` declares the family with
a `unicode-range` limited to numerals and their separators, and that family is
listed *first* in `--font-sans`:

```css
unicode-range: U+0030-0039, U+0024, U+0025, U+002B, U+002C, U+002E, U+2212;
```

Browsers resolve font families per codepoint, so every digit in the app renders in
Host Grotesk and every letter falls through to the text face. No markup changed, no
component sets a `font-family`, and numbers embedded in prose are covered too.
Mixed-family strings like `TH-1247` hold together because the metrics are close.

**Why this face suits a reconciliation product.** Measured, not assumed:

| Property | Host Grotesk | Text face (Geist) |
|---|---|---|
| Digit advance, weight 400 | 65.0 | 66.3 |
| Digit advance, weight 600 | **65.0** | **68.3** |
| Digit ascent | 71.2 | 72.6 |
| Cap height | 70 | 71 |

The second row is the important one. Host Grotesk's digits are natively uniform
width and **do not change width with weight**, so a bold total sitting under
regular rows keeps the column's right edge flush. The text face shifts 66.3 to
68.3, which would break it. Digits are also uniform width across 0 to 9 natively,
so alignment does not depend on `tabular-nums` at all.

**Why the separators are in the range.** A comma from the text face is 2.82px at
weight 400 and 3.148px at 600, so a bold row in a money column used to misalign by
about 0.66px even with the digits stable. Pulling comma, period, plus and
true-minus into the numeral face removes that: `$41,900.00` now measures 79.047px
at both weights.

The trade is that every comma and full stop in body copy is now Host Grotesk. At
11 to 13px, with metrics inside 2%, this is not perceptible; it was checked side by
side against the text face before committing. The hyphen `U+002D` is deliberately
excluded, because in this app it is a word-joiner ("auto-pay", "first-time") far
more often than a minus. Real negatives use `U+2212`.

**What was given up.** Host Grotesk has **no slashed zero**. Verified against the
binary: both `font-feature-settings: "zero" 1` and
`font-variant-numeric: slashed-zero` render the plain oval. Section 7 justified
slashed zero for masked account numbers, so that protection is gone; 0 and O are
now told apart by width alone, which the face does handle (its zero is a narrow
oval against a round cap O). `.nums` keeps the declaration because it still applies
to the fallback face.

**One thing to recheck.** The metric match was measured against the **Geist
fallback**, because TASA Orbiter does not currently load (section 1). Orbiter is the
wider face, so when it is finally wired up, re-measure the pairing and expect to
want a small `size-adjust` on the numeral face.
