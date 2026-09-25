import type { SimulationEngine, SimulationSample, SimulationState } from '../shared/types';
import { toSample } from './mapping';
import { CHUNK_S } from './runs';

/** Largest wall-clock gap credited per animation frame (hidden tabs / stalls never catch up). */
export const MAX_FRAME_S = 0.25;
export const MAX_CHUNKS_PER_FRAME = 30;

export interface ClockResult {
  state: Readonly<SimulationState>;
  backlogS: number;
  stop: { phase: 'halted' | 'complete'; reason: string } | null;
}

/**
 * One animation frame of the simulation clock. Wall time is converted to simulated time and consumed in
 * fixed CHUNK_S engine steps, so results depend only on the number of chunks, not on frame timing.
 * Appends one sample per chunk to `history`.
 */
export function clockFrame(
  engine: SimulationEngine,
  wallDtS: number,
  speed: number,
  backlogS: number,
  durationS: number,
  history: SimulationSample[],
): ClockResult {
  let backlog = backlogS + Math.min(Math.max(wallDtS, 0), MAX_FRAME_S) * speed;
  let s = engine.getState();
  let chunks = 0;
  while (backlog >= CHUNK_S - 1e-12 && chunks < MAX_CHUNKS_PER_FRAME && s.timeS < durationS - 1e-9) {
    const prev = s;
    s = engine.advance(CHUNK_S);
    backlog -= CHUNK_S;
    chunks++;
    history.push(toSample(s, prev));
    if (s.status.kind !== 'ok') return { state: s, backlogS: 0, stop: { phase: 'halted', reason: s.status.message } };
  }
  if (chunks === MAX_CHUNKS_PER_FRAME) backlog = 0;
  if (s.timeS >= durationS - 1e-9) return { state: s, backlogS: 0, stop: { phase: 'complete', reason: `Run complete: ${durationS} s simulated.` } };
  return { state: s, backlogS: backlog, stop: null };
}
