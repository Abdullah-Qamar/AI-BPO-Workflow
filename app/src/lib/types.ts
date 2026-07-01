// Data contracts mirror the shapes in PRODUCT.md and RECONCILIATION_FLOW_HANDOFF.md.

export type RunState =
  | "draft"
  | "running"
  | "reconciling"
  | "review"
  | "updating-yardi"
  | "complete";

export type BankStage =
  | "waiting"
  | "uploading"
  | "scanning"
  | "statement-ready"
  | "ledger-importing"
  | "ledger-imported"
  | "parsing"
  | "normalizing"
  | "normalized"
  | "comparing"
  | "review"
  | "complete"
  | "excluded";

export type SessionStatus =
  | "Draft"
  | "Importing"
  | "Parsing"
  | "Reconciling"
  | "Needs input"
  | "Needs review"
  | "Ready for handoff"
  | "Updating"
  | "Complete";

export type AgentRole = "intake" | "reconciliation" | "exception" | "summary";

export interface BankMapping {
  id: string;
  name: string;
  type: string;
  account: string;
  gl: string;
  bankId: string;
}

export interface Property {
  id: string;
  code: string;
  ledgerPropertyId: string;
  legalEntity: string;
  name: string;
  address: string;
  market: string;
  type: string;
  units: number;
  owner: string;
  accountant: string;
  ledgerSource: "Yardi" | "Manual" | "Hybrid" | string;
  fiscalCalendar: string;
  period: string;
  closeStatus: string;
  openItems: number;
  exceptions: number;
  tieOut: string;
  lastReconciled: string;
  banks: BankMapping[];
}

export interface Session {
  id: string;
  workspaceId: string;
  propertyId: string;
  property: string;
  cycle: string;
  status: SessionStatus;
  detail: string;
}

export interface WorkspaceBank {
  id: string;
  name: string;
  shortName: string;
  brandClass: string;
  logo: string;
  account: string;
  statement: string;
  ledger: string;
  transactions: number;
  inflow: string;
  outflow: string;
  balance: string;
  confidence: string;
  type: string;
  gl: string;
  bankId: string;
  reconciliationKey: string;
}

export interface CommentItem {
  author: string;
  copy: string;
  at: string;
}

export interface RecordItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  meta: string;
  confidence: string;
  reason: string;
  evidence: string[];
  comments: CommentItem[];
  guidanceCaptured?: boolean;
}

export interface BankBucket {
  statementTotal: string;
  ledgerTotal: string;
  netDifference: string;
  matchRate: string;
  approved: RecordItem[];
  exceptions: RecordItem[];
}

export interface AgentEvent {
  id: string;
  type: "user" | "system" | "agent";
  agentRole?: AgentRole;
  title: string;
  copy: string;
  at: string;
}
