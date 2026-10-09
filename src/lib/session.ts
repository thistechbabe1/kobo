import { EncryptJWT, jwtDecrypt } from 'jose';


function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SESSION_SECRET environment variable is missing in production. ' +
        'Please set SESSION_SECRET in your production deployment environment (32-byte base64/hex key).'
      );
    }
    // Local dev fallback documented in .env.example when .env.local is not present
    const devFallback = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';
    return new TextEncoder().encode(devFallback).subarray(0, 32);
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
export const MAX_USER_TX_CAP = 8; // Lowered from 10 to 8 to ensure worst-case sealed payload < 3,000 bytes
export const MAX_IDEMPOTENCY_KEYS_CAP = 5;
export const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
export const DEMO_VALID_PIN = '1234';

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
  ik: string[]; // Max 5 recent settled idempotency keys
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
  ik: [],
};

/**
 * Calculates CBN-regulated transfer fee in Kobo (2026 Framework):
 * - Below ₦5,000 (< 500,000 Kobo): Free (0 Kobo)
 * - ₦5,000 to ₦50,000 (500,000 to 5,000,000 Kobo inclusive): ₦10.00 (1,000 Kobo)
 * - Above ₦50,000 (> 5,000,000 Kobo): ₦50.00 (5,000 Kobo)
 */
export function calculateTransferFeeKobo(amountKobo: number): number {
  if (amountKobo < 500000) {
    return 0;
  }
  if (amountKobo <= 5000000) {
    return 1000;
  }
  return 5000;
}

/**
 * Seals the compact session state into an encrypted JWE cookie payload using jose (AES-256-GCM)
 */
export async function sealSessionState(payload: CompactSessionPayload): Promise<string> {
  const key = getSecretKey();
  const cappedTxs = (payload.txs || []).slice(0, MAX_USER_TX_CAP);
  const cappedIk = (payload.ik || []).slice(0, MAX_IDEMPOTENCY_KEYS_CAP);

  return new EncryptJWT({
    bal: payload.bal,
    pin: payload.pin,
    loc: payload.loc,
    txs: cappedTxs,
    ik: cappedIk,
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
      bal: typeof payload.bal === 'number' ? payload.bal : DEFAULT_INITIAL_STATE.bal,
      pin: typeof payload.pin === 'number' ? payload.pin : DEFAULT_INITIAL_STATE.pin,
      loc: (payload.loc as number | null) ?? DEFAULT_INITIAL_STATE.loc,
      txs: Array.isArray(payload.txs) ? (payload.txs as CompactUserTx[]) : [],
      ik: Array.isArray(payload.ik) ? (payload.ik as string[]) : [],
    };
  } catch {
    return DEFAULT_INITIAL_STATE;
  }
}

export interface TransferDebitInput {
  accountNumber: string;
  bankCode: string;
  bankName: string;
  recipientName: string;
  amountKobo: number;
  narration?: string;
  pin: string;
  idempotencyKey: string;
  currentTime?: number;
}

export type TransferDebitResult =
  | { status: 'SUCCESS'; updatedState: CompactSessionPayload; tx: CompactUserTx; feeKobo: number; totalDebitKobo: number }
  | { status: 'IDEMPOTENT_DUPLICATE'; updatedState: CompactSessionPayload; tx: CompactUserTx; feeKobo: number; totalDebitKobo: number }
  | { status: 'LOCKED'; retryAfterMs: number; lockUntilMs: number; updatedState: CompactSessionPayload }
  | { status: 'INVALID_PIN'; attemptsRemaining: number; updatedState: CompactSessionPayload }
  | { status: 'PIN_LOCKED'; lockUntilMs: number; updatedState: CompactSessionPayload }
  | { status: 'INSUFFICIENT_FUNDS'; balanceKobo: number; requiredKobo: number };

/**
 * Core business transaction helper that enforces:
 * 1. Server-side PIN lockout check
 * 2. Server-side Idempotency deduplication check via sealed ik ring-buffer
 * 3. Available balance validation
 * 4. Zero-log PIN verification
 * 5. State updates (balance debit, transaction prepend, idempotency ring-buffer)
 */
export function processTransferDebit(
  currentState: CompactSessionPayload,
  input: TransferDebitInput
): TransferDebitResult {
  const now = input.currentTime ?? Date.now();

  // 1. Check if account is actively locked
  if (currentState.loc !== null) {
    if (currentState.loc > now) {
      return {
        status: 'LOCKED',
        retryAfterMs: currentState.loc - now,
        lockUntilMs: currentState.loc,
        updatedState: currentState,
      };
    }
  }

  // 2. Check for Idempotent Duplicate
  const ikList = currentState.ik || [];
  if (ikList.includes(input.idempotencyKey)) {
    // Already processed with this exact key! Find existing transaction or latest matching
    const existingTx =
      currentState.txs.find(
        (t) =>
          t.acc === input.accountNumber.slice(-4) &&
          t.bnk === input.bankCode.slice(0, 3) &&
          t.amt === input.amountKobo
      ) || currentState.txs[0];

    const fee = calculateTransferFeeKobo(existingTx ? existingTx.amt : input.amountKobo);
    const totalDebit = (existingTx ? existingTx.amt : input.amountKobo) + fee;

    return {
      status: 'IDEMPOTENT_DUPLICATE',
      updatedState: currentState,
      tx: existingTx,
      feeKobo: fee,
      totalDebitKobo: totalDebit,
    };
  }

  // 3. Balance verification
  const feeKobo = calculateTransferFeeKobo(input.amountKobo);
  const totalRequired = input.amountKobo + feeKobo;
  if (currentState.bal < totalRequired) {
    return {
      status: 'INSUFFICIENT_FUNDS',
      balanceKobo: currentState.bal,
      requiredKobo: totalRequired,
    };
  }

  // 4. Zero-log PIN verification
  // DO NOT log input.pin anywhere
  if (input.pin !== DEMO_VALID_PIN) {
    const attempts = (currentState.pin || 0) + 1;
    if (attempts >= 3) {
      const lockUntil = now + PIN_LOCKOUT_MS;
      const updatedState: CompactSessionPayload = {
        ...currentState,
        pin: attempts,
        loc: lockUntil,
      };
      return {
        status: 'PIN_LOCKED',
        lockUntilMs: lockUntil,
        updatedState,
      };
    } else {
      const updatedState: CompactSessionPayload = {
        ...currentState,
        pin: attempts,
        loc: null,
      };
      return {
        status: 'INVALID_PIN',
        attemptsRemaining: 3 - attempts,
        updatedState,
      };
    }
  }

  // 5. PIN is valid - execute debit
  const newBalance = currentState.bal - totalRequired;
  const newTx: CompactUserTx = {
    id: `TX${Math.floor(100000 + Math.random() * 900000)}`,
    typ: 'D',
    cat: 'TRF',
    amt: input.amountKobo,
    nar: input.narration?.trim() || `Transfer to ${input.recipientName}`,
    rec: input.recipientName.slice(0, 20),
    bnk: input.bankCode.slice(0, 3),
    acc: input.accountNumber.slice(-4),
    ts: now,
    status: 'Completed',
  };

  const updatedTxs = [newTx, ...currentState.txs].slice(0, MAX_USER_TX_CAP);
  const updatedIk = [input.idempotencyKey, ...ikList].slice(0, MAX_IDEMPOTENCY_KEYS_CAP);

  const updatedState: CompactSessionPayload = {
    bal: newBalance,
    pin: 0,
    loc: null,
    txs: updatedTxs,
    ik: updatedIk,
  };

  return {
    status: 'SUCCESS',
    updatedState,
    tx: newTx,
    feeKobo,
    totalDebitKobo: totalRequired,
  };
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
