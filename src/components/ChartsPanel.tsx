import { useMemo, useState } from 'react';
import type { SimulationEvent, SimulationParameters, SimulationSample } from '../shared/types';
import type { SavedRun } from '../app/runs';
import { comparisonRows, liveRows } from '../app/chartData';
import { paToBar } from '../app/units';
import TimeChart, { type ChartRow, type ChartSeries } from './TimeChart';
import ComparisonSummary from './ComparisonSummary';

const C = { teal: '#0f8a8a', blue: '#1f5fa8', orange: '#d9822b', red: '#c0392b', purple: '#7b4fb0', grey: '#5b6b76' };

interface Props {
  history: SimulationSample[];
  events: SimulationEvent[];
  parameters: SimulationParameters | null;
  runs: Partial<Record<'A' | 'B', SavedRun>>;
}

function chartSet(rows: ChartRow[], prefixes: { p: string; name: string; dashed?: boolean }[], thresholdBar: number | null, eventTimes: number[]) {
  const mk = (key: string, name: string, color: string, extra: Partial<ChartSeries> = {}) =>
    prefixes.map(({ p, name: run, dashed }) => ({ key: p + key, name: prefixes.length > 1 ? `${name} ${run}` : name, color, dashed, ...extra }));
  return (
    <>
      <TimeChart
        title="Helmet pressure"
        unit="bar abs"
        digits={3}
        data={rows}
        series={mk('pressure', 'Pressure', C.blue)}
        referenceY={thresholdBar === null ? undefined : { value: thresholdBar, label: 'overflow threshold' }}
        eventTimes={eventTimes}
      />
      <TimeChart
        title="CO₂"
        unit="%"
        digits={2}
        data={rows}
        series={[...mk('co2', 'Bulk', C.orange), ...mk('inspired', 'Inspired (breath)', C.red, { markers: true })]}
        eventTimes={eventTimes}
      />
      <TimeChart title="O₂ concentration" unit="%" digits={1} data={rows} series={mk('o2', 'O₂', C.teal)} eventTimes={eventTimes} />
      <TimeChart
        title="External flows"
        unit="ref L/min"
        digits={0}
        data={rows}
        series={[...mk('inlet', 'Inlet', C.blue), ...mk('maintenance', 'Maintenance', C.teal), ...mk('overflow', 'Overflow', C.purple)]}
        eventTimes={eventTimes}
      />
    </>
  );
}

export default function ChartsPanel({ history, events, parameters, runs }: Props) {
  const [tab, setTab] = useState<'live' | 'compare'>('live');
  const live = useMemo(() => liveRows(history), [history]);
  const compare = useMemo(() => comparisonRows(runs.A?.result?.samples ?? null, runs.B?.result?.samples ?? null), [runs]);
  const hasComparison = Boolean(runs.A?.result || runs.B?.result);
  const liveThreshold = parameters ? paToBar(parameters.outlets.overflowThresholdPaAbs) : null;
  const compareThreshold = runs.A ? paToBar(runs.A.parameters.outlets.overflowThresholdPaAbs) : null;

  return (
    <section className="panel charts" aria-labelledby="charts-title">
      <div className="panel-head">
        <h2 id="charts-title" className="panel-title">Time series</h2>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'live'} className="tab" onClick={() => setTab('live')}>Live run</button>
          <button type="button" role="tab" aria-selected={tab === 'compare'} className="tab" onClick={() => setTab('compare')}>A/B comparison</button>
        </div>
        {tab === 'live' && events.length > 0 && <span className="panel-note">Dotted lines: parameter changes</span>}
        {tab === 'compare' && runs.A && runs.B && runs.A.parameters.outlets.overflowThresholdPaAbs !== runs.B.parameters.outlets.overflowThresholdPaAbs && (
          <span className="panel-note">Threshold line shows run A</span>
        )}
      </div>
      {tab === 'live' ? (
        <div className="chart-grid">{chartSet(live, [{ p: '', name: '' }], liveThreshold, events.map((e) => e.timeS))}</div>
      ) : hasComparison ? (
        <div className="compare-layout">
          <div className="chart-grid">
            {chartSet(compare, [{ p: 'a_', name: 'A' }, { p: 'b_', name: 'B', dashed: true }], compareThreshold, [])}
          </div>
          <ComparisonSummary runs={runs} />
        </div>
      ) : (
        <div className="chart-grid-empty">Save run A and run B from the controls panel, then press “Run A/B”.</div>
      )}
    </section>
  );
}
