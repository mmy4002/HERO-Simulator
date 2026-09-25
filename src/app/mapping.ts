import type { SceneFrame, SimulationSample, SimulationState } from '../shared/types';

export function toSceneFrame(state: Readonly<SimulationState>, running: boolean): SceneFrame {
  return {
    running,
    timeS: state.timeS,
    helmetPressurePaGauge: state.helmet.pressurePaGauge,
    co2Frac: state.helmet.fractions.co2Frac,
    o2Frac: state.helmet.fractions.o2Frac,
    inletRefLpm: state.flows.inletDeliveredRefLpm,
    maintenanceRefLpm: state.flows.maintenanceDeliveredRefLpm,
    overflowRefLpm: state.flows.overflowRefLpm,
    overflowOpen: state.overflow.isOpen,
    breathPhase: state.breath?.phase ?? null,
    breathPhaseProgressFrac: state.breath?.phaseProgressFrac ?? 0,
    airwayFlowM3PerS: state.breath?.airwayFlowM3PerS ?? 0,
  };
}

/**
 * inspiredCo2Frac is set only on the sample where a new inspiration completed
 * (breath marker); otherwise null.
 */
export function toSample(state: Readonly<SimulationState>, previousCompletedBreaths: number): SimulationSample {
  const breaths = state.breath?.completedBreaths ?? 0;
  return {
    timeS: state.timeS,
    helmetPressurePaAbs: state.helmet.pressurePaAbs,
    helmetPressurePaGauge: state.helmet.pressurePaGauge,
    co2Frac: state.helmet.fractions.co2Frac,
    o2Frac: state.helmet.fractions.o2Frac,
    inletRefLpm: state.flows.inletDeliveredRefLpm,
    maintenanceRefLpm: state.flows.maintenanceDeliveredRefLpm,
    overflowRefLpm: state.flows.overflowRefLpm,
    overflowOpen: state.overflow.isOpen,
    inspiredCo2Frac: breaths > previousCompletedBreaths ? (state.breath?.lastInspiredCo2Frac ?? null) : null,
  };
}
