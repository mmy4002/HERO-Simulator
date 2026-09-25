import type { RunPhase } from '../app/useSimulation';
import heroLogo from '../assets/hero-logo.png';

const STATUS_TEXT: Record<RunPhase, string> = {
  unavailable: 'Simulation engine not loaded',
  ready: 'Ready',
  running: 'Running',
  paused: 'Paused',
  halted: 'Stopped',
  complete: 'Run complete',
};

export default function Header({ phase, timeS, onPresent }: { phase: RunPhase; timeS: number | null; onPresent: () => void }) {
  return (
    <header className="header">
      <div className="brand">
        <h1 className="brand-title">
          <img className="brand-logo" src={heroLogo} alt="HERO" width={416} height={134} />
          <span className="brand-sub">Simulator</span>
        </h1>
      </div>
      <div className={`sim-status status-${phase}`}>
        <span className="status-dot" aria-hidden="true" />
        {STATUS_TEXT[phase]}
        {timeS !== null && <span className="status-time">t = {timeS.toFixed(1)} s</span>}
        <button type="button" className="btn btn-sm present-btn" onClick={onPresent} title="Presentation mode (P)">
          Present
        </button>
      </div>
    </header>
  );
}
