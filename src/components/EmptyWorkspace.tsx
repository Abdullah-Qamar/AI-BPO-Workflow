"use client";

import { ArrowLeft, FileText, Table } from "lucide-react";

/* Empty workspace — shown on the Reconciliation route before a session is
 * opened. Rather than a lone line adrift in a flat gradient, the canvas
 * becomes a quiet, layered scene that teaches what a session holds: a bank
 * statement and a Yardi ledger, joined by the product's signature resting
 * wire, waiting to be worked.
 *
 * Depth comes from three ambient layers (edge vignette + a central dot field
 * + a soft spotlight) that give the surface a sense of space, plus the lifted
 * ghost surfaces sitting above it. The wire's port sockets breathe on offset
 * rhythms so the scene reads as idle-but-alive, not dead-empty. Everything
 * here is decorative (aria-hidden); the copy block carries the meaning. */
export function EmptyWorkspace() {
  return (
    <main
      className="flex flex-col items-center justify-center flex-1 min-w-0 relative"
      style={{ background: "var(--bg-grad)", overflow: "hidden" }}
    >
      <AmbientField />

      <div
        className="flex flex-col items-center"
        style={{ position: "relative", gap: 32, transform: "translateY(-3%)" }}
      >
        <SessionAtRest />

        <div
          className="flex flex-col items-center"
          style={{ gap: 12, maxWidth: 432, textAlign: "center" }}
        >
          <div className="flex flex-row items-center" style={{ gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "rgba(98, 116, 131, 0.55)",
              }}
            />
            {/* Both quiet lines on this canvas — this eyebrow and the pointer
              * to the list below — are the same level of aside, so they take the
              * same ink. They used to sit on --text-3 and --text-4, which alias
              * two different inks, so two things that read as one level rendered
              * as two. */}
            <span
              style={{
                fontSize: "var(--type-meta)",
                lineHeight: "var(--leading-ui)",
                letterSpacing: "var(--tracking-meta)",
                color: "var(--ink-tertiary)",
              }}
            >
              No session open
            </span>
          </div>

          <h1 className="t-heading" style={{ color: "var(--ink-primary)", margin: 0 }}>
            Ready when you are
          </h1>

          <p
            style={{
              fontSize: "var(--type-body)",
              lineHeight: "var(--leading-prose)",
              color: "var(--ink-secondary)",
              margin: 0,
            }}
          >
            Open a session from a property to load its bank statements, Yardi
            ledgers, and the agents that reconcile them.
          </p>

          <div
            className="flex flex-row items-center"
            style={{ gap: 6, marginTop: 2, color: "var(--ink-tertiary)" }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            <span style={{ fontSize: "var(--type-meta)", lineHeight: "var(--leading-ui)" }}>
              Choose from the Sessions list
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

/* Layered background: vignette (containment) → dot field (texture, faded at
 * the edges) → spotlight (lift under the scene). Ordered back-to-front so the
 * spotlight softens the dots directly behind the ghost surfaces. */
function AmbientField() {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(130% 110% at 50% 42%, transparent 55%, rgba(48, 59, 69, 0.07) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(98, 116, 131, 0.18) 1px, transparent 1.5px)",
          backgroundSize: "22px 22px",
          WebkitMaskImage:
            "radial-gradient(ellipse 52% 46% at 50% 44%, #000 0%, transparent 72%)",
          maskImage:
            "radial-gradient(ellipse 52% 46% at 50% 44%, #000 0%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(46% 40% at 50% 40%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 68%)",
        }}
      />
    </div>
  );
}

/* The hero: statement ↔ ledger joined by the resting wire. */
function SessionAtRest() {
  return (
    <div className="flex flex-row items-center" aria-hidden>
      <GhostSurface
        icon={<FileText size={14} strokeWidth={1.75} />}
        label="Statement"
      />
      <RestingWire />
      <GhostSurface
        icon={<Table size={14} strokeWidth={1.75} />}
        label="Ledger"
      />
      <style>{`
        @keyframes es-socket-breath { 0%, 100% { opacity: .4 } 50% { opacity: .85 } }
        .es-socket { animation: es-socket-breath 4.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .es-socket { animation: none; opacity: .6 } }
      `}</style>
    </div>
  );
}

/* A ghosted, at-rest surface — a flat icon+label header over a single short
 * skeleton line, lifted on the depth-2 shadow. Reads as "a document not yet
 * loaded", and hugs its content so the scene stays quiet. */
function GhostSurface({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 140,
        /* No fixed height — the card hugs its header + skeleton line so there
         * is no dead space below the content. */
        borderRadius: "var(--radius-card)",
        background: "var(--surface-card-glow)",
        border: "1px solid var(--line-soft)",
        boxShadow: "var(--shadow-depth-2)",
        padding: 12,
        gap: 10,
      }}
    >
      {/* Header — icon + name, flat (no chip). */}
      <span
        className="flex flex-row items-center"
        style={{
          alignSelf: "flex-start",
          gap: 6,
          color: "var(--ink-secondary)",
        }}
      >
        {icon}
        <span
          style={{
            fontSize: "var(--type-meta)",
            lineHeight: "var(--leading-ui)",
            letterSpacing: "var(--tracking-meta)",
            color: "var(--ink-secondary)",
          }}
        >
          {label}
        </span>
      </span>
      {/* One at-rest skeleton line, kept short so it reads as a hint. */}
      <span
        style={{
          height: 6,
          width: "60%",
          borderRadius: 3,
          background: "rgba(98, 116, 131, 0.16)",
        }}
      />
    </div>
  );
}

/* The signature wire, at rest: a dotted cable sagging gently between two
 * ringed port sockets. Mirrors WireConnector's inactive "blueprint" mode
 * (same stroke, dash, and socket glyph) so the empty state speaks the same
 * visual language as the live canvas. */
function RestingWire() {
  return (
    <div style={{ width: 120, height: 56, flexShrink: 0 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          d="M16 28 Q 60 32 104 28"
          stroke="rgba(98, 116, 131, 0.42)"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeDasharray="1.5 5"
          fill="none"
        />
        <circle
          cx={8}
          cy={28}
          r={6}
          fill="none"
          stroke="rgba(98, 116, 131, 0.35)"
          strokeWidth={1}
        />
        <circle
          className="es-socket"
          cx={8}
          cy={28}
          r={2.2}
          fill="rgba(98, 116, 131, 0.6)"
        />
        <circle
          cx={112}
          cy={28}
          r={6}
          fill="none"
          stroke="rgba(98, 116, 131, 0.35)"
          strokeWidth={1}
        />
        <circle
          className="es-socket"
          cx={112}
          cy={28}
          r={2.2}
          fill="rgba(98, 116, 131, 0.6)"
          style={{ animationDelay: "-2.3s" }}
        />
      </svg>
    </div>
  );
}
