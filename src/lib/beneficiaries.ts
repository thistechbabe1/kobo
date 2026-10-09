export interface Beneficiary {
  id: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  bankShortName: string;
  recipientName: string;
  nickname?: string;
  lastUsedAt: number;
}

export const SEEDED_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben_1',
    accountNumber: '0000000010',
    bankCode: '058',
    bankName: 'Guaranty Trust Bank (GTBank)',
    bankShortName: 'GTB',
    recipientName: 'Amina Bello',
    lastUsedAt: 1775736000000,
  },
  {
    id: 'ben_2',
    accountNumber: '0000000020',
    bankCode: '044',
    bankName: 'Access Bank',
    bankShortName: 'Access',
    recipientName: 'Folake Adeleke',
    lastUsedAt: 1775649600000,
  },
  {
    id: 'ben_3',
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
export function getSavedBeneficiaries(): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SEEDED_BENEFICIARIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEEDED_BENEFICIARIES;
  } catch {
    return SEEDED_BENEFICIARIES;
  }
}

/**
 * Saves a new beneficiary or updates an existing one's lastUsedAt.
 */
export function persistBeneficiary(beneficiary: Omit<Beneficiary, 'id' | 'lastUsedAt'> & { id?: string }): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES;
  }

  try {
    const current = getSavedBeneficiaries();
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
        lastUsedAt: now,
      };
      updated = [merged, ...current.filter((_, idx) => idx !== existingIndex)];
    } else {
      const newBen: Beneficiary = {
        id: beneficiary.id || `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...beneficiary,
        lastUsedAt: now,
      };
      updated = [newBen, ...current];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return SEEDED_BENEFICIARIES;
  }
}

/**
 * Removes a beneficiary by id.
 */
export function removeBeneficiary(id: string): Beneficiary[] {
  if (typeof window === 'undefined') {
    return SEEDED_BENEFICIARIES;
  }

  try {
    const current = getSavedBeneficiaries();
    const filtered = current.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return SEEDED_BENEFICIARIES;
  }
}
