import type { SceneFrame } from '../shared/types';

/** Visual full-scale for particle density. Illustrative only, not a physical limit. */
export const FLOW_FULL_SCALE_REF_LPM = 40;
/** Airway flow magnitude that maps to full breath-particle activity (actual m3/s). */
export const AIRWAY_FULL_SCALE_M3_PER_S = 6e-4;
/** Gauge pressure that maps to full visual hood inflation. */
export const INFLATION_FULL_SCALE_PA_GAUGE = 1500;

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** 0 when there is no flow; otherwise 0.15..1 so small flows remain visible. */
export function flowActivity(refLpm: number): number {
  if (!(refLpm > 0)) return 0;
  return 0.15 + 0.85 * clamp01(refLpm / FLOW_FULL_SCALE_REF_LPM);
}

export function airwayActivity(airwayFlowM3PerS: number): number {
  return clamp01(Math.abs(airwayFlowM3PerS) / AIRWAY_FULL_SCALE_M3_PER_S);
}

/** Relative lung filling 0..1 for the chest pulse; 0 when no patient model is active. */
export function breathFillFrac(frame: SceneFrame | null): number {
  if (!frame || frame.breathPhase === null) return 0;
  const p = clamp01(frame.breathPhaseProgressFrac);
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
  return frame.breathPhase === 'inspiration' ? eased : 1 - eased;
}

/** Uniform visual scale of the hood film (1 = relaxed). Small, purely illustrative. */
export function hoodInflationScale(frame: SceneFrame | null): number {
  if (!frame) return 1;
  const g = frame.helmetPressurePaGauge / INFLATION_FULL_SCALE_PA_GAUGE;
  const x = Number.isFinite(g) ? Math.min(1, Math.max(-0.4, g)) : 0;
  return 1 + 0.03 * x;
}
