"use client";

/* Activity — the workspace's memory, sitting above the hub.
 *
 * The block is two lines that never move: a header carrying the label, the
 * count, the disclosure and the three agents; and under it the present tense —
 * what the working agent is doing this second, shimmering while it works. That
 * present line replaced four rows of fading history that reserved height
 * whether or not there was anything to put in it, and it replaced the caption
 * that used to hang under the core saying the same thing in a second place.
 * There is no Activity tab; the record belongs next to the work, not behind
 * navigation.
 *
 * The log is no longer part of the block. It used to expand inline, which meant
 * opening the record shoved the hub down the page and the heading you had just
 * clicked slid out from under the pointer. It now opens as a floating frosted
 * panel anchored to the bottom edge of the block, over a lightly blurred
 * backdrop: the header is the hinge and the hinge does not move. Nothing in the
 * block reflows, so the hub below stays exactly where the reader left it.
 *
 * The agents came out of that disclosure entirely and moved into the header, to
 * the right of the label. They are the run's three stages, not entries in the
 * record — leaving them in the body would have meant either burying them under
 * the panel or pushing the panel down past them. An earlier pass did try
 * agents-along-the-top and it read badly, but that pass kept the full two-line
 * chips and wrapped the whole block in a card; the weight was the problem, not
 * the position. Here each stage is a mark and a word, and the state word is
 * gone because the mark already carries it: orb while working, tick when done,
 * hollow ring while queued (a solid dot would read as a step already taken). */

import { useEffect, useRef } from "react";
import { Check, ChevronDown, Lightbulb, TriangleAlert } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { AGENT_ORB } from "@/lib/v2/orb";
import {
  AGENT_LABEL,
  type ActivityAgent,
  type ActivityEntry,
  type ActivityTone,
} from "@/lib/v2/activity";
import { AMBER, SUCCESS } from "./DocRow";

/* The orb's small preset is 20px, not 16 — the two sizes are separately tuned
 * designs, so the slot grows to fit the design rather than the design being
 * scaled to the slot. */
const AGENT_MARK = 20;

/* The present line and every log row run on the same two lead columns, so the
 * agent name lands in one place down the whole block. */
const GLYPH_COL = 12;
const AGENT_COL = 66;
const LEAD_GAP = 10;

/* Tall enough to read as a record, short enough that it never becomes the page.
 * Past this the panel takes its own scroll rather than growing over the hub. */
/* The log's own height, fixed rather than fitted.
 *
 * A panel that grows as the log does is a panel that moves while you are
 * reading it — intake writes a line every few hundred milliseconds, so a
 * fitted height animates through six sizes during a run and the row under
 * your eye slides each time. A constant well and an internal scroll is the
 * trade: some empty space on a short log, in exchange for a surface that
 * holds still. */
const LOG_H = 232;

const TONE_COLOR: Record<ActivityTone, string> = {
  neutral: "rgba(98,116,131,0.55)",
  good: SUCCESS,
  flag: AMBER,
  /* A human's note changing what an agent concluded is a different class of
   * event from "matched 14 rows", so it gets its own mark — and its own token,
   * because it is neither a status nor an agent. */
  knowledge: "var(--mark-human)",
};

function ToneGlyph({ tone }: { tone: ActivityTone }) {
  if (tone === "good") return <Check size={14} strokeWidth={1.75} color={SUCCESS} />;
  if (tone === "flag")
    return <TriangleAlert size={14} strokeWidth={1.75} color={AMBER} />;
  if (tone === "knowledge")
    return <Lightbulb size={14} strokeWidth={1.75} color={TONE_COLOR.knowledge} />;
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: 999,
        background: TONE_COLOR.neutral,
        display: "block",
      }}
    />
  );
}

export interface AgentPillState {
  agent: ActivityAgent;
  state: "idle" | "working" | "done";
}

const STATE_WORD: Record<AgentPillState["state"], string> = {
  idle: "Queued",
  working: "Working",
  done: "Done",
};

export function Activity({
  entries,
  pills,
  current,
  expanded,
  onToggle,
}: {
  entries: ActivityEntry[];
  pills: AgentPillState[];
  current: { text: string; agent: ActivityAgent; live: boolean };
  expanded: boolean;
  onToggle: () => void;
}) {
  /* Newest first — the question this answers is "what just happened". */
  const ordered = [...entries].reverse();
  const canExpand = ordered.length > 0;
  const open = expanded && canExpand;

  const toggleEl = useRef<HTMLButtonElement>(null);
  const panelEl = useRef<HTMLDivElement>(null);

  /* The parent owns the open flag and hands down a toggle, so "close" is
   * "toggle while open" — safe, because these listeners only exist while open.
   * Held in a ref so a fresh arrow function on every parent render does not
   * tear the listeners down and rebuild them. */
  const latestToggle = useRef(onToggle);
  useEffect(() => {
    latestToggle.current = onToggle;
  });

  /* Outside-click and Escape, both. A floating surface that only closes on one
   * of the two is the kind of thing that traps a keyboard user. The backdrop
   * carries no handler of its own: it is inside this wrapper, so letting the
   * document listener catch it keeps one close path instead of two that would
   * fire together and re-open the panel. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelEl.current?.contains(t)) return;
      /* The button's own click handler toggles; closing here as well would
       * close and re-open in the same gesture. */
      if (toggleEl.current?.contains(t)) return;
      latestToggle.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latestToggle.current();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* One definition, two call sites — the inline header and the panel's own.
   * Exactly one of them is `live` at a time: the inline copy while closed, the
   * panel's copy while open. Only the live one carries the toggle ref and the
   * handler, so the outside-click guard never has to reason about which of the
   * two was clicked, and the hidden one is out of the tab order. */
  const renderHead = (live: boolean) => (
    <div className="activity-head flex flex-row items-center" style={{ gap: 12 }}>
      <button
        ref={live ? toggleEl : undefined}
        onClick={live ? onToggle : undefined}
        tabIndex={live ? undefined : -1}
        disabled={!canExpand}
        aria-expanded={open}
        aria-controls="activity-log"
        className="flex flex-row items-center shrink-0"
        style={{
          gap: 6,
          background: "transparent",
          border: "none",
          padding: 0,
          opacity: 1,
          cursor: canExpand ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          Activity
        </span>
        {entries.length > 0 && (
          <span
            className="nums"
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-tertiary)",
            }}
          >
            {entries.length}
          </span>
        )}
        {canExpand && (
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            color="var(--ink-secondary)"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        )}
      </button>

      {/* The three stages, right-aligned so the label keeps the left edge it
        * shares with the present line and every log row. */}
      <div
        className="flex flex-row items-center min-w-0"
        style={{ gap: 6, marginLeft: "auto" }}
      >
        {pills.map((p) => {
          const working = p.state === "working";
          return (
            <span
              key={p.agent}
              className="flex flex-row items-center min-w-0"
              style={{
                height: "var(--control-md)",
                padding: "0 10px",
                gap: 7,
                borderRadius: "var(--radius-control)",
                background: working
                  ? "#FFFFFF"
                  : "var(--surface-control)",
                border: "1px solid #FFFFFF",
                boxShadow: working
                  ? "var(--shadow-card)"
                  : "var(--shadow-chip)",
                transition: "background 220ms ease, box-shadow 220ms ease",
              }}
            >
              <StageMark pill={p} />
              {/* Dropped below ~440px of column, where three labelled chips
                * and the heading stop fitting on one line. The marks alone
                * still read as three stages and one of them working. */}
              <span
                className="activity-stage-label truncate"
                title={`${AGENT_LABEL[p.agent]} · ${STATE_WORD[p.state]}`}
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  color: working
                    ? "var(--ink-secondary)"
                    : "var(--ink-tertiary)",
                  fontWeight: working
                    ? "var(--weight-medium)"
                    : "var(--weight-regular)",
                }}
              >
                {AGENT_LABEL[p.agent]}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col relative"
      style={{ width: "100%", maxWidth: 880, margin: "0 auto", gap: 8 }}
    >
      {/* ---- The header.
        *
        * Rendered TWICE while the panel is open: once here, hidden, purely to
        * hold the block's height so nothing below it moves; and once inside the
        * panel, where the reader actually sees it.
        *
        * That is the difference between this and a plain dropdown. The reader
        * asked for the label and the three agents to be part of the overlay,
        * not left stranded behind it — so the panel starts at this block's own
        * top edge and takes the header with it. The header lands on the exact
        * pixel it occupied a moment earlier, so it still reads as the hinge
        * even though it is now on the pane.
        *
        * `container-type` lives on the head row rather than on the wrapper
        * because inline-size containment also makes an element the containing
        * block for fixed descendants, which would nail the backdrop to this
        * block instead of to the viewport. ---- */}
      <div
        aria-hidden={open}
        style={{ visibility: open ? "hidden" : "visible" }}
      >
        {/* Live while the panel is CLOSED — this copy is the only header on
          * screen then, and it is what opens the panel. Once open, the panel's
          * own copy takes over and this one is a hidden spacer holding the
          * block's height so nothing below it moves. */}
        {renderHead(!open)}
      </div>

      {/* ---- The present tense. One line, always. ---- */}
      <div
        className="flex flex-row items-center"
        style={{ gap: LEAD_GAP, padding: "1px 0" }}
      >
        <span
          className="shrink-0 flex items-center justify-center"
          style={{ width: GLYPH_COL }}
        >
          <span
            className={current.live ? "activity-pulse" : undefined}
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: current.live
                ? "var(--ink-primary)"
                : "rgba(98,116,131,0.35)",
              display: "block",
            }}
          />
        </span>
        <span
          className="shrink-0"
          style={{
            width: AGENT_COL,
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {AGENT_LABEL[current.agent]}
        </span>
        <span
          key={current.text}
          className={`truncate flex-1 ${
            current.live ? "text-grad-neutral-shimmer-card" : ""
          }`}
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: current.live ? undefined : "var(--ink-primary)",
          }}
        >
          {current.text}
        </span>
      </div>

      {open && (
        <>
          {/* ---- The backdrop. A disclosure, not a modal: enough blur that the
            * workspace visibly steps back behind the panel, but half of
            * `--scrim-blur` and a fraction of `--scrim`'s dim, which at modal
            * strength would read as "you are now in a dialog".
            * It does not trap the pointer — a click anywhere on it closes,
            * through the outside-click listener above. ---- */}
          <div
            className="activity-backdrop fixed inset-0"
            aria-hidden
            style={{
              zIndex: 60,
              background: "rgba(48, 59, 69, 0.04)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* ---- The log, floating where it used to expand.
            *
            * `left: 0; right: 0` pins it to this block's own width, so it can
            * never reach past the workspace column however narrow the column
            * gets. Frosted rather than a flat white sheet: on a page whose
            * ground is a soft gradient, an opaque rectangle reads as a hole
            * punched in it. See globals.css `.glass`. ---- */}
          {/* ---- The panel.
            *
            * It starts at this block's own top edge rather than below the
            * header, and renders the header itself as its first row — so the
            * label and the three agents come onto the pane with the log instead
            * of being left stranded behind a sheet that covers everything else.
            * The header lands on the pixel it occupied a moment earlier, so it
            * still reads as the hinge.
            *
            * `left: 0; right: 0` pins the panel to this block's width, so it
            * can never reach past the workspace column however narrow the
            * column gets. Frosted rather than a flat white sheet: on a page
            * whose ground is a soft gradient, an opaque rectangle reads as a
            * hole punched in it. See globals.css `.glass`. ---- */}
          <div
            ref={panelEl}
            id="activity-log"
            aria-label="Activity log"
            className="activity-panel glass flex flex-col"
            style={{
              position: "absolute",
              /* Pulled out by exactly its own padding plus its 1px border, so
               * the header INSIDE the pane lands on the pixel the header
               * outside it occupied a frame earlier. Without this the pane's
               * own inset shifts the label down 9 and right 11, which is small
               * enough to read as a wobble rather than as a move — the worst of
               * both. The overhang is always affordable: this block is centred
               * in a canvas with at least 24px of gutter.
               *
               *   top  = --space-4 (8) + 1px border
               *   side = --space-2 (4) + the head row's --space-3 (6) + 1px */
              top: -9,
              left: -11,
              right: -11,
              zIndex: 61,
              borderRadius: "var(--radius-sheet)",
              padding: "var(--space-4) var(--space-2) var(--space-2)",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ padding: "0 var(--space-3)" }}>{renderHead(true)}</div>

            <span
              aria-hidden
              style={{
                height: 1,
                background: "var(--line-hair)",
                margin: "0 var(--space-3)",
                flexShrink: 0,
              }}
            />

            <div
              className="flex flex-col scroll-thin"
              style={{ height: LOG_H, overflowY: "auto" }}
            >
            {ordered.map((e) => (
              <div
                key={e.id}
                className="flex flex-row items-center activity-row"
                /* No row hover: these entries are a record, not a menu, and a
                 * hover fill on something that cannot be clicked is a lie. */
                style={{
                  gap: LEAD_GAP,
                  padding: "5px 8px",
                  borderRadius: "var(--radius-row)",
                }}
              >
                <span
                  className="shrink-0 flex items-center justify-center"
                  style={{ width: GLYPH_COL }}
                >
                  <ToneGlyph tone={e.tone} />
                </span>
                <span
                  className="shrink-0"
                  style={{
                    width: AGENT_COL,
                    fontSize: "var(--type-meta)",
                    lineHeight: "var(--leading-ui)",
                    color: "var(--ink-tertiary)",
                  }}
                >
                  {AGENT_LABEL[e.agent]}
                </span>
                <span
                  className="truncate"
                  style={{
                    fontSize: "var(--type-meta)",
                    lineHeight: "var(--leading-ui)",
                    color: "var(--ink-primary)",
                  }}
                >
                  {e.text}
                </span>
                {e.detail && (
                  <span
                    className="truncate shrink"
                    style={{
                      fontSize: "var(--type-meta)",
                      lineHeight: "var(--leading-ui)",
                      color: "var(--ink-tertiary)",
                    }}
                  >
                    {e.detail}
                  </span>
                )}
              </div>
            ))}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .activity-head {
          container-type: inline-size;
        }
        @container (max-width: 440px) {
          .activity-stage-label {
            display: none;
          }
        }
        .activity-row {
          animation: activity-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes activity-in {
          from {
            opacity: 0;
          }
        }
        /* The panel arrives from under the header rather than fading in place,
         * so the hinge reads as the hinge. */
        .activity-panel {
          animation: activity-panel-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: top center;
        }
        /* Grows downward from the header it now contains, rather than sliding
         * in from above it — the header does not move, so nothing about the
         * entrance should suggest it did. */
        @keyframes activity-panel-in {
          from {
            opacity: 0;
            transform: scaleY(0.96);
            transform-origin: top;
          }
        }
        .activity-backdrop {
          animation: activity-backdrop-in 180ms ease both;
        }
        @keyframes activity-backdrop-in {
          from {
            opacity: 0;
          }
        }
        .activity-pulse {
          animation: activity-pulse 1600ms ease-in-out infinite;
        }
        @keyframes activity-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .activity-row,
          .activity-panel,
          .activity-backdrop,
          .activity-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/* One stage's state, as a mark. Orb while working, tick when done, hollow ring
 * while queued. Labelled for assistive tech because the chip's visible word is
 * the agent's name, not its state, and below 440px there is no visible word at
 * all. */
function StageMark({ pill }: { pill: AgentPillState }) {
  const label = `${AGENT_LABEL[pill.agent]} · ${STATE_WORD[pill.state]}`;

  return (
    <span
      role="img"
      aria-label={label}
      className="flex items-center justify-center shrink-0"
      style={{ width: AGENT_MARK, height: AGENT_MARK }}
    >
      {pill.state === "working" ? (
        <ThinkingOrb
          state={AGENT_ORB[pill.agent]}
          size={AGENT_MARK}
          theme="light"
        />
      ) : pill.state === "done" ? (
        <Check size={14} strokeWidth={1.75} color={SUCCESS} />
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            border: "1.5px solid rgba(98,116,131,0.32)",
            display: "block",
          }}
        />
      )}
    </span>
  );
}
