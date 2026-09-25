import type { SceneFrame } from '../shared/types';
import HelmetScene from '../scene/HelmetScene';

export default function ScenePanel({ frame }: { frame: SceneFrame | null }) {
  return (
    <section className="panel scene" aria-labelledby="scene-title">
      <h2 id="scene-title" className="panel-title">Helmet view</h2>
      <HelmetScene frame={frame} showLabels />
    </section>
  );
}
