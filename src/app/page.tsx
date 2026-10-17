/**
 * Marketing landing page presenting product features, animated dashboard preview,
 * CBN-modelled fee schedules, and demo login entry points.
 */
import Link from 'next/link';
import {
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
import { DemoGuideLink } from '@/components/layout/DemoGuideLink';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BrandLogo } from '@/components/ui';

export const metadata = {
  title: 'Kobo | Modern Digital Banking & Wallet for Nigeria',
  description:
    'A demo wallet for Nigerian payments with 10-digit NUBAN transfers, fee tiers modelled on CBN guidance, spending analytics, and a PIN flow. No real money moves.',
};

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-color)] bg-[var(--bg-surface)]/90 backdrop-blur-md py-2.5 sm:py-3 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo href="/" />

          <nav className="hidden md:flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">
              Features
            </a>
            <a href="#cbn-fees" className="hover:text-[var(--text-primary)] transition-colors">
              CBN Fee Schedule
            </a>
            <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">
              Security &amp; State
            </a>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] font-semibold text-xs transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-bold text-xs hover:opacity-95 transition-transform hover:scale-[1.02] shadow-xs flex items-center gap-1.5"
            >
              <span>Try Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Two-Column Hero Section: min-height with svh units, vertically centered */}
      <section className="relative min-h-[calc(100svh-3.5rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-4 sm:py-6 lg:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-center w-full">
          {/* Left Column: Product tag, headline, subhead, CTA buttons */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-2.5 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-soft)] border border-[var(--border-color)] text-[var(--brand-primary)] text-[11px] sm:text-xs font-semibold shadow-xs">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" />
              <span>A demo wallet for Nigerian payments</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-4xl xl:text-5xl font-extrabold font-heading text-[var(--text-primary)] tracking-tight leading-[1.15] max-w-xl">
              Every Kobo Accounted For. Effortless Transfers Across Nigeria.
            </h1>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg leading-relaxed">
              A demo wallet with 10-digit NUBAN transfers, fee tiers modelled on CBN guidance, spending
              analytics and a PIN flow. No real money moves.
            </p>

            <div className="pt-1 flex flex-col items-center lg:items-start gap-2 w-full sm:w-auto">
              <div className="flex flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
                <Link
                  href="/login"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-bold text-xs sm:text-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>⚡ Try Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm hover:border-[var(--brand-primary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Sign In</span>
                </Link>
              </div>

              {/* Mobile text link with 44px touch target (below sm only) */}
              <div className="sm:hidden">
                <DemoGuideLink />
              </div>
            </div>
          </div>

          {/* Right Column: Compact Animated Preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <AnimatedDashboardPreview />
          </div>
        </div>
      </section>

      {/* 3 Supporting Feature Sections */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[var(--border-color)]">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)] mt-1">
            Engineered for Modern Nigerian Finance
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2">
            Built with strict adherence to national banking standards and delightful micro-interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1: Instant Transfers & Real CBN Fees */}
          <div
            id="cbn-fees"
            className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-4 hover:border-[var(--brand-primary)]/50 transition-colors shadow-xs"
          >
            <div className="w-11 h-11 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                Instant Transfers &amp; CBN Fees
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Direct NUBAN account name resolution across 12 commercial and digital banks with fee
                tiers modelled on CBN guidance:
              </p>
            </div>
            <div className="space-y-1.5 text-[11px] pt-1 border-t border-[var(--border-color)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="text-[var(--text-muted)]">Under ₦5,000</span>
                <span className="font-mono font-bold text-[var(--brand-primary)]">Free (₦0)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="text-[var(--text-muted)]">₦5,000 – ₦50,000</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">₦10.00</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Over ₦50,000</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">₦50.00</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Real-Time Cash Flow Analytics */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-4 hover:border-[var(--brand-primary)]/50 transition-colors shadow-xs">
            <div className="w-11 h-11 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                Live Spending Analytics
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Weekly cash-flow visualization comparing total inflow vs expenses with automated
                categorization:
              </p>
            </div>
            <div className="space-y-2 text-[11px] pt-1 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                <span>Transfers, Salary, Groceries, Utilities, Airtime</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                <span>Search by recipient, reference, or bank name</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                <span>Responsive Light and Dark themes</span>
              </div>
            </div>
          </div>

          {/* Feature 3: Security & Sealed State */}
          <div
            id="security"
            className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-4 hover:border-[var(--brand-primary)]/50 transition-colors shadow-xs"
          >
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                Zero-Log PIN &amp; Sealed State
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                The PIN is never logged or stored. Security-first architecture preventing duplicate debits
                and credential theft:
              </p>
            </div>
            <div className="space-y-2 text-[11px] pt-1 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>15-min server lockout after 3 failed attempts</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                <span>Server-side idempotency ring buffer</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Encrypted AES-256-GCM session cookie state</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Callout Strip */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-primary)] border border-[var(--border-color)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold font-heading text-[var(--text-primary)]">
              Ready to explore Nigeria&apos;s digital wallet?
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Instant sign-in with pre-funded demo account. No registration or real money required.
            </p>
          </div>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-bold text-xs hover:opacity-95 transition-transform hover:scale-105 shrink-0 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Launch Demo Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Demoted "Built With" Strip & Footer */}
      <footer className="py-10 border-t border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] px-4 space-y-4">
        <div className="flex items-center justify-center">
          <DemoGuideLink label="Explore Demo Guide &amp; Test Triggers" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">Built with:</span>
          <span>Next.js 16</span>
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
          <span>Motion</span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] max-w-md mx-auto">
          &copy; {new Date().getFullYear()} Kobo Digital Wallet. Demo simulation environment for portfolio
          evaluation. No real banking credentials or currency involved.
        </p>
      </footer>

      {/* Persistent Floating Demo Tips & Triggers Drawer */}
      <DemoTipsDrawer />
    </div>
  );
}
