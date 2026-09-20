import Link from 'next/link';
import { Wallet, ArrowRight, ShieldCheck, Zap, Lock, Smartphone, RefreshCw } from 'lucide-react';

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
              Launch Demo Wallet
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14241F] border border-[#203830] text-[#14A877] text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>Modern Digital Payments for Nigerian Tech</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Seamless Money Transfers &amp; Financial Control
        </h1>

        <p className="text-sm sm:text-base text-[#94A8A0] max-w-2xl mx-auto mt-6 leading-relaxed">
          Kobo is a portfolio digital wallet and payments dashboard engineered with Next.js App Router, strict TypeScript, Tailwind CSS, and sealed HTTP-only cookies.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14A877] text-[#0A1411] font-bold text-sm hover:opacity-95 transition-transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-[#14A877]/10"
          >
            <span>Explore Live Demo App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#14241F] border border-[#203830] text-white font-semibold text-sm hover:border-[#14A877] transition-all flex items-center justify-center gap-2"
          >
            <span>View GitHub Codebase</span>
          </a>
        </div>
      </section>

      {/* Product Feature Highlights */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-[#203830]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">WCAG AA Accessible</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              Strictly verified contrast ratios, keyboard navigation, visible focus rings, and prefers-reduced-motion safety.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#FF6B4A] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">jose Sealed Cookie State</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              AES-256-GCM JWE state persistence verified by unit tests to remain under 3 KB for Vercel serverless functions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#14241F] border border-[#203830] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A1411] text-[#14A877] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">Responsive Shell</h3>
            <p className="text-xs text-[#94A8A0] leading-relaxed">
              Custom responsive layout adapted for 390px mobile bottom navigation and 1440px desktop sidebar navigation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#203830] text-center text-xs text-[#94A8A0]">
        <p className="flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#14A877]" />
          <span>Kobo Demo Wallet • Educational Portfolio Project</span>
        </p>
      </footer>
    </div>
  );
}
