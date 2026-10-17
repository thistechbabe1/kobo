/**
 * Beneficiary models, compact session serializers, and seed records
 * persisted in sealed cookies under a strict capacity cap to stay within RFC limits.
 */
import { z } from 'zod';
import {
  CompactBeneficiary,
  CompactSessionPayload,
  MAX_BENEFICIARIES_CAP,
} from './session';

export { MAX_BENEFICIARIES_CAP };
export const DEFAULT_USER_ID = 'usr_babatunde_001';

export interface Beneficiary {
  id: string;
  userId?: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  bankShortName: string;
  recipientName: string;
  nickname?: string;
  lastUsedAt: number;
}

export const BeneficiaryInputSchema = z.object({
  accountNumber: z
    .string()
    .regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  bankCode: z
    .string()
    .min(1, 'Bank code is required')
    .max(6, 'Bank code must not exceed 6 characters'),
  bankName: z
    .string()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name must not exceed 100 characters'),
  bankShortName: z
    .string()
    .max(20, 'Bank short name must not exceed 20 characters')
    .optional(),
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(40, 'Recipient name must not exceed 40 characters'),
  nickname: z
    .string()
    .max(50, 'Nickname must not exceed 50 characters')
    .optional(),
});

export type BeneficiaryInput = z.infer<typeof BeneficiaryInputSchema>;

export const SEEDED_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben_1',
    userId: DEFAULT_USER_ID,
    accountNumber: '0000000010',
    bankCode: '058',
    bankName: 'Guaranty Trust Bank (GTBank)',
    bankShortName: 'GTB',
    recipientName: 'Amina Bello',
    lastUsedAt: 1775736000000,
  },
  {
    id: 'ben_2',
    userId: DEFAULT_USER_ID,
    accountNumber: '0000000020',
    bankCode: '044',
    bankName: 'Access Bank',
    bankShortName: 'Access',
    recipientName: 'Folake Adeleke',
    lastUsedAt: 1775649600000,
  },
  {
    id: 'ben_3',
    userId: DEFAULT_USER_ID,
    accountNumber: '0123456780',
    bankCode: '057',
    bankName: 'Zenith Bank',
    bankShortName: 'Zenith',
    recipientName: 'Ibrahim Musa',
    lastUsedAt: 1775563200000,
  },
];

import { NIGERIAN_BANKS } from './banks';

/**
 * Transforms a Beneficiary model to compact cookie payload representation
 */
export function toCompactBeneficiary(b: Beneficiary): CompactBeneficiary {
  return {
    id: b.id,
    a: b.accountNumber,
    b: b.bankCode,
    n: b.bankShortName || b.bankName.slice(0, 20),
    s: b.bankShortName,
    r: b.recipientName.slice(0, 40),
    k: b.nickname,
    t: b.lastUsedAt,
  };
}

/**
 * Transforms a compact cookie item back to Beneficiary model, rehydrating full bank names
 */
export function fromCompactBeneficiary(
  c: CompactBeneficiary,
  userId: string = DEFAULT_USER_ID
): Beneficiary {
  const bank = NIGERIAN_BANKS.find((b) => b.code === c.b);
  const bankName = bank?.name || c.n || 'Commercial Bank';
  const bankShortName = c.s || bank?.shortName || c.n || bankName.split(' ')[0];

  return {
    id: c.id,
    userId,
    accountNumber: c.a,
    bankCode: c.b,
    bankName,
    bankShortName,
    recipientName: c.r,
    nickname: c.k,
    lastUsedAt: c.t,
  };
}

export const SEEDED_COMPACT_BENEFICIARIES: CompactBeneficiary[] =
  SEEDED_BENEFICIARIES.map(toCompactBeneficiary);

/**
 * Returns beneficiaries from session state or fallback seeds (Option A: cookie-only)
 */
export function getSavedBeneficiaries(
  stateOrList?: CompactSessionPayload | CompactBeneficiary[] | Beneficiary[],
  userId: string = DEFAULT_USER_ID
): Beneficiary[] {
  if (!stateOrList) {
    return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
  }

  if (Array.isArray(stateOrList)) {
    if (stateOrList.length === 0) {
      return [];
    }
    const first = stateOrList[0];
    if ('accountNumber' in first) {
      return stateOrList as Beneficiary[];
    }
    return (stateOrList as CompactBeneficiary[]).map((c) => fromCompactBeneficiary(c, userId));
  }

  // CompactSessionPayload passed: if ben is an array (even if empty []), preserve it!
  const compactBens = stateOrList.ben;
  if (Array.isArray(compactBens)) {
    return compactBens.map((c) => fromCompactBeneficiary(c, userId));
  }

  return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
}

/**
 * Pure helper to insert or update a beneficiary in memory list, enforcing MAX_BENEFICIARIES_CAP = 5.
 */
export function persistBeneficiary(
  beneficiary: Omit<Beneficiary, 'id' | 'lastUsedAt' | 'bankShortName'> & {
    id?: string;
    userId?: string;
    bankShortName?: string;
  },
  currentList: Beneficiary[] = SEEDED_BENEFICIARIES
): Beneficiary[] {
  const current = [...currentList];
  const existingIndex = current.findIndex(
    (b) => b.accountNumber === beneficiary.accountNumber && b.bankCode === beneficiary.bankCode
  );

  const now = Date.now();

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const merged: Beneficiary = {
      ...existing,
      ...beneficiary,
      bankShortName: beneficiary.bankShortName || existing.bankShortName,
      recipientName: beneficiary.recipientName.slice(0, 40),
      id: existing.id,
      userId: beneficiary.userId || existing.userId || DEFAULT_USER_ID,
      lastUsedAt: now,
    };
    return [merged, ...current.filter((_, idx) => idx !== existingIndex)];
  }

  if (current.length >= MAX_BENEFICIARIES_CAP) {
    throw new Error(`Maximum beneficiary cap of ${MAX_BENEFICIARIES_CAP} reached. Please remove a beneficiary to add a new one.`);
  }

  const newBen: Beneficiary = {
    id: beneficiary.id || `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: beneficiary.userId || DEFAULT_USER_ID,
    bankShortName: beneficiary.bankShortName || beneficiary.bankName.split(' ')[0],
    ...beneficiary,
    recipientName: beneficiary.recipientName.slice(0, 40),
    lastUsedAt: now,
  };

  return [newBen, ...current];
}

/**
 * Pure helper to remove a beneficiary by id from a beneficiary list.
 */
export function removeBeneficiary(id: string, currentList: Beneficiary[] = SEEDED_BENEFICIARIES): Beneficiary[] {
  return currentList.filter((b) => b.id !== id);
}
