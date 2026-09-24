'use client';

import Link from 'next/link';
import { CompactUserTx } from '@/lib/session';
import { ArrowUpRight, ArrowDownLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface RecentTransactionsListProps {
  transactions: CompactUserTx[];
}

export function RecentTransactionsList({ transactions }: RecentTransactionsListProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h2 className="text-base font-bold font-heading text-[var(--text-primary)]">
            Recent Transactions
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Latest wallet activity &amp; payments
          </p>
        </div>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-xs text-[var(--text-muted)]">
          No recent transactions found.
        </div>
      ) : (
        <motion.ul
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {transactions.slice(0, 5).map((tx) => {
            const isCredit = tx.typ === 'C';
            const formattedAmount = (tx.amt / 100).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            });

            const formattedDate = new Date(tx.ts).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <motion.li
                key={tx.id}
                variants={itemVariants}
                className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--brand-primary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Semantic Direction Icon + Background */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit
                        ? 'bg-emerald-950/10 dark:bg-emerald-100/10 text-[var(--brand-primary)] dark:text-[#14A877]'
                        : 'bg-red-950/10 dark:bg-red-100/10 text-[var(--accent-deep-terracotta)] dark:text-[#FF6B4A]'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5" />
                    )}
                  </div>

                  <div className="text-xs">
                    <p className="font-semibold text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-xs">
                      {tx.nar}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{tx.id}</span>
                    </div>
                  </div>
                </div>

                {/* Amount with Explicit +/- Signs and WCAG AA Dark Debit Text (#FF6B4A) */}
                <div className="text-right text-xs shrink-0 pl-2">
                  <p
                    className={`font-mono font-bold tabular-nums ${
                      isCredit
                        ? 'text-[var(--brand-primary)] dark:text-[#14A877]'
                        : 'text-[var(--accent-deep-terracotta)] dark:text-[#FF6B4A]'
                    }`}
                  >
                    {isCredit ? `+₦${formattedAmount}` : `-₦${formattedAmount}`}
                  </p>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isCredit
                        ? 'bg-emerald-950/10 dark:bg-emerald-100/10 text-[var(--brand-primary)] dark:text-[#14A877]'
                        : 'bg-red-950/10 dark:bg-red-100/10 text-[var(--accent-deep-terracotta)] dark:text-[#FF6B4A]'
                    }`}
                  >
                    {isCredit ? 'Credit' : 'Debit'}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
