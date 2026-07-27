'use client';

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  pct: { label: 'Funded' },
} satisfies ChartConfig;

export function CampaignProgressChart({ data }: { data: { title: string; pct: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: Math.max(180, data.length * 44) }}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-kiranam-border)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          tick={{ fill: 'var(--color-kiranam-muted)' }}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="title"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          tick={{ fill: 'var(--color-kiranam-ink)' }}
          width={160}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
        <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={16} animationDuration={400}>
          {data.map((entry) => (
            <Cell key={entry.title} fill={entry.pct >= 100 ? 'var(--color-kiranam-success)' : 'var(--color-kiranam-primary)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
