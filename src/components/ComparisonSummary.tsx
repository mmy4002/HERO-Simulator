import type { SavedRun, RunSummary } from '../app/runs';
import { fmt, fracToPct, paToBar } from '../app/units';

const ROWS: [string, (s: RunSummary) => string][] = [
  ['Mean CO₂ (%)', (s) => fmt(fracToPct(s.meanCo2Frac), 3)],
  ['Peak CO₂ (%)', (s) => fmt(fracToPct(s.peakCo2Frac), 3)],
  ['Mean inspired CO₂ (%)', (s) => (s.meanInspiredCo2Frac === null ? 'no breaths' : fmt(fracToPct(s.meanInspiredCo2Frac), 3))],
  ['Final pressure (bar abs)', (s) => fmt(paToBar(s.finalPressurePaAbs), 4)],
  ['Peak pressure (bar abs)', (s) => fmt(paToBar(s.peakPressurePaAbs), 4)],
  ['Oxygen supplied (ref L)', (s) => fmt(s.o2SuppliedRefL, 1)],
  ['Overflow duty cycle (%)', (s) => fmt(fracToPct(s.overflowDutyCycleFrac), 1)],
];

export default function ComparisonSummary({ runs }: { runs: Partial<Record<'A' | 'B', SavedRun>> }) {
  const a = runs.A?.result;
  const b = runs.B?.result;
  const window = (a ?? b)?.summary;
  return (
    <div className="summary">
      <table className="summary-table">
        <thead>
          <tr><th /><th>A</th><th>B</th></tr>
        </thead>
        <tbody>
          {ROWS.map(([label, get]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{a ? get(a.summary) : '—'}</td>
              <td>{b ? get(b.summary) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {window && (
        <p className="summary-note">
          Averages over {window.windowStartS.toFixed(0)}–{window.windowEndS.toFixed(0)} s of each run; inspired CO₂ averaged over completed breaths.
        </p>
      )}
      {[a, b].map((r, i) => r?.haltReason && <p key={i} className="summary-warn">Run {i ? 'B' : 'A'} stopped early: {r.haltReason}</p>)}
    </div>
  );
}
