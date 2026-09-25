import type { CreateEngine, SimulationParameters } from '../shared/types';

export interface EngineModule {
  createEngine: CreateEngine;
  DEFAULT_PARAMETERS: SimulationParameters;
  PARAMETER_BOUNDS?: unknown;
  MODEL_VERSION?: string;
}

// Resolves to null until the physics workstream's src/engine/index.ts is merged.
const modules = import.meta.glob<EngineModule>('../engine/index.ts', { eager: true });
const candidate = Object.values(modules)[0];

export const engineModule: EngineModule | null =
  candidate && typeof candidate.createEngine === 'function' && candidate.DEFAULT_PARAMETERS ? candidate : null;
