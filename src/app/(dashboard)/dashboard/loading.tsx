export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)]"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)]"></div>
        <div className="h-64 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)]"></div>
      </div>
    </div>
  );
}
