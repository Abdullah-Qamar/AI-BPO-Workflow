"use client";

import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import {
  aiObservability,
  type AIAgentRow,
  type AICyclePoint,
  type AIDecision,
} from "@/lib/seed";

interface AIQualityDetailProps {
  onBack: () => void;
}

export function AIQualityDetail({ onBack }: AIQualityDetailProps) {
  const o = aiObservability;

  return (
    <main
      className="flex flex-col items-center flex-1 min-w-0 relative overflow-auto scroll-thin"
      style={{
        padding: "28px 60px 48px",
        background: "var(--bg-grad)",
      }}
    >
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1120, gap: 32 }}
      >
        <Header onBack={onBack} cycle={o.cycle} />

        <Card>
          <SectionEyebrow>This cycle · {o.cycle}</SectionEyebrow>
          <div
            className="flex flex-row"
            style={{ gap: 0, paddingTop: 8 }}
          >
            <BigMetric
              label="AI accuracy"
              value={`${o.accuracy}%`}
              hint="How often the AI's match or flag turned out to be correct."
              trend={o.accuracyTrend}
              higherIsBetter
            />
            <CardDivider />
            <BigMetric
              label="Overrides"
              value={`${o.overrides}%`}
              hint="How often a reviewer changed the AI's decision."
              trend={o.overridesTrend}
              higherIsBetter={false}
            />
            <CardDivider />
            <BigMetric
              label="Avg confidence"
              value={`${o.confidence}%`}
              hint="The AI's own sureness across all decisions this cycle."
              trend={o.confidenceTrend}
              higherIsBetter
            />
          </div>
        </Card>

        <Card>
          <div
            className="flex flex-row items-end justify-between"
            style={{ width: "100%" }}
          >
            <div className="flex flex-col" style={{ gap: 4 }}>
              <SectionEyebrow>Last 6 cycles</SectionEyebrow>
              <span
                style={{
                  fontSize: 14,
                  lineHeight: "17px",
                  color: "var(--text-2)",
                }}
              >
                AI accuracy over time — the trend you'd want to see.
              </span>
            </div>
            <LegendChip />
          </div>
          <TrendChart history={o.history} />
          <div
            style={{
              fontSize: 13,
              lineHeight: "17px",
              color: "var(--text-2)",
              fontStyle: "italic",
            }}
          >
            {o.overridesNote}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <SectionEyebrow>By AI agent</SectionEyebrow>
            <span
              style={{
                fontSize: 14,
                lineHeight: "17px",
                color: "var(--text-2)",
              }}
            >
              Four agents handle the run. Each one's quality is tracked
              separately.
            </span>
          </div>
          <div className="flex flex-col" style={{ marginTop: 8 }}>
            {o.byAgent.map((a, i) => (
              <AgentRow
                key={a.key}
                agent={a}
                showDivider={i < o.byAgent.length - 1}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <SectionEyebrow>Recent calls the AI made</SectionEyebrow>
            <span
              style={{
                fontSize: 14,
                lineHeight: "17px",
                color: "var(--text-2)",
              }}
            >
              A sample of recent decisions and the AI's reason — useful for
              spot-checking how it's thinking.
            </span>
          </div>
          <div className="flex flex-col" style={{ gap: 12, marginTop: 8 }}>
            {o.recentDecisions.map((d) => (
              <DecisionRow key={d.id} decision={d} />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function Header({ onBack, cycle }: { onBack: () => void; cycle: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 16, width: "100%" }}>
      <button
        onClick={onBack}
        className="flex flex-row items-center"
        style={{
          width: "fit-content",
          gap: 6,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--text-2)",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: "17px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-2)";
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} />
        <span>Back to Dashboard</span>
      </button>
      <div className="flex flex-row items-end justify-between">
        <div className="flex flex-col" style={{ gap: 4 }}>
          <h1
            style={{
              fontSize: 28,
              lineHeight: "34px",
              fontWeight: 400,
              color: "var(--text-1)",
              margin: 0,
            }}
          >
            AI Quality
          </h1>
          <span
            style={{
              fontSize: 14,
              lineHeight: "17px",
              color: "var(--text-2)",
            }}
          >
            How well the AI is doing — and where it could be better.
          </span>
        </div>
        <div
          className="flex flex-row items-center"
          style={{
            height: 36,
            padding: "0 14px",
            gap: 8,
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: 999,
            color: "var(--text-1)",
            fontSize: 14,
            lineHeight: "17px",
          }}
        >
          <span style={{ color: "var(--text-2)" }}>Cycle</span>
          <span>{cycle}</span>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: "100%",
        padding: 28,
        gap: 16,
        background: "var(--surface-card)",
        backgroundImage: "var(--surface-card-glow)",
        boxShadow: "var(--shadow-card)",
        borderRadius: 20,
      }}
    >
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 13,
        lineHeight: "17px",
        color: "var(--text-2)",
      }}
    >
      {children}
    </span>
  );
}

function CardDivider() {
  return (
    <div
      style={{
        width: 1,
        background: "var(--line-soft)",
        margin: "8px 0",
        flexShrink: 0,
      }}
    />
  );
}

function BigMetric({
  label,
  value,
  hint,
  trend,
  higherIsBetter,
}: {
  label: string;
  value: string;
  hint: string;
  trend: number;
  higherIsBetter: boolean;
}) {
  const flat = trend === 0;
  const positive = higherIsBetter ? trend > 0 : trend < 0;
  const trendColor = flat
    ? "var(--text-3)"
    : positive
    ? "#1A7048"
    : "#A32626";

  return (
    <div
      className="flex flex-col"
      style={{ flex: 1, gap: 10, padding: "8px 24px" }}
    >
      <span
        style={{
          fontSize: 13,
          lineHeight: "17px",
          color: "var(--text-2)",
        }}
      >
        {label}
      </span>
      <div
        className="flex flex-row items-baseline"
        style={{ gap: 10 }}
      >
        <span
          style={{
            fontSize: 36,
            lineHeight: "40px",
            color: "var(--text-1)",
          }}
        >
          {value}
        </span>
        <span
          className="flex flex-row items-center"
          style={{ gap: 4, color: trendColor }}
        >
          {flat ? null : positive ? (
            <TrendingUp size={12} strokeWidth={2} />
          ) : (
            <TrendingDown size={12} strokeWidth={2} />
          )}
          <span style={{ fontSize: 12, lineHeight: "14px" }}>
            {flat
              ? "unchanged"
              : `${trend > 0 ? "+" : ""}${trend} pts vs prev.`}
          </span>
        </span>
      </div>
      <span
        style={{
          fontSize: 12,
          lineHeight: "16px",
          color: "var(--text-3)",
        }}
      >
        {hint}
      </span>
    </div>
  );
}

function LegendChip() {
  return (
    <div
      className="flex flex-row items-center"
      style={{
        gap: 8,
        padding: "6px 12px",
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(255,255,255,0.7)",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "14px",
        color: "var(--text-2)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 2,
          background: "#2856E8",
          borderRadius: 2,
        }}
      />
      <span style={{ color: "var(--text-1)" }}>AI accuracy</span>
    </div>
  );
}

function TrendChart({ history }: { history: AICyclePoint[] }) {
  const W = 1040;
  const H = 220;
  const padL = 44;
  const padR = 24;
  const padT = 18;
  const padB = 38;

  const yMin = 80;
  const yMax = 100;
  const ySteps = [80, 85, 90, 95, 100];
  const xStep = (W - padL - padR) / (history.length - 1);

  const x = (i: number) => padL + i * xStep;
  const y = (v: number) =>
    padT + ((yMax - v) / (yMax - yMin)) * (H - padT - padB);

  const linePath = history
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.accuracy)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${x(history.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`;

  const last = history[history.length - 1];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="ai-accuracy-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2856E8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2856E8" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* y grid lines + labels */}
      {ySteps.map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(v)}
            y2={y(v)}
            stroke="#E6E8EE"
            strokeWidth={1}
            strokeDasharray={v === 100 ? "0" : "3 4"}
          />
          <text
            x={padL - 10}
            y={y(v) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#7F8893"
            fontFamily="inherit"
          >
            {v}%
          </text>
        </g>
      ))}

      {/* area under accuracy line */}
      <path d={areaPath} fill="url(#ai-accuracy-fill)" />

      {/* accuracy line */}
      <path
        d={linePath}
        stroke="#2856E8"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* data points */}
      {history.map((d, i) => {
        const isLast = i === history.length - 1;
        return (
          <g key={d.fullCycle}>
            <circle
              cx={x(i)}
              cy={y(d.accuracy)}
              r={isLast ? 5 : 3.5}
              fill="#FFFFFF"
              stroke="#2856E8"
              strokeWidth={isLast ? 2.5 : 2}
            />
            {isLast && (
              <text
                x={x(i)}
                y={y(d.accuracy) - 14}
                textAnchor="end"
                fontSize={13}
                fontWeight={500}
                fill="#303B45"
                fontFamily="inherit"
              >
                {d.accuracy}%
              </text>
            )}
          </g>
        );
      })}

      {/* x labels */}
      {history.map((d, i) => (
        <text
          key={d.fullCycle + "x"}
          x={x(i)}
          y={H - padB + 22}
          textAnchor="middle"
          fontSize={12}
          fill={i === history.length - 1 ? "#303B45" : "#7F8893"}
          fontFamily="inherit"
        >
          {d.monthLabel}
        </text>
      ))}
    </svg>
  );
}

function AgentRow({
  agent,
  showDivider,
}: {
  agent: AIAgentRow;
  showDivider: boolean;
}) {
  const flat = agent.trend === 0;
  const positive = agent.higherIsBetter ? agent.trend > 0 : agent.trend < 0;
  const trendColor = flat
    ? "var(--text-3)"
    : positive
    ? "#1A7048"
    : "#A32626";

  return (
    <>
      <div
        className="flex flex-row items-center"
        style={{
          padding: "16px 0",
          gap: 24,
        }}
      >
        <div
          className="flex flex-col"
          style={{ width: 240, gap: 4, flexShrink: 0 }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: "19px",
              color: "var(--text-1)",
              fontWeight: 500,
            }}
          >
            {agent.name}
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: "16px",
              color: "var(--text-3)",
            }}
          >
            {agent.description}
          </span>
        </div>

        <div
          className="flex flex-col flex-1"
          style={{ minWidth: 0 }}
        >
          <span
            style={{
              fontSize: 14,
              lineHeight: "17px",
              color: "var(--text-2)",
            }}
          >
            {agent.metricLabel}
          </span>
        </div>

        <div
          className="flex flex-row items-baseline"
          style={{ gap: 10, flexShrink: 0 }}
        >
          <span
            style={{
              fontSize: 20,
              lineHeight: "24px",
              color: "var(--text-1)",
            }}
          >
            {agent.value}%
          </span>
          <span
            className="flex flex-row items-center"
            style={{ gap: 4, color: trendColor, minWidth: 96, justifyContent: "flex-end" }}
          >
            {flat ? (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "currentColor",
                  opacity: 0.45,
                }}
              />
            ) : positive ? (
              <TrendingUp size={12} strokeWidth={2} />
            ) : (
              <TrendingDown size={12} strokeWidth={2} />
            )}
            <span style={{ fontSize: 12, lineHeight: "14px" }}>
              {flat
                ? "unchanged"
                : `${agent.trend > 0 ? "+" : ""}${agent.trend} pts`}
            </span>
          </span>
        </div>
      </div>
      {showDivider && (
        <div
          style={{
            width: "100%",
            height: 1,
            background: "var(--line-soft)",
          }}
        />
      )}
    </>
  );
}

function DecisionRow({ decision }: { decision: AIDecision }) {
  const accepted = decision.outcome === "accepted";

  return (
    <div
      className="flex flex-col"
      style={{
        padding: 16,
        gap: 10,
        background: "#FFFFFF",
        border: "1px solid #ECEDEF",
        borderRadius: 12,
      }}
    >
      <div
        className="flex flex-row items-center"
        style={{ gap: 10 }}
      >
        <AgentBadge agent={decision.agent} />
        <span
          style={{
            fontSize: 12,
            lineHeight: "14px",
            color: "var(--text-3)",
          }}
        >
          Confidence {decision.confidence}%
        </span>
        <div className="flex-1" />
        <OutcomeChip accepted={accepted} />
      </div>
      <span
        style={{
          fontSize: 15,
          lineHeight: "19px",
          color: "var(--text-1)",
          fontWeight: 500,
        }}
      >
        {decision.title}
      </span>
      <span
        style={{
          fontSize: 13,
          lineHeight: "18px",
          color: "var(--text-2)",
          fontStyle: "italic",
        }}
      >
        “{decision.reason}”
      </span>
    </div>
  );
}

function AgentBadge({ agent }: { agent: AIDecision["agent"] }) {
  const label =
    agent === "intake"
      ? "Intake"
      : agent === "reconciliation"
      ? "Reconciliation"
      : agent === "exception"
      ? "Exception"
      : "Summary";

  return (
    <span
      style={{
        fontSize: 11,
        lineHeight: "14px",
        padding: "4px 8px",
        background: "rgba(40, 86, 232, 0.08)",
        color: "#1F47C2",
        borderRadius: 6,
        fontWeight: 500,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}

function OutcomeChip({ accepted }: { accepted: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        lineHeight: "14px",
        padding: "4px 10px",
        background: accepted
          ? "rgba(26, 112, 72, 0.10)"
          : "rgba(163, 38, 38, 0.10)",
        color: accepted ? "#1A7048" : "#A32626",
        border: `1px solid ${
          accepted ? "rgba(26, 112, 72, 0.22)" : "rgba(163, 38, 38, 0.22)"
        }`,
        borderRadius: 6,
        fontWeight: 500,
      }}
    >
      {accepted ? "Accepted by reviewer" : "Overridden by reviewer"}
    </span>
  );
}
