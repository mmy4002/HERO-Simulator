# Scene appearance reference — figure 3b

`figure-3b.png` is the **selected appearance reference** for the HEROES 3D scene.
It supersedes all earlier generated visual drafts. Earlier image-edit requests or draft images must not override it.

## Match these elements

- **Human:** recognizable adult man, seated upright, calm neutral expression, short dark hair, grey crew-neck T-shirt, seen from a three-quarter front view.
- **Hood silhouette:** tall rounded dome over the head, with soft, near-cylindrical sides that narrow slightly into the collar. It is large enough to clear the head on all sides.
- **Transparent flexible material:** clear inflated film with faint seams, creases and specular highlights. It looks soft and pliable, not like a rigid shell, glass bowl or hard collar. The face stays clearly visible through it.
- **Neck seal:** frosted, translucent, silicone-like band that closes snugly around the neck, forming a soft ring at the base of the hood.
- **Three ports** on the lower hood, just above the neck seal:
  - one **inlet** port on the front/side facing the cylinder, where the supply hose attaches;
  - **two outlet** ports side by side on the opposite, rear side (maintenance outlet and pressure-triggered overflow outlet, labelled in the scene per `PARALLEL_TASKS.md`).
  - They are metallic/grey cylindrical fittings set into clear collars.
- **External cylinder and hose arrangement:** a green oxygen cylinder stands outside the hood. A regulator with a round pressure gauge and a black valve knob sits on top. A clear flexible hose runs in a smooth curve from the regulator down to the inlet port.

## How to use this reference

- **Revised direction (supersedes the earlier "reference only / no image in app" rule):** this exact image is now the
  default displayed presentation (`src/scene/image/ImageScene.tsx`), shown unmodified at its original aspect ratio with
  simulation-driven SVG overlays anchored in its pixel coordinates (`src/scene/image/anchors.ts`). The person, face,
  hood, seal and equipment must not be warped or edited.
- The procedural interactive 3D scene (`src/scene/Scene3D.tsx`) remains available as an optional secondary view.
- It specifies **appearance only**. It is **not** a source of physical dimensions, volumes, pressures, flow rates or any other simulation parameters. Those come from `src/shared/types.ts` and the engine.
