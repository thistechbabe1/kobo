import Link from 'next/link';
import { SendHorizontal, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/10 dark:bg-emerald-100/10 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] tracking-wide uppercase">
              App Shell Active
            </span>
            <span className="text-xs text-[var(--text-muted)]">• Feature 1 Scaffold</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
            Hello, Babatunde 👋
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Welcome to Kobo digital wallet dashboard shell.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/send"
            className="px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold text-xs hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Send Money</span>
          </Link>
        </div>
      </div>

      {/* Grid Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
              Wallet Balance Shell
            </h2>
            <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Responsive App Shell navigation, dark/light theme switcher, jose sealed cookie state, and WCAG AA contrast tokens are fully loaded.
          </p>
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Simulated Available Balance</p>
              <p className="text-2xl font-extrabold font-heading text-[var(--text-primary)] mt-1">₦250,000.00</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-950/10 dark:bg-emerald-100/10 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Ready for Feature 2
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
          <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
            Quick Navigation
          </h2>
          <div className="space-y-2 text-xs">
            <Link
              href="/transactions"
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--brand-primary)] transition-all font-medium text-[var(--text-primary)]"
            >
              <span>View Transactions</span>
              <ArrowUpRight className="w-4 h-4 text-[var(--brand-primary)]" />
            </Link>
            <Link
              href="/send"
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--brand-primary)] transition-all font-medium text-[var(--text-primary)]"
            >
              <span>Send Money Wizard</span>
              <ArrowUpRight className="w-4 h-4 text-[var(--brand-primary)]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
