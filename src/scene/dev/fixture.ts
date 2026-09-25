import type { SceneFrame } from '../../shared/types';

/**
 * Dev-only fake SceneFrame generator for visual testing of the scene.
 * Values are arbitrary animation drivers, NOT physics. Never import from app code.
 */
export function fakeSceneFrame(timeS: number, running: boolean): SceneFrame {
  const period = 4;
  const inspFrac = 1 / 3;
  const c = (timeS % period) / period;
  const insp = c < inspFrac;
  const progress = insp ? c / inspFrac : (c - inspFrac) / (1 - inspFrac);
  const airway = (insp ? 1 : -0.5) * 5e-4 * Math.sin(Math.PI * progress);
  const overflowOpen = timeS % 12 > 8;
  return {
    running,
    timeS,
    helmetPressurePaGauge: 400 + 300 * Math.sin((2 * Math.PI * timeS) / period) + (overflowOpen ? 600 : 0),
    co2Frac: 0.004,
    o2Frac: 0.6,
    inletRefLpm: 30,
    maintenanceRefLpm: 20,
    overflowRefLpm: overflowOpen ? 12 : 0,
    overflowOpen,
    breathPhase: insp ? 'inspiration' : 'expiration',
    breathPhaseProgressFrac: progress,
    airwayFlowM3PerS: airway,
  };
}
