import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SceneFrame } from '../../shared/types';
import HelmetScene from '../HelmetScene';
import { fakeSceneFrame } from './fixture';

/** Dev-only preview: /src/scene/dev/preview.html (?static for frame=null). */
function Preview() {
  const isStatic = new URLSearchParams(location.search).has('static');
  const [running, setRunning] = useState(true);
  const [frame, setFrame] = useState<SceneFrame | null>(isStatic ? null : fakeSceneFrame(0, true));

  useEffect(() => {
    if (isStatic || !running) {
      setFrame((f) => (f ? { ...f, running: false } : f));
      return;
    }
    let t = frame?.timeS ?? 0;
    const id = setInterval(() => {
      t += 0.05;
      setFrame(fakeSceneFrame(t, true));
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isStatic]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
      <div style={{ padding: 6, fontSize: 12 }}>
        <button onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Resume'}</button>{' '}
        {frame ? `t=${frame.timeS.toFixed(1)}s ${frame.breathPhase} overflow=${frame.overflowOpen}` : 'frame=null (static)'}
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <HelmetScene frame={frame} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
