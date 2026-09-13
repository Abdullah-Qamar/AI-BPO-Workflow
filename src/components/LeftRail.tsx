"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

type Route = "dashboard" | "workspace" | "properties" | "observability";

/* Nav icons are Lucide, matching the rest of the app's icon vocabulary and the
 * compact reference ("thin, ~1.5px at 16px, never filled").
 *
 * They no longer mirror a page-header icon, because the page headers no longer
 * carry one — a title that already says "Dashboard" beside a rail item that says
 * "Dashboard" beside an icon of a dashboard was three statements of the same
 * fact. The rail keeps its icons because collapsed they are the only label
 * there is.
 *
 * Reconciliation takes GitCompareArrows, already the app's mark for a
 * comparison. AI Performance takes Gauge: the page is a set of readings.
 *
 * The label matches its destination's heading exactly. "Observability" is the
 * internal word for this page; "AI Performance" is what the page is called, so
 * that is what the rail says. */
type NavItem = { key: Route; Icon: LucideIcon; label: string };

/* Two groups, because they are two kinds of destination. The first three are
 * where work happens and a reader moves between them all day. AI Performance is
 * where you go to check on the system — occasional, and never in the middle of a
 * close — so it sits apart at the foot of the rail rather than as a fourth peer
 * competing for the same glance. */
const ITEMS: NavItem[] = [
  { key: "dashboard", Icon: LayoutDashboard, label: "Dashboard" },
  { key: "workspace", Icon: GitCompareArrows, label: "Reconciliation" },
  { key: "properties", Icon: Building2, label: "Properties" },
];

const FOOT_ITEMS: NavItem[] = [
  { key: "observability", Icon: Gauge, label: "AI Performance" },
];

const STORAGE_KEY = "tieout.nav.collapsed";
const EXPANDED_W = 220;
const COLLAPSED_W = 60;

/* Below this the expanded rail's extra 160px is the difference between the
 * Properties filter bar fitting and its sort control being clipped off-screen.
 * Measured, not guessed: that bar needs ~977px of canvas, so 220 + 977 = ~1197.
 * Matches the lower threshold in useResponsiveLayout. */
const AUTO_COLLAPSE_W = 1200;

/* The app mark, flat: logo.svg drawn straight onto the rail with no tile
 * behind it. `brightness(0)` renders the single-colour glyph black regardless
 * of the file's own fill while keeping its transparency. */
function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="shrink-0"
      /* maxWidth:none overrides Tailwind preflight's `img{max-width:100%}`,
       * which was capping the mark to its narrower slot and undoing the size. */
      style={{ display: "block", filter: "brightness(0)", maxWidth: "none" }}
    />
  );
}

/* Left navigation.
 *
 * Expanded by default, with labels; collapses to an icon rail. Which state the
 * user last chose is remembered, but it is read *after* mount rather than during
 * render, because the server has no localStorage and rendering the stored value
 * directly would hydrate one width and then snap to another.
 *
 * Tooltips exist only in the collapsed state. Expanded, the label is right there
 * and a tooltip repeating it is noise. */
export function LeftRail({
  route,
  onNavigate,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
}) {
  const [preferCollapsed, setPreferCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  useEffect(() => {
    try {
      setPreferCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* private mode or storage disabled: stay expanded */
    }
  }, []);

  useEffect(() => {
    const apply = () => setNarrow(window.innerWidth < AUTO_COLLAPSE_W);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  /* Narrow viewports collapse regardless of preference, but the preference is
   * left untouched so widening the window restores what the user chose. */
  const collapsed = preferCollapsed || narrow;

  const setAndStore = (next: boolean) => {
    setPreferCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* non-fatal */
    }
  };

  return (
    <aside
      className={`flex flex-col shrink-0 ${
        collapsed ? "items-center" : "items-stretch"
      }`}
      style={{
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        padding: collapsed
          ? "var(--space-5) 0 44px"
          : "var(--space-5) var(--space-5) 44px var(--space-4)",
        gap: "var(--space-2)",
        borderRight: "1px solid var(--line)",
        /* Sticky so the rail is anchored to the viewport as the canvas scrolls
         * underneath. alignSelf keeps it from stretching in the flex row. */
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        zIndex: 20,
        transition: "width 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* ---- Brand row ----
        * Collapsed, the mark is itself the way back out: hovering swaps it for
        * an expand glyph and clicking expands. That keeps the collapsed rail to
        * a single column with no extra affordance competing with the nav.
        * Expanded, the mark is not a button and collapsing has its own control
        * on the right, where a panel toggle is normally found. */}
      {collapsed ? (
        <button
          onClick={() => setAndStore(false)}
          onMouseEnter={() => setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          aria-label="Expand navigation"
          aria-expanded={false}
          className="flex items-center justify-center shrink-0"
          style={{
            width: "var(--row-md)",
            height: "var(--row-md)",
            marginBottom: "var(--space-4)",
            borderRadius: "var(--radius-row)",
            background: logoHover ? "rgba(255,255,255,0.55)" : "transparent",
            border: "1px solid transparent",
            cursor: "pointer",
            color: "var(--ink-secondary)",
            transition: "background 140ms ease",
          }}
        >
          {logoHover ? (
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          ) : (
            <LogoMark size={24} />
          )}
        </button>
      ) : (
        <div
          className="flex flex-row items-center shrink-0"
          style={{
            /* The nav items' own left inset and gap, so the wordmark starts on
             * the same vertical line as "Dashboard" below it. At 6 and 8 it
             * landed three pixels to their right — enough, in a 220px column of
             * four left-aligned labels, to read as a wobble. */
            gap: 8,
            height: "var(--row-md)",
            paddingLeft: 8,
            /* The nav items carry a 1px border in both states so the selected
             * one does not shift. This row has no border to carry, but it needs
             * the pixel that border occupies or it sits one to their left. */
            border: "1px solid transparent",
            marginBottom: "var(--space-4)",
          }}
        >
          {/* The mark, sized to sit at the wordmark's own height and centred in
            * a slot a touch wider than the nav glyphs so it reads as the brand,
            * not another nav item. */}
          <span
            className="flex items-center justify-center shrink-0"
            style={{ width: 18 }}
          >
            <LogoMark size={22} />
          </span>
          <span
            className="flex-1 truncate"
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "var(--tracking-title)",
              color: "var(--ink-primary)",
            }}
          >
            Reconciler
          </span>
          <button
            onClick={() => setAndStore(true)}
            aria-label="Collapse navigation"
            aria-expanded
            className="flex items-center justify-center shrink-0 nav-toggle"
            style={{
              width: "var(--control-sm)",
              height: "var(--control-sm)",
              borderRadius: "var(--radius-row)",
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
              color: "var(--ink-tertiary)",
              transition: "background 140ms ease, color 140ms ease",
            }}
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {ITEMS.map((item) => renderItem(item))}

      {/* Pushes everything below it to the rail's foot. */}
      <div className="flex-1" />

      {FOOT_ITEMS.map((item) => renderItem(item))}

      {/* Sits directly under the nav rather than pinned to the rail's foot.
        * Pinned at the bottom it landed underneath Next's dev-tools badge,
        * which renders in a portal at the bottom-left corner above everything —
        * the switch was measurably in the right place and still unclickable.
        * The aside carries extra bottom padding for the same reason, so the foot
        * group clears the badge. */}
      <span
        aria-hidden
        style={{
          width: collapsed ? "var(--row-md)" : "100%",
          height: 1,
          /* A structural divider, so --line-soft. It was on --line-row-hover's
           * value, which is the border a listing row paints when it lifts — a
           * different job, and borrowing it here meant a rule and a hover state
           * could never be tuned apart. */
          background: "var(--line-soft)",
          margin: "var(--space-3) 0",
        }}
      />
      <VersionSwitch collapsed={collapsed} />

      {/* Hover feedback lives in CSS rather than onMouseEnter handlers so it
        * survives the pointer leaving during a route change, which left the
        * previous inline-style version stuck in its hover state. */}
      <style jsx>{`
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.45) !important;
          border-color: rgba(255, 255, 255, 0.75) !important;
        }
        .nav-item[data-active="true"]:hover {
          background: var(--surface-chip) !important;
          border-color: #ffffff !important;
        }
        .nav-item:active {
          transform: scale(0.98);
        }
        .nav-toggle:hover {
          background: rgba(255, 255, 255, 0.55) !important;
          color: var(--ink-secondary) !important;
        }
      `}</style>
    </aside>
  );

  function renderItem(item: NavItem) {
    const active = route === item.key;
    const button = (
          <button
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
            className={`flex items-center transition nav-item ${
              collapsed ? "justify-center" : "flex-row"
            }`}
            data-active={active ? "true" : undefined}
            style={{
              width: collapsed ? "var(--row-md)" : "100%",
              height: "var(--row-md)",
              padding: collapsed ? 4 : "0 8px",
              gap: collapsed ? 0 : 10,
              borderRadius: "var(--radius-row)",
              background: active ? "var(--surface-chip)" : "transparent",
              border: active ? "1px solid #FFFFFF" : "1px solid transparent",
              // Spec for the selected button is bg + border only — no shadow.
              boxShadow: "none",
              cursor: "pointer",
              /* A stroked icon dimmed with opacity reads washed out rather than
               * quiet, so state is carried by ink level instead. Measured: the
               * nav sits only 7-14% down the body gradient, so its real backdrop
               * is #c0c7d2. Against that, secondary is 4.89:1 and tertiary
               * 3.22:1, both clear of the 3.0 minimum for non-text UI.
               *
               * The resting glyph holds --ink-tertiary in both states now, so
               * it clears the non-text floor whether the rail is collapsed
               * (where the glyph IS the label) or expanded. */
              color: active
                ? "var(--ink-secondary)"
                : "var(--ink-tertiary)",
              fontFamily: "inherit",
              transition:
                "color 140ms ease, background 140ms ease, border-color 140ms ease",
            }}
          >
            {/* 16/1.5, one step down the ramp from 20/1.5. Expanded, the label
              * beside it is what the reader actually reads, so the glyph only
              * needs to mark the row, not compete with it. Collapsed it is the
              * only label there is — 16px is the ramp's nav size and stays
              * legible at that width. */}
            <item.Icon size={16} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && (
              <span
                className="truncate"
                style={{
                  fontSize: "var(--type-body)",
                  lineHeight: "var(--leading-ui)",
                  fontWeight: active
                    ? "var(--weight-medium)"
                    : "var(--weight-regular)",
                  /* Set explicitly, not inherited: the button's `color` is now
                    * the glyph's quieter ink and the label must not follow it
                    * down. Both states sit at --ink-primary so the labels read
                    * at full strength against the rail's bluish backdrop; the
                    * active row is still marked by its medium weight, chip fill
                    * and border. */
                  color: "var(--ink-primary)",
                }}
              >
                {item.label}
              </span>
            )}
          </button>
        );

        /* Tooltips only when the label is hidden. */
        return collapsed ? (
          <Tooltip
            key={item.key}
            label={item.label}
            side="right"
            tone={active ? "info" : "neutral"}
          >
            {button}
          </Tooltip>
        ) : (
          <div key={item.key} style={{ width: "100%" }}>
            {button}
          </div>
        );
  }
}

/* Flips between the shipped workspace and the V2 experiment. Both routes render
 * this same rail, so the switch reads its own direction from the path rather
 * than taking a prop. */
function VersionSwitch({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const onV2 = pathname?.startsWith("/v2") ?? false;
  const label = onV2 ? "Switch to V1 workspace" : "Switch to V2 workspace";

  const link = (
    <Link
      href={onV2 ? "/" : "/v2"}
      aria-label={label}
      className={`flex items-center transition ${
        collapsed ? "justify-center" : "flex-row"
      }`}
      style={{
        width: collapsed ? "var(--row-md)" : "100%",
        height: "var(--control-sm)",
        padding: collapsed ? 0 : "0 8px",
        gap: collapsed ? 0 : 10,
        borderRadius: "var(--radius-row)",
        background: onV2 ? "var(--action-primary)" : "rgba(255,255,255,0.62)",
        border: `1px solid ${
          onV2 ? "var(--action-primary)" : "rgba(255,255,255,0.9)"
        }`,
        boxShadow: "var(--shadow-chip)",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        fontWeight: "var(--weight-medium)",
        color: onV2 ? "var(--action-on-primary)" : "var(--ink-secondary)",
        textDecoration: "none",
      }}
    >
      {/* Labels the destination, not the current route — it's an action. */}
      {collapsed ? (onV2 ? "V1" : "V2") : onV2 ? "V1 workspace" : "V2 workspace"}
    </Link>
  );

  return collapsed ? (
    <Tooltip
      label={onV2 ? "Back to the V1 workspace" : "Open Workspace V2 (experimental)"}
      side="right"
      tone={onV2 ? "info" : "neutral"}
    >
      {link}
    </Tooltip>
  ) : (
    link
  );
}
