export default function Header() {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <h1>
          HEROES <span className="brand-sep">—</span> <span className="brand-sub">Oxygen Helmet Simulator</span>
        </h1>
      </div>
      <div className="sim-status">
        <span className="status-dot" aria-hidden="true" />
        Simulation not loaded
      </div>
    </header>
  );
}
