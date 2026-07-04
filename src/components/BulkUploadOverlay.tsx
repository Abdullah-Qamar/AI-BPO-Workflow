"use client";

/* BulkUploadOverlay — focused modal for bulk statement + ledger upload.
 *
 * Shell mirrors NewSessionModal so the app has ONE modal chrome vocabulary:
 * cool horizontal gradient outer, 28px radius, 12px padding; a header with
 * title + subtitle + close X on the right; a white card inside that hosts
 * the actual work surface. This overlay's card is the BulkUploadCard, which
 * already carries the drop zone + associated-bank chips — now with more
 * breathing room around them because the modal is bigger. */

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  BulkUploadCard,
  type BankStatementState,
} from "./BulkUploadCard";
import type { PropertyBank } from "@/lib/seed";

export function BulkUploadOverlay({
  open,
  banks,
  uploads,
  onUploadStatement,
  onBrowseAll,
  onClose,
}: {
  open: boolean;
  banks: PropertyBank[];
  uploads: Record<string, BankStatementState>;
  onUploadStatement: (bankId: string) => void;
  onBrowseAll?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
        animation: "bulk-overlay-fade 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Upload bank statements and ledgers"
    >
      {/* Backdrop — same tone as NewSessionModal so both modals feel unified. */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(48, 59, 69, 0.42)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Modal shell — gradient gutter mirrors NewSessionModal. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: 780,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
          padding: 12,
          background:
            "linear-gradient(90deg, #C9D6E3 0%, #D6E0EA 50%, #BFC9D8 100%)",
          borderRadius: 28,
          boxShadow:
            "0 32px 64px rgba(20, 28, 38, 0.28), 0 12px 28px rgba(20, 28, 38, 0.16)",
          display: "flex",
          flexDirection: "column",
          animation:
            "bulk-overlay-rise 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <Header onClose={onClose} />
        <Card>
          <BulkUploadCard
            banks={banks}
            uploads={uploads}
            onUploadStatement={onUploadStatement}
            onBrowseAll={onBrowseAll}
            flat
          />
        </Card>
        <div style={{ height: 4, flexShrink: 0 }} />
      </div>

      <style>{`
        @keyframes bulk-overlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bulk-overlay-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
          Upload statements &amp; ledgers
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: "16px",
            color: "#6B7280",
          }}
        >
          Drop files and we'll route each one to its associated bank
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
  /* White inner card mirrors NewSessionModal's Card — but sized to breathe
   * for the upload flow. The BulkUploadCard renders its own hero + chip strip
   * inside; the modal adds a bigger canvas around it. */
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
        className="flex flex-col overflow-y-auto scroll-thin"
        style={{
          width: "100%",
          padding: 18,
          flex: 1,
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
