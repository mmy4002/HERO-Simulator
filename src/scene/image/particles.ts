import type { Pt } from './anchors';

export interface Polyline {
  pts: Pt[];
  cum: number[];
  length: number;
}

export function polyline(pts: Pt[]): Polyline {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Point and unit tangent at arc-length fraction u (0..1). */
export function pointAt(line: Polyline, u: number): { x: number; y: number; tx: number; ty: number } {
  const s = Math.min(1, Math.max(0, u)) * line.length;
  let i = 1;
  while (i < line.cum.length - 1 && line.cum[i] < s) i++;
  const [ax, ay] = line.pts[i - 1];
  const [bx, by] = line.pts[i];
  const seg = line.cum[i] - line.cum[i - 1] || 1;
  const k = (s - line.cum[i - 1]) / seg;
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, tx: (bx - ax) / seg, ty: (by - ay) / seg };
}

const hash = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const fract = (x: number) => x - Math.floor(x);

export interface Particle {
  key: number;
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export interface StreamOptions {
  count: number;
  /** Simulated seconds for one particle to traverse the path. */
  transitS: number;
  radius: number;
  /** Max perpendicular spread in image pixels. */
  spread: number;
  reverse?: boolean;
  salt?: number;
}

/**
 * Deterministic particle positions as a pure function of simulation time.
 * Density (how many particles are shown) follows `activity` (0..1); speed is fixed in
 * simulated time, so changing flow never makes particles jump, pausing (constant timeS)
 * freezes them and reset (timeS = 0) restores the initial arrangement.
 */
export function streamParticles(line: Polyline, timeS: number, activity: number, o: StreamOptions): Particle[] {
  if (!(activity > 0) || !Number.isFinite(timeS)) return [];
  const salt = o.salt ?? 0;
  const out: Particle[] = [];
  for (let i = 0; i < o.count; i++) {
    if (hash(i, salt + 7) >= activity) continue;
    let u = fract(i / o.count + hash(i, salt) * 0.35 / o.count + timeS / o.transitS);
    if (o.reverse) u = 1 - u;
    const p = pointAt(line, u);
    const fade = Math.sin(Math.PI * u);
    const off = (hash(i, salt + 3) - 0.5) * 2 * o.spread * (0.3 + 0.7 * fade);
    out.push({ key: i, x: p.x - p.ty * off, y: p.y + p.tx * off, r: o.radius * (0.55 + 0.45 * fade), opacity: 0.25 + 0.75 * fade });
  }
  return out;
}
