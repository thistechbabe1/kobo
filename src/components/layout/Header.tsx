'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Wallet, User, LogOut } from 'lucide-react';
import { AUTH_COOKIE_NAME } from '@/proxy';

export function Header() {
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `kobo_state=; path=/; max-age=0; SameSite=Lax`;
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-[var(--bg-surface)] border-b border-[var(--border-color)] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title (Mobile/Tablet; on lg+ it lives at the top of the fixed Sidebar) */}
        <Link
          href="/dashboard"
          aria-label="Kobo Wallet Home"
          className="lg:hidden flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] rounded-lg p-1"
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
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Light/Dark Theme Switcher */}
          <ThemeToggle />

          {/* User Avatar Badge */}
          <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-[var(--border-color)]">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-primary)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-[var(--text-primary)] leading-none">Babatunde A.</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Verified Account</p>
            </div>
          </div>

          {/* Logout — desktop only (mobile uses BottomNav) */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
