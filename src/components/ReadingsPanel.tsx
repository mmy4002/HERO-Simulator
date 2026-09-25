import type { ReactNode } from 'react';
import type { SimulationSample, SimulationState } from '../shared/types';
import { fmt, fracToPct, fracToPpm, paToBar, paToCmH2O, UNAVAILABLE } from '../app/units';

function Reading({ label, value, unit, sub, title, state }: { label: string; value: string; unit: string; sub?: ReactNode; title?: string; state?: 'on' | 'off' }) {
  return (
    <div className="reading" title={title} data-state={state}>
      <dt className="reading-label">{label}</dt>
      <dd className="reading-value">
        <span className={/\d/.test(value) ? 'value' : 'value value-text'}>{value}</span>
        <span className="unit">{unit}</span>
      </dd>
      {sub && <dd className="reading-sub">{sub}</dd>}
    </div>
  );
}

export default function ReadingsPanel({ state, latest }: { state: SimulationState | null; latest: SimulationSample | null }) {
  const h = state?.helmet;
  const f = state?.flows;
  const b = state?.breath;
  const inspired = b?.lastInspiredCo2Frac;
  const inspiredText = !state ? UNAVAILABLE : b === null ? 'no patient' : inspired === null || inspired === undefined ? 'awaiting first breath' : null;

  return (
    <section className="panel readings" aria-labelledby="readings-title">
      <h2 id="readings-title" className="panel-title">Live readings</h2>
      <dl className="reading-list">
        <Reading
          label="Helmet pressure"
          value={fmt(h && paToBar(h.pressurePaAbs), 4)}
          unit="bar abs"
          sub={h ? `${fmt(paToBar(h.pressurePaGauge), 4)} bar gauge · ${fmt(paToCmH2O(h.pressurePaGauge), 1)} cmH₂O` : 'gauge —'}
        />
        <Reading
          label="CO₂ (bulk, well-mixed)"
          value={fmt(h && fracToPct(h.fractions.co2Frac), 3)}
          unit="%"
          sub={h ? `${fmt(fracToPpm(h.fractions.co2Frac), 0)} ppm · pCO₂ ${fmt(paToBar(h.co2PartialPressurePaAbs) * 1000, 2)} mbar` : undefined}
          title="Dry-gas partial pressure xCO₂·P, not an alveolar or arterial value"
        />
        <Reading
          label="Inspired CO₂ (last breath)"
          value={inspiredText ?? fmt(fracToPct(inspired!), 3)}
          unit={inspiredText ? '' : '%'}
          title="Breath-weighted average over the last completed inspiration"
        />
        <Reading
          label="O₂ concentration"
          value={fmt(h && fracToPct(h.fractions.o2Frac), 2)}
          unit="%"
          sub={h ? `pO₂ ${fmt(paToBar(h.o2PartialPressurePaAbs), 3)} bar` : undefined}
          title="Dry-gas partial pressure xO₂·P"
        />
        <div className="reading reading-flows">
          <dt className="reading-label" title="Inlet and overflow averaged over the last 0.1 s of simulated time">Flows (ref L/min)</dt>
          <dd>
            <table className="flow-table">
              <tbody>
                <tr><th>Inlet</th><td>{fmt(latest?.inletRefLpm, 1)}</td><td className="req">of {fmt(f?.inletRequestedRefLpm, 0)}</td></tr>
                <tr><th>Maintenance</th><td>{fmt(f?.maintenanceDeliveredRefLpm, 1)}</td><td className="req">of {fmt(f?.maintenanceRequestedRefLpm, 0)}</td></tr>
                <tr><th>Overflow</th><td>{fmt(latest?.overflowRefLpm, 1)}</td><td /></tr>
                <tr className="total"><th>Total out</th><td>{fmt(latest && latest.maintenanceRefLpm + latest.overflowRefLpm, 1)}</td><td /></tr>
              </tbody>
            </table>
          </dd>
        </div>
        <Reading
          label="Overflow valve"
          value={latest ? (latest.overflowOpen ? 'Venting' : 'Closed') : UNAVAILABLE}
          unit=""
          state={latest ? (latest.overflowOpen ? 'on' : 'off') : undefined}
          sub={state ? `duty cycle ${fmt(fracToPct(state.overflow.recentDutyCycleFrac), 0)} % (last ${fmt(state.overflow.dutyCycleWindowS, 0)} s)` : undefined}
        />
        <Reading label="Oxygen supplied" value={fmt(state?.cumulative.o2FromSourceRefL, 2)} unit="ref L" sub="cumulative, from cylinder" />
        <Reading
          label="Simulated time"
          value={fmt(state?.timeS, 1)}
          unit="s"
          sub={b ? `${b.phase} · ${b.completedBreaths} breaths completed` : state ? 'no patient' : undefined}
        />
      </dl>
    </section>
  );
}
