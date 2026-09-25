import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
  /** Render as point markers instead of a line. */
  markers?: boolean;
}

export type ChartRow = Record<string, number | null>;

interface Props {
  title: string;
  unit: string;
  data: ChartRow[];
  series: ChartSeries[];
  digits: number;
  referenceY?: { value: number; label: string };
  eventTimes?: number[];
  /** Fixed lower bound for the y-axis (e.g. 0 for flows). */
  yMin?: number;
}

export default function TimeChart({ title, unit, data, series, digits, referenceY, eventTimes = [], yMin }: Props) {
  const hasData = data.length > 1;
  return (
    <figure className="chart">
      <figcaption className="chart-title">
        {title}
        <span className="unit">{unit}</span>
      </figcaption>
      <div className="chart-plot" data-empty={!hasData}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#eef2f5" vertical={false} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toFixed(0)} height={18} />
              <YAxis tick={{ fontSize: 11 }} width={46} domain={[yMin ?? 'auto', 'auto']} tickFormatter={(v: number) => v.toFixed(digits)} />
              <Tooltip
                formatter={(v) => (typeof v === 'number' ? `${v.toFixed(digits + 1)} ${unit}` : String(v))}
                labelFormatter={(t) => `t = ${Number(t).toFixed(1)} s`}
                contentStyle={{ fontSize: 12 }}
              />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} height={16} iconSize={10} />}
              {referenceY && (
                <ReferenceLine y={referenceY.value} stroke="#c0392b" strokeDasharray="5 3" label={{ value: referenceY.label, fontSize: 10, fill: '#c0392b', position: 'insideTopRight' }} ifOverflow="extendDomain" />
              )}
              {eventTimes.map((t, i) => (
                <ReferenceLine key={`ev-${i}`} x={t} stroke="#8a99a3" strokeDasharray="2 3" />
              ))}
              {series.map((s) =>
                s.markers ? (
                  <Scatter key={s.key} name={s.name} dataKey={s.key} fill={s.color} shape="diamond" isAnimationActive={false} legendType="diamond" />
                ) : (
                  <Line key={s.key} name={s.name} dataKey={s.key} stroke={s.color} strokeWidth={1.8} strokeDasharray={s.dashed ? '6 3' : undefined} dot={false} isAnimationActive={false} connectNulls />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <span className="chart-empty">No data</span>
        )}
      </div>
      <div className="chart-xlabel">Time (s)</div>
    </figure>
  );
}
