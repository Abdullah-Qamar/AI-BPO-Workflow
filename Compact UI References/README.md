# Compact UI References

Source: three screenshots of **Lightfield** (a CRM-style workspace app) provided by
the user on **2026-08-22**, as the density direction for Tieout.

> **The three PNGs are not in this folder.** They arrived as images in the chat and
> were never written to disk, so I could not copy the bitmaps. Please drop them in
> here as `01-skills-empty.png`, `02-tasks-filtered.png`, `03-opportunity-detail.png`
> to match the notes below. Everything measurable has been transcribed, so the
> reference survives without them.

## What the user asked for

> "Current design is large, meanwhile the attached screenshots shows compact
> design, we will be moving towards this direction."

In scope: **typography scale and usage, layout spacing, icons, button scale, tab
scale.** Explicitly out of scope: **colours and drop shadows stay as they are.**

## The three frames

**01 — Skills, empty state.** Left sidebar plus a second 333px list column plus an
empty canvas. Centred-block empty state: ~15px semibold title, two lines of ~13px
grey body, then two bordered buttons side by side.

**02 — Tasks, filtered to zero.** Header row with a page icon, title, a view tab
("All") and a `+`. Below it a filter bar: two small icon buttons, then a segmented
filter chip reading `Status | is any of | 2 values | ×`. Right side has a `Display`
button. Empty state is one line of ~13px grey plus a `Clear filters` button.

**03 — Opportunity detail.** The dense one. Breadcrumb with brand mark, then a
6-tab bar (Overview / Contacts / Meetings / Tasks / Notes / Files), each tab an
icon plus label. Main column: 40px record mark, ~12px "Opportunity" eyebrow, ~26px
record title, then labelled sections (Opportunity summary, Upcoming meetings, Open
tasks, Activity) each with a right-aligned "See all". Right panel is a 449px
details rail: icon + label + value rows, then stacked sections (Opportunity Roles,
Lists, Meetings, Tasks, Notes).

## Measured values

Read off the frames at roughly 2000px logical width. Confirmed 1x, not 2x: at 2x
the nav labels would compute to ~7px, which is impossible.

| Element | Reference | Tieout before | Tieout now |
|---|---|---|---|
| Sidebar width | 278px (labelled) | 80px (icon-only) | 60px (icon-only) |
| Nav row pitch | 37px | 44px + 16px gap = 60px | 36px + 2px gap = 38px |
| Nav icon | 16px | 30px | 20px |
| Tab pill | ~28px h, ~13px label | 37px h, 16px label | 28px h, 13px label |
| Default button | ~28-30px h, ~13px label | 40px h, 15px label | 28px h, 13px label |
| Small button | ~24px | 32px | 24px |
| Icons in use | 14 / 16 / 20 | 11/14/16/18/23/28/30 | 14 / 16 / 20 |
| Brand mark | ~16-24px | 28px | 24px |
| Field row pitch | ~40px | n/a | 32px (`--row-md`) |
| Two-line list row | n/a in reference | 74px | ~63px |
| Record title | ~26px | 28px | 24px |
| Empty-state title | ~15px | n/a | 16px |
| Canvas h-padding | ~24-32px | **60px** | 32px |
| Right detail panel | 449px | 400px | unchanged |

## Patterns worth copying

- **Section labels are sentence case, never uppercase.** "Chats", "Records",
  "Resources", "Lists" in the sidebar; "Opportunity Roles", "Meetings", "Notes" in
  the detail rail. Small, grey, medium weight. This also matches the user's
  2026-06-28 feedback. It is why `.t-caps` is now deprecated in favour of
  `.t-label`.
- **One text size does most of the work.** Nav, tabs, row content, field values and
  buttons all sit at ~13px. Size steps are reserved for the record title and
  section headers. Hierarchy is carried by weight and grey level.
- **Controls are quiet and small.** Buttons are ~28px, white, 1px border, modest
  radius. They never compete with content. There is no large filled CTA anywhere in
  these three frames.
- **Labels sit next to values, not above them.** The detail rail is a two-column
  grid of `icon + label` / `value` at ~32-40px pitch, not stacked pairs.
- **Empty states are left-aligned blocks with two buttons**, not centred hero
  illustrations.
- **"See all" is a persistent right-aligned affordance** on every section header,
  at label size.
- **Icons are thin.** Roughly 1.5px stroke at 16px, lucide-like. Never filled.

## Deliberately not copied

- The labelled 278px sidebar. Tieout's icon rail plus a separate 440px workspace
  nav is a different navigation model, and swapping it is a structural change, not
  a scale change. Flagged for a separate decision.
- Rounded-rect buttons. The reference uses ~8px radius; Tieout's pill buttons are a
  locked decision from the 2026-06-28 action-chip recipe. The user asked for button
  *scale*, so shape was left alone.
- Colours and shadows, per the explicit instruction.

## Where this landed

Density tokens (`--control-*`, `--icon-*`, `--row-*`, `--space-*`,
`--radius-control`) live in `src/app/globals.css`. The typography consequences are
written up in `docs/design-system/typography.md`.

---

## QA cycle, 2026-08-22

Second pass against these same frames, hunting what the first (largely scripted)
migration left behind. Full writeup in `docs/design-system/typography.md` §12.

What the reference caught that a token audit alone would not have:

- **"Icons are thin"** exposed 21 different size/stroke combinations, eleven of
  them at 14px alone. Normalised to four.
- **"Controls are quiet and small"** exposed 10 controls still off the scale,
  mostly `height: 35` left over from the roomy design.
- **Sentence case + middot separators** exposed 127 UI strings still carrying em
  dashes, and the stray `"May 2026 - 2"` hyphen.

What the reference could not have caught, found by QA anyway:

- **No focus styles existed anywhere in the app.** Tailwind's reset removes the UA
  outline and nothing replaced it. Every button and row was invisible to keyboard
  navigation.
- **Four hit targets under the 24px floor**, including an 18x18 collapse button.
- **201 stranded line-heights**, 39 of them genuinely mismatched after the size
  remap.

A note on method: 25 of those line-heights measured at a ratio of 1.45 or higher.
Those are real running text, and "fixing" them to the tight ui track would have
flattened the prose. They took `--leading-prose` instead. A blanket normalisation
would have looked consistent in the tokens and been wrong on screen.

---

## Pass 3, 2026-08-22 — nav, elevation, primary action

**Left nav alignment was broken, not just loose.** The rail is 60px wide, but
`items-start` plus an asymmetric `12px 8px` padding put the 32px nav buttons at
centre x=24, the 36px logo at x=26 and the 20px divider at x=18. Three different
centre lines, none of them the rail's (x=30). Fixed by centring the column,
zeroing the side padding and giving every item the same `--row-md` width, so all
six items now share one centre line. Pitch is 36px against the reference's 37.

**Nav icon colour, one step softer** to match the reference's medium-grey icons:
active `--ink-secondary`, inactive `--ink-tertiary`. Measured before committing,
because the rail is the app's darkest surface: the nav actually sits only 7-14%
down the body gradient, so its real backdrop is `#c0c7d2`, not the `#a7b9c8` at
the rail's foot. Against that, secondary is 4.89:1 and tertiary 3.22:1, both clear
of the 3.0 minimum for non-text UI. This supersedes the earlier "on the rails,
step up one ink level" note, which assumed the worst-case backdrop.

**Shadows softened.** The main offender was `--shadow-depth-2`, at
`0 0 6px rgba(0,0,0,0.15)`: zero offset, tight blur, fairly opaque, which reads as
a dark ring around a card rather than the card sitting above the page. It is now a
two-layer lift, a tight contact shadow plus a wide diffuse one. Alphas came down
about a third across the whole scale, and black was replaced with a cool slate
tinted toward the page's own blue-grey, since pure black over a cool ground is
most of what reads as "hard". Four hardcoded zero-offset shadows in components
were routed through the scale too.

**The primary action moved to the top right.** A full-width 64px dark bar sat at
the foot of the dashboard. It was the heaviest element on a screen whose only job
is triage, and it sat below the fold of the very list it competed with. It is now
a standard primary button in the header, rightmost, exactly where the reference
puts "+ Create". Label shortened from "Start new reconciliation run" to
"New run"; same action, and it matches the reference's terse button copy. This also
made the dashboard consistent with Properties, which already had its primary
action ("New property") in the header.

Also fixed in passing: `DashboardCanvas`'s `<main>` hardcoded
`padding: 28px 60px 48px` and had never picked up `.canvas-pad`, which is why that
one screen kept the old 60px gutters after the compact pass.

**Container padding increased.** A correction to the compact pass, which took
container padding down along with everything else. That was a step too far: a
1120px card with 8px of padding reads cramped no matter how tight its contents
are. Density belongs to the type, controls and rows; the container's job is to give
that density air.

New tokens: `--pad-card` 16px, `--pad-panel` 20px, `--pad-bar` 10px 14px for
toolbars holding 28px controls. Applied only to surfaces that are actually
containers, identified by carrying a card/panel surface or radius. Rows, chips,
tooltips and bands keep their tight interiors and are deliberately excluded, since
that is where the compact feel actually lives.

---

## Pass 5, 2026-08-22 — the run list became a real table

The dashboard listing was rebuilt against the reference's list idiom. The
diagnosis came straight from the notes above: *"labels sit next to values, not
above them... a two-column grid at ~32-40px pitch, not stacked pairs."*

The listing was doing the opposite. Every row was a **stacked pair** — property
above detail — at three different type sizes, which is why it read as a different
product from the rest of the app.

Rebuilt as an aligned table:

- **CSS Grid, one shared template** for the header and every row, so the columns
  actually line up instead of approximately lining up the way a flex row does.
  `minmax(0, Nfr)` on the flexible columns is what lets them truncate rather than
  push the fixed columns off the end. Verified: all 12 rows share identical
  column left edges, the header matches them, and both right-aligned columns
  share right edges.
- **Single-line rows at 40px**, inside the reference's 32-40px pitch.
- **One text size does the work.** Every cell is `--type-body`; hierarchy is
  carried by weight and grey level exactly as the reference does it: property at
  weight 500 primary, detail at secondary, period and timestamp at tertiary.
- **Column headers are sentence case**, at meta size in tertiary ink. No
  uppercase, consistent with the rest of the system.
- **Numeric columns are right-aligned** and tabular, so the counts and timestamps
  form a clean edge down the list.
- Header copy is "Statements", not "Stmts". The column had room for the word, and
  an abbreviation nobody asked for is not compression, it is friction.
