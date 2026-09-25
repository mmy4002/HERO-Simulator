import { describe, expect, it } from 'vitest';
import type { SimulationSample } from '../shared/types';
import { createEngine, DEFAULT_PARAMETERS } from '../engine';
import { clockFrame, MAX_FRAME_S } from './clock';
import { runHeadless } from './runs';
import { toSample } from './mapping';

const params = { ...structuredClone(DEFAULT_PARAMETERS), numerics: { ...DEFAULT_PARAMETERS.numerics, durationS: 30 } };

function simulate(frameDurationsS: () => number, speed: number) {
  const engine = createEngine(params);
  const history: SimulationSample[] = [toSample(engine.getState(), null)];
  let backlog = 0;
  for (let i = 0; i < 100000; i++) {
    const r = clockFrame(engine, frameDurationsS(), speed, backlog, params.numerics.durationS, history);
    backlog = r.backlogS;
    if (r.stop) return { history, stop: r.stop };
  }
  throw new Error('did not finish');
}

describe('simulation clock', () => {
  it('results are independent of frame rate and speed, and equal the headless run', () => {
    const reference = runHeadless(createEngine, params).samples;
    const at60 = simulate(() => 1 / 60, 1);
    const at24x10 = simulate(() => 1 / 24, 10);
    let seed = 7;
    const jitter = simulate(() => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.2, 5);
    for (const run of [at60, at24x10, jitter]) {
      expect(run.stop.phase).toBe('complete');
      expect(run.history).toEqual(reference);
    }
  });

  it('never credits more than MAX_FRAME_S of wall time per frame (hidden tab)', () => {
    const engine = createEngine(params);
    const history: SimulationSample[] = [];
    const r = clockFrame(engine, 600, 10, 0, params.numerics.durationS, history);
    expect(r.state.timeS).toBeCloseTo(Math.floor((MAX_FRAME_S * 10) / 0.1 + 1e-9) * 0.1, 6);
    expect(r.state.timeS).toBeLessThanOrEqual(MAX_FRAME_S * 10 + 1e-9);
  });

  it('stops exactly at the configured duration', () => {
    const run = simulate(() => 0.25, 10);
    expect(run.history.at(-1)!.timeS).toBeCloseTo(30, 6);
    expect(run.stop.reason).toMatch(/30 s/);
  });

  it('halts with the engine reason when the model leaves its domain', () => {
    const engine = createEngine(params);
    const history: SimulationSample[] = [];
    engine.advance(5);
    engine.updateLiveParameters({ inletFlowSetpointRefLpm: 0, maintenanceFlowSetpointRefLpm: 60 });
    let backlog = 0;
    let stop = null;
    for (let i = 0; i < 2000 && !stop; i++) ({ backlogS: backlog, stop } = clockFrame(engine, 0.1, 10, backlog, 300, history));
    expect(stop?.phase).toBe('halted');
    expect(stop?.reason).toMatch(/ambient|collapse/i);
  });
});
