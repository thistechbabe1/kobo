'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowRightLeft, SendHorizontal, CreditCard, Settings, HelpCircle } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { label: 'Send Money', href: '/send', icon: SendHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside aria-label="Main Navigation Sidebar" className="hidden lg:flex flex-col w-64 bg-[var(--bg-surface)] border-r border-[var(--border-color)] p-4 shrink-0 min-h-[calc(100vh-4.25rem)] justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

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
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white dark:text-[#0A1411]' : 'text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Wallet Features
          </p>
          <nav className="space-y-1">
            <span className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-[var(--text-muted)] opacity-60 cursor-not-allowed">
              <CreditCard className="w-4 h-4" />
              <span>Cards (Coming Soon)</span>
            </span>
            <span className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-[var(--text-muted)] opacity-60 cursor-not-allowed">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </span>
          </nav>
        </div>
      </div>

      {/* Sidebar Footer Card */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <HelpCircle className="w-4 h-4 text-[var(--accent-terracotta)]" />
          <span>Need Help?</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-2">
          Kobo is a portfolio project designed for Nigerian financial tech.
        </p>
        <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/10 dark:bg-emerald-100/10 text-[10px] font-bold text-[var(--brand-primary)]">
          v1.0.0 Stable
        </span>
      </div>
    </aside>
  );
}
