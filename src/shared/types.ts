/**
 * Shared contracts between the dashboard (main agent), the simulation engine
 * (physics agent) and the 3D scene (3D agent). Owned by the main agent.
 *
 * Unit conventions (encoded in every field name):
 *   PaAbs    absolute pressure, pascal
 *   PaGauge  pressure relative to ambient (P - P_ambient), pascal
 *   K        kelvin
 *   M3       cubic metre (actual volume at stated conditions)
 *   Mol      moles;  MolPerS  moles per second
 *   RefLpm   litres per minute at reference conditions (REFERENCE_CONDITIONS)
 *   RefL     litres at reference conditions
 *   S        seconds
 *   Frac     dry mole fraction, 0..1 (not percent)
 *
 * Display conversions (bar, %, ppm, cmH2O) belong in the UI, never in the engine.
 */

export const REFERENCE_CONDITIONS = {
  pressurePaAbs: 100_000,
  temperatureK: 293.15,
} as const;

export const PA_PER_BAR = 100_000;

export interface GasFractions {
  o2Frac: number;
  co2Frac: number;
  inertFrac: number;
}

export interface GasMoles {
  o2Mol: number;
  co2Mol: number;
  inertMol: number;
}

// ---------------------------------------------------------------------------
// Parameters (inputs to the engine)
// ---------------------------------------------------------------------------

export interface AmbientParameters {
  pressurePaAbs: number;
  temperatureK: number;
  composition: GasFractions;
}

export interface HelmetParameters {
  /** Free gas volume at ambient pressure, excluding the head. Unmeasured demo value. */
  freeVolumeAtAmbientM3: number;
  /** Compliance C in V(P) = V0 + C * (P - P_ambient). 0 = rigid. Uncalibrated. */
  complianceM3PerPa: number;
  /** Upper limit of the valid model domain (absolute). */
  maxPressurePaAbs: number;
}

export interface SupplyParameters {
  /** Source pressure (demo assumption: 200 bar absolute, constant). */
  sourcePressurePaAbs: number;
  sourceComposition: GasFractions;
  /** Regulator outlet setpoint. Must be below source pressure. */
  regulatorOutletPressurePaAbs: number;
  /** Requested inlet flow. */
  inletFlowSetpointRefLpm: number;
  /** Controller headroom Δp in q_in = q_set * clamp((P_reg - P_helmet) / Δp, 0, 1). */
  inletControllerHeadroomPa: number;
}

export interface OutletParameters {
  /** Requested ideal constant maintenance outflow (active only above ambient). */
  maintenanceFlowSetpointRefLpm: number;
  /** Overflow opens at or above this absolute pressure. Must exceed ambient. */
  overflowThresholdPaAbs: number;
  /** Finite flow capacity of the overflow when open. */
  overflowOpenCapacityRefLpm: number;
}

export interface PatientParameters {
  respiratoryRateBreathsPerMin: number;
  /** Inhaled tidal volume, actual litres at helmet conditions, expressed in m3. */
  tidalVolumeM3: number;
  /** Inspiratory fraction of the breath cycle (I:E = 1:2 -> 1/3). */
  inspiratoryFraction: number;
  o2ConsumptionRefLpm: number;
  co2ProductionRefLpm: number;
}

export interface NumericsParameters {
  baseTimeStepS: number;
  durationS: number;
}

export interface SimulationParameters {
  ambient: AmbientParameters;
  helmet: HelmetParameters;
  supply: SupplyParameters;
  outlets: OutletParameters;
  /** null = no patient (e.g. flush test fixture). */
  patient: PatientParameters | null;
  numerics: NumericsParameters;
}

// ---------------------------------------------------------------------------
// State (outputs of the engine)
// ---------------------------------------------------------------------------

export type BreathPhase = 'inspiration' | 'expiration';

export type ModelStatus =
  | { kind: 'ok' }
  | { kind: 'outside-domain'; message: string }
  | { kind: 'invalid'; message: string };

export interface HelmetGasState {
  pressurePaAbs: number;
  pressurePaGauge: number;
  volumeM3: number;
  temperatureK: number;
  moles: GasMoles;
  fractions: GasFractions;
  /** Dry-gas partial pressures x_i * P (absolute). Not alveolar/arterial values. */
  o2PartialPressurePaAbs: number;
  co2PartialPressurePaAbs: number;
}

export interface FlowState {
  inletRequestedRefLpm: number;
  inletDeliveredRefLpm: number;
  maintenanceRequestedRefLpm: number;
  maintenanceDeliveredRefLpm: number;
  overflowRefLpm: number;
  totalOutletRefLpm: number;
  /** Molar equivalents for audit/tests. */
  inletMolPerS: number;
  maintenanceMolPerS: number;
  overflowMolPerS: number;
}

export interface OverflowState {
  isOpen: boolean;
  /** Fraction of time open over the recent window, 0..1. */
  recentDutyCycleFrac: number;
  dutyCycleWindowS: number;
}

export interface BreathState {
  phase: BreathPhase;
  /** Progress through the current phase, 0..1. */
  phaseProgressFrac: number;
  completedBreaths: number;
  /** Signed airway flow: + inhaling from helmet, - exhaling into helmet (actual m3/s). */
  airwayFlowM3PerS: number;
  /** Breath-weighted averages over the last completed inspiration; null until first breath completes. */
  lastInspiredCo2Frac: number | null;
  lastInspiredO2Frac: number | null;
}

export interface CumulativeTotals {
  o2FromSourceRefL: number;
  o2FromSourceMol: number;
  ventedMoles: GasMoles;
  metabolicO2UptakeMol: number;
  metabolicCo2ProductionMol: number;
}

export interface SimulationState {
  timeS: number;
  helmet: HelmetGasState;
  flows: FlowState;
  overflow: OverflowState;
  /** null when parameters.patient is null. */
  breath: BreathState | null;
  cumulative: CumulativeTotals;
  status: ModelStatus;
}

/** Downsampled record for charts and CSV export. */
export interface SimulationSample {
  timeS: number;
  helmetPressurePaAbs: number;
  helmetPressurePaGauge: number;
  co2Frac: number;
  o2Frac: number;
  inletRefLpm: number;
  maintenanceRefLpm: number;
  overflowRefLpm: number;
  overflowOpen: boolean;
  inspiredCo2Frac: number | null;
}

/** Timestamped marker for a parameter change during a run. */
export interface SimulationEvent {
  timeS: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Engine API (implemented by the physics agent in src/engine, no React/Three)
// ---------------------------------------------------------------------------

export interface SimulationEngine {
  readonly parameters: Readonly<SimulationParameters>;
  getState(): Readonly<SimulationState>;
  /** Advance by exactly dtS of simulated time (engine substeps internally). */
  advance(dtS: number): Readonly<SimulationState>;
  /** Restore the deterministic initial state for the given parameters. */
  reset(parameters?: SimulationParameters): Readonly<SimulationState>;
  /** Apply supply/outlet changes mid-run; returns the event marker. */
  updateLiveParameters(
    changes: Partial<Pick<SupplyParameters, 'regulatorOutletPressurePaAbs' | 'inletFlowSetpointRefLpm'>> &
      Partial<Pick<OutletParameters, 'maintenanceFlowSetpointRefLpm' | 'overflowThresholdPaAbs' | 'overflowOpenCapacityRefLpm'>>,
  ): SimulationEvent;
}

export type CreateEngine = (parameters: SimulationParameters) => SimulationEngine;

// ---------------------------------------------------------------------------
// 3D scene contract (src/scene renders only; it never computes physics)
// ---------------------------------------------------------------------------

export interface SceneFrame {
  running: boolean;
  timeS: number;
  helmetPressurePaGauge: number;
  co2Frac: number;
  o2Frac: number;
  inletRefLpm: number;
  maintenanceRefLpm: number;
  overflowRefLpm: number;
  overflowOpen: boolean;
  /** null when no patient model is active. */
  breathPhase: BreathPhase | null;
  breathPhaseProgressFrac: number;
  airwayFlowM3PerS: number;
}

export interface HelmetSceneProps {
  /** null before any simulation exists: render the static device with no flow animation. */
  frame: SceneFrame | null;
  showLabels?: boolean;
}
