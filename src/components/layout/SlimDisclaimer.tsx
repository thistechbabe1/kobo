'use client';

import { ShieldAlert } from 'lucide-react';

export function SlimDisclaimer() {
  return (
    <div className="w-full bg-emerald-950 text-emerald-100 dark:bg-emerald-950/90 dark:text-emerald-200 text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-b border-emerald-800/50">
      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>
        <strong className="font-semibold text-amber-300">DEMO MODE:</strong> Simulated digital wallet only. All balances, account numbers, and transactions are fake. No real money is involved.
      </span>
    </div>
  );
}
