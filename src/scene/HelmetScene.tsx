import { Suspense, useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { HelmetSceneProps, SceneFrame } from '../shared/types';
import Equipment from './Equipment';
import Flow from './Flow';
import { FrameContext } from './frameContext';
import Hood from './Hood';
import { CAMERA_POSITION, CAMERA_TARGET } from './layout';
import Person from './Person';

function Controls({ controlsRef }: { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.target.set(...CAMERA_TARGET);
    c.update();
    c.saveState();
  }, [controlsRef]);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={20}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.62}
    />
  );
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#b9c3c9', 0.55]} />
      <directionalLight position={[-5, 6, 7]} intensity={2.1} color="#fff6ec" />
      <directionalLight position={[6, 3, 4]} intensity={0.7} color="#e8f2ff" />
      <directionalLight position={[0, 4, -7]} intensity={1.1} color="#ffffff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[-4, 4, 5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[5, 2, 3]} scale={[3, 5, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 6, 0]} scale={4} />
        <Lightformer form="rect" intensity={1} position={[0, 1, -6]} scale={[8, 4, 1]} />
      </Environment>
    </>
  );
}

const overlayButton: CSSProperties = {
  position: 'absolute',
  right: 10,
  top: 10,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: '1px solid #b9cad4',
  background: 'rgba(255,255,255,0.9)',
  color: '#23343c',
  cursor: 'pointer',
};

export default function HelmetScene({ frame, showLabels = true }: HelmetSceneProps) {
  const frameRef = useRef<SceneFrame | null>(frame);
  frameRef.current = frame;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div
      className="scene-viewport"
      data-has-frame={frame !== null}
      style={{ position: 'relative', flex: 1, minHeight: 0, minWidth: 0, alignSelf: 'stretch', overflow: 'hidden', border: 'none', background: 'linear-gradient(180deg, #f4f6f7 0%, #e3e8eb 100%)' }}
    >
      <FrameContext.Provider value={frameRef}>
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          dpr={[1, 2]}
          camera={{ position: CAMERA_POSITION, fov: 30, near: 0.1, far: 100 }}
          gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        >
          <Suspense fallback={null}>
            <Lighting />
            <Person />
            <Equipment showLabels={showLabels} />
            <Flow />
            <Hood showLabels={showLabels} />
            <ContactShadows position={[0, -5.2, 0]} opacity={0.3} scale={14} blur={2.5} far={6} />
          </Suspense>
          <Controls controlsRef={controlsRef} />
        </Canvas>
      </FrameContext.Provider>
      <button type="button" style={overlayButton} onClick={() => controlsRef.current?.reset()} title="Reset camera">
        Reset view
      </button>
      <div style={{ position: 'absolute', left: 10, bottom: 8, fontSize: 11, color: '#5b6b73', pointerEvents: 'none' }}>
        Drag to orbit · scroll to zoom · particles are illustrative, not concentrations
      </div>
    </div>
  );
}
