'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowRightLeft, SendHorizontal } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Send Money', href: '/send', icon: SendHorizontal, isCTA: true },
  { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile Navigation Bar" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-color)] px-4 py-2 transition-colors duration-200 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          if (item.isCTA) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Send Money Quick Action"
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center justify-center -mt-6 group focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] rounded-full"
              >
                <div className="w-13 h-13 rounded-full bg-[var(--brand-primary)] text-white dark:text-[#0A1411] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-[var(--brand-primary)] mt-1">
                  Send
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-3 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
                isActive
                  ? 'text-[var(--brand-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[var(--brand-primary)]' : ''}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
