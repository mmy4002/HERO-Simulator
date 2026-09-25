import { useMemo } from 'react';
import type { SceneFrame } from '../../shared/types';
import { airwayActivity, flowActivity } from '../activity';
import figureUrl from '../reference/figure-3b.png';
import {
  BREATH_PATH, HOSE_PATH, IMAGE_HEIGHT, IMAGE_WIDTH, INLET_JET_PATH, LABELS, MAINTENANCE_PATH, MAINTENANCE_PORT, MOUTH,
  OVERFLOW_PATH, OVERFLOW_PORT, type LabelSpec, type Pt,
} from './anchors';
import { polyline, streamParticles, type Particle } from './particles';

const COLORS = {
  supply: '#1aa6c4',
  outlet: '#3a8fa3',
  overflow: '#ef7a2f',
  inhale: '#1aa6c4',
  exhale: '#7d8aa6',
  device: '#4d6b5a',
};

const LINES = {
  hose: polyline(HOSE_PATH),
  jet: polyline(INLET_JET_PATH),
  maintenance: polyline(MAINTENANCE_PATH),
  overflow: polyline(OVERFLOW_PATH),
  breath: polyline(BREATH_PATH),
};

function Dots({ ps, color }: { ps: Particle[]; color: string }) {
  return (
    <g fill={color}>
      {ps.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={p.r} opacity={p.opacity} />
      ))}
    </g>
  );
}

const FONT = 30;
function Label({ spec }: { spec: LabelSpec }) {
  const color = COLORS[spec.tone];
  const w = spec.text.length * FONT * 0.56 + 22;
  const h = FONT + 14;
  const [x, y] = spec.at;
  const cx = x + w / 2;
  const cy = y + h / 2;
  let lead: Pt | null = null;
  if (spec.target) {
    const [tx, ty] = spec.target;
    lead = [Math.min(Math.max(tx, x), x + w), Math.min(Math.max(ty, y), y + h)];
    if (lead[0] === tx && lead[1] === ty) lead = [cx, cy];
  }
  return (
    <g>
      {spec.target && lead && (
        <>
          <line x1={lead[0]} y1={lead[1]} x2={spec.target[0]} y2={spec.target[1]} stroke={color} strokeWidth={3} strokeDasharray="7 5" opacity={0.85} />
          <circle cx={spec.target[0]} cy={spec.target[1]} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
        </>
      )}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="rgba(255,255,255,0.92)" stroke={color} strokeWidth={2} />
      <text x={cx} y={cy + FONT * 0.35} textAnchor="middle" fontSize={FONT} fontWeight={600} fill="#1f3038" fontFamily="system-ui, -apple-system, sans-serif">
        {spec.text}
      </text>
    </g>
  );
}

function PhaseIndicator({ frame }: { frame: SceneFrame | null }) {
  const phase = frame?.breathPhase ?? null;
  const title = !frame ? 'Static view' : phase === 'inspiration' ? 'Inspiration' : phase === 'expiration' ? 'Expiration' : 'No patient model';
  const sub = !frame ? 'no simulation loaded' : !frame.running ? 'paused' : `t = ${frame.timeS.toFixed(1)} s`;
  const prog = phase ? Math.min(1, Math.max(0, frame!.breathPhaseProgressFrac)) : 0;
  const color = phase === 'inspiration' ? COLORS.inhale : phase === 'expiration' ? COLORS.exhale : '#9aa5ab';
  return (
    <g transform="translate(1036 22) scale(1.4)" data-testid="breath-phase">
      <rect width={290} height={92} rx={14} fill="rgba(255,255,255,0.92)" stroke="#c9d5db" strokeWidth={2} />
      <circle cx={30} cy={34} r={11} fill={color} />
      <text x={52} y={42} fontSize={24} fontWeight={700} fill="#1f3038" fontFamily="system-ui, -apple-system, sans-serif">{title}</text>
      <text x={52} y={68} fontSize={17} fill="#5b6b73" fontFamily="system-ui, -apple-system, sans-serif">{sub}</text>
      <rect x={20} y={76} width={250} height={6} rx={3} fill="#e3eaee" />
      <rect x={20} y={76} width={250 * prog} height={6} rx={3} fill={color} />
    </g>
  );
}

export interface ImageSceneProps {
  frame: SceneFrame | null;
  showLabels?: boolean;
  /** Dev-only: draw the anchor paths for alignment checks. */
  showPaths?: boolean;
}

/**
 * Presentation view: the selected reference photograph with SVG overlays in the photo's own
 * pixel coordinates. The SVG viewBox + preserveAspectRatio="meet" letterboxes image and overlays
 * together, so anchors remain aligned at every viewport size. All motion is a pure function of
 * the supplied frame (simulation time and flow values).
 */
export default function ImageScene({ frame, showLabels = true, showPaths = false }: ImageSceneProps) {
  const layers = useMemo(() => {
    if (!frame) return null;
    const t = frame.timeS;
    const inlet = flowActivity(frame.inletRefLpm);
    const maint = flowActivity(frame.maintenanceRefLpm);
    const over = frame.overflowOpen ? Math.max(0.3, flowActivity(frame.overflowRefLpm)) : 0;
    const breath = frame.breathPhase ? airwayActivity(frame.airwayFlowM3PerS) : 0;
    const inhaling = frame.breathPhase === 'inspiration';
    return {
      inlet, over, breath, inhaling,
      hose: streamParticles(LINES.hose, t, inlet, { count: 36, transitS: 2.2, radius: 4.2, spread: 2, salt: 1 }),
      jet: streamParticles(LINES.jet, t, inlet, { count: 10, transitS: 1.2, radius: 4.5, spread: 10, salt: 2 }),
      maintenance: streamParticles(LINES.maintenance, t, maint, { count: 16, transitS: 1.4, radius: 5, spread: 9, salt: 3 }),
      overflow: streamParticles(LINES.overflow, t, over, { count: 20, transitS: 1.0, radius: 5.5, spread: 12, salt: 4 }),
      breathPs: streamParticles(LINES.breath, t, breath, { count: 14, transitS: 0.9, radius: 4.5, spread: 12, reverse: inhaling, salt: 5 }),
    };
  }, [frame]);

  const breathColor = layers?.inhaling ? COLORS.inhale : COLORS.exhale;

  return (
    <svg
      viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Oxygen hood on a seated adult with cylinder, regulator, hose, inlet and two outlets"
      data-view="image"
    >
      <image href={figureUrl} x={0} y={0} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} preserveAspectRatio="none" />

      {showPaths && (
        <g fill="none" strokeWidth={2}>
          {Object.values(LINES).map((l, i) => (
            <polyline key={i} points={l.pts.map((p) => p.join(',')).join(' ')} stroke="#e0218a" />
          ))}
          <circle cx={MOUTH[0]} cy={MOUTH[1]} r={6} fill="#e0218a" />
        </g>
      )}

      {layers && (
        <g>
          {/* valve activity rings at the photographed outlets */}
          <circle cx={MAINTENANCE_PORT[0]} cy={MAINTENANCE_PORT[1]} r={22} fill="none" stroke={COLORS.outlet} strokeWidth={3} opacity={frame!.maintenanceRefLpm > 0 ? 0.7 : 0} />
          <circle cx={OVERFLOW_PORT[0]} cy={OVERFLOW_PORT[1]} r={24} fill={COLORS.overflow} fillOpacity={0.18} stroke={COLORS.overflow} strokeWidth={3.5} opacity={frame!.overflowOpen ? 0.95 : 0} />

          {/* breathing pulse at the mouth, sized by airway flow */}
          <circle cx={MOUTH[0]} cy={MOUTH[1]} r={14 + 26 * layers.breath} fill={breathColor} fillOpacity={0.12 + 0.2 * layers.breath} stroke={breathColor} strokeOpacity={0.5 * layers.breath} strokeWidth={2} />

          <Dots ps={layers.hose} color={COLORS.supply} />
          <Dots ps={layers.jet} color={COLORS.supply} />
          <Dots ps={layers.maintenance} color={COLORS.outlet} />
          <Dots ps={layers.overflow} color={COLORS.overflow} />
          <Dots ps={layers.breathPs} color={breathColor} />
        </g>
      )}

      {showLabels && LABELS.map((l) => <Label key={l.id} spec={l} />)}
      <PhaseIndicator frame={frame} />
      <text x={IMAGE_WIDTH - 24} y={186} textAnchor="end" fontSize={20} fill="#6b7a82" fontFamily="system-ui, -apple-system, sans-serif">
        Particles are illustrative flow indicators, not concentrations
      </text>
    </svg>
  );
}
