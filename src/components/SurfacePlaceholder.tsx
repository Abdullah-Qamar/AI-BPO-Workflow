"use client";

/* A destination that exists in the rail before its screen is built.
 *
 * Rules and Quality are both promoted to destinations by the rail rebuild, and
 * neither has been designed yet. Three ways to handle that are worse than this
 * one: a blank canvas says the app is broken, a spinner lies about work that is
 * not happening, and a chart of invented numbers is the exact failure the
 * Quality screen is being rebuilt to stop.
 *
 * So the page states what it is for, what its one number will be, what will be
 * on it, and where the specification lives. A reader who lands here by accident
 * learns something; a reader who came deliberately can go and read the spec.
 *
 * This is the cross-screen rule about empty states applied to a whole surface:
 * empty is a designed state, not a gap where a screen should be.
 */

import type { LucideIcon } from "lucide-react";

export interface PlaceholderSpec {
  title: string;
  /* The question this surface answers. One per surface, per the IA's discipline
   * of one object, one question, one number. */
  question: string;
  /* Its one number, named rather than shown, because showing it would mean
   * inventing it. */
  oneNumber: string;
  /* What will be on the screen. Concrete enough to be checked against later. */
  contents: { heading: string; detail: string }[];
  /* Anything being deliberately removed, and why. Only where something exists
   * today that this surface replaces. */
  removing?: { heading: string; detail: string }[];
  specRef: string;
  Icon: LucideIcon;
}

export function SurfacePlaceholder({ spec }: { spec: PlaceholderSpec }) {
  const { Icon } = spec;

  return (
    <main
      className="canvas-scope flex-1 min-w-0"
      style={{ background: "var(--bg-grad)", minHeight: "100vh" }}
    >
      <div
        className="canvas-pad"
        style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}
      >
        <div
          className="flex flex-col"
          style={{ gap: "var(--space-7)", paddingTop: "var(--space-6)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
            <div
              className="flex flex-row items-center"
              style={{ gap: "var(--space-4)" }}
            >
              <Icon
                size="var(--icon-lg)"
                strokeWidth="var(--stroke-md)"
                style={{ color: "var(--ink-tertiary)" }}
                aria-hidden
              />
              <h1 className="canvas-title ink-primary">{spec.title}</h1>
            </div>
            <p className="t-prose ink-secondary">{spec.question}</p>
          </div>

          <div
            className="flex flex-col"
            style={{
              background: "var(--surface-card)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
              padding: "var(--space-7)",
              gap: "var(--space-7)",
            }}
          >
            {/* The one number, named and not shown. Naming it is a commitment
              * that can be checked when the screen arrives; showing it would
              * mean making it up, on the one surface whose entire job is to say
              * whether the numbers can be trusted. */}
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              <span className="t-label">The one number this screen answers</span>
              <span
                className="t-title ink-primary"
                style={{ fontWeight: "var(--weight-medium)" }}
              >
                {spec.oneNumber}
              </span>
            </div>

            <div
              aria-hidden
              style={{ height: 1, background: "var(--line-hair)" }}
            />

            <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
              <span className="t-label">What will be here</span>
              {spec.contents.map((item) => (
                <div
                  key={item.heading}
                  className="flex flex-col"
                  style={{ gap: 2 }}
                >
                  <span
                    className="t-body ink-primary"
                    style={{ fontWeight: "var(--weight-medium)" }}
                  >
                    {item.heading}
                  </span>
                  <span className="t-prose ink-secondary">{item.detail}</span>
                </div>
              ))}
            </div>

            {spec.removing && spec.removing.length > 0 && (
              <>
                <div
                  aria-hidden
                  style={{ height: 1, background: "var(--line-hair)" }}
                />
                <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
                  <span className="t-label">
                    What is being taken off this screen, and why
                  </span>
                  {spec.removing.map((item) => (
                    <div
                      key={item.heading}
                      className="flex flex-col"
                      style={{ gap: 2 }}
                    >
                      <span
                        className="t-body ink-primary"
                        style={{ fontWeight: "var(--weight-medium)" }}
                      >
                        {item.heading}
                      </span>
                      <span className="t-prose ink-secondary">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div
              aria-hidden
              style={{ height: 1, background: "var(--line-hair)" }}
            />

            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="t-label">Specified in</span>
              <span className="t-body ink-secondary nums">{spec.specRef}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- The two surfaces ---------- */

export const RULES_PLACEHOLDER: Omit<PlaceholderSpec, "Icon"> = {
  title: "Rules",
  question:
    "What governs how the machine decides, who owns each piece of it, and is any of it still right?",
  oneNumber: "Override rate · how often a person disagreed",
  contents: [
    {
      heading: "Rules, as data rather than prose",
      detail:
        "Scope, condition, action, owner, created, expires. The knowledge base holds sentences today, and a sentence cannot be previewed, versioned, or used to reconstruct why March behaved differently from April.",
    },
    {
      heading: "The four steps to writing one",
      detail:
        "Propose it from a resolution, preview it against last month, check it against the rules already active, then approve it. The preview is the part every design of this kind forgets, and it is the difference between a setting and an informed decision.",
    },
    {
      heading: "Patterns and the rungs they sit on",
      detail:
        "Observed, proposed, provisional, autonomous. Each pattern carries how often it has been seen and how often a person agreed. Promotion needs evidence and a person. Demotion happens by itself when the override rate rises.",
    },
    {
      heading: "The things that never climb",
      detail:
        "Ambiguous matches, anything touching a security deposit, and the final write. They are rendered as exclusions rather than as patterns stuck at rung one, because they are a different kind of thing and not a low score.",
    },
  ],
  specRef: "docs/UX_SPECS.md section 4 · docs/FLOWS.md F7 and F9",
};

export const QUALITY_PLACEHOLDER: Omit<PlaceholderSpec, "Icon"> = {
  title: "Quality",
  question:
    "Is the work good, and is that getting better or worse? Read in the unit each audience thinks in.",
  oneNumber: "Escaped errors · found after posting, or by sampling",
  contents: [
    {
      heading: "Unexplained before any person touched it",
      detail:
        "What the machine could not account for on its own, frozen at its verdict. It must never improve because somebody worked harder afterwards.",
    },
    {
      heading: "Override rate",
      detail:
        "How often a person disagreed with the machine. Rising means drift or stale rules. It is the most informative number in the system and the product currently does not have it.",
    },
    {
      heading: "Escaped errors",
      detail:
        "Found after posting, or by the sample queue. The scariest number and the most valuable, and without sampling it has no source at all.",
    },
    {
      heading: "Reviewer minutes, and cost in dollars",
      detail:
        "Minutes for the accountant, dollars per reconciliation for the buyer. One run record, read in three units for three audiences.",
    },
  ],
  removing: [
    {
      heading: "Tokens used",
      detail:
        "An accountant cannot act on a token and the figure is mildly alarming. Cost belongs here in dollars per reconciliation, which is the unit a buyer compares against a salary. Tokens become an engineering drawer.",
    },
    {
      heading: "First-pass accuracy, as a headline",
      detail:
        "A school report about the machine, and one of four names this codebase uses for two different numbers. What replaces it is the override rate, which is a number about the work rather than about us.",
    },
  ],
  specRef: "docs/UX_SPECS.md section 5 · docs/TAXONOMY_AND_IA.md Part 5",
};
