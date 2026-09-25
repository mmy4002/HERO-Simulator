import Header from './components/Header';
import ControlsPanel from './components/ControlsPanel';
import ScenePanel from './components/ScenePanel';
import ReadingsPanel from './components/ReadingsPanel';
import ChartsPanel from './components/ChartsPanel';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="dashboard">
        <ControlsPanel />
        <ScenePanel />
        <ReadingsPanel />
        <ChartsPanel />
      </main>
    </div>
  );
}
