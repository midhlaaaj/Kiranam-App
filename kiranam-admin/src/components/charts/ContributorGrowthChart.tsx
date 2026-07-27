'use client';

import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ChartTypeToggle, type ChartKind } from '@/components/charts/ChartTypeToggle';

const chartConfig = {
  total: { label: 'Contributors', color: 'var(--color-chart-3)' },
} satisfies ChartConfig;

export function ContributorGrowthChart({ data }: { data: { label: string; total: number }[] }) {
  const [kind, setKind] = useState<ChartKind>('line');

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ChartTypeToggle value={kind} onChange={setKind} />
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
        {kind === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-kiranam-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
              allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={400} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="contributorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-kiranam-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-kiranam-border-strong)', strokeDasharray: '3 3' }}
              content={<ChartTooltipContent />}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              fill="url(#contributorFill)"
              dot={{ r: 2.5, fill: 'var(--color-total)', strokeWidth: 0 }}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--color-kiranam-surface)' }}
              animationDuration={400}
            />
          </AreaChart>
        )}
      </ChartContainer>
    </div>
  );
}
