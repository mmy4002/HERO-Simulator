import { describe, expect, it } from 'vitest';
import type { SimulationParameters, SimulationSample, SimulationState } from '../shared/types';
import { toSample, toSceneFrame } from './mapping';
import { comparabilityIssues, summarize } from './runs';
import { parametersToJson, parseParametersJson, samplesToCsv } from './exports';
import { comparisonRows, decimate } from './chartData';
import { getLiveParameter, withLiveParameter } from '../config/controls';

const params: SimulationParameters = {
  ambient: { pressurePaAbs: 1e5, temperatureK: 293.15, composition: { o2Frac: 0.2095, co2Frac: 0.0004, inertFrac: 0.7901 } },
  helmet: { freeVolumeAtAmbientM3: 0.012, complianceM3PerPa: 2e-8, maxPressurePaAbs: 2e5 },
  supply: { sourcePressurePaAbs: 2e7, sourceComposition: { o2Frac: 1, co2Frac: 0, inertFrac: 0 }, regulatorOutletPressurePaAbs: 1.7e5, inletFlowSetpointRefLpm: 30, inletControllerHeadroomPa: 1e4 },
  outlets: { maintenanceFlowSetpointRefLpm: 20, overflowThresholdPaAbs: 1.5e5, overflowOpenCapacityRefLpm: 100 },
  patient: { respiratoryRateBreathsPerMin: 12, tidalVolumeM3: 5e-4, inspiratoryFraction: 1 / 3, o2ConsumptionRefLpm: 0.25, co2ProductionRefLpm: 0.2 },
  numerics: { baseTimeStepS: 0.01, durationS: 300 },
};

function state(over: { timeS?: number; breaths?: number; inspired?: number | null; co2?: number; open?: boolean } = {}): SimulationState {
  return {
    timeS: over.timeS ?? 1,
    helmet: {
      pressurePaAbs: 1.2e5, pressurePaGauge: 2e4, volumeM3: 0.0124, temperatureK: 293.15,
      moles: { o2Mol: 0.1, co2Mol: 0.001, inertMol: 0.3 },
      fractions: { o2Frac: 0.5, co2Frac: over.co2 ?? 0.01, inertFrac: 0.49 },
      o2PartialPressurePaAbs: 6e4, co2PartialPressurePaAbs: 1200,
    },
    flows: { inletRequestedRefLpm: 30, inletDeliveredRefLpm: 25, maintenanceRequestedRefLpm: 20, maintenanceDeliveredRefLpm: 20, overflowRefLpm: 0, totalOutletRefLpm: 20, inletMolPerS: 0, maintenanceMolPerS: 0, overflowMolPerS: 0 },
    overflow: { isOpen: over.open ?? false, recentDutyCycleFrac: 0, dutyCycleWindowS: 30 },
    breath: { phase: 'expiration', phaseProgressFrac: 0.5, completedBreaths: over.breaths ?? 0, airwayFlowM3PerS: -1e-4, lastInspiredCo2Frac: over.inspired ?? null, lastInspiredO2Frac: null },
    cumulative: { o2FromSourceRefL: 1, o2FromSourceMol: 0.04, ventedMoles: { o2Mol: 0, co2Mol: 0, inertMol: 0 }, metabolicO2UptakeMol: 0, metabolicCo2ProductionMol: 0 },
    status: { kind: 'ok' },
  };
}

describe('mapping', () => {
  it('maps delivered flows and breath phase into the scene frame', () => {
    const f = toSceneFrame(state(), true);
    expect(f).toMatchObject({ running: true, inletRefLpm: 25, maintenanceRefLpm: 20, breathPhase: 'expiration', helmetPressurePaGauge: 2e4 });
  });

  it('emits an inspired-CO2 marker only when a breath completes', () => {
    expect(toSample(state({ breaths: 1, inspired: 0.02 }), 1).inspiredCo2Frac).toBeNull();
    expect(toSample(state({ breaths: 2, inspired: 0.02 }), 1).inspiredCo2Frac).toBe(0.02);
  });
});

describe('run summary', () => {
  const samples: SimulationSample[] = [0, 1, 2, 3, 4].map((i) =>
    toSample(state({ timeS: i * 0.1, co2: 0.01 * i, open: i >= 3, breaths: i === 2 ? 1 : i > 2 ? 1 : 0, inspired: 0.03 }), i === 2 ? 0 : i > 2 ? 1 : 0),
  );

  it('computes time-weighted mean, peaks, duty cycle and breath average', () => {
    const s = summarize(samples, 2.5);
    expect(s.meanCo2Frac).toBeCloseTo((0.01 + 0.02 + 0.03 + 0.04) / 4);
    expect(s.peakCo2Frac).toBeCloseTo(0.04);
    expect(s.overflowDutyCycleFrac).toBeCloseTo(0.5);
    expect(s.meanInspiredCo2Frac).toBeCloseTo(0.03);
    expect(s.completedBreaths).toBe(1);
    expect(s.o2SuppliedRefL).toBe(2.5);
    expect(s.windowEndS).toBeCloseTo(0.4);
  });

  it('flags A/B runs that differ outside supply/outlet settings', () => {
    expect(comparabilityIssues(params, withLiveParameter(params, 'inletFlowSetpointRefLpm', 50))).toEqual([]);
    expect(comparabilityIssues(params, { ...params, numerics: { ...params.numerics, durationS: 60 } })).toEqual(['numerics settings differ']);
  });

  it('decimates long histories but keeps breath markers', () => {
    const long = Array.from({ length: 3001 }, (_, i) => ({ ...samples[0], timeS: i * 0.1, inspiredCo2Frac: i === 1234 ? 0.02 : null }));
    const d = decimate(long);
    expect(d.length).toBeLessThanOrEqual(610);
    expect(d.some((s) => s.inspiredCo2Frac === 0.02)).toBe(true);
    expect(comparisonRows(long.slice(0, 5), long.slice(0, 5))).toHaveLength(5);
  });
});

describe('exports', () => {
  it('writes CSV with unit-bearing headers and event labels', () => {
    const csv = samplesToCsv([{ label: 'live', samples: [toSample(state({ timeS: 0 }), 0), toSample(state({ timeS: 0.1 }), 0)], events: [{ timeS: 0.1, label: 'Inlet flow → 40' }] }]);
    const [header, , row2] = csv.trim().split('\n');
    expect(header).toContain('helmet_pressure_bar_abs');
    expect(header).toContain('inlet_flow_ref_L_per_min');
    expect(row2.startsWith('live,0.10,1.20000,0.20000,1.0000')).toBe(true);
    expect(row2).toContain('Inlet flow → 40');
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
