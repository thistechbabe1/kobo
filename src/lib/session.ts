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
    // Pad or hash to ensure 32 bytes for AES-256
    const padded = new Uint8Array(32);
    padded.set(secretBytes.subarray(0, 32));
    return padded;
  }
  return secretBytes.subarray(0, 32);
}

export const COOKIE_NAME = 'kobo_state';
export const MAX_USER_TX_CAP = 10;

export interface CompactUserTx {
  id: string; // 8-char reference
  typ: 'C' | 'D'; // Credit or Debit
  cat: string; // Category code e.g. 'TRF'
  amt: number; // Integer Kobo amount
  nar: string; // Narration capped at 30 chars
  rec?: string; // Recipient name (max 20 chars)
  bnk?: string; // Bank code (3 digits)
  acc?: string; // Recipient account (last 4 digits)
  ts: number; // Epoch timestamp
}

export interface CompactSessionPayload {
  bal: number; // Current wallet balance in Kobo (integer)
  pin: number; // Failed PIN attempts (0-3)
  loc: number | null; // Lock expiry epoch ms or null
  txs: CompactUserTx[]; // Max 10 user transactions
}

export const DEFAULT_INITIAL_STATE: CompactSessionPayload = {
  bal: 25000000, // Initial ₦250,000.00
  pin: 0,
  loc: null,
  txs: [],
};

/**
 * Seals the compact session state into an encrypted JWE cookie payload using jose (AES-256-GCM)
 */
export async function sealSessionState(payload: CompactSessionPayload): Promise<string> {
  const key = getSecretKey();
  
  // Enforce transaction cap strictly
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
    // If decryption fails or cookie corrupted, return default seeded state safely
    return DEFAULT_INITIAL_STATE;
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
