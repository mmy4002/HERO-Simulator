import { useCallback } from 'react';
import Header from './components/Header';
import ControlsPanel from './components/ControlsPanel';
import ScenePanel from './components/ScenePanel';
import ReadingsPanel from './components/ReadingsPanel';
import ChartsPanel from './components/ChartsPanel';
import RunsPanel from './components/RunsPanel';
import PresentationView from './components/PresentationView';
import { useSimulation } from './app/useSimulation';
import { useComparison } from './app/useComparison';
import { usePresentation } from './app/usePresentation';

export default function App() {
  const sim = useSimulation();
  const cmp = useComparison();
  const { pause, play } = sim;
  const togglePlay = useCallback(() => (sim.phase === 'running' ? pause() : play()), [sim.phase, pause, play]);
  const presentation = usePresentation(togglePlay);

  if (presentation.presenting) return <PresentationView sim={sim} onExit={presentation.exit} />;

  return (
    <div className="app">
      <Header phase={sim.phase} timeS={sim.sceneFrame?.timeS ?? sim.state?.timeS ?? null} onPresent={presentation.enter} />
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
