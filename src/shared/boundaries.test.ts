import { describe, expect, it } from 'vitest';

const engineSources = import.meta.glob<string>('/src/engine/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
const sceneSources = import.meta.glob<string>('/src/scene/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

const importsOf = (source: string) => [...source.matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);

function violations(sources: Record<string, string>, forbidden: RegExp) {
  return Object.entries(sources).flatMap(([file, src]) => importsOf(src).filter((spec) => forbidden.test(spec)).map((spec) => `${file} -> ${spec}`));
}

describe('workstream boundaries', () => {
  it('engine does not depend on React, Three.js, the scene or UI', () => {
    expect(violations(engineSources, /^(react|react-dom|three|@react-three\/.*|recharts)$|\/(scene|components|app)\//)).toEqual([]);
  });

  it('scene does not import the engine', () => {
    expect(violations(sceneSources, /\/engine(\/|$)/)).toEqual([]);
  });
});
