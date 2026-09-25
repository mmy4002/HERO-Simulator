import type { CreateEngine, SimulationParameters, SimulationSample } from '../shared/types';
import { toSample } from './mapping';

/** Fixed simulated-time chunk handed to engine.advance() by live and headless runs; the engine substeps internally. */
export const CHUNK_S = 0.1;

export interface RunSummary {
  windowStartS: number;
  windowEndS: number;
  meanCo2Frac: number;
  peakCo2Frac: number;
  finalPressurePaAbs: number;
  peakPressurePaAbs: number;
  /** Mean of breath-weighted inspired CO2 over completed breaths; null if none completed. */
  meanInspiredCo2Frac: number | null;
  completedBreaths: number;
  o2SuppliedRefL: number;
  overflowDutyCycleFrac: number;
}

export interface RunResult {
  samples: SimulationSample[];
  summary: RunSummary;
  /** Non-null when the engine stopped the run (outside domain / invalid). */
  haltReason: string | null;
}

export interface SavedRun {
  label: 'A' | 'B';
  savedAt: string;
  parameters: SimulationParameters;
  result: RunResult | null;
}

/** Runs a full simulation synchronously through the same engine the live view uses. */
export function runHeadless(createEngine: CreateEngine, parameters: SimulationParameters): RunResult {
  const engine = createEngine(structuredClone(parameters));
  let s = engine.reset(structuredClone(parameters));
  let breaths = s.breath?.completedBreaths ?? 0;
  const samples: SimulationSample[] = [toSample(s, breaths)];
  let haltReason: string | null = s.status.kind === 'ok' ? null : s.status.message;
  const durationS = parameters.numerics.durationS;
  while (!haltReason && s.timeS < durationS - 1e-9) {
    s = engine.advance(CHUNK_S);
    samples.push(toSample(s, breaths));
    breaths = s.breath?.completedBreaths ?? 0;
    if (s.status.kind !== 'ok') haltReason = s.status.message;
  }
  return { samples, summary: summarize(samples, s.cumulative.o2FromSourceRefL), haltReason };
}

/** Time-weighted statistics over the full run window (all samples are uniformly spaced). */
export function summarize(samples: SimulationSample[], o2SuppliedRefL: number): RunSummary {
  const intervals = samples.slice(1);
  const n = Math.max(intervals.length, 1);
  const inspired = samples.map((s) => s.inspiredCo2Frac).filter((v): v is number => v !== null);
  const last = samples[samples.length - 1];
  return {
    windowStartS: samples[0]?.timeS ?? 0,
    windowEndS: last?.timeS ?? 0,
    meanCo2Frac: intervals.reduce((a, s) => a + s.co2Frac, 0) / n,
    peakCo2Frac: Math.max(...samples.map((s) => s.co2Frac)),
    finalPressurePaAbs: last?.helmetPressurePaAbs ?? NaN,
    peakPressurePaAbs: Math.max(...samples.map((s) => s.helmetPressurePaAbs)),
    meanInspiredCo2Frac: inspired.length ? inspired.reduce((a, v) => a + v, 0) / inspired.length : null,
    completedBreaths: inspired.length,
    o2SuppliedRefL,
    overflowDutyCycleFrac: intervals.filter((s) => s.overflowOpen).length / n,
  };
}

/** Groups that must match for a fair A/B comparison (only supply/outlet settings may differ). */
export function comparabilityIssues(a: SimulationParameters, b: SimulationParameters): string[] {
  const groups = ['ambient', 'helmet', 'patient', 'numerics'] as const;
  return groups.filter((g) => JSON.stringify(a[g]) !== JSON.stringify(b[g])).map((g) => `${g} settings differ`);
}

const STORAGE_KEY = 'heroes.savedRuns.v1';

export function loadSavedRuns(): Partial<Record<'A' | 'B', SavedRun>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function storeSavedRuns(runs: Partial<Record<'A' | 'B', SavedRun>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // storage full or unavailable: runs stay in memory for this session
  }
}
