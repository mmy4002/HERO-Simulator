import { PA_PER_BAR } from '../shared/types';
import type { GasFractions, SimulationParameters } from '../shared/types';

/**
 * Demo values from the HEROES playbook. All are illustrative assumptions, not
 * measured device data or operating recommendations. SI units as in field names.
 */
export const DEFAULT_PARAMETERS: SimulationParameters = Object.freeze({
  ambient: {
    pressurePaAbs: 1.0 * PA_PER_BAR,
    temperatureK: 293.15,
    composition: { o2Frac: 0.2095, co2Frac: 0.0004, inertFrac: 1 - 0.2095 - 0.0004 },
  },
  helmet: {
    freeVolumeAtAmbientM3: 12e-3, // 12 L, unmeasured
    complianceM3PerPa: 0.02e-3 / 1e3, // 0.02 L/kPa, uncalibrated
    maxPressurePaAbs: 2.0 * PA_PER_BAR, // documented upper limit of the simple inflated-hood model
  },
  supply: {
    sourcePressurePaAbs: 200 * PA_PER_BAR, // 200 bar absolute, demo assumption (convention unconfirmed)
    sourceComposition: { o2Frac: 1, co2Frac: 0, inertFrac: 0 },
    regulatorOutletPressurePaAbs: 1.7 * PA_PER_BAR,
    inletFlowSetpointRefLpm: 30,
    inletControllerHeadroomPa: 0.1 * PA_PER_BAR,
  },
  outlets: {
    maintenanceFlowSetpointRefLpm: 20,
    overflowThresholdPaAbs: 1.5 * PA_PER_BAR,
    overflowOpenCapacityRefLpm: 100,
  },
  patient: {
    respiratoryRateBreathsPerMin: 12,
    tidalVolumeM3: 0.5e-3,
    inspiratoryFraction: 1 / 3,
    o2ConsumptionRefLpm: 0.25,
    co2ProductionRefLpm: 0.2,
  },
  numerics: { baseTimeStepS: 0.01, durationS: 300 },
}) as SimulationParameters;

/** One numeric control range. `min`/`max` are inclusive and expressed in `unit` (SI, matching the field name suffix). */
export interface ParameterBound {
  min: number;
  max: number;
  /** SI unit of the stored value; the UI converts for display (e.g. Pa -> bar). */
  unit: 'PaAbs' | 'Pa' | 'K' | 'M3' | 'M3PerPa' | 'RefLpm' | 'BreathsPerMin' | 'Frac' | 'S';
  /** True if the value can be changed mid-run via updateLiveParameters (others need reset). */
  live: boolean;
}

/**
 * Valid UI ranges. Structure mirrors SimulationParameters: PARAMETER_BOUNDS.<group>.<field> -> ParameterBound.
 * Gas compositions are fixed by the scenario and have no slider bounds.
 * Cross-field constraints enforced by the engine (violations -> status 'invalid'):
 *   supply.regulatorOutletPressurePaAbs < supply.sourcePressurePaAbs
 *   outlets.overflowThresholdPaAbs > ambient.pressurePaAbs
 *   helmet.maxPressurePaAbs > ambient.pressurePaAbs
 *   helmet volume V(maxPressure) > 0
 */
export const PARAMETER_BOUNDS = Object.freeze({
  ambient: {
    pressurePaAbs: { min: 0.8 * PA_PER_BAR, max: 1.1 * PA_PER_BAR, unit: 'PaAbs', live: false },
    temperatureK: { min: 273.15, max: 313.15, unit: 'K', live: false },
  },
  helmet: {
    freeVolumeAtAmbientM3: { min: 4e-3, max: 30e-3, unit: 'M3', live: false },
    complianceM3PerPa: { min: 0, max: 1e-7, unit: 'M3PerPa', live: false }, // 0..0.1 L/kPa
    maxPressurePaAbs: { min: 1.1 * PA_PER_BAR, max: 3.0 * PA_PER_BAR, unit: 'PaAbs', live: false },
  },
  supply: {
    sourcePressurePaAbs: { min: 10 * PA_PER_BAR, max: 300 * PA_PER_BAR, unit: 'PaAbs', live: false },
    regulatorOutletPressurePaAbs: { min: 0.8 * PA_PER_BAR, max: 3.0 * PA_PER_BAR, unit: 'PaAbs', live: true },
    inletFlowSetpointRefLpm: { min: 0, max: 100, unit: 'RefLpm', live: true },
    inletControllerHeadroomPa: { min: 0.01 * PA_PER_BAR, max: 0.5 * PA_PER_BAR, unit: 'Pa', live: false },
  },
  outlets: {
    maintenanceFlowSetpointRefLpm: { min: 0, max: 100, unit: 'RefLpm', live: true },
    overflowThresholdPaAbs: { min: 1.01 * PA_PER_BAR, max: 2.5 * PA_PER_BAR, unit: 'PaAbs', live: true },
    overflowOpenCapacityRefLpm: { min: 1, max: 500, unit: 'RefLpm', live: true },
  },
  patient: {
    respiratoryRateBreathsPerMin: { min: 4, max: 40, unit: 'BreathsPerMin', live: false },
    tidalVolumeM3: { min: 0.1e-3, max: 1.5e-3, unit: 'M3', live: false },
    inspiratoryFraction: { min: 0.2, max: 0.6, unit: 'Frac', live: false },
    o2ConsumptionRefLpm: { min: 0, max: 1, unit: 'RefLpm', live: false },
    co2ProductionRefLpm: { min: 0, max: 1, unit: 'RefLpm', live: false },
  },
  numerics: {
    baseTimeStepS: { min: 0.0005, max: 0.05, unit: 'S', live: false },
    durationS: { min: 10, max: 1800, unit: 'S', live: false },
  },
} satisfies Record<string, Record<string, ParameterBound>>);

const finitePos = (v: number) => Number.isFinite(v) && v > 0;
const finiteNonNeg = (v: number) => Number.isFinite(v) && v >= 0;

function checkFractions(name: string, x: GasFractions): string | null {
  const vals = [x.o2Frac, x.co2Frac, x.inertFrac];
  if (!vals.every(finiteNonNeg)) return `${name}: fractions must be finite and non-negative`;
  if (Math.abs(vals[0] + vals[1] + vals[2] - 1) > 1e-9) return `${name}: fractions must sum to 1`;
  return null;
}

/** Physical validity checks (not UI ranges). Returns a message or null. */
export function validateParameters(p: SimulationParameters): string | null {
  const { ambient, helmet, supply, outlets, patient, numerics } = p;
  if (!finitePos(ambient.pressurePaAbs)) return 'Ambient pressure must be positive';
  if (!finitePos(ambient.temperatureK)) return 'Temperature must be positive';
  const fa = checkFractions('Ambient composition', ambient.composition) ?? checkFractions('Source composition', supply.sourceComposition);
  if (fa) return fa;
  if (!finitePos(helmet.freeVolumeAtAmbientM3)) return 'Free volume must be positive';
  if (!finiteNonNeg(helmet.complianceM3PerPa)) return 'Compliance must be non-negative';
  if (!(Number.isFinite(helmet.maxPressurePaAbs) && helmet.maxPressurePaAbs > ambient.pressurePaAbs)) return 'Maximum model pressure must exceed ambient';
  if (!finitePos(supply.sourcePressurePaAbs)) return 'Source pressure must be positive';
  if (!finitePos(supply.regulatorOutletPressurePaAbs)) return 'Regulator outlet pressure must be positive';
  if (!(supply.regulatorOutletPressurePaAbs < supply.sourcePressurePaAbs)) return 'Regulator outlet pressure must be below source pressure';
  if (!finiteNonNeg(supply.inletFlowSetpointRefLpm)) return 'Inlet flow setpoint must be non-negative';
  if (!finitePos(supply.inletControllerHeadroomPa)) return 'Inlet controller headroom must be positive';
  if (!finiteNonNeg(outlets.maintenanceFlowSetpointRefLpm)) return 'Maintenance flow must be non-negative';
  if (!(Number.isFinite(outlets.overflowThresholdPaAbs) && outlets.overflowThresholdPaAbs > ambient.pressurePaAbs)) return 'Overflow threshold must exceed ambient pressure';
  if (!finiteNonNeg(outlets.overflowOpenCapacityRefLpm)) return 'Overflow capacity must be non-negative';
  if (patient) {
    if (!finitePos(patient.respiratoryRateBreathsPerMin)) return 'Respiratory rate must be positive';
    if (!finitePos(patient.tidalVolumeM3)) return 'Tidal volume must be positive';
    if (!(patient.inspiratoryFraction > 0 && patient.inspiratoryFraction < 1)) return 'Inspiratory fraction must be between 0 and 1';
    if (!finiteNonNeg(patient.o2ConsumptionRefLpm) || !finiteNonNeg(patient.co2ProductionRefLpm)) return 'Metabolic rates must be non-negative';
  }
  if (!finitePos(numerics.baseTimeStepS)) return 'Base time step must be positive';
  if (!finitePos(numerics.durationS)) return 'Duration must be positive';
  return null;
}

export const cloneParameters = (p: SimulationParameters): SimulationParameters => structuredClone(p);
