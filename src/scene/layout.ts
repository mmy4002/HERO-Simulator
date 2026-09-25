import { CatmullRomCurve3, Vector3 } from 'three';

/** Scene layout in arbitrary display units (~1 unit ≈ 10 cm). Appearance only, not physical dimensions. */

/** Hood silhouette profile [radius, y] for the lathe, bottom (collar) to top. */
const HOOD_PROFILE_RAW: [number, number][] = [
  [1.16, -1.35], [1.3, -1.22], [1.42, -1.02], [1.52, -0.72], [1.58, -0.25], [1.6, 0.35],
  [1.59, 0.95], [1.53, 1.45], [1.38, 1.88], [1.1, 2.2], [0.7, 2.4], [0.3, 2.47], [0.0, 2.48],
];
export const HOOD_BASE_Y = -1.35;
export const HOOD_PROFILE: [number, number][] = HOOD_PROFILE_RAW.map(([r, y]) => [r * 0.9, HOOD_BASE_Y + (y - HOOD_BASE_Y) * 0.84]);

export const PORT_Y = -0.98;
export const PORT_SURFACE_R = 1.31;

/** Angle about +y measured from +z (the face direction) towards +x. */
export const INLET_ANGLE = (58 * Math.PI) / 180;
export const MAINTENANCE_ANGLE = (-98 * Math.PI) / 180;
export const OVERFLOW_ANGLE = (-124 * Math.PI) / 180;

export const radial = (angle: number, r: number, y = PORT_Y) => new Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r);

export const CYLINDER_POS = new Vector3(3.7, 0, 1.05);
export const CYLINDER_RADIUS = 0.5;
export const CYLINDER_BODY_TOP_Y = -1.35;
export const CYLINDER_BOTTOM_Y = -5.2;
export const REGULATOR_Y = -0.42;
export const REGULATOR_OUTLET = new Vector3(CYLINDER_POS.x - 0.5, REGULATOR_Y, CYLINDER_POS.z + 0.05);

export const INLET_OUTER = radial(INLET_ANGLE, 1.62);
export const INLET_INNER = radial(INLET_ANGLE, 1.15);

export const HOSE_CURVE = new CatmullRomCurve3([
  REGULATOR_OUTLET,
  new Vector3(REGULATOR_OUTLET.x - 0.35, REGULATOR_Y - 0.1, REGULATOR_OUTLET.z + 0.05),
  new Vector3(2.55, -1.55, 1.25),
  new Vector3(2.05, -1.55, 1.2),
  radial(INLET_ANGLE, 1.9, PORT_Y - 0.12),
  INLET_OUTER,
]);

/** Illustrative gas path inside the hood: inlet → across the face → over the head → rear outlets. */
export const HOOD_FLOW_CURVE = new CatmullRomCurve3([
  INLET_INNER,
  new Vector3(0.65, -0.55, 1.05),
  new Vector3(0.15, 0.2, 1.2),
  new Vector3(-0.35, 1.3, 0.7),
  new Vector3(-0.95, 1.15, -0.3),
  new Vector3(-1.1, 0.1, -0.45),
  radial((MAINTENANCE_ANGLE + OVERFLOW_ANGLE) / 2, 1.12),
]);

export const outletCurve = (angle: number) =>
  new CatmullRomCurve3([radial(angle, 1.15), radial(angle, 1.65), radial(angle + 0.05, 2.25, PORT_Y + 0.12), radial(angle + 0.1, 2.85, PORT_Y + 0.35)]);

export const BREATH_CURVE = new CatmullRomCurve3([
  new Vector3(0.17, -0.47, 0.93),
  new Vector3(0.21, -0.56, 1.08),
  new Vector3(0.25, -0.68, 1.2),
]);

export const CAMERA_POSITION: [number, number, number] = [-3.9, 0.55, 10.2];
export const CAMERA_TARGET: [number, number, number] = [1.15, -0.85, 0.3];
