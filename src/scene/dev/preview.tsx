import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import HelmetScene from '../HelmetScene';
import ImageScene from '../image/ImageScene';
import { fakeSceneFrame } from './fixture';

/**
 * Dev-only preview: /src/scene/dev/preview.html
 *   ?static       frame = null
 *   ?paths        image view with anchor paths drawn (alignment check)
 *   ?t=5.2        start at a given simulated time, paused
 * The interval below stands in for the app's simulation clock.
 */
function Preview() {
  const q = new URLSearchParams(location.search);
  const isStatic = q.has('static');
  const startT = q.has('t') ? Number(q.get('t')) : 0;
  const [running, setRunning] = useState(!q.has('t'));
  const [t, setT] = useState(startT);

  useEffect(() => {
    if (isStatic || !running) return;
    const id = setInterval(() => setT((x) => x + 0.05), 50);
    return () => clearInterval(id);
  }, [running, isStatic]);

  const frame = isStatic ? null : fakeSceneFrame(t, running);
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
      <div style={{ padding: 6, fontSize: 12 }}>
        <button onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Resume'}</button>{' '}
        <button onClick={() => setT(0)}>Reset</button>{' '}
        {frame ? `t=${frame.timeS.toFixed(2)}s ${frame.breathPhase} overflow=${frame.overflowOpen}` : 'frame=null (static)'}
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {q.has('paths') ? <ImageScene frame={frame} showPaths /> : <HelmetScene frame={frame} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
