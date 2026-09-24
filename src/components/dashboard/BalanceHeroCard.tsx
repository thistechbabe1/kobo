'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SendHorizontal, History, ShieldCheck } from 'lucide-react';

interface BalanceHeroCardProps {
  balanceKobo: number;
}

export function BalanceHeroCard({ balanceKobo }: BalanceHeroCardProps) {
  const [displayKobo, setDisplayKobo] = useState<number>(balanceKobo);
  const formattedFinal = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(balanceKobo / 100);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasAnimated = sessionStorage.getItem('kobo_has_animated');

    if (prefersReducedMotion || hasAnimated) {
      requestAnimationFrame(() => setDisplayKobo(balanceKobo));
      return;
    }

    // Run count-up animation once per session
    sessionStorage.setItem('kobo_has_animated', 'true');
    const duration = 1200; // ms
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out quad
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      setDisplayKobo(Math.round(balanceKobo * easedProgress));

      if (currentStep >= steps) {
        setDisplayKobo(balanceKobo);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [balanceKobo]);

  const formattedAnimated = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(displayKobo / 100);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] p-6 sm:p-8 shadow-xl transition-all">
      {/* Subtle Low-Contrast Geometric SVG Pattern Background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <pattern id="hero-geo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40L40 0M0 0l40 40M20 0v40M0 20h40" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-geo-grid)" />
      </svg>

      <div className="relative z-10 flex flex-col justify-between min-h-[160px]">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-85 block">
              Total Available Wallet Balance
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-90 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300 dark:text-emerald-950" />
              <span>Kobo Verified Digital Account</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/15 dark:bg-black/15 text-[10px] font-bold tracking-wide backdrop-blur-xs">
            Tier 3 Verified
          </span>
        </div>

        {/* Hero Balance Display */}
        <div className="my-4">
          {/* Accessible screen reader announcement */}
          <span className="sr-only">Available Balance: {formattedFinal}</span>

          {/* Visual animated display hidden from screen readers */}
          <h1
            aria-hidden="true"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tabular-nums tracking-tight"
          >
            {formattedAnimated}
          </h1>
        </div>

        {/* Action Buttons: Send Money & View History (Removed Fund Wallet) */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/send"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1411] text-[var(--brand-primary)] dark:text-[#14A877] font-semibold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Send Money</span>
          </Link>

          <Link
            href="/transactions"
            className="px-4 py-2.5 rounded-xl bg-white/15 dark:bg-black/15 hover:bg-white/25 text-white dark:text-[#0A1411] font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <History className="w-4 h-4" />
            <span>View History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
