import Link from 'next/link';
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Send,
  PieChart,
  Lock,
  CheckCircle2,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { AnimatedDashboardPreview } from '@/components/landing/AnimatedDashboardPreview';
import { DemoTipsDrawer } from '@/components/layout/DemoTipsDrawer';

export const metadata = {
  title: 'Kobo | Modern Digital Banking & Wallet for Nigeria',
  description:
    'Experience seamless NIP bank transfers with real 2026 CBN fee tiers, weekly spending insights, and bank-grade encrypted security.',
};

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A1411] text-[#F4F6F5] selection:bg-[#14A877]/30 selection:text-[#14A877] overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[#203830] bg-[#0A1411]/90 backdrop-blur-md py-3.5 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#14A877] text-[#0A1411] flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold font-heading text-white tracking-tight">
                Kobo
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#14A877] block -mt-1">
                Wallet
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#94A8A0]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#cbn-fees" className="hover:text-white transition-colors">
              CBN Fee Schedule
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security &amp; State
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-[#203830] text-white hover:border-[#14A877] font-semibold text-xs transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-[#14A877] text-[#0A1411] font-bold text-xs hover:bg-[#108A62] transition-transform hover:scale-[1.02] shadow-sm flex items-center gap-1.5"
            >
              <span>Try Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Top Product Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14241F] border border-[#203830] text-[#14A877] text-xs font-semibold mb-6 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" />
          <span>Nigeria&apos;s Cleanest Digital Wallet Experience</span>
        </div>

        {/* Product-First Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Every Kobo Accounted For. Effortless Transfers Across Nigeria.
        </h1>

        {/* Subhead */}
        <p className="text-sm sm:text-base text-[#94A8A0] max-w-2xl mx-auto mt-5 leading-relaxed">
          Instant 10-digit NUBAN bank transfers with official 2026 CBN regulatory fee tiers, weekly
          spending analytics, and bank-grade zero-log PIN security.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 mb-12 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14A877] text-[#0A1411] font-bold text-sm hover:opacity-95 transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-[#14A877]/15 cursor-pointer"
          >
            <span>⚡ Try One-Click Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14241F] border border-[#203830] text-white font-semibold text-sm hover:border-[#14A877] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to Wallet</span>
          </Link>
        </div>

        {/* Animated Dashboard Mockup Preview */}
        <AnimatedDashboardPreview />
      </section>

      {/* 3 Supporting Feature Sections */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#203830]/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#14A877]">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white mt-1">
            Engineered for Modern Nigerian Finance
          </h2>
          <p className="text-xs sm:text-sm text-[#94A8A0] mt-2">
            Built with strict adherence to national banking standards and delightful micro-interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1: Instant Transfers & Real CBN Fees */}
          <div
            id="cbn-fees"
            className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-4 hover:border-[#14A877]/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                Instant Transfers &amp; CBN Fees
              </h3>
              <p className="text-xs text-[#94A8A0] mt-1.5 leading-relaxed">
                Direct NUBAN account name resolution across 12 commercial and digital banks with verified
                2026 CBN regulatory fee tiers:
              </p>
            </div>
            <div className="space-y-1.5 text-[11px] pt-1 border-t border-[#203830]">
              <div className="flex justify-between py-1 border-b border-[#203830]/50">
                <span className="text-[#94A8A0]">Under ₦5,000</span>
                <span className="font-mono font-bold text-[#14A877]">Free (₦0)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#203830]/50">
                <span className="text-[#94A8A0]">₦5,000 – ₦50,000</span>
                <span className="font-mono font-bold text-white">₦10.00</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A8A0]">Over ₦50,000</span>
                <span className="font-mono font-bold text-white">₦50.00</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Real-Time Cash Flow Analytics */}
          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-4 hover:border-[#14A877]/50 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                Live Spending Analytics
              </h3>
              <p className="text-xs text-[#94A8A0] mt-1.5 leading-relaxed">
                Weekly cash-flow visualization comparing total inflow vs expenses with automated
                categorization:
              </p>
            </div>
            <div className="space-y-2 text-[11px] pt-1 border-t border-[#203830]">
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#14A877] shrink-0" />
                <span>Transfers, Salary, Groceries, Utilities, Airtime</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#14A877] shrink-0" />
                <span>Search by recipient, reference, or bank name</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#14A877] shrink-0" />
                <span>Responsive Light and Dark themes</span>
              </div>
            </div>
          </div>

          {/* Feature 3: Bank-Grade Protection */}
          <div
            id="security"
            className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-4 hover:border-[#14A877]/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#0A1411] text-[#FF6B4A] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                Zero-Log PIN &amp; Sealed State
              </h3>
              <p className="text-xs text-[#94A8A0] mt-1.5 leading-relaxed">
                Security-first architecture preventing fraud, duplicate debits, and credential theft:
              </p>
            </div>
            <div className="space-y-2 text-[11px] pt-1 border-t border-[#203830]">
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <Lock className="w-3.5 h-3.5 text-[#FF6B4A] shrink-0" />
                <span>15-min server lockout after 3 failed attempts</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <RefreshCw className="w-3.5 h-3.5 text-[#14A877] shrink-0" />
                <span>Server-side idempotency ring buffer</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A8A0]">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Encrypted AES-256-GCM session cookie state</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Callout Strip */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-[#14241F] to-[#0A1411] border border-[#203830] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold font-heading text-white">
              Ready to explore Nigeria&apos;s digital wallet?
            </h3>
            <p className="text-xs text-[#94A8A0]">
              Instant sign-in with pre-funded demo account. No registration or real money required.
            </p>
          </div>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-[#14A877] text-[#0A1411] font-bold text-xs hover:bg-[#108A62] transition-transform hover:scale-105 shrink-0 flex items-center gap-2 shadow-md cursor-pointer"
          >
            <span>Launch Demo Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Demoted "Built With" Strip & Footer */}
      <footer className="py-10 border-t border-[#203830] text-center text-xs text-[#94A8A0] px-4 space-y-4">
        {/* Small "Built with" strip demoted to bottom */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#94A8A0]/80">
          <span className="font-semibold text-white/70">Built with:</span>
          <span>Next.js 15</span>
          <span>•</span>
          <span>React 19</span>
          <span>•</span>
          <span>TypeScript</span>
          <span>•</span>
          <span>Tailwind CSS</span>
          <span>•</span>
          <span>JOSE (AES-256-GCM)</span>
          <span>•</span>
          <span>Recharts</span>
          <span>•</span>
          <span>Framer Motion</span>
        </div>

        <p className="text-[11px] text-[#94A8A0]/60 max-w-md mx-auto">
          &copy; {new Date().getFullYear()} Kobo Digital Wallet. Demo simulation environment for portfolio
          evaluation. No real banking credentials or currency involved.
        </p>
      </footer>

      {/* Persistent Floating Demo Tips & Triggers Drawer */}
      <DemoTipsDrawer />
    </div>
  );
}
