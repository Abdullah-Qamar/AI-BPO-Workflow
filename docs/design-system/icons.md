# Icons

Part of the Tieout design system. Companion to
[`typography.md`](typography.md), which owns the size and stroke tokens.

## Family

**Lucide**, via `lucide-react` (already a dependency, currently 1.21.0). 42 icons
in use across 23 files. Nothing else. No raster icons, no bespoke icon SVG.

This matches the compact reference's note that icons are *"thin, roughly 1.5px
stroke at 16px, lucide-like, never filled"*
(`Compact UI References/README.md`).

## Scale

Size and stroke move together. Small icons need a little more weight to stay
visible; large ones read better relatively thinner. That optical ramp is how icon
families are drawn, which is why this is not one stroke value.

| Size | Stroke | Token | Use |
|---|---|---|---|
| 14 | 1.75 | `--icon-sm` / `--stroke-sm` | Inline beside meta text, chips, button affixes |
| 16 | 1.5 | `--icon-md` / `--stroke-md` | Nav items, tabs, row leading icons |
| 20 | 1.5 | `--icon-lg` / `--stroke-md` | Section and page headers, card headers |
| 24 | 1.5 | `--icon-mark` / `--stroke-md` | Record marks, dropzone affordances |

Nothing outside these four pairings. All 121 Lucide icons in the product conform.

## Vocabulary

One icon per concept. This table exists because the app had drifted into three
icons for "upload" and two for "property", which is the kind of inconsistency that
makes an interface feel subtly wrong without anyone being able to point at it.

| Concept | Icon | Notes |
|---|---|---|
| Dashboard | `LayoutDashboard` | Rail and page header |
| Reconciliation | `GitCompareArrows` | Rail, and any bank-vs-ledger comparison |
| Property | `Building2` | **Never `House`.** Seed properties are Multi-family / Retail / Office / Mixed-use at 6 to 112 units; none of that is a house |
| Bank / statement | `Landmark` | The institution |
| Ledger | `Table` | The table of GL entries exported from Yardi. Pairs with `Landmark` on the upload cards |
| Document | `FileText` | A single file |
| Upload, as an action | `Upload` | Buttons, chips, menu items |
| Upload, as a target | `FileUp` | Dropzones only. The one place a file is being *received* rather than sent |
| Knowledge / rules | `BookOpen` | |
| Search | `Search` | |
| Sort and filter | `SlidersHorizontal` | |
| Retry | `RotateCcw` | |
| Undo | `Undo2` | |
| Trend | `TrendingUp` / `TrendingDown` | Direction carries the meaning; colour reinforces it |
| Warning | `TriangleAlert` | |
| Panel collapse / expand | `SquareChevronLeft` / `SquareChevronRight` | |
| Disclosure | `ChevronRight` collapsed, `ChevronDown` expanded | |
| Loading | `Loader2` | Always spinning; never a static spinner glyph |

Rail icons match the icon that heads their destination page, so the rail and the
page agree. Reconciliation has no page-header icon of its own, so it takes
`GitCompareArrows`.

## What is not an icon

These are hand-authored SVG and are deliberately **not** Lucide. They are exempt
from the size and stroke ramp because they are artwork or data, not glyphs.

| Component | What it is |
|---|---|
| `TieoutMark` | The brand mark. See the logo memory, not this doc |
| `WireConnector` | The decorative wire joining statement and ledger cards |
| `StatusDot` | A state indicator, a circle rather than a glyph |
| `PixelField`, `DotGridAvatar` | Generative agent artwork |
| `Strands` (v2) | Decorative strand graphics |
| Sparkline in `AIQualityDetail` | Data visualisation |
| Empty-state connector in `EmptyWorkspace` | Illustration |
| Bank logos in `public/logos` | Brand marks, rendered as `<Image>` |

## Rules

- **Lucide only.** If a concept has no good Lucide icon, compose from Lucide or use
  a text label. Do not draw a new icon and do not import a raster.
- **One icon per concept.** Check the table above before reaching for a new import.
- **Never filled.** Lucide icons are stroked outlines with `fill="none"`.
- **Colour, not opacity, carries state.** A stroked icon dimmed with `opacity`
  reads washed out rather than quiet. Use the ink levels. On the rails, which are
  the darkest surface in the app, the inactive step is `--ink-secondary`, not
  tertiary.
- **Size and stroke always travel together**, per the table above.

## History

- **2026-08-22.** The rail's three navigation icons were `NavGlyph`, a hand-drawn
  iridescent app-icon set with gradient fills, at odds with both the Lucide idiom
  and the reference's "never filled". Replaced with Lucide. `NavGlyph.tsx` is still
  on disk but no longer imported: it was never committed to git, so it was left in
  place rather than deleted, since git could not restore it. Delete it whenever you
  are confident it is not wanted.
- **2026-08-22.** `public/icons/ledger.svg` (40px) and `upload-document.svg` (44px)
  were the last raster-style icons, rendered through `<Image>`. Replaced with
  `Table` at 20px and `FileUp` at 24px. The ledger swap also fixed a real
  mismatch: the statement card header was a 20px Lucide `Landmark` while its
  paired ledger header was a 40px SVG.
- **2026-08-22.** Vocabulary collisions resolved: `House` removed in favour of
  `Building2`, and `UploadCloud` removed in favour of `Upload` / `FileUp`.
- **2026-08-22.** Strokes normalised twice. The first pass caught only single-line
  `size` + `strokeWidth` pairs and missed 10 multi-line ones; a second pass parsing
  whole JSX elements caught the rest.
