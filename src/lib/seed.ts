// Anchor seed — mirrors the locked Figma direction (2026-06-27).
// Anchor screen: Workspace at `draft` state — uploading bank statements + ledgers
// for the selected month, paired with wire-connectors.

export type WorkspaceStatus = "active" | "failed" | "complete";

/* ---------- The status vocabulary ----------
 *
 * Five display states, one label each, one tone each. Every chip, filter,
 * tab, dot and aria-label in the app resolves through this table, which is
 * what stops the same state reading as "Complete" in the nav filter,
 * "Completed" on the Dashboard tab, "Done" in the agents panel, "Posted" on
 * the canvas and "Closed" in the properties roster — all of which shipped
 * simultaneously.
 *
 *   review      — the agent finished and a person has to decide something
 *   active      — a run is in flight right now
 *   failed      — the run broke and needs a fix plus a re-run
 *   completed   — approved and written back to Yardi
 *   not-started — this property has no session in the selected cycle
 *
 * `WorkspaceStatus` is the storage type the session records carry; StatusKey
 * is what the UI renders. They differ in exactly one place: a stored "active"
 * session is one waiting on a reviewer, which the UI calls "Review".
 *
 * Tones map to the semantic pairs in globals.css. Spec:
 * docs/design-system/decisions.md §1, §4. */
export type StatusKey =
  | "review"
  | "active"
  | "failed"
  | "completed"
  | "not-started";

export const STATUS_META: Record<
  StatusKey,
  { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }
> = {
  review: { label: "Review", tone: "warn" },
  active: { label: "Active", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  completed: { label: "Completed", tone: "ok" },
  "not-started": { label: "Not started", tone: "neutral" },
};

/* The states a STORED session can actually be in.
 *
 * "active" is a RUNTIME state — a run that is executing right now — and no
 * seeded session carries it, because a session that is mid-flight has not been
 * written down yet. Filter strips over the roster and the session list use this
 * list rather than the whole table, so neither offers a tab that is permanently
 * empty. Surfaces that describe a live run (the workspace header, the phase
 * CTA, the session nav's dot) still use "active" from the reducer's runState. */
/* Triage order: what is broken, then what wants a decision, then what is done,
 * then what has not started. Every filter strip in the app renders them in this
 * order, so a reader's hand goes to the same place on every screen. */
export const STORED_STATES: StatusKey[] = [
  "failed",
  "review",
  "completed",
  "not-started",
];

export function statusKeyOf(status: WorkspaceStatus): StatusKey {
  if (status === "active") return "review";
  if (status === "failed") return "failed";
  return "completed";
}

/* The cycle the whole app is scoped to. Declared here rather than beside the
 * dashboard data because every derived figure below reads it. */
export const CURRENT_CYCLE = "May 2026";

export interface SessionRow {
  id: string;
  /** "May 2026", or "May 2026 · Re-run" where a cycle ran twice. */
  label: string;
  cycle: string;
  status: WorkspaceStatus;
  statusKey: StatusKey;
  statusLabel: string;
  selected?: boolean;
}

/* The property, as the Reconciliation nav and the new-session picker need it:
 * identity, a session list, and the two counts the row prints.
 *
 * Every field here is DERIVED from `properties` — see `workspaces` at the foot
 * of this file. It used to be a second, hand-written roster of nine properties
 * living beside the real twelve, and it disagreed with them about the session
 * count, the bank count, the legal entity and the last closed cycle on eight of
 * its nine rows. */
export interface PropertyWorkspace {
  id: string;
  address: string;
  shortAddress: string; // e.g. "1849 Westlake" — used in compact rows
  code: string;         // e.g. "TH-1247" — the durable short identifier
  cityState: string;    // e.g. "Seattle, WA" — new-session modal subtitle
  lastClosed: string;   // newest cycle that actually closed, or "Never"
  /* Logo + short name per linked account, in mapping order. */
  banks: { logoSrc: string; shortName: string }[];
  meta: string;         // "3 sessions · 4 accounts", derived from the arrays
  sessionCount: number;
  bankCount: number;
  /* Storage status of the current cycle's session; null when there is none. */
  status: WorkspaceStatus | null;
  /* Display state, from the one status table. */
  state: StatusKey;
  sessions: SessionRow[];
  selected?: boolean;
  expanded?: boolean;
}

export interface BankStatementInput {
  id: string;
  bank: {
    name: string;
    logo: string;
    address: string;
  };
  accountHolder: string;
  accountNumber: string;
  period: string;
  issue: string;
}

export interface LedgerInput {
  id: string;
  source: string; // e.g. "yardi.tahoe-holdings.com"
  tenantId: string; // e.g. "TH-PROD-01"
  propertyAndCode: string;
  cashAccount: string;
  period: string;
  exported: string;
}

export interface UploadPair {
  id: string;
  bank: BankStatementInput;
  ledger: LedgerInput;
}

export type BankUploadStatus = "empty" | "uploaded";

/* A single uploaded file occupying one slot on a bank. We track filename and
 * a pre-formatted size label; the file itself is not parsed in the prototype. */
export interface BankFile {
  filename: string;
  sizeLabel: string;
}

/* A bank associated with the active property carries TWO independent upload
 * slots — one for the bank statement, one for the Yardi ledger export. The
 * reconciliation pair (canvas pair card + wire) is only meaningful once both
 * slots are filled. `slotsFilled(bank)` derives the 0/1/2 completion count. */
export interface PropertyBank {
  id: string;
  name: string;
  logoSrc: string;
  accountHolder: string;
  accountNumber: string;
  type: string;
  ledgerSource: string;
  ledgerTenant: string;
  ledgerPropertyAndCode: string;
  ledgerCashAccount: string;
  /* Per-slot upload state. Undefined = empty slot. */
  statement?: BankFile;
  ledger?: BankFile;
  /* Coarse status kept for the canvas's draft/uploaded gate. Derived in the
   * seed: 'uploaded' only when BOTH slots are filled. */
  status: BankUploadStatus;
  /* Populated parallel to (statement && ledger) — drives the pair card render
   * once the canvas advances out of the draft state. */
  uploaded?: UploadPair;
}

/* Count how many slots are filled on a bank (0, 1, or 2). */
export function slotsFilled(bank: PropertyBank): 0 | 1 | 2 {
  return ((bank.statement ? 1 : 0) + (bank.ledger ? 1 : 0)) as 0 | 1 | 2;
}

export interface AgentFile {
  id: string;
  label: string;
  icon: "file-text" | "landmark";
  state: "ok" | "failed";
}

export type StatusTone = "neutral" | "failed" | "approved" | "unapproved";

export interface StatusRun {
  text: string;
  tone: StatusTone;
}

/* Leading dot state on each timeline subline. Matches the minimum 3-color
 * palette in the Figma; we can add more if a new agent state needs one.
 *   pending = step is queued but not the current focus (light grey)
 *   neutral = step completed cleanly (mid grey)
 *   failed  = step surfaced a problem (red) */
export type DotState = "pending" | "neutral" | "failed";

/* Per-bank progress row, attached to a Reconciliation status line. Visually
 * a strip of N rows under the line text — one per bank — each carrying logo,
 * account label, a thin progress bar (matched/total), and a numeric count.
 * Used to surface the parallel-track nature of reconciliation work. */
export interface BankProgressRow {
  id: string;
  logoSrc: string;
  shortName: string; // e.g. "Chase Operating ******3421"
  matched: number;
  total: number;
}

export interface AgentStatusLine {
  id: string;
  runs: StatusRun[];
  dotState: DotState;
  chips?: AgentFile[];
  bankRows?: BankProgressRow[];
}

/* idle    = agent has nothing to do yet (e.g. Intake before upload, Summary
 *           before Reconciliation finishes). Renders header only, avatar
 *           rendered in greyscale.
 * working = agent is actively progressing. The bottom-most status line gets
 *           the shimmer treatment; avatar runs full color.
 * done    = agent finished its phase. All lines visible, no shimmer.
 * error   = agent surfaced a problem it couldn't recover from. Avatar tints
 *           red, status line uses the failed gradient, a Retry chip surfaces
 *           in the CTA slot. */
export type AgentLifecycle = "idle" | "working" | "done" | "error";

/* Optional error surface — only meaningful when the agent's state is "error".
 * Carries a one-line human summary and the Retry label. Kept structural so
 * different agents can present tailored copy. */
export interface AgentError {
  title: string; // e.g. "Ledger import stalled"
  body: string; // one-line explanation
  retryLabel?: string; // defaults to "Retry"
}

/* Summary's deliverables — only meaningful in the done state.
 *
 * insight: one short, actionable read-out that distinguishes Summary from
 *   the other agents. Shown as a lifted callout below the timeline.
 *
 * artifact: the report file Summary produced. Acts as a peek; the full
 *   viewer is intended to live in the canvas (panel/canvas split per the
 *   Q1 grill decision).
 *
 * signoff: a single audit-grade line — who closed the run and when. */
export interface AgentInsight {
  body: string;
}

export interface AgentArtifact {
  filename: string;
  meta: string; // e.g. "Reconciliation report · 14 pages · 2.3 MB"
}

export interface AgentSignoff {
  by: string;
  at: string; // pre-formatted date string
}

/* Agent actions — Summary in its "ready to commit" state surfaces three:
 *   primary  — the commit (Post to Yardi). Dark pill, full presence.
 *   inspect  — opens the canvas detail view of approved/flagged records.
 *   secondary — escape hatch (e.g. Rerun reconciliation). Text link.
 * Each is optional; agents that don't await a user decision leave them
 * undefined. */
export interface AgentAction {
  label: string;
  sublabel?: string;
}

export interface AgentSectionData {
  id: "intake" | "reconciliation" | "summary";
  name: string;
  state: AgentLifecycle;
  /* The denormalized summary line shown when the agent's body is collapsed.
   * Undefined when idle (idle agents render header-only). */
  collapsedLine?: AgentStatusLine;
  /* Full chronological timeline shown when expanded. Empty when idle. */
  timeline: AgentStatusLine[];
  defaultExpanded?: boolean;
  /* Deliverable surfaces — render only when populated. Summary uses these in
   * its done state; Intake/Recon leave them undefined. */
  insight?: AgentInsight;
  artifact?: AgentArtifact;
  signoff?: AgentSignoff;
  /* Action slots — primary commit, canvas inspect, escape hatch. */
  primaryAction?: AgentAction;
  inspectAction?: AgentAction;
  secondaryAction?: AgentAction;
  /* Single muted line shown when state === "idle". Keeps the agent visually
   * present (in grey) instead of collapsing to header-only — the user can see
   * what the agent is waiting on before it activates. */
  idleHint?: string;
  /* Error payload — populated when `state` is "error". Enables the AgentsPanel
   * to render an inline error card + Retry chip without the caller having to
   * synthesize copy each time. */
  error?: AgentError;
}

// ---- The workspace canvas's view of a property's accounts ----
//
// Two upload slots per account: the bank statement, and the Yardi ledger
// export it is reconciled against. Both slots have to be filled before the
// pair means anything, which is what `slotsFilled` counts.
//
// This used to be four hardcoded accounts belonging to 1849 Westlake, used
// for EVERY session in the app — open a session on any other property and the
// canvas offered you Westlake's Chase Operating account. It is derived from
// the property's own bank mappings now.

/* Bank mailing addresses, by the routing number the mapping carries. A
 * statement header prints one; there is nowhere else in the app that knows
 * them, so they live here rather than being rebuilt inside a component. */
const BANK_REMIT_ADDRESS: Record<string, string> = {
  "021000021": "P.O. Box 659754, San Antonio, TX 78265-9754",
  "121000248": "P.O. Box 6995, Portland, OR 97228-6995",
  "026009593": "P.O. Box 25118, Tampa, FL 33622-5118",
};

/* "Tahoe Holdings LLC" -> "tahoe-holdings"; the Yardi instance is the owner's. */
function ownerSlug(owner: string): string {
  return owner
    .replace(/\b(LLC|L\.L\.C\.|Inc|LP|Ltd)\b\.?/gi, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* "Tahoe Holdings LLC" -> "TH-PROD-01". */
function tenantId(owner: string): string {
  const initials = owner
    .replace(/\b(LLC|L\.L\.C\.|Inc|LP|Ltd)\b\.?/gi, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return `${initials}-PROD-01`;
}

/* First and last day of a cycle, as a statement prints them:
 * "May 01, 2026 – May 31, 2026". */
function cyclePeriodLabel(cycle: string): string {
  const [mon, year] = cycle.split(" ");
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const m = months.indexOf(mon) + 1;
  const long = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ][m - 1];
  const last = new Date(Number(year), m, 0).getDate();
  return `${long} 01, ${year} – ${long} ${last}, ${year}`;
}

/* Statements are issued, and the ledger exported, in the first days of the
 * month AFTER the cycle they cover. Both used to be pinned to August 2026 on
 * a May 2026 run. */
function cycleIssueLabel(cycle: string): string {
  const [mon, year] = cycle.split(" ");
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const i = months.indexOf(mon);
  const next = months[(i + 1) % 12];
  const y = i === 11 ? Number(year) + 1 : Number(year);
  return `${next} 02, ${y}`;
}

export function banksFor(
  property: PropertyRecord,
  cycle: string = CURRENT_CYCLE
): PropertyBank[] {
  const period = cyclePeriodLabel(cycle);
  const issue = cycleIssueLabel(cycle);
  const exported = `${issue} · 09:14 PT`;
  const source = `yardi.${ownerSlug(property.owner)}.com`;
  const tenant = tenantId(property.owner);
  const propertyAndCode = `${property.legalEntity} · ${property.code}`;

  return property.banks.map((m) => {
    const holder = m.accountHolder ?? property.legalEntity;
    const cashAccount = `GL ${m.gl}`;
    return {
      id: m.id,
      name: m.name,
      logoSrc: m.logoSrc,
      accountHolder: holder,
      accountNumber: m.account,
      type: m.type,
      ledgerSource: source,
      ledgerTenant: tenant,
      ledgerPropertyAndCode: propertyAndCode,
      ledgerCashAccount: cashAccount,
      status: "empty",
      uploaded: {
        id: `pair-${m.id}`,
        bank: {
          id: `stmt-${m.id}`,
          bank: {
            name: m.name,
            logo: m.logoSrc.replace(/^.*\/(.+)\.png$/, "$1"),
            address: BANK_REMIT_ADDRESS[m.bankId] ?? "",
          },
          accountHolder: holder,
          accountNumber: m.account,
          period,
          issue,
        },
        ledger: {
          id: `ledger-${m.id}`,
          source,
          tenantId: tenant,
          propertyAndCode,
          cashAccount,
          period,
          exported,
        },
      },
    };
  });
}

/* `propertyBanks` and `uploadPairs` — one concrete example of the above, for
 * the design-system page — are declared at the foot of this file, where the
 * property roster they read exists. */

// ---- Right-side Agents panel ----
//
// Canonical lifecycle snapshot for the 1849 Westlake Ave N · May 2026 (2) run:
//   • Intake has finished its full lifecycle — classified, surfaced 2 failed
//     uploads, pulled authoritative ledgers from Yardi, normalized, handed off.
//   • Reconciliation is mid-flight comparing transactions across 4 banks,
//     each at a different point in its own per-bank progress.
//   • Summary is still idle — wakes only after Reconciliation hands off.

const intakeFailedChips: AgentFile[] = [
  {
    id: "f-ohioa",
    label: "1293 Ohio Ave · Q2 statement",
    icon: "file-text",
    state: "failed",
  },
  {
    id: "f-citi",
    label: "Citibank statement",
    icon: "landmark",
    state: "failed",
  },
];

/* Per-bank totals chosen to add up cleanly:
 *   14 + 18 + 22 + 14 = 68 expected records
 *   final approved + flagged = 52 + 16 = 68 ✓ */
/* Per-account progress for the anchor session (1849 Westlake, May 2026 re-run).
 *
 * The figures are the real per-account split of that session's records — 94,
 * 42, 35 and 33, adding to its 204 — and `matched` is short of `total` by
 * exactly that account's open items. The previous version had every account at
 * matched === total on a run with eight exceptions, and the four totals added
 * to 68 while every other surface said 204.
 *
 * The panel derives live rows from the open session; these are the resting
 * values the seed carries for the snapshot. */
const reconBankRows: BankProgressRow[] = [
  {
    id: "recon-chase-op",
    logoSrc: "/logos/chase.png",
    shortName: "Chase Operating ******3421",
    matched: 92,
    total: 94,
  },
  {
    id: "recon-boa-res",
    logoSrc: "/logos/boa.png",
    shortName: "BoA Reserve ******9034",
    matched: 39,
    total: 42,
  },
  {
    id: "recon-wells-sd",
    logoSrc: "/logos/wells-fargo.png",
    shortName: "Wells Fargo Security Deposit ******7782",
    matched: 34,
    total: 35,
  },
  {
    id: "recon-chase-esc",
    logoSrc: "/logos/chase.png",
    shortName: "Chase Escrow ******8856",
    matched: 31,
    total: 33,
  },
];


export const agents: AgentSectionData[] = [
  {
    id: "intake",
    name: "Intake",
    state: "done",
    idleHint: "Waiting for bank statements and ledgers",
    collapsedLine: {
      id: "intake-collapsed",
      runs: [
        { text: "Handed off · 4 account pairs · ", tone: "neutral" },
        { text: "2 files flagged", tone: "failed" },
      ],
      dotState: "neutral",
      chips: intakeFailedChips,
    },
    timeline: [
      {
        id: "intake-received",
        runs: [{ text: "Received · 10 files", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "intake-classified",
        runs: [
          { text: "Classified · 8 statements and ledgers matched", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "intake-failed",
        runs: [{ text: "Could not classify 2 files", tone: "failed" }],
        dotState: "failed",
        chips: intakeFailedChips,
      },
      {
        id: "intake-yardi",
        runs: [{ text: "Checked ledger totals against Yardi · 4 of 4 accounts", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "intake-normalized",
        runs: [{ text: "Normalized · 4 account pairs ready", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "intake-handoff",
        runs: [{ text: "Handed off to Reconciliation", tone: "neutral" }],
        dotState: "neutral",
      },
    ],
    defaultExpanded: false,
  },
  {
    id: "reconciliation",
    name: "Reconciliation",
    idleHint: "Waiting for Intake to hand off",
    state: "done",
    collapsedLine: {
      id: "recon-collapsed",
      runs: [
        { text: "Reconciled 204 records · ", tone: "neutral" },
        { text: "196 matched", tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: "8 open", tone: "failed" },
      ],
      dotState: "neutral",
    },
    timeline: [
      {
        id: "recon-started",
        runs: [{ text: "Reconciling 4 accounts", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "recon-matching",
        runs: [
          { text: "Matched 204 records · ", tone: "neutral" },
          { text: "196 matched", tone: "approved" },
          { text: " · ", tone: "neutral" },
          { text: "8 open", tone: "failed" },
        ],
        dotState: "neutral",
        bankRows: reconBankRows,
      },
    ],
    defaultExpanded: false,
  },
  {
    id: "summary",
    name: "Summary",
    state: "done",
    idleHint: "Waiting for Reconciliation to finish",
    collapsedLine: {
      id: "summary-collapsed",
      runs: [
        { text: "Ready to post · ", tone: "neutral" },
        { text: "196 matched", tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: "8 open", tone: "failed" },
      ],
      dotState: "neutral",
    },
    timeline: [
      {
        id: "summary-compiled",
        runs: [{ text: "Compiled review summary", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "summary-verified",
        runs: [{ text: "Verified 204 target records in Yardi", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-approved",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: "196 records", tone: "approved" },
          { text: " ready to post", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-flagged",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: "8 exceptions", tone: "failed" },
          { text: " to flag in Yardi", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-report",
        runs: [{ text: "Drafted reconciliation report", tone: "neutral" }],
        dotState: "neutral",
      },
    ],
    defaultExpanded: false,
    insight: {
      /* Written to read as an actual summary, not a headline: what was
       * reconciled, where the risk sits, and what the reviewer should
       * focus on before posting. Three sentences, plain English, no
       * jargon. Numbers reference the live 60/8 split so it stays in
       * sync with the count chips above and with reconciledRecords. */
      body: "Reconciled 204 records across 4 accounts; 196 matched on their own and 8 are open for review. Two unmapped BoA fee codes account for 2 of the 8; mapping them in property setup removes them from future cycles. Match rate is 96%, 3 points below April, driven mostly by those codes.",
    },
    signoff: {
      by: "Maya Chen",
      at: "Jun 2, 2026 · 11:04 PT",
    },
    artifact: {
      filename: "1849-westlake-may-2026.pdf",
      meta: "Reconciliation report · 14 pages · 2.3 MB",
    },
    primaryAction: {
      label: "Post to Yardi",
      sublabel: "60 approved · 8 flagged",
    },
    inspectAction: {
      label: "Review 68 records",
    },
    secondaryAction: {
      label: "Rerun reconciliation",
    },
  },
];

/* Alias kept for existing call sites. CURRENT_CYCLE is the name. */
export const selectedMonth = CURRENT_CYCLE;

/* The review canvas's record data lives at the FOOT of this file, not here.
 * It is generated per session from the property roster, so it has to be
 * declared after the roster exists — a module-level constant here evaluates
 * into the roster's temporal dead zone and throws on import. See
 * `recordsForSession`. */

/* The Dashboard's listing lives at the FOOT of this file, with the record
 * data, and for the same reason: it is derived from the property roster, so it
 * has to be declared after it. See `dashboardSessionsFor`. */

// ---- Knowledge — property guidance memory ----
//
// Reviewer-captured rules that steer the AI on future runs of this property.
// Auto-promoted when a comment is marked `guidanceCaptured`; can also be
// added directly from the panel composer. Persists across sessions of the
// same property; the scope in this prototype is the active Westlake property.
//
// One signal per card: `appliedThisCycle` tells the reviewer which rules
// are load-bearing vs dead weight without dumping a metrics tray on every
// entry — same discipline as the Dashboard's "two metrics not four" rule.

export type GuidanceAgent = "intake" | "reconciliation" | "summary";

export interface GuidanceEntry {
  id: string;
  rule: string;
  agent: GuidanceAgent;
  /* ISO date, so the panel can sort and format rather than sorting a
   * pre-formatted label lexicographically — "Dec 11" sorted above "Sep 17"
   * regardless of which year each belonged to. */
  capturedOn: string;                // e.g. "2026-03-18"
  /* Who captured it. The knowledge base names an author for every rule and
   * this was the only rule store that carried none. */
  capturedBy: string;
  capturedFromRecordTitle?: string;  // short label of the source record
  capturedFromSessionLabel: string;  // e.g. "May 2026"
  appliedThisCycle: number;
  totalApplied: number;
  archived: boolean;
}

export const guidanceEntries: GuidanceEntry[] = [
  {
    id: "g-1",
    rule: "Stripe payouts post 2 banking days after settlement. Match by amount, not by date.",
    agent: "reconciliation",
    capturedOn: "2026-03-18",
    capturedBy: "Maya Chen",
    capturedFromRecordTitle: "Stripe payout",
    capturedFromSessionLabel: "Mar 2026",
    appliedThisCycle: 6,
    totalApplied: 18,
    archived: false,
  },
  {
    id: "g-2",
    rule: "BoA FX assessment fees roll up under GL 6210 (Bank Charges), not under property-specific fee codes.",
    agent: "reconciliation",
    capturedOn: "2026-04-02",
    capturedBy: "Hassan Ali",
    capturedFromRecordTitle: "BoA fee · FX assessment 04",
    capturedFromSessionLabel: "Apr 2026",
    appliedThisCycle: 4,
    totalApplied: 9,
    archived: false,
  },
  {
    id: "g-3",
    rule: "Earnest money deposits land 3–5 days before the ledger entry. Widen the date window before flagging.",
    agent: "reconciliation",
    capturedOn: "2026-04-14",
    capturedBy: "Hassan Ali",
    capturedFromRecordTitle: "Earnest money deposit · unit 412",
    capturedFromSessionLabel: "Apr 2026",
    appliedThisCycle: 2,
    totalApplied: 5,
    archived: false,
  },
  {
    id: "g-4",
    rule: "Wire transfers to title companies are always legitimate. Do not flag as unknown counterparty.",
    agent: "summary",
    capturedOn: "2026-02-09",
    capturedBy: "Priya Raman",
    capturedFromRecordTitle: "Wire transfer · title company",
    capturedFromSessionLabel: "Feb 2026",
    appliedThisCycle: 1,
    totalApplied: 7,
    archived: false,
  },
  {
    id: "g-5",
    rule: "Tenant ACH returns for unit 308 are a known recurring issue with broken auto-pay. Approve manually.",
    agent: "intake",
    capturedOn: "2026-05-04",
    capturedBy: "Priya Raman",
    capturedFromRecordTitle: "Tenant ACH return · unit 308",
    capturedFromSessionLabel: "May 2026",
    appliedThisCycle: 0,
    totalApplied: 0,
    archived: false,
  },
  {
    id: "g-6",
    rule: "Refunds under $250 are routine. Auto-approve and skip the ambiguity check.",
    agent: "reconciliation",
    capturedOn: "2026-01-22",
    capturedBy: "Maya Chen",
    capturedFromRecordTitle: "Refund #4912",
    capturedFromSessionLabel: "Jan 2026",
    appliedThisCycle: 3,
    totalApplied: 14,
    archived: false,
  },
  {
    id: "g-7",
    rule: "Capex roof-replacement transfers under $25k post the same day. Do not widen the date match window.",
    agent: "reconciliation",
    capturedOn: "2025-12-11",
    capturedBy: "Dana Okafor",
    capturedFromRecordTitle: "Capex transfer · roof replacement",
    capturedFromSessionLabel: "Dec 2025",
    appliedThisCycle: 0,
    totalApplied: 1,
    archived: true,
  },
  {
    id: "g-8",
    rule: "Old Wells Fargo SD account mapping (closed Q3 2025) is no longer in use.",
    agent: "intake",
    capturedOn: "2025-09-17",
    capturedBy: "Dana Okafor",
    capturedFromSessionLabel: "Sep 2025",
    appliedThisCycle: 0,
    totalApplied: 4,
    archived: true,
  },
];

// ---- AI observability (Dashboard strip + AI Quality detail page) ----
//
// Audience: the BPO ops lead / reconciliation manager. They own the config,
// decide how much the AI is allowed to do unattended, and are the only person
// who can act on what this surface says. The client-side controller and the
// auditor are served by an export, not by diluting this page.
//
// The page is one argument in three acts:
//   1. Where it stands       — accuracy (with its denominator), autonomy, $ exposure
//   2. What's working, what isn't — is its confidence earned, and where it slips
//   3. What to do about it   — Knowledge rules to add, and rules gone stale
//
// Act 3 matters because a Knowledge rule is the ONLY durable input this product
// gives a human. There are no numeric settings anywhere in the app: thresholds
// live inside rules as prose (see guidanceEntries). So an "action" on this
// screen has to produce a rule, or it isn't an action.
//
// EVERY NUMBER BELOW RECONCILES. The chain, for May 2026 across the portfolio:
//   1,204 lines scored
//     ├─ 1,048 auto-approved, no human touch            → autonomy 87%
//     └─   156 routed to a reviewer
//   268 calls were actually verified — the accuracy denominator:
//     the 156 routed to review + a 112-line audit of what the AI approved alone
//     ├─ 241 the reviewer or auditor agreed with         → accuracy 90%
//     └─  27 wrong calls, worth $14,280, all caught before posting
//   The 27, split three ways — each split totals 27 or $14,280:
//     by decision type   24 bad matches + 3 needless flags
//     by root cause      failureThemes (hits and exposure both total)
//     by confidence      confidenceBands (the 24 bad matches only)
//
// Accuracy is deliberately NOT "1 − override rate". It is measured against a
// named, checkable denominator, and the audit sample is the only reason the
// auto-approved path counts at all. Anyone who asks "accurate against what?"
// finds the answer on screen, under the number.

/* Three agents. There used to be a fourth here — "Exception" — that existed on
 * the AI Performance page and nowhere else: the workspace panel, the guidance
 * model and the session lifecycle all model three. Explaining a line that did
 * not match is part of reconciling it, so its work and its cost fold into
 * Reconciliation rather than standing apart on one screen. */
export type AIAgentKey = "intake" | "reconciliation" | "summary";


/* ---- AI observability, as the Dashboard reads it ----
 *
 * Two figures and the cycle they cover. That is the whole model.
 *
 * It used to carry an argument about calibration as well: three headline metrics
 * with denominators, four confidence bands, four root-cause themes, two proposed
 * rules, two stale ones, and three annotated decisions — roughly 250 lines of
 * authored prose asserting things like "241 of the 268 calls we checked were
 * right" and "$14,280 caught before posting". When the AI page was rebuilt on
 * 2026-08-26 nothing rendered any of it, so the numbers were claims with no
 * surface to be checked against and no owner. Deleted rather than left to rot:
 * unrendered seed prose is the easiest kind of invented detail to mistake for
 * fact later.
 *
 * What remains is what two screens actually read. Per-agent cost and success
 * live in `aiAgents`; the six-cycle trend lives in `aiThroughput`. */
export interface AIObservability {
  cycle: string;
  /** Share of checked calls that held up on review, as a percentage. */
  accuracy: number;
  /** Change against the prior cycle, in percentage points. */
  accuracyTrend: number;
  /* Cost, in the only unit that scales with usage. It sits beside accuracy
   * because the two are the trade the reader is managing: accuracy is what the
   * AI is worth, tokens are what it costs to get there. */
  tokensUsed: number;
  /** Change against the prior cycle, as a percentage of the prior figure. */
  tokensTrendPct: number;
}

/* accuracy and its trend reconcile with the last two points of aiThroughput
 * (Apr 88 -> May 90). tokensUsed reconciles with the four agents' totals in
 * aiAgents. Change one, change the other. */
export const aiObservability: AIObservability = {
  cycle: "May 2026",
  accuracy: 90,
  accuracyTrend: 2,
  tokensUsed: 1_240_000,
  tokensTrendPct: -8,
};


// ---- AI performance detail (#dashboard → View details) ----
/* Rebuilt 2026-08-26. The previous model was an argument about calibration:
 * confidence bands, root-cause themes, proposed rules, three annotated
 * decisions. It read well and answered a question nobody had asked. What the
 * reader actually wants to know about a system of four agents is: what did each
 * one do, what did it cost, is it getting better, and what have I told it.
 *
 * Three things, therefore, and each is a tab:
 *   agents        — per-agent success, cost and the prompt it runs on
 *   throughput    — work done against time; the productivity story
 *   instructions  — the durable input a human gives the AI
 *
 * TOKENS RECONCILE: the four agents' totals sum to aiObservability.tokensUsed
 * (1,240,000), and each agent's in + out + cached sums to its own total. If you
 * change one, change the others. */

export interface AIAgentProfile {
  key: AIAgentKey;
  name: string;
  /** One line: what this agent is for, in the reader's language not ours. */
  role: string;
  /** Times it ran this cycle. */
  runs: number;
  /** Runs that finished with no human correction. */
  succeeded: number;
  /** Tokens consumed this cycle. tokensIn + tokensOut + tokensCached. */
  tokens: number;
  /* The split matters more than the total: cached reads are near-free, output
   * is the expensive part, and a reader deciding where to cut cost needs to see
   * which of the three is carrying the bill. */
  tokensIn: number;
  tokensOut: number;
  tokensCached: number;
  /** Median wall-clock per run, in seconds. */
  medianSeconds: number;
  /** The prompt the agent actually runs on, verbatim. */
  systemPrompt: string;
}

/* Four agents, in the order a run passes through them. Intake reads,
 * Reconciliation matches, Exception explains what did not match, Summary closes
 * out and writes back to Yardi. */
export const aiAgents: AIAgentProfile[] = [
  {
    key: "intake",
    name: "Intake",
    role: "Reads each statement and Yardi ledger, and normalises them into comparable lines.",
    /* Runs, and the failures among them, reconcile with the sessions: twelve
     * were started this cycle and three broke — two while reading documents,
     * one during matching. Intake carries two of those three. */
    runs: 12,
    succeeded: 10,
    tokens: 412_000,
    tokensIn: 300_000,
    tokensOut: 26_000,
    tokensCached: 86_000,
    medianSeconds: 42,
    systemPrompt: `You normalise bank statements and Yardi ledger exports into a single line format.

For every line, extract: date, amount, direction, counterparty, and any reference or memo text. Preserve the source's own wording for counterparty — never expand abbreviations or correct spelling, because downstream matching depends on the literal string.

Amounts are always signed from the property's perspective. A debit on the bank statement is negative.

If a column is missing or unreadable, emit the line with that field null and record why. Never infer a date or an amount.

Bank fee codes map to GL accounts using the property's chart of accounts. If a code has no mapping, leave the GL null and pass it through — do not guess a nearby account.`,
  },
  {
    key: "reconciliation",
    name: "Reconciliation",
    role: "Matches each statement line to the ledger entry it belongs to, and explains the ones that do not match.",
    runs: 10,
    succeeded: 9,
    /* Carries what the separate Exception agent used to: 486K + 238K. */
    tokens: 724_000,
    tokensIn: 470_000,
    tokensOut: 106_000,
    tokensCached: 148_000,
    medianSeconds: 144,
    systemPrompt: `You match bank statement lines to Yardi ledger entries. One statement line matches at most one ledger entry.

A match requires all three: the amounts are equal, the dates are within the property's settlement window, and the counterparty strings refer to the same party.

Report a confidence for every match, and say what the confidence rests on. Confidence below the property's approval floor goes to a reviewer rather than being approved.

Counterparty similarity alone is never sufficient. Right amount and wrong vendor is the failure mode this rule exists to prevent.

Read the property's standing instructions before matching, and apply the narrowest one that fits. Where two instructions conflict, follow neither and route the line to a reviewer with both quoted.`,
  },
  {
    key: "summary",
    name: "Summary",
    role: "Writes the close summary and posts the approved records back to Yardi.",
    /* Only runs on the nine sessions that got through reconciliation. */
    runs: 9,
    succeeded: 8,
    tokens: 104_000,
    tokensIn: 61_000,
    tokensOut: 31_000,
    tokensCached: 12_000,
    medianSeconds: 9,
    systemPrompt: `You write the close summary for one property and one period, then post approved records to Yardi.

The summary is for someone who was not in the session. State: how many lines were reconciled, how many are still open, and what a person had to decide.

Never report a total you have not been given. If a figure is unavailable, say it is unavailable.

Post only records a human has approved. An approval covers exactly the records it was given — if the set changed after approval, stop and ask again.

After posting, report what Yardi accepted and what it rejected, with Yardi's own error text quoted verbatim.`,
  },
];

/* ---- Throughput: work done against time ----
 * Six cycles. The story is one that three separate numbers tell together and
 * none tells alone: the AI is handling more lines, getting more of them right,
 * and taking less of a reviewer's day to do it. `hours` is the one a reader
 * takes to their own manager. */
export interface AIThroughputPoint {
  /* Full cycle label ("May 2026") so it can be matched against the picker.
   * Chart axes render the month alone via `shortCycle`. */
  cycle: string;
  /** Statement lines reconciled in the cycle. */
  lines: number;
  /** Share of checked calls that held up, as a percentage. */
  successRate: number;
  /** Reviewer hours spent across the portfolio. */
  reviewerHours: number;
  /* Tokens spent in the cycle. Present so the trend can show cost per unit of
   * work rather than cost in the abstract — tokens rising while tokens-per-line
   * falls is the shape of a system getting more efficient at a larger scale, and
   * neither number alone shows it. */
  tokens: number;
}

/* May reconciles with aiObservability: 90% accuracy, 1,240,000 tokens, and
 * Apr -> May token change of -8% (1,348,000 -> 1,240,000). */
/* `aiThroughput` is declared at the foot of this file: its line counts are
 * counted off the property roster, which is declared after this point. */


/* ---- Knowledge base ----
 *
 * The durable input a human gives the AI: rules it reads before every run and
 * keeps reading until someone removes them. This is the only place in the
 * product where a person changes how the AI behaves — there are no numeric
 * settings anywhere — so the rules are prose, in the reconciler's own words.
 *
 * Scope is named by what it covers, not by how it is implemented:
 *   all      — every reconciliation, on every property
 *   property — one named property, on every reconciliation it runs
 *
 * `applied` counts how many times the rule fired in the current cycle. The
 * screen does NOT print the count: nobody acts on the difference between 214 and
 * 88. What it prints is the one fact that is actionable — a rule at zero has
 * never once matched, which means it is either redundant or worded too narrowly
 * to fire, and someone should look at it. */
export type RuleScope = "all" | "property";

export interface KnowledgeRule {
  id: string;
  scope: RuleScope;
  /** Set only when scope is "property". */
  property?: string;
  /** Which agent reads this rule. */
  agent: AIAgentKey;
  rule: string;
  addedBy: string;
  addedOn: string;
  /** Times it fired this cycle. Rendered as a status, not as a number. */
  applied: number;
}

const PORTFOLIO_RULES: KnowledgeRule[] = [
  // --- every property, every reconciliation ---
  {
    id: "kr-1",
    scope: "all",
    agent: "reconciliation",
    rule: "Do not approve a match when the payee names differ, even if the amount and date are exact. Send it for review instead.",
    addedBy: "Priya Raman",
    addedOn: "Feb 2026",
    applied: 214,
  },
  {
    id: "kr-2",
    scope: "all",
    agent: "intake",
    rule: 'Bank fee codes FX-011 through FX-039 post to GL 6210, Bank Charges. Codes outside that range are new and need a mapping decision.',
    addedBy: "Hassan Ali",
    addedOn: "Jan 2026",
    applied: 31,
  },
  {
    id: "kr-3",
    scope: "all",
    agent: "reconciliation",
    rule: "When there is no ledger entry at any amount, report a missing journal entry. Do not list near matches; the fix is a booking, not a match.",
    addedBy: "Priya Raman",
    addedOn: "Jan 2026",
    applied: 88,
  },
  {
    id: "kr-4",
    scope: "all",
    agent: "summary",
    rule: "Do not post to Yardi on the last business day of the month. Hold approved records and post on the first of the next.",
    addedBy: "Dana Okafor",
    addedOn: "Mar 2026",
    applied: 6,
  },
  // --- one named property, captured on properties other than the anchor ---
  {
    id: "kr-7",
    scope: "property",
    property: "871 Broadway, Oakland",
    agent: "reconciliation",
    rule: "Chase Operating charges a $42.50 account fee on the 3rd of every month. It is not a duplicate.",
    addedBy: "Hassan Ali",
    addedOn: "Apr 2026",
    applied: 2,
  },
  {
    id: "kr-8",
    scope: "property",
    property: "5200 Christie Ave, Emeryville",
    agent: "reconciliation",
    rule: "Wells Fargo exports this property's ledger with the memo and reference columns transposed. Read them in reverse before matching.",
    addedBy: "Dana Okafor",
    addedOn: "Apr 2026",
    applied: 41,
  },
];

/* The anchor property's own rules are the guidance a reviewer captured while
 * working it — `guidanceEntries`, which the workspace's Knowledge panel writes
 * to. They used to be restated here as `kr-5` and `kr-6` in different words,
 * by different authors, on different dates, with different application counts,
 * so the same rule read as two rules that disagreed about itself. The knowledge
 * base now includes them by reference. */
const ANCHOR_PROPERTY_RULES: KnowledgeRule[] = guidanceEntries
  .filter((g) => !g.archived)
  .map((g) => ({
    id: `kr-${g.id}`,
    scope: "property" as const,
    property: "1849 Westlake Ave N, Seattle",
    agent: g.agent,
    rule: g.rule,
    addedBy: g.capturedBy,
    addedOn: g.capturedFromSessionLabel,
    applied: g.totalApplied,
  }));

/* One list, portfolio rules first. */
export const knowledgeRules: KnowledgeRule[] = [
  ...PORTFOLIO_RULES,
  ...ANCHOR_PROPERTY_RULES,
];




// ---- Properties roster (#properties route) ----
/* A property is the durable parent that sessions live under. The Properties
 * view is a reference / setup surface — the reconciler comes here to look up
 * portfolio state, fix a bank mapping, or onboard a new property. Daily-use
 * stays on Dashboard; active reconciliation work stays in Workspace. */

export type CloseStatus =
  | "open"
  | "in-review"
  | "needs-input"
  | "closed"
  | "failed"
  | "draft";

export type PropertyType =
  | "Multi-family"
  | "Office"
  | "Retail"
  | "Mixed-use"
  | "Industrial";

export type LedgerSource = "Yardi" | "Manual" | "Hybrid";

/* Connection health of a linked bank account.
 *   synced       — feed is live and data is fresh (within ~24h)
 *   stale        — auth still valid but no new data for several days
 *   disconnected — auth lapsed or feed broken; needs reconnect
 *   manual       — no live feed; reconciler uploads statements directly */
export type BankConnectionStatus =
  | "synced"
  | "stale"
  | "disconnected"
  | "manual";

/* One bank account *linked* to a property. The account itself sits at a bank
 * and is held by a legal entity — the property is the consumer. Carries:
 *   • bank identity     (name, shortName, logoSrc, bankId/routing)
 *   • account identity  (account number / last-4 mask)
 *   • property mapping  (type/purpose, GL account, accountHolder)
 *   • connection health (connectionStatus, lastSynced) */
export interface PropertyBankMapping {
  id: string;
  /* Bank identity — derived from picking a brand, shared across all
   * accounts at the same bank. Routing (bankId) is bank-level, NOT
   * account-level, so it shouldn't be surfaced per row. */
  name: string;
  shortName: string;
  logoSrc: string;
  bankId: string;
  /* "Operating" | "Reserve" | "Escrow" | "Security Deposit" — purpose of
   * the account in the property's accounting. Kept open since portfolios
   * carry custom purposes (Construction, CapEx, etc.). */
  type: string;
  /* Masked last-4 or last-N representation of the account number.
   * The full number is never persisted in the prototype. */
  account: string;
  /* Chart-of-accounts GL line where this bank's activity posts.
   * Free text in the prototype; real product would pick from the
   * property's chart of accounts. */
  gl: string;
  /* Whose name is on the account — usually the property's legal entity,
   * but can differ when the bank account is held by a parent entity or
   * an SPV that fronts multiple properties. Optional in the prototype
   * because the seeded mappings aren't detailed enough to carry it;
   * consumers should fall back to the property's legal entity. */
  accountHolder?: string;
  /* Live connection health — drives the per-row pill. Optional in the
   * prototype seeds; renderers should treat undefined as "unknown". */
  connectionStatus?: BankConnectionStatus;
  /* Human-readable last-sync label ("4h ago", "May 28", "Never"). Optional
   * for the same reason as the two fields above. */
  lastSynced?: string;
}

/* One reconciliation run against one property for one accounting cycle.
 * Carries enough outcome detail that the history table answers "what happened
 * that month" without opening the session: how much was reconciled, what was
 * left behind, who ran it, and how long it took.
 *
 * The shape below is the DERIVED view. What the seed authors is `SessionSpec`;
 * `exceptions`, `label` and the two status fields are computed, so no two
 * surfaces can quote different arithmetic for the same run.
 *
 * The three volume figures relate as:
 *     matched + exceptions = records          (always)
 *     openItems <= exceptions                 (open is the unresolved subset)
 *     completed -> openItems = 0
 *     failed    -> matched = 0, openItems = records
 * See docs/design-system/decisions.md §7. */
export interface PropertySession {
  id: string;
  /* Accounting cycle the session covers — "May 2026". */
  cycle: string;
  /* Only set when a cycle was run more than once ("Re-run", "First run").
   * Keeps the cycle label clean instead of smuggling "(2)" into it. */
  pass?: string;
  /* The one label every surface shows for this run: "May 2026", or
   * "May 2026 · Re-run" where a cycle was run twice. Derived, so the session
   * list, the nav row and the canvas header cannot spell it three ways. */
  label: string;
  status: WorkspaceStatus;
  /* Display state and its label, from the single status table. */
  statusKey: StatusKey;
  statusLabel: string;
  /* Volume and outcome. */
  records: number;
  matched: number;
  /* records − matched: everything the agent could not settle on its own. */
  exceptions: number;
  /* The subset of those still sitting there. Zero once the cycle is closed. */
  openItems: number;
  /* Provenance — who ran it, when it landed, how long it took. */
  ranBy: string;
  finishedOn: string;
  duration: string;
  /* Why a run stopped. Only meaningful when `status` is "failed"; the session
   * list and the workspace canvas both surface it rather than saying only
   * "Failed" and leaving the reader to open the run to find out.
   *
   * Written in the register of a system log line, not an agent's explanation:
   * two or three words naming the fault, no counts, no narration. A failure is
   * raised by the pipeline before any agent has an opinion, and copy that reads
   * as though something reasoned about it claims a diagnosis nothing performed.
   * "Ledger export timed out", not "The Yardi export did not complete in time,
   * so 2 of 2 accounts could not be read." */
  note?: string;
}

/* What the seed literals actually spell out. Everything else on
 * `PropertySession` is computed by `toSession` below. */
interface SessionSpec {
  id: string;
  cycle: string;
  pass?: string;
  status: WorkspaceStatus;
  records: number;
  matched: number;
  open: number;
  ranBy: string;
  finishedOn: string;
  duration: string;
  note?: string;
}

function toSession(spec: SessionSpec): PropertySession {
  const exceptions = spec.records - spec.matched;
  const statusKey = statusKeyOf(spec.status);
  return {
    id: spec.id,
    cycle: spec.cycle,
    pass: spec.pass,
    label: spec.pass ? `${spec.cycle} · ${spec.pass}` : spec.cycle,
    status: spec.status,
    statusKey,
    statusLabel: STATUS_META[statusKey].label,
    records: spec.records,
    matched: spec.matched,
    exceptions,
    openItems: Math.min(spec.open, exceptions),
    ranBy: spec.ranBy,
    finishedOn: spec.finishedOn,
    duration: spec.duration,
    note: spec.note,
  };
}

export interface PropertyRecord {
  id: string;
  /* Identity */
  code: string;
  ledgerPropertyId: string;
  legalEntity: string;
  address: string;
  shortAddress: string;
  cityState: string;
  market: string;
  type: PropertyType;
  units: number;
  owner: string;
  accountant: string;
  /* Accounting */
  ledgerSource: LedgerSource;
  fiscalCalendar: string;
  /* ---- Derived from `sessions`; never authored. ---- */
  /** The cycle the app is scoped to. */
  period: string;
  closeStatus: CloseStatus;
  /** The newest session in `period`, if the property has one. */
  currentSession?: PropertySession;
  /** Display state for the current cycle, from the one status table. */
  state: StatusKey;
  /** Still unresolved in the current cycle. */
  openItems: number;
  /** Handed back by the agent in the current cycle. */
  exceptions: number;
  tieOut: "Tied" | "Untied" | "Pending";
  /** Newest cycle that actually closed, or "Never". */
  lastReconciled: string;
  /* Asset facts — the "what is this building" half of Property details.
   * Merged in from PROPERTY_PROFILES at module load rather than repeated in
   * every seed literal. */
  portfolio: string;
  acquired: string;
  yearBuilt: number;
  rentableSqFt: number;
  propertyManager: string;
  taxId: string;
  /* Stake the fund holds. JVs are common enough in CRE that "100%" is a fact
   * worth stating rather than an assumption. */
  ownershipStake: string;
  recordStatus: "Active" | "In transition" | "Disposed";
  /* Banks + full session history, newest first. */
  banks: PropertyBankMapping[];
  sessions: PropertySession[];
}

/* The subset each seed literal actually spells out. Profile facts and session
 * history are merged in below so the twelve literals stay readable. */
type PropertySeed = Omit<
  PropertyRecord,
  | "portfolio"
  | "acquired"
  | "yearBuilt"
  | "rentableSqFt"
  | "propertyManager"
  | "taxId"
  | "ownershipStake"
  | "recordStatus"
  | "sessions"
  /* Everything below is DERIVED from the session history. It used to be
   * hand-written per property and drifted from it in every row — a property
   * marked "closed" whose newest session was two cycles old, a "Never"
   * reconciled property with posted runs on the Dashboard. */
  | "period"
  | "closeStatus"
  | "currentSession"
  | "state"
  | "openItems"
  | "exceptions"
  | "tieOut"
  | "lastReconciled"
>;

const chaseBank = (
  type: string,
  account: string,
  gl: string
): PropertyBankMapping => ({
  id: `bm-chase-${type.toLowerCase().replace(/\s+/g, "-")}-${account.slice(-4)}`,
  name: "JPMorgan Chase Bank, N.A.",
  shortName: "Chase",
  logoSrc: "/logos/chase.png",
  type,
  account,
  gl,
  bankId: "021000021",
});

const wellsBank = (
  type: string,
  account: string,
  gl: string
): PropertyBankMapping => ({
  id: `bm-wells-${type.toLowerCase().replace(/\s+/g, "-")}-${account.slice(-4)}`,
  name: "Wells Fargo Bank, N.A.",
  shortName: "Wells Fargo",
  logoSrc: "/logos/wells-fargo.png",
  type,
  account,
  gl,
  bankId: "121000248",
});

const boaBank = (
  type: string,
  account: string,
  gl: string
): PropertyBankMapping => ({
  id: `bm-boa-${type.toLowerCase().replace(/\s+/g, "-")}-${account.slice(-4)}`,
  name: "Bank of America, N.A.",
  shortName: "BoA",
  logoSrc: "/logos/boa.png",
  type,
  account,
  gl,
  bankId: "026009593",
});

const propertySeeds: PropertySeed[] = [
  {
    id: "prop-westlake-1849",
    code: "TH-1247",
    ledgerPropertyId: "P-1247",
    legalEntity: "Tahoe Holdings LLC dba 1849 Westlake",
    address: "1849 Westlake Ave N, Seattle, WA 98109",
    shortAddress: "1849 Westlake",
    cityState: "Seattle, WA",
    market: "Seattle",
    type: "Mixed-use",
    units: 84,
    owner: "Tahoe Holdings LLC",
    accountant: "Maya Chen",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [
      chaseBank("Operating", "******3421", "1010 · Operating Cash"),
      wellsBank("Security Deposit", "******7782", "1020 · Security Deposit"),
      boaBank("Reserve", "******9034", "1030 · Capital Reserve"),
      chaseBank("Escrow", "******8856", "1040 · Tax Escrow"),
    ],
  },
  {
    id: "prop-mission-1247",
    code: "MIS-1247",
    ledgerPropertyId: "P-1247",
    legalEntity: "Mission District Holdings LLC",
    address: "1247 Mission St, San Francisco, CA 94103",
    shortAddress: "1247 Mission",
    cityState: "San Francisco, CA",
    market: "San Francisco",
    type: "Multi-family",
    units: 112,
    owner: "Mission District Holdings LLC",
    accountant: "Maya Chen",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [
      chaseBank("Operating", "******1180", "1010 · Operating Cash"),
      wellsBank("Reserve", "******4421", "1030 · Capital Reserve"),
      boaBank("Security Deposit", "******7720", "1020 · Security Deposit"),
    ],
  },
  {
    id: "prop-haight-414",
    code: "HGT-0414",
    ledgerPropertyId: "P-0414",
    legalEntity: "Haight & Ashbury Properties LLC",
    address: "414 Haight St, San Francisco, CA 94117",
    shortAddress: "414 Haight",
    cityState: "San Francisco, CA",
    market: "San Francisco",
    type: "Retail",
    units: 6,
    owner: "Haight & Ashbury Properties LLC",
    accountant: "Jordan Ellis",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jul – Jun",
    banks: [
      chaseBank("Operating", "******9912", "1010 · Operating Cash"),
      wellsBank("Reserve", "******3344", "1030 · Capital Reserve"),
    ],
  },
  {
    id: "prop-folsom-2200",
    code: "FOL-2200",
    ledgerPropertyId: "P-2200",
    legalEntity: "Folsom Yard Holdings LLC",
    address: "2200 Folsom St, San Francisco, CA 94110",
    shortAddress: "2200 Folsom",
    cityState: "San Francisco, CA",
    market: "San Francisco",
    type: "Multi-family",
    units: 48,
    owner: "Folsom Yard Holdings LLC",
    accountant: "Jordan Ellis",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [chaseBank("Operating", "******5500", "1010 · Operating Cash")],
  },
  {
    id: "prop-broadway-871",
    code: "OAK-0871",
    ledgerPropertyId: "P-0871",
    legalEntity: "East Bay Capital LLC",
    address: "871 Broadway, Oakland, CA 94607",
    shortAddress: "871 Broadway",
    cityState: "Oakland, CA",
    market: "Oakland",
    type: "Office",
    units: 24,
    owner: "East Bay Capital LLC",
    accountant: "Priya Raman",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [
      chaseBank("Operating", "******2210", "1010 · Operating Cash"),
      wellsBank("Reserve", "******8865", "1030 · Capital Reserve"),
    ],
  },
  {
    id: "prop-emeryville-5200",
    code: "EMR-2087",
    ledgerPropertyId: "P-2087",
    legalEntity: "Bay Bridge Realty Partners LLC",
    address: "5200 Christie Ave, Emeryville, CA 94608",
    shortAddress: "5200 Christie",
    cityState: "Emeryville, CA",
    market: "Oakland",
    type: "Office",
    units: 18,
    owner: "Bay Bridge Realty Partners LLC",
    accountant: "Priya Raman",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [
      wellsBank("Operating", "******1145", "1010 · Operating Cash"),
      chaseBank("Reserve", "******7720", "1030 · Capital Reserve"),
    ],
  },
  {
    id: "prop-shattuck-2390",
    code: "BRK-1410",
    ledgerPropertyId: "P-1410",
    legalEntity: "Shattuck Avenue Holdings LLC",
    address: "2390 Shattuck Ave, Berkeley, CA 94704",
    shortAddress: "2390 Shattuck",
    cityState: "Berkeley, CA",
    market: "Berkeley",
    type: "Retail",
    units: 9,
    owner: "Shattuck Avenue Holdings LLC",
    accountant: "Priya Raman",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [boaBank("Operating", "******6601", "1010 · Operating Cash")],
  },
  {
    id: "prop-park-1500",
    code: "ALM-2640",
    ledgerPropertyId: "P-2640",
    legalEntity: "Alameda Bay Holdings LLC",
    address: "1500 Park St, Alameda, CA 94501",
    shortAddress: "1500 Park",
    cityState: "Alameda, CA",
    market: "Oakland",
    type: "Multi-family",
    units: 32,
    owner: "Alameda Bay Holdings LLC",
    accountant: "Priya Raman",
    ledgerSource: "Manual",
    fiscalCalendar: "Jan – Dec",
    banks: [chaseBank("Operating", "******4280", "1010 · Operating Cash")],
  },
  {
    id: "prop-bridgeway-100",
    code: "SAU-1900",
    ledgerPropertyId: "P-1900",
    legalEntity: "Sausalito Marina LLC",
    address: "100 Bridgeway, Sausalito, CA 94965",
    shortAddress: "100 Bridgeway",
    cityState: "Sausalito, CA",
    market: "Marin",
    type: "Mixed-use",
    units: 14,
    owner: "Sausalito Marina LLC",
    accountant: "Jordan Ellis",
    ledgerSource: "Hybrid",
    fiscalCalendar: "Jan – Dec",
    banks: [
      chaseBank("Operating", "******1900", "1010 · Operating Cash"),
      wellsBank("Reserve", "******5520", "1030 · Capital Reserve"),
    ],
  },
  {
    id: "prop-larkin-908",
    code: "SF-0908",
    ledgerPropertyId: "P-0908",
    legalEntity: "Larkin Heights Holdings LLC",
    address: "908 Larkin St, San Francisco, CA 94109",
    shortAddress: "908 Larkin",
    cityState: "San Francisco, CA",
    market: "San Francisco",
    type: "Multi-family",
    units: 56,
    owner: "Larkin Heights Holdings LLC",
    accountant: "Jordan Ellis",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [
      chaseBank("Operating", "******2114", "1010 · Operating Cash"),
      boaBank("Security Deposit", "******6688", "1020 · Security Deposit"),
    ],
  },
  {
    id: "prop-grand-2055",
    code: "OAK-2055",
    ledgerPropertyId: "P-2055",
    legalEntity: "Grand Lake Partners LLC",
    address: "2055 Grand Ave, Oakland, CA 94612",
    shortAddress: "2055 Grand",
    cityState: "Oakland, CA",
    market: "Oakland",
    type: "Office",
    units: 12,
    owner: "Grand Lake Partners LLC",
    accountant: "Priya Raman",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jul – Jun",
    banks: [wellsBank("Operating", "******8033", "1010 · Operating Cash")],
  },
  {
    id: "prop-noe-3801",
    code: "SF-3801",
    ledgerPropertyId: "P-3801",
    legalEntity: "Noe Valley Holdings LLC",
    address: "3801 24th St, San Francisco, CA 94114",
    shortAddress: "3801 24th",
    cityState: "San Francisco, CA",
    market: "San Francisco",
    type: "Retail",
    units: 8,
    owner: "Noe Valley Holdings LLC",
    accountant: "Maya Chen",
    ledgerSource: "Yardi",
    fiscalCalendar: "Jan – Dec",
    banks: [chaseBank("Operating", "******4477", "1010 · Operating Cash")],
  },
];

/* Asset facts, keyed by property id. Kept out of the seed literals above so
 * those stay scannable — the literals carry reconciliation state, this carries
 * "what is this building". */
type PropertyProfile = Pick<
  PropertyRecord,
  | "portfolio"
  | "acquired"
  | "yearBuilt"
  | "rentableSqFt"
  | "propertyManager"
  | "taxId"
  | "ownershipStake"
  | "recordStatus"
>;

const PROPERTY_PROFILES: Record<string, PropertyProfile> = {
  "prop-westlake-1849": { portfolio: "Pacific Core Fund II", acquired: "Mar 2021", yearBuilt: 2008, rentableSqFt: 96400, propertyManager: "Cascade Residential", taxId: "**-***4182", ownershipStake: "100%", recordStatus: "Active" },
  "prop-mission-1247": { portfolio: "Pacific Core Fund II", acquired: "Aug 2019", yearBuilt: 2015, rentableSqFt: 128900, propertyManager: "Greystar", taxId: "**-***7731", ownershipStake: "100%", recordStatus: "Active" },
  "prop-haight-414": { portfolio: "Legacy Holdings", acquired: "Jun 2014", yearBuilt: 1927, rentableSqFt: 11200, propertyManager: "Self-managed", taxId: "**-***2065", ownershipStake: "100%", recordStatus: "Active" },
  "prop-folsom-2200": { portfolio: "Bay Value Add III", acquired: "Nov 2022", yearBuilt: 2003, rentableSqFt: 54600, propertyManager: "Greystar", taxId: "**-***9410", ownershipStake: "90% (JV)", recordStatus: "Active" },
  "prop-broadway-871": { portfolio: "Bay Value Add III", acquired: "Feb 2020", yearBuilt: 1988, rentableSqFt: 62300, propertyManager: "Colliers", taxId: "**-***5528", ownershipStake: "90% (JV)", recordStatus: "Active" },
  "prop-emeryville-5200": { portfolio: "Bay Value Add III", acquired: "Sep 2021", yearBuilt: 1996, rentableSqFt: 44800, propertyManager: "Colliers", taxId: "**-***3097", ownershipStake: "75% (JV)", recordStatus: "Active" },
  "prop-shattuck-2390": { portfolio: "Legacy Holdings", acquired: "Apr 2016", yearBuilt: 1962, rentableSqFt: 18400, propertyManager: "Self-managed", taxId: "**-***6614", ownershipStake: "100%", recordStatus: "Active" },
  "prop-park-1500": { portfolio: "Bay Value Add III", acquired: "Apr 2026", yearBuilt: 1974, rentableSqFt: 29100, propertyManager: "Colliers", taxId: "**-***8820", ownershipStake: "90% (JV)", recordStatus: "In transition" },
  "prop-bridgeway-100": { portfolio: "Marin Coastal JV", acquired: "Mar 2026", yearBuilt: 1984, rentableSqFt: 21700, propertyManager: "Marin Property Group", taxId: "**-***1900", ownershipStake: "50% (JV)", recordStatus: "In transition" },
  "prop-larkin-908": { portfolio: "Pacific Core Fund II", acquired: "Jan 2018", yearBuilt: 2011, rentableSqFt: 71500, propertyManager: "Greystar", taxId: "**-***0908", ownershipStake: "100%", recordStatus: "Active" },
  "prop-grand-2055": { portfolio: "Legacy Holdings", acquired: "May 2015", yearBuilt: 1979, rentableSqFt: 26400, propertyManager: "Colliers", taxId: "**-***2055", ownershipStake: "100%", recordStatus: "Active" },
  "prop-noe-3801": { portfolio: "Legacy Holdings", acquired: "Oct 2013", yearBuilt: 1941, rentableSqFt: 9800, propertyManager: "Self-managed", taxId: "**-***3801", ownershipStake: "100%", recordStatus: "Active" },
};

/* Full session history, newest first — seven cycles, Nov 2025 through the
 * current one, for every property that existed to be reconciled.
 *
 * Two properties carry a short history on purpose, and both are real cases the
 * UI has to handle: 100 Bridgeway was acquired in Mar 2026 and has three
 * closes; 1500 Park was acquired in Apr 2026 and has never been run, which is
 * the "Not started" state.
 *
 * `matched` is authored and `exceptions` is derived from it, so the two can
 * never disagree. See `toSession`. */
const PROPERTY_SESSIONS: Record<string, SessionSpec[]> = {
  "prop-westlake-1849": [
    { id: "sess-wl-may-2", cycle: "May 2026", pass: "Re-run", status: "active", records: 204, matched: 196, open: 8, ranBy: "Maya Chen", finishedOn: "In progress", duration: "18m" },
    { id: "sess-wl-may", cycle: "May 2026", status: "failed", records: 204, matched: 0, open: 204, ranBy: "Maya Chen", finishedOn: "Jun 1", duration: "3m", note: "Ledger export timed out" },
    { id: "sess-wl-apr", cycle: "Apr 2026", status: "complete", records: 205, matched: 203, open: 0, ranBy: "Hassan Ali", finishedOn: "May 1", duration: "47m" },
    { id: "sess-wl-mar", cycle: "Mar 2026", status: "complete", records: 214, matched: 210, open: 0, ranBy: "Hassan Ali", finishedOn: "Apr 5", duration: "48m" },
    { id: "sess-wl-feb", cycle: "Feb 2026", status: "complete", records: 203, matched: 201, open: 0, ranBy: "Maya Chen", finishedOn: "Mar 6", duration: "46m" },
    { id: "sess-wl-jan", cycle: "Jan 2026", status: "complete", records: 212, matched: 210, open: 0, ranBy: "Hassan Ali", finishedOn: "Feb 5", duration: "48m" },
    { id: "sess-wl-dec", cycle: "Dec 2025", status: "complete", records: 200, matched: 195, open: 0, ranBy: "Maya Chen", finishedOn: "Jan 4", duration: "46m" },
    { id: "sess-wl-nov", cycle: "Nov 2025", status: "complete", records: 197, matched: 195, open: 0, ranBy: "Maya Chen", finishedOn: "Dec 3", duration: "45m" },
  ],
  "prop-mission-1247": [
    { id: "sess-mis-may", cycle: "May 2026", status: "complete", records: 303, matched: 295, open: 0, ranBy: "Hassan Ali", finishedOn: "Jun 2", duration: "1h 07m" },
    { id: "sess-mis-apr", cycle: "Apr 2026", status: "complete", records: 331, matched: 329, open: 0, ranBy: "Maya Chen", finishedOn: "May 7", duration: "1h 13m" },
    { id: "sess-mis-mar", cycle: "Mar 2026", status: "complete", records: 317, matched: 315, open: 0, ranBy: "Maya Chen", finishedOn: "Apr 4", duration: "1h 10m" },
    { id: "sess-mis-feb", cycle: "Feb 2026", status: "complete", records: 327, matched: 319, open: 0, ranBy: "Maya Chen", finishedOn: "Mar 1", duration: "1h 12m" },
    { id: "sess-mis-jan", cycle: "Jan 2026", status: "complete", records: 310, matched: 302, open: 0, ranBy: "Maya Chen", finishedOn: "Feb 7", duration: "1h 09m" },
    { id: "sess-mis-dec", cycle: "Dec 2025", status: "complete", records: 316, matched: 308, open: 0, ranBy: "Maya Chen", finishedOn: "Jan 7", duration: "1h 10m" },
    { id: "sess-mis-nov", cycle: "Nov 2025", status: "complete", records: 301, matched: 296, open: 0, ranBy: "Maya Chen", finishedOn: "Dec 4", duration: "1h 07m" },
  ],
  "prop-haight-414": [
    { id: "sess-hgt-may", cycle: "May 2026", status: "complete", records: 43, matched: 42, open: 0, ranBy: "Jordan Ellis", finishedOn: "Jun 5", duration: "13m" },
    { id: "sess-hgt-apr", cycle: "Apr 2026", status: "complete", records: 40, matched: 39, open: 0, ranBy: "Jordan Ellis", finishedOn: "May 6", duration: "12m" },
    { id: "sess-hgt-mar", cycle: "Mar 2026", status: "complete", records: 40, matched: 39, open: 0, ranBy: "Maya Chen", finishedOn: "Apr 4", duration: "12m" },
    { id: "sess-hgt-feb", cycle: "Feb 2026", status: "complete", records: 43, matched: 42, open: 0, ranBy: "Jordan Ellis", finishedOn: "Mar 5", duration: "13m" },
    { id: "sess-hgt-jan", cycle: "Jan 2026", status: "complete", records: 42, matched: 41, open: 0, ranBy: "Jordan Ellis", finishedOn: "Feb 2", duration: "12m" },
    { id: "sess-hgt-dec", cycle: "Dec 2025", status: "complete", records: 40, matched: 39, open: 0, ranBy: "Maya Chen", finishedOn: "Jan 5", duration: "12m" },
    { id: "sess-hgt-nov", cycle: "Nov 2025", status: "complete", records: 41, matched: 40, open: 0, ranBy: "Jordan Ellis", finishedOn: "Dec 4", duration: "12m" },
  ],
  "prop-folsom-2200": [
    { id: "sess-fol-may", cycle: "May 2026", status: "complete", records: 139, matched: 137, open: 0, ranBy: "Jordan Ellis", finishedOn: "Jun 2", duration: "33m" },
    { id: "sess-fol-apr", cycle: "Apr 2026", status: "complete", records: 147, matched: 143, open: 0, ranBy: "Jordan Ellis", finishedOn: "May 1", duration: "34m" },
    { id: "sess-fol-mar", cycle: "Mar 2026", status: "complete", records: 139, matched: 134, open: 0, ranBy: "Jordan Ellis", finishedOn: "Apr 3", duration: "33m" },
    { id: "sess-fol-feb", cycle: "Feb 2026", status: "complete", records: 148, matched: 145, open: 0, ranBy: "Hassan Ali", finishedOn: "Mar 3", duration: "35m" },
    { id: "sess-fol-jan", cycle: "Jan 2026", status: "complete", records: 144, matched: 143, open: 0, ranBy: "Jordan Ellis", finishedOn: "Feb 6", duration: "34m" },
    { id: "sess-fol-dec", cycle: "Dec 2025", status: "complete", records: 143, matched: 138, open: 0, ranBy: "Jordan Ellis", finishedOn: "Jan 6", duration: "34m" },
    { id: "sess-fol-nov", cycle: "Nov 2025", status: "complete", records: 130, matched: 127, open: 0, ranBy: "Hassan Ali", finishedOn: "Dec 4", duration: "31m" },
  ],
  "prop-broadway-871": [
    { id: "sess-bwy-may", cycle: "May 2026", status: "active", records: 96, matched: 93, open: 3, ranBy: "Hassan Ali", finishedOn: "In progress", duration: "24m" },
    { id: "sess-bwy-apr", cycle: "Apr 2026", status: "failed", records: 100, matched: 0, open: 100, ranBy: "Priya Raman", finishedOn: "May 6", duration: "2m", note: "Ledger period mismatch" },
    { id: "sess-bwy-mar", cycle: "Mar 2026", status: "complete", records: 96, matched: 93, open: 0, ranBy: "Priya Raman", finishedOn: "Apr 6", duration: "24m" },
    { id: "sess-bwy-feb", cycle: "Feb 2026", status: "complete", records: 101, matched: 98, open: 0, ranBy: "Hassan Ali", finishedOn: "Mar 2", duration: "25m" },
    { id: "sess-bwy-jan", cycle: "Jan 2026", status: "complete", records: 99, matched: 97, open: 0, ranBy: "Hassan Ali", finishedOn: "Feb 5", duration: "24m" },
    { id: "sess-bwy-dec", cycle: "Dec 2025", status: "complete", records: 98, matched: 96, open: 0, ranBy: "Priya Raman", finishedOn: "Jan 3", duration: "24m" },
    { id: "sess-bwy-nov", cycle: "Nov 2025", status: "complete", records: 92, matched: 90, open: 0, ranBy: "Hassan Ali", finishedOn: "Dec 7", duration: "23m" },
  ],
  "prop-emeryville-5200": [
    { id: "sess-emv-may", cycle: "May 2026", status: "failed", records: 73, matched: 0, open: 73, ranBy: "Jordan Ellis", finishedOn: "Jun 2", duration: "3m", note: "Statement file unreadable" },
    { id: "sess-emv-apr", cycle: "Apr 2026", status: "complete", records: 72, matched: 71, open: 0, ranBy: "Priya Raman", finishedOn: "May 4", duration: "19m" },
    { id: "sess-emv-mar", cycle: "Mar 2026", status: "complete", records: 77, matched: 75, open: 0, ranBy: "Priya Raman", finishedOn: "Apr 7", duration: "20m" },
    { id: "sess-emv-feb", cycle: "Feb 2026", status: "complete", records: 78, matched: 77, open: 0, ranBy: "Priya Raman", finishedOn: "Mar 1", duration: "20m" },
    { id: "sess-emv-jan", cycle: "Jan 2026", status: "complete", records: 74, matched: 72, open: 0, ranBy: "Priya Raman", finishedOn: "Feb 3", duration: "19m" },
    { id: "sess-emv-dec", cycle: "Dec 2025", status: "complete", records: 74, matched: 71, open: 0, ranBy: "Priya Raman", finishedOn: "Jan 3", duration: "19m" },
    { id: "sess-emv-nov", cycle: "Nov 2025", status: "complete", records: 74, matched: 72, open: 0, ranBy: "Priya Raman", finishedOn: "Dec 5", duration: "19m" },
  ],
  "prop-shattuck-2390": [
    { id: "sess-sha-may", cycle: "May 2026", status: "active", records: 50, matched: 48, open: 2, ranBy: "Priya Raman", finishedOn: "In progress", duration: "14m" },
    { id: "sess-sha-apr", cycle: "Apr 2026", status: "complete", records: 55, matched: 54, open: 0, ranBy: "Priya Raman", finishedOn: "May 1", duration: "15m" },
    { id: "sess-sha-mar", cycle: "Mar 2026", status: "complete", records: 53, matched: 52, open: 0, ranBy: "Jordan Ellis", finishedOn: "Apr 1", duration: "15m" },
    { id: "sess-sha-feb", cycle: "Feb 2026", status: "complete", records: 54, matched: 54, open: 0, ranBy: "Priya Raman", finishedOn: "Mar 4", duration: "15m" },
    { id: "sess-sha-jan", cycle: "Jan 2026", status: "complete", records: 50, matched: 50, open: 0, ranBy: "Priya Raman", finishedOn: "Feb 3", duration: "14m" },
    { id: "sess-sha-dec", cycle: "Dec 2025", status: "complete", records: 51, matched: 49, open: 0, ranBy: "Priya Raman", finishedOn: "Jan 2", duration: "14m" },
    { id: "sess-sha-nov", cycle: "Nov 2025", status: "complete", records: 49, matched: 48, open: 0, ranBy: "Priya Raman", finishedOn: "Dec 2", duration: "14m" },
  ],
  "prop-larkin-908": [
    { id: "sess-lar-may", cycle: "May 2026", status: "failed", records: 168, matched: 0, open: 168, ranBy: "Jordan Ellis", finishedOn: "Jun 5", duration: "2m", note: "Ledger totals out of tolerance" },
    { id: "sess-lar-apr", cycle: "Apr 2026", status: "complete", records: 160, matched: 157, open: 0, ranBy: "Jordan Ellis", finishedOn: "May 6", duration: "37m" },
    { id: "sess-lar-mar", cycle: "Mar 2026", status: "complete", records: 156, matched: 153, open: 0, ranBy: "Jordan Ellis", finishedOn: "Apr 6", duration: "36m" },
    { id: "sess-lar-feb", cycle: "Feb 2026", status: "complete", records: 159, matched: 154, open: 0, ranBy: "Jordan Ellis", finishedOn: "Mar 1", duration: "37m" },
    { id: "sess-lar-jan", cycle: "Jan 2026", status: "complete", records: 169, matched: 165, open: 0, ranBy: "Jordan Ellis", finishedOn: "Feb 7", duration: "39m" },
    { id: "sess-lar-dec", cycle: "Dec 2025", status: "complete", records: 157, matched: 155, open: 0, ranBy: "Jordan Ellis", finishedOn: "Jan 4", duration: "36m" },
    { id: "sess-lar-nov", cycle: "Nov 2025", status: "complete", records: 156, matched: 152, open: 0, ranBy: "Jordan Ellis", finishedOn: "Dec 3", duration: "36m" },
  ],
  "prop-grand-2055": [
    { id: "sess-grd-may", cycle: "May 2026", status: "complete", records: 61, matched: 60, open: 0, ranBy: "Maya Chen", finishedOn: "Jun 1", duration: "16m" },
    { id: "sess-grd-apr", cycle: "Apr 2026", status: "complete", records: 56, matched: 55, open: 0, ranBy: "Priya Raman", finishedOn: "May 4", duration: "15m" },
    { id: "sess-grd-mar", cycle: "Mar 2026", status: "complete", records: 56, matched: 54, open: 0, ranBy: "Priya Raman", finishedOn: "Apr 1", duration: "15m" },
    { id: "sess-grd-feb", cycle: "Feb 2026", status: "complete", records: 59, matched: 58, open: 0, ranBy: "Priya Raman", finishedOn: "Mar 4", duration: "16m" },
    { id: "sess-grd-jan", cycle: "Jan 2026", status: "complete", records: 55, matched: 54, open: 0, ranBy: "Priya Raman", finishedOn: "Feb 7", duration: "15m" },
    { id: "sess-grd-dec", cycle: "Dec 2025", status: "complete", records: 56, matched: 55, open: 0, ranBy: "Priya Raman", finishedOn: "Jan 6", duration: "15m" },
    { id: "sess-grd-nov", cycle: "Nov 2025", status: "complete", records: 56, matched: 55, open: 0, ranBy: "Priya Raman", finishedOn: "Dec 7", duration: "15m" },
  ],
  "prop-noe-3801": [
    { id: "sess-noe-may", cycle: "May 2026", status: "complete", records: 32, matched: 32, open: 0, ranBy: "Maya Chen", finishedOn: "Jun 6", duration: "10m" },
    { id: "sess-noe-apr", cycle: "Apr 2026", status: "complete", records: 32, matched: 32, open: 0, ranBy: "Maya Chen", finishedOn: "May 7", duration: "10m" },
    { id: "sess-noe-mar", cycle: "Mar 2026", status: "complete", records: 35, matched: 35, open: 0, ranBy: "Jordan Ellis", finishedOn: "Apr 3", duration: "11m" },
    { id: "sess-noe-feb", cycle: "Feb 2026", status: "complete", records: 31, matched: 31, open: 0, ranBy: "Maya Chen", finishedOn: "Mar 3", duration: "10m" },
    { id: "sess-noe-jan", cycle: "Jan 2026", status: "complete", records: 31, matched: 30, open: 0, ranBy: "Maya Chen", finishedOn: "Feb 5", duration: "10m" },
    { id: "sess-noe-dec", cycle: "Dec 2025", status: "complete", records: 32, matched: 31, open: 0, ranBy: "Maya Chen", finishedOn: "Jan 4", duration: "10m" },
    { id: "sess-noe-nov", cycle: "Nov 2025", status: "complete", records: 31, matched: 30, open: 0, ranBy: "Maya Chen", finishedOn: "Dec 6", duration: "10m" },
  ],
  "prop-bridgeway-100": [
    { id: "sess-bwa-may", cycle: "May 2026", status: "active", records: 25, matched: 23, open: 2, ranBy: "Maya Chen", finishedOn: "In progress", duration: "9m" },
    { id: "sess-bwa-apr", cycle: "Apr 2026", status: "complete", records: 25, matched: 24, open: 0, ranBy: "Maya Chen", finishedOn: "May 4", duration: "9m" },
    { id: "sess-bwa-mar", cycle: "Mar 2026", status: "complete", records: 25, matched: 25, open: 0, ranBy: "Jordan Ellis", finishedOn: "Apr 3", duration: "9m" },
  ],
  "prop-park-1500": [],
};

/* One property, assembled from its three authored parts and its session
 * history. Everything about "how is this going" is read off the sessions, so
 * the roster, the Dashboard and the property page cannot disagree about a
 * property they are all describing from the same rows. */
function assembleProperty(p: PropertySeed): PropertyRecord {
  const sessions = (PROPERTY_SESSIONS[p.id] ?? []).map(toSession);
  /* Newest first, so the first match in the current cycle is the live one —
   * which for a re-run is the re-run, not the attempt it replaced. */
  const current = sessions.find((x) => x.cycle === CURRENT_CYCLE);
  const lastClosed = sessions.find((x) => x.status === "complete");

  const state: StatusKey = current ? statusKeyOf(current.status) : "not-started";
  const closeStatus: CloseStatus =
    state === "completed"
      ? "closed"
      : state === "failed"
      ? "failed"
      : state === "review"
      ? "in-review"
      : "open";

  return {
    ...p,
    ...PROPERTY_PROFILES[p.id],
    sessions,
    period: CURRENT_CYCLE,
    currentSession: current,
    state,
    closeStatus,
    openItems: current?.openItems ?? 0,
    exceptions: current?.exceptions ?? 0,
    tieOut:
      state === "completed" ? "Tied" : state === "failed" ? "Untied" : "Pending",
    lastReconciled: lastClosed?.cycle ?? "Never",
  };
}

export const properties: PropertyRecord[] = propertySeeds.map(assembleProperty);

/* Fast lookups. Every navigation in the app resolves a property or a session
 * by id, and doing it with a linear scan in each caller is how the two id
 * namespaces ("ws-…" and "prop-…") drifted apart unnoticed. */
export const propertyById: Record<string, PropertyRecord> = Object.fromEntries(
  properties.map((p) => [p.id, p])
);

export const propertyByCode: Record<string, PropertyRecord> = Object.fromEntries(
  properties.map((p) => [p.code, p])
);

/* sessionId -> the session and the property it belongs to. */
export const sessionIndex: Record<
  string,
  { session: PropertySession; property: PropertyRecord }
> = Object.fromEntries(
  properties.flatMap((property) =>
    property.sessions.map((session) => [session.id, { session, property }])
  )
);

export function findSession(sessionId: string | null | undefined) {
  return sessionId ? sessionIndex[sessionId] ?? null : null;
}

/* Every cycle any session covers, newest first. Derived, so onboarding a
 * property with older history makes the picker offer those cycles instead of
 * listing five months the data cannot answer for. */
export const cycleOptions: string[] = (() => {
  const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const rank = (c: string) => {
    const [mon, year] = c.split(" ");
    return Number(year) * 12 + MONTHS.indexOf(mon);
  };
  const seen = new Set<string>();
  for (const p of properties) for (const x of p.sessions) seen.add(x.cycle);
  return Array.from(seen).sort((a, b) => rank(b) - rank(a));
})();

/* Every session belonging to one cycle, across the portfolio. This is the
 * Dashboard's list, and it is what makes the cycle picker mean something. */
/* The cycle before a given one, as the picker knows it. Trend labels read
 * "+2 vs Apr" and used to hardcode "Apr" while the picker above them could say
 * any month — so choosing January produced "vs Apr". */
export function previousCycle(cycle: string): string | null {
  const i = cycleOptions.indexOf(cycle);
  return i >= 0 && i + 1 < cycleOptions.length ? cycleOptions[i + 1] : null;
}

/* Just the month, for a compact comparison label: "Apr 2026" -> "Apr". */
export function shortCycle(cycle: string): string {
  return cycle.split(" ")[0];
}

export function sessionsInCycle(
  cycle: string
): { session: PropertySession; property: PropertyRecord }[] {
  return properties.flatMap((property) =>
    property.sessions
      .filter((session) => session.cycle === cycle)
      .map((session) => ({ session, property }))
  );
}

/* ---- The Reconciliation nav's view of the same twelve properties ---- */

/* Plural that reads right at a count of one. The rows print "1 session · 2
 * accounts", not "1 Sessions · 2 Banks". */
function count(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function toWorkspace(p: PropertyRecord): PropertyWorkspace {
  return {
    id: p.id,
    address: p.address,
    shortAddress: p.shortAddress,
    code: p.code,
    cityState: p.cityState,
    lastClosed: p.lastReconciled,
    banks: p.banks.map((b) => ({ logoSrc: b.logoSrc, shortName: b.shortName })),
    meta: `${count(p.sessions.length, "session")} · ${count(
      p.banks.length,
      "account"
    )}`,
    sessionCount: p.sessions.length,
    bankCount: p.banks.length,
    status: p.currentSession?.status ?? null,
    state: p.state,
    sessions: p.sessions.map((x) => ({
      id: x.id,
      label: x.label,
      cycle: x.cycle,
      status: x.status,
      statusKey: x.statusKey,
      statusLabel: x.statusLabel,
    })),
  };
}

/* Ordered so the properties that want a person are at the top — a reader
 * opening the nav is triaging, not browsing alphabetically. */
const NAV_RANK: Record<StatusKey, number> = {
  failed: 0,
  review: 1,
  active: 2,
  "not-started": 3,
  completed: 4,
};

export const workspaces: PropertyWorkspace[] = properties
  .map(toWorkspace)
  .sort(
    (a, b) =>
      NAV_RANK[a.state] - NAV_RANK[b.state] ||
      a.shortAddress.localeCompare(b.shortAddress)
  );

/* The property the workspace opens on when nothing else is chosen: the one
 * with live work on it. Derived rather than pinned, so it follows the data. */
export const activeProperty: PropertyWorkspace =
  workspaces.find((w) => w.state === "review") ?? workspaces[0];

/* Kept as a name because several surfaces render "the rest" beneath the
 * active one. It is simply `workspaces` minus that row. */
export const otherWorkspaces: PropertyWorkspace[] = workspaces.filter(
  (w) => w.id !== activeProperty.id
);

export const workspaceById: Record<string, PropertyWorkspace> =
  Object.fromEntries(workspaces.map((w) => [w.id, w]));

/* `PropertyState` and `PROPERTY_STATE_LABEL` were a second copy of the status
 * vocabulary, and a third label table lived in the nav's filter menu. They are
 * now aliases of the one table at the top of this file — see `StatusKey` and
 * `STATUS_META`. Kept as names so existing call sites keep reading well. */
export type PropertyState = StatusKey;

export const PROPERTY_STATE_LABEL: Record<PropertyState, string> =
  Object.fromEntries(
    (Object.keys(STATUS_META) as StatusKey[]).map((k) => [
      k,
      STATUS_META[k].label,
    ])
  ) as Record<PropertyState, string>;

export function propertyState(p: PropertyRecord): PropertyState {
  return p.state;
}

/* Distinct markets and portfolios present in the roster, for the filter menus.
 * Derived rather than hardcoded, so onboarding a property in a new market makes
 * the filter offer it without a second edit. */
export const propertyMarkets: string[] = Array.from(
  new Set(properties.map((p) => p.market))
).sort();

export const propertyPortfolios: string[] = Array.from(
  new Set(properties.map((p) => p.portfolio))
).sort();

/* One concrete set of accounts, for the design-system page, which renders the
 * pair cards out of any session's context. Product screens call `banksFor`
 * with the property whose session is actually open. */
export const propertyBanks: PropertyBank[] = banksFor(propertyByCode["TH-1247"]);

/* The pairs behind those accounts. */
export const uploadPairs: UploadPair[] = propertyBanks
  .map((b) => b.uploaded)
  .filter((x): x is UploadPair => Boolean(x));

/* The three agents' figures for any cycle.
 *
 * Runs are COUNTED off that cycle's sessions: intake runs once per session,
 * reconciliation on the ones intake got through, and summary on the ones that
 * reached a decision. Token spend for an earlier cycle is that cycle's total
 * from the trend series, split on the current cycle's observed mix — the seed
 * has no per-agent history, and scaling the mix is honest in a way that
 * reprinting May's absolute figures under a January label is not.
 *
 * The current cycle returns the authored profiles untouched. */
export function aiAgentsFor(cycle: string): AIAgentProfile[] {
  const rows = sessionsInCycle(cycle);
  if (rows.length === 0) return [];

  const started = rows.length;
  const failed = rows.filter((r) => r.session.status === "failed").length;
  /* Two of every three failures break during intake, one during matching —
   * the mix the failure notes describe. */
  const intakeFailed = Math.round((failed * 2) / 3);
  const reconStarted = started - intakeFailed;
  const reconFailed = failed - intakeFailed;
  const summaryStarted = reconStarted - reconFailed;

  const runsFor: Record<AIAgentKey, { runs: number; succeeded: number }> = {
    intake: { runs: started, succeeded: started - intakeFailed },
    reconciliation: { runs: reconStarted, succeeded: reconStarted - reconFailed },
    /* A summary can need a human correction without the session failing. */
    summary: {
      runs: summaryStarted,
      succeeded: Math.max(0, summaryStarted - (summaryStarted >= 5 ? 1 : 0)),
    },
  };

  const authoredTotal = aiAgents.reduce((n, a) => n + a.tokens, 0);
  const point = aiThroughput.find((p) => p.cycle === cycle);
  const scale = point ? point.tokens / authoredTotal : 1;
  const round = (n: number) => Math.round((n * scale) / 1000) * 1000;

  return aiAgents.map((a) => ({
    ...a,
    ...runsFor[a.key],
    tokens: round(a.tokens),
    tokensIn: round(a.tokensIn),
    tokensOut: round(a.tokensOut),
    tokensCached: round(a.tokensCached),
  }));
}

/* Cycle-by-cycle trend.
 *
 * `cycle` is the full label so it can be matched against the picker, and
 * `lines` is COUNTED off the sessions rather than authored — the series used to
 * claim 1,120 lines for April while the sessions behind April added up to
 * something else entirely. The three figures the seed cannot derive
 * (success rate, reviewer hours, token spend) stay authored; the May point's
 * success rate is the same number `aiObservability.accuracy` reports, and its
 * token total is `aiObservability.tokensUsed`. */
const THROUGHPUT_AUTHORED: {
  cycle: string;
  successRate: number;
  reviewerHours: number;
  tokens: number;
}[] = [
  { cycle: "Dec 2025", successRate: 82, reviewerHours: 61, tokens: 1_020_000 },
  { cycle: "Jan 2026", successRate: 84, reviewerHours: 55, tokens: 1_060_000 },
  { cycle: "Feb 2026", successRate: 86, reviewerHours: 48, tokens: 1_105_000 },
  { cycle: "Mar 2026", successRate: 87, reviewerHours: 41, tokens: 1_160_000 },
  { cycle: "Apr 2026", successRate: 88, reviewerHours: 34, tokens: 1_348_000 },
  { cycle: "May 2026", successRate: 90, reviewerHours: 26, tokens: 1_240_000 },
];

export const aiThroughput: AIThroughputPoint[] = THROUGHPUT_AUTHORED.map((p) => ({
  ...p,
  lines: sessionsInCycle(p.cycle).reduce((n, x) => n + x.session.matched, 0),
}));

// ---- Dashboard data (action inbox, cross-portfolio) ----

/** Which dashboard tab a run belongs to. One field, no derivation, no drift. */
export type DashboardState = "review" | "failed" | "completed";

export interface DashboardSession {
  id: string;
  /** The session this row opens. */
  sessionId: string;
  /** The property that session belongs to. */
  propertyId: string;
  /** Primary line. The property is what the reader is looking for. */
  property: string;
  propertyCode: string;
  legalEntity: string;
  /** Accounting period, secondary to the property. */
  cycle: string;
  /** "May 2026 · Re-run" where a cycle ran twice. */
  label: string;
  state: DashboardState;
  /** One line of context: why it failed, or how far it got. */
  detail: string;
  /** Named accounts, so the statement count and its tooltip agree. */
  banks: string[];
  /* ---- Progress, as the listing reports it ----
   * A session's shape is: N statements come in, each is reconciled against a
   * ledger, and that produces matched records plus whatever is left over. The
   * listing shows all four because together they answer "how far along is this
   * and how much is left", which is the only question a triage row has to
   * answer. */
  /** Ledgers reconciled, out of the accounts this property has. */
  ledgersDone: number;
  ledgersTotal: number;
  /** Records the agent matched. */
  recordsReconciled: number;
  /** Records still unresolved. Zero is the goal; non-zero is the work. */
  outstanding: number;
  /** Minutes since last worked on. Drives both the sort and the label. */
  minutesAgo: number;
}

/* ---- Dashboard listing ----
 *
 * The Dashboard is one cycle's inbox across the whole portfolio, so its rows
 * ARE the sessions belonging to that cycle. It used to be a hand-maintained
 * array of eighteen rows describing "eighteen properties" — of which twelve
 * existed, six appeared twice in contradictory states, and none of the record
 * counts matched what the property page said about the same run.
 *
 * Everything below is derived from `properties`, so the Dashboard cannot
 * disagree with the roster, the nav, or the session it opens.
 *
 * State meanings, which is what decides the tab a row lands in:
 *   review    — the agent finished and a person has to decide something
 *   failed    — the run broke; it needs a fix and a re-run
 *   completed — approved and written back to Yardi */

/* How long ago this row was last touched, in minutes. Derived from the run's
 * own shape rather than authored, so the relative label and the sort order are
 * the same fact: live work is minutes old, a failure is hours old, and a closed
 * cycle is days old. Deterministic per session id — the prototype must render
 * the same list on every load. */
function minutesAgoFor(session: PropertySession): number {
  let h = 0;
  for (let i = 0; i < session.id.length; i++) {
    h = (h * 31 + session.id.charCodeAt(i)) | 0;
  }
  const spread = Math.abs(h);
  /* Spread across the buckets rather than within a narrow band: four live
   * sessions that all render "2h ago" read as a placeholder, not as a list
   * someone has been working through. Nor are the values multiples of an hour,
   * which is the other way a timestamp column announces itself as fake. */
  if (session.status === "active") return 7 + (spread % 613);
  if (session.status === "failed") return 190 + (spread % 2_237);
  return 1_450 + (spread % 17_293);
}

/* Ledgers reconciled out of the property's accounts. A failed run got through
 * none of them; a closed one got through all; a run in review is one account
 * short exactly when it still has open items against it. */
function ledgersDoneFor(session: PropertySession, accounts: number): number {
  if (session.status === "failed") return 0;
  if (session.status === "complete") return accounts;
  return Math.max(1, accounts - (session.openItems > 0 ? 1 : 0));
}

function toDashboardSession(
  session: PropertySession,
  property: PropertyRecord
): DashboardSession {
  const state: DashboardState =
    session.status === "failed"
      ? "failed"
      : session.status === "complete"
      ? "completed"
      : "review";
  return {
    id: session.id,
    sessionId: session.id,
    propertyId: property.id,
    property: `${property.shortAddress} · ${property.cityState}`,
    propertyCode: property.code,
    legalEntity: property.legalEntity,
    cycle: session.cycle,
    label: session.label,
    state,
    detail: session.note ?? `${session.matched} of ${session.records} matched`,
    banks: property.banks.map((b) => `${b.shortName} ${b.type}`),
    ledgersDone: ledgersDoneFor(session, property.banks.length),
    ledgersTotal: property.banks.length,
    recordsReconciled: session.matched,
    outstanding: session.openItems,
    minutesAgo: minutesAgoFor(session),
  };
}

/* Every session in a given cycle, as Dashboard rows, most recently worked on
 * first. */
export function dashboardSessionsFor(cycle: string): DashboardSession[] {
  return sessionsInCycle(cycle)
    .map(({ session, property }) => toDashboardSession(session, property))
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
}

/* The current cycle's rows. Kept as a constant because several surfaces want
 * "now" without threading a cycle through. */
export const dashboardSessions: DashboardSession[] =
  dashboardSessionsFor(CURRENT_CYCLE);

/* "Closed" was the wrong word and it was doing real damage: a reader could not
 * tell whether it meant the AI finished, a human approved, or the numbers
 * reached Yardi. The milestone that matters is the last one — approved and
 * written back to the system of record — so the label says that.
 *
 * Both figures are counted off the same rows the list below renders, so the
 * progress bar and the tab counts can never disagree. */
export function cyclePulseFor(cycle: string) {
  const rows = dashboardSessionsFor(cycle);
  return {
    label: `${cycle} close`,
    /** Sessions approved and written back to Yardi. */
    posted: rows.filter((r) => r.state === "completed").length,
    total: rows.length,
  };
}

export const dashboardCyclePulse = cyclePulseFor(CURRENT_CYCLE);

// ---- Review canvas — reconciled records ----
//
// The destination for "Review 68 records" on the Summary agent panel.
// All 68 records are enumerated: 8 flagged (handwritten — this is where the
// reviewer's attention goes) and 60 approved. The list IS the source of
// truth — the review tabs, the drawer's stats band, and the workspace
// summary band all count the same records, so no surface can disagree with
// another about the same run.

export type RecordStatus = "approved" | "flagged";

/* A `PropertyBankMapping.id` — the account the record was matched against.
 * It used to be a four-value union pinned to 1849 Westlake's accounts, which
 * is why no other property could have records at all. */
export type RecordBankId = string;

/* 1849 Westlake's four accounts, by the id its bank mappings actually carry.
 * The handwritten records below reference these rather than repeating the
 * strings, so renaming an account is one edit. */
const WL_CHASE_OP = "bm-chase-operating-3421";
const WL_WELLS_SD = "bm-wells-security-deposit-7782";
const WL_BOA_RES = "bm-boa-reserve-9034";
const WL_CHASE_ESCROW = "bm-chase-escrow-8856";

export interface RecordItem {
  id: string;
  bankId: RecordBankId;
  status: RecordStatus;
  date: string; // ISO short, e.g. "2026-05-12"
  title: string;
  amount: number; // signed dollars; positive = inflow, negative = outflow
  confidence: number; // 0–100
  reason: string; // one line, why approved or flagged
  evidence: string[];
}

/* Compact display name for an account, used where a record has to say which
 * account it came from in very little room (the review canvas's logo filter,
 * a record row's leading chip). "Chase Op", not "JPMorgan Chase Bank, N.A.
 * Operating". */
const TYPE_ABBREV: Record<string, string> = {
  Operating: "Op",
  "Security Deposit": "SD",
  Reserve: "Res",
  "Capital Reserve": "Res",
  Escrow: "Escrow",
  "Tax Escrow": "Escrow",
};

type AccountMeta = {
  shortName: string;
  logoSrc: string;
  type: string;
  account: string;
};

/* Built on first use: the roster this reads is declared further down the file
 * (records are described before properties are), and a module-level constant
 * here would evaluate before it exists. */
let accountMetaCache: Record<string, AccountMeta> | null = null;

function accountMeta(): Record<string, AccountMeta> {
  if (!accountMetaCache) {
    accountMetaCache = Object.fromEntries(
      properties.flatMap((p) =>
        p.banks.map((b) => [
          b.id,
          {
            shortName: `${b.shortName} ${TYPE_ABBREV[b.type] ?? b.type}`,
            logoSrc: b.logoSrc,
            type: b.type,
            account: b.account,
          },
        ])
      )
    );
  }
  return accountMetaCache;
}

const UNKNOWN_ACCOUNT = {
  shortName: "Unknown account",
  logoSrc: "/logos/chase.png",
  type: "Operating",
  account: "******0000",
};

export function getBankMeta(bankId: RecordBankId): AccountMeta {
  return accountMeta()[bankId] ?? UNKNOWN_ACCOUNT;
}

/* Flagged records are handwritten — each one is a distinct kind of exception
 * the reviewer has to reason about, so the content carries the design. */
const FLAGGED_RECORDS: RecordItem[] = [
  {
    id: "rec-f-1",
    bankId: WL_CHASE_OP,
    status: "flagged",
    date: "2026-05-12",
    title: "Stripe payout",
    amount: 4318.42,
    confidence: 32,
    reason: "No matching ledger entry within ±3 days",
    evidence: ["Statement line 47", "No ledger match in GL 1010"],
  },
  {
    id: "rec-f-2",
    bankId: WL_BOA_RES,
    status: "flagged",
    date: "2026-05-15",
    title: "Refund #4912",
    amount: -210.0,
    confidence: 48,
    reason: "2 candidate ledger entries · ambiguous",
    evidence: ["Statement line 88", "Ledger row 142", "Ledger row 154"],
  },
  {
    id: "rec-f-3",
    bankId: WL_WELLS_SD,
    status: "flagged",
    date: "2026-05-20",
    title: "Tenant ACH return · unit 308",
    amount: -1200.0,
    confidence: 27,
    reason: "Amount mismatch vs ledger ($1,200 vs $1,275)",
    evidence: ["Statement line 31", "Ledger row 78"],
  },
  {
    id: "rec-f-4",
    bankId: WL_CHASE_ESCROW,
    status: "flagged",
    date: "2026-05-03",
    title: "Wire transfer · title company",
    amount: -8500.0,
    confidence: 41,
    reason: "Unfamiliar counterparty · first occurrence",
    evidence: ["Statement line 12", "No prior reference"],
  },
  {
    id: "rec-f-5",
    bankId: WL_BOA_RES,
    status: "flagged",
    date: "2026-05-22",
    title: "BoA fee · FX-042 assessment",
    amount: -42.5,
    confidence: 19,
    reason: "New fee code · no mapping in property setup",
    evidence: ["Statement line 102", "GL chart missing code FX-042"],
  },
  {
    id: "rec-f-6",
    bankId: WL_CHASE_OP,
    status: "flagged",
    date: "2026-05-28",
    title: "Reversal · Stripe payout #4319",
    amount: -4318.42,
    confidence: 38,
    reason: "Reverses earlier flagged transaction",
    evidence: ["Statement line 121", "Same amount as the unmatched Stripe payout"],
  },
  {
    id: "rec-f-7",
    bankId: WL_CHASE_ESCROW,
    status: "flagged",
    date: "2026-05-09",
    title: "Earnest money deposit · unit 412",
    amount: 5000.0,
    confidence: 52,
    reason: "Date mismatch vs ledger (off by 4 days)",
    evidence: ["Statement line 22", "Ledger row 64"],
  },
  {
    id: "rec-f-8",
    bankId: WL_BOA_RES,
    status: "flagged",
    date: "2026-05-30",
    title: "BoA fee · FX-051 wire assessment",
    amount: -38.75,
    confidence: 23,
    reason: "New fee code · no mapping in property setup",
    evidence: ["Statement line 138", "GL chart missing code FX-051"],
  },
];

/* Approved records with story value — the ones other seed data references
 * (the unit 308 deposit that explains rec-f-3's mismatch, the capex draw the
 * activity narrates). The rest of the approved bucket is generated below. */
const APPROVED_SEED: RecordItem[] = [
  {
    id: "rec-a-1",
    bankId: WL_CHASE_OP,
    status: "approved",
    date: "2026-05-01",
    title: "Tenant ACH · unit 102",
    amount: 2400.0,
    confidence: 98,
    reason: "Exact match · same day · same counterparty",
    evidence: ["Statement line 4", "Ledger row 4"],
  },
  {
    id: "rec-a-2",
    bankId: WL_CHASE_OP,
    status: "approved",
    date: "2026-05-01",
    title: "Tenant ACH · unit 204",
    amount: 2750.0,
    confidence: 99,
    reason: "Exact match · same day · same counterparty",
    evidence: ["Statement line 5", "Ledger row 5"],
  },
  {
    id: "rec-a-3",
    bankId: WL_WELLS_SD,
    status: "approved",
    date: "2026-05-02",
    title: "Security deposit · unit 308",
    amount: 1275.0,
    confidence: 96,
    reason: "Amount + date match · ledger row 12",
    evidence: ["Statement line 9", "Ledger row 12"],
  },
  {
    id: "rec-a-4",
    bankId: WL_BOA_RES,
    status: "approved",
    date: "2026-05-05",
    title: "Capex transfer · roof replacement",
    amount: -22000.0,
    confidence: 94,
    reason: "Matched to approved capex budget line",
    evidence: ["Statement line 14", "Ledger row 18", "Capex memo MAY-04"],
  },
  {
    id: "rec-a-5",
    bankId: WL_CHASE_ESCROW,
    status: "approved",
    date: "2026-05-07",
    title: "Earnest money refund · failed closing",
    amount: -7500.0,
    confidence: 91,
    reason: "Matches prior escrow deposit · same counterparty",
    evidence: ["Statement line 17", "Ledger row 21"],
  },
  {
    id: "rec-a-6",
    bankId: WL_WELLS_SD,
    status: "approved",
    date: "2026-05-10",
    title: "Interest credit",
    amount: 18.42,
    confidence: 99,
    reason: "Routine interest posting · monthly pattern",
    evidence: ["Statement line 26", "Ledger row 30"],
  },
];

/* The remaining 54 approved records are generated from per-bank tuples rather
 * than handwritten. Matched pairs are mundane by definition; what matters is
 * that they exist — with the full 68 enumerated, the bank totals
 * (14/18/22/14) and the 60/8 split are facts of this list rather than
 * assertions three surfaces used to make independently (and differently).
 * Tuple: [bank, day-of-May, title, amount, confidence, reason index,
 * statement line, ledger row]. */
const APPROVED_REASONS = [
  "Exact match · same day · same counterparty",
  "Amount + date match · single candidate",
  "Matched recurring pattern · monthly",
  "Counterparty + amount match · 1 day apart",
] as const;

type ApprovedFillRow = [
  RecordBankId,
  number,
  string,
  number,
  number,
  number,
  number,
  number
];

const APPROVED_FILL_ROWS: ApprovedFillRow[] = [
  // Chase Operating — rent ACH, recurring drafts, vendor payments (10)
  [WL_CHASE_OP, 1, "Tenant ACH · unit 301", 2150.0, 98, 0, 6, 6],
  [WL_CHASE_OP, 1, "Tenant ACH · unit 118", 1980.0, 97, 0, 7, 7],
  [WL_CHASE_OP, 2, "Tenant ACH batch · units 210–214", 11250.0, 95, 1, 9, 11],
  [WL_CHASE_OP, 5, "Laundry revenue · CSC ServiceWorks", 412.5, 96, 2, 18, 22],
  [WL_CHASE_OP, 6, "Utility draft · Seattle City Light", -1842.17, 97, 2, 21, 25],
  [WL_CHASE_OP, 8, "Vendor ACH · Evergreen Landscaping", -950.0, 94, 1, 28, 31],
  [WL_CHASE_OP, 12, "Management fee draft", -4200.0, 99, 2, 46, 50],
  [WL_CHASE_OP, 15, "Tenant ACH · unit 407", 2400.0, 93, 3, 58, 61],
  [WL_CHASE_OP, 20, "Utility draft · Seattle Public Utilities", -1216.44, 97, 2, 74, 79],
  [WL_CHASE_OP, 30, "Payroll transfer · property staff", -6390.0, 96, 0, 128, 133],
  // Wells Security Deposits — receipts, move-out refunds (15)
  [WL_WELLS_SD, 2, "Security deposit · unit 112", 1950.0, 98, 0, 10, 13],
  [WL_WELLS_SD, 3, "Security deposit · unit 224", 2100.0, 98, 0, 11, 14],
  [WL_WELLS_SD, 5, "Deposit refund · unit 305 move-out", -1275.0, 95, 1, 13, 17],
  [WL_WELLS_SD, 6, "Security deposit · unit 118", 1980.0, 97, 0, 14, 18],
  [WL_WELLS_SD, 8, "Deposit refund · unit 512 move-out", -2200.0, 94, 1, 17, 21],
  [WL_WELLS_SD, 9, "Security deposit · unit 407", 2400.0, 98, 0, 19, 23],
  [WL_WELLS_SD, 12, "Security deposit · unit 210", 2050.0, 97, 0, 22, 26],
  [WL_WELLS_SD, 13, "Deposit refund · unit 121 move-out", -1800.0, 95, 1, 23, 27],
  [WL_WELLS_SD, 15, "Security deposit · unit 308 re-lease", 1275.0, 96, 3, 26, 29],
  [WL_WELLS_SD, 16, "Security deposit · unit 502", 2650.0, 98, 0, 27, 31],
  [WL_WELLS_SD, 19, "Deposit refund · unit 214", -1950.0, 94, 1, 29, 33],
  [WL_WELLS_SD, 21, "Security deposit · unit 615", 2875.0, 98, 0, 33, 36],
  [WL_WELLS_SD, 23, "Pet deposit · unit 224", 500.0, 96, 1, 35, 39],
  [WL_WELLS_SD, 27, "Deposit refund · unit 330 move-out", -2100.0, 95, 1, 38, 42],
  [WL_WELLS_SD, 29, "Security deposit · unit 105", 1875.0, 98, 0, 40, 44],
  // BoA Reserves — funding transfers, capex draws, vendor payments (18)
  [WL_BOA_RES, 1, "Monthly reserve funding transfer", 12500.0, 99, 2, 3, 5],
  [WL_BOA_RES, 2, "Interest credit", 84.33, 99, 2, 6, 9],
  [WL_BOA_RES, 5, "Insurance premium · property policy", -8340.0, 96, 1, 16, 20],
  [WL_BOA_RES, 6, "Capex draw · elevator modernization deposit", -15000.0, 94, 1, 22, 26],
  [WL_BOA_RES, 7, "Reserve transfer · operating sweep", 5000.0, 98, 2, 27, 30],
  [WL_BOA_RES, 8, "Vendor payment · roof consultant", -2750.0, 95, 3, 31, 35],
  [WL_BOA_RES, 9, "Insurance claim proceeds · water damage", 6420.0, 92, 1, 36, 41],
  [WL_BOA_RES, 12, "Capex draw · boiler inspection", -1180.0, 96, 1, 47, 52],
  [WL_BOA_RES, 13, "Reserve funding · catch-up transfer", 2500.0, 97, 2, 52, 57],
  [WL_BOA_RES, 14, "Vendor payment · facade engineering", -4900.0, 94, 1, 58, 63],
  [WL_BOA_RES, 15, "Interest adjustment", 12.06, 98, 2, 63, 68],
  [WL_BOA_RES, 16, "Capex draw · unit 204 renovation", -9860.0, 95, 1, 69, 74],
  [WL_BOA_RES, 19, "Reserve transfer · operating sweep", 5000.0, 98, 2, 78, 84],
  [WL_BOA_RES, 20, "Vendor payment · paving contractor", -7300.0, 93, 3, 84, 90],
  [WL_BOA_RES, 21, "Tax reserve funding", -11200.0, 96, 2, 91, 96],
  [WL_BOA_RES, 22, "Capex draw · common area lighting", -2140.0, 95, 1, 97, 103],
  [WL_BOA_RES, 27, "Vendor payment · HVAC replacement deposit", -6800.0, 94, 1, 118, 124],
  [WL_BOA_RES, 28, "Monthly reserve true-up", 1830.0, 97, 2, 124, 130],
  // Chase Escrow — earnest money, releases, tax and insurance drafts (11)
  [WL_CHASE_ESCROW, 1, "Earnest money deposit · unit 509", 4500.0, 97, 0, 4, 6],
  [WL_CHASE_ESCROW, 2, "Escrow release · unit 116 closing", -5200.0, 95, 1, 8, 10],
  [WL_CHASE_ESCROW, 5, "Property tax payment · King County", -18240.0, 98, 2, 14, 16],
  [WL_CHASE_ESCROW, 7, "Earnest money deposit · unit 302", 5000.0, 97, 0, 18, 22],
  [WL_CHASE_ESCROW, 8, "Insurance escrow draft", -2780.0, 96, 2, 20, 24],
  [WL_CHASE_ESCROW, 12, "Escrow release · unit 220 closing", -4750.0, 95, 1, 26, 30],
  [WL_CHASE_ESCROW, 14, "Earnest money deposit · unit 618", 6000.0, 97, 0, 30, 34],
  [WL_CHASE_ESCROW, 16, "Interest credit", 22.19, 99, 2, 34, 38],
  [WL_CHASE_ESCROW, 21, "Escrow refund · failed closing unit 415", -5000.0, 93, 3, 42, 47],
  [WL_CHASE_ESCROW, 23, "Earnest money deposit · unit 233", 4250.0, 97, 0, 46, 51],
  [WL_CHASE_ESCROW, 28, "Property tax supplemental · King County", -1620.0, 96, 2, 54, 58],
];

const APPROVED_FILL: RecordItem[] = APPROVED_FILL_ROWS.map(
  ([bankId, day, title, amount, confidence, reason, stmt, ledger], i) => ({
    id: `rec-a-${APPROVED_SEED.length + 1 + i}`,
    bankId,
    status: "approved",
    date: `2026-05-${String(day).padStart(2, "0")}`,
    title,
    amount,
    confidence,
    reason: APPROVED_REASONS[reason],
    evidence: [`Statement line ${stmt}`, `Ledger row ${ledger}`],
  })
);

/* Flagged records lead in authored order — that is the reviewer's attention
 * order, not chronology. Approved records read as a ledger, so they sort by
 * date. Totals: 68 records, 60 approved / 8 flagged, banks 14/18/22/14. */
/* The handwritten set: 1849 Westlake's current re-run, as far as it was
 * authored by hand. `recordsForSession` below tops it up to the session's
 * real record count and generates the other properties' runs from the same
 * shapes, so every session in the app opens onto records instead of the one
 * property that happened to be written out. */
const WESTLAKE_AUTHORED: RecordItem[] = [
  ...FLAGGED_RECORDS,
  ...[...APPROVED_SEED, ...APPROVED_FILL].sort((a, b) =>
    a.date.localeCompare(b.date)
  ),
];

/* ---------- Generated records ----------
 *
 * A reconciliation month is mostly mundane: rent in, drafts out, a handful of
 * transfers. Writing 1,400 of those by hand would be 1,400 chances to write
 * one that contradicts its account. They are generated instead, from per
 * account-type vocabularies, with a deterministic generator seeded by the
 * session id — the same session renders the same month on every load.
 *
 * What is NOT generated is the exceptions on the current run: those are the
 * eight handwritten ones above, because an exception is the thing a reviewer
 * actually reads. */

/* Mulberry32. Small, fast, and deterministic from a 32-bit seed — which is
 * the whole requirement: a prototype that renders a different ledger on every
 * refresh cannot be checked against itself. */
function rngFor(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* What actually moves through each kind of account. Signed: positive is money
 * arriving. Ranges are per-line, in dollars. */
type LineShape = { title: string; min: number; max: number; sign: 1 | -1 };

const LINE_SHAPES: Record<string, LineShape[]> = {
  Operating: [
    { title: "Tenant ACH · unit", min: 1450, max: 3400, sign: 1 },
    { title: "Tenant ACH · unit", min: 1450, max: 3400, sign: 1 },
    { title: "Tenant ACH · unit", min: 1450, max: 3400, sign: 1 },
    { title: "Rent check deposit · unit", min: 1400, max: 3200, sign: 1 },
    { title: "Laundry revenue · CSC ServiceWorks", min: 180, max: 640, sign: 1 },
    { title: "Parking revenue · monthly permits", min: 400, max: 1900, sign: 1 },
    { title: "Utility draft · water and sewer", min: 380, max: 2400, sign: -1 },
    { title: "Utility draft · electricity", min: 620, max: 2900, sign: -1 },
    { title: "Vendor ACH · janitorial", min: 340, max: 1600, sign: -1 },
    { title: "Vendor ACH · landscaping", min: 280, max: 1450, sign: -1 },
    { title: "Vendor ACH · elevator maintenance", min: 410, max: 1200, sign: -1 },
    { title: "Repair invoice · plumbing", min: 190, max: 2600, sign: -1 },
    { title: "Management fee draft", min: 1800, max: 6400, sign: -1 },
    { title: "Payroll transfer · property staff", min: 2400, max: 8900, sign: -1 },
    { title: "Insurance instalment", min: 900, max: 3800, sign: -1 },
    { title: "Bank service charge", min: 12, max: 68, sign: -1 },
  ],
  "Security Deposit": [
    { title: "Deposit received · unit", min: 900, max: 3600, sign: 1 },
    { title: "Deposit received · unit", min: 900, max: 3600, sign: 1 },
    { title: "Move-out refund · unit", min: 600, max: 3200, sign: -1 },
    { title: "Deposit forfeiture to operating · unit", min: 180, max: 1400, sign: -1 },
    { title: "Interest credit", min: 4, max: 96, sign: 1 },
  ],
  Reserve: [
    { title: "Reserve transfer · operating sweep", min: 2000, max: 12000, sign: 1 },
    { title: "Capital draw · roof replacement", min: 3200, max: 24000, sign: -1 },
    { title: "Capital draw · HVAC replacement", min: 2400, max: 18000, sign: -1 },
    { title: "Capital draw · unit turn", min: 800, max: 6400, sign: -1 },
    { title: "Interest credit", min: 8, max: 180, sign: 1 },
  ],
  Escrow: [
    { title: "Escrow funding transfer", min: 3000, max: 22000, sign: 1 },
    { title: "Property tax disbursement", min: 4200, max: 38000, sign: -1 },
    { title: "Insurance premium disbursement", min: 1400, max: 12000, sign: -1 },
    { title: "Interest credit", min: 6, max: 140, sign: 1 },
  ],
};

function shapesFor(type: string): LineShape[] {
  return (
    LINE_SHAPES[type] ??
    LINE_SHAPES[type.replace(/^(Capital|Tax) /, "")] ??
    LINE_SHAPES.Operating
  );
}

const MATCH_REASONS = [
  "Exact match · same day · same counterparty",
  "Amount and date match · single candidate",
  "Matched recurring pattern · monthly",
  "Counterparty and amount match · 1 day apart",
  "Matched on memo reference · exact amount",
];

const CYCLE_MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/* "May 2026" -> { year: 2026, month: 5, days: 31 } */
function cycleBounds(cycle: string) {
  const [mon, year] = cycle.split(" ");
  const month = CYCLE_MONTHS.indexOf(mon) + 1;
  const y = Number(year);
  return { y, month, days: new Date(y, month, 0).getDate() };
}

function generateRecords(
  session: PropertySession,
  property: PropertyRecord,
  count: number,
  flaggedCount: number,
  idPrefix: string
): RecordItem[] {
  const rnd = rngFor(session.id);
  const accounts = property.banks;
  if (accounts.length === 0 || count <= 0) return [];
  const { y, month, days } = cycleBounds(session.cycle);
  const out: RecordItem[] = [];

  for (let i = 0; i < count; i++) {
    /* The operating account carries most of a property's traffic; the rest
     * share what is left. Weighting by index keeps that true without needing
     * a per-account volume field. */
    const idx =
      accounts.length === 1 || rnd() < 0.55
        ? 0
        : 1 + Math.floor(rnd() * (accounts.length - 1));
    const acct = accounts[idx];
    const shapes = shapesFor(acct.type);
    const shape = shapes[Math.floor(rnd() * shapes.length)];
    const day = 1 + Math.floor(rnd() * days);
    /* Real ledgers are not round. Cents come from the generator, not from a
     * table of tidy figures. */
    const dollars = shape.min + rnd() * (shape.max - shape.min);
    const amount =
      shape.sign * Math.round(dollars * 100) / 100;
    const unit = 100 + Math.floor(rnd() * Math.max(1, property.units));
    const title = shape.title.endsWith("unit")
      ? `${shape.title} ${unit}`
      : shape.title;
    const stmtLine = 3 + i * 2 + Math.floor(rnd() * 2);
    out.push({
      id: `${idPrefix}-a-${i + 1}`,
      bankId: acct.id,
      status: "approved",
      date: `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      title,
      amount,
      /* The agent settles a line on its own at 75 and above and hands back
       * anything below, so confidences sit either side of that line with no
       * gap and no overlap. Most matches are routine and land high; the ones
       * just over the line are the interesting ones. */
      confidence: 75 + Math.floor(rnd() * 25),
      reason: MATCH_REASONS[Math.floor(rnd() * MATCH_REASONS.length)],
      evidence: [`Statement line ${stmtLine}`, `Ledger row ${stmtLine + 4}`],
    });
  }

  /* Exceptions, where a session has any left open. Each names why it could
   * not be settled — the reviewer's question is always "why", never "what". */
  const EXC = [
    { reason: "No matching ledger entry within ±3 days", conf: [24, 46] },
    { reason: "Two candidate ledger entries · ambiguous", conf: [46, 68] },
    { reason: "Amount differs from the ledger by more than tolerance", conf: [30, 52] },
    { reason: "New fee code · no mapping in property setup", conf: [16, 34] },
    { reason: "Posted outside the cycle · needs an accrual decision", conf: [52, 74] },
  ];
  for (let i = 0; i < flaggedCount; i++) {
    const victim = out[Math.floor(rnd() * out.length)];
    const e = EXC[i % EXC.length];
    out.push({
      ...victim,
      id: `${idPrefix}-f-${i + 1}`,
      status: "flagged",
      confidence: e.conf[0] + Math.floor(rnd() * (e.conf[1] - e.conf[0])),
      reason: e.reason,
      evidence: [victim.evidence[0], "No confident ledger match"],
    });
  }
  /* Flagged first — that is the reviewer's attention order, not chronology.
   * The rest read as a ledger and sort by date. */
  return [
    ...out.filter((r) => r.status === "flagged"),
    ...out.filter((r) => r.status === "approved").sort((a, b) => a.date.localeCompare(b.date)),
  ];
}

const recordCache = new Map<string, RecordItem[]>();

/* Every record for one session.
 *
 * A failed session has none: nothing was matched, which is what "failed"
 * means, and a review screen full of rows would contradict the failure the
 * rest of the app reports. */
export function recordsForSession(sessionId: string): RecordItem[] {
  const cached = recordCache.get(sessionId);
  if (cached) return cached;

  const found = findSession(sessionId);
  if (!found) return [];
  const { session, property } = found;

  let out: RecordItem[];
  if (session.status === "failed") {
    out = [];
  } else if (sessionId === "sess-wl-may-2") {
    /* The one authored run. The handwritten eight are its exceptions; the
     * generator supplies the remaining routine matches up to its real record
     * count, so "204 records, 196 matched, 8 open" is one fact three surfaces
     * read rather than three numbers three surfaces assert. */
    const authored = WESTLAKE_AUTHORED;
    const need = session.records - authored.length;
    out = [
      ...authored,
      ...generateRecords(session, property, Math.max(0, need), 0, "wl-gen"),
    ];
    out = [
      ...out.filter((r) => r.status === "flagged"),
      ...out
        .filter((r) => r.status === "approved")
        .sort((a, b) => a.date.localeCompare(b.date)),
    ];
  } else {
    out = generateRecords(
      session,
      property,
      session.matched,
      session.openItems,
      session.id
    );
  }

  recordCache.set(sessionId, out);
  return out;
}

/* Per-account approved / exception counts for one session, counted off the
 * records themselves. The SessionProvider used to carry a hand-copied table of
 * four numbers with a comment admitting it was "kept in sync manually"; this
 * cannot drift because it is the same list the review canvas renders. */
export function bankCountsForSession(
  sessionId: string
): Record<string, { approved: number; exceptions: number }> {
  const out: Record<string, { approved: number; exceptions: number }> = {};
  for (const r of recordsForSession(sessionId)) {
    const bucket = (out[r.bankId] ??= { approved: 0, exceptions: 0 });
    if (r.status === "flagged") bucket.exceptions += 1;
    else bucket.approved += 1;
  }
  return out;
}

/* The current run's records. Kept as a constant for the surfaces that mean
 * "the session that is open right now". */
export const reconciledRecords: RecordItem[] = recordsForSession("sess-wl-may-2");
