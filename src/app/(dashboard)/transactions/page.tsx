import { cookies } from 'next/headers';
import { TransactionBrowser } from '@/components/transactions/TransactionBrowser';
import { COOKIE_NAME, getSeededTransactions, unsealSessionState } from '@/lib/session';

export default async function TransactionsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  const session = await unsealSessionState(sessionCookie?.value);

  const transactions = [...session.txs, ...getSeededTransactions()].sort((a, b) => b.ts - a.ts);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Wallet Activity</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">Transactions</h1>
        </div>
      </div>

      <TransactionBrowser transactions={transactions} />
    </div>
  );
}
