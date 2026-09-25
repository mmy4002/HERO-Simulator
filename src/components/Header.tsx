import type { RunPhase } from '../app/useSimulation';

const STATUS_TEXT: Record<RunPhase, string> = {
  unavailable: 'Simulation engine not loaded',
  ready: 'Ready',
  running: 'Running',
  paused: 'Paused',
  halted: 'Stopped',
  complete: 'Run complete',
};

export default function Header({ phase, timeS }: { phase: RunPhase; timeS: number | null }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <h1>
          HEROES <span className="brand-sep">—</span> <span className="brand-sub">Oxygen Helmet Simulator</span>
        </h1>
      </div>
      <div className={`sim-status status-${phase}`}>
        <span className="status-dot" aria-hidden="true" />
        {STATUS_TEXT[phase]}
        {timeS !== null && <span className="status-time">t = {timeS.toFixed(1)} s</span>}
      </div>
    </header>
  );
}
