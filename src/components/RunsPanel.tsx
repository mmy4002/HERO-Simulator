import { useRef } from 'react';
import type { SimulationController } from '../app/useSimulation';
import type { useComparison } from '../app/useComparison';
import { engineModule } from '../app/engineLoader';
import { download, MODEL_ASSUMPTIONS, parametersToJson, parseParametersJson, samplesToCsv } from '../app/exports';

type Comparison = ReturnType<typeof useComparison>;

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

export default function RunsPanel({ sim, cmp }: { sim: SimulationController; cmp: Comparison }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = !sim.available || !sim.parameters;
  const { runs } = cmp;
  const hasResults = Boolean(runs.A?.result || runs.B?.result);

  const exportLiveCsv = () =>
    download(`heroes-live-${stamp()}.csv`, samplesToCsv([{ label: 'live', samples: sim.history, events: sim.events }]), 'text/csv');

  const exportComparisonCsv = () =>
    download(
      `heroes-ab-${stamp()}.csv`,
      samplesToCsv((['A', 'B'] as const).flatMap((l) => (runs[l]?.result ? [{ label: l, samples: runs[l]!.result!.samples }] : []))),
      'text/csv',
    );

  const onImport = async (file: File) => {
    if (!engineModule) return;
    try {
      const p = parseParametersJson(await file.text(), engineModule.DEFAULT_PARAMETERS);
      sim.loadParameters(p);
      cmp.setMessage(`Imported parameters from ${file.name}; simulation reset.`);
    } catch (err) {
      cmp.setMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="runs">
      <h3 className="sub-title">A/B comparison</h3>
      <div className="btn-grid">
        <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => cmp.save('A', sim.parameters!)}>
          Save as A{runs.A ? ' ✓' : ''}
        </button>
        <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => cmp.save('B', sim.parameters!)}>
          Save as B{runs.B ? ' ✓' : ''}
        </button>
        <button type="button" className="btn btn-sm btn-accent" disabled={disabled || cmp.busy || !runs.A || !runs.B} onClick={cmp.runBoth}>
          {cmp.busy ? 'Running…' : 'Run A/B'}
        </button>
        <button type="button" className="btn btn-sm" disabled={!runs.A && !runs.B} onClick={cmp.clear}>Clear runs</button>
      </div>
      {cmp.message && <p className="runs-msg" role="status">{cmp.message}</p>}

      <h3 className="sub-title">Export / import</h3>
      <div className="btn-grid">
        <button type="button" className="btn btn-sm" disabled={sim.history.length < 2} onClick={exportLiveCsv}>Live CSV</button>
        <button type="button" className="btn btn-sm" disabled={!hasResults} onClick={exportComparisonCsv}>A/B CSV</button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={disabled}
          onClick={() => download(`heroes-parameters-${stamp()}.json`, parametersToJson(sim.parameters!, engineModule?.MODEL_VERSION), 'application/json')}
        >
          Export JSON
        </button>
        <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => fileRef.current?.click()}>Import JSON</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
      </div>
      <button
        type="button"
        className="btn btn-sm btn-wide"
        disabled={disabled}
        onClick={() => {
          sim.loadParameters(engineModule!.DEFAULT_PARAMETERS);
          cmp.setMessage('Demo settings restored; simulation reset.');
        }}
      >
        Reset demo settings
      </button>

      <details className="assumptions">
        <summary>Model assumptions</summary>
        <ul>
          {MODEL_ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
