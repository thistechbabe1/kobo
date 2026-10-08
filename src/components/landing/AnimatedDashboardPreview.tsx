'use client';

import { motion } from 'motion/react';
import {
  SendHorizontal,
  History,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
} from 'lucide-react';

export function AnimatedDashboardPreview() {
  const chartBars = [
    { day: 'M', inc: 35, exp: 15 },
    { day: 'T', inc: 20, exp: 25 },
    { day: 'W', inc: 45, exp: 20 },
    { day: 'T', inc: 30, exp: 40 },
    { day: 'F', inc: 85, exp: 35 },
    { day: 'S', inc: 60, exp: 50 },
    { day: 'S', inc: 15, exp: 30 },
  ];

  return (
    <div className="relative mx-auto max-w-4xl w-full">
      {/* Decorative Glow */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-[#14A877]/15 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Glass Mockup Container */}
      <div className="relative rounded-3xl border border-[#203830] bg-[#14241F]/90 backdrop-blur-xl shadow-2xl p-4 sm:p-6 text-left overflow-hidden">
        {/* Mock Browser/App Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#203830]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] text-[#94A8A0] font-mono ml-2 hidden sm:inline">
              app.kobo.demo/dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#14A877]/10 text-[#14A877] text-[10px] font-semibold border border-[#14A877]/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14A877] animate-pulse" />
              Live Demo Session
            </span>
            <span className="text-xs text-[#94A8A0] font-medium hidden sm:inline">
              Babatunde A.
            </span>
          </div>
        </div>

        {/* Dashboard Grid Mockup */}
        <div className="space-y-4">
          {/* Hero Balance Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D7855] to-[#0A4D37] text-white p-5 sm:p-6 shadow-lg border border-[#14A877]/30">
            {/* Subtle SVG geometric grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
              aria-hidden="true"
            >
              <pattern id="landing-geo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M0 30L30 0M0 0l30 30" stroke="currentColor" strokeWidth="0.75" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#landing-geo-grid)" />
            </svg>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                    Total Available Balance
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                    Tier 3 Verified
                  </span>
                </div>
                <div className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight mt-1">
                  ₦245,850.50
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CBN Fee Compliant • Bank-Grade Security Design</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-xl bg-white text-[#0A1411] font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <SendHorizontal className="w-3.5 h-3.5 text-[#0D7855]" />
                  <span>Send Money</span>
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                </span>
              </div>
            </div>
          </div>

          {/* Analytics & Recent Activity Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mini Spending Analytics Card */}
            <div className="p-4 rounded-2xl bg-[#0A1411]/60 border border-[#203830] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#14A877]" />
                  <span>Weekly Inflow &amp; Outflow</span>
                </span>
                <span className="text-[10px] text-[#94A8A0] font-mono">+₦75,000 Net</span>
              </div>

              {/* Animated Bar Graph */}
              <div className="flex items-end justify-between gap-2 h-24 pt-2">
                {chartBars.map((bar, i) => (
                  <div key={bar.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-1 h-20">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${bar.inc}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="w-2 sm:w-2.5 bg-[#14A877] rounded-t-sm"
                      />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${bar.exp}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                        className="w-2 sm:w-2.5 bg-[#FF6B4A]/80 rounded-t-sm"
                      />
                    </div>
                    <span className="text-[10px] text-[#94A8A0] font-medium">{bar.day}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 text-[10px] pt-1 border-t border-[#203830]/60">
                <span className="flex items-center gap-1 text-[#94A8A0]">
                  <span className="w-2 h-2 rounded-xs bg-[#14A877]" /> Inflow (₦75k)
                </span>
                <span className="flex items-center gap-1 text-[#94A8A0]">
                  <span className="w-2 h-2 rounded-xs bg-[#FF6B4A]" /> Outflow (₦29k)
                </span>
              </div>
            </div>

            {/* Mini Recent Transactions Card */}
            <div className="p-4 rounded-2xl bg-[#0A1411]/60 border border-[#203830] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Recent Transactions</span>
                <span className="text-[10px] text-[#14A877] font-semibold">Live Feed</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Tx 1 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#14241F]/60 border border-[#203830]/60">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 text-[#FF6B4A] flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-white truncate text-[11px]">Chioma Adebayo</p>
                      <p className="text-[9px] text-[#94A8A0]">Kuda Bank • Transfer</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-white text-[11px]">-₦15,000.00</p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Tx 2 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#14241F]/60 border border-[#203830]/60">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#14A877] flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-white truncate text-[11px]">Paystack Nigeria Ltd</p>
                      <p className="text-[9px] text-[#94A8A0]">GTBank • Salary</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-[#14A877] text-[11px]">+₦50,000.00</p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      Settled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Interactive Badge (Animated) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A1411]/90 border border-[#14A877]/40 text-[#14A877] text-[11px] font-semibold shadow-xl backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>NIP Instant Settlement • ₦0 CBN Fee (&lt; ₦5k)</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
