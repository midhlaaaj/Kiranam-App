'use client';

import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const STATUS_COLORS: Record<string, string> = {
  Active: 'var(--color-kiranam-success)',
  Due: 'var(--color-kiranam-warning)',
  Overdue: 'var(--color-kiranam-danger)',
  Inactive: 'var(--color-kiranam-muted-2)',
};

const chartConfig = {
  value: { label: 'Contributors' },
  Active: { label: 'Active', color: 'var(--color-kiranam-success)' },
  Due: { label: 'Due', color: 'var(--color-kiranam-warning)' },
  Overdue: { label: 'Overdue', color: 'var(--color-kiranam-danger)' },
  Inactive: { label: 'Inactive', color: 'var(--color-kiranam-muted-2)' },
} satisfies ChartConfig;

export function StatusBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  const nonZero = data.filter((d) => d.value > 0);

  if (nonZero.length === 0) {
    return <p className="py-16 text-center text-sm text-kiranam-muted">No assigned contributors yet.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={nonZero}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={3}
          cornerRadius={3}
          strokeWidth={2}
          stroke="var(--color-kiranam-surface)"
          animationDuration={400}
        >
          {nonZero.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
