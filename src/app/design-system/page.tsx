"use client";

/* Reconciliation · Design System
 * A living reference of every token and component in the locked system.
 * Source of truth for engineers and designers. Edit the underlying tokens in
 * src/app/globals.css and the components in src/components/. */

import {
  ArrowDownUp,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Files,
  House,
  Landmark,
  LayoutDashboard,
  Search,
  SquareChevronLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { BankUploadList } from "@/components/BankUploadList";
import { BulkUploadCard } from "@/components/BulkUploadCard";
import { PixelField } from "@/components/PixelField";
import { propertyBanks } from "@/lib/seed";
import { StatusDot } from "@/components/StatusDot";
import { Button, IconButton } from "@/components/ui/Button";
import { Overlay, OverlayCard } from "@/components/ui/Overlay";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import { Tooltip } from "@/components/ui/Tooltip";
import { WireConnector } from "@/components/WireConnector";
import { Plus, ArrowUp, Info } from "lucide-react";

export default function DesignSystem() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#F7F8FA",
        color: "var(--text-1)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <DocHeader />
      <main
        className="mx-auto"
        style={{ maxWidth: 1120, padding: "0 32px 96px" }}
      >
        <Toc />
        <Section id="colors" title="Colors" subtitle="Foundational palette and semantic roles.">
          <Colors />
        </Section>
        <Section
          id="typography"
          title="Typography"
          subtitle="TASA Orbiter, regular weight throughout. Body font-size · line-height in pixels."
        >
          <Typography />
        </Section>
        <Section id="spacing" title="Spacing & layout" subtitle="Used by panels, paddings, gaps.">
          <Spacing />
        </Section>
        <Section id="radii" title="Radii" subtitle="From 6px chips to 20px outer panels.">
          <Radii />
        </Section>
        <Section id="shadows" title="Shadows" subtitle="Four named depth tokens — depth-1 (chip lift) through depth-4 (modal overlay).">
          <Shadows />
        </Section>
        <Section
          id="buttons"
          title="Buttons"
          subtitle="Three variants — primary (dark pill), secondary (light chip), ghost. All share size/radius."
        >
          <Buttons />
        </Section>
        <Section id="pills" title="Pills" subtitle="Display-only chips for status, role, and meta.">
          <Pills />
        </Section>
        <Section id="tooltips" title="Tooltips" subtitle="Hover-triggered lifted card with optional colored dot.">
          <Tooltips />
        </Section>
        <Section
          id="overlays"
          title="Overlays"
          subtitle="Backdrop + floating surface for modals and dialogs."
        >
          <Overlays />
        </Section>
        <Section
          id="icons"
          title="Icons"
          subtitle="lucide-react. Stroke and color paired to the context per Figma."
        >
          <Icons />
        </Section>
        <Section
          id="agents"
          title="Agent shapes"
          subtitle="Each agent renders a PixelField bloom — same canvas component, three shapes that read for what the role does."
        >
          <AgentShapes />
        </Section>
        <Section
          id="status"
          title="Status dots"
          subtitle="Three states — active, failed, complete."
        >
          <StatusDots />
        </Section>
        <Section id="surfaces" title="Surfaces" subtitle="Cards, panels, and lifted chips.">
          <Surfaces />
        </Section>
        <Section id="chips" title="Chips" subtitle="Lifted, neutral, and failed.">
          <Chips />
        </Section>
        <Section id="inputs" title="Inputs & buttons" subtitle="Search field, sort, month picker.">
          <Inputs />
        </Section>
        <Section
          id="gradient-text"
          title="Gradient text"
          subtitle="Multi-stop runs used in the agents panel."
        >
          <GradientText />
        </Section>
        <Section
          id="components"
          title="Components"
          subtitle="The composed pieces of the workspace."
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
          className="rounded-md"
          style={{
            width: 28,
            height: 28,
            background:
              "radial-gradient(circle at 30% 30%, #ffffff 0%, #d3d6d8 60%, #9db3c5 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
          }}
        />
        <div className="flex-1">
          <div
            style={{
              fontSize: 20,
              lineHeight: "24px",
              color: "var(--text-1)",
            }}
          >
            Reconciliation Design System
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: "14px",
              color: "var(--text-2)",
              marginTop: 2,
            }}
          >
            Locked direction · Figma 2026-06-27
          </div>
        </div>
        <Link
          href="/"
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--text-2)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          ← Back to workspace
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
    ["pills", "Pills"],
    ["tooltips", "Tooltips"],
    ["overlays", "Overlays"],
    ["icons", "Icons"],
    ["agents", "Agent shapes"],
    ["status", "Status dots"],
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
          style={{
            fontSize: 12,
            lineHeight: "14px",
            padding: "6px 10px",
            background: "var(--surface-card)",
            color: "var(--text-2)",
            border: "1px solid var(--line-soft)",
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
        <h2
          style={{
            fontSize: 28,
            lineHeight: "34px",
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--text-2)",
            marginTop: 6,
            maxWidth: 600,
          }}
        >
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────── Tokens ───────────────────────── */

function Colors() {
  const groups: { title: string; swatches: { name: string; value: string; desc: string }[] }[] = [
    {
      title: "Page",
      swatches: [
        {
          name: "Root gradient",
          value: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
          desc: "Outermost container. Shows through LeftRail + WorkspaceNav.",
        },
        {
          name: "Canvas gradient",
          value: "linear-gradient(150.68deg, #EEEFF5 0%, #DDDFE8 45.34%)",
          desc: "MainCanvas background. The lifted work surface.",
        },
        {
          name: "Agent gutter",
          value: "#DDDFE8",
          desc: "12px gutter around the rounded agent card.",
        },
      ],
    },
    {
      title: "Surfaces",
      swatches: [
        { name: "Card", value: "#F7F8FA", desc: "Bank, ledger, and agent panel inner card." },
        { name: "Chip (nav/session)", value: "#EFF3F8", desc: "LeftRail selected + Session selected." },
        { name: "Chip (tab)", value: "#E9EBF3", desc: "Active Agents/Knowledge tab." },
        { name: "Chip (month)", value: "#F2F4FB", desc: "Month-picker pill in canvas header." },
        {
          name: "Input field",
          value: "rgba(221, 223, 232, 0.4)",
          desc: "Translucent grey of the search input.",
        },
      ],
    },
    {
      title: "Lines",
      swatches: [
        { name: "Strong line", value: "#9DB3C5", desc: "Panel borders, session-list rule." },
        { name: "Soft line", value: "#D3D6D8", desc: "Agent panel inner border-right." },
        {
          name: "White inner border",
          value: "rgba(253, 255, 255, 0.6)",
          desc: "Inside lifted chips for the soft inset.",
        },
      ],
    },
    {
      title: "Text",
      swatches: [
        { name: "Primary", value: "#303B45", desc: "Headings, body, primary content." },
        { name: "Secondary", value: "#627483", desc: "Subtitles, meta lines." },
        { name: "Placeholder", value: "#63696E", desc: "Search placeholder." },
        { name: "Tertiary", value: "#7F7F87", desc: "File-chip icons, muted helpers." },
        { name: "Inactive tab", value: "#61717F", desc: "Tab label when not selected." },
        { name: "Building stroke", value: "#656C76", desc: "Building-2 icon in workspace rows." },
        { name: "Chevron stroke", value: "#43484E", desc: "Chevrons throughout." },
        { name: "Header building", value: "#464A51", desc: "28px building in canvas header." },
      ],
    },
    {
      title: "Status",
      swatches: [
        { name: "Active", value: "#001AFF", desc: "In-progress sessions, active dots." },
        { name: "Failed", value: "#FF0000", desc: "Failed sessions, unapproved counts." },
        { name: "Complete", value: "#1EFF00", desc: "Closed/successful sessions." },
      ],
    },
    {
      title: "Agent files",
      swatches: [
        { name: "Failed-file bg", value: "#FFF2F2", desc: "Pink tint for failed file chips." },
        { name: "Failed-file border", value: "#FFC0C0", desc: "1px border around failed chips." },
      ],
    },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      {groups.map((g) => (
        <div key={g.title}>
          <div
            style={{
              fontSize: 12,
              lineHeight: "14px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-2)",
              marginBottom: 12,
            }}
          >
            {g.title}
          </div>
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
    </div>
  );
}

function Swatch({
  name,
  value,
  desc,
}: {
  name: string;
  value: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 64,
          background: value,
          borderBottom: "1px solid var(--line-soft)",
        }}
      />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, lineHeight: "16px", color: "var(--text-1)" }}>
          {name}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            lineHeight: "14px",
            color: "var(--text-2)",
            marginTop: 4,
            wordBreak: "break-all",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 12,
            lineHeight: "15px",
            color: "var(--text-2)",
            marginTop: 6,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function Typography() {
  const rows: { size: number; lh: number; sample: string; use: string }[] = [
    { size: 28, lh: 34, sample: "1849 Westlake Ave N, Seattle, WA 98109", use: "Canvas h1" },
    { size: 20, lh: 24, sample: "Workspaces", use: "Panel title" },
    { size: 18, lh: 22, sample: "1849 Westlake Ave N, Seattle, WA 98109", use: "Workspace row" },
    { size: 16, lh: 19, sample: "May 2026 — 2", use: "Body / tab / session" },
    { size: 14, lh: 17, sample: "3 Sessions · 4 Banks", use: "Subtext" },
    { size: 12, lh: 14, sample: "Account Holder: Tahoe Holdings LLC", use: "Card field / agent line" },
    { size: 10, lh: 12, sample: "BADGE", use: "Counter badge" },
  ];
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-row items-baseline"
          style={{
            padding: "16px 20px",
            borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line-soft)",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 92,
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
            }}
            className="shrink-0"
          >
            {r.size}/{r.lh}
          </div>
          <div
            className="flex-1"
            style={{
              fontSize: r.size,
              lineHeight: `${r.lh}px`,
              color: "var(--text-1)",
            }}
          >
            {r.sample}
          </div>
          <div
            className="shrink-0"
            style={{
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--text-2)",
            }}
          >
            {r.use}
          </div>
        </div>
      ))}
    </div>
  );
}

function Spacing() {
  const steps = [4, 6, 8, 10, 12, 16, 20, 28, 32, 48, 60];
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div className="flex flex-row items-end" style={{ gap: 16 }}>
        {steps.map((s) => (
          <div key={s} className="flex flex-col items-center" style={{ gap: 8 }}>
            <div
              style={{
                width: s,
                height: s,
                background: "#A7B9C8",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {s}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
        }}
      >
        Panel padding: <code>28px 20px</code> (rails) ·{" "}
        <code>28px 60px 12px</code> (canvas) ·{" "}
        <code>12px 16px 12px 12px</code> (agent inner). Vertical rhythm 16/24/32/48.
      </div>
    </div>
  );
}

function Radii() {
  const values: { name: string; value: number; use: string }[] = [
    { name: "Chip / file-chip", value: 6, use: "Failed file chips" },
    { name: "Card / button", value: 8, use: "Inputs, nav chips, sessions" },
    { name: "Bank/Ledger card", value: 12, use: "Bento cards" },
    { name: "Agent panel", value: 20, use: "Outer rounded panel" },
    { name: "Pill", value: 999, use: "TOC chips, dots" },
  ];
  return (
    <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
      {values.map((v) => (
        <div
          key={v.name}
          className="flex flex-col items-center"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--line-soft)",
            borderRadius: 12,
            padding: 20,
            gap: 12,
            minWidth: 160,
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
            <div style={{ fontSize: 13, lineHeight: "16px", color: "var(--text-1)" }}>
              {v.name}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
              }}
            >
              {v.value}px
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-2)",
                marginTop: 6,
              }}
            >
              {v.use}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Shadows() {
  const shadows: { name: string; token: string; use: string }[] = [
    {
      name: "depth-1",
      token: "--shadow-depth-1",
      use: "Pills / chips at rest. Barely a lift.",
    },
    {
      name: "depth-2 · card",
      token: "--shadow-depth-2",
      use: "Bento cards (bank, ledger, agent inner).",
    },
    {
      name: "depth-3 · floating",
      token: "--shadow-depth-3",
      use: "Tooltips, popovers, drag-over state.",
    },
    {
      name: "depth-4 · overlay",
      token: "--shadow-depth-4",
      use: "Modals on dimmed backdrop.",
    },
  ];
  return (
    <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
      {shadows.map((s) => (
        <div
          key={s.name}
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--line-soft)",
            borderRadius: 12,
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
              borderRadius: 12,
              marginBottom: 16,
            }}
          />
          <div style={{ fontSize: 13, lineHeight: "16px", color: "var(--text-1)" }}>
            {s.name}
          </div>
          <div
            style={{
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              marginTop: 4,
            }}
          >
            {s.token}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: "15px",
              color: "var(--text-2)",
              marginTop: 6,
            }}
          >
            {s.use}
          </div>
        </div>
      ))}
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="Variants — primary · secondary · ghost">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </ComponentDemo>
      <ComponentDemo title="Sizes — sm · md · lg">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </ComponentDemo>
      <ComponentDemo title="Icon buttons — circular">
        <div className="flex flex-row items-center" style={{ gap: 12, flexWrap: "wrap" }}>
          <IconButton variant="secondary" size="sm" ariaLabel="Add">
            <Plus size={14} strokeWidth={1.75} />
          </IconButton>
          <IconButton variant="secondary" size="md" ariaLabel="Add">
            <Plus size={16} strokeWidth={1.75} />
          </IconButton>
          <IconButton variant="primary" size="md" ariaLabel="Send">
            <ArrowUp size={16} strokeWidth={2} />
          </IconButton>
          <IconButton variant="primary" size="lg" ariaLabel="Send">
            <ArrowUp size={18} strokeWidth={2} />
          </IconButton>
        </div>
      </ComponentDemo>
    </div>
  );
}

function Pills() {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <ComponentDemo title="Tones — neutral · info · success · warning · danger · violet">
        <div className="flex flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <Pill tone="neutral">Neutral</Pill>
          <Pill tone="info">Info</Pill>
          <Pill tone="success">Success</Pill>
          <Pill tone="warning">Warning</Pill>
          <Pill tone="danger">Danger</Pill>
          <Pill tone="violet">Violet</Pill>
        </div>
      </ComponentDemo>
      <ComponentDemo title="With leading status dot">
        <div className="flex flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <Pill tone="info" showDot>Running</Pill>
          <Pill tone="success" showDot>Complete</Pill>
          <Pill tone="warning" showDot>Needs review</Pill>
          <Pill tone="danger" showDot>Failed</Pill>
        </div>
      </ComponentDemo>
    </div>
  );
}

function Tooltips() {
  return (
    <ComponentDemo title="Hover-triggered lifted tooltip with colored dot">
      <div
        className="flex flex-row items-center"
        style={{ gap: 32, flexWrap: "wrap", padding: "24px 0" }}
      >
        <Tooltip label="Inconsistency detected" tone="danger">
          <span
            style={{
              padding: "8px 14px",
              background: "#F2F4FB",
              border: "1px solid #FFFFFF",
              boxShadow: "var(--shadow-chip)",
              borderRadius: 999,
              fontSize: 13,
              color: "var(--text-1)",
              cursor: "default",
            }}
          >
            Hover · danger
          </span>
        </Tooltip>
        <Tooltip label="Reconciled 2 ledgers" tone="success" side="top">
          <span
            style={{
              padding: "8px 14px",
              background: "#F2F4FB",
              border: "1px solid #FFFFFF",
              boxShadow: "var(--shadow-chip)",
              borderRadius: 999,
              fontSize: 13,
              color: "var(--text-1)",
              cursor: "default",
            }}
          >
            Hover · success
          </span>
        </Tooltip>
        <Tooltip label="Drag here to upload" tone="info" side="bottom">
          <Info size={20} strokeWidth={1.5} color="var(--text-2)" />
        </Tooltip>
      </div>
    </ComponentDemo>
  );
}

function Overlays() {
  const [open, setOpen] = useState(false);
  return (
    <ComponentDemo title="Backdrop + floating surface (Escape or click outside to dismiss)">
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
            <div
              style={{
                fontSize: 18,
                lineHeight: "22px",
                color: "var(--text-1)",
                marginBottom: 4,
              }}
            >
              Confirm posting
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: "17px",
                color: "var(--text-2)",
                marginBottom: 20,
              }}
            >
              41 reconciled records will be posted to Yardi. This cannot be
              undone from the workspace.
            </div>
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
  );
}

function Icons() {
  const sets: { title: string; bg: string; color: string; items: { Icon: typeof LayoutDashboard; size: number; stroke: number; name: string }[] }[] = [
    {
      title: "LeftRail · on dark root",
      bg: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
      color: "#FFFFFF",
      items: [
        { Icon: LayoutDashboard, size: 20, stroke: 2, name: "Dashboard" },
        { Icon: Files, size: 20, stroke: 2, name: "Reconciliation" },
        { Icon: House, size: 20, stroke: 2, name: "Properties" },
      ],
    },
    {
      title: "LeftRail · selected (in chip)",
      bg: "#EFF3F8",
      color: "#7C8C9A",
      items: [{ Icon: Files, size: 20, stroke: 2, name: "Files (active)" }],
    },
    {
      title: "WorkspaceNav top-bar · on dark root",
      bg: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
      color: "#FFFFFF",
      items: [
        { Icon: SquareChevronLeft, size: 20, stroke: 2, name: "Collapse" },
        { Icon: ArrowDownUp, size: 20, stroke: 2, name: "Sort" },
      ],
    },
    {
      title: "Workspace rows",
      bg: "var(--surface-card)",
      color: "#656C76",
      items: [{ Icon: Building2, size: 20, stroke: 1.25, name: "Building (1.25 stroke)" }],
    },
    {
      title: "Chevrons",
      bg: "var(--surface-card)",
      color: "#43484E",
      items: [
        { Icon: ChevronDown, size: 20, stroke: 1.5, name: "ChevronDown" },
        { Icon: ChevronRight, size: 20, stroke: 1.5, name: "ChevronRight" },
      ],
    },
    {
      title: "Canvas header",
      bg: "var(--surface-card)",
      color: "#464A51",
      items: [{ Icon: Building2, size: 28, stroke: 1.25, name: "Building 28px" }],
    },
    {
      title: "Search & file chips",
      bg: "var(--surface-card)",
      color: "#7F7F87",
      items: [
        { Icon: Search, size: 15, stroke: 1.75, name: "Search 15px" },
        { Icon: FileText, size: 12, stroke: 1, name: "FileText 12px" },
        { Icon: Landmark, size: 12, stroke: 1, name: "Landmark 12px" },
      ],
    },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {sets.map((s) => (
        <div
          key={s.title}
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--line-soft)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              fontSize: 12,
              lineHeight: "15px",
              color: "var(--text-2)",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            {s.title}
          </div>
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
                  className="text-center"
                  style={{
                    fontSize: 11,
                    lineHeight: "14px",
                    color:
                      s.bg ===
                      "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)"
                        ? "#FFFFFF"
                        : "var(--text-2)",
                  }}
                >
                  {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentShapes() {
  const tiles: {
    shape: "arrow" | "cluster" | "swirl";
    accent: string;
    role: string;
    use: string;
  }[] = [
    {
      shape: "arrow",
      accent: "#FF8A1F",
      role: "Intake",
      use: "Incoming / directional — files arriving and being classified.",
    },
    {
      shape: "cluster",
      accent: "#1F7FFF",
      role: "Reconciliation",
      use: "Grouping / matching — bank rows converging on the ledger.",
    },
    {
      shape: "swirl",
      accent: "#7C4DFF",
      role: "Summary",
      use: "Synthesis / loop — closing the cycle and producing artifacts.",
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
              borderRadius: 12,
              minWidth: 320,
              flex: 1,
            }}
          >
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: 88, height: 88, borderRadius: 12 }}
            >
              <PixelField
                shape={t.shape}
                size={88}
                gridSize={28}
                samples={2}
                dotColor="#43484E"
                accentColor={t.accent}
                accentReach={0.7}
                bgColor="#F7F8FA"
                dotBase={0.08}
                dotMax={0.92}
              />
            </div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <div
                style={{
                  fontSize: 16,
                  lineHeight: "19px",
                  color: "var(--text-1)",
                }}
              >
                {t.role}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  lineHeight: "14px",
                  color: "var(--text-2)",
                }}
              >
                shape: {t.shape} · accent: {t.accent}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: "16px",
                  color: "var(--text-2)",
                  maxWidth: 240,
                }}
              >
                {t.use}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          fontSize: 12,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        <div style={{ color: "var(--text-1)", marginBottom: 4 }}>
          Implementation notes
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            The motion is tuned in the component (per-cycle easings,
            ease-out-back bloom, ease-in cubic fade). Don&apos;t change the
            internal easings without checking the look.
          </li>
          <li>
            In the panel each canvas is 36×36 with gridSize 20, samples 2 —
            low enough density to stay readable at small sizes while keeping
            the bloom legible.
          </li>
          <li>
            <code>bgColor</code> matches the agent card (<code>#F7F8FA</code>)
            so the canvas blends invisibly into its surface.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatusDots() {
  return (
    <div className="flex flex-row flex-wrap" style={{ gap: 16 }}>
      {(["active", "failed", "complete"] as const).map((s) => (
        <div
          key={s}
          className="flex flex-row items-center"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--line-soft)",
            borderRadius: 12,
            padding: "16px 20px",
            gap: 16,
            minWidth: 220,
          }}
        >
          <StatusDot status={s} />
          <div>
            <div
              style={{
                fontSize: 13,
                lineHeight: "16px",
                color: "var(--text-1)",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: "14px",
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
              }}
            >
              {s === "active" ? "#001AFF" : s === "failed" ? "#FF0000" : "#1EFF00"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Surfaces() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div
        style={{
          padding: 32,
          background: "var(--bg-grad)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
          MainCanvas — the work surface
        </div>
        <div
          style={{
            background: "var(--surface-card)",
            boxShadow: "var(--shadow-card)",
            borderRadius: 12,
            padding: 20,
            fontSize: 13,
            color: "var(--text-1)",
          }}
        >
          Card resting on the canvas gradient.
        </div>
      </div>

      <div
        className="flex flex-row items-center"
        style={{
          background: "var(--bg-side)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          padding: 12,
          gap: 10,
        }}
      >
        <div
          className="flex-1"
          style={{
            background: "var(--surface-card)",
            borderRight: "1px solid var(--line-soft)",
            boxShadow: "var(--shadow-card)",
            borderRadius: 20,
            padding: "20px 24px",
            fontSize: 13,
            color: "var(--text-1)",
            minHeight: 140,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>
            AgentsPanel inner card
          </div>
          20px radius, agent-gutter 12px around.
        </div>
      </div>
    </div>
  );
}

function Chips() {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        padding: 32,
      }}
    >
      <div
        style={{
          fontSize: 12,
          lineHeight: "15px",
          color: "#FFFFFF",
          marginBottom: 16,
        }}
      >
        Lifted chips read against the cool grey-blue root.
      </div>
      <div className="flex flex-row flex-wrap" style={{ gap: 12 }}>
        <ChipDemo bg="#EFF3F8" label="May 2026 — 2" shadow textColor="#303B45" />
        <ChipDemo bg="#E9EBF3" label="Agents" shadow textColor="#303B45" />
        <ChipDemo bg="#F2F4FB" label="May 2026 ▾" shadow textColor="#303B45" />
        <ChipDemo
          bg="#FFF2F2"
          label="1293 Ohioa County"
          shadow
          textColor="#303B45"
          borderColor="#FFC0C0"
          icon={<FileText size={12} strokeWidth={1} color="#7F7F87" />}
        />
      </div>
    </div>
  );
}

function ChipDemo({
  bg,
  label,
  shadow,
  textColor,
  borderColor,
  icon,
}: {
  bg: string;
  label: string;
  shadow?: boolean;
  textColor: string;
  borderColor?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        background: bg,
        border: `1px solid ${borderColor ?? "#FFFFFF"}`,
        boxShadow: shadow ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
        borderRadius: borderColor ? 6 : 8,
        padding: "8px 12px",
        gap: 6,
        fontSize: 14,
        lineHeight: "17px",
        color: textColor,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Inputs() {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #C4C9D4 0%, #A7B9C8 100%)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div className="flex flex-col" style={{ gap: 16, maxWidth: 400 }}>
        <div
          className="flex flex-row items-center"
          style={{
            height: 35,
            padding: "8px 8px 8px 12px",
            gap: 10,
            background: "rgba(221, 223, 232, 0.4)",
            border: "1px solid rgba(253, 255, 255, 0.6)",
            borderRadius: 8,
          }}
        >
          <Search size={15} strokeWidth={1.75} color="#63696E" />
          <span style={{ fontSize: 16, lineHeight: "19px", color: "#63696E" }}>
            Search
          </span>
        </div>
        <div className="flex flex-row" style={{ gap: 12 }}>
          <button
            className="flex flex-row items-center justify-center"
            style={{
              height: 35,
              padding: "8px 12px 8px 16px",
              gap: 10,
              background: "#F2F4FB",
              border: "1px solid #FFFFFF",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              borderRadius: 8,
              fontSize: 16,
              lineHeight: "19px",
              color: "#303B45",
            }}
          >
            May 2026
            <ChevronDown size={16} strokeWidth={1.5} color="#43484E" />
          </button>
          <div
            className="flex items-center justify-center"
            style={{ width: 20, height: 35, color: "#FFFFFF" }}
          >
            <ArrowDownUp size={20} strokeWidth={2} />
          </div>
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
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div className="flex flex-col" style={{ gap: 14 }}>
        <span className="text-grad-neutral" style={{ fontSize: 14, lineHeight: "18px" }}>
          Neutral · #454547 → #A8A9AD
        </span>
        <span className="text-grad-failed" style={{ fontSize: 14, lineHeight: "18px" }}>
          Failed · #FF0000 → #FFA1A1
        </span>
        <span className="text-grad-approved" style={{ fontSize: 14, lineHeight: "18px" }}>
          Approved · #001AFF → #6A85FF
        </span>
        <span className="text-grad-unapproved" style={{ fontSize: 14, lineHeight: "18px" }}>
          Unapproved · #FF0000 → #FFA1A1
        </span>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-2)" }}>
        Used in the agents panel to color in-sentence runs without changing typography.
      </div>
    </div>
  );
}

/* ───────────────────────── Component demos ───────────────────────── */

function Components() {
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <ComponentDemo title="Session row · selected vs default">
        <div className="flex flex-col" style={{ gap: 8, maxWidth: 388 }}>
          <SessionRowDemo selected status="active" label="May 2026 - 2" />
          <SessionRowDemo selected={false} status="failed" label="May 2026" />
          <SessionRowDemo selected={false} status="complete" label="Apr 2026" />
        </div>
      </ComponentDemo>

      <ComponentDemo title="Workspace row · property header">
        <PropertyRow status="active" />
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

      <ComponentDemo title="Tabs (Agents · Knowledge)">
        <div className="flex flex-row items-center" style={{ gap: 0 }}>
          <TabDemo label="Agents" active />
          <TabDemo label="Knowledge" />
        </div>
      </ComponentDemo>

      <ComponentDemo title="Failed file chip">
        <div className="flex flex-row" style={{ gap: 8, maxWidth: 300 }}>
          <FileChipDemo label="1293 Ohioa County" icon="file-text" />
          <FileChipDemo label="Citigroup Stateme…" icon="landmark" />
        </div>
      </ComponentDemo>
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
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          fontSize: 12,
          lineHeight: "15px",
          color: "var(--text-2)",
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
  status: "active" | "failed" | "complete";
  label: string;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        height: 35,
        padding: "8px 12px",
        gap: 10,
        background: selected ? "var(--surface-chip)" : "transparent",
        border: selected ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: selected ? "var(--shadow-chip)" : "none",
        borderRadius: 8,
      }}
    >
      <StatusDot status={status} />
      <span style={{ fontSize: 16, lineHeight: "19px", color: "var(--text-1)" }}>
        {label}
      </span>
    </div>
  );
}

function PropertyRow({ status }: { status: "active" | "failed" | "complete" }) {
  return (
    <div
      className="flex flex-row items-start"
      style={{
        width: 440,
        padding: "20px 20px",
        gap: 12,
        background: "var(--surface-card)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
      }}
    >
      <div className="relative shrink-0" style={{ width: 20, height: 20 }}>
        <Building2 size={20} strokeWidth={1.25} color="#656C76" />
        <span
          className="absolute"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            right: -2,
            bottom: -2,
            background:
              status === "active"
                ? "var(--dot-active)"
                : status === "failed"
                ? "var(--dot-failed)"
                : "var(--dot-complete)",
          }}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 18,
            lineHeight: "22px",
            color: "var(--text-1)",
          }}
        >
          1849 Westlake Ave N, Seattle, WA 98109
        </span>
        <span
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "var(--text-2)",
          }}
        >
          3 Sessions · 4 Banks
        </span>
      </div>
      <span style={{ width: 20, height: 20, color: "#43484E" }}>
        <ChevronDown size={20} strokeWidth={1.5} />
      </span>
    </div>
  );
}

function BankCardDemo() {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 295,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 12,
      }}
    >
      <div className="flex flex-row" style={{ gap: 8 }}>
        <Image src="/logos/chase.png" width={40} height={40} alt="" />
        <div className="flex flex-col" style={{ gap: 4 }}>
          <div style={{ fontSize: 16, lineHeight: "19px", color: "var(--text-1)" }}>
            JPMorgan Chase Bank, N.A.
          </div>
          <div style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-2)" }}>
            P.O. Box 659754, San Antonio, TX 78265-9754
          </div>
        </div>
      </div>
      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />
      <Field label="Account Holder:" value="Tahoe Holdings LLC dba 1247 Mission St" />
      <Field label="Account Number:" value="******3421" />
      <Field label="Period:" value="July 01, 2026 – July 31, 2026" />
      <div style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-2)" }}>
        Issue: Aug 03, 2026
      </div>
    </div>
  );
}

function LedgerCardDemo() {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 295,
        padding: "20px 16px 16px",
        gap: 12,
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 12,
      }}
    >
      <div className="flex flex-row" style={{ gap: 8 }}>
        <Image src="/icons/ledger.svg" width={40} height={40} alt="Ledger" />
        <div className="flex flex-col" style={{ gap: 4 }}>
          <div style={{ fontSize: 18, lineHeight: "22px", color: "var(--text-1)" }}>
            Ledger
          </div>
          <div style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-2)" }}>
            yardi.tahoe-holdings.com
            <br />
            Tenant: TH-PROD-01
          </div>
        </div>
      </div>
      <div style={{ width: "100%", height: 1, background: "var(--line-soft)" }} />
      <Field
        label="Property & Code:"
        value="Tahoe Holdings LLC dba 1247 Mission St · TH-1247"
      />
      <Field label="Cash Account:" value="GL 1010 — Operating Cash" />
      <Field label="Period:" value="July 01, 2026 – July 31, 2026" />
      <div style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-2)" }}>
        Exported: Aug 03, 2026 · 09:14 PT
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row" style={{ gap: 12, width: "100%" }}>
      <div
        className="shrink-0"
        style={{ width: 114, fontSize: 12, lineHeight: "14px", color: "var(--text-1)" }}
      >
        {label}
      </div>
      <div
        className="flex-1"
        style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-2)" }}
      >
        {value}
      </div>
    </div>
  );
}

function TabDemo({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: 35,
        padding: "8px 16px",
        gap: 10,
        background: active ? "#E9EBF3" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
        borderRadius: 8,
        fontSize: 16,
        lineHeight: "19px",
        color: active ? "#303B45" : "#61717F",
      }}
    >
      {label}
    </div>
  );
}

function UploadFlow() {
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <div
        style={{
          padding: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          fontSize: 12,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        <div style={{ color: "var(--text-1)", marginBottom: 4 }}>
          Flow rule — each lifecycle state owns the whole canvas
        </div>
        <div>
          These components are the entirety of the <strong>draft</strong>{" "}
          state. The reconciliation pair cards (bank ↔ wire ↔ ledger) only
          appear <em>after</em> the user has uploaded statements. Don&apos;t
          render both at once.
        </div>
      </div>

      <ComponentDemo title="Bulk upload card — per-bank pills">
        <BulkUploadCard
          banks={propertyBanks}
          uploads={{}}
          onUploadStatement={() => {}}
        />
      </ComponentDemo>

      <ComponentDemo title="Bank upload list — compact secondary path">
        <BankUploadList banks={propertyBanks} />
      </ComponentDemo>

      <div
        style={{
          padding: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          fontSize: 12,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        <div style={{ color: "var(--text-1)", marginBottom: 8 }}>
          Design-language notes
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            The bulk card&apos;s upload illustration mirrors the
            <strong> ledger.svg</strong> visual language —{" "}
            <code>#B2BFCC</code> fill with white inner strokes — so it reads as
            part of the same family.
          </li>
          <li>
            No dashed borders anywhere. Hover paints a 1px{" "}
            <code>var(--line)</code>; drag-over paints 1px{" "}
            <code>#001AFF</code>.
          </li>
          <li>
            Action chips on both cards reuse the month-picker chip pattern
            (<code>#F2F4FB</code> base, 1px white border, chip shadow).
          </li>
          <li>
            Account masking uses bullets (<code>•••• 3421</code>) inside the
            compact rows for legibility; the full-format pair cards keep the
            asterisk convention from the Figma spec.
          </li>
        </ul>
      </div>

      <div
        style={{
          padding: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          fontSize: 12,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        <div style={{ color: "var(--text-1)", marginBottom: 4 }}>
          When to use each
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <strong>Bulk:</strong> reconciler has all statements in hand —
            faster; classification happens server-side.
          </li>
          <li>
            <strong>Per bank:</strong> reconciler is missing a single
            statement, or wants to be explicit about which file belongs to
            which account.
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
        height: 22,
        padding: "4px 6px",
        gap: 6,
        background: "var(--chip-failed-bg)",
        border: "1px solid var(--chip-failed-border)",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 6,
      }}
    >
      <Icon size={12} strokeWidth={1} color="#7F7F87" />
      <span
        className="truncate"
        style={{ fontSize: 12, lineHeight: "14px", color: "var(--text-1)" }}
      >
        {label}
      </span>
    </div>
  );
}
