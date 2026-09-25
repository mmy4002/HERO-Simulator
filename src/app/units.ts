import { PA_PER_BAR } from '../shared/types';

export const PA_PER_CMH2O = 98.0665;

export const paToBar = (pa: number) => pa / PA_PER_BAR;
export const barToPa = (bar: number) => bar * PA_PER_BAR;
export const paToCmH2O = (pa: number) => pa / PA_PER_CMH2O;
export const fracToPct = (frac: number) => frac * 100;
export const fracToPpm = (frac: number) => frac * 1e6;

export const UNAVAILABLE = '—';

export function fmt(value: number | null | undefined, digits: number): string {
  return value === null || value === undefined || !Number.isFinite(value) ? UNAVAILABLE : value.toFixed(digits);
}
