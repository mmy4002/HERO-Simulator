import type { HelmetSceneProps } from '../shared/types';

export default function HelmetScene({ frame }: HelmetSceneProps) {
  return (
    <div className="scene-viewport" data-has-frame={frame !== null}>
      <div className="empty-state">
        <p className="empty-title">3D scene</p>
        <p className="empty-text">Head, helmet, neck seal, cylinder, regulator, inlet and outlets will appear here.</p>
      </div>
    </div>
  );
}
