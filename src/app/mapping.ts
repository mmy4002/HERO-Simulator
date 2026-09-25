import { REFERENCE_CONDITIONS } from '../shared/types';
import type { SceneFrame, SimulationSample, SimulationState } from '../shared/types';

const R_J_PER_MOL_K = 8.314462618;
/** Moles in one reference litre (1.0 bar abs, 293.15 K). */
const MOL_PER_REF_L = (REFERENCE_CONDITIONS.pressurePaAbs * 1e-3) / (R_J_PER_MOL_K * REFERENCE_CONDITIONS.temperatureK);

const ventedTotalMol = (s: Readonly<SimulationState>) => s.cumulative.ventedMoles.o2Mol + s.cumulative.ventedMoles.co2Mol + s.cumulative.ventedMoles.inertMol;

/**
 * Converts an engine snapshot into a chart/export sample.
 * Flows are averaged over the interval since `prev` from the engine's cumulative totals, because the
 * engine's instantaneous flows describe only the last substep (the zero-hysteresis overflow chatters).
 * Overflow = total vented − maintenance delivered (maintenance is an ideal constant flow above ambient).
 * inspiredCo2Frac is set only on the sample where a new inspiration completed (breath marker).
 */
export function toSample(state: Readonly<SimulationState>, prev: Readonly<SimulationState> | null): SimulationSample {
  const dt = prev ? state.timeS - prev.timeS : 0;
  let inlet = state.flows.inletDeliveredRefLpm;
  let overflow = state.flows.overflowRefLpm;
  const maintenance = state.flows.maintenanceDeliveredRefLpm;
  if (prev && dt > 0) {
    inlet = ((state.cumulative.o2FromSourceRefL - prev.cumulative.o2FromSourceRefL) / dt) * 60;
    const ventedRefLpm = ((ventedTotalMol(state) - ventedTotalMol(prev)) / MOL_PER_REF_L / dt) * 60;
    overflow = Math.max(0, ventedRefLpm - maintenance);
    if (overflow < 1e-6) overflow = 0;
  }
  const breaths = state.breath?.completedBreaths ?? 0;
  const prevBreaths = prev?.breath?.completedBreaths ?? breaths;
  return {
    timeS: state.timeS,
    helmetPressurePaAbs: state.helmet.pressurePaAbs,
    helmetPressurePaGauge: state.helmet.pressurePaGauge,
    co2Frac: state.helmet.fractions.co2Frac,
    o2Frac: state.helmet.fractions.o2Frac,
    inletRefLpm: inlet,
    maintenanceRefLpm: maintenance,
    overflowRefLpm: overflow,
    overflowOpen: overflow > 0,
    inspiredCo2Frac: breaths > prevBreaths ? (state.breath?.lastInspiredCo2Frac ?? null) : null,
  };
}

/** Scene props: breath state from the live snapshot, flows from the latest interval-averaged sample. */
export function toSceneFrame(state: Readonly<SimulationState>, latest: SimulationSample | null, running: boolean): SceneFrame {
  return {
    running,
    timeS: state.timeS,
    helmetPressurePaGauge: state.helmet.pressurePaGauge,
    co2Frac: state.helmet.fractions.co2Frac,
    o2Frac: state.helmet.fractions.o2Frac,
    inletRefLpm: latest?.inletRefLpm ?? state.flows.inletDeliveredRefLpm,
    maintenanceRefLpm: latest?.maintenanceRefLpm ?? state.flows.maintenanceDeliveredRefLpm,
    overflowRefLpm: latest?.overflowRefLpm ?? state.flows.overflowRefLpm,
    overflowOpen: latest?.overflowOpen ?? state.overflow.isOpen,
    breathPhase: state.breath?.phase ?? null,
    breathPhaseProgressFrac: state.breath?.phaseProgressFrac ?? 0,
    airwayFlowM3PerS: state.breath?.airwayFlowM3PerS ?? 0,
  };
}
