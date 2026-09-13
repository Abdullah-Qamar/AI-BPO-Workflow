"use client";

/* WorkspaceDropZone — the whole workspace as a drop target.
 *
 * Dragging files anywhere over the workspace blurs the work behind a bright
 * white frame and asks for the drop, so the target is the whole surface rather
 * than a single upload slot the user has to aim at. It is the container itself,
 * so it drops straight in where the workspace column used to be a plain div.
 *
 * dragenter/dragleave fire on every child as the pointer crosses it, so a plain
 * boolean flickers; a depth counter that only clears at zero holds the overlay
 * steady while the pointer moves across the canvas and the agent bar. The type
 * check keeps a text/selection drag from ever raising the sheet — only a drag
 * that carries files. */

import { useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";

const carriesFiles = (e: React.DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes("Files");

export function WorkspaceDropZone({
  children,
  onFiles,
}: {
  children: ReactNode;
  onFiles?: (files: File[]) => void;
}) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  return (
    <div
      className="relative flex flex-row items-stretch flex-1 min-w-0"
      style={{ background: "var(--bg-grad)" }}
      onDragEnter={(e) => {
        if (!carriesFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver={(e) => {
        if (!carriesFiles(e)) return;
        /* Both required, or the browser treats the surface as non-droppable and
         * the cursor shows the "no drop" badge over it. */
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!carriesFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setActive(false);
      }}
      onDrop={(e) => {
        if (!carriesFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setActive(false);
        const files = Array.from(e.dataTransfer.files);
        onFiles?.(files);
      }}
    >
      {children}
      {active && <DropOverlay />}
    </div>
  );
}

/* The sheet. Bright white frame, the work blurred behind it, one instruction.
 * pointer-events are off so the drag keeps reaching the container beneath —
 * the overlay is a signal, not a target of its own. */
function DropOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 8,
        zIndex: 60,
        borderRadius: "var(--radius-panel)",
        border: "2px solid #FFFFFF",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.7), 0 0 44px rgba(255,255,255,0.55) inset, var(--shadow-depth-2)",
        background: "rgba(228,234,242,0.35)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{ gap: "var(--space-5)", textAlign: "center", padding: 24 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "#FFFFFF",
            boxShadow: "var(--shadow-depth-2)",
          }}
        >
          <UploadCloud size={28} strokeWidth={1.75} color="var(--ink-secondary)" />
        </div>
        <span
          style={{
            fontSize: "var(--type-display)",
            lineHeight: "var(--leading-tight)",
            fontWeight: "var(--weight-semibold)",
            letterSpacing: "var(--tracking-title)",
            color: "var(--ink-primary)",
          }}
        >
          Drop files to add them
        </span>
        <span
          style={{
            fontSize: "var(--type-body)",
            lineHeight: "var(--leading-ui)",
            color: "var(--ink-secondary)",
          }}
        >
          Bank statements and Yardi ledger exports
        </span>
      </div>
    </div>
  );
}
