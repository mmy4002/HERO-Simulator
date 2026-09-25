import { useEffect, useState } from 'react';
import type { ControlDef } from '../config/controls';

interface Props {
  def: ControlDef;
  /** SI value, or null when no engine/parameters exist. */
  valueSI: number | null;
  disabled: boolean;
  onChange: (valueSI: number) => void;
}

export default function ControlSlider({ def, valueSI, disabled, onChange }: Props) {
  const display = valueSI === null ? null : def.toDisplay(valueSI);
  const [draft, setDraft] = useState(display === null ? '' : display.toFixed(def.digits));

  useEffect(() => {
    setDraft(display === null ? '' : display.toFixed(def.digits));
  }, [display, def.digits]);

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) {
      setDraft(display === null ? '' : display.toFixed(def.digits));
      return;
    }
    const clamped = Math.min(def.max, Math.max(def.min, raw));
    onChange(def.fromDisplay(Number(clamped.toFixed(def.digits))));
  };

  const id = `ctl-${def.key}`;
  return (
    <div className="control">
      <label htmlFor={id} className="control-label">
        {def.label}
        <span className="unit">{def.unit}</span>
      </label>
      <div className="control-row">
        <input
          type="range"
          aria-label={`${def.label} slider`}
          min={def.min}
          max={def.max}
          step={def.step}
          value={display ?? def.min}
          disabled={disabled || display === null}
          onChange={(e) => commit(Number(e.target.value))}
        />
        <input
          id={id}
          type="number"
          className="num-input"
          min={def.min}
          max={def.max}
          step={def.step}
          placeholder="—"
          value={draft}
          disabled={disabled || display === null}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(Number(draft))}
          onKeyDown={(e) => e.key === 'Enter' && commit(Number(draft))}
        />
      </div>
      <div className="control-range">
        {def.min.toFixed(def.digits)}–{def.max.toFixed(def.digits)} {def.unit}
      </div>
    </div>
  );
}
