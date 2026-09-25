import { useCallback, useState } from 'react';
import type { SimulationParameters } from '../shared/types';
import { engineModule } from './engineLoader';
import { comparabilityIssues, loadSavedRuns, runHeadless, storeSavedRuns, type SavedRun } from './runs';

export function useComparison() {
  const [runs, setRuns] = useState<Partial<Record<'A' | 'B', SavedRun>>>(loadSavedRuns);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (next: Partial<Record<'A' | 'B', SavedRun>>) => {
    setRuns(next);
    storeSavedRuns(next);
  };

  const save = useCallback(
    (label: 'A' | 'B', parameters: SimulationParameters) => {
      update({ ...runs, [label]: { label, savedAt: new Date().toISOString(), parameters: structuredClone(parameters), result: null } });
      setMessage(`Saved current settings as run ${label}.`);
    },
    [runs],
  );

  const runBoth = useCallback(() => {
    if (!engineModule) return;
    const { A, B } = runs;
    if (!A || !B) {
      setMessage('Save both run A and run B first.');
      return;
    }
    const issues = comparabilityIssues(A.parameters, B.parameters);
    if (issues.length) {
      setMessage(`Runs are not comparable (${issues.join(', ')}). Only supply/outlet settings may differ.`);
      return;
    }
    setBusy(true);
    setMessage('Running A and B…');
    // Yield so the busy state paints before the synchronous runs.
    setTimeout(() => {
      try {
        const next = {
          A: { ...A, result: runHeadless(engineModule!.createEngine, A.parameters) },
          B: { ...B, result: runHeadless(engineModule!.createEngine, B.parameters) },
        };
        update(next);
        setMessage(`Compared A and B over ${A.parameters.numerics.durationS} s from identical initial conditions.`);
      } catch (err) {
        setMessage(`Comparison failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusy(false);
      }
    }, 30);
  }, [runs]);

  const clear = useCallback(() => {
    update({});
    setMessage('Cleared saved runs.');
  }, []);

  return { runs, busy, message, setMessage, save, runBoth, clear };
}
