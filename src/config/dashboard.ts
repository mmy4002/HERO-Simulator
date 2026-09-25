export interface ControlDef {
  id: string;
  label: string;
  unit: string;
}

export interface ReadingDef {
  id: string;
  label: string;
  unit: string;
}

export interface ChartDef {
  id: string;
  title: string;
  yLabel: string;
}

export const CONTROLS: ControlDef[] = [
  { id: 'regulatorPressure', label: 'Regulator outlet pressure', unit: 'bar abs' },
  { id: 'inletFlow', label: 'Inlet flow', unit: 'ref L/min' },
  { id: 'maintenanceFlow', label: 'Maintenance outflow', unit: 'ref L/min' },
  { id: 'overflowThreshold', label: 'Overflow threshold', unit: 'bar abs' },
];

export const READINGS: ReadingDef[] = [
  { id: 'helmetPressure', label: 'Helmet pressure', unit: 'bar abs' },
  { id: 'co2', label: 'CO₂', unit: '%' },
  { id: 'o2', label: 'O₂ concentration', unit: '%' },
  { id: 'o2Supplied', label: 'Oxygen supplied', unit: 'ref L' },
];

export const CHARTS: ChartDef[] = [
  { id: 'pressure', title: 'Helmet pressure', yLabel: 'bar abs' },
  { id: 'co2', title: 'CO₂', yLabel: '%' },
  { id: 'o2', title: 'O₂ concentration', yLabel: '%' },
  { id: 'flows', title: 'External flows', yLabel: 'ref L/min' },
];

export const UNAVAILABLE = '—';
