# HEROES — Oxygen Helmet Simulator

React + TypeScript + Vite static app. Node installed via Homebrew.

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:5173, strict port)
- Production build (includes typecheck): `npm run build`
- Tests (Vitest, `src/**/*.test.ts`): `npm test`
- Visual check at 1366×768: headless Chrome `--screenshot --window-size=1366,768`

Dependencies are pinned to exact versions. React stays at 19.2.x because @react-three/fiber 9.7 requires react <19.3.

Structure and file ownership: see `PARALLEL_TASKS.md`. The shared contract is `src/shared/types.ts`, with units in field names (PaAbs vs PaGauge, RefLpm, Frac, ...).
Project scope reference: `HEROES-Devin-build-playbook.md` (build in stages per user instruction).
