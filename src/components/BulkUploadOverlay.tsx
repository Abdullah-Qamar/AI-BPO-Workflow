"use client";

/* BulkUploadOverlay — focused modal for bulk statement + ledger upload.
 *
 * Built on ui/Overlay + ui/OverlayCard, which is the app's one modal chrome:
 * the shared scrim, --radius-panel, --shadow-depth-4. It used to hand-roll a
 * backdrop and a gradient gutter of its own, which meant two modals opening
 * over the same canvas dimmed it by different amounts.
 *
 * Inside the card the layout is unchanged: a header carrying title, subtitle
 * and close, then a bright inner sheet hosting the BulkUploadCard — which
 * already carries the drop zone and the associated-account chips, here with
 * more breathing room around them because the modal is bigger. */

import { X } from "lucide-react";
import {
  BulkUploadCard,
  type BankStatementState,
} from "./BulkUploadCard";
import type { PropertyBank } from "@/lib/seed";
import { Overlay, OverlayCard } from "./ui/Overlay";
import { IconButton } from "./ui/Button";

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
  /* Escape and backdrop-click both live in Overlay now. */
  return (
    <Overlay open={open} onDismiss={onClose}>
      <OverlayCard
        width={780}
        style={{
          display: "flex",
          flexDirection: "column",
          animation:
            "bulk-overlay-rise 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload bank statements and ledgers"
          className="flex flex-col"
          style={{ flex: 1, minHeight: 0, padding: "16px 12px 12px" }}
        >
          <Header onClose={onClose} />
          <Sheet>
            <BulkUploadCard
              banks={banks}
              uploads={uploads}
              onUploadStatement={onUploadStatement}
              onBrowseAll={onBrowseAll}
              flat
            />
          </Sheet>
        </div>

        <style>{`
          @keyframes bulk-overlay-rise {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </OverlayCard>
    </Overlay>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex flex-row justify-between items-start"
      style={{
        width: "100%",
        padding: "0 4px 12px 8px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="t-heading ink-primary">
          Upload statements &amp; ledgers
        </span>
        {/* Account, not bank. A file is routed to one of this property's
          * accounts — two of them can sit at the same bank, which is exactly
          * the case the routing has to get right. §1 keeps the two words
          * apart, and the card below this line already says "account". */}
        <span className="t-body ink-secondary">
          Drop files and we&apos;ll route each one to its associated account
        </span>
      </div>

      <IconButton
        variant="secondary"
        size="md"
        onClick={onClose}
        ariaLabel="Close"
        style={{ color: "var(--ink-secondary)" }}
      >
        <X size={14} strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  /* The bright inner sheet nested inside the modal card — the same one step of
   * nesting every listing in the app uses, so "the controls" and "the work
   * surface" stay visually separate. */
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        background: "var(--surface-list)",
        boxShadow: "var(--shadow-depth-1)",
        borderRadius: "var(--radius-sheet)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex flex-col overflow-y-auto scroll-thin"
        style={{
          width: "100%",
          padding: 8,
          flex: 1,
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
