import { lazy, Suspense, useState, type CSSProperties } from 'react';
import type { HelmetSceneProps } from '../shared/types';
import ImageScene from './image/ImageScene';

/** The 3D view (three.js) is loaded only when the user switches to it. */
const Scene3D = lazy(() => import('./Scene3D'));

type View = 'image' | '3d';

const toggleBtn = (active: boolean): CSSProperties => ({
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  background: active ? '#1f6f80' : 'transparent',
  color: active ? '#fff' : '#23343c',
  cursor: active ? 'default' : 'pointer',
});

export default function HelmetScene({ frame, showLabels = true }: HelmetSceneProps) {
  const [view, setView] = useState<View>('image');
  return (
    <div
      className="scene-viewport"
      data-has-frame={frame !== null}
      data-active-view={view}
      style={{ position: 'relative', flex: 1, minHeight: 0, minWidth: 0, alignSelf: 'stretch', overflow: 'hidden', border: 'none', background: '#eeefee' }}
    >
      {view === 'image' ? (
        <ImageScene frame={frame} showLabels={showLabels} />
      ) : (
        <Suspense fallback={<div style={{ margin: 'auto', color: '#5b6b73', fontSize: 13 }}>Loading 3D view…</div>}>
          <Scene3D frame={frame} showLabels={showLabels} />
        </Suspense>
      )}
      <div
        role="group"
        aria-label="Scene view"
        style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #b9cad4', background: 'rgba(255,255,255,0.92)' }}
      >
        <button type="button" style={toggleBtn(view === 'image')} aria-pressed={view === 'image'} onClick={() => setView('image')}>Photo view</button>
        <button type="button" style={toggleBtn(view === '3d')} aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D view</button>
      </div>
    </div>
  );
}
