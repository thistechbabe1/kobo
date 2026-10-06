'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  SendHorizontal,
  Zap,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { DemoTipsDrawer } from './DemoTipsDrawer';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { label: 'Send Money', href: '/send', icon: SendHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Main Navigation Sidebar"
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 h-dvh flex-col bg-[var(--bg-surface)] border-r border-[var(--border-color)]"
      >
        {/* Top: Logo and Header (shrink-0) */}
        <div className="shrink-0 h-16 px-5 border-b border-[var(--border-color)] flex items-center">
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
        </div>

        {/* Middle: Navigation (flex-1, min-h-0, overflow-y-auto only if window is very short) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 themed-scrollbar">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive
                        ? 'text-white dark:text-[#0A1411]'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Compact Demo Guide Footer pinned at bottom (shrink-0) */}
        <div className="shrink-0 p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Demo Guide and Test Triggers"
            className="w-full flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-[var(--brand-soft)] text-[var(--brand-primary)] hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>Demo Guide &amp; Triggers</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--brand-primary)] text-white dark:text-[#0A1411] shrink-0">
              PIN 1234
            </span>
          </button>
        </div>
      </aside>

      <DemoTipsDrawer
        forceOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hideLauncher
      />
    </>
  );
}
