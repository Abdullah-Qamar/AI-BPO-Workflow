"use client";

/* PropertiesCanvas — the #properties route.
 *
 * Properties is a portfolio reference / setup surface, not a daily-use page.
 * The reconciler arrives here to (a) onboard a property (CSV import + manual
 * create), (b) look up where a property stands, (c) associate or correct a bank
 * account, (d) audit what past closes did, or (e) start a session.
 *
 * View states (one owns the canvas at a time — never side-by-side):
 *   list   — portfolio roster (default landing once any property exists)
 *   detail — single property's home page (header / property details /
 *            associated accounts / session history). Opened by clicking a row. */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import {
  CURRENT_CYCLE,
  properties as seededProperties,
  STATUS_META,
  STORED_STATES,
  type PropertyBankMapping,
  type PropertyRecord,
  type PropertySession,
  type PropertyState,
  type PropertyType,
} from "@/lib/seed";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Status";
import { Overlay, OverlayCard } from "@/components/ui/Overlay";
import {
  ACCOUNT_PURPOSES,
  isValidRouting,
  lookupByRouting,
  monogramFor,
  searchInstitutions,
  type Institution,
} from "@/lib/bankDirectory";

type View = "list" | "detail";

type TabKey = "all" | PropertyState;

type SortKey = "lastReconciled" | "address" | "openItems";

/* Status words come from `STATUS_META` and the marks come from `ui/Status`.
 * There used to be a `STATE_PALETTE` here holding a fill, a border, a text ink
 * and a dot colour per state — a fourth copy of a vocabulary the app now keeps
 * in exactly one place. */
function stateLabel(state: PropertyState): string {
  return STATUS_META[state].label;
}

interface PropertiesCanvasProps {
  /* Open a session in the workspace. With no `sessionId` the host opens the
   * property's live session for the current cycle; with one it opens that exact
   * run, which is what a click on a history row means. */
  onStartSession?: (propertyId: string, sessionId?: string) => void;
}

export function PropertiesCanvas({ onStartSession }: PropertiesCanvasProps) {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* The roster is session-local state, not a store: the prototype has no
   * persistence layer, so a property created here lives until the route
   * unmounts. It seeds from `seededProperties` and only ever grows, which keeps
   * it from fighting the per-card drafts below — identity lives here, edits to
   * a property's banks live inside `AssociatedBanksCard`. */
  const [roster, setRoster] = useState<PropertyRecord[]>(seededProperties);

  if (view === "detail" && selectedId) {
    const property = roster.find((p) => p.id === selectedId);
    if (property) {
      return (
        <PropertyDetail
          property={property}
          onBack={() => setView("list")}
          onStartSession={(sessionId) =>
            onStartSession?.(property.id, sessionId)
          }
        />
      );
    }
  }

  return (
    <PropertiesList
      properties={roster}
      onCreate={(p) => setRoster((prev) => [p, ...prev])}
      onOpen={(id) => {
        setSelectedId(id);
        setView("detail");
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
 * LIST VIEW
 *
 * One card, not two. The search bar and the status tabs used to sit in their
 * own lifted surface above the roster, which drew a hard line between the
 * controls and the thing they control — and gave the page three stacked
 * surfaces to parse before the first property. Now it is the Dashboard's
 * listing shape: a toolbar and a bright inner sheet inside a single card.
 * ───────────────────────────────────────────────────────────── */

function PropertiesList({
  properties,
  onCreate,
  onOpen,
}: {
  properties: PropertyRecord[];
  onCreate: (p: PropertyRecord) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [market, setMarket] = useState("all");
  const [portfolio, setPortfolio] = useState("all");
  const [sort, setSort] = useState<SortKey>("lastReconciled");

  /* Search + the two scope filters, applied before the tab. Tab counts are
   * derived from *this* set rather than the whole roster, so "Review 3" never
   * promises three rows a filtered list can't produce — the old counters read
   * off a module-level total and lied the moment you typed. */
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((p) => {
      if (market !== "all" && p.market !== market) return false;
      if (portfolio !== "all" && p.portfolio !== portfolio) return false;
      if (q.length === 0) return true;
      return (
        p.address.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.legalEntity.toLowerCase().includes(q) ||
        p.portfolio.toLowerCase().includes(q) ||
        p.market.toLowerCase().includes(q) ||
        p.banks.some((b) => b.shortName.toLowerCase().includes(q))
      );
    });
  }, [properties, query, market, portfolio]);

  const counts = useMemo(() => {
    const base: Record<TabKey, number> = {
      all: scoped.length,
      review: 0,
      active: 0,
      failed: 0,
      completed: 0,
      "not-started": 0,
    };
    for (const p of scoped) base[p.state] += 1;
    return base;
  }, [scoped]);

  const rows = useMemo(() => {
    const filtered =
      tab === "all" ? scoped : scoped.filter((p) => p.state === tab);
    return filtered.slice().sort((a, b) => {
      if (sort === "address") return a.address.localeCompare(b.address);
      if (sort === "openItems") return b.openItems - a.openItems;
      /* lastReconciled — "Never" floats to the bottom, otherwise newest first */
      const aN = a.lastReconciled === "Never";
      const bN = b.lastReconciled === "Never";
      if (aN !== bN) return aN ? 1 : -1;
      return b.lastReconciled.localeCompare(a.lastReconciled);
    });
  }, [scoped, tab, sort]);

  const filtersActive =
    query.trim().length > 0 || market !== "all" || portfolio !== "all";

  /* Derived from the roster on screen rather than imported from the seed:
   * onboarding a property in a new market has to make the filter offer that
   * market, and the seed's module-level lists cannot know about it. */
  const markets = useMemo(
    () => Array.from(new Set(properties.map((p) => p.market))).sort(),
    [properties]
  );
  const portfolios = useMemo(
    () => Array.from(new Set(properties.map((p) => p.portfolio))).sort(),
    [properties]
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
        <ListHeader
          existingCodes={properties.map((p) => p.code)}
          markets={markets}
          portfolios={portfolios}
          onCreate={onCreate}
        />
        <RosterCard
          rows={rows}
          counts={counts}
          markets={markets}
          portfolios={portfolios}
          tab={tab}
          setTab={setTab}
          query={query}
          setQuery={setQuery}
          market={market}
          setMarket={setMarket}
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          sort={sort}
          setSort={setSort}
          filtersActive={filtersActive}
          onClearFilters={() => {
            setQuery("");
            setMarket("all");
            setPortfolio("all");
            setTab("all");
          }}
          onOpen={onOpen}
        />
      </div>
    </main>
  );
}

/* Title row only. The strapline underneath ("Portfolio roster — …") named the
 * card directly below it, which is the definition of a caption nobody reads.
 *
 * No leading icon either, for the same reason and one more: it pushed the
 * heading 28px right of every left edge below it. The rail already carries the
 * glyph, and it says "Properties" next to it. */
function ListHeader({
  existingCodes,
  markets,
  portfolios,
  onCreate,
}: {
  existingCodes: string[];
  markets: string[];
  portfolios: string[];
  onCreate: (p: PropertyRecord) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  /* Import reads the file the user picked and reports what is actually in it.
   * It stops there on purpose: there is no ingestion pipeline behind this
   * prototype, and a button that pretends twelve properties appeared is worse
   * than one that says plainly how many rows it found. The row count is counted
   * off the file, not guessed. */
  const readCsv = async (f: File) => {
    setImportNote(`Reading ${f.name}`);
    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows = Math.max(lines.length - 1, 0);
      setImportNote(
        `${f.name} · ${rows} ${rows === 1 ? "row" : "rows"} read. Nothing imported yet.`
      );
    } catch {
      setImportNote(`${f.name} could not be read.`);
    }
  };

  /* The note is transient — it reports on one pick and gets out of the way. */
  useEffect(() => {
    if (!importNote) return;
    const t = window.setTimeout(() => setImportNote(null), 8000);
    return () => window.clearTimeout(t);
  }, [importNote]);

  return (
    <div
      className="flex flex-row items-center shrink-0"
      style={{ width: "100%", gap: "var(--space-4)", height: "var(--control-lg)" }}
    >
      <h1 className="t-display truncate" style={{ color: "var(--ink-primary)" }}>
        Properties
      </h1>
      <div className="flex-1 min-w-0 flex flex-row items-center">
        {importNote && (
          <span
            className="truncate"
            role="status"
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-tertiary)",
              paddingLeft: "var(--space-5)",
            }}
            data-hint={importNote}
            data-hint-side="bottom"
          >
            {importNote}
          </span>
        )}
      </div>
      <input
        ref={file}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void readCsv(f);
          /* Reset so picking the same file twice still fires a change. */
          e.target.value = "";
        }}
      />
      <Button
        size="lg"
        leftIcon={<Upload size={14} strokeWidth={1.75} />}
        onClick={() => file.current?.click()}
      >
        Import CSV
      </Button>
      <Button
        variant="primary"
        size="lg"
        leftIcon={<Plus size={14} strokeWidth={1.75} />}
        onClick={() => setCreating(true)}
      >
        New property
      </Button>
      <NewPropertyModal
        open={creating}
        existingCodes={existingCodes}
        markets={markets}
        portfolios={portfolios}
        onDismiss={() => setCreating(false)}
        onCreate={(p) => {
          onCreate(p);
          setCreating(false);
        }}
      />
    </div>
  );
}

/* Everything a property needs that the form does not ask for is left empty
 * rather than filled in with something plausible: the detail page renders those
 * fields as "Not set", which is the truth until someone types them. The derived
 * half (period, state, counts, last closed) follows the seed's own rule for a
 * property with no sessions. Session-local, like the roster that holds it. */
function blankProperty(input: {
  address: string;
  code: string;
  legalEntity: string;
  market: string;
  portfolio: string;
  type: PropertyType;
}): PropertyRecord {
  const [street, ...rest] = input.address.split(",").map((s) => s.trim());
  return {
    id: `prop-new-${input.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    code: input.code,
    ledgerPropertyId: "",
    legalEntity: input.legalEntity,
    address: input.address,
    shortAddress: street || input.address,
    cityState: rest.join(", "),
    market: input.market,
    type: input.type,
    units: 0,
    owner: "",
    accountant: "",
    ledgerSource: "Manual",
    fiscalCalendar: "",
    /* Same rule the seed applies: every property is scoped to the cycle the app
     * is on, and one with no sessions in it is Not started. */
    period: CURRENT_CYCLE,
    closeStatus: "open",
    currentSession: undefined,
    state: "not-started",
    openItems: 0,
    exceptions: 0,
    tieOut: "Pending",
    lastReconciled: "Never",
    portfolio: input.portfolio,
    acquired: "",
    yearBuilt: 0,
    rentableSqFt: 0,
    propertyManager: "",
    taxId: "",
    ownershipStake: "",
    recordStatus: "Active",
    banks: [],
    sessions: [],
  };
}

const NEW_PROPERTY_TYPES: PropertyType[] = [
  "Multi-family",
  "Office",
  "Retail",
  "Mixed-use",
  "Industrial",
];

function NewPropertyModal({
  open,
  existingCodes,
  markets,
  portfolios,
  onDismiss,
  onCreate,
}: {
  open: boolean;
  existingCodes: string[];
  markets: string[];
  portfolios: string[];
  onDismiss: () => void;
  onCreate: (p: PropertyRecord) => void;
}) {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [legalEntity, setLegalEntity] = useState("");
  const [market, setMarket] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [type, setType] = useState<PropertyType>("Multi-family");
  const [touched, setTouched] = useState(false);

  /* The property code is the key every ledger export joins on, so a duplicate
   * is not a cosmetic problem: two properties answering to one code makes the
   * Yardi side ambiguous. Checked against the roster, same as the bank editor
   * checks last-4 against its siblings. */
  const codeDup =
    code.trim().length > 0 &&
    existingCodes.some((c) => c.toLowerCase() === code.trim().toLowerCase());

  const valid =
    address.trim().length > 0 &&
    code.trim().length > 0 &&
    legalEntity.trim().length > 0 &&
    market.trim().length > 0 &&
    portfolio.trim().length > 0 &&
    !codeDup;

  if (!open) return null;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onCreate(
      blankProperty({
        address: address.trim(),
        code: code.trim(),
        legalEntity: legalEntity.trim(),
        market: market.trim(),
        portfolio: portfolio.trim(),
        type,
      })
    );
    setAddress("");
    setCode("");
    setLegalEntity("");
    setMarket("");
    setPortfolio("");
    setType("Multi-family");
    setTouched(false);
  };

  return (
    <Overlay open onDismiss={onDismiss}>
      <OverlayCard width={560}>
        <div
          className="flex flex-col"
          style={{ padding: "var(--pad-panel)", gap: "var(--space-6)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            {/* The role class, not the bundle re-assembled: this heading was
              * carrying --tracking-title at 20px, so it set a shade wider than
              * the identically-sized title on the other modal. */}
            <span className="t-heading" style={{ color: "var(--ink-primary)" }}>
              New property
            </span>
            <span
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
              }}
            >
              Identity only. Asset facts and bank accounts get filled in on the
              property page once it exists.
            </span>
          </div>

          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <EditorField
              label="Address"
              hint="Street, city, state"
              error={touched && address.trim().length === 0 ? "Required." : null}
            >
              <input
                autoFocus
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="1200 Harbor Point Rd, Stamford, CT"
                style={fieldInputStyle}
              />
            </EditorField>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
                columnGap: "var(--space-5)",
              }}
            >
              <EditorField
                label="Property code"
                hint="Joins to the ledger"
                error={
                  codeDup
                    ? "Already used by another property."
                    : touched && code.trim().length === 0
                    ? "Required."
                    : null
                }
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="HP-1200"
                  style={fieldInputStyle}
                />
              </EditorField>
              <EditorField
                label="Legal entity"
                hint="Whose books it sits on"
                error={
                  touched && legalEntity.trim().length === 0 ? "Required." : null
                }
              >
                <input
                  value={legalEntity}
                  onChange={(e) => setLegalEntity(e.target.value)}
                  placeholder="Harbor Point Owner LLC"
                  style={fieldInputStyle}
                />
              </EditorField>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                columnGap: "var(--space-5)",
              }}
            >
              <EditorField
                label="Market"
                hint="Existing or new"
                error={touched && market.trim().length === 0 ? "Required." : null}
              >
                <input
                  value={market}
                  list="new-property-markets"
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder="Stamford, CT"
                  style={fieldInputStyle}
                />
                <datalist id="new-property-markets">
                  {markets.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </EditorField>
              <EditorField
                label="Portfolio"
                hint="Existing or new"
                error={
                  touched && portfolio.trim().length === 0 ? "Required." : null
                }
              >
                <input
                  value={portfolio}
                  list="new-property-portfolios"
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="Core Northeast"
                  style={fieldInputStyle}
                />
                <datalist id="new-property-portfolios">
                  {portfolios.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </EditorField>
              <EditorField label="Asset type" hint="What it is">
                <FieldSelect
                  value={type}
                  onChange={(v) => setType(v as PropertyType)}
                  options={NEW_PROPERTY_TYPES}
                />
              </EditorField>
            </div>
          </div>

          {/* The note sits on its own line rather than beside the buttons: it
            * is a full sentence, and sharing a row with two controls left it
            * truncated to nothing on the width this card wants to be. */}
          <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
            <span
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
              }}
            >
              It lands in the roster as Not started, with no sessions and no
              accounts yet.
            </span>
            <div
              className="flex flex-row items-center justify-end"
              style={{ gap: "var(--space-4)" }}
            >
              <Button variant="secondary" size="md" onClick={onDismiss}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Check size={14} strokeWidth={1.75} />}
                onClick={submit}
                style={{ whiteSpace: "nowrap" }}
              >
                Create property
              </Button>
            </div>
          </div>
        </div>
      </OverlayCard>
    </Overlay>
  );
}

function RosterCard({
  rows,
  counts,
  markets,
  portfolios,
  tab,
  setTab,
  query,
  setQuery,
  market,
  setMarket,
  portfolio,
  setPortfolio,
  sort,
  setSort,
  filtersActive,
  onClearFilters,
  onOpen,
}: {
  rows: PropertyRecord[];
  counts: Record<TabKey, number>;
  markets: string[];
  portfolios: string[];
  tab: TabKey;
  setTab: (t: TabKey) => void;
  query: string;
  setQuery: (q: string) => void;
  market: string;
  setMarket: (m: string) => void;
  portfolio: string;
  setPortfolio: (p: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section
      className="flex flex-col min-h-0"
      style={{
        width: "100%",
        flex: "0 1 auto",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "0 var(--space-6) var(--space-6)",
      }}
    >
      <RosterToolbar
        tab={tab}
        setTab={setTab}
        counts={counts}
        markets={markets}
        portfolios={portfolios}
        query={query}
        setQuery={setQuery}
        market={market}
        setMarket={setMarket}
        portfolio={portfolio}
        setPortfolio={setPortfolio}
        sort={sort}
        setSort={setSort}
      />

      <div
        className="flex flex-col min-h-0"
        style={{
          background: "var(--surface-list)",
          borderRadius: "var(--radius-sheet)",
          boxShadow: "var(--shadow-depth-1)",
          overflow: "hidden",
          padding: 4,
          ...({ "--list-inset": "8px" } as React.CSSProperties),
        }}
      >
        {/* Six column labels over an empty sheet read as a table that failed
          * rather than as a filter with no matches. The header comes with the
          * data it names, same as the Dashboard's. */}
        {rows.length > 0 && <RosterTableHeader />}
        <div
          className="flex flex-col min-h-0 overflow-auto scroll-thin"
          style={{ maxHeight: 14 * 40 }}
        >
          {rows.length === 0 ? (
            <EmptyRoster
              filtersActive={filtersActive}
              onClearFilters={onClearFilters}
            />
          ) : (
            rows.map((p) => (
              <PropertyRow key={p.id} property={p} onOpen={() => onOpen(p.id)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* Search leads, because on a roster the first job is "find the one I mean";
 * tabs sit beside it as the primary scoping control, exactly as on the
 * Dashboard. Market and portfolio are qualifiers, so they cluster at the far
 * right with sort. Wraps rather than crushes on a narrow canvas. */
function RosterToolbar({
  tab,
  setTab,
  counts,
  markets,
  portfolios,
  query,
  setQuery,
  market,
  setMarket,
  portfolio,
  setPortfolio,
  sort,
  setSort,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  counts: Record<TabKey, number>;
  markets: string[];
  portfolios: string[];
  query: string;
  setQuery: (q: string) => void;
  market: string;
  setMarket: (m: string) => void;
  portfolio: string;
  setPortfolio: (p: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  /* Every state a stored property can be in gets a tab, in triage order, with
   * the words from the one status table.
   *
   * "Active" is deliberately absent. It is a RUNTIME state — a run executing
   * right now — and a property's state is read off its newest written session,
   * which is never mid-flight. A tab that is permanently zero is worse than no
   * tab: it reads as a filter that is broken rather than one with nothing in
   * it. `STORED_STATES` is the seed's own list of the four, so this strip
   * cannot drift from the nav's. */
  const tabs: [TabKey, string][] = [
    ["all", "All"],
    ...STORED_STATES.map((k) => [k, stateLabel(k)] as [TabKey, string]),
  ];

  return (
    <div
      className="flex flex-row items-center flex-wrap shrink-0"
      style={{
        gap: "var(--space-5)",
        rowGap: "var(--space-4)",
        padding: "var(--space-6) 0 var(--space-5)",
      }}
    >
      <SearchField query={query} setQuery={setQuery} />

      <div className="flex flex-row items-center" style={{ gap: "var(--space-2)" }}>
        {tabs.map(([key, label]) => {
          const active = tab === key;
          const empty = counts[key] === 0;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
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
                fontWeight: active
                  ? "var(--weight-medium)"
                  : "var(--weight-regular)",
                color: active ? "var(--ink-primary)" : "var(--ink-tertiary)",
                opacity: empty && !active ? 0.55 : 1,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
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
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: "1 1 0", minWidth: 0 }} />

      {/* One group so the three qualifiers wrap together rather than leaving a
       * single orphan menu on a second line. */}
      <div
        className="flex flex-row items-center"
        style={{ gap: "var(--space-2)" }}
      >
      <SelectMenu
        label="Market"
        value={market}
        onChange={setMarket}
        options={[
          { key: "all", label: "All markets" },
          ...markets.map((m) => ({ key: m, label: m })),
        ]}
      />
      <SelectMenu
        label="Portfolio"
        value={portfolio}
        onChange={setPortfolio}
        options={[
          { key: "all", label: "All portfolios" },
          ...portfolios.map((p) => ({ key: p, label: p })),
        ]}
      />
      <SelectMenu
        label="Sort"
        value={sort}
        onChange={(v) => setSort(v as SortKey)}
        options={[
          { key: "lastReconciled", label: "Latest closed" },
          { key: "address", label: "Address A–Z" },
          { key: "openItems", label: "Most open items" },
        ]}
      />
      </div>
    </div>
  );
}

function SearchField({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (q: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex flex-row items-center"
      style={{
        flex: "0 1 232px",
        minWidth: 176,
        height: "var(--control-md)",
        padding: "0 10px",
        gap: "var(--space-4)",
        background: "var(--surface-input)",
        border: "1px solid var(--line-inner-white)",
        borderRadius: "var(--radius-control)",
        ...focusRing(focused),
      }}
    >
      <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Address, code, entity, bank"
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
      {query.length > 0 && (
        <button
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 16,
            height: 16,
            background: "transparent",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
            color: "var(--ink-tertiary)",
          }}
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

/* The sheet's floor width, named because the edge-flip below has to measure
 * against the same number the sheet is drawn at. */
const MENU_MIN_WIDTH = 190;

/* One menu primitive for all three qualifiers. Closes on outside click and on
 * Escape, and marks the active option with a check rather than a background
 * tint alone — the previous sort menu did none of the three. */
function SelectMenu({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  /* Which edge the sheet hangs from. These three menus sit at the right end of
   * the toolbar on a wide canvas, so hanging right is correct there — but the
   * toolbar wraps, and once it does they are the leftmost things in the card
   * and a right-hung 190px sheet reaches back past the card's edge and opens
   * underneath the rail. The boundary it must stay inside is the card's own
   * left edge, not the window's — a sheet that clears the viewport but hangs
   * off the card is still wrong. Measured on open rather than guessed from a
   * breakpoint, because what decides it is where this particular trigger
   * landed after the wrap. */
  const [alignLeft, setAlignLeft] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.key === value) ?? options[0];
  const isDefault = value === options[0].key;

  useEffect(() => {
    if (!open) return;
    const rect = wrap.current?.getBoundingClientRect();
    const card = wrap.current?.closest("section")?.getBoundingClientRect();
    if (rect) setAlignLeft(rect.right - MENU_MIN_WIDTH < (card?.left ?? 0));
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
    <div className="relative shrink-0" ref={wrap}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label}: ${active.label}`}
        className="flex flex-row items-center"
        style={{
          height: "var(--control-md)",
          padding: "0 8px 0 10px",
          gap: "var(--space-3)",
          /* A set filter is a lifted chip; an unset one is quiet text. The
           * state of the list should be legible without opening anything. */
          background: isDefault ? "transparent" : "var(--surface-tab-active)",
          border: isDefault ? "1px solid transparent" : "1px solid #FFFFFF",
          boxShadow: isDefault ? "none" : "var(--shadow-chip)",
          borderRadius: "var(--radius-control)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: isDefault ? "var(--ink-tertiary)" : "var(--ink-primary)",
          whiteSpace: "nowrap",
        }}
      >
        {active.label}
        <ChevronDown size={14} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          className="absolute glass"
          style={{
            top: "calc(100% + 6px)",
            ...(alignLeft ? { left: 0 } : { right: 0 }),
            minWidth: MENU_MIN_WIDTH,
            maxHeight: 280,
            overflowY: "auto",
            padding: 4,
            borderRadius: "var(--radius-sheet)",
            zIndex: 20,
          }}
        >
          {options.map((o) => (
            <MenuOption
              key={o.key}
              label={o.label}
              selected={o.key === value}
              onClick={() => {
                onChange(o.key);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* A row on a frosted sheet. Its own component because the hover needs state and
 * the rows are produced by a map.
 *
 * The hover is translucent white rather than the listing rows' opaque lift: the
 * sheet under it is glass, and painting a solid fill over the one blurred
 * surface on screen puts an opaque hole in the middle of it. 0.72 sits just
 * above the sheet's own 0.78 fill once they compose, which is enough to read as
 * a hovered row without switching the pane off. */
function MenuOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "6px 8px",
        gap: "var(--space-4)",
        background: hover ? "rgba(255, 255, 255, 0.72)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-primary)",
        textAlign: "left",
        whiteSpace: "nowrap",
        transition: "background 120ms ease",
      }}
    >
      <span
        className="shrink-0 inline-flex"
        style={{ width: 14, color: "var(--ink-secondary)" }}
      >
        {selected && <Check size={14} strokeWidth={1.75} />}
      </span>
      {label}
    </button>
  );
}

/* Columns are what a reconciler decides on: where it stands, how many statement
 * sources feed it, what it left behind, and when it last closed. Legal entity,
 * asset type and unit count came off the row — they are property reference
 * facts, they live on the detail page, and six equal-weight grey facts on a
 * second line is not a row, it's a paragraph. */
/* Widths are measured off what is actually in each column, and what is in them
 * shrank when the header glyphs went: the four figure columns were sized for a
 * label plus a 14px icon and a 6px gap, and the icon is gone. Nothing here
 * sorts — the roster's sort lives in the toolbar menu — so no column has to
 * hold room for a direction mark either.
 *
 * Status is the exception and is sized to its widest chip ("Not started", 86px)
 * rather than to the word "Status". The ~124px this frees all lands in the
 * Property column, which is the one that was truncating addresses. */
const ROSTER_GRID = "minmax(0, 1fr) 88px 60px 40px 68px 72px 14px";

function RosterTableHeader() {
  const cell: React.CSSProperties = {
    fontSize: "var(--type-meta)",
    lineHeight: "var(--leading-ui)",
    fontWeight: "var(--weight-medium)",
    letterSpacing: "var(--tracking-meta)",
    color: "var(--ink-tertiary)",
  };

  /* No glyphs here. A column header is already the shortest possible statement
   * of what the column holds; a building beside "Property" and a triangle
   * beside "Exceptions" restated it in a second alphabet, and six of them
   * across one 32px strip read as a toolbar rather than a header. */
  return (
    <div
      className="list-row grid shrink-0"
      style={{
        gridTemplateColumns: ROSTER_GRID,
        gap: "var(--space-5)",
        alignItems: "center",
        padding: "var(--space-4) 8px",
        /* Matches the 1px transparent border every row carries so its hover
         * lift does not shift it. Without it the header's box is 2px narrower
         * than a row's and every label sits a pixel off the column it names —
         * which shows most on the right-aligned figures. */
        border: "1px solid transparent",
      }}
    >
      <HeaderCell style={cell} label="Property" />
      <span style={cell}>Status</span>
      <HeaderCell style={cell} label="Accounts" trailing />
      <HeaderCell style={cell} label="Open" trailing />
      <HeaderCell style={cell} label="Exceptions" trailing />
      <span style={{ ...cell, textAlign: "right" }}>Last closed</span>
      <span />
    </div>
  );
}

function HeaderCell({
  style,
  label,
  trailing,
}: {
  style: React.CSSProperties;
  label: string;
  trailing?: boolean;
}) {
  return (
    <span
      className={`flex flex-row items-center truncate ${
        trailing ? "justify-end" : ""
      }`}
      style={{ ...style, gap: "var(--space-3)" }}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

/* The seeded addresses carry a trailing ZIP. City and state are the parts that
 * place a building for a human; the ZIP is five digits of noise in a list you
 * scan by street name. */
function displayAddress(address: string): string {
  return address.replace(/,?\s*\d{5}(-\d{4})?$/, "");
}

/* The row's hint opens below it rather than above: the first row sits directly
 * under the column header, and a hint on top would cover the header it is
 * meant to be read beside. */
function PropertyRow({
  property,
  onOpen,
}: {
  property: PropertyRecord;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  const state = property.state;
  const never = property.lastReconciled === "Never";

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${displayAddress(property.address)} · ${property.code} · ${
        stateLabel(state)
      }, ${property.banks.length} ${
        property.banks.length === 1 ? "account" : "accounts"
      }, ${
        property.openItems === 0 ? "no open items" : `${property.openItems} open`
      }. Open property.`}
      data-hint={`${property.legalEntity} · ${property.portfolio}`}
      data-hint-side="bottom"
      className="list-row grid text-left shrink-0"
      style={{
        width: "100%",
        gridTemplateColumns: ROSTER_GRID,
        gap: "var(--space-5)",
        alignItems: "center",
        height: 40,
        padding: "0 8px",
        /* One listing-row hover across the app: lift to white with a hairline
         * and a chip shadow. The resting border is transparent, so nothing
         * shifts by a pixel on the way in. */
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <span
        className="flex flex-row items-baseline truncate"
        style={{ gap: "var(--space-3)" }}
      >
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          {displayAddress(property.address)}
        </span>
        <span
          className="nums shrink-0"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          · {property.code}
        </span>
      </span>

      <span className="flex flex-row items-center min-w-0">
        <StatusChip status={state} />
      </span>

      {/* Banks are a count, not a logo pile. Four overlapping 20px tiles told
        * you nothing identifiable and cost the width this column now uses to
        * say the only bank fact that matters on a roster: how many statement
        * sources this property has. A property with none can't reconcile. */}
      <Figure
        value={property.banks.length}
        tone={property.banks.length === 0 ? "alert" : undefined}
      />
      <Figure
        value={property.openItems === 0 ? "—" : property.openItems}
        tone={property.openItems === 0 ? "muted" : "alert"}
      />
      <Figure
        value={property.exceptions === 0 ? "—" : property.exceptions}
        tone={property.exceptions === 0 ? "muted" : "alert"}
      />

      <span
        className="nums"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: never ? "var(--ink-tertiary)" : "var(--ink-secondary)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {never ? "Never" : property.lastReconciled}
      </span>

      <span className="row-chevron inline-flex shrink-0" aria-hidden>
        <ChevronRight size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
      </span>
    </button>
  );
}

/* One numeric cell — same three inks as the Dashboard's: default reads, muted
 * is "nothing here", alert is "this is the work". */
function Figure({
  value,
  tone,
}: {
  value: string | number;
  tone?: "muted" | "alert";
}) {
  const alert = tone === "alert";
  return (
    <span
      className="nums"
      style={{
        fontSize: "var(--type-body)",
        lineHeight: "var(--leading-ui)",
        fontWeight: alert ? "var(--weight-medium)" : "var(--weight-regular)",
        color: alert
          ? "var(--status-warn-ink)"
          : tone === "muted"
          ? "var(--ink-tertiary)"
          : "var(--ink-secondary)",
        textAlign: "right",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

function EmptyRoster({
  filtersActive,
  onClearFilters,
}: {
  filtersActive: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        /* 8px, the row inset — the sentence starts where a property's address
         * would. --pad-card put it 8px right of every row above it. */
        padding: "var(--space-7) 8px",
        gap: "var(--space-5)",
      }}
    >
      <span
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
        }}
      >
        {filtersActive
          ? "No properties match these filters."
          : "Nothing in this state right now."}
      </span>
      {filtersActive && (
        <Button size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * DETAIL VIEW
 *
 * One property's home page. Order follows what the reconciler came for:
 *   1. PropertyHeader   — identity + where the current period stands, one bento
 *   2. PropertyDetails  — the durable facts about the building and who owns it
 *   3. AssociatedBanks  — the accounts whose statements feed reconciliation
 *   4. SessionHistory   — every run against this property, newest first
 * ───────────────────────────────────────────────────────────── */

function PropertyDetail({
  property,
  onBack,
  onStartSession,
}: {
  property: PropertyRecord;
  onBack: () => void;
  /* Omit the session id to open this property's live session; pass one to open
   * that exact run. Every control on this page routes through here. */
  onStartSession: (sessionId?: string) => void;
}) {
  return (
    <main
      className="canvas-pad flex flex-col items-center flex-1 min-w-0 relative overflow-auto scroll-thin"
      style={{ background: "var(--bg-grad)" }}
    >
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1120, gap: "var(--space-6)" }}
      >
        <BackLink onBack={onBack} />
        <PropertyDetailsCard
          property={property}
          onStartSession={() => onStartSession()}
          onOpenCurrent={() => onStartSession(property.currentSession?.id)}
        />
        {/* Keyed by property so a half-finished bank draft cannot survive a
         * move to a different building. */}
        <AssociatedBanksCard
          key={property.id}
          banks={property.banks}
          legalEntity={property.legalEntity}
        />
        <SessionHistoryCard
          sessions={property.sessions}
          onStartSession={() => onStartSession()}
          onOpenSession={(sessionId) => onStartSession(sessionId)}
        />
      </div>
    </main>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onBack}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center self-start"
      style={{
        gap: 6,
        height: "var(--control-sm)",
        /* No horizontal padding. There is no fill to inset from — only the ink
         * changes on hover — so 4px bought nothing and pushed the arrow off the
         * left edge the three cards below it all share. */
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: hover ? "var(--ink-primary)" : "var(--ink-tertiary)",
        transition: "color 120ms ease",
      }}
    >
      <ArrowLeft size={14} strokeWidth={1.75} />
      Properties
    </button>
  );
}

/* The status was a static pill. Every state it can hold is either a job to do
 * ("Review", "Failed") or a state you'd want to inspect ("Completed", "Not
 * started"), so it's a button in all of them, and it takes you to the session
 * that owns the period. It leads with the cycle because the status is a
 * statement about that cycle, not about the building.
 *
 * The chrome is `ui/Button`'s: the button used to wear the status colour itself,
 * which made a pressable control and a state label the same object. The state
 * now rides inside as a `StatusChip` — one tinted thing, and it is the thing
 * that is actually saying the state. */
function StatusCTA({
  state,
  period,
  onClick,
}: {
  state: PropertyState;
  period: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="md"
      onClick={onClick}
      ariaLabel={`${period} · ${stateLabel(state)}. Open this cycle's session.`}
      rightIcon={<ChevronRight size={14} strokeWidth={1.75} />}
    >
      <span
        className="inline-flex items-center"
        style={{ gap: "var(--space-3)" }}
      >
        <span className="nums">{period}</span>
        <StatusChip status={state} />
      </span>
    </Button>
  );
}

/* Middot separator for inline fact runs. */
function Sep() {
  return (
    <span
      style={{
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-tertiary)",
      }}
    >
      ·
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CARD SHELL
 * ───────────────────────────────────────────────────────────── */

function DetailCard({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: "var(--pad-panel)",
        gap: 16,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: "var(--space-4)" }}
      >
        <span
          style={{
            fontSize: "var(--type-title)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-title)",
            color: "var(--ink-primary)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          {title}
        </span>
        {count && (
          <span
            style={{
              fontSize: "var(--type-meta)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-tertiary)",
              fontVariantNumeric: "nums",
            }}
          >
            {count}
          </span>
        )}
        <div className="flex-1" />
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * PROPERTY DETAILS
 * ───────────────────────────────────────────────────────────── */

/* Three groups rather than one long grid. The reconciler looks up exactly one
 * of these at a time — a ledger id when a posting fails, square footage when a
 * valuation question lands, the accountant's name when something needs a human
 * — and grouping makes the scan a two-step instead of a fifteen-item hunt.
 *
 * The identity line lives here too. It had been a bare header floating above
 * the card, which made the page open on a title with nothing under it; the
 * address, the code, the period and the primary action are property details
 * like any other, and they belong in the container that holds the rest.
 *
 * No rules anywhere — the group dividers and column rules are gone. Grouping
 * is carried by distance instead: 24px between groups against 12px between
 * rows inside one, so the eye reads three blocks before it reads any field.
 * Rules were doing a job whitespace does better and quieter, and at fifteen
 * fields they turned a reference panel into a spreadsheet.
 *
 * No card title, either. "Property details" over a grid of property details is
 * a label describing the obvious. */
function PropertyDetailsCard({
  property,
  onStartSession,
  onOpenCurrent,
}: {
  property: PropertyRecord;
  onStartSession: () => void;
  onOpenCurrent: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: "var(--space-7) var(--pad-panel) var(--space-7)",
        gap: "var(--space-7)",
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="flex flex-row items-center shrink-0"
        style={{ width: "100%", gap: "var(--space-5)", minHeight: "var(--control-lg)" }}
      >
        <h1 className="t-display truncate" style={{ color: "var(--ink-primary)" }}>
          {property.address}
        </h1>
        <span
          className="nums shrink-0"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {property.code}
        </span>
        <StatusCTA
          state={property.state}
          period={property.period}
          onClick={onOpenCurrent}
        />
        <div className="flex-1" />
        <Button
          variant="primary"
          size="lg"
          leftIcon={<Plus size={14} strokeWidth={1.75} />}
          onClick={onStartSession}
        >
          Start a session
        </Button>
      </div>

      <div className="flex flex-col" style={{ width: "100%", gap: "var(--space-8)" }}>
        <FieldGroup
          label="Ledger identity"
          rows={[
            { label: "Legal entity", value: orUnset(property.legalEntity) },
            { label: "Property code", value: orUnset(property.code) },
            {
              label: "Ledger property ID",
              value: orUnset(property.ledgerPropertyId),
            },
            { label: "Ledger source", value: orUnset(property.ledgerSource) },
            { label: "Tax ID", value: orUnset(property.taxId) },
            {
              label: "Record status",
              value: <RecordStatusTag status={property.recordStatus} />,
            },
          ]}
        />
        <FieldGroup
          label="Asset"
          rows={[
            { label: "Market", value: orUnset(property.market) },
            { label: "Asset type", value: orUnset(property.type) },
            { label: "Units", value: orUnset(property.units || "") },
            {
              label: "Rentable area",
              value: orUnset(
                property.rentableSqFt
                  ? `${property.rentableSqFt.toLocaleString("en-US")} sq ft`
                  : ""
              ),
            },
            { label: "Year built", value: orUnset(property.yearBuilt || "") },
          ]}
        />
        <FieldGroup
          label="Ownership"
          rows={[
            { label: "Owner", value: orUnset(property.owner) },
            { label: "Portfolio", value: orUnset(property.portfolio) },
            { label: "Acquired", value: orUnset(property.acquired) },
            {
              label: "Property manager",
              value: orUnset(property.propertyManager),
            },
            { label: "Accountant", value: orUnset(property.accountant) },
            {
              label: "Ownership stake",
              value: orUnset(property.ownershipStake),
            },
          ]}
        />
      </div>
    </div>
  );
}

/* A property created in the app carries only what the form asked for. Rather
 * than print "0 sq ft" or an empty cell, the fields nobody has filled in yet
 * say so — an absent fact and a zero are different claims, and on a page a
 * reconciler consults for ledger identity the difference matters. */
function orUnset(value: string | number): React.ReactNode {
  if (value === "" || value === 0) {
    return (
      <span style={{ color: "var(--ink-tertiary)" }}>Not set</span>
    );
  }
  return `${value}`;
}

function FieldGroup({
  label,
  rows,
}: {
  label: string;
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    /* 8px binds the label to its own fields; the 24px above it separates this
     * group from the last one. The label is nearer to what it names than the
     * groups are to each other, which is the whole grouping cue.
     *
     * Three ink levels, not two: the group header is primary and medium, the
     * field labels are secondary, the values are primary. At tertiary the
     * labels were washing out against the card and the panel read as a wall of
     * values with nothing naming them. */
    <div className="flex flex-col" style={{ width: "100%", gap: "var(--space-4)" }}>
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          letterSpacing: "var(--tracking-meta)",
          fontWeight: "var(--weight-medium)",
          color: "var(--ink-primary)",
        }}
      >
        {label}
      </span>
      <div
        className="grid"
        style={{
          width: "100%",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          columnGap: "var(--space-8)",
          rowGap: "var(--space-5)",
        }}
      >
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col min-w-0" style={{ gap: 2 }}>
            <span
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-secondary)",
              }}
            >
              {r.label}
            </span>
            <span
              className="truncate"
              style={{
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-primary)",
              }}
              data-hint={typeof r.value === "string" ? r.value : undefined}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Whether the building is in the portfolio, not how its close went. It is a
 * different axis from `StatusKey`, so it passes its own label through — but it
 * borrows the same chip and the same four tones, because two tinted pills on
 * one page drawn two different ways is exactly what the pass is undoing. */
function RecordStatusTag({
  status,
}: {
  status: PropertyRecord["recordStatus"];
}) {
  const tone =
    status === "Active" ? "ok" : status === "In transition" ? "info" : "neutral";
  return <StatusChip tone={tone} label={status} showDot={false} />;
}

/* ─────────────────────────────────────────────────────────────
 * ASSOCIATED BANKS
 *
 * Full design rationale: docs/research/bank-association.md.
 * ───────────────────────────────────────────────────────────── */

type BankCardMode =
  | { kind: "normal" }
  | { kind: "adding" }
  | { kind: "editing"; id: string }
  | { kind: "removing"; id: string };

function AssociatedBanksCard({
  banks: initialBanks,
  legalEntity,
}: {
  banks: PropertyBankMapping[];
  legalEntity: string;
}) {
  /* Bank edits live here and nowhere else. The prototype has no store, so
   * associating or removing an account is a draft that lasts as long as this
   * card is mounted — and the card is keyed by property id upstream, so the
   * draft cannot leak onto a different building. The roster above stays the
   * source of truth for which properties exist; it never rewrites `banks`,
   * which is what keeps the two from contradicting each other. */
  const [banks, setBanks] = useState<PropertyBankMapping[]>(initialBanks);
  const [mode, setMode] = useState<BankCardMode>({ kind: "normal" });

  const handleSave = (next: PropertyBankMapping) => {
    if (mode.kind === "editing") {
      setBanks((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    } else if (mode.kind === "adding") {
      setBanks((prev) => [...prev, next]);
    }
    setMode({ kind: "normal" });
  };

  const busy = mode.kind !== "normal";
  /* The empty state offers this same button, so the header keeps quiet while
   * it is showing rather than printing "Associate an account" twice in one
   * card. */
  const showingEmpty = banks.length === 0 && mode.kind !== "adding";

  return (
    <DetailCard
      title="Associated accounts"
      count={`${banks.length}`}
      action={
        showingEmpty ? undefined : (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Plus size={14} strokeWidth={1.75} />}
            onClick={() => setMode({ kind: "adding" })}
            disabled={busy}
          >
            Associate an account
          </Button>
        )
      }
    >
      {showingEmpty ? (
        <EmptyBanksState onAdd={() => setMode({ kind: "adding" })} />
      ) : (
        <div className="flex flex-col" style={{ width: "100%", gap: 6 }}>
          {banks.map((b) => {
            if (mode.kind === "editing" && mode.id === b.id) {
              return (
                <BankAccountEditor
                  key={b.id}
                  initial={b}
                  siblings={banks}
                  legalEntity={legalEntity}
                  portfolioBanks={banks}
                  onSave={handleSave}
                  onCancel={() => setMode({ kind: "normal" })}
                />
              );
            }
            if (mode.kind === "removing" && mode.id === b.id) {
              return (
                <BankRowDeleteConfirm
                  key={b.id}
                  bank={b}
                  onCancel={() => setMode({ kind: "normal" })}
                  onConfirm={() => {
                    setBanks((prev) => prev.filter((x) => x.id !== b.id));
                    setMode({ kind: "normal" });
                  }}
                />
              );
            }
            return (
              <BankAccountRow
                key={b.id}
                bank={b}
                legalEntity={legalEntity}
                onEdit={() => setMode({ kind: "editing", id: b.id })}
                onRemove={() => setMode({ kind: "removing", id: b.id })}
                blocked={busy}
              />
            );
          })}
          {mode.kind === "adding" && (
            <BankAccountEditor
              siblings={banks}
              legalEntity={legalEntity}
              portfolioBanks={banks}
              onSave={handleSave}
              onCancel={() => setMode({ kind: "normal" })}
            />
          )}
        </div>
      )}
    </DetailCard>
  );
}

/* Institution tile — logo where we have one, monogram everywhere else. The
 * monogram is the default case, not the error case: we have three logo assets
 * and the directory has thousands of institutions. */
function InstitutionTile({
  logoSrc,
  shortName,
  routing,
  size = 32,
}: {
  logoSrc?: string;
  shortName: string;
  routing: string;
  size?: number;
}) {
  if (logoSrc) {
    return (
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-control)",
          background: "#FFFFFF",
          border: "1px solid var(--line-menu)",
        }}
      >
        <Image
          src={logoSrc}
          alt=""
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          style={{ objectFit: "contain" }}
        />
      </span>
    );
  }
  const { initials, bg, fg } = monogramFor({ shortName, routing });
  /* 11px is the floor for type anywhere in the app, so the small tile does not
   * shrink the letters to fit two of them — it shows one. A single initial at a
   * legible size beats two at a size nobody can read. */
  const glyph = size >= 32 ? initials : initials.slice(0, 1);
  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-control)",
        background: bg,
        border: "1px solid var(--line-menu)",
        color: fg,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        letterSpacing: "var(--tracking-meta)",
        fontWeight: "var(--weight-medium)",
      }}
    >
      {glyph}
    </span>
  );
}

function BankAccountRow({
  bank,
  legalEntity,
  onEdit,
  onRemove,
  blocked,
}: {
  bank: PropertyBankMapping;
  legalEntity: string;
  onEdit: () => void;
  onRemove: () => void;
  blocked: boolean;
}) {
  const [hover, setHover] = useState(false);
  /* The two row actions used to be revealed by hover alone, with
   * `pointerEvents: none` while hidden — which put Edit and Remove out of reach
   * of anyone working from the keyboard entirely. Focus reveals them too, and
   * because focus moves INTO the row, the reveal has to be tracked on the row
   * rather than on either button. */
  const [focusWithin, setFocusWithin] = useState(false);
  const revealed = hover || focusWithin;
  const heldElsewhere =
    !!bank.accountHolder && bank.accountHolder !== legalEntity;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocusWithin(false);
        }
      }}
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      <InstitutionTile
        logoSrc={bank.logoSrc}
        shortName={bank.shortName}
        routing={bank.bankId}
      />
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ gap: "var(--space-2)" }}
      >
        <div
          className="flex flex-row items-center"
          style={{ gap: "var(--space-4)" }}
        >
          <span
            className="truncate"
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
            }}
            data-hint={bank.name}
          >
            {bank.shortName}
          </span>
          <TypePill label={bank.type} />
          {heldElsewhere && (
            <span
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
              }}
              data-hint={`Held by ${bank.accountHolder}`}
            >
              held by {bank.accountHolder}
            </span>
          )}
        </div>
        <div
          className="flex flex-row items-center"
          style={{ gap: "var(--space-4)", fontVariantNumeric: "nums" }}
        >
          <span
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-ui)",
              color: "var(--ink-primary)",
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {bank.account}
          </span>
          <Sep />
          <span style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-ui)", color: "var(--ink-secondary)" }}>
            GL {bank.gl}
          </span>
          <Sep />
          <span style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-ui)", color: "var(--ink-tertiary)" }}>
            Routing {bank.bankId}
          </span>
        </div>
      </div>
      <div
        className="flex flex-row items-center"
        style={{
          gap: "var(--space-1)",
          opacity: revealed && !blocked ? 1 : 0,
          transition: "opacity 140ms ease",
          pointerEvents: revealed && !blocked ? "auto" : "none",
        }}
      >
        <RowIconButton label="Edit this account" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} />
        </RowIconButton>
        <RowIconButton label="Remove this account" onClick={onRemove} danger>
          <Trash2 size={14} strokeWidth={1.75} />
        </RowIconButton>
      </div>
    </div>
  );
}

function RowIconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        background: hover
          ? danger
            ? "var(--status-danger-bg)"
            : "var(--surface-control)"
          : "transparent",
        border: hover
          ? `1px solid ${danger ? "var(--chip-failed-border)" : "#FFFFFF"}`
          : "1px solid transparent",
        borderRadius: 999,
        color: danger && hover ? "var(--status-danger-ink)" : "var(--ink-secondary)",
        cursor: "pointer",
        transition: "background 120ms, color 120ms, border-color 120ms",
      }}
      aria-label={label}
      data-hint={label}
    >
      {children}
    </button>
  );
}

function TypePill({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        background: "var(--surface-control)",
        border: "1px solid #FFFFFF",
        boxShadow: "var(--shadow-chip)",
        borderRadius: 999,
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: "var(--ink-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* `QuietButton` lived here: a square-cornered copy of `ui/Button`'s secondary
 * variant, identical in height, fill, border and shadow, differing only in
 * radius — and it shared screens with the real pill. Its seven call sites now
 * take `ui/Button variant="secondary" size="md"`. */

/* ── Bank account editor ──────────────────────────────────────
 *
 * Replaces the three-brand radio. One combobox that accepts either shape the
 * user has in hand — a bank name, or the nine digits printed on the statement
 * in front of them — resolving both to the same directory record. Routing
 * numbers are checksum-validated on the way in, so a transposed digit is caught
 * here rather than surfacing as an unmatched statement next month.
 * ───────────────────────────────────────────────────────────── */

function BankAccountEditor({
  initial,
  siblings,
  legalEntity,
  portfolioBanks,
  onSave,
  onCancel,
}: {
  initial?: PropertyBankMapping;
  siblings: PropertyBankMapping[];
  legalEntity: string;
  portfolioBanks: PropertyBankMapping[];
  onSave: (b: PropertyBankMapping) => void;
  onCancel: () => void;
}) {
  const [institution, setInstitution] = useState<Institution | null>(() =>
    initial
      ? lookupByRouting(initial.bankId) ?? {
          routing: initial.bankId,
          name: initial.name,
          shortName: initial.shortName,
          city: "",
          state: "",
          kind: "bank" as const,
          logoSrc: initial.logoSrc || undefined,
        }
      : null
  );
  const [purpose, setPurpose] = useState(initial?.type ?? "Operating");
  const [last4, setLast4] = useState(
    initial ? initial.account.replace(/\D/g, "").slice(-4) : ""
  );
  const [gl, setGl] = useState(initial?.gl ?? "");
  const [holder, setHolder] = useState(initial?.accountHolder ?? "");
  const [touched, setTouched] = useState(false);
  /* The last-four field is a composed shell, so its ring lives on the wrapper
   * rather than on the bare input. See `focusRing`. */
  const [last4Focused, setLast4Focused] = useState(false);

  const others = siblings.filter((b) => b.id !== initial?.id);

  /* Uniqueness is checked per property, not globally: two accounts at the same
   * bank ending in the same four digits is a typo, and two accounts posting to
   * one GL line makes the reconciliation ambiguous by construction. */
  const last4Dup =
    last4.length === 4 &&
    others.some(
      (b) =>
        b.bankId === institution?.routing &&
        b.account.replace(/\D/g, "").slice(-4) === last4
    );
  const glDup =
    gl.trim().length > 0 &&
    others.some((b) => b.gl.toLowerCase() === gl.trim().toLowerCase());

  const last4Error =
    last4.length > 0 && last4.length < 4
      ? "Enter all four digits."
      : last4Dup
      ? "Already used at this bank."
      : null;
  const glError = glDup ? "Another account posts here." : null;

  const valid =
    !!institution &&
    purpose.trim().length > 0 &&
    last4.length === 4 &&
    gl.trim().length > 0 &&
    !last4Dup &&
    !glDup;

  const submit = () => {
    setTouched(true);
    if (!valid || !institution) return;
    onSave({
      id:
        initial?.id ??
        `bm-${institution.routing}-${last4}-${purpose
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
      name: institution.name,
      shortName: institution.shortName,
      logoSrc: institution.logoSrc ?? "",
      bankId: institution.routing,
      type: purpose.trim(),
      account: `******${last4}`,
      gl: gl.trim(),
      accountHolder: holder.trim() || undefined,
    });
  };

  /* Every field is present from the first frame, dimmed until a bank resolves,
   * rather than appearing once one does. Progressive disclosure was costing a
   * ~90px jump in the middle of the page — and the user is better off seeing
   * the whole ask up front on a form this short. */
  const locked = !institution;

  return (
    <div
      className="flex flex-col glass"
      style={{
        width: "100%",
        padding: "var(--space-6)",
        gap: "var(--space-5)",
        borderRadius: "var(--radius-sheet)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <InstitutionPicker
        value={institution}
        onChange={setInstitution}
        portfolioBanks={portfolioBanks}
      />

      <div
        className="grid"
        style={{
          width: "100%",
          gridTemplateColumns:
            "minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,1.2fr) minmax(0,1.3fr)",
          columnGap: "var(--space-5)",
          opacity: locked ? 0.4 : 1,
          pointerEvents: locked ? "none" : "auto",
          transition: "opacity 140ms ease",
        }}
        aria-hidden={locked}
      >
        <EditorField label="Purpose" hint="What it's for">
          <FieldSelect
            value={purpose}
            onChange={setPurpose}
            options={ACCOUNT_PURPOSES as readonly string[]}
          />
        </EditorField>

        <EditorField
          label="Account"
          hint="Last four digits"
          error={touched || last4.length > 0 ? last4Error : null}
        >
          <div
            className="flex flex-row items-center"
            style={{ ...fieldShellStyle, gap: 6, ...focusRing(last4Focused) }}
          >
            <span
              aria-hidden
              style={{
                fontSize: "var(--type-body)",
                color: "var(--ink-tertiary)",
                letterSpacing: "0.1em",
              }}
            >
              ••••
            </span>
            <input
              value={last4}
              inputMode="numeric"
              maxLength={4}
              placeholder="3421"
              aria-label="Last four digits of the account number"
              onFocus={() => setLast4Focused(true)}
              onBlur={() => setLast4Focused(false)}
              onChange={(e) =>
                setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
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
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.08em",
              }}
            />
          </div>
        </EditorField>

        <EditorField
          label="GL cash account"
          hint="Where activity posts"
          error={touched || gl.length > 0 ? glError : null}
        >
          <input
            value={gl}
            placeholder="1010 · Operating Cash"
            onChange={(e) => setGl(e.target.value)}
            style={fieldInputStyle}
          />
        </EditorField>

        <EditorField label="Account holder" hint="Optional">
          <input
            value={holder}
            placeholder={legalEntity}
            onChange={(e) => setHolder(e.target.value)}
            style={fieldInputStyle}
          />
        </EditorField>
      </div>

      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: "var(--space-4)" }}
      >
        <span
          className="flex flex-row items-center truncate"
          style={{
            gap: "var(--space-3)",
            minHeight: "var(--control-md)",
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: locked ? "var(--ink-tertiary)" : "var(--status-danger-ink)",
          }}
        >
          {locked ? (
            "Start by finding the bank."
          ) : !valid && touched ? (
            <>
              <CircleAlert size={14} strokeWidth={1.75} />
              Purpose, last four digits and a GL account are all required.
            </>
          ) : null}
        </span>
        <div className="flex-1" />
        <Button variant="secondary" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={submit}
          disabled={locked}
          leftIcon={<Check size={14} strokeWidth={1.75} />}
        >
          {initial ? "Save changes" : "Associate account"}
        </Button>
      </div>
    </div>
  );
}

/* The shell every form control in this editor wears, so a plain input, a
 * composed field (the •••• prefix) and a select all present the same box. */
const fieldShellStyle: React.CSSProperties = {
  width: "100%",
  height: "var(--control-lg)",
  padding: "0 10px",
  background: "var(--surface-input)",
  border: "1px solid var(--line-inner-white)",
  borderRadius: "var(--radius-control)",
};

/* No `outline: none` here. These inputs ARE the field box, so the app's one
 * focus recipe — the 2px ring in globals.css — lands exactly where it should.
 * Setting it inline beat the stylesheet and left every field in this editor
 * with no focus indicator at all. */
const fieldInputStyle: React.CSSProperties = {
  ...fieldShellStyle,
  fontFamily: "inherit",
  fontSize: "var(--type-body)",
  lineHeight: "var(--leading-ui)",
  color: "var(--ink-primary)",
};

/* A composed field — a search shell, or the •••• prefix box — is a bare input
 * inside a bordered div. The ring belongs on the div: drawn on the input it
 * would circle the text run alone, inside the box, and collide with the icon
 * and the clear button either side of it. Same 2px accent and 2px offset as
 * the global rule, so a composed field and a plain one focus identically.
 *
 * It has to be React state rather than :focus-within because every surface
 * here is styled inline. */
const focusRing = (on: boolean): React.CSSProperties =>
  on ? { outline: "2px solid var(--dot-active)", outlineOffset: 2 } : {};

/* Native select, restyled to the shell above. Native because it is a short,
 * closed list inside a form: it keeps the platform's keyboard and screen-reader
 * behaviour, and its menu floats rather than reflowing the editor. */
function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="relative" style={{ width: "100%" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...fieldInputStyle,
          appearance: "none",
          WebkitAppearance: "none",
          paddingRight: 28,
          cursor: "pointer",
        }}
      >
        {options.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="absolute flex items-center"
        style={{
          right: 8,
          top: 0,
          bottom: 0,
          color: "var(--ink-tertiary)",
          pointerEvents: "none",
        }}
      >
        <ChevronDown size={14} strokeWidth={1.75} />
      </span>
    </div>
  );
}

/* Label, control, and a single fixed-height caption slot beneath. The caption
 * carries the hint until there is an error, then the error — one row either
 * way, so validating a field never nudges the row below it. */
function EditorField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-0" style={{ gap: "var(--space-3)" }}>
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-secondary)",
        }}
      >
        {label}
      </span>
      {children}
      <span
        className="truncate"
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: error ? "var(--status-danger-ink)" : "var(--ink-tertiary)",
          height: 14,
        }}
        data-hint={error ?? hint ?? undefined}
      >
        {error ?? hint ?? ""}
      </span>
    </div>
  );
}

/* Institution picker — one field, two entry paths.
 *   • text     → fuzzy match on legal name, short name, and city (city is what
 *                separates the dozen institutions called "First National Bank")
 *   • 9 digits → resolve directly, with the ABA checksum gating the result
 * When the field is empty it offers the banks already used elsewhere in this
 * portfolio, which is the honest version of a "popular banks" row: derived from
 * this customer's data rather than hardcoded to three brands.
 *
 * Results render in a floating panel, not inline. Inline, every keystroke
 * resized the editor and shoved the two cards below it up and down the page —
 * the list is transient, so it has no business occupying layout space. The
 * resolved-bank confirmation is deliberately the same height as the search
 * input it replaces, so picking a bank doesn't move anything either. */
function InstitutionPicker({
  value,
  onChange,
  portfolioBanks,
}: {
  value: Institution | null;
  onChange: (i: Institution | null) => void;
  portfolioBanks: PropertyBankMapping[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /* Composed shell, so the ring goes on the wrapper. See `focusRing`. */
  const [focused, setFocused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  /* Outside click and Escape, both — a floating panel that only one of the two
   * dismisses is a trap for anyone working from the keyboard. Escape stops here
   * rather than bubbling, so closing the results does not also cancel the
   * editor the picker sits in. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const suggested = useMemo(() => {
    const seen = new Set<string>();
    const out: Institution[] = [];
    for (const b of portfolioBanks) {
      if (seen.has(b.bankId)) continue;
      seen.add(b.bankId);
      const inst = lookupByRouting(b.bankId);
      if (inst) out.push(inst);
    }
    return out.slice(0, 5);
  }, [portfolioBanks]);

  const digitsOnly = /^[\d\s-]+$/.test(query.trim()) && query.trim().length > 0;
  const digits = query.replace(/\D/g, "");
  const results = useMemo(() => searchInstitutions(query), [query]);

  /* Nine digits that pass the checksum but aren't in our slice of the directory
   * is a real outcome, not an error — the FedACH file has thousands of entries
   * we don't carry. Offer the manual path rather than a dead end. */
  const unknownButValid =
    digitsOnly &&
    digits.length === 9 &&
    isValidRouting(digits) &&
    results.length === 0;
  const badChecksum = digitsOnly && digits.length === 9 && !isValidRouting(digits);

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-3)" }} ref={wrap}>
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-secondary)",
        }}
      >
        Bank
      </span>

      <div className="relative" style={{ width: "100%" }}>
        {value ? (
          /* Resolved institution reads as a confirmation, not an editable
           * field. The user's job here is to recognise the name, not
           * transcribe it. */
          <div
            className="flex flex-row items-center"
            style={{
              ...fieldShellStyle,
              padding: "0 4px 0 6px",
              gap: "var(--space-4)",
              background: "var(--surface-control)",
              border: "1px solid #FFFFFF",
            }}
          >
            <InstitutionTile
              logoSrc={value.logoSrc}
              shortName={value.shortName}
              routing={value.routing}
              size={24}
            />
            <span
              className="truncate"
              style={{
                fontSize: "var(--type-body)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-primary)",
              }}
            >
              {value.name}
            </span>
            <Sep />
            <span
              className="nums shrink-0"
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                color: "var(--ink-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {value.city ? `${value.city}, ${value.state} · ` : ""}
              {value.routing}
            </span>
            <div className="flex-1" />
            <RowIconButton
              label="Choose a different bank"
              onClick={() => {
                onChange(null);
                setQuery("");
                setOpen(true);
              }}
            >
              <X size={14} strokeWidth={1.75} />
            </RowIconButton>
          </div>
        ) : (
          <div
            className="flex flex-row items-center"
            style={{
              ...fieldShellStyle,
              gap: "var(--space-4)",
              ...focusRing(focused),
            }}
          >
            <Search size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
            <input
              autoFocus
              value={query}
              onFocus={() => {
                setOpen(true);
                setFocused(true);
              }}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Search by bank name or routing number"
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
            {digitsOnly && digits.length > 0 && (
              <span
                className="nums"
                style={{
                  fontSize: "var(--type-meta)",
                  lineHeight: "var(--leading-ui)",
                  color:
                    digits.length === 9 && !badChecksum
                      ? "var(--status-ok-ink)"
                      : "var(--ink-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                {digits.length}/9
              </span>
            )}
          </div>
        )}

        {open && !value && (
          <div
            className="absolute flex flex-col scroll-thin glass"
            style={{
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              maxHeight: 264,
              overflowY: "auto",
              padding: 4,
              gap: 2,
              borderRadius: "var(--radius-sheet)",
              zIndex: 30,
            }}
          >
            {query.trim().length === 0 && suggested.length > 0 && (
              <>
                <span
                  style={{
                    fontSize: "var(--type-meta)",
                    lineHeight: "var(--leading-ui)",
                    color: "var(--ink-tertiary)",
                    padding: "4px 8px 2px",
                  }}
                >
                  Already used in this portfolio
                </span>
                {suggested.map((i) => (
                  <InstitutionOption
                    key={i.routing}
                    inst={i}
                    onPick={() => onChange(i)}
                  />
                ))}
              </>
            )}

            {query.trim().length > 0 &&
              results.map((i) => (
                <InstitutionOption
                  key={i.routing}
                  inst={i}
                  onPick={() => onChange(i)}
                />
              ))}

            {badChecksum && (
              <PickerNote tone="error">
                That isn&rsquo;t a valid routing number. The check digit
                doesn&rsquo;t line up, so look for a transposed pair.
              </PickerNote>
            )}

            {unknownButValid && (
              <div className="flex flex-col" style={{ gap: 6, padding: "0 4px 4px" }}>
                <PickerNote tone="neutral">
                  Valid routing number, but this institution isn&rsquo;t in our
                  directory yet.
                </PickerNote>
                <ManualInstitutionEntry
                  routing={digits}
                  onConfirm={(name) =>
                    onChange({
                      routing: digits,
                      name,
                      shortName: name.split(",")[0].slice(0, 24),
                      city: "",
                      state: "",
                      kind: "bank",
                    })
                  }
                />
              </div>
            )}

            {query.trim().length > 0 &&
              results.length === 0 &&
              !unknownButValid &&
              !badChecksum && (
                <PickerNote tone="neutral">
                  No match. Try the nine-digit routing number from the
                  statement: it&rsquo;s the one identifier every bank agrees on.
                </PickerNote>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function InstitutionOption({
  inst,
  onPick,
}: {
  inst: Institution;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center text-left shrink-0"
      style={{
        width: "100%",
        /* --row-md. 34 was a one-off outside both the row scale (28/32/44) and
         * the control scale, and it is a single-line list row like any other. */
        height: "var(--row-md)",
        padding: "0 8px",
        gap: "var(--space-4)",
        /* Translucent white, not the opaque row token: this row sits on a glass
         * sheet, and an opaque hover on a translucent surface reads as a
         * rendering fault rather than as feedback. Same 0.72 as `MenuOption`,
         * because the two are the same object on two different sheets. */
        background: hover ? "rgba(255, 255, 255, 0.72)" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <InstitutionTile
        logoSrc={inst.logoSrc}
        shortName={inst.shortName}
        routing={inst.routing}
        size={24}
      />
      <span
        className="truncate"
        style={{
          fontSize: "var(--type-body)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-primary)",
        }}
      >
        {inst.name}
      </span>
      <div className="flex-1" />
      <span
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
          whiteSpace: "nowrap",
        }}
      >
        {inst.city}, {inst.state}
      </span>
      <span
        className="nums"
        style={{
          fontSize: "var(--type-meta)",
          lineHeight: "var(--leading-ui)",
          color: "var(--ink-tertiary)",
          whiteSpace: "nowrap",
        }}
      >
        {inst.routing}
      </span>
    </button>
  );
}

function PickerNote({
  tone,
  children,
}: {
  tone: "error" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className="flex flex-row items-start shrink-0"
      style={{
        gap: "var(--space-3)",
        padding: "6px 8px",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color:
          tone === "error" ? "var(--status-danger-ink)" : "var(--ink-tertiary)",
      }}
    >
      <CircleAlert
        size={14}
        strokeWidth={1.75}
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      <span>{children}</span>
    </span>
  );
}

function ManualInstitutionEntry({
  routing,
  onConfirm,
}: {
  routing: string;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-row items-center" style={{ gap: "var(--space-4)" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Name of the bank at ${routing}`}
        style={{ ...fieldInputStyle, flex: 1, minWidth: 0 }}
      />
      <Button
        variant="secondary"
        size="md"
        onClick={() => name.trim() && onConfirm(name.trim())}
        disabled={name.trim().length === 0}
      >
        Use this bank
      </Button>
    </div>
  );
}

function BankRowDeleteConfirm({
  bank,
  onCancel,
  onConfirm,
}: {
  bank: PropertyBankMapping;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "var(--space-4) var(--space-5)",
        gap: "var(--space-5)",
        background: "var(--status-danger-bg)",
        border: "1px solid var(--chip-failed-border)",
        borderRadius: "var(--radius-sheet)",
      }}
    >
      <InstitutionTile
        logoSrc={bank.logoSrc}
        shortName={bank.shortName}
        routing={bank.bankId}
        size={24}
      />
      <div
        className="flex flex-col min-w-0 flex-1"
        style={{ gap: "var(--space-1)" }}
      >
        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          Remove {bank.shortName} {bank.account}?
        </span>
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          Future sessions stop expecting a statement for GL {bank.gl}. Past
          sessions keep what they reconciled.
        </span>
      </div>
      <Button variant="secondary" size="md" onClick={onCancel}>
        Keep it
      </Button>
      {/* Destructive, so it keeps a red fill — but the fill is now the danger
        * mark and the geometry is `ui/Button`'s, not a square one-off. The
        * pair's ink is too dark against its own mark to be a label, so it
        * carries the edge and the label takes the on-primary ink. */}
      <Button
        variant="primary"
        size="md"
        onClick={onConfirm}
        leftIcon={<Trash2 size={14} strokeWidth={1.75} />}
        style={{
          background: "var(--status-danger)",
          border: "1px solid var(--status-danger-ink)",
          color: "var(--action-on-primary)",
        }}
      >
        Remove
      </Button>
    </div>
  );
}

function EmptyBanksState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "var(--space-7) var(--space-6)",
        gap: "var(--space-5)",
        background: "var(--surface-control)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sheet)",
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-control)",
          background: "#FFFFFF",
          border: "1px solid var(--line-menu)",
        }}
      >
        <Landmark size={16} strokeWidth={1.5} color="var(--ink-tertiary)" />
      </span>
      <div
        className="flex flex-col min-w-0 flex-1"
        style={{ gap: "var(--space-1)" }}
      >
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          No accounts associated yet
        </span>
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          Reconciliation needs at least one. An account tells us which
          statements belong to this property and which GL line they post to.
        </span>
      </div>
      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus size={14} strokeWidth={1.75} />}
        onClick={onAdd}
      >
        Associate an account
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * SESSION HISTORY
 *
 * Was a three-word row per session — cycle, dot, status label — which answered
 * "did we run it" and nothing else. A close is audited months later, so the
 * history has to carry the outcome: how much was reconciled, what was left
 * behind, who ran it, and when it landed.
 *
 * Same table primitives as the roster and the Dashboard: label-only column
 * headers, .list-row hairlines, a 40px pitch, right-aligned tabular figures,
 * em-rule for nothing-to-see. The bare status dot in its own column is gone:
 * it and the status column said the same thing twice. What survives is one
 * `StatusChip`, which always carries the word — a colour alone can't
 * distinguish "Review" from "Not started" for anyone reading without colour
 * vision, so the mark rides with the label rather than replacing it.
 *
 * Rows open the session they describe, and a failed one carries its reason on
 * a second line. Headers sort.
 * ───────────────────────────────────────────────────────────── */

/* Two zones, not eight alternating ones. The old grid ran left, left, right,
 * right, right, right, left, right — the eye had to re-find the alignment on
 * almost every column, which is what read as mess. Now: three left-aligned text
 * columns that say *which run this was*, then every figure right-aligned in one
 * block that says *how it went*. Records folded into Matched as a ratio, the
 * Dashboard's "3 / 4" idiom, which drops a column and buys the rest room. */
/* These came down with the header glyphs too, but not as far as the roster's:
 * every column here sorts, so each fixed one still has to hold its label plus
 * the 20px the direction chevron occupies when that column is the active one.
 * Sized to that rather than to the label alone, the mark has somewhere to go
 * and the label never has to truncate to make room for it. */
const SESSION_GRID =
  "minmax(120px, 1.1fr) 88px minmax(96px, 1fr) 68px 52px 80px 68px 14px";

/* Which column the history is ordered by. `cycle` descending is the seeded
 * order — newest run first — so the table opens already telling the truth about
 * its own sort rather than showing an unmarked order the header can't explain. */
type SessionSortKey =
  | "cycle"
  | "status"
  | "ranBy"
  | "matched"
  | "open"
  | "exceptions"
  | "finished";

type SessionSort = { key: SessionSortKey; dir: "asc" | "desc" };

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/* Cycles are "May 2026", which sorts alphabetically into nonsense. Rank them
 * the way the seed does: year first, then month index. */
function cycleRank(cycle: string): number {
  const [mon, year] = cycle.split(" ");
  return Number(year) * 12 + MONTHS.indexOf(mon);
}

/* Triage order, matching the nav's: what needs a person first. Sorting Status
 * alphabetically would put "Completed" above "Failed", which is the opposite of
 * what anyone opening this column wants. */
const STATUS_RANK: Record<PropertyState, number> = {
  failed: 0,
  review: 1,
  active: 2,
  "not-started": 3,
  completed: 4,
};

/* A run still going has no finish date, so it sorts as the most recent thing
 * that could have happened rather than falling to the bottom as a blank. */
function finishedRank(session: PropertySession): number {
  if (session.finishedOn === "In progress") return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(session.finishedOn);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareSessions(
  a: PropertySession,
  b: PropertySession,
  key: SessionSortKey
): number {
  switch (key) {
    case "cycle":
      return cycleRank(a.cycle) - cycleRank(b.cycle);
    case "status":
      return STATUS_RANK[b.statusKey] - STATUS_RANK[a.statusKey];
    case "ranBy":
      return a.ranBy.localeCompare(b.ranBy);
    case "matched":
      return a.matched - b.matched;
    case "open":
      return a.openItems - b.openItems;
    case "exceptions":
      return a.exceptions - b.exceptions;
    case "finished":
      return finishedRank(a) - finishedRank(b);
  }
}

function SessionHistoryCard({
  sessions,
  onStartSession,
  onOpenSession,
}: {
  sessions: PropertySession[];
  onStartSession: () => void;
  onOpenSession: (sessionId: string) => void;
}) {
  /* Six is roughly two quarters — enough to see the pattern without the card
   * taking over the page. Everything older stays one click away, and the click
   * goes both ways: a one-way "show more" leaves the reader stuck with a card
   * that has quietly taken over the page after all. */
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<SessionSort>({ key: "cycle", dir: "desc" });

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return sessions
      .slice()
      .sort((a, b) => compareSessions(a, b, sort.key) * dir);
  }, [sessions, sort]);

  const visible = expanded ? sorted : sorted.slice(0, 6);
  const hidden = sorted.length - visible.length;

  /* Click a header to sort by it; click the same header again to reverse.
   * Text columns open ascending (A first), figures and dates open descending
   * (the biggest and the newest first), because that is what the reader is
   * looking for in each case. */
  const toggleSort = (key: SessionSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "ranBy" || key === "status" ? "asc" : "desc",
          }
    );

  return (
    <DetailCard
      title="Sessions"
      count={sessions.length > 0 ? `${sessions.length}` : undefined}
      /* The empty state carries this exact button, so offering it in the card
       * header as well put two identical "Start a session" controls forty
       * pixels apart — on a page whose own header already has a third. The
       * header action returns as soon as there is history for it to sit
       * beside. */
      action={
        sessions.length > 0 ? (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Plus size={14} strokeWidth={1.75} />}
            onClick={onStartSession}
          >
            Start a session
          </Button>
        ) : undefined
      }
    >
      {sessions.length === 0 ? (
        <EmptySessionsState onStartSession={onStartSession} />
      ) : (
        <div
          className="flex flex-col"
          style={{
            width: "100%",
            background: "var(--surface-list)",
            borderRadius: "var(--radius-sheet)",
            boxShadow: "var(--shadow-depth-1)",
            overflow: "hidden",
            padding: 4,
            ...({ "--list-inset": "8px" } as React.CSSProperties),
          }}
        >
          <SessionHeaderRow sort={sort} onSort={toggleSort} />
          {visible.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onOpen={() => onOpenSession(s.id)}
            />
          ))}
          {(hidden > 0 || expanded) && (
            <ShowMoreRow
              expanded={expanded}
              hidden={hidden}
              onToggle={() => setExpanded((e) => !e)}
            />
          )}
        </div>
      )}
    </DetailCard>
  );
}

function SessionHeaderRow({
  sort,
  onSort,
}: {
  sort: SessionSort;
  onSort: (key: SessionSortKey) => void;
}) {
  const cell: React.CSSProperties = {
    fontSize: "var(--type-meta)",
    lineHeight: "var(--leading-ui)",
    fontWeight: "var(--weight-medium)",
    letterSpacing: "var(--tracking-meta)",
    color: "var(--ink-tertiary)",
    whiteSpace: "nowrap",
  };
  const head = (key: SessionSortKey) => ({
    style: cell,
    active: sort.key === key,
    dir: sort.dir,
    onSort: () => onSort(key),
  });

  return (
    <div
      className="list-row grid items-center shrink-0"
      style={{
        width: "100%",
        gridTemplateColumns: SESSION_GRID,
        columnGap: "var(--space-5)",
        padding: "var(--space-4) 8px",
        /* Same box as a row, which carries a 1px transparent border for its
         * hover lift — otherwise each sorting header sits a pixel off the
         * figures underneath it. */
        border: "1px solid transparent",
      }}
    >
      <SortHeaderCell {...head("cycle")} label="Cycle" />
      <SortHeaderCell {...head("status")} label="Status" />
      <SortHeaderCell {...head("ranBy")} label="Run by" />
      <SortHeaderCell {...head("matched")} label="Matched" trailing />
      <SortHeaderCell {...head("open")} label="Open" trailing />
      <SortHeaderCell {...head("exceptions")} label="Exceptions" trailing />
      <SortHeaderCell {...head("finished")} label="Finished" trailing />
      <span />
    </div>
  );
}

/* The direction chevron is the only glyph a header wears. The column icons that
 * used to sit in this slot are gone — they decorated a label that already named
 * the column — but the chevron stays, because it is not decoration: it is the
 * only thing on screen saying which column the table is sorted by and which way.
 * It appears on the active column alone, which is the whole affordance.
 *
 * It sits on the side AWAY from the column's alignment edge: after the label on
 * a left-aligned column, before it on a right-aligned one. That is what stops
 * the label moving when the mark appears. Put it on the alignment side instead
 * and every click on a header nudges its own label 20px sideways — which reads
 * as the table twitching rather than as a sort taking effect. The column widths
 * above already reserve the space it grows into, so nothing truncates either. */
function SortHeaderCell({
  style,
  label,
  trailing,
  active,
  dir,
  onSort,
}: {
  style: React.CSSProperties;
  label: string;
  trailing?: boolean;
  active: boolean;
  dir: "asc" | "desc";
  onSort: () => void;
}) {
  const mark = active ? (
    dir === "asc" ? (
      <ChevronUp size={14} strokeWidth={1.75} color="var(--ink-secondary)" />
    ) : (
      <ChevronDown size={14} strokeWidth={1.75} color="var(--ink-secondary)" />
    )
  ) : null;

  return (
    <button
      type="button"
      onClick={onSort}
      aria-label={`Sort by ${label}`}
      className={`flex flex-row items-center truncate ${
        trailing ? "justify-end" : ""
      }`}
      style={{
        ...style,
        gap: "var(--space-3)",
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        color: active ? "var(--ink-secondary)" : style.color,
      }}
    >
      {trailing && mark && (
        <span className="shrink-0 inline-flex" aria-hidden>
          {mark}
        </span>
      )}
      <span className="truncate">{label}</span>
      {!trailing && mark && (
        <span className="shrink-0 inline-flex" aria-hidden>
          {mark}
        </span>
      )}
    </button>
  );
}

function SessionRow({
  session,
  onOpen,
}: {
  session: PropertySession;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inProgress = session.finishedOn === "In progress";
  /* An aborted run reconciled nothing, so "0 / 204" would read as a bad result
   * rather than a run that never got going. Show the record count on its own
   * and let the status carry the rest. */
  const aborted = session.statusKey === "failed" && session.matched === 0;
  const fullyMatched = aborted || session.matched === session.records;

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${session.label} · ${session.statusLabel}, ${session.matched} of ${session.records} matched.${
        session.note ? ` ${session.note}.` : ""
      } Open session.`}
      className="list-row flex flex-col text-left shrink-0"
      style={{
        width: "100%",
        padding: "0 8px",
        background: hover ? "#FFFFFF" : "transparent",
        border: hover
          ? "1px solid var(--line-row-hover)"
          : "1px solid transparent",
        boxShadow: hover ? "var(--shadow-chip)" : "none",
        borderRadius: "var(--radius-row)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <span
        className="grid items-center"
        style={{
          width: "100%",
          gridTemplateColumns: SESSION_GRID,
          columnGap: "var(--space-5)",
          height: 40,
        }}
      >
        {/* One label, built in the seed. A re-run already reads "May 2026 ·
          * Re-run" there, so the row does not reassemble it from a cycle and a
          * pass and risk spelling it a third way. */}
        <span
          className="nums truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            fontWeight: "var(--weight-medium)",
            color: "var(--ink-primary)",
          }}
        >
          {session.label}
        </span>

        <span className="flex flex-row items-center min-w-0">
          <StatusChip status={session.statusKey} />
        </span>

        <span
          className="truncate"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-tertiary)",
          }}
        >
          {session.ranBy}
        </span>

        {/* "196 / 204" carries the volume and the outcome in one cell, so Records
          * doesn't need a column of its own. A fully matched run drops to muted
          * ink, which leaves the short ones as the only thing that catches. */}
        <Figure
          value={
            fullyMatched
              ? `${session.records}`
              : `${session.matched} / ${session.records}`
          }
          tone={fullyMatched ? "muted" : undefined}
        />

        <Figure
          value={session.openItems === 0 ? "—" : session.openItems}
          tone={session.openItems === 0 ? "muted" : "alert"}
        />
        <Figure
          value={session.exceptions === 0 ? "—" : session.exceptions}
          tone={session.exceptions === 0 ? "muted" : "alert"}
        />

        {/* A run still going reports how long it has been going; a finished one
          * reports the date it landed, with the duration on hover. */}
        <span
          className="nums"
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: inProgress ? "var(--status-info-ink)" : "var(--ink-tertiary)",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
          data-hint={
            inProgress ? `Running for ${session.duration}` : `Took ${session.duration}`
          }
        >
          {inProgress ? session.duration : session.finishedOn}
        </span>

        <span className="row-chevron inline-flex shrink-0" aria-hidden>
          <ChevronRight size={14} strokeWidth={1.75} color="var(--ink-tertiary)" />
        </span>
      </span>

      {/* Why it failed, on the row that failed. "Failed" on its own sends the
        * reader into the session to find out something the history already
        * knows, and a run's cause of death is the single most useful thing a
        * close audit months later is looking for. Full width, because a reason
        * is a sentence and the Cycle column is 120px. */}
      {session.note && (
        <span
          className="flex flex-row items-start"
          style={{
            width: "100%",
            gap: "var(--space-3)",
            padding: "0 0 var(--space-4)",
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--status-danger-ink)",
          }}
        >
          <TriangleAlert
            size={14}
            strokeWidth={1.75}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span>{session.note}</span>
        </span>
      )}
    </button>
  );
}

/* The history's footer. A row, so it takes --row-md like every other one — it
 * was a 34px one-off, off both the row and the control scales. The ink lifts on
 * hover because it is the one control in the sheet that never lifts its fill,
 * and with no feedback at all it read as a caption rather than a button. */
function ShowMoreRow({
  expanded,
  hidden,
  onToggle,
}: {
  expanded: boolean;
  hidden: number;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row items-center justify-center shrink-0"
      style={{
        width: "100%",
        height: "var(--row-md)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--type-meta)",
        lineHeight: "var(--leading-ui)",
        color: hover ? "var(--ink-secondary)" : "var(--ink-tertiary)",
        transition: "color 120ms ease",
      }}
    >
      {/* "more", not "earlier": under a Matched or Open sort the rows below the
        * fold are not the older ones. */}
      {expanded
        ? "Show fewer"
        : `Show ${hidden} more ${hidden === 1 ? "session" : "sessions"}`}
    </button>
  );
}

function EmptySessionsState({ onStartSession }: { onStartSession: () => void }) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "var(--space-7) var(--space-6)",
        gap: "var(--space-5)",
        background: "var(--surface-control)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sheet)",
      }}
    >
      <div
        className="flex flex-col min-w-0 flex-1"
        style={{ gap: "var(--space-1)" }}
      >
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-primary)",
          }}
        >
          Never reconciled
        </span>
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          This property has no session history yet. The first close will start
          the trail.
        </span>
      </div>
      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus size={14} strokeWidth={1.75} />}
        onClick={onStartSession}
      >
        Start a session
      </Button>
    </div>
  );
}
