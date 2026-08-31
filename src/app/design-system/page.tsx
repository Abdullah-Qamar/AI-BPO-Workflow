"use client";

/* Reconciliation · Design System
 * A living reference of every token and component in the locked system.
 * Source of truth for engineers and designers. Edit the underlying tokens in
 * src/app/globals.css and the components in src/components/.
 *
 * Rewritten 2026-08-26 against docs/design-system/decisions.md. Until that
 * pass this page was the last file in the repo holding raw font-size literals,
 * and it published an ink palette that failed WCAG AA, a pre-compact control
 * scale and icon pairings the product had already stopped using. Everything
 * below is now read off the tokens or off the seed rather than restated. Where
 * a correction reverses something this page used to assert, it says so. */

import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileText,
  FileUp,
  GitCompareArrows,
  Landmark,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  Table,
  TriangleAlert,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { BankUploadList } from "@/components/BankUploadList";
import { BulkUploadCard } from "@/components/BulkUploadCard";
import { PixelField } from "@/components/PixelField";
import {
  CURRENT_CYCLE,
  cycleOptions,
  previousCycle,
  propertyBanks,
  shortCycle,
  STATUS_META,
  STORED_STATES,
  type StatusKey,
} from "@/lib/seed";
import { Button, IconButton } from "@/components/ui/Button";
import { CyclePicker } from "@/components/ui/CyclePicker";
import { Overlay, OverlayCard } from "@/components/ui/Overlay";
import { Pill } from "@/components/ui/Pill";
import { StatusChip, StatusDot } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { Tooltip } from "@/components/ui/Tooltip";
import { WireConnector } from "@/components/WireConnector";
import { Plus, ArrowLeft, ArrowUp, Info } from "lucide-react";

export default function DesignSystem() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--surface-card)",
        color: "var(--ink-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <DocHeader />
      <main
        className="mx-auto"
        style={{ maxWidth: 1120, padding: "0 32px 96px" }}
      >
        <Toc />
        <Preamble />
        <Section
          id="colors"
          title="Colors"
          subtitle="Foundational palette and semantic roles. Every value below is a token in globals.css; nothing in the product should carry a raw hex."
        >
          <Colors />
        </Section>
        <Section
          id="typography"
          title="Typography"
          subtitle="Five sizes, three leadings, three weights, three inks. Prefer the role class over re-assembling the bundle: a role set by class can never be half-applied."
        >
          <Typography />
        </Section>
        <Section
          id="spacing"
          title="Spacing & density"
          subtitle="The compact scale, adopted 2026-08-22. Controls, rows and icons all step down about 25% from the original desktop scale; containers keep their air."
        >
          <Spacing />
        </Section>
        <Section
          id="radii"
          title="Radii"
          subtitle="Six named radii, concentric by design. A sheet inset 4px inside a 12px card needs 10 to keep its corners parallel."
        >
          <Radii />
        </Section>
        <Section
          id="shadows"
          title="Shadows"
          subtitle="Four named depth tokens: depth-1 (chip lift) through depth-4 (modal overlay). Softened 2026-08-22 to a two-layer lift on a cool slate."
        >
          <Shadows />
        </Section>
        <Section
          id="buttons"
          title="Buttons"
          subtitle="ui/Button is the only button chrome. Three variants, three heights, and radius 999 on every one of them."
        >
          <Buttons />
        </Section>
        <Section
          id="status"
          title="Status"
          subtitle="Five states, one label each, one tone each. ui/Status is the single way status is drawn."
        >
          <StatusSection />
        </Section>
        <Section
          id="pills"
          title="Pills"
          subtitle="Display-only chips for a tone that is not a session state. ui/Pill has zero product call sites: this page is where you find out it exists."
        >
          <Pills />
        </Section>
        <Section
          id="cycle"
          title="Cycle picker"
          subtitle="ui/CyclePicker on every screen scoped to a cycle. A chevron is a promise: there is no such thing as a decorative one."
        >
          <CyclePickerDemo />
        </Section>
        <Section
          id="tooltips"
          title="Tooltips"
          subtitle="Hover-triggered lifted card with an optional colored dot."
        >
          <Tooltips />
        </Section>
        <Section
          id="overlays"
          title="Overlays"
          subtitle="ui/Overlay + ui/OverlayCard is the only modal chrome. One scrim value, so two modals over the same canvas dim it by the same amount."
        >
          <Overlays />
        </Section>
        <Section
          id="icons"
          title="Icons"
          subtitle="Lucide only. Four size/stroke pairings, nothing else, and one glyph per concept."
        >
          <Icons />
        </Section>
        <Section
          id="agents"
          title="Agent shapes"
          subtitle="Each agent renders a PixelField bloom: same canvas component, three shapes that read for what the role does."
        >
          <AgentShapes />
        </Section>
        <Section
          id="surfaces"
          title="Surfaces"
          subtitle="Five surface roles, each with one radius, one fill and one shadow. ui/Surface captures the lifted card; it also has zero product call sites."
        >
          <Surfaces />
        </Section>
        <Section
          id="chips"
          title="Chips"
          subtitle="The lifted chip family: control, selected row, active tab, failed file."
        >
          <Chips />
        </Section>
        <Section
          id="inputs"
          title="Inputs"
          subtitle="Search field, cycle picker, sort. All on the 24/28/32 control scale."
        >
          <Inputs />
        </Section>
        <Section
          id="gradient-text"
          title="Gradient text"
          subtitle="Multi-stop runs used in the agents panel. Deprecated: kept here because the utilities are still in globals.css."
        >
          <GradientText />
        </Section>
        <Section
          id="components"
          title="Components"
          subtitle="The composed pieces of the Reconciliation screen, driven by the seed rather than by restated copy."
        >
          <Components />
        </Section>
        <Section
          id="upload"
          title="Upload flow"
          subtitle="Two ways to bring a statement in: drop all at once, or upload per bank."
        >
          <UploadFlow />
        </Section>
      </main>
    </div>
  );
}

/* ───────────────────────── Page chrome ───────────────────────── */

function DocHeader() {
  return (
    <header
      className="sticky top-0 z-10"
      style={{
        background:
          "linear-gradient(180deg, rgba(247,248,250,0.95) 0%, rgba(247,248,250,0.86) 100%)",
        backdropFilter: "saturate(150%) blur(12px)",
        WebkitBackdropFilter: "saturate(150%) blur(12px)",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div
        className="mx-auto flex flex-row items-center"
        style={{ maxWidth: 1120, padding: "20px 32px", gap: 16 }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-control)",
            background:
              "radial-gradient(circle at 30% 30%, #ffffff 0%, #d3d6d8 60%, #9db3c5 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
          }}
        />
        <div className="flex-1">
          <div className="t-heading ink-primary">
            Reconciliation Design System
          </div>
          <div className="t-meta ink-tertiary" style={{ marginTop: 2 }}>
            Locked direction · Figma 2026-06-27 · Consistency contract
            2026-08-26
          </div>
        </div>
        {/* Back affordance drawn the way the rest of the app draws it: a ghost
         * pill with ArrowLeft at 14/1.75, not a literal arrow character in the
         * label. "Workspace" is retired as a user-visible word (contract §1);
         * the destination is called Reconciliation. */}
        <Link
          href="/"
          className="inline-flex items-center t-body ink-primary"
          style={{
            height: "var(--control-md)",
            padding: "0 12px",
            gap: 6,
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back to Reconciliation
        </Link>
      </div>
    </header>
  );
}

function Toc() {
  const items = [
    ["colors", "Colors"],
    ["typography", "Typography"],
    ["spacing", "Spacing"],
    ["radii", "Radii"],
    ["shadows", "Shadows"],
    ["buttons", "Buttons"],
    ["status", "Status"],
    ["pills", "Pills"],
    ["cycle", "Cycle picker"],
    ["tooltips", "Tooltips"],
    ["overlays", "Overlays"],
    ["icons", "Icons"],
    ["agents", "Agent shapes"],
    ["surfaces", "Surfaces"],
    ["chips", "Chips"],
    ["inputs", "Inputs"],
    ["gradient-text", "Gradient text"],
    ["components", "Components"],
    ["upload", "Upload flow"],
  ];
  return (
    <nav
      className="flex flex-row flex-wrap"
      style={{ gap: 8, padding: "32px 0 16px" }}
      aria-label="Table of contents"
    >
      {items.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="t-meta ink-secondary"
          style={{
            padding: "6px 10px",
            background: "var(--surface-control)",
            border: "1px solid #FFFFFF",
            boxShadow: "var(--shadow-chip)",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

/* The page's own standing: what it is, and what it stopped claiming. */
function Preamble() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "var(--pad-card)",
        background: "var(--surface-list)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-depth-1)",
      }}
    >
      <div className="t-title ink-primary" style={{ marginBottom: 6 }}>
        How to read this page
      </div>
      <p className="t-prose ink-secondary">
        This is a document, not a component gallery. The rules matter more than
        the swatches: where a rule and a component disagree, the component is
        wrong. The binding sources are{" "}
        <code>docs/design-system/decisions.md</code> (the consistency contract),{" "}
        <code>typography.md</code> and <code>icons.md</code>. Tokens live in{" "}
        <code>src/app/globals.css</code>.
      </p>
      <Correction>
        Rewritten 2026-08-26. This page had drifted furthest of any file in the
        repo, because nothing renders it in the product and so nothing caught
        it: it was the last holder of raw <code>fontSize</code> literals (66 of
        them, at 9, 10, 14, 18 and 28px, four of which the ramp does not have),
        it published <code>#7F7F87</code> as a canonical text ink at 3.74:1
        against the card surface, and it documented icon pairings the product
        had already migrated off. A style guide that is wrong is worse than no
        style guide, because people build from it.
      </Correction>
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ paddingTop: 48, scrollMarginTop: 96 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="t-heading ink-primary">{title}</h2>
        <p className="t-prose ink-secondary" style={{ marginTop: 6 }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

/* A short line saying what this page used to assert and why it no longer
 * does. A style guide that shows its own history is easier to trust than one
 * that quietly rewrites itself. */
function Correction({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-row"
      style={{
        marginTop: 12,
        gap: "var(--space-4)",
        paddingLeft: "var(--space-5)",
        borderLeft: "2px solid var(--line-soft)",
      }}
    >
      <div>
        <div className="t-label" style={{ marginBottom: 2 }}>
          Corrected
        </div>
        <p className="t-prose ink-tertiary">{children}</p>
      </div>
    </div>
  );
}

/* Shared card shell for the token tables below. */
function TokenCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          className="t-meta ink-tertiary"
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono t-meta ink-tertiary">{children}</span>
  );
}

/* ───────────────────────── Tokens ───────────────────────── */

interface SwatchSpec {
  name: string;
  /* The CSS custom property, where the value has one. */
  token?: string;
  /* What the token resolves to, printed so a reader can grep for it. */
  value: string;
  desc: string;
}

function Colors() {
  const groups: { title: string; note?: string; swatches: SwatchSpec[] }[] = [
    {
      title: "Page",
      swatches: [
        {
          name: "Root gradient",
          value: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
          desc: "Outermost container. Shows through LeftRail and WorkspaceNav.",
        },
        {
          name: "Canvas gradient",
          token: "--bg-grad",
          value: "linear-gradient(150.68deg, #EEEFF5 0%, #DDDFE8 45.34%)",
          desc: "MainCanvas background. The lifted work surface.",
        },
        {
          name: "Side surface",
          token: "--bg-side",
          value: "#DDDFE8",
          desc: "Rails and the gutter around the agent card. Tertiary ink drops to 4.12 here, so step up one ink level on this surface.",
        },
      ],
    },
    {
      title: "Surfaces",
      note: "Three steps of nesting: card, then the brighter sheet its rows sit on, then pure white when a row hover-lifts. That is what makes the lift legible without a fill change loud enough to flash.",
      swatches: [
        {
          name: "Card",
          token: "--surface-card",
          value: "#F7F8FA",
          desc: "Panels, bento cards, the agent inner card.",
        },
        {
          name: "Inner sheet",
          token: "--surface-list",
          value: "#FBFCFE",
          desc: "The bright sheet a listing's rows sit on, nested inside the card.",
        },
        {
          name: "Control",
          token: "--surface-control",
          value: "#F2F4FB",
          desc: "Every chip-shaped control: secondary buttons, the cycle picker, pills, slot chips.",
        },
        {
          name: "Control hover",
          token: "--surface-control-hover",
          value: "#EFF3F8",
          desc: "The same control under the pointer.",
        },
        {
          name: "Selected chip",
          token: "--surface-chip",
          value: "#EFF3F8",
          desc: "Selected rail item, selected session row.",
        },
        {
          name: "Active tab",
          token: "--surface-tab-active",
          value: "#E9EBF3",
          desc: "The active pill in a tab strip.",
        },
        {
          name: "Input field",
          token: "--surface-input",
          value: "rgba(221, 223, 232, 0.4)",
          desc: "Translucent grey of the search input.",
        },
      ],
    },
    {
      title: "Lines",
      swatches: [
        {
          name: "Line",
          token: "--line",
          value: "#9DB3C5",
          desc: "Panel borders, hover border on a dropzone, the neutral status mark.",
        },
        {
          name: "Soft line",
          token: "--line-soft",
          value: "#D3D6D8",
          desc: "Structural dividers between sections.",
        },
        {
          name: "Hairline",
          token: "--line-hair",
          value: "rgba(38, 50, 66, 0.07)",
          desc: "Row rule inside a listing. Alpha, so it works on card and sheet alike.",
        },
        {
          name: "Row hover border",
          token: "--line-row-hover",
          value: "rgba(157, 179, 197, 0.45)",
          desc: "Painted when a listing row lifts to white. The resting border is transparent so nothing shifts.",
        },
        {
          name: "Menu border",
          token: "--line-menu",
          value: "rgba(157, 179, 197, 0.35)",
          desc: "Border on a floating menu or popover sheet.",
        },
        {
          name: "White inner border",
          token: "--line-inner-white",
          value: "rgba(253, 255, 255, 0.6)",
          desc: "Inside lifted chips, for the soft inset.",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      {groups.map((g) => (
        <div key={g.title}>
          <div className="t-label" style={{ marginBottom: 6 }}>
            {g.title}
          </div>
          {g.note && (
            <p className="t-prose ink-tertiary" style={{ marginBottom: 12 }}>
              {g.note}
            </p>
          )}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {g.swatches.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </div>
      ))}

      <InkPalette />
      <StatusPalette />
      <AgentPalette />
      <ScrimSwatch />
    </div>
  );
}

function Swatch({ name, token, value, desc }: SwatchSpec) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 64,
          background: token ? `var(${token})` : value,
          borderBottom: "1px solid var(--line-soft)",
        }}
      />
      <div style={{ padding: 12 }}>
        <div className="t-body ink-primary">{name}</div>
        <div style={{ marginTop: 4 }}>
          <Mono>{token ?? "no token"}</Mono>
        </div>
        <div
          className="font-mono t-meta ink-tertiary"
          style={{ wordBreak: "break-all" }}
        >
          {value}
        </div>
        <div className="t-prose ink-secondary" style={{ marginTop: 6 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

function InkPalette() {
  const inks: { name: string; token: string; hex: string; ratio: string; use: string }[] = [
    {
      name: "Primary",
      token: "--ink-primary",
      hex: "#2C353E",
      ratio: "11.76",
      use: "Headings, row titles, values, anything that is the content.",
    },
    {
      name: "Secondary",
      token: "--ink-secondary",
      hex: "#464F59",
      ratio: "7.84",
      use: "Running text: exception reasons, reviewer notes, activity copy.",
    },
    {
      name: "Tertiary",
      token: "--ink-tertiary",
      hex: "#616A75",
      ratio: "5.15",
      use: "Field labels, timestamps, inactive tabs, placeholders.",
    },
  ];
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 6 }}>
        Ink
      </div>
      <p className="t-prose ink-tertiary" style={{ marginBottom: 12 }}>
        Three levels, on an even OKLCH lightness ramp so the steps read as
        evenly spaced rather than merely different. Ratios are measured against{" "}
        <code>--surface-card</code>; all three clear WCAG AA on every common
        text surface.
      </p>
      <TokenCard>
        {inks.map((ink, i) => (
          <div
            key={ink.token}
            className="flex flex-row items-center"
            style={{
              padding: "14px 20px",
              gap: 20,
              borderBottom:
                i === inks.length - 1 ? "none" : "1px solid var(--line-soft)",
            }}
          >
            <span
              className="shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-control)",
                background: `var(${ink.token})`,
              }}
            />
            <div className="flex-1 min-w-0">
              <div
                className="t-body"
                style={{ color: `var(${ink.token})`, fontWeight: 500 }}
              >
                {ink.name} · The quick brown fox jumps over the lazy dog
              </div>
              <div style={{ marginTop: 2 }}>
                <Mono>
                  {ink.token} · {ink.hex}
                </Mono>
              </div>
              <div className="t-prose ink-tertiary" style={{ marginTop: 4 }}>
                {ink.use}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="t-title nums ink-primary">{ink.ratio}:1</div>
              <div className="t-meta ink-tertiary">vs card</div>
            </div>
          </div>
        ))}
      </TokenCard>
      <Correction>
        This page used to publish eight text colours as canonical:{" "}
        <code>#7F7F87</code>, <code>#43484E</code>, <code>#63696E</code>,{" "}
        <code>#656C76</code>, <code>#464A51</code>, <code>#111827</code>,{" "}
        <code>#6B7280</code> and <code>#818893</code>. Four of them sat inside
        a single 20% luminance band, which is why the screens read as two ink
        levels rather than the four they appeared to have. The one named
        &ldquo;Tertiary&rdquo;, <code>#7F7F87</code>, measured 3.74:1 on the
        card surface and was the colour used for the smallest text in the app,
        so the least legible size had the weakest contrast. All eight are
        retired, along with the <code>--text-*</code> aliases.
      </Correction>
    </div>
  );
}

function StatusPalette() {
  const rows: {
    meaning: string;
    tone: string;
    mark: string;
    bg: string;
    ink: string;
    sample: string;
  }[] = [
    {
      meaning: "ok · completed",
      tone: "ok",
      mark: "--status-ok",
      bg: "--status-ok-bg",
      ink: "--status-ok-ink",
      sample: "Completed",
    },
    {
      meaning: "warn · review, open",
      tone: "warn",
      mark: "--status-warn",
      bg: "--status-warn-bg",
      ink: "--status-warn-ink",
      sample: "Review",
    },
    {
      meaning: "danger · failed, exception",
      tone: "danger",
      mark: "--status-danger",
      bg: "--status-danger-bg",
      ink: "--status-danger-ink",
      sample: "Failed",
    },
    {
      meaning: "info · active, in flight",
      tone: "info",
      mark: "--status-info",
      bg: "--status-info-bg",
      ink: "--status-info-ink",
      sample: "Active",
    },
    {
      meaning: "neutral · not started",
      tone: "neutral",
      mark: "--line",
      bg: "--surface-control",
      ink: "--ink-tertiary",
      sample: "Not started",
    },
  ];
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 6 }}>
        Status
      </div>
      <p className="t-prose ink-tertiary" style={{ marginBottom: 12 }}>
        One pair per meaning, three parts each: <code>mark</code> for dots and
        strokes, <code>bg</code> for a tinted chip, <code>ink</code> for text on
        that chip and for a figure that carries the meaning on its own. Inks are
        AA on their own background and on <code>--surface-card</code>; marks
        clear 3.0:1, the non-text minimum. Never write a raw hex for a state.
      </p>
      <TokenCard>
        {rows.map((r, i) => (
          <div
            key={r.tone}
            className="flex flex-row items-center"
            style={{
              padding: "14px 20px",
              gap: 20,
              borderBottom:
                i === rows.length - 1 ? "none" : "1px solid var(--line-soft)",
            }}
          >
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{ width: 24 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: `var(${r.mark})`,
                }}
              />
            </span>
            <span
              className="shrink-0 inline-flex items-center t-meta"
              style={{
                height: "var(--control-sm)",
                padding: "0 10px",
                borderRadius: 999,
                background: `var(${r.bg})`,
                color: `var(${r.ink})`,
                fontWeight: 500,
                minWidth: 104,
                justifyContent: "center",
              }}
            >
              {r.sample}
            </span>
            <div className="flex-1 min-w-0">
              <div className="t-body ink-primary">{r.meaning}</div>
              <div style={{ marginTop: 2 }}>
                <Mono>
                  {r.mark} · {r.bg} · {r.ink}
                </Mono>
              </div>
            </div>
          </div>
        ))}
      </TokenCard>
      <div
        style={{
          marginTop: 12,
          padding: "var(--pad-card)",
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        <div className="t-body ink-primary" style={{ fontWeight: 500 }}>
          <code>--dot-active</code>, <code>--dot-failed</code> and{" "}
          <code>--dot-complete</code> are MARK aliases only.
        </div>
        <p className="t-prose ink-secondary" style={{ marginTop: 4 }}>
          They are deliberately saturated because a 6px circle has to be. They
          must never set text or a fill: <code>#1EFF00</code> as a label colour
          is unreadable at any size, and <code>#FF0000</code> as a chip
          background is a fire alarm. Use the semantic pairs above, which are
          solved for contrast at size.
        </p>
      </div>
      <Correction>
        There was no status section here at all, only three raw dots. Meanwhile
        the app had five greens (<code>#1EFF00</code>, <code>#2FA35F</code>,{" "}
        <code>#22C55E</code>, <code>#4B7F63</code>, <code>#1A7048</code>), three
        ambers and four reds in service simultaneously, so &ldquo;this
        succeeded&rdquo; looked like a different event depending on which screen
        said it. They collapse into the five pairs above.
      </Correction>
    </div>
  );
}

function AgentPalette() {
  const agents: { name: string; token: string; hex: string }[] = [
    { name: "Intake", token: "--agent-intake", hex: "#5B6AB8" },
    {
      name: "Reconciliation",
      token: "--agent-reconciliation",
      hex: "#3E8C93",
    },
    { name: "Summary", token: "--agent-summary", hex: "#8A6BBF" },
  ];
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 6 }}>
        Agent identity
      </div>
      <p className="t-prose ink-tertiary" style={{ marginBottom: 12 }}>
        Which agent, not how it is doing. There are three agents and every
        surface shows the same three.{" "}
        <strong>
          Status colours must never be reused as agent identity
        </strong>{" "}
        : a red dot beside &ldquo;Summary&rdquo; reads as a failure in a UI
        where red means failed, which is exactly what the guidance panel used to
        render.
      </p>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {agents.map((a) => (
          <div
            key={a.token}
            className="flex flex-row items-center"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--radius-card)",
              padding: 16,
              gap: 12,
            }}
          >
            <span
              className="shrink-0"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: `var(${a.token})`,
              }}
            />
            <div className="min-w-0">
              <div className="t-body ink-primary">{a.name}</div>
              <Mono>
                {a.token} · {a.hex}
              </Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrimSwatch() {
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 6 }}>
        Overlay
      </div>
      <div
        className="flex flex-row flex-wrap"
        style={{ gap: 12 }}
      >
        <Swatch
          name="Modal scrim"
          token="--scrim"
          value="rgba(48, 59, 69, 0.38)"
          desc="One value, so two modals opening over the same canvas do not dim it by different amounts. Paired with --scrim-blur (4px)."
        />
        <Swatch
          name="Failed-file chip"
          token="--chip-failed-bg"
          value="var(--status-danger-bg)"
          desc="Pink tint for failed file chips, with --chip-failed-border (#F0C7C7) around it."
        />
      </div>
    </div>
  );
}

function Typography() {
  /* Five sizes. Rendered through the role classes, so this table cannot drift
   * from the tokens the way the old hardcoded seven-row version did. */
  const ramp: {
    cls: string;
    token: string;
    px: string;
    sample: string;
    use: string;
  }[] = [
    {
      cls: "t-display",
      token: "--type-display",
      px: "24",
      sample: "1849 Westlake Ave N, Seattle, WA 98109",
      use: "Canvas h1, semibold",
    },
    {
      cls: "t-heading",
      token: "--type-heading",
      px: "20",
      sample: "Reconciliation",
      use: "Panel and page headings, semibold",
    },
    {
      cls: "t-title",
      token: "--type-title",
      px: "16",
      sample: "Bank statement",
      use: "Card and section titles only",
    },
    {
      cls: "t-body",
      token: "--type-body",
      px: "13",
      sample: "May 2026 · Re-run",
      use: "Default. Rows, tabs, values, buttons",
    },
    {
      cls: "t-meta",
      token: "--type-meta",
      px: "11",
      sample: "Account holder · Tahoe Holdings LLC",
      use: "Labels, timestamps, counters",
    },
  ];

  const extras: { cls: string; sample: string; use: string }[] = [
    {
      cls: "t-prose",
      sample:
        "No matching ledger entry within three days of the statement line. The reviewer has to decide whether this is a timing difference or a missing posting.",
      use: "Running text at body size, prose leading, capped at 68ch",
    },
    {
      cls: "t-label",
      sample: "Section label",
      use: "Group headings and eyebrows: meta size, weight 500, tertiary ink, sentence case",
    },
    {
      cls: "t-body nums",
      sample: "$41,900.00 · ••••3421 · GL 1010",
      use: "Any figure in a column or one that mutates in place",
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <TokenCard title="The ramp · five steps, each at least 1.18 apart">
        {ramp.map((r, i) => (
          <div
            key={r.cls}
            className="flex flex-row items-baseline"
            style={{
              padding: "16px 20px",
              borderBottom:
                i === ramp.length - 1 ? "none" : "1px solid var(--line-soft)",
              gap: 24,
            }}
          >
            <div className="shrink-0" style={{ width: 132 }}>
              <Mono>.{r.cls}</Mono>
              <div>
                <Mono>
                  {r.token} · {r.px}px
                </Mono>
              </div>
            </div>
            <div className={`flex-1 min-w-0 ${r.cls} ink-primary`}>
              {r.sample}
            </div>
            <div className="shrink-0 t-meta ink-tertiary" style={{ width: 180 }}>
              {r.use}
            </div>
          </div>
        ))}
      </TokenCard>

      <TokenCard title="Three more roles, at sizes already in the ramp">
        {extras.map((r, i) => (
          <div
            key={r.cls}
            className="flex flex-row items-baseline"
            style={{
              padding: "16px 20px",
              borderBottom:
                i === extras.length - 1 ? "none" : "1px solid var(--line-soft)",
              gap: 24,
            }}
          >
            <div className="shrink-0" style={{ width: 132 }}>
              <Mono>.{r.cls.split(" ").join(".")}</Mono>
            </div>
            <div className={`flex-1 min-w-0 ${r.cls} ink-secondary`}>
              {r.sample}
            </div>
            <div className="shrink-0 t-meta ink-tertiary" style={{ width: 180 }}>
              {r.use}
            </div>
          </div>
        ))}
      </TokenCard>

      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 8 }}>
          Rules
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <strong>No numeric fontSize.</strong> Use the role class, or the
            size token if you genuinely need only the size.
          </li>
          <li>
            <strong>Nothing below 11px.</strong> Sub-11px text in a financial
            product is an accessibility problem, and a badge is not important
            enough to earn an exception.
          </li>
          <li>
            <strong>No new sizes.</strong> At a given size, step the weight or
            the ink to signal importance. Never introduce an intermediate size:
            that habit is where 15, 17, 18, 21 and 22 came from, one at a time.
          </li>
          <li>
            <strong>Leading is a role, not a number.</strong>{" "}
            <code>--leading-ui</code> (1.3) for single-line text whose line box
            drives row height, <code>--leading-prose</code> (1.55) for text read
            in sentences, <code>--leading-tight</code> (1.15) at 20px and up.
          </li>
          <li>
            <strong>Weights are 400 / 500 / 600.</strong> The family ships no
            700, so <code>bold</code> synthesises. There is no italic either.
          </li>
          <li>
            <strong>No em dashes in user-visible copy.</strong> Use{" "}
            <code>·</code> for apposition. Session labels read{" "}
            <code>May 2026 · Re-run</code>.
          </li>
          <li>
            Figures render in Host Grotesk automatically, via a{" "}
            <code>unicode-range</code> on <code>--font-sans</code>. No component
            sets a font family. That face has uniform digit widths at every
            weight, so a bold total under regular rows keeps the column flush.
          </li>
        </ul>
      </div>

      <Correction>
        The table above used to be seven hardcoded rows at 28/20/18/16/14/12/10.
        Three of those sizes (28, 18, 14) are not in the ramp, and 10 broke the
        11px floor this same page asserted elsewhere. <code>--type-display</code>{" "}
        moved from 28 to 24 in the compact pass on 2026-08-22, so the guide&apos;s
        own section headings were being set at a size the system no longer has.
        Uppercase group labels at <code>0.08em</code> are gone too: the compact
        reference has no uppercase text anywhere, and <code>.t-caps</code> is
        deprecated in favour of <code>.t-label</code>.
      </Correction>
    </div>
  );
}

function Spacing() {
  const space = [
    ["--space-1", 2],
    ["--space-2", 4],
    ["--space-3", 6],
    ["--space-4", 8],
    ["--space-5", 12],
    ["--space-6", 16],
    ["--space-7", 20],
    ["--space-8", 24],
    ["--space-9", 32],
  ] as const;

  const scales: { title: string; rows: [string, string, string][] }[] = [
    {
      title: "Control heights · was 32 / 40 / 48",
      rows: [
        ["--control-sm", "24px", "Filter chips, inline toggles, badges, StatusChip"],
        ["--control-md", "28px", "Default: buttons, tab pills, cycle picker"],
        ["--control-lg", "32px", "Prominent: primary CTA, modal actions"],
      ],
    },
    {
      title: "Row heights",
      rows: [
        ["--row-sm", "28px", "Dense table row"],
        ["--row-md", "32px", "Nav item, single-line list row, menu option"],
        ["--row-lg", "44px", "Two-line list row"],
      ],
    },
    {
      title: "Icon sizes · was an unmanaged 11 through 30",
      rows: [
        ["--icon-sm", "14px", "Inline beside meta text, chips, button affixes"],
        ["--icon-md", "16px", "Nav items, tabs, row leading icons"],
        ["--icon-lg", "20px", "Section and page headers, card headers"],
        ["--icon-mark", "24px", "Record marks, dropzone affordances"],
      ],
    },
    {
      title: "Container padding · density belongs to type, controls and rows, not to the container",
      rows: [
        ["--pad-card", "16px", "Content cards"],
        ["--pad-panel", "20px", "Large panels, side rails"],
        ["--pad-bar", "10px 14px", "Toolbars and filter bars holding 28px controls"],
      ],
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
          padding: 20,
        }}
      >
        <div className="t-label" style={{ marginBottom: 12 }}>
          Space scale · 4-based, with 2 and 6 for tight control interiors
        </div>
        <div className="flex flex-row items-end" style={{ gap: 16 }}>
          {space.map(([token, px]) => (
            <div
              key={token}
              className="flex flex-col items-center"
              style={{ gap: 8 }}
            >
              <div
                style={{
                  width: px,
                  height: px,
                  background: "#A7B9C8",
                  borderRadius: 2,
                }}
              />
              <Mono>{px}</Mono>
            </div>
          ))}
        </div>
      </div>

      {scales.map((s) => (
        <TokenCard key={s.title} title={s.title}>
          {s.rows.map(([token, value, use], i) => (
            <div
              key={token}
              className="flex flex-row items-center"
              style={{
                padding: "12px 20px",
                gap: 20,
                borderBottom:
                  i === s.rows.length - 1
                    ? "none"
                    : "1px solid var(--line-soft)",
              }}
            >
              <div className="shrink-0" style={{ width: 140 }}>
                <Mono>{token}</Mono>
              </div>
              <div className="shrink-0 t-body nums ink-primary" style={{ width: 80 }}>
                {value}
              </div>
              <div className="flex-1 t-prose ink-secondary">{use}</div>
            </div>
          ))}
        </TokenCard>
      ))}

      <Correction>
        This section used to print an ad hoc step list (4, 6, 8, 10, 12, 16, 20,
        28, 32, 48, 60) and a note that canvas padding was{" "}
        <code>28px 60px 12px</code>. That 60px of horizontal padding was the
        single largest contributor to the app reading roomy beside the compact
        reference; <code>.canvas-pad</code> is now 20/32 stepping down to 16/20,
        all off the space scale.
      </Correction>
    </div>
  );
}

function Radii() {
  const values: { name: string; token: string; value: number; use: string }[] = [
    { name: "Small", token: "--radius-small", value: 6, use: "Failed file chips" },
    { name: "Control", token: "--radius-control", value: 8, use: "Buttons that are not pills, inputs, tab pills" },
    { name: "Row", token: "--radius-row", value: 8, use: "Row inside a sheet, menu option" },
    { name: "Sheet", token: "--radius-sheet", value: 10, use: "Bright inner sheet, popovers, menus" },
    { name: "Card", token: "--radius-card", value: 12, use: "Content card on the canvas" },
    { name: "Panel", token: "--radius-panel", value: 20, use: "Panel, rail, modal card" },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
        {values.map((v) => (
          <div
            key={v.token}
            className="flex flex-col items-center"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--radius-card)",
              padding: 20,
              gap: 12,
              minWidth: 168,
              flex: 1,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: "#A7B9C8",
                borderRadius: v.value,
              }}
            />
            <div className="text-center">
              <div className="t-body ink-primary">{v.name}</div>
              <Mono>
                {v.token} · {v.value}px
              </Mono>
              <div className="t-meta ink-tertiary" style={{ marginTop: 6 }}>
                {v.use}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        <p className="t-prose ink-secondary">
          <strong>999 is not on this list because it is not a radius,</strong>{" "}
          it is a shape. Every <code>ui/Button</code> and{" "}
          <code>ui/IconButton</code> is a pill, as are <code>ui/Pill</code> and{" "}
          <code>StatusChip</code>. The 16px and 14px card radii that were in
          service are retired; both became <code>--radius-card</code>.
        </p>
      </div>
    </div>
  );
}

function Shadows() {
  const shadows: { name: string; token: string; use: string }[] = [
    {
      name: "depth-1",
      token: "--shadow-depth-1",
      use: "Pills and chips at rest, the inner sheet. Barely a lift.",
    },
    {
      name: "depth-2 · card",
      token: "--shadow-depth-2",
      use: "Bento cards, panels, the agent inner card. Aliased as --shadow-card.",
    },
    {
      name: "depth-3 · floating",
      token: "--shadow-depth-3",
      use: "Tooltips, popovers, menus.",
    },
    {
      name: "depth-4 · overlay",
      token: "--shadow-depth-4",
      use: "Modal cards on the scrim.",
    },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
        {shadows.map((s) => (
          <div
            key={s.name}
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--radius-card)",
              padding: 20,
              minWidth: 240,
              flex: 1,
            }}
          >
            <div
              style={{
                width: "100%",
                height: 80,
                background: "#FFFFFF",
                boxShadow: `var(${s.token})`,
                borderRadius: "var(--radius-card)",
                marginBottom: 16,
              }}
            />
            <div className="t-body ink-primary">{s.name}</div>
            <Mono>{s.token}</Mono>
            <div className="t-prose ink-secondary" style={{ marginTop: 6 }}>
              {s.use}
            </div>
          </div>
        ))}
      </div>
      <Correction>
        Three demos on this page painted{" "}
        <code>0 2px 4px rgba(0,0,0,0.1)</code> directly, which is the
        pre-softening shadow: pure black over a cool ground, one tight layer, no
        diffuse fall. The scale above replaces it. Alphas came down about a
        third and the black became a slate tinted toward the page&apos;s own
        blue-grey, which is most of why the old cards looked ringed rather than
        lifted.
      </Correction>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="Variants · primary, secondary, ghost">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </ComponentDemo>
      <ComponentDemo title="Sizes · sm 24, md 28, lg 32">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </ComponentDemo>
      <ComponentDemo title="Icon buttons · same three diameters">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <IconButton variant="secondary" size="sm" ariaLabel="Add">
            <Plus size={14} strokeWidth={1.75} />
          </IconButton>
          <IconButton variant="secondary" size="md" ariaLabel="Add">
            <Plus size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton variant="primary" size="md" ariaLabel="Send">
            <ArrowUp size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton variant="primary" size="lg" ariaLabel="Send">
            <ArrowUp size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
      </ComponentDemo>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 8 }}>
          Rules
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <strong>Radius 999 on every variant and every size.</strong> Ghost
            included: it has no fill at rest, but its hover fill is a pill, and
            a ghost that squares off on hover reads as a different control.
          </li>
          <li>
            No hand-rolled <code>&lt;button&gt;</code> with its own
            padding, radius and fill for anything that is conceptually a button.
            The old <code>QuietButton</code> and the square primaries are gone.
          </li>
          <li>
            No label below <code>--type-body</code>, and no height outside 24 /
            28 / 32. The 33, 35, 36 and 40px one-offs are gone.
          </li>
          <li>
            Disabled sets the real DOM <code>disabled</code> attribute. A
            control that looks disabled must be out of the tab order, otherwise
            it announces as enabled and takes focus a keyboard user cannot act
            on.
          </li>
          <li>
            Icon-only goes to <code>ui/IconButton</code>, never a{" "}
            <code>Button</code> with an icon for a child.
          </li>
        </ul>
      </div>
      <Correction>
        The icon-button demo above used to show <code>ArrowUp</code> at 18px
        with <code>strokeWidth 2</code>, neither of which is a legal pairing.
        18px is not in the icon scale at all.
      </Correction>
    </div>
  );
}

function StatusSection() {
  const keys: StatusKey[] = [
    "review",
    "active",
    "failed",
    "completed",
    "not-started",
  ];
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="StatusDot · the 6px mark, for a row that already carries its own label">
        <div className="flex flex-row flex-wrap" style={{ gap: 12 }}>
          {keys.map((k) => (
            <div
              key={k}
              className="flex flex-row items-center"
              style={{
                background: "var(--surface-card)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
                padding: "12px 16px",
                gap: 10,
                minWidth: 180,
              }}
            >
              <StatusDot status={k} />
              <div className="min-w-0">
                <div className="t-body ink-primary">
                  {STATUS_META[k].label}
                </div>
                <Mono>
                  {k} · tone {STATUS_META[k].tone}
                </Mono>
              </div>
            </div>
          ))}
        </div>
      </ComponentDemo>

      <ComponentDemo title="StatusChip · where the state has to say its own name">
        <div className="flex flex-row flex-wrap items-center" style={{ gap: 10 }}>
          {keys.map((k) => (
            <StatusChip key={k} status={k} />
          ))}
        </div>
        <div className="flex flex-row flex-wrap items-center" style={{ gap: 10, marginTop: 12 }}>
          {keys.map((k) => (
            <StatusChip key={k} status={k} showDot={false} />
          ))}
        </div>
      </ComponentDemo>

      <ComponentDemo title="Filter strips render STORED_STATES, in triage order">
        <div className="flex flex-row flex-wrap items-center" style={{ gap: 10 }}>
          {STORED_STATES.map((k) => (
            <StatusChip key={k} status={k} />
          ))}
        </div>
      </ComponentDemo>

      <ComponentDemo title="StatusDot with ring · for a mark sitting on a logo or a coloured fill">
        <div className="flex flex-row items-center" style={{ gap: 16 }}>
          <span className="relative inline-flex">
            <Image src="/logos/chase.png" width={24} height={24} alt="" />
            <StatusDot
              status="review"
              ring
              size={8}
              style={{ position: "absolute", right: -3, bottom: -3 }}
            />
          </span>
          <span className="t-prose ink-secondary">
            The ring is a 1px white stroke plus depth-1, so the mark survives
            landing on artwork.
          </span>
        </div>
      </ComponentDemo>

      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 8 }}>
          Rules
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            Labels come from <code>STATUS_META</code> in the seed, never from a
            string at the call site. That is what stops a filter chip on one
            screen and a session row on another disagreeing.
          </li>
          <li>
            The five labels are <strong>Review</strong>,{" "}
            <strong>Active</strong>, <strong>Failed</strong>,{" "}
            <strong>Completed</strong>, <strong>Not started</strong>.
            &ldquo;Complete&rdquo;, &ldquo;Done&rdquo;, &ldquo;Posted&rdquo;,
            &ldquo;Closed&rdquo;, &ldquo;Needs attention&rdquo;, &ldquo;Needs
            review&rdquo; and &ldquo;Running&rdquo; are all retired as status
            labels.
          </li>
          <li>
            The chip is flat and tinted, with no border and no shadow. It is a
            label with a background, not a control: giving it chrome made it
            read as something you could press.
          </li>
          <li>
            <code>WorkspaceStatus</code> is the storage type; <code>StatusKey</code>{" "}
            is what the UI renders. They differ in one place, and{" "}
            <code>statusKeyOf</code> is the bridge: a stored{" "}
            <code>active</code> session is one waiting on a reviewer, which the
            UI calls <strong>Review</strong>.
          </li>
          <li>
            <strong>
              Do not render the whole table in a filter strip.
            </strong>{" "}
            <code>STORED_STATES</code> is the four states a written-down session
            can be in: <code>failed</code>, <code>review</code>,{" "}
            <code>completed</code>, <code>not-started</code>.{" "}
            <strong>Active is a runtime state only</strong>, a run executing
            right now, and no seeded session carries it, because a session that
            is mid-flight has not been written down yet. A filter offering
            &ldquo;Active&rdquo; is a tab that is permanently empty. Surfaces
            describing a live run (the Reconciliation header, the phase CTA, the
            session nav&apos;s dot) still take <code>active</code> from the
            reducer&apos;s <code>runState</code>.
          </li>
          <li>
            The order of <code>STORED_STATES</code> is triage order: what is
            broken, then what wants a decision, then what is done, then what has
            not started. Every filter strip renders them in that order, so a
            reader&apos;s hand goes to the same place on every screen.
          </li>
        </ul>
      </div>

      <Correction>
        This section was three raw dots labelled &ldquo;active&rdquo;,
        &ldquo;failed&rdquo; and &ldquo;complete&rdquo; with their hexes printed
        underneath, which is a palette, not a status system. Before{" "}
        <code>ui/Status</code> existed the app drew status eight structurally
        different ways: bare spans, ringed dots, hollow strokes, glyph circles
        and tinted text pills.
      </Correction>
    </div>
  );
}

function Pills() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="Tones · neutral, info, success, warning, danger, violet">
        <div className="flex flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <Pill tone="neutral">Neutral</Pill>
          <Pill tone="info">Info</Pill>
          <Pill tone="success">Success</Pill>
          <Pill tone="warning">Warning</Pill>
          <Pill tone="danger">Danger</Pill>
          <Pill tone="violet">Violet</Pill>
        </div>
      </ComponentDemo>
      <ComponentDemo title="With leading dot">
        <div className="flex flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <Pill tone="info" showDot>Active</Pill>
          <Pill tone="success" showDot>Completed</Pill>
          <Pill tone="warning" showDot>Review</Pill>
          <Pill tone="danger" showDot>Failed</Pill>
        </div>
      </ComponentDemo>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="t-prose ink-secondary">
          <strong>
            Reach for <code>StatusChip</code> first.
          </strong>{" "}
          A pill and a status chip look similar and mean different things: the
          chip renders a session state off the one status table, the pill
          renders a tone you chose. If a pill is showing &ldquo;Failed&rdquo; it
          should be a chip. What is left for the pill is identity and category,
          which is what <code>violet</code> exists for: it is the one tone with
          no status meaning.
        </p>
        <p className="t-prose ink-tertiary" style={{ marginTop: 8 }}>
          <code>ui/Pill</code> had zero product call sites before this pass, as
          did <code>ui/Surface</code> and <code>ui/Overlay</code>. That is worth
          stating plainly rather than hiding: three primitives existed, were
          correct, and were reimplemented by hand elsewhere because nobody knew
          they were there. This page is where a reader finds out.
        </p>
      </div>
      <Correction>
        The dotted row used to read &ldquo;Running&rdquo;,
        &ldquo;Complete&rdquo; and &ldquo;Needs review&rdquo;, three labels that
        the vocabulary retires. Pill&apos;s tone palette also used to carry its
        own hexes, which made it a seventh green: its success was{" "}
        <code>#1EFF00</code> while the Dashboard&apos;s was{" "}
        <code>#2FA35F</code>. It now maps onto the semantic pairs.
      </Correction>
    </div>
  );
}

function CyclePickerDemo() {
  const [cycle, setCycle] = useState(CURRENT_CYCLE);
  const prev = previousCycle(cycle);
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title={`ui/CyclePicker · ${cycleOptions.length} cycles, derived from the session history`}>
        <div className="flex flex-row items-center" style={{ gap: 12 }}>
          <CyclePicker
            value={cycle}
            options={cycleOptions}
            onChange={setCycle}
          />
          <span className="t-body ink-secondary">
            Screen is scoped to <strong>{cycle}</strong>
            {prev ? (
              <>
                {" "}
                · trends read &ldquo;vs {shortCycle(prev)}&rdquo;
              </>
            ) : (
              <> · no earlier cycle to compare against</>
            )}
          </span>
        </div>
      </ComponentDemo>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            One control on every screen scoped to a period, in the same place:
            page header, right, left of the primary action. The cycle gets
            stated once per screen.
          </li>
          <li>
            <code>cycleOptions</code> is derived from the sessions that exist,
            so every cycle the picker offers is one the data can actually
            answer for.
          </li>
          <li>
            The menu closes on outside click <em>and</em> Escape. Both, always:
            a menu that only closes on one of the two traps a keyboard user.
          </li>
          <li>
            Menu chrome is the shared recipe: white fill,{" "}
            <code>--line-menu</code> border, <code>--radius-sheet</code>,{" "}
            <code>--shadow-depth-3</code>, 4px padding.
          </li>
          <li>
            Anything the picker re-scopes derives from it too.{" "}
            <code>previousCycle(cycle)</code> and{" "}
            <code>shortCycle(cycle)</code> give a comparison label, and{" "}
            <code>sessionsInCycle</code> / <code>aiAgentsFor(cycle)</code> give
            the figures. Trend labels used to hardcode &ldquo;vs Apr&rdquo;
            while the picker above them could say any month, so choosing January
            produced &ldquo;vs Apr&rdquo;.
          </li>
        </ul>
      </div>
      <Correction>
        This page previously demonstrated the cycle control as a hand-rolled{" "}
        <code>&lt;button&gt;</code> at 35px tall reading{" "}
        <code>May 2026 ▾</code>, with a chevron and no handler. The product had
        the same dead pill on four screens. A chevron is a promise, and a
        promise a control cannot keep is worse than plain text, because plain
        text does not invite a click.
      </Correction>
    </div>
  );
}

function Tooltips() {
  return (
    <ComponentDemo title="Hover-triggered lifted tooltip with a colored leading dot">
      <div
        className="flex flex-row items-center"
        style={{ gap: 32, flexWrap: "wrap", padding: "24px 0" }}
      >
        <Tooltip label="Exception detected" tone="danger">
          <span
            className="inline-flex items-center t-body ink-primary"
            style={{
              height: "var(--control-md)",
              padding: "0 12px",
              background: "var(--surface-control)",
              border: "1px solid #FFFFFF",
              boxShadow: "var(--shadow-chip)",
              borderRadius: 999,
              cursor: "default",
            }}
          >
            Hover · danger
          </span>
        </Tooltip>
        <Tooltip label="Matched 2 ledgers" tone="success" side="top">
          <span
            className="inline-flex items-center t-body ink-primary"
            style={{
              height: "var(--control-md)",
              padding: "0 12px",
              background: "var(--surface-control)",
              border: "1px solid #FFFFFF",
              boxShadow: "var(--shadow-chip)",
              borderRadius: 999,
              cursor: "default",
            }}
          >
            Hover · success
          </span>
        </Tooltip>
        <Tooltip label="Drag here to upload" tone="info" side="bottom">
          <Info size={20} strokeWidth={1.5} color="var(--ink-tertiary)" />
        </Tooltip>
      </div>
    </ComponentDemo>
  );
}

function Overlays() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="Backdrop + floating surface · Escape or click outside to dismiss">
        <div className="flex flex-row" style={{ gap: 12 }}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            Open overlay
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
        <Overlay open={open} onDismiss={() => setOpen(false)}>
          <OverlayCard width={420}>
            <div style={{ padding: 24 }}>
              <div className="t-title ink-primary" style={{ marginBottom: 6 }}>
                Confirm posting
              </div>
              <p className="t-prose ink-secondary" style={{ marginBottom: 20 }}>
                41 matched records will be posted to Yardi. This cannot be
                undone from Reconciliation.
              </p>
              <div className="flex flex-row justify-end" style={{ gap: 8 }}>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setOpen(false)}>
                  Post to Yardi
                </Button>
              </div>
            </div>
          </OverlayCard>
        </Overlay>
      </ComponentDemo>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            Scrim <code>--scrim</code> with <code>--scrim-blur</code>. No
            bespoke gradients and no hand-rolled backdrops: two modals over the
            same canvas have to dim it by the same amount.
          </li>
          <li>
            Card radius <code>--radius-panel</code>, shadow{" "}
            <code>--shadow-depth-4</code>. The card is the only lifted surface
            inside the overlay, which is why <code>BulkUploadCard</code> takes a{" "}
            <code>flat</code> prop when it is used inside one.
          </li>
          <li>
            For an irreversible action anchored to its own trigger rather than
            centred on the screen, use{" "}
            <code>ui/ConfirmPopoverButton</code> instead. Same dismissal
            contract, popover chrome rather than modal chrome.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Icons() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <IconScale />
      <IconVocabulary />
      <IconContexts />
      <Correction>
        The scale table here used to document{" "}
        <code>SquareChevronLeft</code> and <code>ArrowDownUp</code> at 20 with{" "}
        <code>strokeWidth 2</code>, <code>Search</code> at 15/1.75,{" "}
        <code>FileText</code> and <code>Landmark</code> at 12/1, and{" "}
        <code>Building2</code> at 20/1.25. None of those five pairings is legal
        and none of them is what the product renders. The audit found 21
        distinct size and stroke combinations across 73 sites, including eleven
        different weights at 14px alone, from hairline 1 to chunky 3. The page
        itself was drawing 12px and 15px glyphs in its own demos while
        publishing the rule that bans them.
      </Correction>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        <p className="t-prose ink-tertiary">
          One outstanding drift, stated rather than papered over: the
          right-hand agents panel still collapses with{" "}
          <code>SquareChevronLeft</code> / <code>SquareChevronRight</code> while
          the left nav uses <code>PanelLeftClose</code> /{" "}
          <code>PanelLeftOpen</code>. The contract names the panel pair; the
          agents panel has not been migrated because its chevron points the
          other way and the mirrored Lucide glyph needs a look first.
        </p>
      </div>
    </div>
  );
}

function IconScale() {
  const pairs: {
    size: number;
    stroke: number;
    sizeToken: string;
    strokeToken: string;
    use: string;
    Icon: typeof LayoutDashboard;
  }[] = [
    {
      size: 14,
      stroke: 1.75,
      sizeToken: "--icon-sm",
      strokeToken: "--stroke-sm",
      use: "Inline beside meta text, chips, button affixes",
      Icon: Search,
    },
    {
      size: 16,
      stroke: 1.5,
      sizeToken: "--icon-md",
      strokeToken: "--stroke-md",
      use: "Nav items, tabs, row leading icons",
      Icon: PanelLeftClose,
    },
    {
      size: 20,
      stroke: 1.5,
      sizeToken: "--icon-lg",
      strokeToken: "--stroke-md",
      use: "Section and page headers, card headers",
      Icon: Landmark,
    },
    {
      size: 24,
      stroke: 1.5,
      sizeToken: "--icon-mark",
      strokeToken: "--stroke-md",
      use: "Record marks, dropzone affordances",
      Icon: FileUp,
    },
  ];
  return (
    <TokenCard title="Four pairings, nothing else. Size and stroke always travel together.">
      {pairs.map((p, i) => (
        <div
          key={p.size}
          className="flex flex-row items-center"
          style={{
            padding: "14px 20px",
            gap: 20,
            borderBottom:
              i === pairs.length - 1 ? "none" : "1px solid var(--line-soft)",
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 40, height: 40, color: "var(--ink-secondary)" }}
          >
            <p.Icon size={p.size} strokeWidth={p.stroke} />
          </div>
          <div className="shrink-0 t-body nums ink-primary" style={{ width: 80 }}>
            {p.size} / {p.stroke}
          </div>
          <div className="shrink-0" style={{ width: 200 }}>
            <Mono>
              {p.sizeToken} · {p.strokeToken}
            </Mono>
          </div>
          <div className="flex-1 t-prose ink-secondary">{p.use}</div>
        </div>
      ))}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <p className="t-prose ink-tertiary">
          Small icons need a touch more weight to stay visible and large ones
          read better relatively thinner. That optical ramp is how icon families
          are drawn, and it is why this is not one stroke value. Decorative SVG
          (<code>WireConnector</code>, <code>TieoutMark</code>,{" "}
          <code>PixelField</code>, <code>DotGridAvatar</code>) is exempt: that is
          artwork, not glyphs.
        </p>
      </div>
    </TokenCard>
  );
}

function IconVocabulary() {
  const items: { Icon: typeof LayoutDashboard; concept: string; note?: string }[] = [
    { Icon: CircleAlert, concept: "Open · unresolved", note: "AlertCircle is the deprecated alias. Use the current name." },
    { Icon: TriangleAlert, concept: "Exception" },
    { Icon: Check, concept: "Completed" },
    { Icon: ChevronRight, concept: "Disclosure, collapsed" },
    { Icon: ChevronDown, concept: "Disclosure, expanded" },
    { Icon: PanelLeftClose, concept: "Panel collapse" },
    { Icon: PanelLeftOpen, concept: "Panel expand" },
    { Icon: FileUp, concept: "Upload target · dropzone only" },
    { Icon: Upload, concept: "Upload action · buttons, chips, menu items" },
    { Icon: LayoutDashboard, concept: "Dashboard" },
    { Icon: GitCompareArrows, concept: "Reconciliation" },
    { Icon: Building2, concept: "Property", note: "Never House. Seed properties are 6 to 112 units." },
    { Icon: Landmark, concept: "Bank · statement" },
    { Icon: Table, concept: "Ledger" },
    { Icon: FileText, concept: "Document · a single file" },
    { Icon: Search, concept: "Search" },
    { Icon: SlidersHorizontal, concept: "Sort and filter" },
  ];
  return (
    <TokenCard title="One glyph per concept. Check this table before reaching for a new import.">
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 1,
          background: "var(--line-soft)",
        }}
      >
        {items.map((it) => (
          <div
            key={it.concept}
            className="flex flex-row items-start"
            style={{
              gap: 12,
              padding: "14px 16px",
              background: "var(--surface-card)",
            }}
          >
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{ width: 20, height: 20, color: "var(--ink-secondary)" }}
            >
              <it.Icon size={16} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="t-body ink-primary">{it.concept}</div>
              {it.note && (
                <div className="t-meta ink-tertiary" style={{ marginTop: 2 }}>
                  {it.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </TokenCard>
  );
}

function IconContexts() {
  const sets: {
    title: string;
    bg: string;
    color: string;
    onDark?: boolean;
    items: { Icon: typeof LayoutDashboard; size: number; stroke: number; name: string }[];
  }[] = [
    {
      title: "LeftRail · on the dark root",
      bg: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
      color: "#FFFFFF",
      onDark: true,
      items: [
        { Icon: LayoutDashboard, size: 20, stroke: 1.5, name: "Dashboard" },
        { Icon: GitCompareArrows, size: 20, stroke: 1.5, name: "Reconciliation" },
        { Icon: Building2, size: 20, stroke: 1.5, name: "Properties" },
      ],
    },
    {
      title: "LeftRail · selected, inside the chip",
      bg: "var(--surface-chip)",
      color: "var(--ink-secondary)",
      items: [
        { Icon: GitCompareArrows, size: 20, stroke: 1.5, name: "Reconciliation, active" },
      ],
    },
    {
      title: "WorkspaceNav top bar",
      bg: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
      color: "#FFFFFF",
      onDark: true,
      items: [
        { Icon: PanelLeftClose, size: 16, stroke: 1.5, name: "Collapse" },
        { Icon: SlidersHorizontal, size: 14, stroke: 1.75, name: "Sort" },
        { Icon: Search, size: 14, stroke: 1.75, name: "Search" },
      ],
    },
    {
      title: "Card headers",
      bg: "var(--surface-card)",
      color: "var(--ink-secondary)",
      items: [
        { Icon: Landmark, size: 20, stroke: 1.5, name: "Statement" },
        { Icon: Table, size: 20, stroke: 1.5, name: "Ledger" },
      ],
    },
    {
      title: "Canvas header and dropzone · icon-mark",
      bg: "var(--surface-card)",
      color: "var(--ink-secondary)",
      items: [
        { Icon: Building2, size: 24, stroke: 1.5, name: "Property, 24px" },
        { Icon: FileUp, size: 24, stroke: 1.5, name: "Dropzone, 24px" },
      ],
    },
    {
      title: "Disclosure",
      bg: "var(--surface-card)",
      color: "var(--ink-tertiary)",
      items: [
        { Icon: ChevronRight, size: 16, stroke: 1.5, name: "Collapsed" },
        { Icon: ChevronDown, size: 16, stroke: 1.5, name: "Expanded" },
      ],
    },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {sets.map((s) => (
        <TokenCard key={s.title} title={s.title}>
          <div
            className="flex flex-row flex-wrap"
            style={{ padding: 20, gap: 16, background: s.bg }}
          >
            {s.items.map(({ Icon, size, stroke, name }) => (
              <div
                key={name}
                className="flex flex-col items-center"
                style={{ gap: 8, minWidth: 100 }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40, color: s.color }}
                >
                  <Icon size={size} strokeWidth={stroke} />
                </div>
                <div
                  className="text-center t-meta"
                  style={{
                    color: s.onDark ? "#FFFFFF" : "var(--ink-tertiary)",
                  }}
                >
                  {name}
                </div>
              </div>
            ))}
          </div>
        </TokenCard>
      ))}
    </div>
  );
}

function AgentShapes() {
  /* PixelField paints to a canvas, so it needs a resolved hex rather than a
   * custom property. These are the literal values of --agent-intake,
   * --agent-reconciliation and --agent-summary; if those move, move these. */
  const tiles: {
    shape: "arrow" | "cluster" | "swirl";
    accent: string;
    token: string;
    role: string;
    use: string;
  }[] = [
    {
      shape: "arrow",
      accent: "#5B6AB8",
      token: "--agent-intake",
      role: "Intake",
      use: "Incoming and directional: files arriving and being classified.",
    },
    {
      shape: "cluster",
      accent: "#3E8C93",
      token: "--agent-reconciliation",
      role: "Reconciliation",
      use: "Grouping and matching: bank rows converging on the ledger.",
    },
    {
      shape: "swirl",
      accent: "#8A6BBF",
      token: "--agent-summary",
      role: "Summary",
      use: "Synthesis and loop: closing the cycle and producing artifacts.",
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
        {tiles.map((t) => (
          <div
            key={t.role}
            className="flex flex-row items-center"
            style={{
              padding: 16,
              gap: 20,
              background: "var(--surface-card)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--radius-card)",
              minWidth: 320,
              flex: 1,
            }}
          >
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: 88, height: 88, borderRadius: "var(--radius-card)" }}
            >
              <PixelField
                shape={t.shape}
                size={88}
                gridSize={28}
                samples={2}
                dotColor="#2C353E"
                accentColor={t.accent}
                accentReach={0.7}
                bgColor="#F7F8FA"
                dotBase={0.08}
                dotMax={0.92}
              />
            </div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <div className="t-title ink-primary">{t.role}</div>
              <Mono>
                shape: {t.shape} · {t.token}
              </Mono>
              <div
                className="t-prose ink-secondary"
                style={{ maxWidth: 240 }}
              >
                {t.use}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 6 }}>
          Implementation notes
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            The motion is tuned in the component (per-cycle easings,
            ease-out-back bloom, ease-in cubic fade). Do not change the internal
            easings without checking the look.
          </li>
          <li>
            In the panel each canvas is 36×36 with gridSize 20, samples 2: low
            enough density to stay readable at small sizes while keeping the
            bloom legible.
          </li>
          <li>
            <code>bgColor</code> matches the agent card so the canvas blends
            invisibly into its surface, and <code>dotColor</code> is the
            resolved <code>--ink-primary</code>. Canvas cannot read a custom
            property, which is the one place in this system where a literal hex
            is the right answer.
          </li>
        </ul>
      </div>
      <Correction>
        The three accents used to be <code>#FF8A1F</code>,{" "}
        <code>#1F7FFF</code> and <code>#7C4DFF</code>, none of which is a token,
        and the first of which is one of the app&apos;s three retired ambers.
        Agent identity now comes off the <code>--agent-*</code> trio, kept
        structurally apart from the status ramp because the two answer different
        questions.
      </Correction>
    </div>
  );
}

function Surfaces() {
  const roles: [string, string, string, string, string][] = [
    ["Panel · rail · modal card", "--radius-panel", "--surface-card", "none", "--shadow-depth-2"],
    ["Content card on canvas", "--radius-card", "--surface-card", "none", "--shadow-card"],
    ["Bright inner sheet", "--radius-sheet", "--surface-list", "none", "--shadow-depth-1"],
    ["Row inside a sheet", "--radius-row", "transparent", "transparent", "none"],
    ["Chip · control", "--radius-control or 999", "--surface-control", "#FFFFFF", "--shadow-chip"],
  ];
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <TokenCard title="Five roles. One radius, one fill, one shadow each.">
        <div style={{ padding: "4px 0" }}>
          {roles.map(([role, radius, fill, border, shadow], i) => (
            <div
              key={role}
              className="flex flex-row items-center"
              style={{
                padding: "12px 20px",
                gap: 16,
                borderBottom:
                  i === roles.length - 1 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              <div className="t-body ink-primary shrink-0" style={{ width: 200 }}>
                {role}
              </div>
              <div className="flex-1 min-w-0">
                <Mono>
                  {radius} · {fill} · border {border} · {shadow}
                </Mono>
              </div>
            </div>
          ))}
        </div>
      </TokenCard>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            padding: 32,
            background: "var(--bg-grad)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="t-label" style={{ marginBottom: 12 }}>
            MainCanvas · the work surface
          </div>
          <Surface radius="md" depth={2} style={{ padding: 16 }}>
            <div className="t-body ink-primary">
              Card resting on the canvas gradient.
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "var(--surface-list)",
                borderRadius: "var(--radius-sheet)",
                boxShadow: "var(--shadow-depth-1)",
              }}
            >
              <div className="t-body ink-secondary">
                And the brighter sheet nested inside it.
              </div>
            </div>
          </Surface>
        </div>

        <div
          className="flex flex-row items-stretch"
          style={{
            background: "var(--bg-side)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--radius-card)",
            padding: 12,
            gap: 10,
          }}
        >
          <Surface
            radius="xl"
            depth={2}
            tone="glow"
            className="flex-1"
            style={{ padding: "20px 24px", minHeight: 140 }}
          >
            <div className="t-label" style={{ marginBottom: 8 }}>
              AgentsPanel inner card
            </div>
            <div className="t-body ink-primary">
              <code>--radius-panel</code>, a 12px gutter of{" "}
              <code>--bg-side</code> around it.
            </div>
          </Surface>
        </div>
      </div>

      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 8 }}>
          Listing rows have one hover, everywhere
        </div>
        <p className="t-prose ink-secondary">
          Lift to <code>#FFFFFF</code>, <code>1px solid var(--line-row-hover)</code>,{" "}
          <code>--shadow-chip</code>, radius <code>--radius-row</code>. The
          resting border is transparent so nothing shifts on hover.{" "}
          <code>--surface-row-hover</code> is retired.
        </p>
        <p className="t-prose ink-secondary" style={{ marginTop: 8 }}>
          <strong>No dashed borders anywhere.</strong> Hover paints{" "}
          <code>1px solid var(--line)</code>; drag-over paints{" "}
          <code>1px solid var(--dot-active)</code>.
        </p>
      </div>
    </div>
  );
}

function Chips() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div
        style={{
          background: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
          padding: 32,
        }}
      >
        <div
          className="t-meta"
          style={{ color: "#FFFFFF", marginBottom: 16 }}
        >
          Lifted chips read against the cool grey-blue root.
        </div>
        <div className="flex flex-row flex-wrap items-center" style={{ gap: 12 }}>
          <ChipDemo
            bg="var(--surface-control)"
            label="Control · May 2026 · Re-run"
          />
          <ChipDemo bg="var(--surface-chip)" label="Selected row" />
          <ChipDemo bg="var(--surface-tab-active)" label="Active tab" />
          <ChipDemo
            bg="var(--chip-failed-bg)"
            borderColor="var(--chip-failed-border)"
            radius="var(--radius-small)"
            label="1293 Ohio Ave · Q2 statement"
            icon={
              <FileText
                size={14}
                strokeWidth={1.75}
                color="var(--status-danger-ink)"
              />
            }
          />
        </div>
      </div>
      <Correction>
        Every chip here carried <code>0 2px 4px rgba(0,0,0,0.1)</code> and a
        14px label, and one of them read <code>May 2026 — 2</code> while another
        read <code>May 2026 ▾</code> and a third, further down the page, read{" "}
        <code>May 2026 - 2</code>. The session label has one form:{" "}
        <code>May 2026 · Re-run</code>, produced by{" "}
        <code>PropertySession.label</code> in the seed so no surface has to
        spell it itself.
      </Correction>
    </div>
  );
}

function ChipDemo({
  bg,
  label,
  radius,
  borderColor,
  icon,
}: {
  bg: string;
  label: string;
  radius?: string;
  borderColor?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="flex flex-row items-center t-body ink-primary"
      style={{
        height: "var(--control-md)",
        background: bg,
        border: `1px solid ${borderColor ?? "#FFFFFF"}`,
        boxShadow: "var(--shadow-chip)",
        borderRadius: radius ?? "var(--radius-control)",
        padding: "0 12px",
        gap: 6,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Inputs() {
  const [cycle, setCycle] = useState(CURRENT_CYCLE);
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
        borderRadius: "var(--radius-card)",
        padding: 24,
      }}
    >
      <div className="flex flex-col" style={{ gap: 16, maxWidth: 400 }}>
        <div
          className="flex flex-row items-center"
          style={{
            height: "var(--control-md)",
            padding: "0 8px 0 10px",
            gap: 8,
            background: "var(--surface-input)",
            border: "1px solid var(--line-inner-white)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
          <span className="t-body ink-tertiary">Search</span>
        </div>
        <div className="flex flex-row items-center" style={{ gap: 12 }}>
          <CyclePicker value={cycle} options={cycleOptions} onChange={setCycle} />
          <IconButton variant="secondary" size="md" ariaLabel="Sort and filter">
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </IconButton>
          <Button variant="secondary" size="md" leftIcon={<Upload size={14} strokeWidth={1.75} />}>
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

function GradientText() {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--radius-card)",
        padding: 20,
      }}
    >
      <div className="flex flex-col" style={{ gap: 14 }}>
        <span className="text-grad-neutral t-body">
          Neutral · #454547 → #A8A9AD
        </span>
        <span className="text-grad-failed t-body">
          Failed · #FF0000 → #FFA1A1
        </span>
        <span className="text-grad-approved t-body">
          Approved · #001AFF → #6A85FF
        </span>
        <span className="text-grad-unapproved t-body">
          Unapproved · #FF0000 → #FFA1A1
        </span>
      </div>
      <div
        style={{
          marginTop: 16,
          padding: "var(--pad-card)",
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
        }}
      >
        <div className="t-label" style={{ marginBottom: 4 }}>
          Deprecated
        </div>
        <p className="t-prose ink-secondary">
          Eight <code>background-clip: text</code> utilities colour in-sentence
          runs in the agents panel, and a shimmer variant animates text colour
          to mean &ldquo;working&rdquo;. Status is already carried by the dot
          and the label, so the gradient adds no meaning and the shimmer is
          reading state out of a decoration. They are slated for removal and
          tracked separately, because it touches the agents panel. Do not add
          new call sites. <code>Approved</code> and <code>Unapproved</code> also
          name states the vocabulary retired: those are{" "}
          <strong>Matched</strong> and <strong>Exception</strong> now.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Component demos ───────────────────────── */

function Components() {
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <ComponentDemo title="Session row · selected vs default">
        <div className="flex flex-col" style={{ gap: 4, maxWidth: 388 }}>
          <SessionRowDemo selected status="review" label="May 2026 · Re-run" />
          <SessionRowDemo selected={false} status="failed" label="May 2026" />
          <SessionRowDemo selected={false} status="completed" label="Apr 2026" />
        </div>
      </ComponentDemo>

      <ComponentDemo title="Property row · the Reconciliation nav's two-line row">
        <PropertyRow status="review" />
      </ComponentDemo>

      <ComponentDemo title="Bank statement card">
        <BankCardDemo />
      </ComponentDemo>

      <ComponentDemo title="Ledger card">
        <LedgerCardDemo />
      </ComponentDemo>

      <ComponentDemo title="Bank ↔ Ledger pair with wire">
        <div className="flex flex-row items-start" style={{ width: "100%" }}>
          <BankCardDemo />
          <div
            className="flex-1 flex items-center justify-center"
            style={{ minWidth: 80, marginInline: -3 }}
          >
            <WireConnector width={305} height={262} />
          </div>
          <LedgerCardDemo />
        </div>
      </ComponentDemo>

      <ComponentDemo title="Tabs · one recipe, the Dashboard's">
        <div className="flex flex-row items-center" style={{ gap: 4 }}>
          <TabDemo label="Agents" count={3} active />
          <TabDemo label="Knowledge" count={12} />
        </div>
      </ComponentDemo>

      <ComponentDemo title="Failed file chip">
        <div className="flex flex-row" style={{ gap: 8, maxWidth: 340 }}>
          <FileChipDemo label="1293 Ohio Ave · Q2" icon="file-text" />
          <FileChipDemo label="Citigroup statement" icon="landmark" />
        </div>
      </ComponentDemo>

      <Correction>
        The two pair cards used to hardcode a fourth copy of the upload payload,
        and it disagreed with the seed on three counts: it named{" "}
        <code>Tahoe Holdings LLC dba 1247 Mission St</code>, which is the wrong
        property (<code>TH-1247</code> is 1849 Westlake in Seattle; 1247 Mission
        is <code>MIS-1247</code> in San Francisco), it set a July 2026 period on
        a May 2026 session, and it wrote{" "}
        <code>GL 1010 — Operating Cash</code> with an em dash where the seed
        uses a middot. They now read straight off{" "}
        <code>propertyBanks[0].uploaded</code>, which is{" "}
        <code>banksFor(propertyByCode[&quot;TH-1247&quot;])[0]</code>, so they
        cannot drift again.
      </Correction>
    </div>
  );
}

function ComponentDemo({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      <div
        className="t-meta ink-tertiary"
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          padding: 24,
          background: "var(--bg-grad)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SessionRowDemo({
  selected,
  status,
  label,
}: {
  selected: boolean;
  status: StatusKey;
  label: string;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: "var(--row-md)",
        padding: "0 10px",
        gap: 8,
        background: selected ? "var(--surface-chip)" : "transparent",
        border: selected ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
      }}
    >
      <StatusDot status={status} />
      <span
        className="t-body ink-primary flex-1"
        style={{ fontWeight: selected ? 500 : 400 }}
      >
        {label}
      </span>
      <span className="t-meta ink-tertiary">{STATUS_META[status].label}</span>
    </div>
  );
}

function PropertyRow({ status }: { status: StatusKey }) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: 440,
        padding: "12px 16px",
        gap: 12,
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="relative shrink-0" style={{ width: 20, height: 20 }}>
        <Building2 size={20} strokeWidth={1.5} color="var(--ink-secondary)" />
        <StatusDot
          status={status}
          ring
          size={8}
          style={{ position: "absolute", right: -3, bottom: -3 }}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
        <span className="t-body ink-primary" style={{ fontWeight: 500 }}>
          1849 Westlake Ave N, Seattle, WA 98109
        </span>
        <span className="t-meta ink-tertiary nums">
          3 sessions · 4 accounts
        </span>
      </div>
      <span
        className="inline-flex shrink-0"
        style={{ color: "var(--ink-tertiary)" }}
      >
        <ChevronRight size={16} strokeWidth={1.5} />
      </span>
    </div>
  );
}

/* One concrete pair, read off the seed rather than restated. `propertyBanks`
 * is `banksFor(propertyByCode["TH-1247"])`, so the holder, the account, the
 * period and the GL code below are the same strings the product renders. */
const demoPair = propertyBanks[0]?.uploaded;

function BankCardDemo() {
  const b = demoPair?.bank;
  return (
    <div
      className="flex flex-col"
      style={{
        width: 295,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex flex-row" style={{ gap: 8 }}>
        <Image
          src={propertyBanks[0]?.logoSrc ?? "/logos/chase.png"}
          width={24}
          height={24}
          alt=""
          style={{ width: 24, height: 24, flexShrink: 0 }}
        />
        <div className="flex flex-col" style={{ gap: 4 }}>
          <div className="t-title ink-primary">{b?.bank.name}</div>
          <div className="t-meta ink-tertiary">{b?.bank.address}</div>
        </div>
      </div>
      <div style={{ width: "100%", height: 1, background: "var(--line-hair)" }} />
      <Field label="Account holder" value={b?.accountHolder ?? ""} />
      <Field label="Account number" value={b?.accountNumber ?? ""} nums />
      <Field label="Period" value={b?.period ?? ""} nums />
      <div className="t-meta ink-tertiary nums">Issued {b?.issue}</div>
    </div>
  );
}

function LedgerCardDemo() {
  const l = demoPair?.ledger;
  return (
    <div
      className="flex flex-col"
      style={{
        width: 295,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex flex-row" style={{ gap: 8 }}>
        <Table
          size={20}
          strokeWidth={1.5}
          color="var(--ink-secondary)"
          style={{ flexShrink: 0 }}
        />
        <div className="flex flex-col" style={{ gap: 4 }}>
          <div className="t-title ink-primary">Ledger</div>
          <div className="t-meta ink-tertiary">
            {l?.source}
            <br />
            Tenant: {l?.tenantId}
          </div>
        </div>
      </div>
      <div style={{ width: "100%", height: 1, background: "var(--line-hair)" }} />
      <Field label="Property & code" value={l?.propertyAndCode ?? ""} />
      <Field label="Cash account" value={l?.cashAccount ?? ""} nums />
      <Field label="Period" value={l?.period ?? ""} nums />
      <div className="t-meta ink-tertiary nums">Exported {l?.exported}</div>
    </div>
  );
}

function Field({
  label,
  value,
  nums,
}: {
  label: string;
  value: string;
  nums?: boolean;
}) {
  return (
    <div className="flex flex-row" style={{ gap: 12, width: "100%" }}>
      <div className="shrink-0 t-meta ink-tertiary" style={{ width: 106 }}>
        {label}
      </div>
      <div className={`flex-1 t-body ink-primary${nums ? " nums" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function TabDemo({
  label,
  count,
  active,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: "var(--control-md)",
        padding: "0 12px",
        gap: 6,
        background: active ? "var(--surface-tab-active)" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-control)",
      }}
    >
      <span
        className="t-body"
        style={{
          fontWeight: active ? 500 : 400,
          color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
        }}
      >
        {label}
      </span>
      <span className="t-meta nums ink-tertiary">{count}</span>
    </div>
  );
}

function UploadFlow() {
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 4 }}>
          Flow rule · each lifecycle state owns the whole canvas
        </div>
        <p className="t-prose ink-secondary">
          These components are the entirety of the <strong>draft</strong> state.
          The reconciliation pair cards (bank, wire, ledger) only appear{" "}
          <em>after</em> the reconciler has uploaded statements. Do not render
          both at once.
        </p>
      </div>

      <ComponentDemo title="Bulk upload card · per-bank pills">
        <BulkUploadCard
          banks={propertyBanks}
          uploads={{}}
          onUploadStatement={() => {}}
        />
      </ComponentDemo>

      <ComponentDemo title="Bank upload list · compact secondary path">
        <BankUploadList banks={propertyBanks} />
      </ComponentDemo>

      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 8 }}>
          Design-language notes
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            The dropzone glyph is <code>FileUp</code> at{" "}
            <code>--icon-mark</code>. It is the one place in the app a file is
            being <em>received</em> rather than sent, which is why it is not{" "}
            <code>Upload</code>.
          </li>
          <li>
            No dashed borders anywhere. Hover paints{" "}
            <code>1px solid var(--line)</code>; drag-over paints{" "}
            <code>1px solid var(--dot-active)</code>.
          </li>
          <li>
            Action chips on both cards are the shared control chip:{" "}
            <code>--surface-control</code>, 1px white border,{" "}
            <code>--shadow-chip</code>.
          </li>
          <li>
            Every bank needs <strong>both</strong> a statement and a Yardi
            ledger, so a bank carries two independent slots and{" "}
            <code>slotsFilled(bank)</code> derives the 0/1/2 count. The pair
            card is only meaningful once both are filled.
          </li>
          <li>
            Account masking uses bullets (<code>•••• 3421</code>) in the compact
            rows for legibility; the full pair cards keep the asterisk
            convention from the Figma spec.
          </li>
        </ul>
      </div>

      <div
        style={{
          padding: "var(--pad-card)",
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="t-title ink-primary" style={{ marginBottom: 4 }}>
          When to use each
        </div>
        <ul className="t-prose ink-secondary" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <strong>Bulk:</strong> the reconciler has all statements in hand.
            Faster; classification happens server-side.
          </li>
          <li>
            <strong>Per bank:</strong> the reconciler is missing a single
            statement, or wants to be explicit about which file belongs to which
            account.
          </li>
        </ul>
      </div>
    </div>
  );
}

function FileChipDemo({
  label,
  icon,
}: {
  label: string;
  icon: "file-text" | "landmark";
}) {
  const Icon = icon === "file-text" ? FileText : Landmark;
  return (
    <div
      className="flex flex-row items-center flex-1 min-w-0"
      style={{
        height: "var(--control-sm)",
        padding: "0 6px",
        gap: 6,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: "var(--radius-small)",
      }}
    >
      <Icon size={14} strokeWidth={1.75} color="var(--status-danger-ink)" />
      <span className="truncate t-meta ink-primary">{label}</span>
    </div>
  );
}
