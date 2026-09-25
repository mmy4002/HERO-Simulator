import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3, type Curve, type InstancedMesh } from 'three';
import type { SceneFrame } from '../shared/types';
import { airwayActivity, flowActivity } from './activity';
import { useFrameRef } from './frameContext';
import { BREATH_CURVE, HOOD_FLOW_CURVE, HOSE_CURVE, MAINTENANCE_ANGLE, OVERFLOW_ANGLE, outletCurve } from './layout';

interface StreamProps {
  curve: Curve<Vector3>;
  count: number;
  /** Curve traversals per second at full activity. */
  speed: number;
  color: string;
  size: number;
  jitter: number;
  activity: (f: SceneFrame) => number;
  reverse?: (f: SceneFrame) => boolean;
}

/**
 * Illustrative particles moving along a path. Density and speed follow the frame's flow values;
 * motion advances only while frame.running, so pausing freezes the particles in place.
 */
function FlowStream({ curve, count, speed, color, size, jitter, activity, reverse }: StreamProps) {
  const frameRef = useFrameRef();
  const mesh = useRef<InstancedMesh>(null);
  const phase = useRef(0);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        u: (i * 0.618034) % 1,
        off: new Vector3(Math.sin(i * 12.9898) , Math.sin(i * 78.233), Math.sin(i * 39.425)).multiplyScalar(jitter),
        rate: 0.8 + 0.4 * Math.abs(Math.sin(i * 3.7)),
      })),
    [count, jitter],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const p = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const f = frameRef.current;
    const a = f ? activity(f) : 0;
    if (f?.running) phase.current += Math.min(dt, 0.1) * speed * (0.35 + 0.65 * a);
    const visible = Math.round(count * a);
    const rev = f && reverse ? reverse(f) : false;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      let u = (s.u + phase.current * s.rate) % 1;
      if (rev) u = 1 - u;
      curve.getPointAt(u, p);
      const fade = Math.sin(Math.PI * u);
      dummy.position.copy(p).addScaledVector(s.off, fade);
      dummy.scale.setScalar(i < visible ? size * (0.4 + 0.6 * fade) : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

const O2 = '#2ab3c9';
const MIXED = '#7fc6d4';
const OVERFLOW = '#ff8a3d';
const BREATH = '#b8c7d9';

export default function Flow() {
  const maintenance = useMemo(() => outletCurve(MAINTENANCE_ANGLE), []);
  const overflow = useMemo(() => outletCurve(OVERFLOW_ANGLE), []);
  return (
    <group>
      <FlowStream curve={HOSE_CURVE} count={60} speed={0.45} color={O2} size={0.022} jitter={0.012} activity={(f) => flowActivity(f.inletRefLpm)} />
      <FlowStream curve={HOOD_FLOW_CURVE} count={90} speed={0.18} color={MIXED} size={0.03} jitter={0.28} activity={(f) => flowActivity(f.inletRefLpm)} />
      <FlowStream curve={maintenance} count={30} speed={0.5} color={MIXED} size={0.03} jitter={0.07} activity={(f) => flowActivity(f.maintenanceRefLpm)} />
      <FlowStream curve={overflow} count={40} speed={0.8} color={OVERFLOW} size={0.035} jitter={0.1} activity={(f) => (f.overflowOpen ? flowActivity(f.overflowRefLpm) || 0.3 : 0)} />
      <FlowStream
        curve={BREATH_CURVE}
        count={36}
        speed={1.1}
        color={BREATH}
        size={0.025}
        jitter={0.09}
        activity={(f) => (f.breathPhase ? airwayActivity(f.airwayFlowM3PerS) : 0)}
        reverse={(f) => f.breathPhase === 'inspiration'}
      />
    </group>
  );
}
