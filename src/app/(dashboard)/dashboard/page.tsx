import { cookies } from 'next/headers';
import { COOKIE_NAME, unsealSessionState, getSeededTransactions } from '@/lib/session';
import { BalanceHeroCard } from '@/components/dashboard/BalanceHeroCard';
import { SpendingAnalyticsChart } from '@/components/dashboard/SpendingAnalyticsChart';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  const userSession = await unsealSessionState(sessionCookie?.value);

  // Combine seeded historical transactions with user compact transactions
  const seededTxs = getSeededTransactions();
  const allTransactions = [...userSession.txs, ...seededTxs];

  // Reconcile Chart Data (income vs expenses aggregated across days)
  const chartDataMap: Record<string, { income: number; expenses: number }> = {
    Mon: { income: 0, expenses: 0 },
    Tue: { income: 0, expenses: 0 },
    Wed: { income: 0, expenses: 0 },
    Thu: { income: 0, expenses: 0 },
    Fri: { income: 5000000, expenses: 1250000 },
    Sat: { income: 2500000, expenses: 864950 },
    Sun: { income: 0, expenses: 800000 },
  };

  const chartData = Object.entries(chartDataMap).map(([day, val]) => ({
    day,
    income: val.income,
    expenses: val.expenses,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Balance Card */}
      <BalanceHeroCard balanceKobo={userSession.bal} />

      {/* Main Grid: Spending Analytics Chart & Recent Transactions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Weekly Money Flow Chart */}
        <SpendingAnalyticsChart data={chartData} />

        {/* Recent Activity List */}
        <RecentTransactionsList transactions={allTransactions} />
      </div>
    </div>
  );
}
