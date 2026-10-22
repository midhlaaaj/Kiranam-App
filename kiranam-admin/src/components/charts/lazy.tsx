'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/Skeleton';

// Recharts is ~115 KB gzipped. Charts render nothing useful on the server
// (ResponsiveContainer has no size there), so they're client-only and their
// chunk loads after the page shell instead of blocking it. Fallback heights
// match the loaded charts (260px plot, +43px where the line/bar toggle sits
// above it) so nothing shifts when the chart arrives.
const fallback = (height: number) =>
  function ChartFallback() {
    return <Skeleton className="w-full" style={{ height }} />;
  };

export const ContributionsChart = dynamic(
  () => import('./ContributionsChart').then((m) => m.ContributionsChart),
  { ssr: false, loading: fallback(303) },
);
export const ContributorGrowthChart = dynamic(
  () => import('./ContributorGrowthChart').then((m) => m.ContributorGrowthChart),
  { ssr: false, loading: fallback(303) },
);
export const VolunteerGrowthChart = dynamic(
  () => import('./VolunteerGrowthChart').then((m) => m.VolunteerGrowthChart),
  { ssr: false, loading: fallback(303) },
);
export const StatusBreakdownChart = dynamic(
  () => import('./StatusBreakdownChart').then((m) => m.StatusBreakdownChart),
  { ssr: false, loading: fallback(260) },
);
// Real height is max(180, rows * 44); the fallback can't know the row count.
export const CampaignProgressChart = dynamic(
  () => import('./CampaignProgressChart').then((m) => m.CampaignProgressChart),
  { ssr: false, loading: fallback(180) },
);
