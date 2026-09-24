export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Hero Balance Card Skeleton */}
      <div className="w-full h-48 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-[var(--border-color)] rounded"></div>
          <div className="h-5 w-24 bg-[var(--border-color)] rounded-full"></div>
        </div>
        <div className="h-10 w-64 bg-[var(--border-color)] rounded my-2"></div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-[var(--border-color)] rounded-xl"></div>
          <div className="h-9 w-28 bg-[var(--border-color)] rounded-xl"></div>
        </div>
      </div>

      {/* Analytics Chart & Transactions Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Skeleton */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 h-80 flex flex-col justify-between">
          <div className="h-5 w-40 bg-[var(--border-color)] rounded"></div>
          <div className="h-52 w-full bg-[var(--bg-primary)] rounded-xl"></div>
        </div>

        {/* Transactions List Skeleton */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 h-80 flex flex-col justify-between">
          <div className="h-5 w-40 bg-[var(--border-color)] rounded"></div>
          <div className="space-y-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-[var(--bg-primary)] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
