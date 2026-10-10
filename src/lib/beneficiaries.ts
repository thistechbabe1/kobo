import { z } from 'zod';

export const MAX_BENEFICIARIES_CAP = 20;
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
    .max(100, 'Recipient name must not exceed 100 characters'),
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

const STORAGE_KEY = 'kobo_saved_beneficiaries';

/**
 * Loads beneficiaries from localStorage (merging with default seeds) or returns seeds.
 */
export function getSavedBeneficiaries(userId: string = DEFAULT_USER_ID): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((b: Beneficiary) => !b.userId || b.userId === userId);
    }
    return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
  } catch {
    return SEEDED_BENEFICIARIES.filter((b) => !b.userId || b.userId === userId);
  }
}

/**
 * Saves a new beneficiary or updates an existing one's lastUsedAt, enforcing MAX_BENEFICIARIES_CAP.
 */
export function persistBeneficiary(
  beneficiary: Omit<Beneficiary, 'id' | 'lastUsedAt'> & { id?: string; userId?: string }
): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES;
  }

  try {
    const current = getSavedBeneficiaries(beneficiary.userId || DEFAULT_USER_ID);
    const existingIndex = current.findIndex(
      (b) => b.accountNumber === beneficiary.accountNumber && b.bankCode === beneficiary.bankCode
    );

    const now = Date.now();
    let updated: Beneficiary[];

    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      const merged: Beneficiary = {
        ...existing,
        ...beneficiary,
        id: existing.id,
        userId: beneficiary.userId || existing.userId || DEFAULT_USER_ID,
        lastUsedAt: now,
      };
      updated = [merged, ...current.filter((_, idx) => idx !== existingIndex)];
    } else {
      if (current.length >= MAX_BENEFICIARIES_CAP) {
        throw new Error(`Maximum beneficiary cap of ${MAX_BENEFICIARIES_CAP} reached.`);
      }

      const newBen: Beneficiary = {
        id: beneficiary.id || `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: beneficiary.userId || DEFAULT_USER_ID,
        ...beneficiary,
        lastUsedAt: now,
      };
      updated = [newBen, ...current];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Maximum beneficiary cap')) {
      throw err;
    }
    return SEEDED_BENEFICIARIES;
  }
}

/**
 * Removes a beneficiary by id.
 */
export function removeBeneficiary(id: string, userId: string = DEFAULT_USER_ID): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES;
  }

  try {
    const current = getSavedBeneficiaries(userId);
    const filtered = current.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return SEEDED_BENEFICIARIES;
  }
}
