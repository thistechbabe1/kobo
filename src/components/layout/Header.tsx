'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { Wallet, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full bg-[var(--bg-surface)] border-b border-[var(--border-color)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link 
          href="/dashboard" 
          aria-label="Kobo Wallet Home"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] rounded-lg p-1"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold font-heading tracking-tight text-[var(--text-primary)]">
              Kobo
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)] block -mt-1">
              Wallet
            </span>
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Light/Dark Theme Switcher */}
          <ThemeToggle />

          {/* User Avatar Badge */}
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-[var(--border-color)]">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/10 dark:bg-emerald-100/10 border border-[var(--brand-primary)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-[var(--text-primary)] leading-none">Babatunde A.</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Verified Account</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
