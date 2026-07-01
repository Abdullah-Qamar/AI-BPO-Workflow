// Anchor seed — mirrors the locked Figma direction (2026-06-27).
// Anchor screen: Workspace at `draft` state — uploading bank statements + ledgers
// for the selected month, paired with wire-connectors.

export type WorkspaceStatus = "active" | "failed" | "complete";

export interface SessionRow {
  id: string;
  label: string;
  status: WorkspaceStatus;
  selected?: boolean;
}

export interface PropertyWorkspace {
  id: string;
  address: string;
  shortAddress: string; // e.g. "1849 Westlake" — used in compact rows
  code: string;         // e.g. "TH-1247" — used as the durable short identifier
  cityState: string;    // e.g. "Seattle, WA" — used in the new-session modal subtitle
  lastClosed: string;   // e.g. "Apr 2026" or "Never" — last successfully closed cycle
  banks: ("chase" | "wells-fargo" | "boa")[];
  meta: string;
  sessionCount: number;
  bankCount: number;
  status: WorkspaceStatus | null; // null = no badge
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
 * done    = agent finished its phase. All lines visible, no shimmer. */
export type AgentLifecycle = "idle" | "working" | "done";

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
}

// ---- Anchor property and its session list ----

export const activeProperty: PropertyWorkspace = {
  id: "ws-westlake-1849",
  address: "1849 Westlake Ave N, Seattle, WA 98109",
  shortAddress: "1849 Westlake",
  code: "TH-1247",
  cityState: "Seattle, WA",
  lastClosed: "Apr 2026",
  banks: ["chase", "wells-fargo", "boa", "chase"],
  meta: "3 Sessions · 4 Banks",
  sessionCount: 3,
  bankCount: 4,
  status: "active",
  selected: true,
  expanded: true,
  sessions: [
    {
      id: "sess-may2026-2",
      label: "May 2026 - 2",
      status: "active",
      selected: true,
    },
    { id: "sess-may2026", label: "May 2026", status: "failed" },
    { id: "sess-apr2026", label: "Apr 2026", status: "complete" },
  ],
};

// The 8 collapsed workspace rows shown beneath. Same shape, varied addresses.
export const otherWorkspaces: PropertyWorkspace[] = [
  {
    id: "ws-mission",
    address: "1247 Mission St, San Francisco, CA 94103",
    shortAddress: "1247 Mission",
    code: "MIS-1247",
    cityState: "San Francisco, CA",
    lastClosed: "May 2026",
    banks: ["chase", "wells-fargo", "boa"],
    meta: "3 Sessions · 4 Banks",
    sessionCount: 3,
    bankCount: 4,
    status: "complete",
    sessions: [],
  },
  {
    id: "ws-haight",
    address: "414 Haight St, San Francisco, CA 94117",
    shortAddress: "414 Haight",
    code: "HGT-0414",
    cityState: "San Francisco, CA",
    lastClosed: "May 2026",
    banks: ["chase", "wells-fargo"],
    meta: "2 Sessions · 3 Banks",
    sessionCount: 2,
    bankCount: 3,
    status: "complete",
    sessions: [],
  },
  {
    id: "ws-folsom",
    address: "2200 Folsom St, San Francisco, CA 94110",
    shortAddress: "2200 Folsom",
    code: "FOL-2200",
    cityState: "San Francisco, CA",
    lastClosed: "Apr 2026",
    banks: ["chase"],
    meta: "4 Sessions · 5 Banks",
    sessionCount: 4,
    bankCount: 5,
    status: "complete",
    sessions: [],
  },
  {
    id: "ws-broadway",
    address: "871 Broadway, Oakland, CA 94607",
    shortAddress: "871 Broadway",
    code: "OAK-0871",
    cityState: "Oakland, CA",
    lastClosed: "Mar 2026",
    banks: ["chase", "wells-fargo"],
    meta: "3 Sessions · 4 Banks",
    sessionCount: 3,
    bankCount: 4,
    status: "active",
    sessions: [],
  },
  {
    id: "ws-emeryville",
    address: "5200 Christie Ave, Emeryville, CA 94608",
    shortAddress: "5200 Christie",
    code: "EMR-2087",
    cityState: "Emeryville, CA",
    lastClosed: "Mar 2026",
    banks: ["wells-fargo", "chase"],
    meta: "3 Sessions · 4 Banks",
    sessionCount: 3,
    bankCount: 4,
    status: "failed",
    sessions: [],
  },
  {
    id: "ws-berkeley",
    address: "2390 Shattuck Ave, Berkeley, CA 94704",
    shortAddress: "2390 Shattuck",
    code: "BRK-1410",
    cityState: "Berkeley, CA",
    lastClosed: "Apr 2026",
    banks: ["boa"],
    meta: "2 Sessions · 3 Banks",
    sessionCount: 2,
    bankCount: 3,
    status: "failed",
    sessions: [],
  },
  {
    id: "ws-alameda",
    address: "1500 Park St, Alameda, CA 94501",
    shortAddress: "1500 Park",
    code: "ALM-2640",
    cityState: "Alameda, CA",
    lastClosed: "Never",
    banks: ["chase"],
    meta: "3 Sessions · 4 Banks",
    sessionCount: 3,
    bankCount: 4,
    status: null,
    sessions: [],
  },
  {
    id: "ws-sausalito",
    address: "100 Bridgeway, Sausalito, CA 94965",
    shortAddress: "100 Bridgeway",
    code: "SAU-1900",
    cityState: "Sausalito, CA",
    lastClosed: "Never",
    banks: ["chase"],
    meta: "1 Session · 2 Banks",
    sessionCount: 1,
    bankCount: 2,
    status: null,
    sessions: [],
  },
];

// ---- Upload pairs for the canonical (May 2026 - 2) session ----

const chaseHeader = {
  name: "JPMorgan Chase Bank, N.A.",
  logo: "chase",
  address: "P.O. Box 659754, San Antonio, TX 78265-9754",
};

const wellsHeader = {
  name: "Wells Fargo Bank, N.A.",
  logo: "wells-fargo",
  address: "P.O. Box 6995, Portland, OR 97228-6995",
};

const boaHeader = {
  name: "Bank of America, N.A.",
  logo: "boa",
  address: "P.O. Box 25118, Tampa, FL 33622-5118",
};

const TENANT = "TH-PROD-01";
const SOURCE = "yardi.tahoe-holdings.com";
const PROPERTY_AND_CODE = "Tahoe Holdings LLC dba 1247 Mission St · TH-1247";
const PERIOD = "July 01, 2026 – July 31, 2026";
const ISSUE = "Aug 03, 2026";
const EXPORTED = "Aug 03, 2026 · 09:14 PT";
const HOLDER = "Tahoe Holdings LLC dba 1247 Mission St";

/* 4 banks per the property workspace meta. Two have an uploaded statement,
 * two are empty — drives the mixed-state demo on the canvas. */
export const propertyBanks: PropertyBank[] = [
  {
    id: "bank-chase-op",
    name: chaseHeader.name,
    logoSrc: "/logos/chase.png",
    accountHolder: HOLDER,
    accountNumber: "******3421",
    type: "Operating",
    ledgerSource: SOURCE,
    ledgerTenant: TENANT,
    ledgerPropertyAndCode: PROPERTY_AND_CODE,
    ledgerCashAccount: "GL 1010 — Operating Cash",
    status: "empty",
    uploaded: {
      id: "pair-chase-op",
      bank: {
        id: "bank-1",
        bank: chaseHeader,
        accountHolder: HOLDER,
        accountNumber: "******3421",
        period: PERIOD,
        issue: ISSUE,
      },
      ledger: {
        id: "ledger-1",
        source: SOURCE,
        tenantId: TENANT,
        propertyAndCode: PROPERTY_AND_CODE,
        cashAccount: "GL 1010 — Operating Cash",
        period: PERIOD,
        exported: EXPORTED,
      },
    },
  },
  {
    id: "bank-wells-sd",
    name: wellsHeader.name,
    logoSrc: "/logos/wells-fargo.png",
    accountHolder: HOLDER,
    accountNumber: "******7782",
    type: "Security Deposits",
    ledgerSource: SOURCE,
    ledgerTenant: TENANT,
    ledgerPropertyAndCode: PROPERTY_AND_CODE,
    ledgerCashAccount: "GL 1015 — Security Deposits",
    status: "empty",
  },
  {
    id: "bank-boa-res",
    name: boaHeader.name,
    logoSrc: "/logos/boa.png",
    accountHolder: HOLDER,
    accountNumber: "******9034",
    type: "Reserves",
    ledgerSource: SOURCE,
    ledgerTenant: TENANT,
    ledgerPropertyAndCode: PROPERTY_AND_CODE,
    ledgerCashAccount: "GL 1020 — Reserves",
    status: "empty",
    uploaded: {
      id: "pair-boa-res",
      bank: {
        id: "bank-3",
        bank: boaHeader,
        accountHolder: HOLDER,
        accountNumber: "******9034",
        period: PERIOD,
        issue: ISSUE,
      },
      ledger: {
        id: "ledger-3",
        source: SOURCE,
        tenantId: TENANT,
        propertyAndCode: PROPERTY_AND_CODE,
        cashAccount: "GL 1020 — Reserves",
        period: PERIOD,
        exported: EXPORTED,
      },
    },
  },
  {
    id: "bank-chase-escrow",
    name: chaseHeader.name,
    logoSrc: "/logos/chase.png",
    accountHolder: HOLDER,
    accountNumber: "******8856",
    type: "Escrow",
    ledgerSource: SOURCE,
    ledgerTenant: TENANT,
    ledgerPropertyAndCode: PROPERTY_AND_CODE,
    ledgerCashAccount: "GL 1025 — Escrow",
    status: "empty",
  },
];

/* Backwards-compatible accessor: just the uploaded pairs. */
export const uploadPairs: UploadPair[] = propertyBanks
  .filter((b) => b.status === "uploaded" && b.uploaded)
  .map((b) => b.uploaded as UploadPair);

// ---- Right-side Agents panel ----
//
// Canonical lifecycle snapshot for the 1849 Westlake Ave N · May 2026 - 2 run:
//   • Intake has finished its full lifecycle — classified, surfaced 2 failed
//     uploads, pulled authoritative ledgers from Yardi, normalized, handed off.
//   • Reconciliation is mid-flight comparing transactions across 4 banks,
//     each at a different point in its own per-bank progress.
//   • Summary is still idle — wakes only after Reconciliation hands off.

const intakeFailedChips: AgentFile[] = [
  {
    id: "f-ohioa",
    label: "1293 Ohioa County",
    icon: "file-text",
    state: "failed",
  },
  {
    id: "f-citi",
    label: "Citigroup Statement",
    icon: "landmark",
    state: "failed",
  },
];

/* Per-bank totals chosen to add up cleanly:
 *   14 + 18 + 22 + 14 = 68 expected records
 *   final approved + flagged = 52 + 16 = 68 ✓ */
const reconBankRows: BankProgressRow[] = [
  {
    id: "recon-chase-op",
    logoSrc: "/logos/chase.png",
    shortName: "Chase Operating ******3421",
    matched: 14,
    total: 14,
  },
  {
    id: "recon-wells-sd",
    logoSrc: "/logos/wells-fargo.png",
    shortName: "Wells Fargo SD ******7782",
    matched: 18,
    total: 18,
  },
  {
    id: "recon-boa-res",
    logoSrc: "/logos/boa.png",
    shortName: "BoA Reserves ******9034",
    matched: 22,
    total: 22,
  },
  {
    id: "recon-chase-esc",
    logoSrc: "/logos/chase.png",
    shortName: "Chase Escrow ******8856",
    matched: 14,
    total: 14,
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
        { text: "Handed off · 4 bank pairs · ", tone: "neutral" },
        { text: "2 files flagged", tone: "failed" },
      ],
      dotState: "neutral",
      chips: intakeFailedChips,
    },
    timeline: [
      {
        id: "intake-received",
        runs: [{ text: "Received · 8 files", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "intake-classified",
        runs: [
          { text: "Classified · 6 statements & ledgers matched", tone: "neutral" },
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
        runs: [{ text: "Pulled ledgers from Yardi · 4 of 4 banks", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "intake-normalized",
        runs: [{ text: "Normalized · 4 bank pairs ready", tone: "neutral" }],
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
        { text: "Reconciled 68 records · ", tone: "neutral" },
        { text: "52 approved", tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: "16 flagged", tone: "failed" },
      ],
      dotState: "neutral",
    },
    timeline: [
      {
        id: "recon-started",
        runs: [{ text: "Reconciling 4 bank accounts", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "recon-matching",
        runs: [
          { text: "Matched 68 transactions · ", tone: "neutral" },
          { text: "52 approved", tone: "approved" },
          { text: " · ", tone: "neutral" },
          { text: "16 flagged", tone: "failed" },
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
        { text: "52 approved", tone: "approved" },
        { text: " · ", tone: "neutral" },
        { text: "16 flagged", tone: "failed" },
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
        runs: [{ text: "Verified 68 target records in Yardi", tone: "neutral" }],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-approved",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: "52 records", tone: "approved" },
          { text: " ready to post", tone: "neutral" },
        ],
        dotState: "neutral",
      },
      {
        id: "summary-prepared-flagged",
        runs: [
          { text: "Prepared · ", tone: "neutral" },
          { text: "16 exceptions", tone: "failed" },
          { text: " ready to flag in Yardi", tone: "neutral" },
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
      body: "Match rate 76% — 6 pts below April. Two new BoA fee codes drove 11 of the 16 exceptions; worth mapping them in property setup.",
    },
    artifact: {
      filename: "1849-westlake-may-2026.pdf",
      meta: "Reconciliation report · 14 pages · 2.3 MB",
    },
    primaryAction: {
      label: "Post to Yardi",
      sublabel: "52 approved · 16 flagged",
    },
    inspectAction: {
      label: "Review 68 records",
    },
    secondaryAction: {
      label: "Rerun reconciliation",
    },
  },
];

export const selectedMonth = "May 2026";

// ---- Review canvas — reconciled records ----
//
// The destination for "Review 68 records" on the Summary agent panel.
// Sample data covers all 4 banks across both buckets so the design can be
// stress-tested under varied content. Not all 68 records are enumerated —
// enough to demonstrate the layout, with the aggregate counts on the agent
// panel acting as the source of truth.

export type RecordStatus = "approved" | "flagged";
export type RecordBankId =
  | "bank-chase-op"
  | "bank-wells-sd"
  | "bank-boa-res"
  | "bank-chase-escrow";

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

const REC_BANK_META: Record<
  RecordBankId,
  { shortName: string; logoSrc: string }
> = {
  "bank-chase-op": {
    shortName: "Chase Op",
    logoSrc: "/logos/chase.png",
  },
  "bank-wells-sd": {
    shortName: "Wells SD",
    logoSrc: "/logos/wells-fargo.png",
  },
  "bank-boa-res": {
    shortName: "BoA Res",
    logoSrc: "/logos/boa.png",
  },
  "bank-chase-escrow": {
    shortName: "Chase Escrow",
    logoSrc: "/logos/chase.png",
  },
};

export function getBankMeta(bankId: RecordBankId) {
  return REC_BANK_META[bankId];
}

/* Sample records — focused on flagged (where the reviewer's attention goes)
 * with enough approved entries to show the bucket exists. The total counts
 * shown in headers/tabs come from the agent panel data (52/16), not from
 * this list length — the list is illustrative. */
export const reconciledRecords: RecordItem[] = [
  // --- Flagged (the work) ---
  {
    id: "rec-f-1",
    bankId: "bank-chase-op",
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
    bankId: "bank-boa-res",
    status: "flagged",
    date: "2026-05-15",
    title: "Refund #4912",
    amount: -210.0,
    confidence: 48,
    reason: "2 candidate ledger entries — ambiguous",
    evidence: ["Statement line 88", "Ledger row 142", "Ledger row 154"],
  },
  {
    id: "rec-f-3",
    bankId: "bank-wells-sd",
    status: "flagged",
    date: "2026-05-20",
    title: "Tenant ACH return — unit 308",
    amount: 1200.0,
    confidence: 27,
    reason: "Amount mismatch vs ledger ($1,200 vs $1,275)",
    evidence: ["Statement line 31", "Ledger row 78"],
  },
  {
    id: "rec-f-4",
    bankId: "bank-chase-escrow",
    status: "flagged",
    date: "2026-05-03",
    title: "Wire transfer — title company",
    amount: -8500.0,
    confidence: 41,
    reason: "Unfamiliar counterparty — first occurrence",
    evidence: ["Statement line 12", "No prior reference"],
  },
  {
    id: "rec-f-5",
    bankId: "bank-boa-res",
    status: "flagged",
    date: "2026-05-22",
    title: "BoA fee — FX assessment 04",
    amount: -42.5,
    confidence: 19,
    reason: "New fee code — no mapping in property setup",
    evidence: ["Statement line 102", "GL chart missing code"],
  },
  {
    id: "rec-f-6",
    bankId: "bank-chase-op",
    status: "flagged",
    date: "2026-05-28",
    title: "Reversal — Stripe payout #4319",
    amount: -4318.42,
    confidence: 38,
    reason: "Reverses earlier flagged transaction",
    evidence: ["Statement line 121", "Matches rec-f-1 amount"],
  },
  {
    id: "rec-f-7",
    bankId: "bank-chase-escrow",
    status: "flagged",
    date: "2026-05-09",
    title: "Earnest money deposit — unit 412",
    amount: 5000.0,
    confidence: 52,
    reason: "Date mismatch vs ledger (off by 4 days)",
    evidence: ["Statement line 22", "Ledger row 64"],
  },
  {
    id: "rec-f-8",
    bankId: "bank-boa-res",
    status: "flagged",
    date: "2026-05-30",
    title: "BoA fee — FX assessment 04",
    amount: -38.75,
    confidence: 19,
    reason: "New fee code — no mapping in property setup",
    evidence: ["Statement line 138"],
  },
  // --- Approved (representative subset) ---
  {
    id: "rec-a-1",
    bankId: "bank-chase-op",
    status: "approved",
    date: "2026-05-01",
    title: "Tenant ACH — unit 102",
    amount: 2400.0,
    confidence: 98,
    reason: "Exact match · same day · same counterparty",
    evidence: ["Statement line 4", "Ledger row 4"],
  },
  {
    id: "rec-a-2",
    bankId: "bank-chase-op",
    status: "approved",
    date: "2026-05-01",
    title: "Tenant ACH — unit 204",
    amount: 2750.0,
    confidence: 99,
    reason: "Exact match · same day · same counterparty",
    evidence: ["Statement line 5", "Ledger row 5"],
  },
  {
    id: "rec-a-3",
    bankId: "bank-wells-sd",
    status: "approved",
    date: "2026-05-02",
    title: "Security deposit — unit 308",
    amount: 1275.0,
    confidence: 96,
    reason: "Amount + date match · ledger row 12",
    evidence: ["Statement line 9", "Ledger row 12"],
  },
  {
    id: "rec-a-4",
    bankId: "bank-boa-res",
    status: "approved",
    date: "2026-05-05",
    title: "Capex transfer — roof replacement",
    amount: -22000.0,
    confidence: 94,
    reason: "Matched to approved capex budget line",
    evidence: ["Statement line 14", "Ledger row 18", "Capex memo MAY-04"],
  },
  {
    id: "rec-a-5",
    bankId: "bank-chase-escrow",
    status: "approved",
    date: "2026-05-07",
    title: "Earnest money refund — failed closing",
    amount: -7500.0,
    confidence: 91,
    reason: "Matches prior escrow deposit · same counterparty",
    evidence: ["Statement line 17", "Ledger row 21"],
  },
  {
    id: "rec-a-6",
    bankId: "bank-wells-sd",
    status: "approved",
    date: "2026-05-10",
    title: "Interest credit",
    amount: 18.42,
    confidence: 99,
    reason: "Routine interest posting · monthly pattern",
    evidence: ["Statement line 26", "Ledger row 30"],
  },
];

// ---- Dashboard data (action inbox, cross-portfolio) ----

export type SessionDotKind = "blocking" | "awaiting" | "working" | "complete";

export interface DashboardSession {
  id: string;
  sessionLabel: string;
  cycle: string;
  shortName: string;
  fullAddress: string;
  legalEntity: string;
  statusText: string;
  dotKind: SessionDotKind;
  detail: string;
  banks: ("chase" | "wells-fargo" | "boa")[];
  startedAt: string;
}

export const dashboardCyclePulse = {
  label: "May 2026 close",
  closed: 12,
  total: 18,
  counts: { review: 3, failed: 2, inFlight: 3 },
};

export const dashboardNeedsYou: DashboardSession[] = [
  {
    id: "ds-need-1",
    sessionLabel: "May 2026 - 2",
    cycle: "May 2026",
    shortName: "1849 Westlake · TH-1247",
    fullAddress: "1849 Westlake Ave N, Seattle, WA 98109",
    legalEntity: "Tahoe Holdings LLC dba 1247 Mission St",
    statusText: "Needs review",
    dotKind: "awaiting",
    detail: "16 exceptions awaiting review across 4 banks",
    banks: ["chase", "wells-fargo", "boa", "chase"],
    startedAt: "2h ago",
  },
  {
    id: "ds-need-2",
    sessionLabel: "Apr 2026",
    cycle: "Apr 2026",
    shortName: "5200 Christie · EMR-2087",
    fullAddress: "5200 Christie Ave, Emeryville, CA 94608",
    legalEntity: "Emery Bay Holdings LLC",
    statusText: "Failed",
    dotKind: "blocking",
    detail: "Wells Fargo ledger import failed — 3 files unreadable",
    banks: ["wells-fargo", "chase"],
    startedAt: "Yesterday",
  },
  {
    id: "ds-need-3",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "2390 Shattuck · BRK-1410",
    fullAddress: "2390 Shattuck Ave, Berkeley, CA 94704",
    legalEntity: "Shattuck Capital Partners LLC",
    statusText: "Needs input",
    dotKind: "blocking",
    detail: "Statement upload missing for Bank of America Reserves",
    banks: ["boa"],
    startedAt: "1d ago",
  },
  {
    id: "ds-need-4",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "871 Broadway · OAK-0871",
    fullAddress: "871 Broadway, Oakland, CA 94607",
    legalEntity: "Broadway Asset Group LLC",
    statusText: "Needs review",
    dotKind: "awaiting",
    detail: "8 exceptions on Chase Operating — $12,400 unmatched",
    banks: ["chase", "wells-fargo"],
    startedAt: "4h ago",
  },
  {
    id: "ds-need-5",
    sessionLabel: "Apr 2026",
    cycle: "Apr 2026",
    shortName: "100 Bridgeway · SAU-1900",
    fullAddress: "100 Bridgeway, Sausalito, CA 94965",
    legalEntity: "Sausalito Waterfront LLC",
    statusText: "Ready for handoff",
    dotKind: "awaiting",
    detail: "24 records ready for posting to Yardi",
    banks: ["chase"],
    startedAt: "3h ago",
  },
  {
    id: "ds-need-6",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "1500 Park · ALM-2640",
    fullAddress: "1500 Park St, Alameda, CA 94501",
    legalEntity: "Alameda Park Holdings LLC",
    statusText: "Failed",
    dotKind: "blocking",
    detail: "Chase Escrow account mapping broken — 0 matched",
    banks: ["chase"],
    startedAt: "30m ago",
  },
];

export const dashboardInFlight: DashboardSession[] = [
  {
    id: "ds-fly-1",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "1247 Mission · MIS-1247",
    fullAddress: "1247 Mission St, San Francisco, CA 94103",
    legalEntity: "Mission Tahoe Holdings LLC",
    statusText: "Reconciling",
    dotKind: "working",
    detail: "Comparing transactions — 3 of 4 banks complete",
    banks: ["chase", "wells-fargo", "boa"],
    startedAt: "8m ago",
  },
  {
    id: "ds-fly-2",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "414 Haight · HGT-0414",
    fullAddress: "414 Haight St, San Francisco, CA 94117",
    legalEntity: "Haight Capital Group LLC",
    statusText: "Importing",
    dotKind: "working",
    detail: "Yardi ledger import running — normalizing Wells Fargo",
    banks: ["chase", "wells-fargo"],
    startedAt: "2m ago",
  },
  {
    id: "ds-fly-3",
    sessionLabel: "May 2026",
    cycle: "May 2026",
    shortName: "2200 Folsom · FOL-2200",
    fullAddress: "2200 Folsom St, San Francisco, CA 94110",
    legalEntity: "Folsom Avenue LLC",
    statusText: "Updating",
    dotKind: "working",
    detail: "Posting 24 approved records to Yardi",
    banks: ["chase"],
    startedAt: "1m ago",
  },
];

export const dashboardRecent: DashboardSession[] = [
  {
    id: "ds-done-1",
    sessionLabel: "Apr 2026",
    cycle: "Apr 2026",
    shortName: "1849 Westlake · TH-1247",
    fullAddress: "1849 Westlake Ave N, Seattle, WA 98109",
    legalEntity: "Tahoe Holdings LLC dba 1247 Mission St",
    statusText: "Complete",
    dotKind: "complete",
    detail: "142 records posted · 4 exceptions resolved",
    banks: ["chase", "wells-fargo", "boa", "chase"],
    startedAt: "3d ago",
  },
  {
    id: "ds-done-2",
    sessionLabel: "Apr 2026",
    cycle: "Apr 2026",
    shortName: "871 Broadway · OAK-0871",
    fullAddress: "871 Broadway, Oakland, CA 94607",
    legalEntity: "Broadway Asset Group LLC",
    statusText: "Complete",
    dotKind: "complete",
    detail: "88 records posted",
    banks: ["chase", "wells-fargo"],
    startedAt: "5d ago",
  },
  {
    id: "ds-done-3",
    sessionLabel: "Mar 2026",
    cycle: "Mar 2026",
    shortName: "5200 Christie · EMR-2087",
    fullAddress: "5200 Christie Ave, Emeryville, CA 94608",
    legalEntity: "Emery Bay Holdings LLC",
    statusText: "Complete",
    dotKind: "complete",
    detail: "64 records posted",
    banks: ["wells-fargo", "chase"],
    startedAt: "1w ago",
  },
];

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
  capturedAt: string;                // pre-formatted date label, e.g. "May 12"
  capturedFromRecordTitle?: string;  // short label of the source record
  capturedFromSessionLabel: string;  // e.g. "May 2026"
  appliedThisCycle: number;
  totalApplied: number;
  archived: boolean;
}

export const guidanceEntries: GuidanceEntry[] = [
  {
    id: "g-1",
    rule: "Stripe payouts post 2 banking days after settlement — match by amount, not by date.",
    agent: "reconciliation",
    capturedAt: "Mar 18",
    capturedFromRecordTitle: "Stripe payout",
    capturedFromSessionLabel: "Mar 2026",
    appliedThisCycle: 6,
    totalApplied: 18,
    archived: false,
  },
  {
    id: "g-2",
    rule: "BoA FX assessment fees roll up under GL 6210 — Bank Charges, not under property-specific fee codes.",
    agent: "reconciliation",
    capturedAt: "Apr 02",
    capturedFromRecordTitle: "BoA fee — FX assessment 04",
    capturedFromSessionLabel: "Apr 2026",
    appliedThisCycle: 4,
    totalApplied: 9,
    archived: false,
  },
  {
    id: "g-3",
    rule: "Earnest money deposits land 3–5 days before the ledger entry — widen the date window before flagging.",
    agent: "reconciliation",
    capturedAt: "Apr 14",
    capturedFromRecordTitle: "Earnest money deposit — unit 412",
    capturedFromSessionLabel: "Apr 2026",
    appliedThisCycle: 2,
    totalApplied: 5,
    archived: false,
  },
  {
    id: "g-4",
    rule: "Wire transfers to title companies are always legitimate — do not flag as unknown counterparty.",
    agent: "summary",
    capturedAt: "Feb 09",
    capturedFromRecordTitle: "Wire transfer — title company",
    capturedFromSessionLabel: "Feb 2026",
    appliedThisCycle: 1,
    totalApplied: 7,
    archived: false,
  },
  {
    id: "g-5",
    rule: "Tenant ACH returns for unit 308 — known recurring issue with broken auto-pay. Approve manually.",
    agent: "intake",
    capturedAt: "May 04",
    capturedFromRecordTitle: "Tenant ACH return — unit 308",
    capturedFromSessionLabel: "May 2026",
    appliedThisCycle: 0,
    totalApplied: 0,
    archived: false,
  },
  {
    id: "g-6",
    rule: "Refunds under $250 are routine — auto-approve and skip the ambiguity check.",
    agent: "reconciliation",
    capturedAt: "Jan 22",
    capturedFromRecordTitle: "Refund #4912",
    capturedFromSessionLabel: "Jan 2026",
    appliedThisCycle: 3,
    totalApplied: 14,
    archived: false,
  },
  {
    id: "g-7",
    rule: "Capex roof-replacement transfers under $25k post the same day — do not widen the date match window.",
    agent: "reconciliation",
    capturedAt: "Dec 11",
    capturedFromRecordTitle: "Capex transfer — roof replacement",
    capturedFromSessionLabel: "Dec 2025",
    appliedThisCycle: 0,
    totalApplied: 1,
    archived: true,
  },
  {
    id: "g-8",
    rule: "Old Wells Fargo SD account mapping (closed Q3 2025) — no longer in use.",
    agent: "intake",
    capturedAt: "Sep 17",
    capturedFromSessionLabel: "Sep 2025",
    appliedThisCycle: 0,
    totalApplied: 4,
    archived: true,
  },
];

// ---- AI observability (Dashboard strip + detail page) ----
// Two audiences in one surface: the reconciler scanning the Dashboard, and
// the person responsible for AI quality clicking through to the detail page.
// Plain-language labels throughout — see project_dashboard_design.md.

export type AIAgentKey = "intake" | "reconciliation" | "exception" | "summary";

export interface AIAgentRow {
  key: AIAgentKey;
  name: string;
  description: string;       // one-liner so the reader can place the agent
  metricLabel: string;       // plain-language metric description
  value: number;             // 0–100 percentage
  trend: number;             // pts vs previous cycle (signed)
  higherIsBetter: boolean;   // for trend coloring
}

export type AIDecisionOutcome = "accepted" | "overridden";

export interface AIDecision {
  id: string;
  agent: AIAgentKey;
  title: string;
  confidence: number;        // 0–100
  reason: string;            // the AI's own justification
  outcome: AIDecisionOutcome;
  reviewer: string;
  cycle: string;
}

export interface AICyclePoint {
  monthLabel: string;        // "Dec", "Jan", ...
  fullCycle: string;         // "Dec 2025"
  accuracy: number;
  overrides: number;
}

export interface AIObservability {
  cycle: string;
  // Headline numbers (current cycle)
  accuracy: number;
  accuracyTrend: number;     // signed delta vs previous cycle (pts)
  overrides: number;
  overridesTrend: number;    // lower-is-better — negative trend is good
  confidence: number;
  confidenceTrend: number;
  // Sections
  byAgent: AIAgentRow[];
  recentDecisions: AIDecision[];
  history: AICyclePoint[];
  overridesNote: string;     // one-line annotation accompanying the trend chart
}

export const aiObservability: AIObservability = {
  cycle: "May 2026",
  accuracy: 94,
  accuracyTrend: 2,
  overrides: 3,
  overridesTrend: -1,
  confidence: 89,
  confidenceTrend: 1,
  byAgent: [
    {
      key: "intake",
      name: "Intake",
      description: "Reads bank statements and ledgers, normalizes the data.",
      metricLabel: "Files parsed cleanly",
      value: 100,
      trend: 0,
      higherIsBetter: true,
    },
    {
      key: "reconciliation",
      name: "Reconciliation",
      description: "Matches each bank transaction to a ledger entry.",
      metricLabel: "Transactions matched correctly",
      value: 94,
      trend: 2,
      higherIsBetter: true,
    },
    {
      key: "exception",
      name: "Exception",
      description: "Flags transactions that don't fit and explains why.",
      metricLabel: "Flags that turned out to be real",
      value: 91,
      trend: 4,
      higherIsBetter: true,
    },
    {
      key: "summary",
      name: "Summary",
      description: "Prepares the close package and posting plan.",
      metricLabel: "Reports completed without rework",
      value: 100,
      trend: 0,
      higherIsBetter: true,
    },
  ],
  recentDecisions: [
    {
      id: "ai-rec-1",
      agent: "reconciliation",
      title: "Matched Stripe payout $4,318.42 → ledger entry L-2941",
      confidence: 92,
      reason:
        "Date and amount match exactly; counterparty fuzzy match 88% against \"Stripe Payments US\".",
      outcome: "accepted",
      reviewer: "Hassan A.",
      cycle: "May 2026",
    },
    {
      id: "ai-rec-2",
      agent: "exception",
      title: "Flagged BoA fee $42.50 as a likely duplicate",
      confidence: 78,
      reason:
        "A nearly identical charge — same amount, same counterparty — appears 3 days earlier on the same account.",
      outcome: "overridden",
      reviewer: "Hassan A.",
      cycle: "May 2026",
    },
    {
      id: "ai-rec-3",
      agent: "reconciliation",
      title: "Matched tenant ACH $1,200.00 → rent roll line R-014",
      confidence: 96,
      reason:
        "Exact amount; tenant name and unit number match the active Yardi rent roll line.",
      outcome: "accepted",
      reviewer: "Hassan A.",
      cycle: "May 2026",
    },
    {
      id: "ai-rec-4",
      agent: "exception",
      title: "Flagged wire transfer $8,500.00 — counterparty unknown",
      confidence: 64,
      reason:
        "Counterparty \"ACME-LLC-X3\" is not in the property's vendor list, and the amount is unusual for May.",
      outcome: "accepted",
      reviewer: "Hassan A.",
      cycle: "May 2026",
    },
  ],
  history: [
    { monthLabel: "Dec", fullCycle: "Dec 2025", accuracy: 88, overrides: 8 },
    { monthLabel: "Jan", fullCycle: "Jan 2026", accuracy: 89, overrides: 7 },
    { monthLabel: "Feb", fullCycle: "Feb 2026", accuracy: 91, overrides: 6 },
    { monthLabel: "Mar", fullCycle: "Mar 2026", accuracy: 92, overrides: 5 },
    { monthLabel: "Apr", fullCycle: "Apr 2026", accuracy: 92, overrides: 4 },
    { monthLabel: "May", fullCycle: "May 2026", accuracy: 94, overrides: 3 },
  ],
  overridesNote:
    "Overrides fell from 8% to 3% over the same period — the system is catching cleaner each cycle.",
};

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
   * an SPV that fronts multiple properties. */
  accountHolder: string;
  /* Live connection health — drives the per-row pill. */
  connectionStatus: BankConnectionStatus;
  /* Human-readable last-sync label ("4h ago", "May 28", "Never"). */
  lastSynced: string;
}

export interface PropertyRecentSession {
  id: string;
  cycle: string;
  status: WorkspaceStatus;
  statusLabel: string;
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
  period: string;
  closeStatus: CloseStatus;
  openItems: number;
  exceptions: number;
  tieOut: "Tied" | "Untied" | "Pending";
  lastReconciled: string;
  /* Banks + recent activity */
  banks: PropertyBankMapping[];
  recentSessions?: PropertyRecentSession[];
}

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

export const properties: PropertyRecord[] = [
  {
    id: "prop-westlake-1849",
    code: "TH-1247",
    ledgerPropertyId: "P-1247",
    legalEntity: "Tahoe Holdings LLC dba 1247 Mission St",
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
    period: "May 2026",
    closeStatus: "in-review",
    openItems: 2,
    exceptions: 1,
    tieOut: "Pending",
    lastReconciled: "Apr 2026",
    banks: [
      chaseBank("Operating", "******3421", "1010 — Operating Cash"),
      wellsBank("Security Deposit", "******7782", "1020 — Security Deposit"),
      boaBank("Reserve", "******9034", "1030 — Capital Reserve"),
      chaseBank("Escrow", "******8856", "1040 — Tax Escrow"),
    ],
    recentSessions: [
      { id: "sess-may2026-2", cycle: "May 2026 - 2", status: "active", statusLabel: "Needs review" },
      { id: "sess-may2026", cycle: "May 2026", status: "failed", statusLabel: "Failed" },
      { id: "sess-apr2026", cycle: "Apr 2026", status: "complete", statusLabel: "Complete" },
    ],
  },
  {
    id: "prop-mission-1247",
    code: "MIS-1247",
    ledgerPropertyId: "P-1310",
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
    period: "May 2026",
    closeStatus: "closed",
    openItems: 0,
    exceptions: 0,
    tieOut: "Tied",
    lastReconciled: "May 2026",
    banks: [
      chaseBank("Operating", "******1180", "1010 — Operating Cash"),
      wellsBank("Reserve", "******4421", "1030 — Capital Reserve"),
      boaBank("Security Deposit", "******7720", "1020 — Security Deposit"),
    ],
    recentSessions: [
      { id: "sess-mis-may", cycle: "May 2026", status: "complete", statusLabel: "Complete" },
      { id: "sess-mis-apr", cycle: "Apr 2026", status: "complete", statusLabel: "Complete" },
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
    period: "May 2026",
    closeStatus: "closed",
    openItems: 0,
    exceptions: 0,
    tieOut: "Tied",
    lastReconciled: "May 2026",
    banks: [
      chaseBank("Operating", "******9912", "1010 — Operating Cash"),
      wellsBank("Reserve", "******3344", "1030 — Capital Reserve"),
    ],
    recentSessions: [
      { id: "sess-hgt-may", cycle: "May 2026", status: "complete", statusLabel: "Complete" },
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
    period: "May 2026",
    closeStatus: "closed",
    openItems: 0,
    exceptions: 0,
    tieOut: "Tied",
    lastReconciled: "Apr 2026",
    banks: [chaseBank("Operating", "******5500", "1010 — Operating Cash")],
    recentSessions: [
      { id: "sess-fol-apr", cycle: "Apr 2026", status: "complete", statusLabel: "Complete" },
    ],
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
    period: "May 2026",
    closeStatus: "in-review",
    openItems: 3,
    exceptions: 2,
    tieOut: "Pending",
    lastReconciled: "Mar 2026",
    banks: [
      chaseBank("Operating", "******2210", "1010 — Operating Cash"),
      wellsBank("Reserve", "******8865", "1030 — Capital Reserve"),
    ],
    recentSessions: [
      { id: "sess-oak-may", cycle: "May 2026", status: "active", statusLabel: "Needs review" },
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
    period: "May 2026",
    closeStatus: "failed",
    openItems: 5,
    exceptions: 4,
    tieOut: "Untied",
    lastReconciled: "Mar 2026",
    banks: [
      wellsBank("Operating", "******1145", "1010 — Operating Cash"),
      chaseBank("Reserve", "******7720", "1030 — Capital Reserve"),
    ],
    recentSessions: [
      { id: "sess-emr-may", cycle: "May 2026", status: "failed", statusLabel: "Failed" },
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
    period: "May 2026",
    closeStatus: "needs-input",
    openItems: 1,
    exceptions: 1,
    tieOut: "Pending",
    lastReconciled: "Apr 2026",
    banks: [boaBank("Operating", "******6601", "1010 — Operating Cash")],
    recentSessions: [
      { id: "sess-brk-may", cycle: "May 2026", status: "active", statusLabel: "Needs input" },
    ],
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
    period: "May 2026",
    closeStatus: "draft",
    openItems: 0,
    exceptions: 0,
    tieOut: "Pending",
    lastReconciled: "Never",
    banks: [chaseBank("Operating", "******4280", "1010 — Operating Cash")],
    recentSessions: [],
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
    period: "May 2026",
    closeStatus: "draft",
    openItems: 0,
    exceptions: 0,
    tieOut: "Pending",
    lastReconciled: "Never",
    banks: [
      chaseBank("Operating", "******1900", "1010 — Operating Cash"),
      wellsBank("Reserve", "******5520", "1030 — Capital Reserve"),
    ],
    recentSessions: [],
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
    period: "May 2026",
    closeStatus: "open",
    openItems: 0,
    exceptions: 0,
    tieOut: "Pending",
    lastReconciled: "Apr 2026",
    banks: [
      chaseBank("Operating", "******2114", "1010 — Operating Cash"),
      boaBank("Security Deposit", "******6688", "1020 — Security Deposit"),
    ],
    recentSessions: [],
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
    period: "May 2026",
    closeStatus: "open",
    openItems: 0,
    exceptions: 0,
    tieOut: "Pending",
    lastReconciled: "Apr 2026",
    banks: [wellsBank("Operating", "******8033", "1010 — Operating Cash")],
    recentSessions: [],
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
    period: "May 2026",
    closeStatus: "closed",
    openItems: 0,
    exceptions: 0,
    tieOut: "Tied",
    lastReconciled: "May 2026",
    banks: [chaseBank("Operating", "******4477", "1010 — Operating Cash")],
    recentSessions: [
      { id: "sess-noe-may", cycle: "May 2026", status: "complete", statusLabel: "Complete" },
    ],
  },
];

/* Quick stats consumed by the Properties header counters. Calculated once
 * at module load so the header doesn't re-derive on every render. */
export const propertiesStats = {
  total: properties.length,
  closed: properties.filter((p) => p.closeStatus === "closed").length,
  inReview: properties.filter(
    (p) => p.closeStatus === "in-review" || p.closeStatus === "needs-input"
  ).length,
  failed: properties.filter((p) => p.closeStatus === "failed").length,
  open: properties.filter((p) => p.closeStatus === "open" || p.closeStatus === "draft").length,
};
