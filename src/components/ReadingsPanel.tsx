import { READINGS, UNAVAILABLE } from '../config/dashboard';

export default function ReadingsPanel() {
  return (
    <section className="panel readings" aria-labelledby="readings-title">
      <h2 id="readings-title" className="panel-title">Live readings</h2>
      <dl className="reading-list">
        {READINGS.map((r) => (
          <div className="reading" key={r.id}>
            <dt className="reading-label">{r.label}</dt>
            <dd className="reading-value">
              <span className="value">{UNAVAILABLE}</span>
              <span className="unit">{r.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
