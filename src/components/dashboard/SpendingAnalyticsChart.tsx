'use client';

import dynamic from 'next/dynamic';
import { ChartDataPoint } from './SpendingAnalyticsChartInner';

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-[var(--bg-primary)] rounded-2xl animate-pulse flex flex-col justify-between p-4 border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-32 bg-[var(--border-color)] rounded"></div>
        <div className="h-3 w-16 bg-[var(--border-color)] rounded"></div>
      </div>
      <div className="flex items-end justify-between gap-2 h-44 pt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-end gap-1 w-full h-full justify-center">
            <div className="w-3 bg-[var(--border-color)] rounded-t" style={{ height: `${30 + (i * 12) % 60}%` }}></div>
            <div className="w-3 bg-[var(--border-color)] opacity-60 rounded-t" style={{ height: `${20 + (i * 15) % 50}%` }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DynamicChart = dynamic(() => import('./SpendingAnalyticsChartInner'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface SpendingAnalyticsChartProps {
  data: ChartDataPoint[];
}

export function SpendingAnalyticsChart({ data }: SpendingAnalyticsChartProps) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h2 className="text-base font-bold font-heading text-[var(--text-primary)]">
            Weekly Money Flow
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Income vs Expense analytics breakdown
          </p>
        </div>
      </div>
      <DynamicChart data={data} />
    </div>
  );
}
