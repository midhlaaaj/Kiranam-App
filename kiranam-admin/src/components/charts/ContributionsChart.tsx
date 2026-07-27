'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ChartTypeToggle, type ChartKind } from '@/components/charts/ChartTypeToggle';
import { formatMoney } from '@/lib/ui';

const chartConfig = {
  total: { label: 'Contributions', color: 'var(--color-chart-1)' },
} satisfies ChartConfig;

export function ContributionsChart({ data }: { data: { label: string; total: number }[] }) {
  const [kind, setKind] = useState<ChartKind>('bar');
  const maxVal = Math.max(...data.map((d) => d.total), 0);
  const domain: [number, number | 'auto'] = maxVal === 0 ? [0, 10000] : [0, 'auto'];
  const ticks = maxVal === 0 ? [0, 2500, 5000, 7500, 10000] : undefined;

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
              width={70}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
              tickFormatter={(v) => formatMoney(v)}
              domain={domain}
              ticks={ticks}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={400} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
              width={70}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'var(--color-kiranam-muted)' }}
              tickFormatter={(v) => formatMoney(v)}
              domain={domain}
              ticks={ticks}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-kiranam-border-strong)', strokeDasharray: '3 3' }}
              content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--color-total)', strokeWidth: 0 }}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--color-kiranam-surface)' }}
              animationDuration={400}
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
