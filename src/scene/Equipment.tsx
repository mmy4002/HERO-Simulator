import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { TubeGeometry } from 'three';
import { labelStyle } from './Hood';
import {
  CYLINDER_BODY_TOP_Y, CYLINDER_BOTTOM_Y, CYLINDER_POS, CYLINDER_RADIUS, HOSE_CURVE, REGULATOR_OUTLET, REGULATOR_Y,
} from './layout';

const BRASS = { color: '#c9a24a', metalness: 0.9, roughness: 0.25 } as const;
const STEEL = { color: '#b9c0c5', metalness: 0.9, roughness: 0.2 } as const;

function Gauge() {
  return (
    <group position={[0, 0.42, 0]} rotation={[0, -0.75, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.25, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 40]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <circleGeometry args={[0.19, 40]} />
        <meshStandardMaterial color="#f7f7f2" roughness={0.4} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => {
        const a = -2.3 + (i / 10) * 4.6;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0.053]} rotation={[0, 0, -a]}>
            <planeGeometry args={[0.008, 0.035]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        );
      })}
      <mesh position={[0.03, 0.06, 0.056]} rotation={[0, 0, -0.45]}>
        <planeGeometry args={[0.012, 0.15]} />
        <meshBasicMaterial color="#b3261e" />
      </mesh>
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 40]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.15} roughness={0} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Equipment({ showLabels }: { showLabels: boolean }) {
  const hose = useMemo(() => new TubeGeometry(HOSE_CURVE, 120, 0.05, 14, false), []);
  const bodyH = CYLINDER_BODY_TOP_Y - CYLINDER_BOTTOM_Y;
  const regLen = CYLINDER_POS.x - REGULATOR_OUTLET.x;

  return (
    <group>
      <group position={[CYLINDER_POS.x, 0, CYLINDER_POS.z]}>
        {/* green O2 cylinder */}
        <mesh position={[0, CYLINDER_BOTTOM_Y + bodyH / 2, 0]}>
          <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, bodyH, 48]} />
          <meshPhysicalMaterial color="#0f6b3a" roughness={0.28} metalness={0.2} clearcoat={1} clearcoatRoughness={0.12} />
        </mesh>
        <mesh position={[0, CYLINDER_BODY_TOP_Y, 0]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[CYLINDER_RADIUS, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#0f6b3a" roughness={0.28} metalness={0.2} clearcoat={1} clearcoatRoughness={0.12} />
        </mesh>
        {/* cylinder valve */}
        <mesh position={[0, CYLINDER_BODY_TOP_Y + 0.42, 0]}>
          <cylinderGeometry args={[0.1, 0.13, 0.22, 20]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, REGULATOR_Y - 0.13, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 6]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        {/* regulator body along -x towards the hose */}
        <mesh position={[0, REGULATOR_Y, 0]}>
          <boxGeometry args={[0.32, 0.18, 0.2]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[-regLen / 2, REGULATOR_Y, 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, regLen, 18]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[-regLen + 0.06, REGULATOR_Y, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.085, 0.085, 0.12, 6]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[-regLen / 2, REGULATOR_Y - 0.12, 0.03]}>
          <cylinderGeometry args={[0.05, 0.06, 0.14, 12]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <group position={[-regLen * 0.45, REGULATOR_Y, 0.03]}>
          <Gauge />
        </group>
        {/* black valve knob */}
        <group position={[0.06, REGULATOR_Y + 0.28, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.18, 12]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.16, 0.17, 0.24, 12]} />
            <meshStandardMaterial color="#141414" roughness={0.45} />
          </mesh>
        </group>
        {showLabels && (
          <Html position={[0, -2.6, CYLINDER_RADIUS]} center zIndexRange={[20, 0]}>
            <div style={labelStyle('device')}>O₂ cylinder + regulator</div>
          </Html>
        )}
      </group>

      {/* clear flexible supply hose */}
      <mesh geometry={hose} renderOrder={6}>
        <meshPhysicalMaterial color="#e9f3f6" roughness={0.1} transparent opacity={0.45} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  );
}
