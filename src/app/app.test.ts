import { describe, expect, it } from 'vitest';
import type { SimulationSample } from '../shared/types';
import { createEngine, DEFAULT_PARAMETERS } from '../engine';
import { toSample, toSceneFrame } from './mapping';
import { comparabilityIssues, runHeadless, summarize } from './runs';
import { parametersToJson, parseParametersJson, samplesToCsv } from './exports';
import { comparisonRows, decimate } from './chartData';
import { getLiveParameter, withLiveParameter } from '../config/controls';

const params = structuredClone(DEFAULT_PARAMETERS);

describe('mapping (with the real engine)', () => {
  it('averages flows over the interval from cumulative totals', () => {
    const e = createEngine(params);
    const s0 = e.getState();
    const s1 = e.advance(0.1);
    const sample = toSample(s1, s0);
    expect(sample.inletRefLpm).toBeCloseTo(30, 6);
    expect(sample.maintenanceRefLpm).toBeCloseTo(20, 6);
    expect(sample.overflowRefLpm).toBe(0);
    expect(sample.inspiredCo2Frac).toBeNull();
  });

  it('emits exactly one inspired-CO2 marker per completed breath', () => {
    const r = runHeadless(createEngine, { ...params, numerics: { ...params.numerics, durationS: 30 } });
    const markers = r.samples.filter((s) => s.inspiredCo2Frac !== null);
    expect(markers).toHaveLength(6);
    expect(r.summary.completedBreaths).toBe(6);
  });

  it('builds scene frames from live breath state and averaged flows', () => {
    const e = createEngine(params);
    const s0 = e.getState();
    const s1 = e.advance(0.5);
    const f = toSceneFrame(s1, toSample(s1, s0), true);
    expect(f.running).toBe(true);
    expect(f.breathPhase).toBe('inspiration');
    expect(f.airwayFlowM3PerS).toBeGreaterThan(0);
    expect(f.inletRefLpm).toBeCloseTo(30, 6);
  });
});

describe('runs', () => {
  it('headless default run: time-weighted overflow duty matches the engine surplus', () => {
    const r = runHeadless(createEngine, params);
    expect(r.haltReason).toBeNull();
    expect(r.samples.at(-1)!.timeS).toBeCloseTo(300, 6);
    const tail = r.samples.filter((s) => s.timeS > 100);
    const meanOverflow = tail.reduce((a, s) => a + s.overflowRefLpm, 0) / tail.length;
    expect(meanOverflow).toBeGreaterThan(8);
    expect(meanOverflow).toBeLessThan(12);
    expect(r.summary.overflowDutyCycleFrac).toBeGreaterThan(0.05);
    expect(r.summary.overflowDutyCycleFrac).toBeLessThan(0.1);
    expect(r.summary.o2SuppliedRefL).toBeCloseTo(150, 3);
    expect(r.summary.peakPressurePaAbs).toBeLessThan(params.outlets.overflowThresholdPaAbs + 100);
  });

  it('summary statistics are time-weighted over the run window', () => {
    const base: SimulationSample = { timeS: 0, helmetPressurePaAbs: 1e5, helmetPressurePaGauge: 0, co2Frac: 0, o2Frac: 0.21, inletRefLpm: 30, maintenanceRefLpm: 20, overflowRefLpm: 0, overflowOpen: false, inspiredCo2Frac: null };
    const samples = [0, 1, 2, 3, 4].map((i) => ({ ...base, timeS: i * 0.1, co2Frac: 0.01 * i, overflowRefLpm: i >= 3 ? 50 : 0, inspiredCo2Frac: i === 2 ? 0.03 : null }));
    const s = summarize(samples, 2.5, 100);
    expect(s.meanCo2Frac).toBeCloseTo(0.025);
    expect(s.peakCo2Frac).toBeCloseTo(0.04);
    expect(s.overflowDutyCycleFrac).toBeCloseTo(0.25);
    expect(s.meanInspiredCo2Frac).toBeCloseTo(0.03);
    expect(s.windowEndS).toBeCloseTo(0.4);
  });

  it('flags A/B runs that differ outside supply/outlet settings', () => {
    expect(comparabilityIssues(params, withLiveParameter(params, 'inletFlowSetpointRefLpm', 50))).toEqual([]);
    expect(comparabilityIssues(params, { ...params, numerics: { ...params.numerics, durationS: 60 } })).toEqual(['numerics settings differ']);
  });

  it('decimates long histories but keeps breath markers', () => {
    const r = runHeadless(createEngine, params);
    const d = decimate(r.samples);
    expect(d.length).toBeLessThanOrEqual(700);
    expect(d.filter((s) => s.inspiredCo2Frac !== null)).toHaveLength(60);
    expect(comparisonRows(r.samples.slice(0, 5), r.samples.slice(0, 5))).toHaveLength(5);
  });
});

describe('exports', () => {
  it('writes CSV with unit-bearing headers and event labels', () => {
    const e = createEngine(params);
    const s0 = e.getState();
    const s1 = e.advance(0.1);
    const csv = samplesToCsv([{ label: 'live', samples: [toSample(s0, null), toSample(s1, s0)], events: [{ timeS: s1.timeS, label: 'Inlet flow 40 ref L/min' }] }]);
    const [header, , row2] = csv.trim().split('\n');
    expect(header).toContain('helmet_pressure_bar_abs');
    expect(header).toContain('inlet_flow_ref_L_per_min');
    expect(row2.startsWith('live,0.10,')).toBe(true);
    expect(row2).toContain('Inlet flow 40 ref L/min');
  });

  it('round-trips parameters through JSON and rejects malformed files', () => {
    const changed = withLiveParameter(params, 'overflowThresholdPaAbs', 1.3e5);
    const back = parseParametersJson(parametersToJson(changed, 'test'), params);
    expect(back).toEqual(changed);
    expect(getLiveParameter(back, 'overflowThresholdPaAbs')).toBe(1.3e5);
    expect(() => parseParametersJson('{"parameters":{"ambient":{}}}', params)).toThrow(/helmet/);
    expect(() => parseParametersJson(JSON.stringify({ ...params, supply: { ...params.supply, inletFlowSetpointRefLpm: 'x' } }), params)).toThrow(/finite/);
  });
});
