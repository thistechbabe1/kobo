'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Filter, RotateCcw, Search } from 'lucide-react';
import { CompactUserTx } from '@/lib/session';
import { filterTransactions, getTransactionStatus, parseTransactionParams, TransactionFilterState, VALID_CATEGORIES, VALID_SORTS, VALID_STATUSES, VALID_TYPES } from '@/lib/transactions';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PrimaryButton, GhostButton, SurfaceCard } from '@/components/ui';

interface TransactionBrowserProps {
  transactions: CompactUserTx[];
}

export function TransactionBrowser({ transactions }: TransactionBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const urlFilters = useMemo(() => parseTransactionParams(searchParams), [searchParams]);

  const [filters, setFilters] = useState<TransactionFilterState>(urlFilters);
  const [searchValue, setSearchValue] = useState(urlFilters.search);
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevParamsRef = useRef(searchParamsString);

  useEffect(() => {
    if (prevParamsRef.current !== searchParamsString) {
      prevParamsRef.current = searchParamsString;
      setFilters(urlFilters);
      setSearchValue(urlFilters.search);
    }
  }, [searchParamsString, urlFilters]);

  const resultSet = useMemo(() => filterTransactions(transactions, filters), [transactions, filters]);
  const hasFilters = Boolean(
    filters.search ||
    filters.category !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.from ||
    filters.to ||
    filters.sort !== 'date_desc'
  );

  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      const phrase = `${resultSet.totalResults} result${resultSet.totalResults === 1 ? '' : 's'}`;
      setAnnouncement(phrase);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [resultSet.totalResults, filters.search]);

  const updateFilters = (patch: Partial<TransactionFilterState>, resetPage = true) => {
    const nextFilters: TransactionFilterState = {
      ...filters,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? filters.page),
    };
    setFilters(nextFilters);

    const params = new URLSearchParams();
    if (nextFilters.search) params.set('q', nextFilters.search);
    if (nextFilters.category !== 'ALL') params.set('cat', nextFilters.category);
    if (nextFilters.type !== 'ALL') params.set('typ', nextFilters.type);
    if (nextFilters.status !== 'ALL') params.set('status', nextFilters.status);
    if (nextFilters.sort !== 'date_desc') params.set('sort', nextFilters.sort);
    if (nextFilters.from) params.set('from', nextFilters.from);
    if (nextFilters.to) params.set('to', nextFilters.to);
    if (nextFilters.page > 1) params.set('page', String(nextFilters.page));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateFilters({ search: value.trim() }, true);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    const cleared: TransactionFilterState = {
      page: 1,
      pageSize: 10,
      category: 'ALL',
      type: 'ALL',
      status: 'ALL',
      sort: 'date_desc',
      search: '',
      from: '',
      to: '',
    };
    setFilters(cleared);
    router.replace(pathname, { scroll: false });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="space-y-5">
      <div data-testid="filter-controls" className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <label htmlFor="transaction-search" className="sr-only">
              Search transactions
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-primary)]" />
            <input
              ref={inputRef}
              id="transaction-search"
              type="search"
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Search transactions"
              placeholder="Search narration, recipient, or reference"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-2.5 pl-10 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="w-full md:max-w-[220px]">
            <CustomSelect
              id="sort-select"
              label="Sort transactions"
              value={filters.sort}
              size="md"
              onChange={(sort) => updateFilters({ sort }, false)}
              options={VALID_SORTS.map((value) => ({
                value,
                label:
                  value === 'date_desc'
                    ? 'Newest first'
                    : value === 'date_asc'
                      ? 'Oldest first'
                      : value === 'amount_desc'
                        ? 'Highest amount'
                        : 'Lowest amount',
              }))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[var(--border-color)] pt-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
            <Filter className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            <span>Filters</span>
          </div>

          <CustomSelect
            id="category-select"
            label="Filter by category"
            value={filters.category}
            size="sm"
            className="min-w-[130px]"
            onChange={(category) => updateFilters({ category }, true)}
            options={VALID_CATEGORIES.map((value) => ({
              value,
              label: value === 'ALL' ? 'All categories' : value,
            }))}
          />

          <CustomSelect
            id="type-select"
            label="Filter by type"
            value={filters.type}
            size="sm"
            className="min-w-[105px]"
            onChange={(type) => updateFilters({ type }, true)}
            options={VALID_TYPES.map((value) => ({
              value,
              label: value === 'ALL' ? 'All types' : value === 'C' ? 'Credits' : 'Debits',
            }))}
          />

          <CustomSelect
            id="status-select"
            label="Transaction status"
            value={filters.status}
            size="sm"
            className="min-w-[115px]"
            onChange={(status) => updateFilters({ status }, true)}
            options={VALID_STATUSES.map((value) => ({
              value,
              label: value === 'ALL' ? 'All status' : value,
            }))}
          />

          <div className="flex items-center gap-2">
            <label htmlFor="from-date" className="sr-only">From date</label>
            <input
              id="from-date"
              aria-label="From date"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilters({ from: event.target.value }, true)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <span className="text-[var(--text-muted)]">to</span>
            <label htmlFor="to-date" className="sr-only">To date</label>
            <input
              id="to-date"
              aria-label="To date"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilters({ to: event.target.value }, true)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/80 dark:bg-red-950/30 dark:text-red-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <SurfaceCard className="rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Transaction history</p>
            <p className="text-xs text-[var(--text-muted)]">{resultSet.totalResults} result{resultSet.totalResults === 1 ? '' : 's'}</p>
          </div>
        </div>

        {resultSet.transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] p-8 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No transactions match those filters</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Try a different search or adjust the date range.</p>
            <PrimaryButton
              type="button"
              size="sm"
              onClick={handleClearFilters}
              className="mt-4 mx-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Transaction List View (< 768px) */}
            <div className="md:hidden divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
              {resultSet.transactions.map((tx) => {
                const isCredit = tx.typ === 'C';
                const status = getTransactionStatus(tx);
                const formatted = (tx.amt / 100).toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const dateLabel = new Date(tx.ts).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Africa/Lagos',
                });

                return (
                  <div key={tx.id} className="p-3.5 space-y-1.5 bg-[var(--bg-surface)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-[var(--text-primary)] leading-tight min-w-0 truncate">
                        {tx.nar}
                      </div>
                      <span className={`font-mono text-xs font-bold shrink-0 ${isCredit ? 'text-[var(--brand-primary)]' : 'text-[var(--accent-deep-terracotta)]'}`}>
                        {isCredit ? `+₦${formatted}` : `-₦${formatted}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-1.5 py-0.5 font-semibold uppercase text-[var(--text-primary)]">
                          {tx.cat}
                        </span>
                        <span>{tx.rec ?? 'Transfer'} • {dateLabel}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                          status === 'Completed'
                            ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : status === 'Pending'
                              ? 'border-sky-600/30 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
                              : 'border-red-600/30 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                        }`}
                      >
                        {status === 'Pending' && <Clock className="w-2.5 h-2.5 shrink-0" />}
                        <span>{status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Transaction Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border-color)]">
              <table className="min-w-full divide-y divide-[var(--border-color)] text-left text-xs">
                <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {resultSet.transactions.map((tx) => {
                    const isCredit = tx.typ === 'C';
                    const status = getTransactionStatus(tx);
                    const formatted = (tx.amt / 100).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    const dateLabel = new Date(tx.ts).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'Africa/Lagos',
                    });

                    return (
                      <tr key={tx.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--text-primary)]">{tx.nar}</div>
                          <div className="mt-1 text-[10px] text-[var(--text-muted)]">{tx.rec ?? 'Internal transfer'} • {tx.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                            {tx.cat}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                              status === 'Completed'
                                ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : status === 'Pending'
                                  ? 'border-sky-600/30 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
                                  : 'border-red-600/30 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                            }`}
                          >
                            {status === 'Pending' && <Clock className="w-2.5 h-2.5 shrink-0" />}
                            <span>{status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{dateLabel}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${isCredit ? 'text-[var(--brand-primary)]' : 'text-[var(--accent-deep-terracotta)]'}`}>
                            {isCredit ? `+₦${formatted}` : `-₦${formatted}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div data-testid="pagination-controls" className="flex items-center justify-between gap-3">
              <GhostButton
                type="button"
                size="sm"
                onClick={() => {
                  const nextPage = Math.max(1, resultSet.page - 1);
                  updateFilters({ page: nextPage }, false);
                }}
                disabled={resultSet.page <= 1}
                aria-label="Previous page"
                className="inline-flex items-center gap-1 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous page
              </GhostButton>

              <div className="text-xs text-[var(--text-muted)]">
                Page {resultSet.page} of {resultSet.totalPages}
              </div>

              <GhostButton
                type="button"
                size="sm"
                onClick={() => {
                  const nextPage = Math.min(resultSet.totalPages, resultSet.page + 1);
                  updateFilters({ page: nextPage }, false);
                }}
                disabled={resultSet.page >= resultSet.totalPages}
                aria-label="Next page"
                className="inline-flex items-center gap-1 disabled:cursor-not-allowed"
              >
                Next page
                <ChevronRight className="h-3.5 w-3.5" />
              </GhostButton>
            </div>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
