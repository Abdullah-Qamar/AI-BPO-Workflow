"use client";

/* Per-bank upload list — the secondary path in the DRAFT state.
 *
 * Each row surfaces BOTH slots a reconciliation needs:
 *   • Bank statement (PDF/CSV from the bank)
 *   • Yardi ledger export (CSV/XLSX from the tenant)
 *
 * The two slots are connected by a thin solid wire that mirrors the
 * post-upload pair-card's wire connector — the metaphor stays consistent
 * from "needs to come together" through "is together". */

import Image from "next/image";
import { slotsFilled, type PropertyBank } from "@/lib/seed";
import { SlotChip, SlotConnector } from "./SlotChip";

export function BankUploadList({
  banks,
  onUploadStatement,
  onUploadLedger,
}: {
  banks: PropertyBank[];
  onUploadStatement?: (bankId: string) => void;
  onUploadLedger?: (bankId: string) => void;
}) {
  const totalSlots = banks.length * 2;
  const filledSlots = banks.reduce((n, b) => n + slotsFilled(b), 0);
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        background: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-depth-2)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--line-hair)",
        }}
      >
        <span className="flex-1 t-body ink-primary">Or upload by account</span>
        <span className="nums t-meta ink-tertiary">
          {filledSlots} of {totalSlots} files · {banks.length}{" "}
          {banks.length === 1 ? "account" : "accounts"}
        </span>
      </div>

      {banks.map((bank, i) => (
        <BankSlotRow
          key={bank.id}
          bank={bank}
          isLast={i === banks.length - 1}
          onUploadStatement={() => onUploadStatement?.(bank.id)}
          onUploadLedger={() => onUploadLedger?.(bank.id)}
        />
      ))}
    </div>
  );
}

function BankSlotRow({
  bank,
  isLast,
  onUploadStatement,
  onUploadLedger,
}: {
  bank: PropertyBank;
  isLast: boolean;
  onUploadStatement?: () => void;
  onUploadLedger?: () => void;
}) {
  const filled = slotsFilled(bank);
  const complete = filled === 2;

  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: "12px 16px",
        gap: 12,
        borderBottom: isLast ? "none" : "1px solid var(--line-hair)",
      }}
    >
      {/* Identity row */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 12 }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 40, height: 40 }}
        >
          <Image
            src={bank.logoSrc}
            width={36}
            height={36}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
          <div className="truncate t-body ink-primary">
            {bank.name}{" "}
            <span className="ink-tertiary">· {bank.type}</span>
          </div>
          <div className="truncate t-meta ink-tertiary">
            <span className="nums">{formatAccount(bank.accountNumber)}</span> ·{" "}
            {bank.ledgerCashAccount}
          </div>
        </div>
        <SlotProgress filled={filled} />
      </div>

      {/* Slot row */}
      <div
        className="flex flex-row items-center"
        style={{ width: "100%", gap: 0, paddingLeft: 52 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <SlotChip
            kind="statement"
            file={bank.statement}
            onPick={onUploadStatement}
          />
        </div>
        <SlotConnector complete={complete} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SlotChip
            kind="ledger"
            file={bank.ledger}
            onPick={onUploadLedger}
          />
        </div>
      </div>
    </div>
  );
}

function SlotProgress({ filled }: { filled: 0 | 1 | 2 }) {
  /* Two dots that fill as slots complete; small numeric counter on the right.
   * The pair is a status: half-filled is in flight, both filled is done, and
   * an unfilled dot is an absence rather than an event, so it takes --line. */
  const dot = (i: number) => ({
    width: 6,
    height: 6,
    borderRadius: 999,
    background:
      i < filled
        ? filled === 2
          ? "var(--status-ok)"
          : "var(--status-info)"
        : "var(--line)",
  });
  return (
    <div className="flex items-center shrink-0" style={{ gap: 8 }}>
      <span className="flex items-center" style={{ gap: 4 }}>
        <span style={dot(0)} />
        <span style={dot(1)} />
      </span>
      <span className="nums t-meta ink-tertiary">{filled} of 2</span>
    </div>
  );
}

function formatAccount(account: string): string {
  const last4 = account.replace(/[^0-9]/g, "").slice(-4);
  if (last4.length !== 4) return account;
  return `•••• ${last4}`;
}
