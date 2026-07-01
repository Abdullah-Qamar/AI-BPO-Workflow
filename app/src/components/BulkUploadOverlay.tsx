"use client";

/* BulkUploadOverlay — wraps BulkUploadCard in a focused modal.
 *
 * Opened from the canvas "Re-upload" button. Backdrop is a quiet 8% black
 * scrim with a 6px blur — enough to push the canvas behind but not so much
 * that the user loses their place. Esc and backdrop click both close. The
 * card itself is the existing BulkUploadCard (full hero), so the user can
 * re-trigger a single drop that re-routes through all banks. */

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
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 60,
        background: "rgba(20, 24, 31, 0.32)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "bulk-overlay-fade 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
        padding: 24,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Upload bank statements and ledgers"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative"
        style={{
          width: "100%",
          maxWidth: 640,
          animation:
            "bulk-overlay-rise 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close upload overlay"
          className="absolute inline-flex items-center justify-center"
          style={{
            top: -12,
            right: -12,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "#FFFFFF",
            border: "1px solid rgba(157, 179, 197, 0.4)",
            boxShadow: "var(--shadow-depth-1)",
            cursor: "pointer",
            color: "var(--text-1)",
            zIndex: 1,
          }}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
        <BulkUploadCard
          banks={banks}
          uploads={uploads}
          onUploadStatement={(id) => {
            onUploadStatement(id);
          }}
          onBrowseAll={onBrowseAll}
        />
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
