# HEROES parallel workstreams

Foundation: the dashboard shell runs (`npm run dev`, http://localhost:5173), and `npm run build` and `npm test` pass.
The contract between the workstreams is **`src/shared/types.ts`**. Scope and model requirements are in `HEROES-Devin-build-playbook.md`.

## Ownership rules

- Each agent edits **only the files it owns**. To change a file owned by someone else, send a request to its owner.
- The **main agent owns** `src/shared/**`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `AGENTS.md`, this file, `src/App.tsx` and `src/main.tsx`.
- The other agents must **not** install packages or edit shared types. If they need a dependency or an interface change, they ask the main agent, stating the exact package/version or field name, type and unit.
- Every agent must keep `npm run build` and `npm test` passing before reporting that a task is done.
- Every agent works on its own git branch (`engine/*`, `scene/*`, `ui/*`). The main agent merges them.
- **UI theme agent** (branch `ui/brochure-theme`) owns only `src/ui-theme/**`. It must not modify components, existing styles, the scene or the engine. The main agent imports its CSS after `src/styles.css` and handles any integration requests.

## 1. Main agent: dashboard, controls, charts, integration

Owns: `src/components/**`, `src/config/**`, `src/styles.css`, `src/app/**` (simulation loop and state hooks), plus the shared files listed above.

- Enables the controls and binds them to `SimulationParameters`. The controls show bar/%/ppm; conversions use `PA_PER_BAR`, and values are stored in SI.
- Runs the simulation clock: calls `engine.advance(dtS)` on a fixed-step timer (unaffected by animation frame rate, capped so a hidden tab can't cause a huge step) and handles 1×/5×/10× speed, pause, resume and reset.
- Builds the readings, `SimulationSample` history (downsampled) and charts (recharts) from `SimulationState`.
- Maps `SimulationState` → `SceneFrame` (a pure function in `src/app/`) and passes it to `<HelmetScene frame={...} />`.
- Adds A/B comparison, CSV/JSON export and the assumptions drawer (later stages).

## 2. 3D agent: head, helmet, equipment, animation

Owns: `src/scene/**`.

- Keeps the entry point as `src/scene/HelmetScene.tsx`, a default export typed as `HelmetSceneProps`. It fills the parent box (the current `scene-viewport` container).
- Builds with `three`, `@react-three/fiber` and `@react-three/drei`, which are already installed.
- Renders: a recognizable procedural adult head/neck, a transparent flexible film hood (no transparency sorting bugs), a silicone neck seal, and the oxygen cylinder → regulator → hose → inlet. Two outlets on the opposite side are labelled maintenance and overflow. It also provides orbit/zoom/reset camera controls.
- **Must not compute physics.** Animation is driven only by `props.frame`:
  - Particle rates scale with `inletRefLpm`, `maintenanceRefLpm` and `overflowRefLpm`.
  - Overflow activity follows `overflowOpen`.
  - Mouth/nose pulses follow `breathPhase`, `breathPhaseProgressFrac` and `airwayFlowM3PerS`.
  - If `frame` is `null`, it shows the static device with no flow.
- Particles are illustrative, not concentrations or CFD. It must not import from `src/engine`.
- It may use a local dev-only fixture that feeds fake `SceneFrame` values for visual testing. This fixture stays inside `src/scene/` and is never imported by the app.

## 3. Physics agent: simulation engine and numerical tests

Owns: `src/engine/**` (including `src/engine/**/*.test.ts`).

- Exports from `src/engine/index.ts`:
  - `createEngine: CreateEngine`, returning a `SimulationEngine`.
  - `DEFAULT_PARAMETERS: SimulationParameters`, using the playbook's demo values.
  - `PARAMETER_BOUNDS`, the valid ranges for the UI.
- Uses pure TypeScript only: **no React, Three.js or DOM imports**. It must be deterministic and SI internally, with units as encoded in the field names.
- Implements everything in the playbook sections "Units", "Flexible volume", "Supply and valves", "Gas conservation and breathing" and "Numerics". Model problems are reported through `state.status`, never by clamping values or silently discarding gas.
- Writes Vitest tests covering the playbook's "Verification" list: conservation, gas laws, analytical flush, overflow behavior, no backflow, deterministic reset and timestep convergence.

## How the outputs connect

```
UI controls ──SimulationParameters──▶ engine (src/engine)
                                       │ advance(dtS)
                                       ▼
                               SimulationState
                     ┌─────────────────┼──────────────────┐
                     ▼                 ▼                  ▼
            readings panel     SimulationSample[]     SceneFrame
                                  → charts        → <HelmetScene/>
```

Integration order: first the engine and tests, then the main agent wires the loop and readings, then the scene consumes `SceneFrame`.
