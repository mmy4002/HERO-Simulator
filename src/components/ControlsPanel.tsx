import { CONTROLS } from '../config/dashboard';

export default function ControlsPanel() {
  return (
    <section className="panel controls" aria-labelledby="controls-title">
      <h2 id="controls-title" className="panel-title">Simulation controls</h2>

      <div className="run-buttons">
        <button type="button" className="btn btn-primary" disabled>Play</button>
        <button type="button" className="btn" disabled>Pause</button>
        <button type="button" className="btn" disabled>Reset</button>
      </div>

      <div className="control-list">
        {CONTROLS.map((c) => (
          <div className="control" key={c.id}>
            <label htmlFor={`${c.id}-input`} className="control-label">
              {c.label}
              <span className="unit">{c.unit}</span>
            </label>
            <div className="control-row">
              <input type="range" aria-label={`${c.label} slider`} disabled />
              <input id={`${c.id}-input`} type="number" className="num-input" placeholder="—" disabled />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
