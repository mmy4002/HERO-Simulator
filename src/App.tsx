import Header from './components/Header';
import ControlsPanel from './components/ControlsPanel';
import ScenePanel from './components/ScenePanel';
import ReadingsPanel from './components/ReadingsPanel';
import ChartsPanel from './components/ChartsPanel';
import RunsPanel from './components/RunsPanel';
import { useSimulation } from './app/useSimulation';
import { useComparison } from './app/useComparison';

export default function App() {
  const sim = useSimulation();
  const cmp = useComparison();
  return (
    <div className="app">
      <Header phase={sim.phase} timeS={sim.state?.timeS ?? null} />
      <main className="dashboard">
        <ControlsPanel sim={sim}>
          <RunsPanel sim={sim} cmp={cmp} />
        </ControlsPanel>
        <ScenePanel frame={sim.sceneFrame} />
        <ReadingsPanel state={sim.state} latest={sim.history[sim.history.length - 1] ?? null} />
        <ChartsPanel history={sim.history} events={sim.events} parameters={sim.parameters} runs={cmp.runs} />
      </main>
    </div>
  );
}
