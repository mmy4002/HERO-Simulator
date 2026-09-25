import { describe, expect, it } from 'vitest';
import type { SceneFrame } from '../shared/types';
import { airwayActivity, breathFillFrac, flowActivity, hoodInflationScale } from './activity';

const frame = (over: Partial<SceneFrame> = {}): SceneFrame => ({
  running: true,
  timeS: 0,
  helmetPressurePaGauge: 0,
  co2Frac: 0,
  o2Frac: 0.21,
  inletRefLpm: 0,
  maintenanceRefLpm: 0,
  overflowRefLpm: 0,
  overflowOpen: false,
  breathPhase: null,
  breathPhaseProgressFrac: 0,
  airwayFlowM3PerS: 0,
  ...over,
});

describe('scene activity mapping', () => {
  it('shows no flow for zero, negative or invalid rates and saturates at 1', () => {
    expect(flowActivity(0)).toBe(0);
    expect(flowActivity(-3)).toBe(0);
    expect(flowActivity(Number.NaN)).toBe(0);
    expect(flowActivity(1)).toBeGreaterThan(0.15);
    expect(flowActivity(1e6)).toBe(1);
  });

  it('breath activity is symmetric in direction', () => {
    expect(airwayActivity(3e-4)).toBeCloseTo(airwayActivity(-3e-4));
    expect(airwayActivity(1)).toBe(1);
  });

  it('breath fill rises in inspiration, falls in expiration, and is 0 without a patient', () => {
    expect(breathFillFrac(null)).toBe(0);
    expect(breathFillFrac(frame())).toBe(0);
    expect(breathFillFrac(frame({ breathPhase: 'inspiration', breathPhaseProgressFrac: 1 }))).toBeCloseTo(1);
    expect(breathFillFrac(frame({ breathPhase: 'expiration', breathPhaseProgressFrac: 1 }))).toBeCloseTo(0);
  });

  it('hood inflation is neutral for the static scene and bounded', () => {
    expect(hoodInflationScale(null)).toBe(1);
    expect(hoodInflationScale(frame({ helmetPressurePaGauge: 1e9 }))).toBeCloseTo(1.03);
    expect(hoodInflationScale(frame({ helmetPressurePaGauge: -1e9 }))).toBeGreaterThan(0.98);
  });
});
