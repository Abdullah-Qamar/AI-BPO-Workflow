"use client";

/* AI Performance — a top-level destination, reached from the rail.
 *
 * Two tabs, because there are two questions and they are not versions of each
 * other:
 *
 *   Overview        what the three agents did, what it cost, and whether any of
 *                   it is improving
 *   Knowledge base  the rules a person has given the AI, which is the only
 *                   place in this product where a human changes how it behaves
 *
 * Throughput used to be a third tab. It was one card of six-cycle trend on a tab
 * of its own, which made a reader navigate to find out whether the numbers on
 * the first tab were going the right way — the two belong on one screen.
 *
 * Colour is the product's own and nothing else: the three agents take a single
 * blue-slate ramp so the cost bar reads as one quantity split four ways rather
 * than four unrelated things, and the trend chart uses the same green the
 * Dashboard's close-progress bar uses. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  CURRENT_CYCLE,
  aiAgents,
  aiAgentsFor,
  aiThroughput,
  cycleOptions,
  shortCycle,
  knowledgeRules,
  properties,
  type AIAgentKey,
  type AIAgentProfile,
  type AIThroughputPoint,
  type KnowledgeRule,
  type RuleScope,
} from "@/lib/seed";
import { Button, IconButton } from "./ui/Button";
import { CyclePicker } from "./ui/CyclePicker";
import { Overlay, OverlayCard } from "./ui/Overlay";

type Tab = "overview" | "knowledge";

/* No agent colours. An agent is not a status, and a hue per agent across a row of
 * peers had the reader hunting for a meaning that was not there — the third
 * palette in three passes, which is itself the evidence that colour was never
 * carrying anything here.
 *
 * The one place a tone is genuinely load-bearing is the token bar, where four
 * adjacent segments have to be told apart. That is a quantity divided, so it
 * takes a neutral ramp stepped by lightness alone: no hue is asserted, and the
 * legend is positioned under its own segment rather than keyed by colour, so
 * even the ramp is a courtesy rather than the mechanism. */
/* A cool blue-slate ramp. The steps were near-neutral greys (#5A6B7D and up),
 * which read as flat and a little lifeless against the page; carrying more
 * chroma at roughly the same lightness keeps the ramp reading as a set of
 * greys while giving each step some life. */
const TOKEN_STEP: Record<AIAgentKey, string> = {
  intake: "#4C6B8E",
  reconciliation: "#7A99B9",
  summary: "#B8C9DE",
};

/* Chart marks. History is the page's own hairline blue-grey; the current cycle
 * takes the green the Dashboard already uses for close progress, so "the latest
 * bar" and "progress" are the same colour everywhere in the product. */
const MARK_PAST = "rgba(142, 176, 207, 0.55)";
/* Same hue with enough weight for the current bar to lead, and enough contrast
 * for the axis title to be legible as type. A 0.55-alpha grey-blue works as a
 * 40px bar and fails as an 11px word. */
const MARK_PAST_STRONG = "rgba(108, 146, 184, 0.85)";
const MARK_PAST_INK = "#4F76A0";
const MARK_NOW = "var(--status-ok)";

const GOOD = "var(--status-ok-ink)";
const ALERT = "var(--status-warn-ink)";

export function AIQualityDetail() {
  const [tab, setTab] = useState<Tab>("overview");
  /* The cycle scopes the whole page. It used to set a piece of state nothing
   * read, so choosing April moved the label and left May's figures under it.
   * The per-agent detail is only modelled for the current cycle, so earlier
   * cycles show the trend series' own figures for that point and say so. */
  const [cycle, setCycle] = useState(CURRENT_CYCLE);
  const point = useMemo(
    () => aiThroughput.find((p) => p.cycle === cycle) ?? null,
    [cycle]
  );

  return (
    <main
      className="canvas-pad flex flex-col items-center flex-1 min-w-0 relative overflow-auto scroll-thin"
      style={{ background: "var(--bg-grad)" }}
    >
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1120, gap: "var(--space-7)" }}
      >
        {/* No leading icon and no back link. The rail is the navigation now, and
          * a heading that says "AI Performance" beside a rail item that says
          * "AI Performance" beside a gauge glyph was three statements of one
          * fact. Dropping it also puts the heading on the same left edge as
          * every card beneath it. */}
        <div
          className="flex flex-row items-center shrink-0"
          style={{ width: "100%", gap: "var(--space-4)", height: "var(--control-lg)" }}
        >
          <h1
            className="t-display flex-1 truncate"
            style={{ color: "var(--ink-primary)", margin: 0 }}
          >
            AI Performance
          </h1>
          <CyclePicker value={cycle} options={cycleOptions} onChange={setCycle} />
        </div>

        <TabStrip tab={tab} setTab={setTab} />
        {tab === "overview" ? (
          <OverviewTab cycle={cycle} point={point} />
        ) : (
          <KnowledgeTab />
        )}
      </div>
    </main>
  );
}

function TabStrip({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: [Tab, string][] = [
    ["overview", "Overview"],
    ["knowledge", "Knowledge base"],
  ];
  return (
    <div
      className="flex flex-row items-center shrink-0"
      style={{ gap: "var(--space-2)" }}
    >
      {items.map(([key, label]) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={active}
            className="flex flex-row items-center"
            style={{
              height: "var(--control-md)",
              padding: "0 10px",
              background: active ? "var(--surface-tab-active)" : "transparent",
              border: active ? "1px solid #FFFFFF" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-chip)" : "none",
              borderRadius: "var(--radius-control)",
              cursor: "pointer",
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
              color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* The one card shape this page uses, and the same two surfaces as the Dashboard
 * listing — soft shell, brighter sheet where there are rows — so the screens
 * read as one product. */
function Card({
  title,
  meta,
  action,
  children,
  note,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section
      className="flex flex-col shrink-0"
      style={{
        width: "100%",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-6)",
        gap: "var(--space-5)",
      }}
    >
      <div className="flex flex-row items-center" style={{ gap: "var(--space-5)" }}>
        <span className="t-title shrink-0" style={{ color: "var(--ink-primary)" }}>
          {title}
        </span>
        {meta}
        <div className="flex-1" />
        {action}
      </div>
      {children}
      {note && (
        <p className="t-prose" style={{ color: "var(--ink-tertiary)", margin: 0 }}>
          {note}
        </p>
      )}
    </section>
  );
}

function CardMeta({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="truncate"
      style={{
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-tertiary)",
      }}
    >
      {children}
    </span>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--surface-list)",
        borderRadius: "var(--radius-sheet)",
        boxShadow: "var(--shadow-depth-1)",
        overflow: "hidden",
        padding: 4,
        ...({ "--list-inset": "8px" } as React.CSSProperties),
      }}
    >
      {children}
    </div>
  );
}

/* ================= Overview ================= */

function OverviewTab({
  cycle,
  point,
}: {
  cycle: string;
  point: AIThroughputPoint | null;
}) {
  /* Every card on this tab reads the chosen cycle. The picker used to set
   * state nothing consumed, so the page showed May's figures under any label
   * the reader picked. */
  const agents = useMemo(() => aiAgentsFor(cycle), [cycle]);

  if (agents.length === 0) {
    return (
      <Card title="No sessions in this cycle">
        <span className="t-body" style={{ color: "var(--ink-tertiary)" }}>
          Nothing was reconciled in {cycle}, so there is nothing to report on.
        </span>
      </Card>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-7)", width: "100%" }}>
      <TokenUseCard agents={agents} cycle={cycle} />
      <AgentsCard agents={agents} point={point} />
      <TrendCard />
    </div>
  );
}

/* Cost first: it is the one thing on this page nobody could see before and that
 * somebody is paying for.
 *
 * The legend is positioned, not listed. Each agent's key starts at the exact
 * left edge of its own segment and is exactly as wide, so the bar needs no
 * reading key at all — position is the key, and the dot is there only to anchor
 * the cell to the segment above it. A flowing legend row put "Summary" under
 * Reconciliation's segment and made the reader match colours instead of just
 * looking down.
 *
 * The name and the figures stack, which is what lets the narrowest segment (8%)
 * hold a legible label at all. */
function TokenUseCard({
  agents,
  cycle,
}: {
  agents: AIAgentProfile[];
  cycle: string;
}) {
  const total = agents.reduce((s, a) => s + a.tokens, 0);
  const share = (a: AIAgentProfile) => (a.tokens / total) * 100;

  return (
    <Card
      title="Token use"
      meta={<CardMeta>{`${fmtTokens(total)} in ${cycle}`}</CardMeta>}
    >
      <div className="flex flex-col" style={{ width: "100%", gap: "var(--space-4)" }}>
        {/* The bar is glass, not paint.
          *
          * Three flat blocks of grey butted together read as a stacked chart
          * from a spreadsheet — the one visual on the page and the least
          * considered. Each segment is now a pane on `.glass-raised`: a real
          * blur, a top-lit rim and a contact shadow, so it sits ABOVE the track
          * rather than inside it.
          *
          * Three things have to hold at once and they pull against each other:
          *
          *   lifted     the blur and the rim, which is what `.glass-raised`
          *              carries and what makes a pane read as a pane
          *   tellable   a tint of the agent's own step, mixed in rather than
          *              painted over, so the blur is still visible through the
          *              colour and the three panes are still three
          *   readable   a 4px gap and a full pill radius on each pane, so the
          *              PROPORTION is legible as three separate widths and not
          *              as one bar with colour changes in it
          *
          * The track underneath is what gives the panes something to be above.
          * Without it they float on nothing and the effect reads as a rendering
          * artefact.
          *
          * Taller than it was (10 -> 22) because the effect needs somewhere to
          * happen: below about 16px the rim and the shadow consume the whole
          * segment and it just looks blurry. */}
        <div
          aria-hidden
          className="flex flex-row items-stretch"
          style={{
            width: "100%",
            height: 22,
            gap: 4,
            padding: 3,
            borderRadius: 999,
            background: "rgba(157, 179, 197, 0.16)",
            boxShadow: "inset 0 1px 2px rgba(38, 50, 66, 0.07)",
          }}
        >
          {agents.map((a) => (
            <div
              key={a.key}
              className="glass-raised"
              style={{
                width: `${share(a)}%`,
                /* A pane narrower than its own corner radius stops being a
                 * shape and becomes a smudge. */
                minWidth: 16,
                borderRadius: 999,
                /* The agent's step tints the pane rather than filling it. The
                 * mix is with a translucent white, so the result is itself
                 * translucent and the blur behind still comes through.
                 *
                 * 70% and not the 46% this started at: a white wash of half
                 * compresses a three-step ramp into about 25 levels of grey
                 * end to end, and three panes 25 levels apart on a white card
                 * are three panes nobody can tell apart. At 70% the steps land
                 * roughly 35 levels apart and the darkest still reads as a
                 * slate rather than as a shadow. */
                background: `color-mix(in srgb, ${TOKEN_STEP[a.key]} 70%, rgba(255,255,255,0.55))`,
              }}
            />
          ))}
        </div>

        {/* Same widths, the same gap and the same 3px inset as the bar, so
          * every cell's left edge lands on its own segment's left edge. The
          * three have to agree exactly: the legend is not keyed by colour, it
          * is keyed by position, so a cell that drifts is a cell that names the
          * wrong segment. */}
        <div className="flex flex-row" style={{ width: "100%", gap: 4, padding: "0 3px" }}>
          {agents.map((a) => (
            <div
              key={a.key}
              className="flex flex-col min-w-0"
              style={{ width: `${share(a)}%`, minWidth: 16, gap: 1 }}
            >
              <span
                className="flex flex-row items-center truncate"
                style={{ gap: "var(--space-3)" }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: TOKEN_STEP[a.key],
                    flexShrink: 0,
                  }}
                />
                <span
                  className="truncate"
                  style={{
                    fontSize: "var(--type-body)",
                    lineHeight: "var(--leading-ui)",
                    color: "var(--ink-secondary)",
                  }}
                >
                  {a.name}
                </span>
              </span>
              <span
                className="nums truncate"
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  color: "var(--ink-tertiary)",
                  /* Indented to the name above it, not to the dot. */
                  paddingLeft: 14,
                }}
              >
                {fmtTokens(a.tokens)} · {Math.round(share(a))}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Agents ----------
 *
 * One block per agent — three of them, the same three every surface shows —
 * and nothing open until you open one.
 *
 * The block is the reference folder's card, verbatim in structure (see r03, the
 * workflow-step stack): a title row with a trailing disclosure glyph, a hairline
 * inset to the text, then the content beneath it. That rule is what gives the
 * card internal structure — it is doing the job four columns of micro-stats and
 * an agent colour were previously failing to do.
 *
 * No colour. An agent is not a status, and a hue per agent across a row of peers made
 * the reader look for a meaning that was not there. Identity is the name; the
 * only reason a colour was ever needed was to tie a legend to a bar, and that
 * legend is now positioned instead of keyed.
 *
 * Nothing is expanded by default. The blocks are the answer to "how are
 * they doing"; the prompt is a second question, and a panel that is already open
 * asserts the reader asked it. */
function AgentsCard({
  agents,
  point,
}: {
  agents: AIAgentProfile[];
  point: AIThroughputPoint | null;
}) {
  const [open, setOpen] = useState<AIAgentKey | null>(null);
  const agent = open ? aiAgents.find((a) => a.key === open) : null;

  return (
    <Card title="Agents">
      <div className="flex flex-row items-stretch" style={{ gap: "var(--space-5)" }}>
        {agents.map((a) => (
          <AgentBlock
            key={a.key}
            agent={a}
            open={a.key === open}
            onToggle={() => setOpen(a.key === open ? null : a.key)}
          />
        ))}
      </div>

      {agent && <PromptPanel agent={agent} />}
    </Card>
  );
}

function AgentBlock({
  agent,
  open,
  onToggle,
}: {
  agent: AIAgentProfile;
  open: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const rate = Math.round((agent.succeeded / agent.runs) * 100);
  const lifted = open || hover;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-expanded={open}
      aria-label={`${agent.name} · ${rate}% success rate over ${agent.runs} runs, ${fmtTokens(
        agent.tokens
      )} tokens, ${agent.medianSeconds} seconds average. Show its system prompt.`}
      className="flex flex-col text-left"
      style={{
        flex: 1,
        minWidth: 0,
        padding: "var(--space-6)",
        gap: "var(--space-5)",
        /* The edge is a white highlight and a shadow, not a stroke — the
         * reference cards carry no visible border, and on a light ground the
         * shadow step is what separates a resting card from a lifted one.
         *
         * The lifted state takes --surface-card-glow, the top-down sheen the
         * reference cards all carry and which had been sitting unused in
         * globals.css since the design system was written. It is the difference
         * between a card that is white and a card that is lit. */
        background: lifted ? "var(--surface-card-glow)" : "var(--surface-list)",
        border: "1px solid #FFFFFF",
        boxShadow: lifted ? "var(--shadow-depth-2)" : "var(--shadow-depth-1)",
        borderRadius: "var(--radius-card)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 140ms ease, box-shadow 140ms ease",
      }}
    >
      <span
        className="flex flex-row items-center"
        style={{ gap: "var(--space-4)", width: "100%" }}
      >
        <span
          className="truncate flex-1"
          style={{
            fontSize: "var(--type-title)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-title)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          {agent.name}
        </span>
        {/* On every block, not only the open one: the glyph is what says a block
          * opens, and an affordance that appears after you have already clicked
          * has nothing left to tell you. */}
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          color="var(--ink-tertiary)"
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 140ms ease",
            flexShrink: 0,
          }}
        />
      </span>

      {/* The reference's hairline: inset to nothing, spanning the card's content
        * width, separating what this is from how it is doing. */}
      <span
        aria-hidden
        style={{ height: 1, width: "100%", background: "var(--line-hair)" }}
      />

      <span className="flex flex-col" style={{ gap: 2, width: "100%" }}>
        {/* Level with the name, because they are the two halves of one sentence:
          * which agent, and how well it ran. The run count sits on the title
          * rather than as a third line — it answers "of what" for the one reader
          * in ten who asks. */}
        <span
          className="nums flex flex-row items-baseline"
          style={{ gap: "var(--space-3)", width: "100%" }}
          /* The app's own hint. A native `title` renders as the OS's black
           * chip, which is the one surface in this product that comes from
           * somewhere else. */
          data-hint={`${agent.succeeded} of ${agent.runs} runs finished with no human correction`}
        >
          <span
            className="truncate"
            style={{
              fontSize: "var(--type-title)",
              lineHeight: "var(--leading-ui)",
              letterSpacing: "var(--tracking-title)",
              color: "var(--ink-primary)",
            }}
          >
            {rate}% success rate
          </span>
          {/* The median run time rides alongside the rate rather than under it:
            * the token figure it used to share a line with is already stated in
            * the Token use band above, so with that gone the time is the only
            * survivor and belongs next to the number it qualifies. */}
          <span
            className="shrink-0"
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-tertiary)",
            }}
          >
            {agent.medianSeconds}s average
          </span>
        </span>
      </span>
    </button>
  );
}

/* The prompt, and only the prompt. The agent's name and description were also
 * here and both were already answered: the name by the block you just clicked,
 * the description by the prompt itself, at more length and in the agent's own
 * words.
 *
 * Flat. It used to be a lifted sheet holding a second, differently-tinted sheet
 * — two surfaces and two borders to present one block of text, inside a card
 * that is already a surface. Nesting like that says "this is a separate thing";
 * a prompt revealed by expanding an agent is not a separate thing, it is that
 * agent's detail.
 *
 * What carries the structure instead is a rule and a label, which is what the
 * rest of the app uses to separate a section from the one above it, and a
 * single hairline down the left of the prompt itself — the typographic mark for
 * quoted material, and the lightest thing that will do the job. */
/* Saved edits live for the session in a module-level map keyed by agent, so a
 * prompt the reader changes survives collapsing the panel, switching agents and
 * re-scoping the cycle — the seed stays the fallback. There is no backend to
 * persist to yet; this map is the POC's stand-in for one. */
const promptEdits = new Map<AIAgentKey, string>();

function PromptPanel({ agent }: { agent: AIAgentProfile }) {
  const base = promptEdits.get(agent.key) ?? agent.systemPrompt;
  const [draft, setDraft] = useState(base);
  const [saved, setSaved] = useState(base);
  const [justSaved, setJustSaved] = useState(false);
  const [focused, setFocused] = useState(false);

  /* Re-seed when a different agent's panel opens: the parent mounts one panel
   * and swaps the agent under it. */
  useEffect(() => {
    const next = promptEdits.get(agent.key) ?? agent.systemPrompt;
    setDraft(next);
    setSaved(next);
    setJustSaved(false);
  }, [agent.key, agent.systemPrompt]);

  const dirty = draft !== saved;

  const commit = () => {
    promptEdits.set(agent.key, draft);
    setSaved(draft);
    setJustSaved(true);
  };

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
      <span
        aria-hidden
        style={{ height: 1, width: "100%", background: "var(--line-hair)" }}
      />

      {/* Label and its controls on one line: the prompt is now editable, so the
        * section that names it also owns the Save/Reset for it. */}
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-4)" }}
      >
        <span className="t-label">System prompt</span>
        <div style={{ flex: 1 }} />
        {dirty ? (
          <span className="t-meta" style={{ color: "var(--ink-tertiary)" }}>
            Unsaved changes
          </span>
        ) : justSaved ? (
          <span className="t-meta" style={{ color: "var(--status-ok)" }}>
            Saved
          </span>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDraft(saved)}
          disabled={!dirty}
        >
          Reset
        </Button>
        <Button size="sm" variant="primary" onClick={commit} disabled={!dirty}>
          Save
        </Button>
      </div>

      {/* Editable, and in the app's own type rather than a monospace slab, so
        * the prompt reads in the same voice as everything around it. It keeps
        * the left hairline — the typographic mark for quoted material — and
        * lifts to a faint field on focus so the edit affordance is legible.
        * whiteSpace: pre-wrap keeps the line breaks it was written with. */}
      <textarea
        className="scroll-thin"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setJustSaved(false);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        aria-label={`${agent.name} system prompt`}
        style={{
          margin: 0,
          padding: "var(--space-3) var(--space-4) var(--space-3) var(--space-5)",
          border: "none",
          borderLeft: `1px solid ${
            focused ? "var(--ink-tertiary)" : "var(--line-menu)"
          }`,
          borderRadius: "0 var(--radius-row) var(--radius-row) 0",
          background: focused ? "rgba(255, 255, 255, 0.6)" : "transparent",
          fontFamily: "inherit",
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-prose)",
          color: "var(--ink-primary)",
          whiteSpace: "pre-wrap",
          resize: "vertical",
          minHeight: 220,
          width: "100%",
          outline: "none",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      />
    </div>
  );
}

/* ---------- Trend ----------
 *
 * Rebuilt twice. The first pass fixed the hierarchy (four 20px readings that
 * out-shouted the card's own title), the order (two sentences of prose before
 * any number), the proximity (legend, plot and readings spread over five bands)
 * and the density (every bar labelled, and labelled again underneath).
 *
 * This pass fixes what was left:
 *
 *   Title    "6 cycles of work" counted the rows in the series and called that
 *            a heading. It changed meaning whenever the data did, and it named
 *            the axis rather than the subject. The card is a trend; it says so,
 *            in one word — the page above it is already titled "AI
 *            Performance", so "Performance trend" would say performance twice.
 *   Range    the series was fixed at whatever the seed held. A reader comparing
 *            this cycle to last quarter had to read six bars and do it in their
 *            head. They can pick the window now, and the meta line states which
 *            cycles are actually on screen rather than restating the control.
 *   Baseline the readings compared against the FIRST point in the whole series
 *            no matter what was on screen, so "since Dec" was true only by
 *            coincidence. They compare against the first point in the chosen
 *            window, and name it.
 *   Reading  "Held up on review" described the review process, not the figure.
 *            The number is the share the agent got right before a person
 *            touched it, which is first-pass accuracy in every product that
 *            reports it.
 *
 * The plot keeps its construction — readings first at the card's own type size,
 * one rule, then the chart — and gains the thing it was missing: a cycle under
 * the pointer is readable. Every mark was inert, and only the last column was
 * labelled, so four of the six months on screen could be compared but not
 * read. */

/* Windows a reader can choose. Capped at six: the series is monthly, and a
 * chart of more than half a year of closes stops being a trend anyone reads and
 * becomes a history nobody scrolls. */
const TREND_WINDOWS = [3, 6] as const;

function TrendCard() {
  const [window, setWindow] = useState<number>(6);
  const d = useMemo(() => aiThroughput.slice(-window), [window]);
  const first = d[0];
  const last = d[d.length - 1];

  const perRecord = (p: AIThroughputPoint) => Math.round(p.tokens / p.lines);
  const change = (from: number, to: number) =>
    Math.round(((to - from) / from) * 100);

  const since = shortCycle(first.cycle);

  return (
    <Card
      title="Trend"
      meta={<CardMeta>{`${first.cycle} to ${last.cycle}`}</CardMeta>}
      action={
        <RangePicker
          value={window}
          options={TREND_WINDOWS}
          onChange={setWindow}
        />
      }
    >
      {/* The summary, at the card's own size. Label above value is what groups
        * the pair: a reader reads the label, then the number under it, rather
        * than a number and then hunting for what it counts. */}
      <div className="flex flex-row flex-wrap" style={{ gap: "var(--space-9)" }}>
        <Reading
          label="Records matched"
          value={last.lines.toLocaleString()}
          delta={change(first.lines, last.lines)}
          higherIsBetter
          since={since}
        />
        <Reading
          label="First-pass accuracy"
          value={`${last.successRate}%`}
          delta={last.successRate - first.successRate}
          unit=" pts"
          higherIsBetter
          since={since}
        />
        <Reading
          label="Reviewer hours"
          value={String(last.reviewerHours)}
          delta={change(first.reviewerHours, last.reviewerHours)}
          higherIsBetter={false}
          since={since}
        />
        <Reading
          label="Tokens per record"
          value={perRecord(last).toLocaleString()}
          delta={change(perRecord(first), perRecord(last))}
          higherIsBetter={false}
          since={since}
        />
      </div>

      <span
        aria-hidden
        style={{ height: 1, background: "var(--line-hair)", width: "100%" }}
      />

      <ComboChart data={d} />
    </Card>
  );
}

/* How far back the trend looks. A menu rather than a segmented strip because
 * the label has to say what the number means — "6" alone in a toggle is a
 * quantity of nothing in particular. */
function RangePicker({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = (n: number) => `Last ${n} cycles`;

  return (
    <div ref={wrap} className="relative shrink-0">
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen(!open)}
        rightIcon={
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 140ms ease",
            }}
          />
        }
      >
        {label(value)}
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label="Trend range"
          className="glass flex flex-col"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 160,
            zIndex: 40,
            borderRadius: "var(--radius-sheet)",
            padding: 4,
          }}
        >
          {options.map((n) => (
            <MenuItem
              key={n}
              label={label(n)}
              selected={n === value}
              onSelect={() => {
                onChange(n);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* One reading. Label above, then the value with its change beside it. Value at
 * --type-title so it sits level with the card's heading rather than above it. */
/* One reading: what it counts, where it stands, and which way it moved.
 *
 * The direction and the judgement are two different facts and must not share
 * one input — reviewer hours falling is good news and tokens per line rising is
 * bad news, and both are negative-looking or positive-looking depending on
 * which. The old version formatted a "+" into the label at the call site and
 * painted every delta green, which produced "+-19%" the moment a figure
 * actually fell, and painted a 49% rise in cost as a success. */
function Reading({
  label,
  value,
  delta,
  unit = "%",
  higherIsBetter,
  since,
}: {
  label: string;
  value: string;
  /** Signed change against the baseline cycle. */
  delta: number;
  unit?: string;
  higherIsBetter: boolean;
  since: string;
}) {
  const good = delta === 0 || delta > 0 === higherIsBetter;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return (
    <div className="flex flex-col" style={{ gap: 1 }}>
      <span className="t-label">{label}</span>
      <div className="flex flex-row items-baseline" style={{ gap: "var(--space-3)" }}>
        <span
          className="nums-lead"
          style={{
            fontSize: "var(--type-title)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          {value}
        </span>
        <span
          className="nums"
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: good ? GOOD : ALERT,
          }}
        >
          {sign}
          {Math.abs(delta)}
          {unit} since {since}
        </span>
      </div>
    </div>
  );
}
/* One series, one axis: records matched per reviewer hour — the efficiency the
 * card's readings add up to.
 *
 * It replaces a dual-axis combo that plotted records (left axis) against
 * reviewer hours (right axis): two units on two independently auto-scaled axes,
 * so where the line sat relative to the bars was an accident of rounding, not a
 * relationship — and the "crossing" it implied was not in the data, which was
 * flat-then-falling records over falling hours, two parallel declines. Their
 * ratio is the real story, it rises, and one honest ascending series says it
 * without a secondary axis a reader cannot read.
 *
 * Bars and gridlines are HTML positioned in percentages; no SVG now that the
 * connecting line is gone. Percentages do not stretch, and an HTML rule stays
 * 1px at any width. */
function ComboChart({ data }: { data: AIThroughputPoint[] }) {
  const H = 196;
  const TICKS = 4;
  const last = data.length - 1;

  /* Which column the reader is asking about. Nothing hovered means the current
   * cycle, so the plot always has one emphasised column and hovering moves it
   * rather than switching an effect on. */
  const [hover, setHover] = useState<number | null>(null);
  const focus = hover ?? last;

  /* Records matched per reviewer hour. Both inputs are already stated in the
   * readings above, so the chart shows what they mean rather than restating
   * either one. */
  const eff = (p: AIThroughputPoint) => p.lines / p.reviewerHours;
  const effMax = ceilTo(Math.max(...data.map(eff)), 10);
  const cxPct = (i: number) => ((i + 0.5) / data.length) * 100;
  const topPct = (v: number) => (1 - v / effMax) * 100;

  return (
    <div className="flex flex-col" style={{ width: "100%" }}>
      {/* One title in place of a legend: a single series needs naming, not
        * keying. It sits over the axis that measures it. */}
      <div className="flex flex-row" style={{ width: "100%" }}>
        <AxisTitle
          label="Records per reviewer hour"
          tone={MARK_PAST_INK}
          mark="bar"
          align="left"
        />
      </div>

      <div className="flex flex-row" style={{ width: "100%", gap: "var(--space-5)" }}>
        <AxisLabels max={effMax} ticks={TICKS} height={H} align="right" />

        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", height: H, width: "100%" }}>
            {Array.from({ length: TICKS + 1 }, (_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${(100 / TICKS) * i}%`,
                  height: 1,
                  background:
                    i === TICKS ? "rgba(157,179,197,0.55)" : "var(--line-hair)",
                }}
              />
            ))}

            {/* The guide, at the focused column's centre, so a reader can carry
              * a bar's top edge across to the axis. */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: `${cxPct(focus)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                transform: "translateX(-50%)",
                background: "rgba(157, 179, 197, 0.5)",
                opacity: hover === null ? 0 : 1,
                transition: "left 140ms ease, opacity 140ms ease",
              }}
            />

            {/* Bars. The current cycle carries the green the Dashboard uses for
              * close progress, so "this month" is the same colour everywhere in
              * the product; a hovered past month lifts from the resting slate to
              * the stronger one. */}
            <div
              className="flex flex-row items-end"
              style={{ position: "absolute", inset: 0 }}
              aria-hidden
            >
              {data.map((p, i) => (
                <div
                  key={p.cycle}
                  className="flex flex-col justify-end items-center"
                  style={{ flex: 1, minWidth: 0, height: "100%" }}
                >
                  <div
                    style={{
                      width: "52%",
                      maxWidth: 60,
                      height: `${(eff(p) / effMax) * 100}%`,
                      background:
                        i === last
                          ? MARK_NOW
                          : i === focus
                          ? MARK_PAST_STRONG
                          : MARK_PAST,
                      borderRadius: "3px 3px 0 0",
                      transition: "background 140ms ease",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* One value, on the focused bar. */}
            <span
              className="nums"
              aria-hidden
              style={{
                position: "absolute",
                left: `${cxPct(focus)}%`,
                top: `${topPct(eff(data[focus]))}%`,
                transform: "translate(-50%, -140%)",
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                fontWeight: "var(--weight-medium)",
                color: "var(--ink-primary)",
                whiteSpace: "nowrap",
                transition: "left 140ms ease, top 140ms ease",
              }}
            >
              {Math.round(eff(data[focus]))}
            </span>

            {/* Hit areas, last so they sit over every mark. One full-height
              * column per cycle; the exact figures ride on the app's own hint. */}
            <div
              className="flex flex-row"
              style={{ position: "absolute", inset: 0 }}
              onMouseLeave={() => setHover(null)}
            >
              {data.map((p, i) => (
                <span
                  key={p.cycle}
                  onMouseEnter={() => setHover(i)}
                  data-hint={`${p.cycle} · ${Math.round(
                    eff(p)
                  )} records per reviewer hour · ${p.lines.toLocaleString()} matched in ${
                    p.reviewerHours
                  }h`}
                  style={{ flex: 1, minWidth: 0, height: "100%" }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-row" style={{ width: "100%", paddingTop: 8 }}>
            {data.map((p, i) => (
              <span
                key={p.cycle}
                className="flex justify-center min-w-0"
                style={{
                  flex: 1,
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  fontWeight:
                    i === focus ? "var(--weight-medium)" : "var(--weight-regular)",
                  color: i === focus ? "var(--ink-primary)" : "var(--ink-tertiary)",
                  transition: "color 140ms ease",
                }}
              >
                {shortCycle(p.cycle)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AxisTitle({
  label,
  tone,
  mark,
  align,
}: {
  label: string;
  tone: string;
  /** The shape this axis measures, drawn at hint size beside its name. */
  mark: "bar" | "line";
  align: "left" | "right";
}) {
  const swatch =
    mark === "bar" ? (
      <span
        aria-hidden
        style={{
          width: 8,
          height: 10,
          borderRadius: "2px 2px 0 0",
          background: MARK_PAST_STRONG,
          flexShrink: 0,
        }}
      />
    ) : (
      /* A stub of rule with the line's own open dot on it, which is exactly
       * what the series draws. */
      <span
        aria-hidden
        className="relative flex items-center"
        style={{ width: 14, height: 10, flexShrink: 0 }}
      >
        <span style={{ width: "100%", height: 2, background: MARK_NOW }} />
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 3,
            height: 3,
            borderRadius: 999,
            background: "#FFFFFF",
            border: `2px solid ${MARK_NOW}`,
            boxSizing: "content-box",
          }}
        />
      </span>
    );

  return (
    <span
      className="flex flex-row items-center shrink-0"
      style={{
        gap: "var(--space-3)",
        flexDirection: align === "right" ? "row-reverse" : "row",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        fontWeight: "var(--weight-medium)",
        color: tone,
        paddingBottom: "var(--space-3)",
      }}
    >
      {swatch}
      {label}
    </span>
  );
}

/* One axis. Labels are positioned against the same percentage geometry the
 * gridlines use, so a label and its rule can never drift apart. */
function AxisLabels({
  max,
  ticks,
  height,
  align,
  suffix = "",
}: {
  max: number;
  ticks: number;
  height: number;
  align: "left" | "right";
  suffix?: string;
}) {
  return (
    <div style={{ position: "relative", height, width: 40, flexShrink: 0 }}>
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <span
          key={i}
          className="nums"
          style={{
            position: "absolute",
            top: `${(100 / ticks) * i}%`,
            left: 0,
            right: 0,
            transform: "translateY(-50%)",
            textAlign: align === "right" ? "right" : "left",
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {Math.round(max - (max / ticks) * i).toLocaleString()}
          {suffix}
        </span>
      ))}
    </div>
  );
}

/* Rounds an axis maximum up to the next clean interval, so the top gridline is a
 * number a reader recognises rather than the data's own high-water mark. */
function ceilTo(value: number, interval: number): number {
  return Math.ceil(value / interval) * interval;
}


/* ================= Knowledge base ================= */

/* Scope is a filter, not a section.
 *
 * Two stacked cards worked at four rules each and stops working the moment a
 * team has forty: the reader scrolls past everything global to reach anything
 * property-specific, and neither list is ever fully in view. One list with a
 * scope switch and a search box scales, and it means there is one place to look
 * rather than two to choose between.
 *
 * Scope is named by what it covers. "Portfolio-wide" carried a false precision —
 * a portfolio is a real object in this product, with its own name on the
 * Properties screen, and these rules are not scoped to one. */
const SCOPE_LABEL: Record<RuleScope, string> = {
  all: "All properties",
  property: "Single property",
};

const ADDED_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* Renders a rule's `addedOn` ISO datetime as "Feb 12, 2026 · 2:24 PM". Parsed by
 * hand rather than through Date/toLocaleString so it formats identically on the
 * server and the client — a locale- or timezone-formatted date drifts between
 * the two and trips hydration. A value with no time part (or an unparseable
 * legacy label) falls back to the date alone, then to the raw string. */
function formatAddedOn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, hh, mm] = m;
  const month = ADDED_MONTHS[Number(mo) - 1] ?? mo;
  const date = `${month} ${Number(d)}, ${y}`;
  if (hh == null) return date;
  const h24 = Number(hh);
  const h12 = h24 % 12 || 12;
  return `${date} · ${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
}

/* The current local time as an ISO datetime, for a rule added right now. Built
 * from local fields rather than Date.toISOString() (which is UTC) so the stamp
 * matches the clock the reader is looking at. */
function nowIsoLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

function KnowledgeTab() {
  const [scope, setScope] = useState<RuleScope>("all");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<KnowledgeRule[]>([]);
  /* One dialog for both jobs. "new" composes a rule; a rule composes an edit of
   * that rule. See RuleDialog for why they are the same dialog. */
  const [dialog, setDialog] = useState<KnowledgeRule | "new" | null>(null);
  /* Edits and removals against the seeded rules, held here rather than in each
   * row: a row unmounts when the search or the scope changes, and a change that
   * evaporates when the row does is not a change. Session-local — the prototype
   * has no store behind it.
   *
   * A patch, not a string. Editing used to carry the rule's wording alone, so
   * the two mistakes you cannot fix by rewriting the sentence — pointing a rule
   * at the wrong agent, or at the wrong property — could only be fixed by
   * deleting the rule and typing it again. Every field the dialog collects is a
   * field the dialog can change. */
  const [edited, setEdited] = useState<Record<string, Partial<KnowledgeRule>>>(
    {}
  );
  const [removed, setRemoved] = useState<string[]>([]);

  const everything = useMemo(
    () =>
      [...added, ...knowledgeRules]
        .filter((r) => !removed.includes(r.id))
        .map((r) => (edited[r.id] ? { ...r, ...edited[r.id] } : r)),
    [added, edited, removed]
  );

  const counts = useMemo(
    () => ({
      all: everything.filter((r) => r.scope === "all").length,
      property: everything.filter((r) => r.scope === "property").length,
    }),
    [everything]
  );

  /* Searches the rule text, the property and the agent's name together — a
   * reader looking for "Westlake" and a reader looking for "fee" both expect the
   * one box to find it. */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return everything
      .filter((r) => r.scope === scope)
      .filter((r) => {
        if (!q) return true;
        const agent = aiAgents.find((a) => a.key === r.agent)?.name ?? "";
        return `${r.rule} ${r.property ?? ""} ${agent}`.toLowerCase().includes(q);
      });
  }, [everything, scope, query]);

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-6)", width: "100%" }}>
      {/* One line. What these are and how long they last — the two facts a
        * first-time reader needs and the only two. */}
      <p className="t-prose" style={{ color: "var(--ink-secondary)", margin: 0 }}>
        Rules the AI reads before every run, and keeps reading until you remove
        them.
      </p>

      <section
        className="flex flex-col shrink-0"
        style={{
          width: "100%",
          background: "var(--surface-card)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-6)",
          gap: "var(--space-5)",
        }}
      >
        <div className="flex flex-row items-center" style={{ gap: "var(--space-5)" }}>
          <div className="flex flex-row items-center" style={{ gap: "var(--space-2)" }}>
            {(["all", "property"] as RuleScope[]).map((s) => (
              <ScopeTab
                key={s}
                label={SCOPE_LABEL[s]}
                count={counts[s]}
                active={scope === s}
                onClick={() => setScope(s)}
              />
            ))}
          </div>

          <div className="flex-1" />

          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search rules, properties, agents"
          />
          <Button
            size="md"
            variant="primary"
            onClick={() => setDialog("new")}
            leftIcon={<Plus size={14} strokeWidth={1.75} />}
          >
            Add rule
          </Button>
        </div>

        <Sheet>
          <RuleHeader scoped={scope === "property"} />
          {rows.length === 0 ? (
            <div
              style={{
                padding: "var(--space-7) 8px",
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
              }}
            >
              {query
                ? `Nothing matches “${query.trim()}”.`
                : "No rules here yet."}
            </div>
          ) : (
            rows.map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                scoped={scope === "property"}
                onEdit={() => setDialog(r)}
                onRemove={() => setRemoved((prev) => [...prev, r.id])}
              />
            ))
          )}
        </Sheet>
      </section>

      <RuleDialog
        open={dialog !== null}
        /* A new rule takes the scope the reader is looking at; an existing one
         * keeps its own, because a rule's scope is which list it lives in and
         * changing it would be a move, not an edit. */
        rule={dialog === "new" ? null : dialog}
        scope={dialog === "new" || dialog === null ? scope : dialog.scope}
        onClose={() => setDialog(null)}
        onAdd={(rule) => {
          setAdded((prev) => [rule, ...prev]);
          setDialog(null);
        }}
        onEdit={(id, patch) => {
          setEdited((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
          setDialog(null);
        }}
      />
    </div>
  );
}

function ScopeTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-row items-center"
      style={{
        height: "var(--control-md)",
        padding: "0 10px",
        gap: "var(--space-3)",
        background: active ? "var(--surface-tab-active)" : "transparent",
        border: active ? "1px solid #FFFFFF" : "1px solid transparent",
        boxShadow: active ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-control)",
        cursor: "pointer",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
        fontFamily: "inherit",
      }}
    >
      {label}
      <span
        className="nums"
        style={{
          fontSize: "var(--type-meta)",
          color: active ? "var(--ink-secondary)" : "var(--ink-tertiary)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label
      className="flex flex-row items-center shrink-0"
      style={{
        height: "var(--control-md)",
        width: 244,
        padding: "0 10px",
        gap: "var(--space-4)",
        background: "var(--surface-list)",
        border: "1px solid rgba(157, 179, 197, 0.35)",
        borderRadius: "var(--radius-control)",
      }}
    >
      <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-primary)",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-tertiary)",
          }}
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </label>
  );
}



/* Two grids: the property view carries a column the all-properties view has
 * nothing to put in, and an empty cell is a hole a reader tries to interpret.
 *
 * The trailing 56px gutter holds the row's own actions. It is a fixed column
 * rather than an absolutely-positioned overlay so revealing them on hover
 * cannot reflow the columns beside them. */
const RULE_GRID = "minmax(0, 1fr) 116px 104px 168px 56px";
const RULE_GRID_SCOPED = "minmax(0, 1fr) 168px 116px 104px 168px 56px";

/* Every column reads from the same left edge.
 *
 * They used to be left, then centre, then right across three adjacent columns,
 * which gave a four-column band three different starting points and no rhythm
 * at all. Centring and right-aligning earn their keep on figures — a column of
 * numbers wants a shared decimal edge — but none of these columns holds a
 * figure. They hold an agent's name, two words of state, and a person plus a
 * month. Those are text, and text aligns left. */
function RuleHeader({ scoped }: { scoped: boolean }) {
  const cell: React.CSSProperties = {
    fontSize: "var(--type-meta)",
    lineHeight: "var(--leading-ui)",
    fontWeight: "var(--weight-medium)",
    letterSpacing: "var(--tracking-meta)",
    color: "var(--ink-tertiary)",
  };
  return (
    <div
      className="list-row grid shrink-0"
      style={{
        gridTemplateColumns: scoped ? RULE_GRID_SCOPED : RULE_GRID,
        gap: "var(--space-5)",
        alignItems: "center",
        padding: "var(--space-4) 8px",
        /* The rows below carry a transparent 1px border so their hover state
         * can paint one without shifting. The header had none, so every column
         * label sat exactly one pixel left of the column under it. */
        border: "1px solid transparent",
      }}
    >
      <span style={cell}>Rule</span>
      {scoped && <span style={cell}>Property</span>}
      {/* "Used by" named the relationship from the rule's side and read as a
        * question about consumption. The column holds one thing — which agent
        * reads this rule — so it says so. */}
      <span style={cell}>Agent</span>
      {/* "Status" is the app's word for where a session stands, and reusing it
        * for a cell that says In use / Never used borrowed a meaning this
        * column does not have. What it reports is whether the rule is being
        * used, so it says Usage. */}
      <span style={cell}>Usage</span>
      <span style={cell}>Added</span>
      {/* The rows' action gutter. Empty here, present so the two grids agree. */}
      <span />
    </div>
  );
}

function RuleRow({
  rule,
  scoped,
  onEdit,
  onRemove,
}: {
  rule: KnowledgeRule;
  scoped: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const agent = aiAgents.find((a) => a.key === rule.agent);
  const unused = rule.applied === 0;

  const lifted = hover || confirming;

  const cell: React.CSSProperties = {
    fontSize: "var(--type-body)",
    lineHeight: "var(--leading-prose)",
    color: "var(--ink-secondary)",
  };

  return (
    /* Auto height, not the 40px pitch the other tables use. A rule is a sentence
     * and it has to be read in full: a truncated rule is worse than no rule,
     * because a reader cannot tell what it does. */
    <div
      className="list-row grid"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        gridTemplateColumns: scoped ? RULE_GRID_SCOPED : RULE_GRID,
        gap: "var(--space-5)",
        alignItems: "start",
        padding: "var(--space-5) 8px",
        /* Flat tint bounded by the row separators, not a lifted rounded chip:
         * no grey border, no shadow, square corners, edge to edge with the
         * hairlines above and below. --surface-chip (a cool grey) carries it
         * because white on this near-white sheet is too small a step to read
         * once the border and shadow are gone. */
        /* The tint stops one pixel short of the row's foot so the separator
         * hairline sits in the gap below it, not inside the tinted band — a
         * gradient painted as a sized background image, one pixel shy of full
         * height, anchored to the top. */
        backgroundImage: lifted
          ? "linear-gradient(var(--surface-chip), var(--surface-chip))"
          : "none",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top",
        backgroundSize: "100% calc(100% - 1px)",
        border: "1px solid transparent",
        boxShadow: "none",
        borderRadius: 0,
        transition: "background 120ms ease",
      }}
    >
      <span
        className="t-prose"
        style={{ color: "var(--ink-primary)", maxWidth: "none" }}
      >
        {rule.rule}
      </span>

      {scoped && (
        <span className="truncate" style={cell} data-hint={rule.property}>
          {rule.property}
        </span>
      )}

      {/* The agent's name, unaccompanied. It carried a colour dot while the
        * agents had a palette; the name was always the thing being read. */}
      <span className="truncate" style={cell}>
        {agent?.name ?? rule.agent}
      </span>

      {/* This column used to print how many times the rule fired: 214, 88, 31,
        * 6. Nobody acts on the difference between 214 and 88 — the counts told a
        * reader the rule works, which they already assumed. What is worth
        * knowing is the one case that contradicts the assumption, so the column
        * carries that and drops the arithmetic. */}
      <span
        style={{
          ...cell,
          fontWeight: unused ? "var(--weight-medium)" : "var(--weight-regular)",
          color: unused ? ALERT : "var(--ink-tertiary)",
        }}
        data-hint={
          unused
            ? "Has not matched anything this cycle"
            : `Matched ${rule.applied} times this cycle`
        }
      >
        {unused ? "Never used" : "In use"}
      </span>

      {/* When the rule was added. This app has no accounts or roles, so the
        * column dates the rule rather than naming an author. */}
      <span
        className="nums truncate"
        style={{ ...cell, color: "var(--ink-tertiary)" }}
        data-hint={formatAddedOn(rule.addedOn)}
      >
        {formatAddedOn(rule.addedOn)}
      </span>

      {/* The two actions, in the open.
        *
        * They were behind an overflow menu, which is the right pattern when a
        * row has five actions and no room. This row has two, and the gutter has
        * room for both — so a reader who wants to edit a rule clicks edit,
        * rather than clicking a menu to find out what the row can do. */}
      <RuleActions
        visible={hover || confirming}
        confirming={confirming}
        onEdit={onEdit}
        onAskRemove={() => setConfirming(true)}
        onCancelRemove={() => setConfirming(false)}
        onConfirmRemove={onRemove}
      />
    </div>
  );
}

/* Edit and remove, side by side in the row's gutter.
 *
 * Removal asks first, and asks in place: a rule is durable input a person
 * wrote, and it is the only thing on this screen that cannot be recovered by
 * reading something else. The confirm replaces the two icons rather than
 * opening a popover over them, so the row never grows and nothing is covered. */
function RuleActions({
  visible,
  confirming,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  visible: boolean;
  confirming: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}) {
  if (confirming) {
    return (
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-2)", justifySelf: "end" }}
      >
        <IconAction
          label="Confirm remove"
          tone="danger"
          onClick={onConfirmRemove}
        >
          <Check size={14} strokeWidth={1.75} />
        </IconAction>
        <IconAction label="Keep rule" onClick={onCancelRemove}>
          <X size={14} strokeWidth={1.75} />
        </IconAction>
      </div>
    );
  }

  return (
    <div
      className="flex flex-row items-center"
      style={{
        gap: "var(--space-2)",
        justifySelf: "end",
        /* Only the opacity changes, so revealing them cannot reflow the row. */
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 120ms ease",
      }}
    >
      <IconAction label="Edit rule" onClick={onEdit}>
        <Pencil size={14} strokeWidth={1.75} />
      </IconAction>
      <IconAction label="Remove rule" onClick={onAskRemove}>
        <Trash2 size={14} strokeWidth={1.75} />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone?: "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const ink =
    tone === "danger" ? "var(--status-danger-ink)" : "var(--ink-tertiary)";
  return (
    <button
      type="button"
      aria-label={label}
      data-hint={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center justify-center shrink-0"
      style={{
        width: "var(--control-sm)",
        height: "var(--control-sm)",
        background: hover
          ? tone === "danger"
            ? "var(--status-danger-bg)"
            : "var(--surface-control)"
          : "transparent",
        border: "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        color: hover && tone !== "danger" ? "var(--ink-secondary)" : ink,
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

function MenuItem({
  label,
  danger,
  selected,
  onSelect,
}: {
  label: string;
  danger?: boolean;
  /* Set only when the item is one of a set the reader is choosing between —
   * a listbox option rather than a command. Undefined leaves the tick gutter
   * off entirely, so a two-item action menu is not padded for a mark it will
   * never draw. */
  selected?: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      role={selected === undefined ? "menuitem" : "option"}
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      style={{
        height: "var(--row-md)",
        padding: "0 8px",
        gap: "var(--space-4)",
        /* Translucent, because it sits on glass. An opaque hover on a
         * translucent sheet reads as a rendering fault. */
        background: hover ? "rgba(255, 255, 255, 0.7)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        fontWeight: selected ? "var(--weight-medium)" : "var(--weight-regular)",
        color: danger
          ? "var(--status-danger-ink)"
          : selected
          ? "var(--ink-primary)"
          : "var(--ink-secondary)",
        textAlign: "left",
        whiteSpace: "nowrap",
        transition: "background 120ms ease",
      }}
    >
      <span className="flex-1">{label}</span>
      {selected !== undefined && (
        /* Fixed slot, so the labels line up whether or not a tick is drawn. */
        <span
          className="inline-flex shrink-0"
          style={{ width: 14, justifyContent: "center" }}
          aria-hidden
        >
          {selected && (
            <Check size={14} strokeWidth={1.75} color="var(--ink-secondary)" />
          )}
        </span>
      )}
    </button>
  );
}

/* ---------- Write a rule ----------
 *
 * ONE dialog, for writing a rule and for changing one.
 *
 * They were two different things: adding opened a modal with three fields,
 * editing turned the row's first column into a textarea with a second field
 * bolted under it. That is two mental models for one task, and the inline one
 * could only ever reach the fields that fit in a table cell — which is why the
 * agent arrived late and the property never arrived at all. A reader who put a
 * rule on the wrong property had to delete it and type it out again.
 *
 * The dialog is the survivor rather than the inline editor, for one reason: a
 * rule is three facts, not one. Sentence, agent, and — when it is scoped to a
 * property — which property. Three labelled fields do not fit in a table cell
 * without the row growing to swallow the list, and a row that grows to 300px
 * loses exactly the neighbouring rules that inline editing existed to keep in
 * view. So the same surface collects all three either way, and Edit and Add put
 * the reader in the same place looking at the same form.
 *
 * Save is disabled until the rule has text, because an empty rule is not a
 * draft, it is a mistake; and, when editing, until something has actually
 * changed. */
function RuleDialog({
  open,
  rule,
  scope,
  onClose,
  onAdd,
  onEdit,
}: {
  open: boolean;
  /** The rule being changed, or null to compose a new one. */
  rule: KnowledgeRule | null;
  scope: RuleScope;
  onClose: () => void;
  onAdd: (rule: KnowledgeRule) => void;
  onEdit: (id: string, patch: Partial<KnowledgeRule>) => void;
}) {
  return (
    <Overlay open={open} onDismiss={onClose}>
      {open && (
        /* Keyed, so opening the dialog on a different rule builds a fresh
         * draft rather than showing the last one's. */
        <RuleForm
          key={rule?.id ?? "new"}
          rule={rule}
          scope={scope}
          onClose={onClose}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      )}
    </Overlay>
  );
}

function RuleForm({
  rule,
  scope,
  onClose,
  onAdd,
  onEdit,
}: {
  rule: KnowledgeRule | null;
  scope: RuleScope;
  onClose: () => void;
  onAdd: (rule: KnowledgeRule) => void;
  onEdit: (id: string, patch: Partial<KnowledgeRule>) => void;
}) {
  const editing = rule !== null;
  const [text, setText] = useState(rule?.rule ?? "");
  const [agent, setAgent] = useState<AIAgentKey>(rule?.agent ?? "reconciliation");
  const [property, setProperty] = useState(
    rule?.property ?? shortAddress(properties[0]?.address ?? "")
  );

  const ready =
    text.trim().length > 0 &&
    (!editing ||
      text.trim() !== rule.rule ||
      agent !== rule.agent ||
      (scope === "property" && property !== rule.property));

  const submit = () => {
    if (!ready) return;
    if (editing) {
      onEdit(rule.id, {
        rule: text.trim(),
        agent,
        ...(scope === "property" ? { property } : {}),
      });
      return;
    }
    onAdd({
      /* Deterministic enough for a prototype and stable within a session. */
      id: `kr-new-${text.length}-${agent}`,
      scope,
      property: scope === "property" ? property : undefined,
      agent,
      rule: text.trim(),
      /* Stamped with the moment it was added. The app has no author to record,
       * only a time. */
      addedOn: nowIsoLocal(),
      /* A rule written now has not fired yet, and the table says so rather than
       * pretending otherwise. */
      applied: 0,
    });
  };

  const title = editing ? "Edit rule" : "Add a rule";

  return (
    <OverlayCard width={560}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} for ${SCOPE_LABEL[scope].toLowerCase()}`}
        className="flex flex-col scroll-thin"
        style={{
          padding: "var(--space-6)",
          gap: "var(--space-6)",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
        }}
      >
        <div className="flex flex-row items-start" style={{ gap: "var(--space-5)" }}>
          <div className="flex flex-col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <span className="t-title" style={{ color: "var(--ink-primary)" }}>
              {title}
            </span>
            <span
              style={{
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
              }}
            >
              {scope === "all"
                ? "Applies to every reconciliation the AI runs"
                : "Applies only to the property you name"}
            </span>
          </div>
          {/* On the shared primitive rather than a hand-rolled round button
            * with its own fill: it is an icon-only control, which is what
            * IconButton is for, and its old fill was a one-off white wash
            * instead of --surface-control. */}
          <IconButton
            variant="secondary"
            size="md"
            ariaLabel="Close"
            onClick={onClose}
          >
            <X size={14} strokeWidth={1.75} />
          </IconButton>
        </div>

        <Field label="Rule">
          {/* Written in the reconciler's own words, so a textarea and not a
            * builder. The placeholder is a real rule from the list, because an
            * abstract placeholder teaches nobody the register to write in. */}
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            placeholder="Chase Operating charges a $42.50 account fee on the 3rd of every month. It is not a duplicate."
            className="scroll-thin"
            style={{
              width: "100%",
              resize: "vertical",
              padding: "var(--space-5)",
              background: "var(--surface-list)",
              border: "1px solid rgba(157, 179, 197, 0.35)",
              borderRadius: "var(--radius-control)",
              fontFamily: "inherit",
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-primary)",
              outline: "none",
            }}
          />
        </Field>

        {scope === "property" && (
          <Field label="Property">
            <Select
              ariaLabel="Property this rule applies to"
              value={property}
              onChange={setProperty}
              options={properties.map((p) => ({
                value: shortAddress(p.address),
                label: shortAddress(p.address),
              }))}
            />
          </Field>
        )}

        {/* "Read by" named the same relationship the table now calls Agent.
          * One word per concept, in the column heading and in the field that
          * fills it. */}
        <Field label="Agent">
          <Select
            ariaLabel="Agent that reads this rule"
            value={agent}
            onChange={(v) => setAgent(v as AIAgentKey)}
            options={aiAgents.map((a) => ({ value: a.key, label: a.name }))}
          />
        </Field>

        <div className="flex flex-row items-center" style={{ gap: "var(--space-4)" }}>
          <div className="flex-1" />
          <Button size="lg" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!ready} onClick={submit}>
            {editing ? "Save changes" : "Add rule"}
          </Button>
        </div>
      </div>
    </OverlayCard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col" style={{ gap: "var(--space-4)" }}>
      <span className="t-label">{label}</span>
      {children}
    </label>
  );
}

/* The app's own select, not the browser's.
 *
 * A native <select> draws its own popup in OS chrome: a different font, a
 * different corner radius, a different highlight colour, and on macOS an
 * opaque menu that lands nothing like the frosted ones every other control on
 * this page opens. It was the only control in the product that looked like it
 * came from somewhere else — which mattered most in the rule editor, where a
 * person is deciding which agent reads a rule they wrote.
 *
 * Same glass sheet and the same ticked options as the cycle and range pickers,
 * so choosing an agent, a cycle and a window are one gesture learned once.
 * Keyboard: Escape closes, and the trigger is a real button so it is reachable
 * and announces its expanded state. */
function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative" style={{ width: "100%" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex flex-row items-center"
        style={{
          width: "100%",
          height: "var(--control-lg)",
          padding: "0 var(--space-4)",
          gap: "var(--space-4)",
          background: "var(--surface-list)",
          border: `1px solid ${open ? "var(--line)" : "var(--line-menu)"}`,
          borderRadius: "var(--radius-control)",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          transition: "border-color 120ms ease",
        }}
      >
        <span
          className="flex-1 truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          {current?.label ?? value}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          color="var(--ink-tertiary)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 140ms ease",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="glass flex flex-col"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            zIndex: 60,
            borderRadius: "var(--radius-sheet)",
            padding: 4,
          }}
        >
          {options.map((o) => (
            <MenuItem
              key={o.value}
              label={o.label}
              selected={o.value === value}
              onSelect={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Shared ================= */

/* "1849 Westlake Ave N, Seattle, WA 98109" -> "1849 Westlake Ave N, Seattle".
 * Street and city, which is how every seeded rule names its property. Without
 * it a rule added through the dialog carried the state and ZIP as well, so one
 * row in the column was a different length from all the others and truncated. */
function shortAddress(address: string): string {
  return address.split(",").slice(0, 2).join(",").trim();
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
