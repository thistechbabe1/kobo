'use client';

/**
 * Compact animated dashboard preview for the landing page hero,
 * featuring simulated balance, mini spending flow, and mock recent activity.
 */
import { motion, useReducedMotion } from 'motion/react';
import {
  SendHorizontal,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from 'lucide-react';

const DEMO_TRANSACTIONS = [
  {
    id: 'demo-tx-1',
    title: 'Demo Cafe Payment',
    subtitle: 'Simulation Transfer • Coffee',
    amount: '-₦2,500.00',
    isCredit: false,
    status: 'Simulated',
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    id: 'demo-tx-2',
    title: 'Mock Salary Credit',
    subtitle: 'Kobo Simulation • Inflow',
    amount: '+₦45,000.00',
    isCredit: true,
    status: 'Settled',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'demo-tx-3',
    title: 'Test Utility Top-up',
    subtitle: 'Simulation Switch • Electricity',
    amount: '-₦1,200.00',
    isCredit: false,
    status: 'Success',
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
];

const MINI_CHART_DAYS = [
  { day: 'M', inflow: 45, outflow: 20 },
  { day: 'T', inflow: 30, outflow: 40 },
  { day: 'W', inflow: 70, outflow: 25 },
  { day: 'T', inflow: 50, outflow: 45 },
  { day: 'F', inflow: 90, outflow: 35 },
  { day: 'S', inflow: 60, outflow: 30 },
  { day: 'S', inflow: 25, outflow: 15 },
];

interface AnimatedDashboardPreviewProps {
  className?: string;
}

export function AnimatedDashboardPreview({ className = '' }: AnimatedDashboardPreviewProps) {
  const shouldReduceMotion = useReducedMotion();

  // Animation only uses transform and opacity (no layout/height modifications)
  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      };

  return (
    <div
      data-testid="landing-preview"
      className={`w-full max-w-[320px] sm:max-w-[340px] lg:max-w-[360px] mx-auto ${className}`.trim()}
    >
      <motion.div
        {...motionProps}
        data-testid="landing-preview-frame"
        className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-xl text-left overflow-hidden transition-colors"
      >
        {/* Mock Phone / App Top Bar */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
          <span className="font-mono font-medium">9:41 AM</span>
          <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" aria-hidden="true" />
          <span className="font-semibold text-[var(--brand-primary)]">Demo Mode</span>
        </div>

        {/* Balance Card: Compact composition with clearly fake simulated data */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0D7855] to-[#0A4D37] text-white p-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
              Simulated Wallet
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">
              No real money
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight mt-1">
            ₦125,000.00
          </div>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/15 text-[10px]">
            <div className="flex items-center gap-1 text-emerald-100">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>Demo account</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-white text-[#0A1411] font-bold text-[10px] flex items-center gap-1 shadow-xs">
              <SendHorizontal className="w-2.5 h-2.5 text-[#0D7855]" />
              <span>Send</span>
            </span>
          </div>
        </div>

        {/* 3 Recent Transactions: Clearly fake, completed bottom edge */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] px-0.5 font-semibold text-[var(--text-primary)]">
            <span>Recent Activity</span>
            <span className="text-[9px] text-[var(--brand-primary)] font-medium">3 Mock Records</span>
          </div>

          {DEMO_TRANSACTIONS.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-5 h-5 rounded-md ${tx.iconBg} flex items-center justify-center shrink-0`}>
                  {tx.isCredit ? (
                    <ArrowDownLeft className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  )}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-[var(--text-primary)] text-[10px] truncate leading-tight">
                    {tx.title}
                  </p>
                  <p className="text-[8px] text-[var(--text-muted)] truncate leading-tight">
                    {tx.subtitle}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-1.5">
                <p
                  className={`font-mono font-bold text-[10px] leading-tight ${
                    tx.isCredit ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {tx.amount}
                </p>
                <span className="text-[7px] font-semibold text-[var(--text-muted)] leading-none">
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Small Spending Chart: Inflow vs Outflow */}
        <div className="mt-2 p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between text-[9px] mb-1 font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-[var(--brand-primary)]" />
              <span>Weekly Money Flow</span>
            </span>
            <span className="text-[8px] text-[var(--text-muted)] font-mono">Demo Flow</span>
          </div>

          <div className="flex items-end justify-between gap-1 h-8 pt-0.5 px-1">
            {MINI_CHART_DAYS.map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end justify-center gap-0.5 h-6">
                  <div
                    className="w-1.5 bg-[var(--brand-primary)] rounded-t-xs"
                    style={{ height: `${bar.inflow}%` }}
                  />
                  <div
                    className="w-1.5 bg-[var(--accent-terracotta)] opacity-80 rounded-t-xs"
                    style={{ height: `${bar.outflow}%` }}
                  />
                </div>
                <span className="text-[7px] text-[var(--text-muted)] font-mono">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
