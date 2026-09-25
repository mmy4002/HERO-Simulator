import { describe, expect, it } from 'vitest';
import { HOSE_PATH, IMAGE_HEIGHT, IMAGE_WIDTH, LABELS, MOUTH } from './anchors';
import { pointAt, polyline, streamParticles } from './particles';

const hose = polyline(HOSE_PATH);
const opts = { count: 30, transitS: 2, radius: 4, spread: 2 };

describe('image overlay particles', () => {
  it('starts at the regulator end and ends at the inlet end of the hose', () => {
    expect(pointAt(hose, 0)).toMatchObject({ x: HOSE_PATH[0][0], y: HOSE_PATH[0][1] });
    const end = HOSE_PATH[HOSE_PATH.length - 1];
    expect(pointAt(hose, 1).x).toBeCloseTo(end[0]);
    expect(pointAt(hose, 1).y).toBeCloseTo(end[1]);
  });

  it('is a pure function of simulation time: same time, same positions (pause); t=0 restores (reset)', () => {
    expect(streamParticles(hose, 3.7, 0.8, opts)).toEqual(streamParticles(hose, 3.7, 0.8, opts));
    expect(streamParticles(hose, 0, 0.8, opts)).toEqual(streamParticles(hose, 0, 0.8, opts));
    expect(streamParticles(hose, 1.1, 0.8, opts)).not.toEqual(streamParticles(hose, 0, 0.8, opts));
  });

  it('emits nothing without flow and more particles with more activity', () => {
    expect(streamParticles(hose, 1, 0, opts)).toEqual([]);
    expect(streamParticles(hose, Number.NaN, 1, opts)).toEqual([]);
    expect(streamParticles(hose, 1, 1, opts).length).toBeGreaterThan(streamParticles(hose, 1, 0.3, opts).length);
  });

  it('keeps particles close to the photographed hose', () => {
    for (const p of streamParticles(hose, 0.4, 1, opts)) {
      const d = Math.min(...HOSE_PATH.map(([x, y]) => Math.hypot(p.x - x, p.y - y)));
      expect(d).toBeLessThan(40);
    }
  });

  it('keeps labels inside the image and away from the face', () => {
    for (const l of LABELS) {
      expect(l.at[0]).toBeGreaterThanOrEqual(0);
      expect(l.at[1]).toBeGreaterThanOrEqual(0);
      expect(l.at[0]).toBeLessThan(IMAGE_WIDTH - 100);
      expect(l.at[1]).toBeLessThan(IMAGE_HEIGHT - 30);
      expect(Math.hypot(l.at[0] - MOUTH[0], l.at[1] - MOUTH[1])).toBeGreaterThan(200);
    }
  });
});
