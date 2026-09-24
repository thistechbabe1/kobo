import Link from 'next/link';
import { Wallet, ArrowRight, ShieldCheck, Zap, Send, PieChart } from 'lucide-react';

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A1411] text-[#F4F6F5] selection:bg-[#14A877]/30 selection:text-[#14A877]">
      {/* Top Header */}
      <header className="w-full border-b border-[#203830] py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#14A877] text-[#0A1411] flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold font-heading text-white tracking-tight">
              Kobo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-[#14A877] text-[#0A1411] font-bold text-xs hover:bg-[#108A62] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14241F] border border-[#203830] text-[#14A877] text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>Fast, Reliable Digital Banking</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Send Money Faster, Manage Finances Smarter
        </h1>

        <p className="text-sm sm:text-base text-[#94A8A0] max-w-2xl mx-auto mt-6 leading-relaxed">
          Experience frictionless transfers, transparent fee-free payments, and effortless real-time tracking designed for modern Nigerian banking.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14A877] text-[#0A1411] font-bold text-sm hover:opacity-95 transition-transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-[#14A877]/10"
          >
            <span>Open Wallet Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14241F] border border-[#203830] text-white font-semibold text-sm hover:border-[#14A877] transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In to Account</span>
          </Link>
        </div>
      </section>

      {/* Product Feature Highlights */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-[#203830]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">Instant Money Transfers</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              Send money directly to any Nigerian commercial bank or fintech account in seconds with zero hidden delays.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">Real-Time Spending Insights</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              Track your monthly inflow, expenses, bills, and groceries with clear visual analytics and search filters.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#FF6B4A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">Bank-Grade Protection</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              Rest easy with encrypted sessions, biometric transaction PIN authorization, and instant activity alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#203830] text-center text-xs text-[#94A8A0]">
        <p className="flex items-center justify-center gap-2">
          <span>&copy; {new Date().getFullYear()} Kobo Digital Wallet. All rights reserved.</span>
        </p>
      </footer>
    </div>
  );
}
