import { useMemo, useRef, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { BackSide, DoubleSide, FrontSide, LatheGeometry, MathUtils, Vector2, Vector3, type Group, type MeshStandardMaterial } from 'three';
import { hoodInflationScale } from './activity';
import { useFrameRef } from './frameContext';
import {
  HOOD_BASE_Y, HOOD_PROFILE, INLET_ANGLE, MAINTENANCE_ANGLE, OVERFLOW_ANGLE, PORT_SURFACE_R, radial,
} from './layout';

/** Lathe hood with gentle creases so the film reads as soft and flexible, not a rigid bowl. */
function useHoodGeometry() {
  return useMemo(() => {
    const geo = new LatheGeometry(HOOD_PROFILE.map(([r, y]) => new Vector2(r, y)), 96);
    const pos = geo.attributes.position;
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.z);
      if (r < 1e-4) continue;
      const a = Math.atan2(v.x, v.z);
      const t = MathUtils.clamp((v.y - HOOD_BASE_Y) / 3.2, 0, 1);
      const crease = 0.018 * Math.sin(a * 9 + v.y * 2.3) * Math.sin(Math.PI * t) + 0.012 * Math.sin(a * 23 - v.y * 5) * (1 - t);
      const k = (r + crease) / r;
      pos.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const profileLine = (angle: number, from = 0, to = HOOD_PROFILE.length - 1) =>
  HOOD_PROFILE.slice(from, to + 1).map(([r, y]) => new Vector3(Math.sin(angle) * (r + 0.004), y, Math.cos(angle) * (r + 0.004)));

const ringLine = (idx: number) => {
  const [r, y] = HOOD_PROFILE[idx];
  return Array.from({ length: 97 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2;
    return new Vector3(Math.sin(a) * (r + 0.004), y, Math.cos(a) * (r + 0.004));
  });
};

function HoodFilm() {
  const geo = useHoodGeometry();
  const frameRef = useFrameRef();
  const group = useRef<Group>(null);
  const seams = useMemo(() => [profileLine(Math.PI / 2), profileLine(-Math.PI / 2), ringLine(8), ringLine(2)], []);

  useFrame((_, dt) => {
    if (!group.current) return;
    const s = MathUtils.damp(group.current.scale.x, hoodInflationScale(frameRef.current), 4, dt);
    group.current.scale.setScalar(s);
  });

  const film = { color: '#f4fbff', roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, depthWrite: false, envMapIntensity: 1.6 };
  return (
    <group position={[0, HOOD_BASE_Y, 0]}>
      <group ref={group}>
        <group position={[0, -HOOD_BASE_Y, 0]}>
          <mesh geometry={geo} renderOrder={10}>
            <meshPhysicalMaterial {...film} side={BackSide} opacity={0.1} />
          </mesh>
          <mesh geometry={geo} renderOrder={12}>
            <meshPhysicalMaterial {...film} side={FrontSide} opacity={0.14} />
          </mesh>
          {seams.map((pts, i) => (
            <Line key={i} points={pts} color="#dfe8ee" lineWidth={1.2} transparent opacity={0.45} renderOrder={13} depthWrite={false} />
          ))}
        </group>
      </group>
    </group>
  );
}

function NeckSeal() {
  const geo = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.44, -1.62], [0.52, -1.76], [0.75, -1.84], [0.98, -1.78], [1.08, -1.6], [1.1, -1.45], [1.05, -1.3],
        ].map(([r, y]) => new Vector2(r, y)),
        72,
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={geo} renderOrder={8}>
        <meshPhysicalMaterial color="#eef3f4" roughness={0.55} transmission={0} transparent opacity={0.72} depthWrite={false} side={DoubleSide} sheen={0.5} />
      </mesh>
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={9}>
        <torusGeometry args={[1.06, 0.05, 12, 72]} />
        <meshPhysicalMaterial color="#e6eced" roughness={0.45} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

type PortKind = 'inlet' | 'maintenance' | 'overflow';

function Port({ angle, kind, label, showLabel }: { angle: number; kind: PortKind; label: string; showLabel: boolean }) {
  const frameRef = useFrameRef();
  const ring = useRef<MeshStandardMaterial>(null);
  const pos = radial(angle, PORT_SURFACE_R);

  useFrame(() => {
    if (!ring.current) return;
    const f = frameRef.current;
    const active = kind === 'overflow' ? !!f?.overflowOpen : kind === 'inlet' ? (f?.inletRefLpm ?? 0) > 0 : (f?.maintenanceRefLpm ?? 0) > 0;
    const color = kind === 'overflow' ? '#ff8a3d' : '#3fb6c8';
    ring.current.emissive.set(active ? color : '#000000');
    ring.current.emissiveIntensity = active ? (kind === 'overflow' ? 1.4 : 0.5) : 0;
  });

  return (
    <group position={pos} rotation={[0, angle, 0]}>
      {/* clear collar welded into the film */}
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={11}>
        <cylinderGeometry args={[0.2, 0.24, 0.1, 28]} />
        <meshPhysicalMaterial color="#f2f7fa" roughness={0.15} transparent opacity={0.45} depthWrite={false} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.3, 24]} />
        <meshStandardMaterial color="#9aa1a6" metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.085, 0.028, 10, 24]} />
        <meshStandardMaterial ref={ring} color="#7d858b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.285]}>
        <circleGeometry args={[0.058, 20]} />
        <meshStandardMaterial color="#2a2d30" roughness={0.6} />
      </mesh>
      {showLabel && (
        <Html position={[0, kind === 'overflow' ? 0.42 : -0.38, 0.3]} center zIndexRange={[20, 0]}>
          <div className="scene-label" style={labelStyle(kind)}>{label}</div>
        </Html>
      )}
    </group>
  );
}

export const labelStyle = (kind: PortKind | 'device'): CSSProperties => ({
  whiteSpace: 'nowrap',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 7px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.88)',
  border: `1px solid ${kind === 'overflow' ? '#e9824a' : kind === 'device' ? '#5a8a6a' : '#3a98a8'}`,
  color: '#23343c',
  pointerEvents: 'none',
  userSelect: 'none',
});

export default function Hood({ showLabels }: { showLabels: boolean }) {
  return (
    <group>
      <NeckSeal />
      <Port angle={INLET_ANGLE} kind="inlet" label="Inlet" showLabel={showLabels} />
      <Port angle={MAINTENANCE_ANGLE} kind="maintenance" label="Maintenance outlet" showLabel={showLabels} />
      <Port angle={OVERFLOW_ANGLE} kind="overflow" label="Overflow outlet" showLabel={showLabels} />
      <HoodFilm />
    </group>
  );
}
