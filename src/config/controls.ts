import type { SimulationEngine, SimulationParameters } from '../shared/types';
import { barToPa, paToBar } from '../app/units';

export type LiveParameterChanges = Parameters<SimulationEngine['updateLiveParameters']>[0];
export type LiveParameterKey = keyof LiveParameterChanges;

export interface ControlDef {
  key: LiveParameterKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  digits: number;
  advanced?: boolean;
  /** SI parameter value -> display value */
  toDisplay: (si: number) => number;
  fromDisplay: (display: number) => number;
}

const identity = (v: number) => v;

// UI slider ranges (display units). The engine remains the authority on validity.
export const CONTROLS: ControlDef[] = [
  { key: 'regulatorOutletPressurePaAbs', label: 'Regulator outlet pressure', unit: 'bar abs', min: 0.8, max: 3.0, step: 0.01, digits: 2, toDisplay: paToBar, fromDisplay: barToPa },
  { key: 'inletFlowSetpointRefLpm', label: 'Inlet flow', unit: 'ref L/min', min: 0, max: 100, step: 1, digits: 0, toDisplay: identity, fromDisplay: identity },
  { key: 'maintenanceFlowSetpointRefLpm', label: 'Maintenance outflow', unit: 'ref L/min', min: 0, max: 100, step: 1, digits: 0, toDisplay: identity, fromDisplay: identity },
  { key: 'overflowThresholdPaAbs', label: 'Overflow threshold', unit: 'bar abs', min: 1.01, max: 2.5, step: 0.01, digits: 2, toDisplay: paToBar, fromDisplay: barToPa },
  { key: 'overflowOpenCapacityRefLpm', label: 'Overflow open capacity', unit: 'ref L/min', min: 1, max: 500, step: 1, digits: 0, advanced: true, toDisplay: identity, fromDisplay: identity },
];

const SUPPLY_KEYS = new Set<LiveParameterKey>(['regulatorOutletPressurePaAbs', 'inletFlowSetpointRefLpm']);

export function getLiveParameter(p: SimulationParameters, key: LiveParameterKey): number {
  return SUPPLY_KEYS.has(key)
    ? (p.supply as unknown as Record<string, number>)[key]
    : (p.outlets as unknown as Record<string, number>)[key];
}

export function withLiveParameter(p: SimulationParameters, key: LiveParameterKey, value: number): SimulationParameters {
  return SUPPLY_KEYS.has(key)
    ? { ...p, supply: { ...p.supply, [key]: value } }
    : { ...p, outlets: { ...p.outlets, [key]: value } };
}

export const SPEEDS = [1, 5, 10] as const;
export type Speed = (typeof SPEEDS)[number];
