"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  activeProperty,
  otherWorkspaces,
  selectedMonth,
  type PropertyWorkspace,
} from "@/lib/seed";

interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (propertyId: string, cycle: string) => void;
}

const STATUS_RANK: Record<string, number> = {
  failed: 0,
  active: 1,
  none: 2,
  complete: 3,
};

function rankFor(status: PropertyWorkspace["status"]) {
  if (status === null) return STATUS_RANK.none;
  return STATUS_RANK[status] ?? 99;
}

function statusLabel(status: PropertyWorkspace["status"]) {
  if (status === "active") return "Active";
  if (status === "failed") return "Failed";
  if (status === "complete") return "Closed";
  return "Pending";
}

export function NewSessionModal({ open, onClose, onSelect }: NewSessionModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const properties = useMemo(
    () => [activeProperty, ...otherWorkspaces],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties
      .filter((p) => {
        if (!q) return true;
        return (
          p.address.toLowerCase().includes(q) ||
          p.shortAddress.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.cityState.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => rankFor(a.status) - rankFor(b.status));
  }, [properties, query]);

  if (!open) return null;

  const handlePick = (propertyId: string) => {
    onSelect(propertyId, selectedMonth);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(48, 59, 69, 0.42)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: 704,
          maxWidth: "calc(100vw - 32px)",
          height: "min(489px, calc(100vh - 48px))",
          padding: 12,
          background:
            "linear-gradient(90deg, #C9D6E3 0%, #D6E0EA 50%, #BFC9D8 100%)",
          borderRadius: 28,
          boxShadow:
            "0 32px 64px rgba(20, 28, 38, 0.28), 0 12px 28px rgba(20, 28, 38, 0.16)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header onClose={onClose} />
        <Card>
          <SearchBar value={query} onChange={setQuery} />
          <List
            properties={filtered}
            onPick={handlePick}
            emptyQuery={query.trim().length === 0}
          />
        </Card>
        <div style={{ height: 4, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex flex-row justify-between items-center"
      style={{
        width: "100%",
        padding: "8px 16px 16px",
        flexShrink: 0,
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span
          style={{
            fontSize: 20,
            lineHeight: "24px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Select a property
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "#6B7280",
          }}
        >
          Start a new reconciliation run
        </span>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#43484E",
        }}
      >
        <X size={14} strokeWidth={3} />
      </button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        background: "#FFFFFF",
        border: "1px solid #ECEDEF",
        boxShadow: "0 0 4px rgba(0, 0, 0, 0.06)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: "100%",
          padding: 18,
          gap: 5,
          flex: 1,
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        width: "100%",
        padding: "12px 8px 12px 12px",
        gap: 10,
        background: "#F2F3FA",
        border: "1px solid #EEEFEF",
        borderRadius: 8,
        flexShrink: 0,
      }}
    >
      <Search size={15} strokeWidth={2} color="#929BA3" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search Properties"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 16,
          lineHeight: "19px",
          color: "#111827",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function List({
  properties,
  onPick,
  emptyQuery,
}: {
  properties: PropertyWorkspace[];
  onPick: (id: string) => void;
  emptyQuery: boolean;
}) {
  if (properties.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          flex: 1,
          minHeight: 0,
          padding: 24,
          fontSize: 14,
          lineHeight: "17px",
          color: "#6B7280",
          textAlign: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>
          No properties match
        </span>
        <span>
          {emptyQuery
            ? "Add a property in the Properties workspace."
            : "Try a different name, code, or city."}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-y-auto scroll-thin"
      style={{ flex: 1, minHeight: 0 }}
    >
      {properties.map((p, i) => (
        <div key={p.id} className="flex flex-col" style={{ flexShrink: 0 }}>
          <PropertyRow property={p} onPick={() => onPick(p.id)} />
          {i < properties.length - 1 && (
            <div
              style={{
                width: "100%",
                height: 0,
                borderTop: "1px solid #F3F4F6",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PropertyRow({
  property,
  onPick,
}: {
  property: PropertyWorkspace;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-row justify-between items-center text-left"
      style={{
        width: "100%",
        height: 74,
        padding: 16,
        background: hover ? "#F8FAFC" : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 140ms ease",
        fontFamily: "inherit",
      }}
    >
      <div className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
        <span
          style={{
            fontSize: 16,
            lineHeight: "19px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {property.shortAddress}
        </span>
        <span
          style={{
            fontSize: 14,
            lineHeight: "17px",
            color: "#818893",
          }}
        >
          {property.code} · {property.cityState}
        </span>
      </div>

      <div
        className="flex flex-col items-end"
        style={{ gap: 6, flexShrink: 0 }}
      >
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "#818893",
            textAlign: "right",
          }}
        >
          Last closed {property.lastClosed}
        </span>
        <span
          style={{
            fontSize: 14,
            lineHeight: "17px",
            fontWeight: 600,
            color: "#111827",
            textAlign: "right",
          }}
        >
          {statusLabel(property.status)}
        </span>
      </div>
    </button>
  );
}
