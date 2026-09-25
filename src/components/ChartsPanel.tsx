import { CHARTS } from '../config/dashboard';

export default function ChartsPanel() {
  return (
    <section className="panel charts" aria-labelledby="charts-title">
      <h2 id="charts-title" className="panel-title">Time series</h2>
      <div className="chart-grid">
        {CHARTS.map((c) => (
          <figure className="chart" key={c.id}>
            <figcaption className="chart-title">
              {c.title}
              <span className="unit">{c.yLabel}</span>
            </figcaption>
            <div className="chart-plot">
              <span className="chart-empty">No data</span>
            </div>
            <div className="chart-xlabel">Time (s)</div>
          </figure>
        ))}
      </div>
    </section>
  );
}
