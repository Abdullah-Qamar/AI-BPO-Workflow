"use client";

/* PixelField — three sequential-bloom AI loading shapes on a single canvas.
 *
 * Motion-design tuning (do not "simplify" these without checking the look):
 *   • Easings are per-cycle, not global-time (avoids 1Hz stutter).
 *   • Each node blooms with ease-out-back (~6% overshoot, then settle).
 *   • Each cycle releases with ease-in cubic (hold-then-snap-out fade).
 *
 * Usage:
 *   <PixelField shape="arrow" size={560} />
 *   <PixelField shape="cluster" dotColor="#111" accentColor="#e8a04a" accentReach={0.4} />
 */

import { useEffect, useRef, type CSSProperties } from "react";

export type PixelFieldShape = "arrow" | "swirl" | "cluster";
export type PixelFieldEasing = "linear" | "sine" | "quart-out" | "expo-inout";

interface PatternParams {
  sharpness: number;
  speed: number;
  stagger: number;
  hold: number;
}

const TAU = Math.PI * 2;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── bounded easings: [0..1] → [0..1], applied to each animation cycle ─────
const EASINGS: Record<PixelFieldEasing, (t: number) => number> = {
  linear: (t) => t,
  sine: (t) => 0.5 - 0.5 * Math.cos(t * Math.PI),
  "quart-out": (t) => 1 - Math.pow(1 - t, 4),
  "expo-inout": (t) =>
    t <= 0
      ? 0
      : t >= 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,
};

// ease-out-back: snap → ~6% overshoot → settle. Used for bloom-in.
const BACK_C1 = 1.5;
const BACK_C3 = BACK_C1 + 1;
const easeOutBack = (t: number) => {
  const k = t - 1;
  return 1 + BACK_C3 * k * k * k + BACK_C1 * k * k;
};
// ease-in cubic: hold-then-release. Used for fade-out.
const easeInCubic = (t: number) => t * t * t;

function nodeEnvelope(
  phase: number,
  nbs: number,
  nbe: number,
  fadeStart: number,
  fadeEnd: number
) {
  let scale: number;
  if (phase < nbs) scale = 0;
  else if (phase < nbe) scale = easeOutBack((phase - nbs) / (nbe - nbs));
  else scale = 1;
  let fade: number;
  if (phase < fadeStart) fade = 1;
  else if (phase < fadeEnd)
    fade = 1 - easeInCubic((phase - fadeStart) / (fadeEnd - fadeStart));
  else fade = 0;
  return scale * fade;
}

function cyclePhase(t: number, speed: number, easing: PixelFieldEasing) {
  const raw = (((t * speed) % 1) + 1) % 1;
  return (EASINGS[easing] || EASINGS.linear)(raw);
}

// ── shape geometry (normalized to [-1, 1]) ────────────────────────────────
const CLUSTER_NODES: [number, number][] = [
  [-0.281, -0.635],
  [0.281, -0.635],
  [-0.604, -0.304],
  [0.604, -0.304],
  [0.0115, 0.0269],
  [-0.604, 0.304],
  [0.604, 0.304],
  [-0.281, 0.635],
  [0.281, 0.635],
];
const CLUSTER_R = 0.219;
// bloom order: clockwise around the outer ring, center node last
const CLUSTER_ORDER = [1, 3, 6, 8, 7, 5, 2, 0, 4];

const SWIRL_NODES: [number, number][] = [
  // inner ring (blooms first)
  [-0.233, -0.256],
  [0.256, -0.233],
  [0.233, 0.256],
  [-0.256, 0.233],
  // outer ring
  [-0.233, -0.744],
  [0.744, -0.233],
  [0.256, 0.744],
  [-0.744, 0.256],
];
const SWIRL_R = 0.211;

// [x, y, radius, sequenceIndex] — paired wings share an index so they bloom together
const ARROW_NODES: [number, number, number, number][] = [
  [-0.022, -0.6, 0.211, 0], // top of shaft
  [-0.022, -0.111, 0.211, 1], // mid shaft
  [-0.744, -0.056, 0.222, 2], // outer-left wing
  [0.744, -0.056, 0.222, 2], // outer-right wing
  [-0.411, 0.3, 0.222, 3], // inner-left wing
  [0.411, 0.3, 0.222, 3], // inner-right wing
  [0.0, 0.6, 0.211, 4], // tip
];
const ARROW_SEQ_COUNT = 5;

type PatternFn = (
  nx: number,
  ny: number,
  t: number,
  p: PatternParams,
  easing: PixelFieldEasing
) => number;

// ── patterns: (nx, ny, t, params, easing) → field value at the cell ──────
const PATTERNS: Record<PixelFieldShape, PatternFn> = {
  cluster(nx, ny, t, p, easing) {
    /* speed === 0 is the static-pose escape hatch: every node holds at
     * scale 1, no animation. Used by AgentsPanel to render idle avatars
     * as a fully-resolved grey shape instead of a blank canvas. */
    const isStatic = p.speed === 0;
    const phase = isStatic ? 0 : cyclePhase(t, p.speed, easing);
    const stride = p.stagger;
    const bloomDur = stride * 4;
    const fadeStart = Math.min(0.92, 8 * stride + bloomDur + p.hold);
    let value = 0;
    for (let n = 0; n < 9; n++) {
      const nbs = n * stride;
      const scale = isStatic
        ? 1
        : nodeEnvelope(phase, nbs, nbs + bloomDur, fadeStart, 1.0);
      if (scale < 0.005) continue;
      const target = CLUSTER_NODES[CLUSTER_ORDER[n]];
      const dx = nx - target[0],
        dy = ny - target[1];
      const d = Math.sqrt(dx * dx + dy * dy) - CLUSTER_R * scale;
      const nodeVal = (d < 0 ? 1 : Math.exp(-d * p.sharpness)) * scale;
      if (nodeVal > value) value = nodeVal;
    }
    return value;
  },

  arrow(nx, ny, t, p, easing) {
    const isStatic = p.speed === 0;
    const phase = isStatic ? 0 : cyclePhase(t, p.speed, easing);
    const stride = p.stagger;
    const bloomDur = stride * 4;
    const fadeStart = Math.min(
      0.92,
      (ARROW_SEQ_COUNT - 1) * stride + bloomDur + p.hold
    );
    let value = 0;
    for (let i = 0; i < ARROW_NODES.length; i++) {
      const node = ARROW_NODES[i];
      const nbs = node[3] * stride;
      const scale = isStatic
        ? 1
        : nodeEnvelope(phase, nbs, nbs + bloomDur, fadeStart, 1.0);
      if (scale < 0.005) continue;
      const dx = nx - node[0],
        dy = ny - node[1];
      const d = Math.sqrt(dx * dx + dy * dy) - node[2] * scale;
      const nodeVal = (d < 0 ? 1 : Math.exp(-d * p.sharpness)) * scale;
      if (nodeVal > value) value = nodeVal;
    }
    return value;
  },

  swirl(nx, ny, t, p, easing) {
    const isStatic = p.speed === 0;
    const phase = isStatic ? 0 : cyclePhase(t, p.speed, easing);
    const stride = p.stagger;
    const bloomDur = stride * 4;
    const N = SWIRL_NODES.length;
    const fadeStart = Math.min(0.92, (N - 1) * stride + bloomDur + p.hold);
    let value = 0;
    for (let n = 0; n < N; n++) {
      const nbs = n * stride;
      const scale = isStatic
        ? 1
        : nodeEnvelope(phase, nbs, nbs + bloomDur, fadeStart, 1.0);
      if (scale < 0.005) continue;
      const target = SWIRL_NODES[n];
      const dx = nx - target[0],
        dy = ny - target[1];
      const d = Math.sqrt(dx * dx + dy * dy) - SWIRL_R * scale;
      const nodeVal = (d < 0 ? 1 : Math.exp(-d * p.sharpness)) * scale;
      if (nodeVal > value) value = nodeVal;
    }
    return value;
  },
};

// per-shape defaults — these are the values the playground ships with
const DEFAULT_PARAMS: Record<PixelFieldShape, PatternParams> = {
  cluster: { sharpness: 14.0, speed: 0.35, stagger: 0.05, hold: 0.18 },
  swirl: { sharpness: 14.0, speed: 0.35, stagger: 0.06, hold: 0.18 },
  arrow: { sharpness: 14.0, speed: 0.45, stagger: 0.1, hold: 0.12 },
};

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

interface LiveProps {
  shape: PixelFieldShape;
  gridSize: number;
  speed: number;
  easing: PixelFieldEasing;
  samples: number;
  contrast: number;
  gamma: number;
  dotBase: number;
  dotMax: number;
  dotBias: number;
  accentReach: number;
  dotRGB: [number, number, number];
  accentRGB: [number, number, number];
  params: PatternParams;
}

export interface PixelFieldProps {
  shape?: PixelFieldShape; // "arrow" | "swirl" | "cluster"
  size?: number; // CSS pixels, square
  gridSize?: number; // dot resolution (try 24-48)
  speed?: number; // global time multiplier
  easing?: PixelFieldEasing;
  samples?: number; // anti-alias samples per cell (1-3)
  dotColor?: string;
  accentColor?: string;
  accentReach?: number; // 0 = no accent, 1 = accent across full range
  bgColor?: string;
  dotBase?: number; // smallest dot radius (fraction of half-cell)
  dotMax?: number; // largest dot radius (fraction of half-cell)
  dotBias?: number; // exponent on field value before mapping to radius
  patternParams?: Partial<PatternParams>;
  contrast?: number;
  gamma?: number;
  className?: string;
  style?: CSSProperties;
}

export function PixelField({
  shape = "arrow",
  size = 560,
  gridSize = 34,
  speed = 1,
  easing = "linear",
  samples = 2,
  dotColor = "#111318",
  accentColor = "#e8a04a",
  accentReach = 0,
  bgColor = "#f3eee6",
  dotBase = 0.06,
  dotMax = 0.88,
  dotBias = 1.0,
  patternParams,
  contrast = 1,
  gamma = 1,
  className,
  style,
}: PixelFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Refs let the rAF loop read fresh prop values without re-binding each frame.
  const propsRef = useRef<LiveProps | null>(null);
  propsRef.current = {
    shape,
    gridSize,
    speed,
    easing,
    samples,
    contrast,
    gamma,
    dotBase,
    dotMax,
    dotBias,
    accentReach,
    dotRGB: hexToRGB(dotColor),
    accentRGB: hexToRGB(accentColor),
    params: { ...DEFAULT_PARAMS[shape], ...(patternParams || {}) },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 560;
      const cssH = canvas.clientHeight || 560;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let t = 0;
    let lastFrame = performance.now();
    let gridBuf = new Float32Array(0);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const props = propsRef.current;
      if (!props) return;
      t += dt * props.speed;

      const g = Math.round(props.gridSize);
      const pattern = PATTERNS[props.shape] || PATTERNS.arrow;
      const sampleCount = Math.max(1, Math.round(props.samples));
      if (gridBuf.length !== g * g) gridBuf = new Float32Array(g * g);
      const invG = 1 / g;
      const invS = 1 / sampleCount;
      /* When the outer speed prop is 0 we want a static peak-pose pose: every
       * node held at scale 1, no animation. The PATTERNS branches on
       * `p.speed === 0` for that — but `p.speed` defaults to the per-pattern
       * value (0.35 etc.) from DEFAULT_PARAMS. Forward the outer 0 down into
       * the inner params here so static detection works. */
      const renderParams =
        props.speed === 0 ? { ...props.params, speed: 0 } : props.params;
      for (let j = 0; j < g; j++) {
        for (let i = 0; i < g; i++) {
          let sum = 0;
          for (let sy = 0; sy < sampleCount; sy++) {
            for (let sx = 0; sx < sampleCount; sx++) {
              const u = (i + (sx + 0.5) * invS) * invG;
              const v = (j + (sy + 0.5) * invS) * invG;
              sum += pattern(u * 2 - 1, v * 2 - 1, t, renderParams, props.easing);
            }
          }
          let val = sum / (sampleCount * sampleCount);
          val = (val - 0.5) * props.contrast + 0.5;
          val = clamp01(val);
          if (props.gamma !== 1) val = Math.pow(val, 1 / props.gamma);
          gridBuf[j * g + i] = val;
        }
      }

      const W = canvas.width,
        H = canvas.height;
      const cellW = W / g,
        cellH = H / g;
      const half = Math.min(cellW, cellH) * 0.5;
      const base = props.dotBase;
      const range = Math.max(0, props.dotMax - base);
      const bias = props.dotBias;
      const reach = props.accentReach;
      const [dR, dG, dB] = props.dotRGB;
      const [aR, aG, aB] = props.accentRGB;
      const accentActive = reach > 0;

      ctx.clearRect(0, 0, W, H);
      if (!accentActive) ctx.fillStyle = `rgb(${dR}, ${dG}, ${dB})`;
      for (let j = 0; j < g; j++) {
        for (let i = 0; i < g; i++) {
          const v = gridBuf[j * g + i];
          const shaped = bias === 1 ? v : Math.pow(v, bias);
          const r = (base + shaped * range) * half;
          if (r < 0.35) continue;
          if (accentActive) {
            const tt = clamp01((v - (1 - reach)) / Math.max(0.001, reach));
            const rr = dR + (aR - dR) * tt;
            const gg = dG + (aG - dG) * tt;
            const bb = dB + (aB - dB) * tt;
            ctx.fillStyle = `rgb(${rr | 0}, ${gg | 0}, ${bb | 0})`;
          }
          const x = i * cellW + cellW * 0.5;
          const y = j * cellH + cellH * 0.5;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame((now) => {
      lastFrame = now;
      tick(now);
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []); // loop set up once; props read live via propsRef

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: size,
        height: size,
        background: bgColor,
        display: "block",
        ...style,
      }}
    />
  );
}
