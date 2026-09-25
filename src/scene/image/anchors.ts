/**
 * Anchor points measured on src/scene/reference/figure-3b.png, in the image's native pixel
 * coordinates. The overlay SVG uses the same viewBox, so these stay aligned at any size.
 */
export const IMAGE_WIDTH = 1470;
export const IMAGE_HEIGHT = 1070;

export type Pt = readonly [number, number];

/** Clear hose, from the regulator barb down and round to the inlet fitting on the hood. */
export const HOSE_PATH: Pt[] = [
  [1240, 547], [1226, 553], [1214, 566], [1204, 586], [1193, 614], [1180, 648], [1164, 682],
  [1142, 712], [1114, 736], [1078, 753], [1034, 763], [988, 766], [944, 758], [902, 738],
  [864, 712], [830, 686], [803, 664], [784, 648], [770, 636],
];

/** Short entry jet just inside the inlet port (illustrative direction only). */
export const INLET_JET_PATH: Pt[] = [[752, 624], [728, 612], [700, 598], [672, 582]];

export const INLET_PORT: Pt = [756, 626];
export const OVERFLOW_PORT: Pt = [172, 604];
export const MAINTENANCE_PORT: Pt = [248, 612];

/** Vent plumes leaving each photographed outlet valve. */
export const OVERFLOW_PATH: Pt[] = [[160, 602], [128, 594], [92, 584], [52, 572], [14, 560]];
export const MAINTENANCE_PATH: Pt[] = [[238, 624], [222, 648], [200, 676], [172, 704], [140, 732]];

export const MOUTH: Pt = [584, 511];
/** Airflow path in front of the mouth; exhalation runs outward, inhalation runs inward. */
export const BREATH_PATH: Pt[] = [[596, 513], [626, 522], [656, 534], [686, 548]];

export const REGULATOR_ANCHOR: Pt = [1262, 540];
export const CYLINDER_ANCHOR: Pt = [1352, 820];

export interface LabelSpec {
  id: string;
  text: string;
  /** Label box position (top-left). */
  at: Pt;
  /** Leader line target; null for no leader. */
  target: Pt | null;
  tone: 'supply' | 'outlet' | 'overflow' | 'device';
}

/** Labels are placed away from the face, with leader lines to the photographed parts. */
export const LABELS: LabelSpec[] = [
  { id: 'overflow', text: 'Overflow outlet', at: [22, 486], target: [168, 592], tone: 'overflow' },
  { id: 'maintenance', text: 'Maintenance outlet', at: [22, 790], target: [246, 628], tone: 'outlet' },
  { id: 'inlet', text: 'O₂ inlet', at: [822, 568], target: [764, 622], tone: 'supply' },
  { id: 'regulator', text: 'Regulator', at: [1000, 410], target: [1292, 530], tone: 'device' },
  { id: 'cylinder', text: 'O₂ cylinder', at: [1244, 880], target: null, tone: 'device' },
];
