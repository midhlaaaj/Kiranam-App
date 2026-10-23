import { LineChart, BarChartBig } from 'lucide-react';

export type ChartKind = 'line' | 'bar';

export function ChartTypeToggle({ value, onChange }: { value: ChartKind; onChange: (kind: ChartKind) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-kiranam-surface-alt p-1">
      <button
        type="button"
        onClick={() => onChange('line')}
        aria-pressed={value === 'line'}
        aria-label="Line chart"
        className={`relative cursor-pointer rounded-full p-1.5 transition duration-200 ease-out after:absolute after:-inset-x-0.5 after:-inset-y-1.5 ${
          value === 'line' ? 'bg-kiranam-surface text-kiranam-primary shadow-elevation-sm' : 'text-kiranam-muted hover:text-kiranam-ink'
        }`}
      >
        <LineChart size={15} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => onChange('bar')}
        aria-pressed={value === 'bar'}
        aria-label="Bar chart"
        className={`relative cursor-pointer rounded-full p-1.5 transition duration-200 ease-out after:absolute after:-inset-x-0.5 after:-inset-y-1.5 ${
          value === 'bar' ? 'bg-kiranam-surface text-kiranam-primary shadow-elevation-sm' : 'text-kiranam-muted hover:text-kiranam-ink'
        }`}
      >
        <BarChartBig size={15} strokeWidth={2.25} />
      </button>
    </div>
  );
}
