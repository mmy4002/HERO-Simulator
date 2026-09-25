import type { SimulationSample } from '../shared/types';
import type { ChartRow } from '../components/TimeChart';
import { fracToPct, paToBar } from './units';

export const MAX_CHART_POINTS = 600;

/** Keeps every breath marker and at most ~MAX_CHART_POINTS regular points (charts only; exports use full history). */
export function decimate(samples: SimulationSample[], maxPoints = MAX_CHART_POINTS): SimulationSample[] {
  if (samples.length <= maxPoints) return samples;
  const stride = Math.ceil(samples.length / maxPoints);
  return samples.filter((s, i) => i % stride === 0 || i === samples.length - 1 || s.inspiredCo2Frac !== null);
}

export function sampleToRow(s: SimulationSample, prefix = ''): ChartRow {
  return {
    t: s.timeS,
    [`${prefix}pressure`]: paToBar(s.helmetPressurePaAbs),
    [`${prefix}co2`]: fracToPct(s.co2Frac),
    [`${prefix}inspired`]: s.inspiredCo2Frac === null ? null : fracToPct(s.inspiredCo2Frac),
    [`${prefix}o2`]: fracToPct(s.o2Frac),
    [`${prefix}inlet`]: s.inletRefLpm,
    [`${prefix}maintenance`]: s.maintenanceRefLpm,
    [`${prefix}overflow`]: s.overflowRefLpm,
  };
}

/** Charts only: trailing moving average of inlet/overflow flow (the zero-hysteresis overflow chatters). */
export const FLOW_SMOOTHING_SAMPLES = 10;

export function smoothFlows(samples: SimulationSample[], window = FLOW_SMOOTHING_SAMPLES): SimulationSample[] {
  let inlet = 0;
  let overflow = 0;
  return samples.map((s, i) => {
    inlet += s.inletRefLpm;
    overflow += s.overflowRefLpm;
    if (i >= window) {
      inlet -= samples[i - window].inletRefLpm;
      overflow -= samples[i - window].overflowRefLpm;
    }
    const n = Math.min(i + 1, window);
    return { ...s, inletRefLpm: inlet / n, overflowRefLpm: Math.max(0, overflow / n) };
  });
}

export function liveRows(samples: SimulationSample[]): ChartRow[] {
  return decimate(smoothFlows(samples)).map((s) => sampleToRow(s));
}

/** Merges two runs on the shared time grid (both are sampled at identical fixed chunks from t = 0). */
export function comparisonRows(a: SimulationSample[] | null, b: SimulationSample[] | null): ChartRow[] {
  const byTime = new Map<string, ChartRow>();
  for (const [prefix, samples] of [['a_', a], ['b_', b]] as const) {
    for (const s of decimate(smoothFlows(samples ?? []))) {
      const k = s.timeS.toFixed(2);
      byTime.set(k, { ...(byTime.get(k) ?? {}), ...sampleToRow(s, prefix) });
    }
  }
  return [...byTime.values()].sort((x, y) => (x.t as number) - (y.t as number));
}
