import { REFERENCE_CONDITIONS } from '../shared/types';
import type { GasFractions, GasMoles } from '../shared/types';

/** Molar gas constant, J/(mol*K) (exact SI value). */
export const R_J_PER_MOL_K = 8.314462618;

/** Moles per reference litre: P_ref * 1e-3 m3 / (R * T_ref). */
export const MOL_PER_REF_L = (REFERENCE_CONDITIONS.pressurePaAbs * 1e-3) / (R_J_PER_MOL_K * REFERENCE_CONDITIONS.temperatureK);

/** Reference L/min (1.0 bar abs, 293.15 K) -> mol/s, by the ideal gas law. */
export const refLpmToMolPerS = (refLpm: number): number => (refLpm * MOL_PER_REF_L) / 60;
/** mol/s -> reference L/min. */
export const molPerSToRefLpm = (molPerS: number): number => (molPerS * 60) / MOL_PER_REF_L;
export const molToRefL = (mol: number): number => mol / MOL_PER_REF_L;

/** Flexible hood volume law V(P) = V0 + C (P - P_ambient). */
export const hoodVolumeM3 = (pressurePaAbs: number, v0M3: number, complianceM3PerPa: number, ambientPaAbs: number): number =>
  v0M3 + complianceM3PerPa * (pressurePaAbs - ambientPaAbs);

/**
 * Positive physical root of P * V(P) = n R T with V(P) = V0 + C (P - Pa):
 *   C P^2 + (V0 - C Pa) P - nRT = 0.
 * Written as P = 2 nRT / (b + sqrt(b^2 + 4 C nRT)), b = V0 - C Pa, which is
 * cancellation-free and reduces exactly to nRT / V0 when C = 0.
 */
export function solvePressurePaAbs(totalMol: number, temperatureK: number, v0M3: number, complianceM3PerPa: number, ambientPaAbs: number): number {
  const nrt = totalMol * R_J_PER_MOL_K * temperatureK;
  const b = v0M3 - complianceM3PerPa * ambientPaAbs;
  const denom = b + Math.sqrt(b * b + 4 * complianceM3PerPa * nrt);
  return (2 * nrt) / denom;
}

/** Total moles that give pressure P in the flexible hood: n = P V(P) / (R T). */
export const molesAtPressure = (pressurePaAbs: number, temperatureK: number, v0M3: number, complianceM3PerPa: number, ambientPaAbs: number): number =>
  (pressurePaAbs * hoodVolumeM3(pressurePaAbs, v0M3, complianceM3PerPa, ambientPaAbs)) / (R_J_PER_MOL_K * temperatureK);

export const totalMoles = (m: GasMoles): number => m.o2Mol + m.co2Mol + m.inertMol;

export function fractionsOf(m: GasMoles): GasFractions {
  const n = totalMoles(m);
  return n > 0 ? { o2Frac: m.o2Mol / n, co2Frac: m.co2Mol / n, inertFrac: m.inertMol / n } : { o2Frac: 0, co2Frac: 0, inertFrac: 0 };
}

export const scaleFractions = (x: GasFractions, mol: number): GasMoles => ({ o2Mol: x.o2Frac * mol, co2Mol: x.co2Frac * mol, inertMol: x.inertFrac * mol });

export const addMoles = (a: GasMoles, b: GasMoles, sign = 1): GasMoles => ({
  o2Mol: a.o2Mol + sign * b.o2Mol,
  co2Mol: a.co2Mol + sign * b.co2Mol,
  inertMol: a.inertMol + sign * b.inertMol,
});

export const ZERO_MOLES: GasMoles = Object.freeze({ o2Mol: 0, co2Mol: 0, inertMol: 0 });
