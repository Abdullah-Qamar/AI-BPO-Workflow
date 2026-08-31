# AI surface reference

Working knowledge base for the AI/agent side of this product. Not a spec — the
vocabulary and the patterns we design against, plus how they map onto what
already exists here. Updated 2026-08-23.

Design-system constraints still apply in full: five type steps, three inks,
compact density scale, depth-1..4 shadows. Nothing below justifies a new colour,
a sixth type size, or an intermediate control height.

---

## 1. The three questions any AI surface answers

Everything in the literature collapses to three, and they belong to different
readers at different moments:

| Question | Reader | Moment | Surface here |
|---|---|---|---|
| What is it doing *right now*? | operator watching a run | live | AgentsPanel |
| Why did it decide *this*? | reviewer on one record | per-decision | ReviewCanvas / record drawer |
| Can I trust it *in aggregate*? | ops lead | weekly / per cycle | AI Quality |

Mixing them is the standard failure. A live panel that shows aggregate accuracy
is noise; a quality page that shows per-agent internals the reader cannot act on
is architecture leakage (we already deleted that card once — see
`AIQualityDetail.tsx` header comment).

---

## 2. Observability vocabulary

The industry has converged on OpenTelemetry GenAI semantic conventions. Use
these words consistently; they are what an engineer will implement against.

- **Trace** — one complete run, root to finish. Our unit is a reconciliation
  session, or a single record's decision.
- **Span** — one step inside a trace, with start/end, status, and attributes.
  Spans nest: `invoke_agent` → `chat` / `execute_tool` / `retrieval`.
- **Waterfall / timeline** — spans laid on one shared time axis. The 2026 move
  (Honeycomb's Agent Timeline, May 2026) is *one timeline for a multi-agent
  run*, not a separate tree per agent. Relevant to us: intake, reconciliation
  and summary should read as one continuous run, not three panels.
- **Retry visibility** — a silent retry storm hides inside averaged latency.
  Label attempts on the timeline explicitly.
- **Evaluation / score** — a judgment attached to production traffic after the
  fact (LLM-as-judge, rule, or human label). This is what turns traces into a
  quality number.
- **Layers captured**: LLM client calls, agent orchestration, tool/MCP calls,
  workflow composition, content, quality evaluation.

Platform postures worth knowing, because they imply different UIs: Langfuse =
trace-first and open; Braintrust = eval-first (tracing exists to feed the eval
loop); Arize/Phoenix = statistical, drift and embeddings.

**Our posture is neither.** Those are developer tools for the people who build
the agent. Our reader is an ops lead who cannot change a prompt. So we surface
*consequences* (exceptions, confidence, root causes) and offer exactly one
durable lever: a Knowledge rule. Hold that line.

---

## 3. Agent UX patterns (live surface)

Five that apply to every enterprise agent:

1. **Planning visibility** — show the plan before the work, so the operator can
   stop it early.
2. **Tool-use disclosure** — name what it touched (which statement, which
   ledger, which Yardi call), not just that it "processed".
3. **Memory surfacing** — what prior context is in play. For us: which Knowledge
   rules fired on this record.
4. **Multi-step tracking** — where in the run we are, and what remains.
5. **Recovery routing** — when it fails, where the work goes and who owns it.

The interface must show *what*, explain *why*, allow *override at any point*,
and *recover gracefully*.

---

## 4. Explainability (per-decision surface)

- **Progressive disclosure of reasoning** is the core mechanic: verdict first,
  evidence one level down, full trace two levels down. Never lead with the
  chain of thought.
- **Source attribution / provenance** — the claim points back at the exact
  statement line and ledger row. In regulated and financial contexts this is the
  substance of the explanation, not a garnish.
- **Evidence-strength framing** beats raw percentages. The useful taxonomy is
  *corroborating / single-source / conflicting / unsupported* — that maps
  cleanly onto match, single-sided match, contested match, and unmatched.
- **Trust calibration, not statistical literacy.** The goal is that the reader's
  trust tracks actual reliability. Exposing model limitations improves
  calibration; a bare "94%" does not. Prefer a label plus its denominator.
- **Rephrased-intent preview** — echo back what the AI understood before it
  acts. Emerging in high-stakes enterprise copilots.

---

## 5. Human-in-the-loop / handoff

- **Loop engineering**: design the trigger that decides when the agent continues
  alone versus escalates. Oversight should land where risk is, not everywhere.
- **Three work shapes**: agent completes and closes; agent proposes, human
  disposes; agent drafts, human finishes. Our reconciliation flow is mostly the
  second, with exceptions falling into the third.
- **Confidence-based escalation** — combine model confidence with task context
  (dollar amount, account, recurrence), never the score alone.
- **An escalation path is a spec**: who receives it, what they see, how long they
  have, what happens on timeout, how rejection routes back.
- **Human-on-the-loop** (supervising a running system) is distinct from
  **human-in-the-loop** (blocking on a decision). We likely need both: in-the-
  loop for exceptions, on-the-loop for the run itself.

---

## 6. Open questions for this product

Carry these into the design sessions rather than answering them here:

- Is the trace object the *session* or the *record*? They imply different shells.
- Does the ops lead ever need a real span waterfall, or is that a developer view
  we deliberately do not ship?
- Where does a Knowledge rule show its own observability — how does a reader see
  that a rule they added is working?
- Do the three agents stay three, or is that internal architecture we should
  stop exposing (same argument that killed the per-agent quality card)?

---

## Sources

- [Agent observability: complete guide 2026 — Braintrust](https://www.braintrust.dev/articles/agent-observability-complete-guide-2026)
- [AI Agent Observability 2026: Tracing & Monitoring Stack](https://www.digitalapplied.com/blog/ai-agent-observability-2026-tracing-monitoring-stack-guide)
- [Agent UX: UI Design for AI Agents in 2026 — Fuse Labs](https://fuselabcreative.com/ui-design-for-ai-agents/)
- [Top LLM Observability and Evaluation Platforms in 2026 — MarkTechPost](https://www.marktechpost.com/2026/08/09/top-llm-observability-and-evaluation-platforms-in-2026-langfuse-langsmith-braintrust-arize-and-more-compared/)
- [AI citation and source UI design patterns for 2026 — AYDesign](https://www.aydesign.ai/blog/ai-citation-source-ui-patterns-2026)
- [Explainable AI UI Design (XAI) — Eleken](https://www.eleken.co/blog-posts/explainable-ai-ui-design-xai)
- [Trust Calibration in XAI: Exposing Model Limitations to Lay Users (arXiv)](https://arxiv.org/pdf/2605.18036)
- [User-centered design guidelines for explainable AI: systematic review — AI Review](https://link.springer.com/article/10.1007/s10462-025-11363-y)
- [UI/UX & Human-AI Interaction patterns — Agentic Design](https://agentic-design.ai/patterns/ui-ux-patterns)
- [Human-in-the-Loop AI Agents: approval workflows — StackAI](https://www.stackai.com/insights/human-in-the-loop-ai-agents-how-to-design-approval-workflows-for-safe-and-scalable-automation)
- [Agent Handoff Patterns — Augment Code](https://www.augmentcode.com/guides/agent-handoff-patterns-human-agent-interface)
