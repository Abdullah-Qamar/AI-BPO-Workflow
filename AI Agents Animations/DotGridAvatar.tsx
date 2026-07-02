import { useEffect, useRef } from "react";

export type DotGridPattern = "pulse" | "stars" | "summary";

export type DotGridAvatarProps = {
  size?: number;
  pattern?: DotGridPattern;
  period?: number;            // seconds; overrides the per-pattern default
  spacing?: number;
  baseRadius?: number;
  amp?: number;
  baseAlpha?: number;
  peakAlpha?: number;
  edgeFadeFrac?: number;      // soft fade band at the hex boundary, as fraction of R
  dotColor?: string;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
};

type Dot = { x: number; y: number; dx: number; dy: number; edge: number };

const DEFAULT_PERIODS: Record<DotGridPattern, number> = {
  pulse: 2.6,
  stars: 2.6,
  summary: 3.5,
};

const summaryCurve: { samples: Float64Array | null; R: number } = { samples: null, R: -1 };
function getSummaryCurve(R: number): Float64Array {
  if (summaryCurve.samples && summaryCurve.R === R) return summaryCurve.samples;
  const N = 220;
  const rhoMain = 0.42 * R;
  const rhoD = 0.18 * R;
  const K = 8;
  const arr = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * i) / N;
    arr[i * 2]     = rhoMain * Math.cos(th) - rhoD * Math.cos(K * th);
    arr[i * 2 + 1] = rhoMain * Math.sin(th) - rhoD * Math.sin(K * th);
  }
  summaryCurve.samples = arr;
  summaryCurve.R = R;
  return arr;
}

const SQRT3_2 = 0.8660254037844387;

// Flat-top hexagon SDF with apothem `a`. Negative inside.
function sdfHexFlatTop(x: number, y: number, a: number) {
  return Math.max(Math.abs(y), SQRT3_2 * Math.abs(x) + 0.5 * Math.abs(y)) - a;
}

type Field = (dx: number, dy: number, t: number, R: number, T: number) => number;

const FIELDS: Record<DotGridPattern, Field> = {
  pulse(dx, dy, t, R, T) {
    const d = Math.hypot(dx, dy);
    const phase = (t / T) % 1;
    const sigma = R * 0.11;
    let g = 0;
    for (let k = 0; k < 2; k++) {
      const p = (phase + k * 0.5) % 1;
      const ringR = p * R * 1.15;
      const fade = (1 - p) * (1 - p);
      const z = (d - ringR) / sigma;
      const ring = fade * Math.exp(-z * z);
      if (ring > g) g = ring;
    }
    const hs = R * 0.10;
    const heart = 0.42 * Math.exp(-(d * d) / (2 * hs * hs));
    return heart > g ? heart : g;
  },
  stars(dx, dy, t, R, T) {
    const phase = (t / T) % 1;
    const off = R * 0.28;
    // [cx, cy, activeStart]. Clockwise sequential: TL -> TR -> BR -> BL.
    const centers: Array<[number, number, number]> = [
      [-off, -off, 0.00],
      [ off, -off, 0.25],
      [-off,  off, 0.75],
      [ off,  off, 0.50],
    ];
    const activeWindow = 0.50;

    const sigThin = R * 0.028;
    const invThin2 = 1 / (2 * sigThin * sigThin);

    let g = 0;
    for (let i = 0; i < 4; i++) {
      const c = centers[i];
      const localPhase = ((phase - c[2]) % 1 + 1) % 1;

      let localEnv: number;
      if (localPhase < activeWindow) {
        const tp = localPhase / activeWindow;
        localEnv = 0.25 + 0.75 * Math.sin(tp * Math.PI);
      } else {
        localEnv = 0.25;
      }

      const sigBody = R * (0.050 + 0.040 * localEnv);
      const tau     = R * (0.09 + 0.14 * localEnv);
      const invBody2 = 1 / (2 * sigBody * sigBody);

      const sx = dx - c[0];
      const sy = dy - c[1];
      const ax = Math.abs(sx), ay = Math.abs(sy);
      const body = Math.exp(-(sx * sx + sy * sy) * invBody2);
      const hRay = Math.exp(-(sy * sy) * invThin2) * Math.exp(-ax / tau);
      const vRay = Math.exp(-(sx * sx) * invThin2) * Math.exp(-ay / tau);
      let star = body;
      if (hRay > star) star = hRay;
      if (vRay > star) star = vRay;
      star *= localEnv;
      if (star > g) g = star;
    }
    return g;
  },
  summary(dx, dy, t, R, T) {
    const tau = (t / T) % 1;
    const samples = getSummaryCurve(R);
    const N = samples.length / 2;

    const sigma = R * 0.033;
    const inv2s2 = 1 / (2 * sigma * sigma);
    const maxD2 = 16 * sigma * sigma;

    const baseline = 0.30;
    const sigmaT = 0.07;
    const inv2t2 = 1 / (2 * sigmaT * sigmaT);

    let g = 0;
    for (let i = 0; i < N; i++) {
      const px = samples[i * 2];
      const py = samples[i * 2 + 1];
      const ex = dx - px, ey = dy - py;
      const dist2 = ex * ex + ey * ey;
      if (dist2 > maxD2) continue;
      const spatial = Math.exp(-dist2 * inv2s2);

      const u = i / N;
      let du = u - tau;
      du = du - Math.round(du);
      const timeF = baseline + (1 - baseline) * Math.exp(-du * du * inv2t2);

      const v = spatial * timeF;
      if (v > g) g = v;
    }
    return g;
  },
};

export default function DotGridAvatar({
  size = 480,
  pattern = "pulse",
  period,
  spacing = 13,
  baseRadius = 1.0,
  amp = 4.8,
  baseAlpha = 0.24,
  peakAlpha = 1.0,
  edgeFadeFrac = 0.05,
  dotColor,
  background,
  className,
  style,
}: DotGridAvatarProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, R = 0, dpr = 1;
    let dots: Dot[] = [];
    let raf = 0;
    const color = dotColor || getComputedStyle(wrap).color || "#111";
    const T = period ?? DEFAULT_PERIODS[pattern];
    const field = FIELDS[pattern];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) / 2;
      buildGrid();
    };

    const buildGrid = () => {
      dots = [];
      const s = spacing;
      const rowH = s * SQRT3_2;
      const cx = W / 2, cy = H / 2;
      const apothem = R - 2;
      const edgeFadeW = R * edgeFadeFrac;
      const rowsHalf = Math.ceil(R / rowH) + 1;
      const colsHalf = Math.ceil(R / s) + 1;
      for (let ry = -rowsHalf; ry <= rowsHalf; ry++) {
        const xOffset = (ry & 1) ? s / 2 : 0;
        const yy = cy + ry * rowH;
        for (let rx = -colsHalf; rx <= colsHalf; rx++) {
          const xx = cx + rx * s + xOffset;
          const dx = xx - cx, dy = yy - cy;
          const sdf = sdfHexFlatTop(dx, dy, apothem);
          if (sdf > 0) continue;
          const edge = Math.min(1, -sdf / edgeFadeW);
          dots.push({ x: xx, y: yy, dx, dy, edge });
        }
      }
    };

    const frame = (t: number) => {
      const tSec = t / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const g = field(d.dx, d.dy, tSec, R, T);
        const r = (baseRadius + amp * g) * d.edge;
        if (r < 0.15) continue;
        const a = (baseAlpha + (peakAlpha - baseAlpha) * g) * d.edge;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(frame);
    });
    ro.observe(wrap);

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [pattern, period, spacing, baseRadius, amp, baseAlpha, peakAlpha, edgeFadeFrac, dotColor]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ width: size, height: size, background, position: "relative", ...style }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
