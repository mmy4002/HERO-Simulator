import type {
  BreathPhase,
  CreateEngine,
  GasMoles,
  ModelStatus,
  SimulationEngine,
  SimulationEvent,
  SimulationParameters,
  SimulationState,
} from '../shared/types';
import {
  R_J_PER_MOL_K,
  ZERO_MOLES,
  addMoles,
  fractionsOf,
  hoodVolumeM3,
  molPerSToRefLpm,
  molToRefL,
  molesAtPressure,
  refLpmToMolPerS,
  scaleFractions,
  solvePressurePaAbs,
  totalMoles,
} from './gas';
import { cloneParameters, validateParameters } from './parameters';

/**
 * Well-mixed lumped helmet gas model (not CFD, not a physiological model).
 *
 * State: helmet moles of O2, CO2, inert; breath reservoir moles; breath phase clock.
 * Pressure: positive root of P * V(P) = n R T, V(P) = V0 + C (P - Pa).
 * Boundaries (explicit, conservative substeps; species vented at current helmet fractions):
 *   inlet       q = q_set * clamp((P_reg - P) / dp, 0, 1)          (never negative)
 *   maintenance ideal constant q_maint while P > Pa; it cannot pull the helmet below
 *               ambient, so delivered = min(q_maint, flow that keeps n >= n(Pa)).
 *   overflow    open iff P >= threshold (zero hysteresis) with finite capacity; no clamping.
 * Breathing: sinusoidal inspiration removes helmet mixture into a reservoir (integral = Vt
 * actual at helmet P); at expiration start per-breath O2 uptake is subtracted and CO2
 * production added; the reservoir is returned with a sinusoidal profile over expiration.
 */

/** Duty-cycle averaging window. */
export const DUTY_CYCLE_WINDOW_S = 10;
/** Maximum helmet pressure change per substep = this rate * baseTimeStepS (25 Pa at 0.01 s). */
const MAX_DP_RATE_PA_PER_S = 2500;
/** Smallest substep before the engine reports a numerical failure. */
const MIN_SUBSTEP_S = 1e-7;
/** Absolute pressure tolerance for threshold comparisons (float round-off only). */
const PRESSURE_TOL_PA = 1e-6;
/** Relative tolerance for the ambient collapse check (float round-off only). */
const COLLAPSE_REL_TOL = 1e-9;
const PHASE_EPS_S = 1e-9;

interface StepPlan {
  h: number;
  pressure: number;
  overflowOpen: boolean;
  inletRequestedMol: number;
  inlet: GasMoles;
  maintenanceMol: number;
  overflowMol: number;
  vented: GasMoles;
  inhaled: GasMoles;
  inhaledVolumeM3: number;
  exhaled: GasMoles;
  helmetAfter: GasMoles;
}

export interface EngineAudit {
  helmet: GasMoles;
  reservoir: GasMoles;
  inletMoles: GasMoles;
  /** Species balance residual: (helmet + reservoir) - (initial + in - vented - uptake + production). */
  balanceResidual: GasMoles;
  substeps: number;
}

export interface HelmetEngine extends SimulationEngine {
  getAudit(): EngineAudit;
}

type LiveChanges = Parameters<SimulationEngine['updateLiveParameters']>[0];

const LIVE_LABELS: Record<keyof LiveChanges, [string, (v: number) => string]> = {
  regulatorOutletPressurePaAbs: ['Regulator outlet', (v) => `${(v / 1e5).toFixed(3)} bar abs`],
  inletFlowSetpointRefLpm: ['Inlet flow', (v) => `${v} ref L/min`],
  maintenanceFlowSetpointRefLpm: ['Maintenance flow', (v) => `${v} ref L/min`],
  overflowThresholdPaAbs: ['Overflow threshold', (v) => `${(v / 1e5).toFixed(3)} bar abs`],
  overflowOpenCapacityRefLpm: ['Overflow capacity', (v) => `${v} ref L/min`],
};

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    for (const v of Object.values(o)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}

class Engine implements HelmetEngine {
  private p!: SimulationParameters;
  private t = 0;
  private helmet: GasMoles = ZERO_MOLES;
  private helmet0: GasMoles = ZERO_MOLES;
  private reservoir: GasMoles = ZERO_MOLES;
  private returnInventory: GasMoles = ZERO_MOLES;
  private phase: BreathPhase = 'inspiration';
  private phaseT = 0;
  private completedBreaths = 0;
  private inspiredAccum: GasMoles = ZERO_MOLES;
  private lastInspiredCo2: number | null = null;
  private lastInspiredO2: number | null = null;
  private inletMoles: GasMoles = ZERO_MOLES;
  private vented: GasMoles = ZERO_MOLES;
  private uptakeMol = 0;
  private productionMol = 0;
  private openIntervals: [number, number][] = [];
  private last: StepPlan | null = null;
  private status: ModelStatus = { kind: 'ok' };
  private substeps = 0;
  private snapshot: Readonly<SimulationState> | null = null;

  constructor(parameters: SimulationParameters) {
    this.reset(parameters);
  }

  get parameters(): Readonly<SimulationParameters> {
    return this.p;
  }

  reset(parameters?: SimulationParameters): Readonly<SimulationState> {
    this.p = deepFreeze(cloneParameters(parameters ?? this.p));
    const { ambient, helmet } = this.p;
    this.t = 0;
    this.phase = 'inspiration';
    this.phaseT = 0;
    this.completedBreaths = 0;
    this.reservoir = ZERO_MOLES;
    this.returnInventory = ZERO_MOLES;
    this.inspiredAccum = ZERO_MOLES;
    this.lastInspiredCo2 = null;
    this.lastInspiredO2 = null;
    this.inletMoles = ZERO_MOLES;
    this.vented = ZERO_MOLES;
    this.uptakeMol = 0;
    this.productionMol = 0;
    this.openIntervals = [];
    this.substeps = 0;
    this.last = null;
    const invalid = validateParameters(this.p);
    this.status = invalid ? { kind: 'invalid', message: invalid } : { kind: 'ok' };
    const n0 = invalid ? 0 : (ambient.pressurePaAbs * helmet.freeVolumeAtAmbientM3) / (R_J_PER_MOL_K * ambient.temperatureK);
    this.helmet = scaleFractions(ambient.composition, n0);
    this.helmet0 = this.helmet;
    if (!invalid) this.checkDomainLimits();
    this.refreshPreview();
    return this.getState();
  }

  getState(): Readonly<SimulationState> {
    return (this.snapshot ??= this.buildSnapshot());
  }

  advance(dtS: number): Readonly<SimulationState> {
    if (!(Number.isFinite(dtS) && dtS >= 0)) {
      this.status = { kind: 'invalid', message: `advance(dtS) requires a finite non-negative step, got ${dtS}` };
      this.snapshot = null;
      return this.getState();
    }
    const target = this.t + dtS;
    const base = this.p.numerics.baseTimeStepS;
    while (this.status.kind === 'ok' && target - this.t > 1e-12) {
      const remaining = target - this.t;
      const hMax = Math.min(base, remaining);
      const plan = this.planSubstep(hMax);
      if (!plan) break;
      this.applySubstep(plan, plan.h === remaining ? target : this.t + plan.h);
    }
    this.snapshot = null;
    return this.getState();
  }

  updateLiveParameters(changes: LiveChanges): SimulationEvent {
    const next = cloneParameters(this.p);
    const labels: string[] = [];
    for (const key of Object.keys(changes) as (keyof LiveChanges)[]) {
      const value = changes[key];
      if (value === undefined) continue;
      if (key === 'regulatorOutletPressurePaAbs' || key === 'inletFlowSetpointRefLpm') next.supply[key] = value;
      else next.outlets[key] = value;
      const [name, fmt] = LIVE_LABELS[key];
      labels.push(`${name} ${fmt(value)}`);
    }
    this.p = deepFreeze(next);
    const invalid = validateParameters(this.p);
    if (invalid) this.status = { kind: 'invalid', message: invalid };
    this.refreshPreview();
    return { timeS: this.t, label: labels.length ? labels.join('; ') : 'No change' };
  }

  getAudit(): EngineAudit {
    const expected = addMoles(addMoles(this.helmet0, this.inletMoles), this.vented, -1);
    const held = addMoles(this.helmet, this.reservoir);
    const residual = addMoles(held, { o2Mol: expected.o2Mol - this.uptakeMol, co2Mol: expected.co2Mol + this.productionMol, inertMol: expected.inertMol }, -1);
    return { helmet: { ...this.helmet }, reservoir: { ...this.reservoir }, inletMoles: { ...this.inletMoles }, balanceResidual: residual, substeps: this.substeps };
  }

  // -------------------------------------------------------------------------

  private pressureOf(m: GasMoles): number {
    const { ambient, helmet } = this.p;
    return solvePressurePaAbs(totalMoles(m), ambient.temperatureK, helmet.freeVolumeAtAmbientM3, helmet.complianceM3PerPa, ambient.pressurePaAbs);
  }

  private molesAt(pressurePaAbs: number): number {
    const { ambient, helmet } = this.p;
    return molesAtPressure(pressurePaAbs, ambient.temperatureK, helmet.freeVolumeAtAmbientM3, helmet.complianceM3PerPa, ambient.pressurePaAbs);
  }

  private breathTiming() {
    const pt = this.p.patient!;
    const period = 60 / pt.respiratoryRateBreathsPerMin;
    const ti = period * pt.inspiratoryFraction;
    return { period, ti, te: period - ti, phaseLength: this.phase === 'inspiration' ? ti : period - ti };
  }

  /** Amounts transferred over a substep of length h, evaluated from the current state (explicit). */
  private computePlan(h: number): StepPlan {
    const { ambient, supply, outlets, patient } = this.p;
    const T = ambient.temperatureK;
    const P = this.pressureOf(this.helmet);
    const n = totalMoles(this.helmet);
    const x = fractionsOf(this.helmet);

    const inletRequestedMol = refLpmToMolPerS(supply.inletFlowSetpointRefLpm);
    const opening = Math.min(1, Math.max(0, (supply.regulatorOutletPressurePaAbs - P) / supply.inletControllerHeadroomPa));
    const inletMol = inletRequestedMol * opening * h;
    const overflowOpen = P >= outlets.overflowThresholdPaAbs - PRESSURE_TOL_PA;
    const overflowMol = overflowOpen ? refLpmToMolPerS(outlets.overflowOpenCapacityRefLpm) * h : 0;

    let inhaled = ZERO_MOLES;
    let inhaledVolumeM3 = 0;
    let exhaled = ZERO_MOLES;
    if (patient) {
      const { ti, te } = this.breathTiming();
      const t0 = this.phaseT;
      if (this.phase === 'inspiration') {
        const t1 = Math.min(ti, t0 + h);
        inhaledVolumeM3 = (patient.tidalVolumeM3 / 2) * (Math.cos((Math.PI * t0) / ti) - Math.cos((Math.PI * t1) / ti));
        inhaled = scaleFractions(x, (inhaledVolumeM3 * P) / (R_J_PER_MOL_K * T));
      } else {
        const t1 = t0 + h;
        const endOfPhase = te - t1 <= PHASE_EPS_S;
        const frac = 0.5 * (Math.cos((Math.PI * t0) / te) - Math.cos((Math.PI * Math.min(t1, te)) / te));
        exhaled = endOfPhase ? { ...this.reservoir } : scaleFractions(fractionsOf(this.returnInventory), frac * totalMoles(this.returnInventory));
      }
    }

    const netOther = inletMol - overflowMol - totalMoles(inhaled) + totalMoles(exhaled);
    const nAmbient = this.molesAt(ambient.pressurePaAbs);
    const maintenanceRequested = refLpmToMolPerS(outlets.maintenanceFlowSetpointRefLpm) * h;
    const maintenanceMol = Math.min(maintenanceRequested, Math.max(0, n - nAmbient + netOther));

    const inlet = scaleFractions(supply.sourceComposition, inletMol);
    const vented = scaleFractions(x, maintenanceMol + overflowMol);
    const helmetAfter = addMoles(addMoles(addMoles(addMoles(this.helmet, inlet), vented, -1), inhaled, -1), exhaled);
    return { h, pressure: P, overflowOpen, inletRequestedMol, inlet, maintenanceMol, overflowMol, vented, inhaled, inhaledVolumeM3, exhaled, helmetAfter };
  }

  /** Choose a substep: phase boundaries, pressure-change limit, threshold event location, positivity. */
  private planSubstep(hMax: number): StepPlan | null {
    let h = hMax;
    if (this.p.patient) {
      const { phaseLength } = this.breathTiming();
      h = Math.min(h, Math.max(phaseLength - this.phaseT, MIN_SUBSTEP_S));
    }
    const maxDp = MAX_DP_RATE_PA_PER_S * this.p.numerics.baseTimeStepS;
    const threshold = this.p.outlets.overflowThresholdPaAbs;
    for (let iter = 0; iter < 60; iter++) {
      const plan = this.computePlan(h);
      const negative = plan.helmetAfter.o2Mol < 0 || plan.helmetAfter.co2Mol < 0 || plan.helmetAfter.inertMol < 0;
      const pAfter = this.pressureOf(plan.helmetAfter);
      const dp = Math.abs(pAfter - plan.pressure);
      let scale = 1;
      if (negative) scale = 0.5;
      else if (dp > maxDp) scale = Math.max(0.1, (0.9 * maxDp) / dp);
      else if (!plan.overflowOpen && pAfter > threshold && plan.pressure < threshold) {
        // Locate the opening instant: shrink the step so it ends at the threshold.
        scale = (threshold - plan.pressure) / (pAfter - plan.pressure);
        if (scale >= 0.999) scale = 1;
      }
      if (scale === 1) return plan;
      const hNext = h * scale;
      if (hNext < MIN_SUBSTEP_S) {
        if (!negative) return this.computePlan(MIN_SUBSTEP_S);
        this.fail({ kind: 'invalid', message: `Numerical failure at t=${this.t.toFixed(4)} s: substep below ${MIN_SUBSTEP_S} s would ${negative ? 'remove more gas than available' : 'exceed the pressure-change limit'}` });
        return null;
      }
      h = hNext;
    }
    this.fail({ kind: 'invalid', message: `Numerical failure at t=${this.t.toFixed(4)} s: substep selection did not converge` });
    return null;
  }

  private applySubstep(plan: StepPlan, tEnd: number): void {
    const { ambient, helmet, patient } = this.p;
    const pAfter = this.pressureOf(plan.helmetAfter);
    if (pAfter < ambient.pressurePaAbs * (1 - COLLAPSE_REL_TOL)) {
      this.fail({
        kind: 'outside-domain',
        message: `Helmet pressure would fall below ambient at t=${this.t.toFixed(3)} s (hood collapse is outside the inflated-hood model). Inhalation demand exceeds the net supply.`,
      });
      return;
    }
    if (pAfter > helmet.maxPressurePaAbs) {
      this.fail({ kind: 'outside-domain', message: `Helmet pressure would exceed the model limit of ${(helmet.maxPressurePaAbs / 1e5).toFixed(3)} bar abs at t=${this.t.toFixed(3)} s.` });
      return;
    }
    const t0 = this.t;
    this.helmet = plan.helmetAfter;
    this.inletMoles = addMoles(this.inletMoles, plan.inlet);
    this.vented = addMoles(this.vented, plan.vented);
    this.reservoir = addMoles(addMoles(this.reservoir, plan.inhaled), plan.exhaled, -1);
    this.inspiredAccum = addMoles(this.inspiredAccum, plan.inhaled);
    if (plan.overflowOpen) {
      const lastIv = this.openIntervals[this.openIntervals.length - 1];
      if (lastIv && lastIv[1] === t0) lastIv[1] = tEnd;
      else this.openIntervals.push([t0, tEnd]);
    }
    this.t = tEnd;
    const cutoff = this.t - DUTY_CYCLE_WINDOW_S;
    while (this.openIntervals.length && this.openIntervals[0][1] <= cutoff) this.openIntervals.shift();
    this.last = plan;
    this.substeps++;

    if (patient) {
      this.phaseT += plan.h;
      const { phaseLength, period } = this.breathTiming();
      if (phaseLength - this.phaseT <= PHASE_EPS_S) this.endPhase(period);
    }
  }

  private endPhase(period: number): void {
    const pt = this.p.patient!;
    this.phaseT = 0;
    if (this.phase === 'inspiration') {
      const n = totalMoles(this.inspiredAccum);
      this.lastInspiredCo2 = n > 0 ? this.inspiredAccum.co2Mol / n : null;
      this.lastInspiredO2 = n > 0 ? this.inspiredAccum.o2Mol / n : null;
      this.inspiredAccum = ZERO_MOLES;
      const uptake = refLpmToMolPerS(pt.o2ConsumptionRefLpm) * period;
      const production = refLpmToMolPerS(pt.co2ProductionRefLpm) * period;
      if (this.reservoir.o2Mol < uptake) {
        this.fail({ kind: 'invalid', message: `Captured breath O2 (${this.reservoir.o2Mol.toExponential(3)} mol) cannot supply the configured per-breath uptake (${uptake.toExponential(3)} mol) at t=${this.t.toFixed(3)} s.` });
        return;
      }
      this.reservoir = { o2Mol: this.reservoir.o2Mol - uptake, co2Mol: this.reservoir.co2Mol + production, inertMol: this.reservoir.inertMol };
      this.uptakeMol += uptake;
      this.productionMol += production;
      this.returnInventory = { ...this.reservoir };
      this.phase = 'expiration';
    } else {
      this.completedBreaths++;
      this.phase = 'inspiration';
    }
  }

  private checkDomainLimits(): void {
    const { ambient, helmet } = this.p;
    if (hoodVolumeM3(helmet.maxPressurePaAbs, helmet.freeVolumeAtAmbientM3, helmet.complianceM3PerPa, ambient.pressurePaAbs) <= 0)
      this.status = { kind: 'invalid', message: 'Hood volume must remain positive up to the maximum model pressure' };
  }

  private fail(status: ModelStatus): void {
    this.status = status;
    this.snapshot = null;
  }

  private refreshPreview(): void {
    // Instantaneous flows for the current state (at reset or after a live change) over one base step.
    if (this.status.kind === 'ok') this.last = this.computePlan(this.p.numerics.baseTimeStepS);
    this.snapshot = null;
  }

  private buildSnapshot(): Readonly<SimulationState> {
    const { ambient, helmet, outlets, supply, patient } = this.p;
    const T = ambient.temperatureK;
    const P = this.status.kind === 'invalid' && totalMoles(this.helmet) === 0 ? ambient.pressurePaAbs : this.pressureOf(this.helmet);
    const x = fractionsOf(this.helmet);
    const plan = this.last;
    const h = plan?.h ?? 1;
    const inletMolPerS = plan ? totalMoles(plan.inlet) / h : 0;
    const maintenanceMolPerS = plan ? plan.maintenanceMol / h : 0;
    const overflowMolPerS = plan ? plan.overflowMol / h : 0;
    let airway = 0;
    if (plan && patient) {
      airway = plan.inhaledVolumeM3 > 0 ? plan.inhaledVolumeM3 / h : -(totalMoles(plan.exhaled) * R_J_PER_MOL_K * T) / (plan.pressure * h);
    }
    let dutyOpenS = 0;
    const windowStart = Math.max(0, this.t - DUTY_CYCLE_WINDOW_S);
    for (const [a, b] of this.openIntervals) dutyOpenS += Math.max(0, Math.min(b, this.t) - Math.max(a, windowStart));
    const windowLen = this.t - windowStart;
    const phaseLength = patient ? this.breathTiming().phaseLength : 1;
    const state: SimulationState = {
      timeS: this.t,
      helmet: {
        pressurePaAbs: P,
        pressurePaGauge: P - ambient.pressurePaAbs,
        volumeM3: hoodVolumeM3(P, helmet.freeVolumeAtAmbientM3, helmet.complianceM3PerPa, ambient.pressurePaAbs),
        temperatureK: T,
        moles: { ...this.helmet },
        fractions: x,
        o2PartialPressurePaAbs: x.o2Frac * P,
        co2PartialPressurePaAbs: x.co2Frac * P,
      },
      flows: {
        inletRequestedRefLpm: supply.inletFlowSetpointRefLpm,
        inletDeliveredRefLpm: molPerSToRefLpm(inletMolPerS),
        maintenanceRequestedRefLpm: outlets.maintenanceFlowSetpointRefLpm,
        maintenanceDeliveredRefLpm: molPerSToRefLpm(maintenanceMolPerS),
        overflowRefLpm: molPerSToRefLpm(overflowMolPerS),
        totalOutletRefLpm: molPerSToRefLpm(maintenanceMolPerS + overflowMolPerS),
        inletMolPerS,
        maintenanceMolPerS,
        overflowMolPerS,
      },
      overflow: {
        isOpen: plan?.overflowOpen ?? false,
        recentDutyCycleFrac: windowLen > 0 ? dutyOpenS / windowLen : 0,
        dutyCycleWindowS: DUTY_CYCLE_WINDOW_S,
      },
      breath: patient
        ? {
            phase: this.phase,
            phaseProgressFrac: Math.min(1, this.phaseT / phaseLength),
            completedBreaths: this.completedBreaths,
            airwayFlowM3PerS: airway,
            lastInspiredCo2Frac: this.lastInspiredCo2,
            lastInspiredO2Frac: this.lastInspiredO2,
          }
        : null,
      cumulative: {
        o2FromSourceRefL: molToRefL(this.inletMoles.o2Mol),
        o2FromSourceMol: this.inletMoles.o2Mol,
        ventedMoles: { ...this.vented },
        metabolicO2UptakeMol: this.uptakeMol,
        metabolicCo2ProductionMol: this.productionMol,
      },
      status: { ...this.status },
    };
    return deepFreeze(state);
  }
}

export const createHelmetEngine = (parameters: SimulationParameters): HelmetEngine => new Engine(parameters);
export const createEngine: CreateEngine = createHelmetEngine;
