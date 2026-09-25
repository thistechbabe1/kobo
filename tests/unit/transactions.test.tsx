// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TransactionBrowser } from '@/components/transactions/TransactionBrowser';
import {
  parseTransactionParams,
  toLagosDateString,
  transactionMatchesDateRange,
  filterTransactions,
  type TransactionFilterState,
} from '@/lib/transactions';
import { CompactUserTx } from '@/lib/session';

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

const staticSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/transactions',
  useSearchParams: () => staticSearchParams,
}));

const seedTransactions: CompactUserTx[] = [
  { id: 'TX1', typ: 'C', cat: 'SAL', amt: 500000, nar: 'Salary', rec: 'Employer', ts: Date.UTC(2024, 0, 1, 9, 0), status: 'Completed' },
  { id: 'TX2', typ: 'D', cat: 'GRO', amt: 250000, nar: 'Groceries', rec: 'Market', ts: Date.UTC(2024, 0, 2, 12, 0), status: 'Pending' },
  { id: 'TX3', typ: 'D', cat: 'UTL', amt: 80000, nar: 'Electricity', rec: 'Eko', ts: Date.UTC(2024, 0, 3, 0, 30), status: 'Failed' },
  { id: 'TX4', typ: 'C', cat: 'TRF', amt: 150000, nar: 'Transfer in', rec: 'Chinedu', ts: Date.UTC(2024, 0, 10, 20, 0), status: 'Completed' },
];

describe('transaction URL param validation with Zod', () => {
  it('falls back to safe defaults for non-numeric page parameter (page=abc)', () => {
    const parsed = parseTransactionParams(new URLSearchParams('page=abc'));
    expect(parsed.page).toBe(1);

    const negativeParsed = parseTransactionParams(new URLSearchParams('page=-5'));
    expect(negativeParsed.page).toBe(1);
  });

  it('falls back to safe default page 1 for out-of-range page parameter (page=99999)', () => {
    const parsed = parseTransactionParams(new URLSearchParams('page=99999'));
    expect(parsed.page).toBe(1);
  });

  it('falls back to empty dates when from is later than to (from > to)', () => {
    const parsed = parseTransactionParams(new URLSearchParams('from=2024-05-10&to=2024-05-01'));
    expect(parsed.from).toBe('');
    expect(parsed.to).toBe('');
  });

  it('falls back to ALL for unknown category', () => {
    const parsed = parseTransactionParams(new URLSearchParams('cat=CRYPTO_UNKNOWN'));
    expect(parsed.category).toBe('ALL');
  });

  it('falls back to ALL for unknown type', () => {
    const parsed = parseTransactionParams(new URLSearchParams('typ=UNKNOWN'));
    expect(parsed.type).toBe('ALL');
  });

  it('falls back to ALL for unknown status', () => {
    const parsed = parseTransactionParams(new URLSearchParams('status=UNKNOWN_STATUS'));
    expect(parsed.status).toBe('ALL');
  });

  it('falls back to date_desc for unknown sort order', () => {
    const parsed = parseTransactionParams(new URLSearchParams('sort=fastest_first'));
    expect(parsed.sort).toBe('date_desc');
  });

  it('accepts and preserves valid URL parameters', () => {
    const params = new URLSearchParams('page=2&cat=GRO&typ=D&sort=amount_asc&status=Pending&from=2024-01-01&to=2024-01-05');
    const parsed = parseTransactionParams(params);

    expect(parsed).toMatchObject({
      page: 2,
      category: 'GRO',
      type: 'D',
      sort: 'amount_asc',
      status: 'Pending',
      from: '2024-01-01',
      to: '2024-01-05',
    });
  });
});

describe('Africa/Lagos calendar day date boundaries', () => {
  it('correctly maps timestamps across UTC/Lagos boundary (UTC+1)', () => {
    // 23:00 UTC on Jan 1 is 00:00:00 on Jan 2 in Lagos
    const midnightLagos = Date.UTC(2024, 0, 1, 23, 0);
    expect(toLagosDateString(midnightLagos)).toBe('2024-01-02');

    // 22:59 UTC on Jan 1 is 23:59:00 on Jan 1 in Lagos
    const beforeMidnightLagos = Date.UTC(2024, 0, 1, 22, 59);
    expect(toLagosDateString(beforeMidnightLagos)).toBe('2024-01-01');
  });

  it('matches inclusive boundaries on whole calendar days', () => {
    const targetDate = '2024-01-02';
    // Exact start of Jan 2 in Lagos (23:00 UTC on Jan 1)
    const lagosStartOfDay = Date.UTC(2024, 0, 1, 23, 0);
    expect(transactionMatchesDateRange(lagosStartOfDay, targetDate, targetDate)).toBe(true);

    // Exact end of Jan 2 in Lagos (22:59:59 UTC on Jan 2)
    const lagosEndOfDay = Date.UTC(2024, 0, 2, 22, 59, 59);
    expect(transactionMatchesDateRange(lagosEndOfDay, targetDate, targetDate)).toBe(true);

    // Outside bounds
    const justBefore = Date.UTC(2024, 0, 1, 22, 59, 59);
    expect(transactionMatchesDateRange(justBefore, targetDate, targetDate)).toBe(false);

    const justAfter = Date.UTC(2024, 0, 2, 23, 0, 1);
    expect(transactionMatchesDateRange(justAfter, targetDate, targetDate)).toBe(false);
  });

  it('filters transactions accurately according to Africa/Lagos calendar day bounds', () => {
    const txs: CompactUserTx[] = [
      { id: 'T1', typ: 'D', cat: 'GRO', amt: 1000, nar: 'Tx 1', ts: Date.UTC(2024, 0, 1, 22, 59), status: 'Completed' }, // Jan 1 Lagos
      { id: 'T2', typ: 'D', cat: 'GRO', amt: 2000, nar: 'Tx 2', ts: Date.UTC(2024, 0, 1, 23, 1), status: 'Completed' },  // Jan 2 Lagos
      { id: 'T3', typ: 'D', cat: 'GRO', amt: 3000, nar: 'Tx 3', ts: Date.UTC(2024, 0, 2, 22, 59), status: 'Completed' },  // Jan 2 Lagos
      { id: 'T4', typ: 'D', cat: 'GRO', amt: 4000, nar: 'Tx 4', ts: Date.UTC(2024, 0, 2, 23, 1), status: 'Completed' },  // Jan 3 Lagos
    ];

    const defaultFilters: TransactionFilterState = {
      page: 1,
      pageSize: 10,
      category: 'ALL',
      type: 'ALL',
      status: 'ALL',
      sort: 'date_desc',
      search: '',
      from: '2024-01-02',
      to: '2024-01-02',
    };

    const result = filterTransactions(txs, defaultFilters);
    expect(result.totalResults).toBe(2);
    expect(result.transactions.map(t => t.id)).toEqual(['T3', 'T2']);
  });
});

describe('transaction browser UI and edge cases', () => {
  it('handles zero-amount transaction cleanly without calculation errors or NaN', async () => {
    const zeroAmountTx: CompactUserTx[] = [
      { id: 'TX0', typ: 'D', cat: 'UTL', amt: 0, nar: 'Zero fee verification', rec: 'Bank System', ts: Date.UTC(2024, 0, 5, 12, 0), status: 'Completed' },
      { id: 'TX1', typ: 'C', cat: 'SAL', amt: 50000, nar: 'Regular salary', rec: 'Employer', ts: Date.UTC(2024, 0, 6, 12, 0), status: 'Completed' },
    ];

    const { unmount } = render(<TransactionBrowser transactions={zeroAmountTx} />);

    // Should render -₦0.00 cleanly without NaN
    expect(screen.getAllByText('-₦0.00').length).toBeGreaterThan(0);
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();

    // Verify sort order with zero amount
    const defaultFilters: TransactionFilterState = {
      page: 1,
      pageSize: 10,
      category: 'ALL',
      type: 'ALL',
      status: 'ALL',
      sort: 'amount_asc',
      search: '',
      from: '',
      to: '',
    };
    const ascResult = filterTransactions(zeroAmountTx, defaultFilters);
    expect(ascResult.transactions[0].id).toBe('TX0');
    expect(ascResult.transactions[0].amt).toBe(0);

    unmount();
  });

  it('renders empty state when no transactions match active search or filters', async () => {
    const { unmount } = render(<TransactionBrowser transactions={seedTransactions} />);

    const searchInput = screen.getByRole('searchbox', { name: /search transactions/i });
    fireEvent.change(searchInput, { target: { value: 'nonexistent_search_query_xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/no transactions match those filters/i)).toBeInTheDocument();
      expect(screen.getByText(/try a different search or adjust the date range/i)).toBeInTheDocument();
      expect(screen.getByText('0 results')).toBeInTheDocument();
    });

    const clearButtons = screen.getAllByRole('button', { name: /clear filters/i });
    expect(clearButtons.length).toBeGreaterThanOrEqual(1);

    unmount();
  });

  it('enforces pagination boundaries and disables next page button on the last page', async () => {
    // 15 transactions with 10 per page => 2 pages
    const fifteenTxs: CompactUserTx[] = Array.from({ length: 15 }, (_, i) => ({
      id: `TX_${i + 1}`,
      typ: 'D',
      cat: 'GRO',
      amt: (i + 1) * 1000,
      nar: `Item ${i + 1}`,
      rec: 'Store',
      ts: Date.UTC(2024, 0, i + 1, 10, 0),
      status: 'Completed',
    }));

    const { unmount } = render(<TransactionBrowser transactions={fifteenTxs} />);

    expect(screen.getByText('15 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });

    // Page 1: Previous is disabled, Next is enabled
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    // Click Next to reach last page
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    // Page 2 (Last Page): Next is now disabled, Previous is now enabled
    expect(nextButton).toBeDisabled();
    expect(prevButton).toBeEnabled();

    // Clicking Next while disabled stays on page 2
    fireEvent.click(nextButton);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    // Clicking Previous returns to page 1
    fireEvent.click(prevButton);
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    unmount();
  });

  it('resets to page one and updates the result count when filters change', async () => {
    const { unmount } = render(<TransactionBrowser transactions={seedTransactions} />);

    const search = screen.getByRole('searchbox', { name: /search transactions/i });
    fireEvent.change(search, { target: { value: 'gro' } });

    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent?.trim() === '1 result')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/filter by category/i), { target: { value: 'GRO' } });
    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent?.trim() === '1 result')).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    unmount();
  });

  it('renders filter controls and pagination without axe violations', async () => {
    const { unmount } = render(<TransactionBrowser transactions={seedTransactions} />);

    expect(screen.getByRole('searchbox', { name: /search transactions/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();

    const filterControls = screen.getByTestId('filter-controls');
    const paginationControls = screen.getByTestId('pagination-controls');

    const filterResults = await axe(filterControls, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(filterResults.violations).toHaveLength(0);

    const paginationResults = await axe(paginationControls, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(paginationResults.violations).toHaveLength(0);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    unmount();
  }, 20000);
});
