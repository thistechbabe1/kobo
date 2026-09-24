import { z } from 'zod';
import { CompactUserTx } from './session';

export const VALID_CATEGORIES = ['ALL', 'SAL', 'TRF', 'GRO', 'UTL', 'AIR'] as const;
export const VALID_TYPES = ['ALL', 'C', 'D'] as const;
export const VALID_SORTS = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'] as const;
export const VALID_STATUSES = ['ALL', 'Completed', 'Pending', 'Failed'] as const;

export type TransactionCategory = (typeof VALID_CATEGORIES)[number];
export type TransactionType = (typeof VALID_TYPES)[number];
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';
export type TransactionSort = (typeof VALID_SORTS)[number];
export type TransactionStatusFilter = (typeof VALID_STATUSES)[number];

export interface TransactionFilterState {
  page: number;
  pageSize: number;
  category: TransactionCategory;
  type: TransactionType;
  status: TransactionStatusFilter;
  sort: TransactionSort;
  search: string;
  from: string;
  to: string;
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).catch('');
const pageSchema = z.coerce.number().int().min(1).max(50).catch(1);

export const transactionFilterSchema = z.object({
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(50).catch(10),
  category: z.enum(['ALL', 'SAL', 'TRF', 'GRO', 'UTL', 'AIR']).catch('ALL'),
  type: z.enum(['ALL', 'C', 'D']).catch('ALL'),
  status: z.enum(['ALL', 'Completed', 'Pending', 'Failed']).catch('ALL'),
  sort: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).catch('date_desc'),
  search: z.string().trim().max(100).catch('').default(''),
  from: dateSchema,
  to: dateSchema,
}).transform((value) => {
  const page = Math.max(1, Number(value.page) || 1);
  const pageSize = Math.max(1, Number(value.pageSize) || 10);
  const from = value.from || '';
  const to = value.to || '';
  const invalidRange = from && to && from > to;

  return {
    page,
    pageSize,
    category: VALID_CATEGORIES.includes(value.category as TransactionCategory) ? (value.category as TransactionCategory) : 'ALL',
    type: VALID_TYPES.includes(value.type as TransactionType) ? (value.type as TransactionType) : 'ALL',
    status: VALID_STATUSES.includes(value.status as TransactionStatusFilter) ? (value.status as TransactionStatusFilter) : 'ALL',
    sort: VALID_SORTS.includes(value.sort as TransactionSort) ? (value.sort as TransactionSort) : 'date_desc',
    search: value.search ?? '',
    from: invalidRange ? '' : from,
    to: invalidRange ? '' : to,
  } satisfies TransactionFilterState;
});

export function parseTransactionParams(searchParams: URLSearchParams | Record<string, string | null>): TransactionFilterState {
  const raw = searchParams instanceof URLSearchParams ? {
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    category: searchParams.get('cat'),
    type: searchParams.get('typ'),
    status: searchParams.get('status'),
    sort: searchParams.get('sort'),
    search: searchParams.get('q'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  } : {
    page: searchParams.page ?? null,
    pageSize: searchParams.pageSize ?? null,
    category: searchParams.cat ?? null,
    type: searchParams.typ ?? null,
    status: searchParams.status ?? null,
    sort: searchParams.sort ?? null,
    search: searchParams.q ?? null,
    from: searchParams.from ?? null,
    to: searchParams.to ?? null,
  };

  return transactionFilterSchema.parse(raw);
}

export function getTransactionStatus(tx: { status?: TransactionStatus; typ: 'C' | 'D' }): TransactionStatus {
  return tx.status ?? (tx.typ === 'C' ? 'Completed' : 'Pending');
}

export function toLagosDateString(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
}

export function transactionMatchesDateRange(timestamp: number, from: string, to: string): boolean {
  const date = toLagosDateString(timestamp);

  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function filterTransactions(transactions: CompactUserTx[], filters: TransactionFilterState) {
  const searchTerm = filters.search.trim().toLowerCase();
  const filtered = transactions.filter((tx) => {
    const matchesSearch = !searchTerm || [tx.nar, tx.rec ?? '', tx.id].some((value) => value.toLowerCase().includes(searchTerm));
    const matchesCategory = filters.category === 'ALL' || tx.cat === filters.category;
    const matchesType = filters.type === 'ALL' || tx.typ === filters.type;
    const status = getTransactionStatus(tx);
    const matchesStatus = filters.status === 'ALL' || status === filters.status;
    const matchesDates = transactionMatchesDateRange(tx.ts, filters.from, filters.to);

    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesDates;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'date_asc':
        return a.ts - b.ts;
      case 'amount_asc':
        return a.amt - b.amt;
      case 'amount_desc':
        return b.amt - a.amt;
      case 'date_desc':
      default:
        return b.ts - a.ts;
    }
  });

  const pageSize = filters.pageSize || 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const start = (page - 1) * pageSize;
  const pageTransactions = sorted.slice(start, start + pageSize);

  return {
    totalResults: sorted.length,
    totalPages,
    page,
    transactions: pageTransactions,
  };
}
