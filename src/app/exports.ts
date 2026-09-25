import type { SimulationEvent, SimulationParameters, SimulationSample } from '../shared/types';
import { fracToPct, paToBar } from './units';

export const APP_VERSION = '0.2.0';

export const MODEL_ASSUMPTIONS = [
  'Well-mixed, lumped gas model; particles and animation are illustrative, not CFD.',
  'SI units internally; reference flows at 1.0 bar absolute and 293.15 K.',
  'Flexible hood volume V(P) = V0 + C·(P − P_ambient) with uncalibrated demo V0 and C.',
  'Source: constant 200 bar absolute (demo assumption), ideal regulator, inlet flow controller with headroom Δp.',
  'Maintenance outlet: ideal constant-flow exhaust above ambient (not a needle-valve law).',
  'Overflow: opens at the threshold with finite capacity; it does not clamp pressure.',
  'Resting-adult breathing bookkeeping proxy with configured O2 uptake and CO2 production; not a physiological model.',
  'Not a medical device, clinical prediction or structural analysis.',
];

const CSV_COLUMNS: [string, (s: SimulationSample) => string][] = [
  ['time_s', (s) => s.timeS.toFixed(2)],
  ['helmet_pressure_bar_abs', (s) => paToBar(s.helmetPressurePaAbs).toFixed(5)],
  ['helmet_pressure_bar_gauge', (s) => paToBar(s.helmetPressurePaGauge).toFixed(5)],
  ['co2_percent', (s) => fracToPct(s.co2Frac).toFixed(4)],
  ['o2_percent', (s) => fracToPct(s.o2Frac).toFixed(3)],
  ['inlet_flow_ref_L_per_min', (s) => s.inletRefLpm.toFixed(3)],
  ['maintenance_flow_ref_L_per_min', (s) => s.maintenanceRefLpm.toFixed(3)],
  ['overflow_flow_ref_L_per_min', (s) => s.overflowRefLpm.toFixed(3)],
  ['overflow_open_0_1', (s) => (s.overflowOpen ? '1' : '0')],
  ['inspired_co2_percent_at_breath_end', (s) => (s.inspiredCo2Frac === null ? '' : fracToPct(s.inspiredCo2Frac).toFixed(4))],
];

export function samplesToCsv(runs: { label: string; samples: SimulationSample[]; events?: SimulationEvent[] }[]): string {
  const header = ['run', ...CSV_COLUMNS.map(([name]) => name), 'event'].join(',');
  const rows = runs.flatMap(({ label, samples, events = [] }) =>
    samples.map((s, i) => {
      const prev = i > 0 ? samples[i - 1].timeS : -Infinity;
      const ev = events.filter((e) => e.timeS > prev && e.timeS <= s.timeS).map((e) => e.label.replace(/[",\n]/g, ' '));
      return [label, ...CSV_COLUMNS.map(([, get]) => get(s)), ev.length ? `"${ev.join('; ')}"` : ''].join(',');
    }),
  );
  return [header, ...rows].join('\n') + '\n';
}

export function parametersToJson(parameters: SimulationParameters, modelVersion: string | undefined): string {
  return JSON.stringify(
    {
      format: 'heroes-parameters',
      appVersion: APP_VERSION,
      modelVersion: modelVersion ?? 'unspecified',
      exportedAt: new Date().toISOString(),
      units: 'SI; field names encode units (PaAbs, PaGauge, RefLpm, M3, K, Frac, S)',
      assumptions: MODEL_ASSUMPTIONS,
      parameters,
    },
    null,
    2,
  );
}

const REQUIRED_GROUPS = ['ambient', 'helmet', 'supply', 'outlets', 'numerics'] as const;

/** Parses an exported file (or bare parameters object). Throws with a readable message on bad input. */
export function parseParametersJson(text: string, defaults: SimulationParameters): SimulationParameters {
  const raw = JSON.parse(text);
  const p = raw && typeof raw === 'object' && 'parameters' in raw ? raw.parameters : raw;
  if (!p || typeof p !== 'object') throw new Error('File does not contain a parameters object.');
  for (const g of REQUIRED_GROUPS) if (!p[g] || typeof p[g] !== 'object') throw new Error(`Missing parameter group "${g}".`);
  const merged: SimulationParameters = {
    ambient: { ...defaults.ambient, ...p.ambient },
    helmet: { ...defaults.helmet, ...p.helmet },
    supply: { ...defaults.supply, ...p.supply },
    outlets: { ...defaults.outlets, ...p.outlets },
    patient: p.patient === null ? null : { ...(defaults.patient ?? {}), ...(p.patient ?? {}) } as SimulationParameters['patient'],
    numerics: { ...defaults.numerics, ...p.numerics },
  };
  const bad = findNonNumeric(merged, defaults);
  if (bad) throw new Error(`Parameter "${bad}" is not a finite number.`);
  return merged;
}

/** Every field that is numeric in the defaults must be a finite number in the imported set. */
function findNonNumeric(obj: unknown, reference: unknown, path = ''): string | null {
  if (typeof reference === 'number') return typeof obj === 'number' && Number.isFinite(obj) ? null : path;
  if (reference && typeof reference === 'object' && obj && typeof obj === 'object') {
    for (const [k, ref] of Object.entries(reference)) {
      const r = findNonNumeric((obj as Record<string, unknown>)[k], ref, path ? `${path}.${k}` : k);
      if (r) return r;
    }
  }
  return null;
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
