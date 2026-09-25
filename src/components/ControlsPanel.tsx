import type { ReactNode } from 'react';
import { CONTROLS, SPEEDS, getLiveParameter } from '../config/controls';
import type { SimulationController } from '../app/useSimulation';
import ControlSlider from './ControlSlider';

export default function ControlsPanel({ sim, children }: { sim: SimulationController; children?: ReactNode }) {
  const { available, parameters, phase, haltReason, speed } = sim;
  const canPlay = phase === 'ready' || phase === 'paused';
  const basic = CONTROLS.filter((c) => !c.advanced);
  const advanced = CONTROLS.filter((c) => c.advanced);

  const slider = (def: (typeof CONTROLS)[number]) => (
    <ControlSlider
      key={def.key}
      def={def}
      valueSI={parameters ? getLiveParameter(parameters, def.key) : null}
      disabled={!available}
      onChange={(v) => sim.setLiveParameter(def.key, v)}
    />
  );

  return (
    <section className="panel controls" aria-labelledby="controls-title">
      <h2 id="controls-title" className="panel-title">Simulation controls</h2>

      <div className="run-buttons">
        {phase === 'running' ? (
          <button type="button" className="btn btn-primary" onClick={sim.pause}>Pause</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={sim.play} disabled={!available || !canPlay}>
            {phase === 'paused' ? 'Resume' : 'Play'}
          </button>
        )}
        <button type="button" className="btn" onClick={sim.reset} disabled={!available}>Reset</button>
      </div>

      <div className="speed-row" role="group" aria-label="Simulation speed">
        <span className="speed-label">Speed</span>
        {SPEEDS.map((s) => (
          <button key={s} type="button" className="seg" aria-pressed={speed === s} disabled={!available} onClick={() => sim.setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>

      {!available && <p className="notice">The simulation engine has not been integrated yet. Controls unlock when it is available.</p>}
      {haltReason && <p className={`notice ${phase === 'halted' ? 'notice-error' : ''}`} role="status">{haltReason}</p>}

      <div className="control-list">{basic.map(slider)}</div>
      <details className="advanced">
        <summary>Advanced</summary>
        <div className="control-list">{advanced.map(slider)}</div>
      </details>

      {children}
    </section>
  );
}
