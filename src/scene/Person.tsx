import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { airwayActivity, breathFillFrac } from './activity';
import { useFrameRef } from './frameContext';

const SKIN = '#d6a084';
const SKIN_SHADE = '#c98e72';
const LIP = '#b2705f';
const HAIR = '#3a2e27';
const SHIRT = '#5f6266';

function Skin({ color = SKIN }: { color?: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.55} sheen={0.4} sheenColor="#ffd9c7" clearcoat={0.08} />;
}

function Eye({ side }: { side: 1 | -1 }) {
  const x = 0.29 * side;
  return (
    <group position={[x, 0.19, 0.735]} rotation={[0, 0.12 * side, 0]}>
      <mesh>
        <sphereGeometry args={[0.1, 24, 16]} />
        <meshPhysicalMaterial color="#f4efe9" roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0, 0.094]}>
        <circleGeometry args={[0.05, 24]} />
        <meshStandardMaterial color="#5b6a5a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.096]}>
        <circleGeometry args={[0.024, 20]} />
        <meshStandardMaterial color="#111" roughness={0.2} />
      </mesh>
      {/* upper eyelid */}
      <mesh rotation={[-0.35, 0, 0]}>
        <sphereGeometry args={[0.115, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <Skin />
      </mesh>
      {/* lower lid */}
      <mesh rotation={[Math.PI + 0.55, 0, 0]}>
        <sphereGeometry args={[0.112, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.2]} />
        <Skin />
      </mesh>
      {/* brow */}
      <mesh position={[0.01 * side, 0.15, 0.03]} rotation={[0, 0, (Math.PI / 2) - 0.12 * side]}>
        <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
        <meshStandardMaterial color={HAIR} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Ear({ side }: { side: 1 | -1 }) {
  return (
    <group position={[0.77 * side, 0.12, -0.05]} rotation={[0, -0.35 * side, 0.05 * side]}>
      <mesh scale={[0.07, 0.22, 0.13]}>
        <sphereGeometry args={[1, 20, 16]} />
        <Skin color={SKIN_SHADE} />
      </mesh>
      <mesh position={[0.04 * side, 0.01, 0.02]} rotation={[0, (Math.PI / 2) * side, 0]} scale={[0.75, 1.35, 1]}>
        <torusGeometry args={[0.075, 0.02, 8, 20]} />
        <Skin color={SKIN_SHADE} />
      </mesh>
    </group>
  );
}

export default function Person() {
  const frameRef = useFrameRef();
  const chest = useRef<Group>(null);
  const lowerLip = useRef<Mesh>(null);

  useFrame(() => {
    const f = frameRef.current;
    const fill = breathFillFrac(f);
    if (chest.current) {
      chest.current.scale.set(1 + 0.012 * fill, 1 + 0.02 * fill, 1 + 0.035 * fill);
    }
    if (lowerLip.current) {
      const open = f && f.breathPhase ? airwayActivity(f.airwayFlowM3PerS) : 0;
      lowerLip.current.position.y = -0.455 - 0.025 * open;
    }
  });

  return (
    <group rotation={[0, 0.12, 0]}>
      {/* Head */}
      <group position={[0, -0.05, 0.02]} rotation={[0.02, 0.06, 0]}>
        <mesh scale={[0.78, 0.98, 0.9]}>
          <sphereGeometry args={[1, 48, 36]} />
          <Skin />
        </mesh>
        {/* jaw, cheeks, chin, brow ridge */}
        <mesh position={[0, -0.5, 0.12]} scale={[0.66, 0.62, 0.74]}>
          <sphereGeometry args={[1, 40, 28]} />
          <Skin />
        </mesh>
        <mesh position={[0, -0.96, 0.5]} scale={[0.25, 0.19, 0.22]}>
          <sphereGeometry args={[1, 24, 16]} />
          <Skin />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.33 * s, -0.15, 0.48]} scale={[0.27, 0.27, 0.27]}>
            <sphereGeometry args={[1, 24, 16]} />
            <Skin />
          </mesh>
        ))}
        <mesh position={[0, 0.34, 0.64]} scale={[0.5, 0.09, 0.2]}>
          <sphereGeometry args={[1, 28, 16]} />
          <Skin />
        </mesh>

        {/* nose */}
        <mesh position={[0, 0.02, 0.88]} rotation={[-0.32, 0, 0]}>
          <capsuleGeometry args={[0.07, 0.3, 6, 12]} />
          <Skin />
        </mesh>
        <mesh position={[0, -0.18, 0.99]}>
          <sphereGeometry args={[0.088, 20, 16]} />
          <Skin />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.085 * s, -0.22, 0.92]} scale={[0.075, 0.06, 0.08]}>
            <sphereGeometry args={[1, 16, 12]} />
            <Skin color={SKIN_SHADE} />
          </mesh>
        ))}

        <Eye side={1} />
        <Eye side={-1} />
        <Ear side={1} />
        <Ear side={-1} />

        {/* mouth */}
        <mesh position={[0, -0.42, 0.9]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.8]}>
          <capsuleGeometry args={[0.03, 0.2, 4, 10]} />
          <meshStandardMaterial color={LIP} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.437, 0.905]} scale={[0.14, 0.006, 0.02]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#5a2e28" />
        </mesh>
        <mesh ref={lowerLip} position={[0, -0.455, 0.885]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.8]}>
          <capsuleGeometry args={[0.036, 0.18, 4, 10]} />
          <meshStandardMaterial color={LIP} roughness={0.5} />
        </mesh>

        {/* short hair */}
        <mesh position={[0, 0.05, -0.04]} rotation={[-0.5, 0, 0]} scale={[0.82, 0.98, 0.95]}>
          <sphereGeometry args={[1.02, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color={HAIR} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.02, -0.12]} rotation={[-1.25, 0, 0]} scale={[0.81, 0.95, 0.92]}>
          <sphereGeometry args={[1.02, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial color={HAIR} roughness={0.95} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, -1.25, -0.02]}>
        <cylinderGeometry args={[0.4, 0.46, 1.2, 32]} />
        <Skin />
      </mesh>

      {/* Torso + shoulders */}
      <group ref={chest} position={[0, -1.9, -0.05]}>
        <mesh position={[0, -1.05, 0]} scale={[2.05, 1.1, 0.95]}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial color={SHIRT} roughness={0.95} />
        </mesh>
        <mesh position={[0, -2.2, 0]}>
          <cylinderGeometry args={[1.8, 1.6, 2.4, 40]} />
          <meshStandardMaterial color={SHIRT} roughness={0.95} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[1.95 * s, -2.1, 0]} rotation={[0, 0, 0.12 * s]}>
            <capsuleGeometry args={[0.42, 1.8, 8, 16]} />
            <meshStandardMaterial color={SHIRT} roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.06, 10, 36]} />
          <meshStandardMaterial color="#56595d" roughness={0.95} />
        </mesh>
      </group>

      {/* Chair back */}
      <mesh position={[0, -3.6, -1.35]}>
        <boxGeometry args={[3.6, 3.2, 0.25]} />
        <meshStandardMaterial color="#1d1f22" roughness={0.7} />
      </mesh>
    </group>
  );
}
