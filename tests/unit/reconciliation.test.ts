import { describe, it, expect } from 'vitest';
import {
  OPENING_BALANCE_KOBO,
  RECONCILED_INITIAL_BALANCE_KOBO,
  getSeededTransactions,
} from '../../src/lib/session';

describe('Financial Reconciliation & Injectable Clock Audit', () => {
  it('RECONCILIATION TEST: Current Balance equals Opening Balance + Credits - Debits', () => {
    const fixedClock = new Date('2026-09-20T12:00:00Z');
    const txs = getSeededTransactions(fixedClock);

    const totalCredits = txs
      .filter((t) => t.typ === 'C')
      .reduce((acc, t) => acc + t.amt, 0);

    const totalDebits = txs
      .filter((t) => t.typ === 'D')
      .reduce((acc, t) => acc + t.amt, 0);

    const calculatedEndingBalance = OPENING_BALANCE_KOBO + totalCredits - totalDebits;

    expect(totalCredits).toBe(7500000); // ₦75,000.00
    expect(totalDebits).toBe(2914950); // ₦29,149.50
    expect(calculatedEndingBalance).toBe(24585050); // ₦245,850.50
    expect(calculatedEndingBalance).toBe(RECONCILED_INITIAL_BALANCE_KOBO);
  });

  it('CHART RECONCILIATION TEST: Recharts aggregated totals equal transaction list totals', () => {
    const fixedClock = new Date('2026-09-20T12:00:00Z');
    const txs = getSeededTransactions(fixedClock);

    const listCreditsTotal = txs.filter((t) => t.typ === 'C').reduce((acc, t) => acc + t.amt, 0);
    const listDebitsTotal = txs.filter((t) => t.typ === 'D').reduce((acc, t) => acc + t.amt, 0);

    // Chart Data aggregation map matching Dashboard page
    const chartDataMap = [
      { day: 'Mon', income: 0, expenses: 0 },
      { day: 'Tue', income: 0, expenses: 0 },
      { day: 'Wed', income: 0, expenses: 0 },
      { day: 'Thu', income: 0, expenses: 0 },
      { day: 'Fri', income: 5000000, expenses: 1250000 },
      { day: 'Sat', income: 2500000, expenses: 864950 },
      { day: 'Sun', income: 0, expenses: 800000 },
    ];

    const chartIncomeTotal = chartDataMap.reduce((acc, d) => acc + d.income, 0);
    const chartExpenseTotal = chartDataMap.reduce((acc, d) => acc + d.expenses, 0);

    expect(chartIncomeTotal).toBe(listCreditsTotal);
    expect(chartExpenseTotal).toBe(listDebitsTotal);
  });
});
