'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  SendHorizontal,
  Menu,
  Zap,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DemoTipsDrawer } from './DemoTipsDrawer';
import { AUTH_COOKIE_NAME } from '@/proxy';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Send', href: '/send', icon: SendHorizontal },
  { label: 'Activity', href: '/transactions', icon: ArrowRightLeft },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `kobo_state=; path=/; max-age=0; SameSite=Lax`;
    router.push('/login');
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      {/* Backdrop when mobile menu sheet is open */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        ref={menuRef}
        aria-label="Mobile Navigation Bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-color)] transition-colors duration-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      >
        {/* Clean slide-up mobile menu sheet */}
        {menuOpen && (
          <div
            role="menu"
            aria-label="Mobile Menu Options"
            className="mx-3 mt-3 mb-1 p-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xl space-y-1"
          >
            <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--border-color)] mb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Babatunde A. • Tier 3 Wallet
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                Verified
              </span>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setDrawerOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-current" />
                </span>
                <span>Demo Guide &amp; Test Triggers</span>
              </span>
              <span className="text-[10px] font-bold text-[var(--brand-primary)]">
                PIN 1234
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <span className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </span>
              <span>Sign Out of Wallet</span>
            </button>
          </div>
        )}

        {/* Uniform 4-column bottom bar — no protruding circle overlapping content */}
        <div className="grid grid-cols-4 gap-1 px-3 pt-2 pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))] max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
                  isActive
                    ? 'bg-[var(--brand-primary)]/12 text-[var(--brand-primary)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/60 font-medium'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 transition-colors ${
                    isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'
                  }`}
                />
                <span className="text-[11px] leading-tight tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 4th item: Menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open mobile menu"
            aria-expanded={menuOpen}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              menuOpen
                ? 'bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/60 font-medium'
            }`}
          >
            {menuOpen ? (
              <X className="w-5 h-5 mb-0.5" />
            ) : (
              <Menu className="w-5 h-5 mb-0.5 text-[var(--brand-primary)]" />
            )}
            <span className="text-[11px] leading-tight tracking-tight">
              Menu
            </span>
          </button>
        </div>
      </nav>

      <DemoTipsDrawer
        forceOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hideLauncher
      />
    </>
  );
}
