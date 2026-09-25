import { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneFrame, SimulationEngine, SimulationEvent, SimulationParameters, SimulationSample, SimulationState } from '../shared/types';
import { engineModule } from './engineLoader';
import { toSample, toSceneFrame } from './mapping';
import { CONTROLS, withLiveParameter, type LiveParameterKey, type Speed } from '../config/controls';
import { CHUNK_S } from './runs';

/** Largest wall-clock gap credited per animation frame (hidden tabs / stalls do not catch up). */
const MAX_FRAME_S = 0.25;
const MAX_CHUNKS_PER_FRAME = 30;
const UI_INTERVAL_MS = 250;
const SCENE_INTERVAL_MS = 33;

export type RunPhase = 'unavailable' | 'ready' | 'running' | 'paused' | 'halted' | 'complete';

export interface SimulationController {
  available: boolean;
  parameters: SimulationParameters | null;
  state: SimulationState | null;
  sceneFrame: SceneFrame | null;
  history: SimulationSample[];
  events: SimulationEvent[];
  phase: RunPhase;
  haltReason: string | null;
  speed: Speed;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (s: Speed) => void;
  setLiveParameter: (key: LiveParameterKey, valueSI: number) => void;
  loadParameters: (p: SimulationParameters) => void;
}

const clone = <T,>(v: T): T => structuredClone(v);

export function useSimulation(): SimulationController {
  const [parameters, setParameters] = useState<SimulationParameters | null>(() =>
    engineModule ? clone(engineModule.DEFAULT_PARAMETERS) : null,
  );
  const engineRef = useRef<SimulationEngine | null>(null);
  const historyRef = useRef<SimulationSample[]>([]);
  const eventsRef = useRef<SimulationEvent[]>([]);
  const [state, setState] = useState<SimulationState | null>(null);
  const [sceneFrame, setSceneFrame] = useState<SceneFrame | null>(null);
  const [history, setHistory] = useState<SimulationSample[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [phase, setPhase] = useState<RunPhase>(engineModule ? 'ready' : 'unavailable');
  const [haltReason, setHaltReason] = useState<string | null>(null);
  const [speed, setSpeed] = useState<Speed>(1);

  const publish = useCallback((s: Readonly<SimulationState>, running: boolean) => {
    setState(clone(s));
    setSceneFrame(toSceneFrame(s, historyRef.current[historyRef.current.length - 1] ?? null, running));
    setHistory(historyRef.current.slice());
    setEvents(eventsRef.current.slice());
  }, []);

  const initialise = useCallback(
    (p: SimulationParameters) => {
      if (!engineModule) return;
      if (!engineRef.current) engineRef.current = engineModule.createEngine(clone(p));
      const s0 = engineRef.current.reset(clone(p));
      historyRef.current = [toSample(s0, null)];
      eventsRef.current = [];
      setHaltReason(s0.status.kind === 'ok' ? null : s0.status.message);
      setPhase(s0.status.kind === 'ok' ? 'ready' : 'halted');
      publish(s0, false);
    },
    [publish],
  );

  useEffect(() => {
    if (parameters && !engineRef.current) initialise(parameters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = phase === 'running';

  useEffect(() => {
    const engine = engineRef.current;
    if (!running || !engine || !parameters) return;
    const durationS = parameters.numerics.durationS;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    let lastScene = 0;
    let backlogS = 0;

    const tick = (now: number) => {
      backlogS += Math.min((now - last) / 1000, MAX_FRAME_S) * speed;
      last = now;
      let s = engine.getState();
      let stop: { phase: RunPhase; reason: string | null } | null = null;
      let chunks = 0;
      while (backlogS >= CHUNK_S && chunks < MAX_CHUNKS_PER_FRAME) {
        if (s.timeS >= durationS - 1e-9) break;
        const prev = s;
        s = engine.advance(CHUNK_S);
        backlogS -= CHUNK_S;
        chunks++;
        historyRef.current.push(toSample(s, prev));
        if (s.status.kind !== 'ok') {
          stop = { phase: 'halted', reason: s.status.message };
          break;
        }
      }
      if (chunks === MAX_CHUNKS_PER_FRAME) backlogS = 0;
      if (!stop && s.timeS >= durationS - 1e-9) stop = { phase: 'complete', reason: `Run complete: ${durationS} s simulated.` };

      if (stop) {
        publish(s, false);
        setHaltReason(stop.reason);
        setPhase(stop.phase);
        return;
      }
      if (now - lastScene >= SCENE_INTERVAL_MS) {
        setSceneFrame(toSceneFrame(s, historyRef.current[historyRef.current.length - 1] ?? null, true));
        lastScene = now;
      }
      if (now - lastUi >= UI_INTERVAL_MS) {
        publish(s, true);
        lastUi = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      publish(engine.getState(), false);
    };
  }, [running, speed, parameters, publish]);

  const play = useCallback(() => {
    if (phase === 'ready' || phase === 'paused') setPhase('running');
  }, [phase]);

  const pause = useCallback(() => {
    if (phase === 'running') setPhase('paused');
  }, [phase]);

  const reset = useCallback(() => {
    if (parameters) initialise(parameters);
  }, [parameters, initialise]);

  const setLiveParameter = useCallback(
    (key: LiveParameterKey, valueSI: number) => {
      const engine = engineRef.current;
      if (!parameters || !engine) return;
      const next = withLiveParameter(parameters, key, valueSI);
      setParameters(next);
      if (engine.getState().timeS === 0) {
        initialise(next);
        return;
      }
      try {
        const event = engine.updateLiveParameters({ [key]: valueSI });
        const def = CONTROLS.find((c) => c.key === key);
        eventsRef.current.push({
          timeS: event.timeS,
          label: event.label || `${def?.label ?? key} → ${def ? def.toDisplay(valueSI).toFixed(def.digits) : valueSI} ${def?.unit ?? ''}`,
        });
        setEvents(eventsRef.current.slice());
        const status = engine.getState().status;
        if (status.kind !== 'ok') {
          setHaltReason(status.message);
          setPhase('halted');
        }
      } catch (err) {
        setHaltReason(err instanceof Error ? err.message : String(err));
        setPhase('halted');
      }
    },
    [parameters, initialise],
  );

  const loadParameters = useCallback(
    (p: SimulationParameters) => {
      setParameters(clone(p));
      initialise(p);
    },
    [initialise],
  );

  return {
    available: engineModule !== null,
    parameters,
    state,
    sceneFrame,
    history,
    events,
    phase,
    haltReason,
    speed,
    play,
    pause,
    reset,
    setSpeed,
    setLiveParameter,
    loadParameters,
  };
}
