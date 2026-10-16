'use client';

import { ReactNode } from 'react';
import { Beneficiary } from '@/lib/beneficiaries';
import { UserCheck } from 'lucide-react';

interface BeneficiaryRailProps {
  beneficiaries: Beneficiary[];
  selectedBankCode?: string;
  selectedAccountNumber?: string;
  onSelectBeneficiary: (beneficiary: Beneficiary) => void;
  disabled?: boolean;
  emptyState?: ReactNode;
}

const BANK_INITIAL_COLORS: Record<string, { bg: string; text: string }> = {
  '058': { bg: 'bg-orange-500/15 dark:bg-orange-500/25', text: 'text-orange-700 dark:text-orange-300' }, // GTBank
  '044': { bg: 'bg-blue-500/15 dark:bg-blue-500/25', text: 'text-blue-700 dark:text-blue-300' }, // Access Bank
  '057': { bg: 'bg-red-500/15 dark:bg-red-500/25', text: 'text-red-700 dark:text-red-300' }, // Zenith
  '011': { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-700 dark:text-amber-300' }, // First Bank
  '033': { bg: 'bg-rose-500/15 dark:bg-rose-500/25', text: 'text-rose-700 dark:text-rose-300' }, // UBA
};

export function BeneficiaryRail({
  beneficiaries,
  selectedBankCode,
  selectedAccountNumber,
  onSelectBeneficiary,
  disabled = false,
  emptyState,
}: BeneficiaryRailProps) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="space-y-2.5" data-testid="beneficiary-rail">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <UserCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>Quick Send to Beneficiary</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)] font-mono">
          {beneficiaries.length} saved
        </span>
      </div>

      <div
        role="region"
        aria-label="Saved Beneficiaries"
        className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth focus:outline-none"
        tabIndex={0}
      >
        {beneficiaries.map((b) => {
          const isSelected =
            selectedBankCode === b.bankCode && selectedAccountNumber === b.accountNumber;
          const color = BANK_INITIAL_COLORS[b.bankCode] || {
            bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
            text: 'text-emerald-700 dark:text-emerald-300',
          };
          const initials = b.bankShortName?.slice(0, 3) || b.bankCode;

          return (
            <button
              key={b.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectBeneficiary(b)}
              aria-label={`Send to ${b.recipientName}, ${b.bankName}`}
              className={`group shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] ${
                isSelected
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--brand-primary)]/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold tracking-wider shrink-0 ${color.bg} ${color.text}`}
              >
                {initials}
              </div>
              <div className="min-w-0 pr-1">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[130px]">
                  {b.recipientName}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[130px] font-mono">
                  {b.bankShortName} •••• {b.accountNumber.slice(-4)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
