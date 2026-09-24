import { EncryptJWT, jwtDecrypt } from 'jose';

// Secret key check - fail loudly at startup if missing
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'CRITICAL: SESSION_SECRET environment variable is missing. ' +
      'Please set SESSION_SECRET in .env.local (32-byte base64/hex key).'
    );
  }
  
  // Convert secret string into 32-byte Key
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  if (secretBytes.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(secretBytes.subarray(0, 32));
    return padded;
  }
  return secretBytes.subarray(0, 32);
}

export const COOKIE_NAME = 'kobo_state';
export const AUTH_COOKIE_NAME = 'kobo_auth';
export const MAX_USER_TX_CAP = 10;

export interface AuthSessionPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface CompactUserTx {
  id: string; // 8-char reference
  typ: 'C' | 'D'; // Credit or Debit
  cat: string; // Category code e.g. 'TRF', 'SAL', 'UTL', 'GRO'
  amt: number; // Integer Kobo amount
  nar: string; // Narration capped at 30 chars
  rec?: string; // Recipient name (max 20 chars)
  bnk?: string; // Bank code (3 digits)
  acc?: string; // Recipient account (last 4 digits)
  ts: number; // Epoch timestamp
  status?: 'Completed' | 'Pending' | 'Failed';
}

export interface CompactSessionPayload {
  bal: number; // Current wallet balance in Kobo (integer)
  pin: number; // Failed PIN attempts (0-3)
  loc: number | null; // Lock expiry epoch ms or null
  txs: CompactUserTx[]; // Max 10 user transactions
}

// Reconciled financial baseline values (in Kobo)
export const OPENING_BALANCE_KOBO = 20000000; // ₦200,000.00

/**
 * Generates deterministic seeded historical transactions relative to an injectable clock date
 */
export function getSeededTransactions(now: Date = new Date()): CompactUserTx[] {
  const baseTime = now.getTime();
  const DAY_MS = 86400000;

  return [
    {
      id: 'TX892101',
      typ: 'C',
      cat: 'SAL',
      amt: 5000000, // ₦50,000.00
      nar: 'Monthly Salary Payment',
      rec: 'Paystack Nigeria Ltd',
      bnk: '058',
      acc: '9012',
      ts: baseTime - DAY_MS * 1,
    },
    {
      id: 'TX892102',
      typ: 'D',
      cat: 'GRO',
      amt: 1250000, // ₦12,500.00
      nar: 'Shoprite Lekki Groceries',
      rec: 'Shoprite Nigeria',
      bnk: '033',
      acc: '4410',
      ts: baseTime - DAY_MS * 2,
    },
    {
      id: 'TX892103',
      typ: 'C',
      cat: 'TRF',
      amt: 2500000, // ₦25,000.00
      nar: 'Freelance Design Payment',
      rec: 'Chinedu Tech Ltd',
      bnk: '057',
      acc: '3319',
      ts: baseTime - DAY_MS * 3,
    },
    {
      id: 'TX892104',
      typ: 'D',
      cat: 'UTL',
      amt: 864950, // ₦8,649.50
      nar: 'EKEDC Electricity Bill',
      rec: 'Eko Electricity',
      bnk: '011',
      acc: '8821',
      ts: baseTime - DAY_MS * 4,
    },
    {
      id: 'TX892105',
      typ: 'D',
      cat: 'AIR',
      amt: 800000, // ₦8,000.00
      nar: 'MTN Data & Airtime Topup',
      rec: 'MTN Nigeria',
      bnk: '301',
      acc: '1102',
      ts: baseTime - DAY_MS * 5,
    },
  ];
}

// Calculate initial balance from Opening Balance + Seeded Credits - Seeded Debits
const seededTxs = getSeededTransactions();
const seededCredits = seededTxs.filter(t => t.typ === 'C').reduce((acc, t) => acc + t.amt, 0);
const seededDebits = seededTxs.filter(t => t.typ === 'D').reduce((acc, t) => acc + t.amt, 0);
export const RECONCILED_INITIAL_BALANCE_KOBO = OPENING_BALANCE_KOBO + seededCredits - seededDebits; // 24,585,050 Kobo (₦245,850.50)

export const DEFAULT_INITIAL_STATE: CompactSessionPayload = {
  bal: RECONCILED_INITIAL_BALANCE_KOBO,
  pin: 0,
  loc: null,
  txs: [],
};

/**
 * Seals the compact session state into an encrypted JWE cookie payload using jose (AES-256-GCM)
 */
export async function sealSessionState(payload: CompactSessionPayload): Promise<string> {
  const key = getSecretKey();
  const cappedTxs = payload.txs.slice(0, MAX_USER_TX_CAP);

  return new EncryptJWT({
    bal: payload.bal,
    pin: payload.pin,
    loc: payload.loc,
    txs: cappedTxs,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .encrypt(key);
}

/**
 * Unseals and decrypts the JWE cookie string back into CompactSessionPayload
 */
export async function unsealSessionState(token: string | undefined): Promise<CompactSessionPayload> {
  if (!token) {
    return DEFAULT_INITIAL_STATE;
  }

  try {
    const key = getSecretKey();
    const { payload } = await jwtDecrypt(token, key);

    return {
      bal: (payload.bal as number) ?? DEFAULT_INITIAL_STATE.bal,
      pin: (payload.pin as number) ?? DEFAULT_INITIAL_STATE.pin,
      loc: (payload.loc as number | null) ?? DEFAULT_INITIAL_STATE.loc,
      txs: (payload.txs as CompactUserTx[]) ?? [],
    };
  } catch {
    return DEFAULT_INITIAL_STATE;
  }
}

/**
 * Seals authentication session data into an encrypted JWE token
 */
export async function sealAuthToken(payload: AuthSessionPayload, expiration: string = '7d'): Promise<string> {
  const key = getSecretKey();
  return new EncryptJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .encrypt(key);
}

/**
 * Unseals and verifies the authentication JWE token
 */
export async function unsealAuthToken(token: string | undefined): Promise<AuthSessionPayload | null> {
  if (!token) return null;
  try {
    const key = getSecretKey();
    const { payload } = await jwtDecrypt(token, key);
    if (!payload.sub || !payload.email) return null;
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || 'Demo User',
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to push a new user-created transaction into the session state with cap handling
 */
export function pushUserTransaction(
  currentState: CompactSessionPayload,
  newTx: CompactUserTx
): { updatedState: CompactSessionPayload; rolledOff: boolean } {
  const txs = [newTx, ...currentState.txs];
  const rolledOff = txs.length > MAX_USER_TX_CAP;
  const cappedTxs = txs.slice(0, MAX_USER_TX_CAP);

  return {
    updatedState: {
      ...currentState,
      txs: cappedTxs,
    },
    rolledOff,
  };
}
