import { describe, expect, it } from 'vitest';
import type { SimulationParameters, SimulationState } from '../shared/types';
import { REFERENCE_CONDITIONS } from '../shared/types';
import { createEngine, createHelmetEngine, DEFAULT_PARAMETERS, MOL_PER_REF_L, PARAMETER_BOUNDS, R_J_PER_MOL_K, molPerSToRefLpm, refLpmToMolPerS, solvePressurePaAbs } from './index';

const R = R_J_PER_MOL_K;
const T = 293.15;
const PA = 100_000;

function params(overrides: (p: SimulationParameters) => void): SimulationParameters {
  const p = structuredClone(DEFAULT_PARAMETERS) as SimulationParameters;
  overrides(p);
  return p;
}

/** No patient, no flow, rigid unless stated, relief far away. */
const quiet = (extra: (p: SimulationParameters) => void = () => {}) =>
  params((p) => {
    p.patient = null;
    p.supply.inletFlowSetpointRefLpm = 0;
    p.outlets.maintenanceFlowSetpointRefLpm = 0;
    p.outlets.overflowThresholdPaAbs = 1.9 * PA;
    extra(p);
  });

const total = (s: SimulationState) => s.helmet.moles.o2Mol + s.helmet.moles.co2Mol + s.helmet.moles.inertMol;

function runSampling(p: SimulationParameters, durationS: number, sampleEveryS: number) {
  const e = createHelmetEngine(p);
  const samples: SimulationState[] = [e.getState()];
  for (let t = 0; t < durationS - 1e-9; t += sampleEveryS) samples.push(e.advance(sampleEveryS));
  return { engine: e, samples };
}

describe('units and gas law', () => {
  it('reference L/min converts to mol/s with the ideal gas law at 1.0 bar abs, 293.15 K', () => {
    const expected = (30 / 60_000) * REFERENCE_CONDITIONS.pressurePaAbs / (R * REFERENCE_CONDITIONS.temperatureK);
    expect(refLpmToMolPerS(30)).toBeCloseTo(expected, 15);
    expect(molPerSToRefLpm(refLpmToMolPerS(37.5))).toBeCloseTo(37.5, 12);
    expect(MOL_PER_REF_L).toBeCloseTo(1e5 * 1e-3 / (R * 293.15), 15);
    const s = createEngine(quiet((p) => (p.supply.inletFlowSetpointRefLpm = 30))).advance(0.5);
    expect(s.flows.inletMolPerS).toBeCloseTo(expected, 15);
    expect(s.flows.inletDeliveredRefLpm).toBeCloseTo(30, 10);
  });

  it('pressure solver returns the positive root of P*V(P)=nRT and reduces to nRT/V when rigid', () => {
    const n = 0.7;
    expect(solvePressurePaAbs(n, T, 0.012, 0, PA)).toBeCloseTo((n * R * T) / 0.012, 8);
    const C = 2e-8;
    const P = solvePressurePaAbs(n, T, 0.012, C, PA);
    expect(P).toBeGreaterThan(0);
    expect((P * (0.012 + C * (P - PA))) / (n * R * T)).toBeCloseTo(1, 12);
  });

  it('sealed helmet with no breathing and no flow keeps inventories and pressure constant', () => {
    const e = createEngine(quiet());
    const s0 = e.getState();
    const s1 = e.advance(120);
    expect(s1.status.kind).toBe('ok');
    expect(s1.helmet.moles).toEqual(s0.helmet.moles);
    expect(s1.helmet.pressurePaAbs).toBe(s0.helmet.pressurePaAbs);
    expect(s0.helmet.pressurePaAbs).toBeCloseTo(PA, 6);
    expect(s0.helmet.fractions.o2Frac).toBeCloseTo(0.2095, 12);
  });

  it('fixed-volume closed inflow follows P = nRT/V with n growing at the inlet molar rate', () => {
    const p = quiet((q) => {
      q.helmet.complianceM3PerPa = 0;
      q.supply.inletFlowSetpointRefLpm = 5;
      q.supply.regulatorOutletPressurePaAbs = 2.5 * PA;
    });
    const e = createEngine(p);
    const n0 = total(e.getState());
    for (let i = 1; i <= 6; i++) {
      const s = e.advance(10);
      expect(s.status.kind).toBe('ok');
      const n = n0 + refLpmToMolPerS(5) * 10 * i;
      expect(total(s) / n).toBeCloseTo(1, 10);
      expect(s.helmet.pressurePaAbs / ((n * R * T) / 0.012)).toBeCloseTo(1, 10);
      expect(s.helmet.volumeM3).toBe(0.012);
    }
  });

  it('compliant hood satisfies P*V(P) = nRT with V = V0 + C(P - Pa)', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 20;
      q.supply.regulatorOutletPressurePaAbs = 2.5 * PA;
    });
    const e = createEngine(p);
    for (let i = 0; i < 5; i++) {
      const s = e.advance(12);
      const { pressurePaAbs: P, volumeM3: V } = s.helmet;
      expect(V).toBeCloseTo(0.012 + p.helmet.complianceM3PerPa * (P - PA), 15);
      expect((P * V) / (total(s) * R * T)).toBeCloseTo(1, 12);
    }
    expect(e.getState().helmet.volumeM3).toBeGreaterThan(0.012);
  });
});

describe('analytical washout', () => {
  it('pure O2 flush at constant pressure/volume with balanced molar flows matches x(t) = xin + (x0 - xin) exp(-ndot t / n)', () => {
    const flush = (dt: number) => {
      const p = quiet((q) => {
        q.helmet.complianceM3PerPa = 0;
        q.supply.inletFlowSetpointRefLpm = 30;
        q.outlets.maintenanceFlowSetpointRefLpm = 30;
        q.numerics.baseTimeStepS = dt;
      });
      const e = createEngine(p);
      const n = total(e.getState());
      const ndot = refLpmToMolPerS(30);
      let maxErr = 0;
      for (let i = 1; i <= 12; i++) {
        const s = e.advance(10);
        const decay = Math.exp((-ndot * 10 * i) / n);
        expect(total(s) / n).toBeCloseTo(1, 10);
        expect(s.helmet.pressurePaAbs / PA).toBeCloseTo(1, 10);
        expect(s.flows.maintenanceDeliveredRefLpm).toBeCloseTo(30, 8);
        expect(s.helmet.fractions.co2Frac).toBeCloseTo(0.0004 * decay, 7);
        maxErr = Math.max(maxErr, Math.abs(s.helmet.fractions.o2Frac - (1 + (0.2095 - 1) * decay)));
      }
      return maxErr;
    };
    const e1 = flush(0.01);
    const e2 = flush(0.005);
    expect(e1).toBeLessThan(1e-4);
    // explicit first-order transport: halving the step halves the error
    expect(e1 / e2).toBeGreaterThan(1.8);
    expect(e1 / e2).toBeLessThan(2.2);
  });
});

describe('breathing', () => {
  it('helmet + breath reservoir obey species balance with metabolism', () => {
    const e = createHelmetEngine(DEFAULT_PARAMETERS);
    for (let i = 0; i < 90; i++) {
      e.advance(1.37);
      const a = e.getAudit();
      const scale = a.helmet.o2Mol + a.helmet.inertMol;
      expect(Math.abs(a.balanceResidual.o2Mol) / scale).toBeLessThan(1e-12);
      expect(Math.abs(a.balanceResidual.co2Mol) / scale).toBeLessThan(1e-12);
      expect(Math.abs(a.balanceResidual.inertMol) / scale).toBeLessThan(1e-12);
      expect(Math.min(a.reservoir.o2Mol, a.reservoir.co2Mol, a.reservoir.inertMol)).toBeGreaterThanOrEqual(-1e-15);
    }
  });

  it('inspiration removes one tidal volume per breath and metabolism matches configured rates', () => {
    const p = params((q) => {
      q.helmet.complianceM3PerPa = 0;
    });
    const e = createHelmetEngine(p);
    let inhaledVolume = 0;
    let s = e.getState();
    // integrate airway volume during the first inspiration (1.6667 s) with fine sampling
    for (let i = 0; i < 5000; i++) {
      s = e.advance(1 / 3000);
      if (s.breath!.airwayFlowM3PerS > 0) inhaledVolume += s.breath!.airwayFlowM3PerS / 3000;
    }
    expect(inhaledVolume / 0.5e-3).toBeCloseTo(1, 3);
    s = e.advance(60 - s.timeS); // exactly 12 breaths at 12/min
    expect(s.breath!.completedBreaths).toBe(12);
    expect(s.cumulative.metabolicO2UptakeMol).toBeCloseTo(refLpmToMolPerS(0.25) * 60, 12);
    expect(s.cumulative.metabolicCo2ProductionMol).toBeCloseTo(refLpmToMolPerS(0.2) * 60, 12);
    expect(e.getAudit().reservoir.o2Mol).toBeCloseTo(0, 12);
    expect(s.breath!.lastInspiredCo2Frac).not.toBeNull();
    expect(s.breath!.lastInspiredO2Frac).not.toBeNull();
  });

  it('reports "awaiting first breath" (null) before the first inspiration completes, and breath-weighted values after', () => {
    const e = createEngine(DEFAULT_PARAMETERS);
    expect(e.advance(1).breath!.lastInspiredCo2Frac).toBeNull();
    const s = e.advance(1);
    expect(s.breath!.phase).toBe('expiration');
    expect(s.breath!.lastInspiredCo2Frac!).toBeGreaterThan(0);
    expect(s.breath!.lastInspiredCo2Frac!).toBeLessThan(0.0004);
    expect(s.breath!.airwayFlowM3PerS).toBeLessThan(0);
  });

  it('flags invalid instead of creating O2 when captured O2 cannot supply uptake', () => {
    const p = params((q) => {
      q.patient!.tidalVolumeM3 = 0.1e-3;
      q.patient!.o2ConsumptionRefLpm = 1;
      q.ambient.composition = { o2Frac: 0.05, co2Frac: 0.0004, inertFrac: 0.9496 };
      q.supply.inletFlowSetpointRefLpm = 0;
      q.outlets.maintenanceFlowSetpointRefLpm = 0;
      q.helmet.complianceM3PerPa = 0;
    });
    const e = createEngine(p);
    const s = e.advance(10);
    expect(s.status.kind).not.toBe('ok');
  });
});

describe('overflow valve', () => {
  it('stays closed and discharges nothing below threshold', () => {
    const p = params((q) => (q.outlets.overflowThresholdPaAbs = 1.9 * PA));
    const { samples } = runSampling(p, 120, 0.25);
    expect(samples.every((s) => !s.overflow.isOpen && s.flows.overflowRefLpm === 0)).toBe(true);
    const last = samples[samples.length - 1];
    expect(last.helmet.pressurePaAbs).toBeLessThan(1.9 * PA);
    expect(last.status.kind).toBe('ok');
  });

  it('opens at threshold with finite discharge; sufficient capacity holds pressure near threshold by chattering, not clamping', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 30;
      q.supply.regulatorOutletPressurePaAbs = 2.5 * PA;
      q.outlets.overflowThresholdPaAbs = 1.2 * PA;
      q.outlets.overflowOpenCapacityRefLpm = 100;
    });
    const { engine, samples } = runSampling(p, 240, 0.05);
    for (const s of samples) expect(s.flows.overflowRefLpm).toBeLessThanOrEqual(100 + 1e-9);
    const late = samples.filter((s) => s.timeS > 150);
    const maxP = Math.max(...late.map((s) => s.helmet.pressurePaAbs));
    const minP = Math.min(...late.map((s) => s.helmet.pressurePaAbs));
    expect(maxP).toBeGreaterThan(1.2 * PA); // not clamped at the threshold
    expect(maxP - 1.2 * PA).toBeLessThan(100);
    expect(1.2 * PA - minP).toBeLessThan(100);
    const s = engine.getState();
    expect(s.overflow.recentDutyCycleFrac).toBeCloseTo(0.3, 2); // inflow / capacity in molar terms
    const window = late.filter((x) => x.timeS >= 190);
    const vented = (window[window.length - 1].cumulative.ventedMoles.o2Mol + window[window.length - 1].cumulative.ventedMoles.inertMol + window[window.length - 1].cumulative.ventedMoles.co2Mol) - (window[0].cumulative.ventedMoles.o2Mol + window[0].cumulative.ventedMoles.inertMol + window[0].cumulative.ventedMoles.co2Mol);
    const dt = window[window.length - 1].timeS - window[0].timeS;
    expect(vented / dt / refLpmToMolPerS(30)).toBeCloseTo(1, 2);
  });

  it('insufficient relief capacity lets pressure keep rising above threshold', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 30;
      q.supply.regulatorOutletPressurePaAbs = 1.9 * PA;
      q.outlets.overflowThresholdPaAbs = 1.2 * PA;
      q.outlets.overflowOpenCapacityRefLpm = 10;
    });
    const e = createEngine(p);
    const s1 = e.advance(60);
    const s2 = e.advance(30);
    expect(s1.helmet.pressurePaAbs).toBeGreaterThan(1.25 * PA);
    expect(s2.helmet.pressurePaAbs).toBeGreaterThan(s1.helmet.pressurePaAbs);
    expect(s2.overflow.isOpen).toBe(true);
    expect(s2.flows.overflowRefLpm).toBeCloseTo(10, 8);
    expect(s2.overflow.recentDutyCycleFrac).toBe(1);
  });

  it('reports outside-domain rather than clamping when pressure would exceed the model maximum', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 60;
      q.supply.regulatorOutletPressurePaAbs = 2.9 * PA;
      q.helmet.maxPressurePaAbs = 1.4 * PA;
      q.outlets.overflowThresholdPaAbs = 1.3 * PA;
      q.outlets.overflowOpenCapacityRefLpm = 5;
    });
    const s = createEngine(p).advance(120);
    expect(s.status.kind).toBe('outside-domain');
    expect(s.helmet.pressurePaAbs).toBeLessThanOrEqual(1.4 * PA);
    expect(s.timeS).toBeLessThan(120);
  });
});

describe('supply', () => {
  it('blocked supply (regulator below helmet pressure) cannot backflow', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 30;
      q.supply.regulatorOutletPressurePaAbs = 1.9 * PA;
    });
    const e = createEngine(p);
    e.advance(40);
    const before = e.getState();
    expect(before.helmet.pressurePaAbs).toBeGreaterThan(1.1 * PA);
    const ev = e.updateLiveParameters({ regulatorOutletPressurePaAbs: 1.0 * PA });
    expect(ev.timeS).toBe(40);
    expect(ev.label).toContain('Regulator');
    for (let i = 0; i < 100; i++) {
      const s = e.advance(0.2);
      expect(s.flows.inletMolPerS).toBe(0);
      expect(s.cumulative.o2FromSourceMol).toBe(before.cumulative.o2FromSourceMol);
      expect(total(s)).toBe(total(before));
    }
  });

  it('inlet tapers linearly within the controller headroom', () => {
    const p = quiet((q) => {
      q.supply.inletFlowSetpointRefLpm = 30;
      q.supply.regulatorOutletPressurePaAbs = 1.5 * PA;
    });
    const s = createEngine(p).advance(200);
    const expected = 30 * Math.min(1, Math.max(0, (1.5 * PA - s.helmet.pressurePaAbs) / (0.1 * PA)));
    expect(s.flows.inletDeliveredRefLpm).toBeCloseTo(expected, 1);
    expect(s.helmet.pressurePaAbs).toBeLessThan(1.5 * PA);
  });

  it('reports outside-domain (hood collapse) when inhalation exceeds supply', () => {
    const p = params((q) => (q.supply.inletFlowSetpointRefLpm = 5));
    const s = createEngine(p).advance(10);
    expect(s.status.kind).toBe('outside-domain');
    expect(s.helmet.pressurePaAbs).toBeGreaterThanOrEqual(PA * (1 - 1e-9));
  });
});

describe('determinism, snapshots and parameters', () => {
  it('reset is deterministic', () => {
    const e = createEngine(DEFAULT_PARAMETERS);
    const a = JSON.stringify(e.advance(75));
    e.updateLiveParameters({ inletFlowSetpointRefLpm: 45 });
    e.advance(10);
    e.reset(DEFAULT_PARAMETERS);
    expect(e.getState().timeS).toBe(0);
    expect(JSON.stringify(e.advance(75))).toBe(a);
    expect(JSON.stringify(createEngine(DEFAULT_PARAMETERS).advance(75))).toBe(a);
  });

  it('returned snapshots are frozen and never mutated by later steps', () => {
    const e = createEngine(DEFAULT_PARAMETERS);
    const s1 = e.advance(5);
    const copy = JSON.stringify(s1);
    e.advance(20);
    e.updateLiveParameters({ maintenanceFlowSetpointRefLpm: 10 });
    e.advance(5);
    expect(JSON.stringify(s1)).toBe(copy);
    expect(Object.isFrozen(s1) && Object.isFrozen(s1.helmet.moles)).toBe(true);
    expect(e.getState()).toBe(e.getState());
  });

  it('does not mutate caller parameters and exposes live changes', () => {
    const p = structuredClone(DEFAULT_PARAMETERS) as SimulationParameters;
    const e = createEngine(p);
    e.updateLiveParameters({ overflowThresholdPaAbs: 1.4 * PA, overflowOpenCapacityRefLpm: 50 });
    expect(p.outlets.overflowThresholdPaAbs).toBe(1.5 * PA);
    expect(e.parameters.outlets.overflowThresholdPaAbs).toBe(1.4 * PA);
    expect(e.parameters.outlets.overflowOpenCapacityRefLpm).toBe(50);
  });

  it('invalid parameters are reported via status and do not advance', () => {
    const e = createEngine(params((q) => (q.outlets.overflowThresholdPaAbs = 0.9 * PA)));
    expect(e.getState().status.kind).toBe('invalid');
    expect(e.advance(1).timeS).toBe(0);
    const e2 = createEngine(DEFAULT_PARAMETERS);
    e2.updateLiveParameters({ regulatorOutletPressurePaAbs: 300 * PA });
    expect(e2.getState().status.kind).toBe('invalid');
  });

  it('defaults lie within PARAMETER_BOUNDS', () => {
    for (const [group, fields] of Object.entries(PARAMETER_BOUNDS)) {
      for (const [field, b] of Object.entries(fields)) {
        const v = (DEFAULT_PARAMETERS as unknown as Record<string, Record<string, number>>)[group][field];
        expect(v, `${group}.${field}`).toBeGreaterThanOrEqual(b.min);
        expect(v, `${group}.${field}`).toBeLessThanOrEqual(b.max);
      }
    }
  });
});

describe('timestep convergence across threshold crossings', () => {
  it('halving the base step gives close pressure, fractions, discharge and duty cycle', () => {
    const run = (dt: number) => {
      const e = createEngine(params((q) => (q.numerics.baseTimeStepS = dt)));
      return e.advance(150);
    };
    const a = run(0.01);
    const b = run(0.005);
    expect(a.status.kind).toBe('ok');
    expect(b.status.kind).toBe('ok');
    expect(Math.abs(a.helmet.pressurePaAbs - b.helmet.pressurePaAbs)).toBeLessThan(60);
    expect(Math.abs(a.helmet.fractions.o2Frac - b.helmet.fractions.o2Frac)).toBeLessThan(2e-4);
    expect(Math.abs(a.helmet.fractions.co2Frac - b.helmet.fractions.co2Frac)).toBeLessThan(2e-5);
    const va = a.cumulative.ventedMoles.o2Mol + a.cumulative.ventedMoles.inertMol + a.cumulative.ventedMoles.co2Mol;
    const vb = b.cumulative.ventedMoles.o2Mol + b.cumulative.ventedMoles.inertMol + b.cumulative.ventedMoles.co2Mol;
    expect(Math.abs(va - vb) / va).toBeLessThan(2e-3);
    expect(Math.abs(a.overflow.recentDutyCycleFrac - b.overflow.recentDutyCycleFrac)).toBeLessThan(0.02);
  });
});

describe('full default run', () => {
  it('runs 300 s with default parameters without leaving the model domain', () => {
    const e = createHelmetEngine(DEFAULT_PARAMETERS);
    let firstOpen: number | null = null;
    let peakP = 0;
    let peakCo2 = 0;
    const inspired: number[] = [];
    let lastBreaths = 0;
    while (e.getState().timeS < 300 - 1e-9 && e.getState().status.kind === 'ok') {
      const s = e.advance(0.05);
      if (s.overflow.isOpen && firstOpen === null) firstOpen = s.timeS;
      peakP = Math.max(peakP, s.helmet.pressurePaAbs);
      peakCo2 = Math.max(peakCo2, s.helmet.fractions.co2Frac);
      if (s.breath!.completedBreaths !== lastBreaths) {
        lastBreaths = s.breath!.completedBreaths;
        inspired.push(s.breath!.lastInspiredCo2Frac!);
      }
    }
    const s = e.getState();
    const a = e.getAudit();
    const summary = {
      status: s.status,
      timeS: s.timeS,
      pressureBarAbs: s.helmet.pressurePaAbs / PA,
      peakPressureBarAbs: peakP / PA,
      o2Frac: s.helmet.fractions.o2Frac,
      co2Frac: s.helmet.fractions.co2Frac,
      peakCo2Frac: peakCo2,
      lastInspiredCo2Frac: s.breath!.lastInspiredCo2Frac,
      lastInspiredO2Frac: s.breath!.lastInspiredO2Frac,
      completedBreaths: s.breath!.completedBreaths,
      firstOverflowOpenS: firstOpen,
      dutyCycleFrac: s.overflow.recentDutyCycleFrac,
      o2FromSourceRefL: s.cumulative.o2FromSourceRefL,
      maintenanceDeliveredRefLpm: s.flows.maintenanceDeliveredRefLpm,
      substeps: a.substeps,
      maxBalanceResidualMol: Math.max(...Object.values(a.balanceResidual).map(Math.abs)),
    };
    console.log('DEFAULT_RUN', JSON.stringify(summary));
    expect(s.status.kind).toBe('ok');
    expect(s.timeS).toBeCloseTo(300, 9);
    expect(s.breath!.completedBreaths).toBe(60);
    expect(summary.maxBalanceResidualMol).toBeLessThan(1e-12);
  });
});
