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
  type TransactionFilterState,
} from '@/lib/transactions';

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null as any;
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

const seedTransactions = [
  { id: 'TX1', typ: 'C', cat: 'SAL', amt: 500000, nar: 'Salary', rec: 'Employer', ts: Date.UTC(2024, 0, 1, 9, 0), status: 'Completed' },
  { id: 'TX2', typ: 'D', cat: 'GRO', amt: 250000, nar: 'Groceries', rec: 'Market', ts: Date.UTC(2024, 0, 2, 12, 0), status: 'Pending' },
  { id: 'TX3', typ: 'D', cat: 'UTL', amt: 80000, nar: 'Electricity', rec: 'Eko', ts: Date.UTC(2024, 0, 3, 0, 30), status: 'Failed' },
  { id: 'TX4', typ: 'C', cat: 'TRF', amt: 150000, nar: 'Transfer in', rec: 'Chinedu', ts: Date.UTC(2024, 0, 10, 20, 0), status: 'Completed' },
] as const;

describe('transaction URL param validation with Zod', () => {
  it('falls back to safe defaults for invalid page number', () => {
    const parsed = parseTransactionParams(new URLSearchParams('page=not-a-number'));
    expect(parsed.page).toBe(1);

    const negativeParsed = parseTransactionParams(new URLSearchParams('page=-5'));
    expect(negativeParsed.page).toBe(1);
  });

  it('falls back to safe default for out-of-range page', () => {
    const parsed = parseTransactionParams(new URLSearchParams('page=999'));
    expect(parsed.page).toBe(1);
  });

  it('falls back to empty dates when from is later than to', () => {
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

  it('falls back to date_desc for unknown sort order', () => {
    const parsed = parseTransactionParams(new URLSearchParams('sort=fastest_first'));
    expect(parsed.sort).toBe('date_desc');
  });

  it('accepts valid values and preserves them', () => {
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
});

describe('transaction browser UI', () => {
  it('renders filter controls and pagination without axe violations', async () => {
    const { unmount } = render(<TransactionBrowser transactions={seedTransactions as any} />);

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

  it('resets to page one and updates the result count when filters change', async () => {
    const { unmount } = render(<TransactionBrowser transactions={seedTransactions as any} />);

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
});
