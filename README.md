# HEROES — Oxygen Helmet Simulator

Interactive browser demonstrator of a transparent flexible oxygen hood on an adult head. It includes a regulated oxygen cylinder, an inlet, a maintenance outlet and a pressure-triggered overflow outlet. A lumped, well-mixed gas model drives the live readings, charts and 3D animation.

Static React + TypeScript + Vite app: no backend, login or external API.

## Run locally

Requires Node.js 20+ (tested with Node 26).

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build, test, preview

```bash
npm test           # Vitest: engine numerics, app mapping/exports, workstream boundaries
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173
```

`dist/` uses relative asset paths, so any static host can serve it from any folder (Netlify Drop, Vercel, GitHub Pages, S3 or a USB stick with `npx serve dist`).

## Using the demo

1. **Play / Pause / Reset**, speed **1× / 5× / 10×**. A default run lasts 300 s of simulated time.
2. **Controls** (live, with timestamped event markers on the charts):
   - regulator outlet pressure (bar abs)
   - inlet flow (ref L/min)
   - maintenance outflow (ref L/min)
   - overflow threshold (bar abs)
   - overflow open capacity (ref L/min, under Advanced)
3. **Readings**: helmet pressure (absolute, gauge, cmH₂O), bulk CO₂ (% and ppm), breath-weighted inspired CO₂, O₂ %, the flows, overflow status and duty cycle, oxygen supplied, time and breath phase. Hover over a reading to see partial pressures.
4. **Charts**:
   - helmet pressure, with a line at the overflow threshold
   - CO₂, with a marker for each breath's inspired CO₂
   - O₂ concentration
   - the three external flows
5. **A/B comparison**: *Save as A*, change settings, *Save as B*, then *Run A/B*. Both runs start from identical initial conditions and run for the full duration through the same engine. The comparison tab overlays the charts and summarizes mean and peak CO₂, mean inspired CO₂, final and peak pressure, oxygen supplied and overflow duty cycle. Saved runs are kept in browser storage.
6. **Export / import**:
   - live or A/B time series as CSV (units in the column headers)
   - parameters as JSON (with model version and assumptions); JSON import resets the run
7. If the model leaves its valid domain (e.g. hood collapse when demand exceeds supply, or pressure above the model maximum), the run stops and shows the engine's reason. Press Reset.

## Model summary

- Well-mixed O₂/CO₂/inert inventories, in SI units. Reference flows are defined at 1.0 bar absolute and 293.15 K.
- Flexible hood volume V(P) = V0 + C·(P − P_ambient). V0 = 12 L and C = 0.02 L/kPa are uncalibrated demo values. Pressure is the positive root of P·V(P) = nRT.
- 200 bar absolute constant source (assumed) → ideal regulator → inlet flow controller q = q_set·clamp((P_reg − P)/Δp, 0, 1). There is no backflow.
- The maintenance outlet is an ideal constant flow above ambient. The overflow opens at the threshold with finite capacity. It has zero hysteresis and does not clamp pressure.
- Resting-adult breath-reservoir bookkeeping: 12 breaths/min, 0.5 L tidal volume, I:E 1:2, VO₂ 0.25 and VCO₂ 0.20 ref L/min. This is not a physiological model.
- The UI advances the engine in fixed 0.1 s chunks of simulated time; the engine substeps at ≤ 0.01 s. Wall-clock credit is capped per frame, so hidden tabs do not cause catch-up jumps.
- Instantaneous engine flows describe the last substep, so displayed and exported flows are averaged over each 0.1 s chunk from cumulative totals. Flow charts show a 1 s moving average.
- Particles and animation are illustrative. They do not show concentrations or CFD. This is not a medical device, clinical prediction or structural analysis.

Engine details, limitations and numerical test results: `src/engine/` and its tests (`npm test`).

## Project layout

| Path | Contents |
|---|---|
| `src/engine/` | Simulation engine; pure TypeScript with no React or Three.js |
| `src/scene/` | React Three Fiber scene, rendered from `SceneFrame` props only |
| `src/app/` | Simulation clock, state → sample/scene mapping, A/B runs, exports |
| `src/components/`, `src/config/` | Dashboard panels and control definitions |
| `src/shared/types.ts` | Shared contracts; field names carry their units |
