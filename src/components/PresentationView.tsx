import { useMemo } from 'react';
import type { SimulationController } from '../app/useSimulation';
import { SPEEDS } from '../config/controls';
import { liveRows } from '../app/chartData';
import { fmt, fracToPct, paToBar, paToCmH2O, UNAVAILABLE } from '../app/units';
import HelmetScene from '../scene/HelmetScene';
import TimeChart from './TimeChart';
import heroLogo from '../assets/hero-logo.png';

function Big({ label, value, unit, sub, state }: { label: string; value: string; unit?: string; sub?: string; state?: 'on' | 'off' }) {
  return (
    <div className="reading present-reading" data-state={state}>
      <div className="reading-label">{label}</div>
      <div className="reading-value">
        <span className={/\d/.test(value) ? 'value' : 'value value-text'}>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="reading-sub">{sub}</div>}
    </div>
  );
}

export default function PresentationView({ sim, onExit }: { sim: SimulationController; onExit: () => void }) {
  const { state, phase, speed, haltReason, parameters, history, events } = sim;
  const latest = history[history.length - 1] ?? null;
  const rows = useMemo(() => liveRows(history), [history]);
  const h = state?.helmet;
  const b = state?.breath;
  const inspired = b?.lastInspiredCo2Frac;
  const canPlay = phase === 'ready' || phase === 'paused';
  const eventTimes = events.map((e) => e.timeS);

  return (
    <div className="present">
      <header className="present-bar">
        <div className="brand-title">
          <img className="brand-logo" src={heroLogo} alt="HERO" width={416} height={134} />
          <span className="brand-sub">Simulator</span>
        </div>
        <div className="present-transport">
          {phase === 'running' ? (
            <button type="button" className="btn btn-primary" onClick={sim.pause}>Pause</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={sim.play} disabled={!sim.available || !canPlay}>
              {phase === 'paused' ? 'Resume' : 'Play'}
            </button>
          )}
          <button type="button" className="btn" onClick={sim.reset} disabled={!sim.available}>Reset</button>
          <div className="speed-row" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <button key={s} type="button" className="seg" aria-pressed={speed === s} disabled={!sim.available} onClick={() => sim.setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>
        <div className="present-right">
          <span className="present-time">
            t = {fmt(sim.sceneFrame?.timeS ?? state?.timeS, 1)} s{sim.sceneFrame?.breathPhase ? ` · ${sim.sceneFrame.breathPhase}` : ''}
          </span>
          <button type="button" className="btn present-exit" onClick={onExit} title="Exit presentation (Esc)">Exit</button>
        </div>
      </header>

      {haltReason && <p className={`notice present-notice ${phase === 'halted' ? 'notice-error' : ''}`} role="status">{haltReason}</p>}

      <main className="present-main">
        <section className="panel present-scene" aria-label="Helmet view">
          <HelmetScene frame={sim.sceneFrame} showLabels />
        </section>

        <section className="panel present-readings" aria-label="Key readings">
          <Big
            label="Helmet pressure"
            value={fmt(h && paToBar(h.pressurePaAbs), 3)}
            unit="bar abs"
            sub={h ? `${fmt(paToBar(h.pressurePaGauge), 3)} bar gauge · ${fmt(paToCmH2O(h.pressurePaGauge), 0)} cmH₂O` : undefined}
          />
          <Big label="CO₂ (bulk)" value={fmt(h && fracToPct(h.fractions.co2Frac), 2)} unit="%" />
          <Big
            label="Inspired CO₂ (last breath)"
            value={!state ? UNAVAILABLE : b === null ? 'no patient' : inspired == null ? 'awaiting first breath' : fmt(fracToPct(inspired), 2)}
            unit={inspired == null ? undefined : '%'}
          />
          <Big label="O₂ concentration" value={fmt(h && fracToPct(h.fractions.o2Frac), 1)} unit="%" />
          <Big
            label="Overflow valve"
            value={latest ? (latest.overflowOpen ? 'Venting' : 'Closed') : UNAVAILABLE}
            state={latest ? (latest.overflowOpen ? 'on' : 'off') : undefined}
            sub={state ? `duty ${fmt(fracToPct(state.overflow.recentDutyCycleFrac), 0)} % (last ${fmt(state.overflow.dutyCycleWindowS, 0)} s)` : undefined}
          />
          <Big label="Oxygen supplied" value={fmt(state?.cumulative.o2FromSourceRefL, 1)} unit="ref L" />
        </section>

        <section className="panel charts present-charts" aria-label="Charts">
          <TimeChart
            title="Helmet pressure"
            unit="bar abs"
            digits={2}
            data={rows}
            series={[{ key: 'pressure', name: 'Pressure', color: '#1f5fa8' }]}
            referenceY={parameters ? { value: paToBar(parameters.outlets.overflowThresholdPaAbs), label: 'overflow threshold' } : undefined}
            eventTimes={eventTimes}
          />
          <TimeChart title="CO₂" unit="%" digits={2} data={rows} series={[{ key: 'co2', name: 'Bulk', color: '#d9822b' }]} eventTimes={eventTimes} />
        </section>
      </main>
      <footer className="present-hint">P or Esc to exit · Space to play/pause</footer>
    </div>
  );
}
