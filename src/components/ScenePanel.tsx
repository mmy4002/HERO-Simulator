import HelmetScene from '../scene/HelmetScene';

export default function ScenePanel() {
  return (
    <section className="panel scene" aria-labelledby="scene-title">
      <h2 id="scene-title" className="panel-title">Helmet view</h2>
      <HelmetScene frame={null} />
    </section>
  );
}
