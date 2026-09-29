import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateTransferFeeKobo,
  CompactSessionPayload,
  DEMO_VALID_PIN,
  MAX_IDEMPOTENCY_KEYS_CAP,
  PIN_LOCKOUT_MS,
  processTransferDebit,
  sealSessionState,
  unsealSessionState,
} from '../../src/lib/session';

const TEST_SECRET = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';

describe('Transfer Business Logic & Security (Feature 4)', () => {
  const BASE_TIME = 1759000000000;

  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  const createBaseState = (balanceKobo: number = 20000000): CompactSessionPayload => ({
    bal: balanceKobo, // ₦200,000.00
    pin: 0,
    loc: null,
    txs: [],
    ik: [],
  });

  describe('1. CBN Fee Calculation Rules (2026 Revised Framework)', () => {
    it('should charge ₦0 (Free) for transfers below ₦5,000 (< 500,000 Kobo)', () => {
      expect(calculateTransferFeeKobo(0)).toBe(0);
      expect(calculateTransferFeeKobo(100000)).toBe(0); // ₦1,000
      expect(calculateTransferFeeKobo(499900)).toBe(0); // ₦4,999
    });

    it('should charge ₦10.00 (1,000 Kobo) for transfers between ₦5,000 and ₦50,000 inclusive', () => {
      expect(calculateTransferFeeKobo(500000)).toBe(1000); // ₦5,000 -> ₦10 fee
      expect(calculateTransferFeeKobo(2500000)).toBe(1000); // ₦25,000 -> ₦10 fee
      expect(calculateTransferFeeKobo(5000000)).toBe(1000); // ₦50,000 -> ₦10 fee
    });

    it('should charge ₦50.00 (5,000 Kobo) for transfers strictly above ₦50,000 (> 5,000,000 Kobo)', () => {
      expect(calculateTransferFeeKobo(5000100)).toBe(5000); // ₦50,001 -> ₦50 fee
      expect(calculateTransferFeeKobo(10000000)).toBe(5000); // ₦100,000 -> ₦50 fee
      expect(calculateTransferFeeKobo(50000000)).toBe(5000); // ₦500,000 -> ₦50 fee
    });
  });

  describe('2. Core Transfer & Financial Reconciliation', () => {
    it('should successfully execute debit with exact fee deduction and transaction record', () => {
      const state = createBaseState(20000000); // ₦200,000
      const transferAmt = 1000000; // ₦10,000 (fee is ₦10 = 1,000 Kobo)

      const result = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        recipientName: 'Chioma Adebayo',
        amountKobo: transferAmt,
        narration: 'Freelance Design Payment',
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'idem-key-101',
        currentTime: BASE_TIME,
      });

      expect(result.status).toBe('SUCCESS');
      if (result.status !== 'SUCCESS') return;

      expect(result.feeKobo).toBe(1000);
      expect(result.totalDebitKobo).toBe(1001000); // ₦10,010.00
      expect(result.updatedState.bal).toBe(20000000 - 1001000); // ₦189,990.00

      // Transaction list verification
      expect(result.updatedState.txs).toHaveLength(1);
      expect(result.tx.amt).toBe(transferAmt);
      expect(result.tx.rec).toBe('Chioma Adebayo');
      expect(result.tx.bnk).toBe('058');
      expect(result.tx.acc).toBe('6789');
      expect(result.tx.typ).toBe('D');
      expect(result.tx.cat).toBe('TRF');

      // Idempotency key stored
      expect(result.updatedState.ik).toContain('idem-key-101');
    });

    it('should reject transfers where amount + fee exceeds available wallet balance', () => {
      const state = createBaseState(500000); // ₦5,000 balance
      const transferAmt = 500000; // ₦5,000 transfer has ₦10 fee -> total 501,000 Kobo required

      const result = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: transferAmt,
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'idem-key-insufficient',
        currentTime: BASE_TIME,
      });

      expect(result.status).toBe('INSUFFICIENT_FUNDS');
      if (result.status === 'INSUFFICIENT_FUNDS') {
        expect(result.balanceKobo).toBe(500000);
        expect(result.requiredKobo).toBe(501000);
      }
    });
  });

  describe('3. Server-Side Idempotency Key Lifecycle & Deduplication', () => {
    it('a duplicate key returns the original receipt with exactly one debit', () => {
      const state = createBaseState(20000000);
      const idempotencyKey = 'idem-uuid-repeat-test';

      // 1st Transfer
      const firstResult = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 2000000, // ₦20,000 (fee ₦10)
        pin: DEMO_VALID_PIN,
        idempotencyKey,
        currentTime: BASE_TIME,
      });

      expect(firstResult.status).toBe('SUCCESS');
      if (firstResult.status !== 'SUCCESS') return;

      const balanceAfterFirst = firstResult.updatedState.bal;
      expect(balanceAfterFirst).toBe(20000000 - 2001000);

      // 2nd Transfer with the exact same idempotencyKey (retry or double-click)
      const secondResult = processTransferDebit(firstResult.updatedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 2000000,
        pin: DEMO_VALID_PIN,
        idempotencyKey,
        currentTime: BASE_TIME + 2000,
      });

      expect(secondResult.status).toBe('IDEMPOTENT_DUPLICATE');
      if (secondResult.status !== 'IDEMPOTENT_DUPLICATE') return;

      // Crucial: Wallet balance is NOT deducted a second time
      expect(secondResult.updatedState.bal).toBe(balanceAfterFirst);
      expect(secondResult.tx.id).toBe(firstResult.tx.id);
      expect(secondResult.updatedState.txs).toHaveLength(1);
    });

    it('should process fresh transfers normally when different idempotency keys are used', () => {
      const state = createBaseState(20000000);

      const res1 = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000, // ₦1,000 (fee ₦0)
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'key-1',
        currentTime: BASE_TIME,
      });

      expect(res1.status).toBe('SUCCESS');
      if (res1.status !== 'SUCCESS') return;

      const res2 = processTransferDebit(res1.updatedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 200000, // ₦2,000 (fee ₦0)
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'key-2',
        currentTime: BASE_TIME + 5000,
      });

      expect(res2.status).toBe('SUCCESS');
      if (res2.status !== 'SUCCESS') return;

      expect(res2.updatedState.bal).toBe(20000000 - 300000);
      expect(res2.updatedState.txs).toHaveLength(2);
      expect(res2.updatedState.ik).toEqual(['key-2', 'key-1']);
    });

    it('should cap the idempotency ring-buffer at MAX_IDEMPOTENCY_KEYS_CAP (5 keys)', () => {
      let state = createBaseState(50000000);

      for (let i = 1; i <= 7; i++) {
        const res = processTransferDebit(state, {
          accountNumber: '0123456789',
          bankCode: '058',
          bankName: 'GTBank',
          recipientName: 'Chioma Adebayo',
          amountKobo: 100000,
          pin: DEMO_VALID_PIN,
          idempotencyKey: `key-batch-${i}`,
          currentTime: BASE_TIME + i * 1000,
        });

        if (res.status === 'SUCCESS') {
          state = res.updatedState;
        }
      }

      expect(state.ik).toHaveLength(MAX_IDEMPOTENCY_KEYS_CAP);
      expect(state.ik).toEqual([
        'key-batch-7',
        'key-batch-6',
        'key-batch-5',
        'key-batch-4',
        'key-batch-3',
      ]);
      expect(state.ik.includes('key-batch-1')).toBe(false);
      expect(state.ik.includes('key-batch-2')).toBe(false);
    });
  });

  describe('4. Server-Side PIN Lockout & Security', () => {
    it('should track failed attempts and lock out for 15 minutes after 3 failures', () => {
      const state = createBaseState();

      // 1st failure
      const res1 = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: '0000', // wrong
        idempotencyKey: 'fail-1',
        currentTime: BASE_TIME,
      });

      expect(res1.status).toBe('INVALID_PIN');
      if (res1.status !== 'INVALID_PIN') return;
      expect(res1.attemptsRemaining).toBe(2);
      expect(res1.updatedState.pin).toBe(1);
      expect(res1.updatedState.loc).toBeNull();

      // 2nd failure
      const res2 = processTransferDebit(res1.updatedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: '0000', // wrong
        idempotencyKey: 'fail-2',
        currentTime: BASE_TIME + 1000,
      });

      expect(res2.status).toBe('INVALID_PIN');
      if (res2.status !== 'INVALID_PIN') return;
      expect(res2.attemptsRemaining).toBe(1);
      expect(res2.updatedState.pin).toBe(2);
      expect(res2.updatedState.loc).toBeNull();

      // 3rd failure -> Lockout!
      const res3 = processTransferDebit(res2.updatedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: '0000', // wrong
        idempotencyKey: 'fail-3',
        currentTime: BASE_TIME + 2000,
      });

      expect(res3.status).toBe('PIN_LOCKED');
      if (res3.status !== 'PIN_LOCKED') return;
      expect(res3.updatedState.pin).toBe(3);
      expect(res3.lockUntilMs).toBe(BASE_TIME + 2000 + PIN_LOCKOUT_MS);
      expect(res3.updatedState.loc).toBe(BASE_TIME + 2000 + PIN_LOCKOUT_MS);

      // 4th attempt while locked -> Rebuffed even with correct PIN!
      const res4 = processTransferDebit(res3.updatedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: DEMO_VALID_PIN, // correct PIN, but locked
        idempotencyKey: 'fail-4',
        currentTime: BASE_TIME + 3000,
      });

      expect(res4.status).toBe('LOCKED');
      if (res4.status === 'LOCKED') {
        expect(res4.retryAfterMs).toBeGreaterThan(0);
      }
    });

    it('the 3-attempt lockout persists across seal and fresh unseal, blocking transfers in a new session', async () => {
      // 1. Create state after 3 failed attempts
      const lockedState: CompactSessionPayload = {
        bal: 20000000,
        pin: 3,
        loc: BASE_TIME + PIN_LOCKOUT_MS,
        txs: [],
        ik: [],
      };

      // 2. Seal into JWE cookie token
      const sealedToken = await sealSessionState(lockedState);
      expect(typeof sealedToken).toBe('string');

      // 3. Simulate new HTTP request / browser session unsealing the cookie
      const unsealedSession = await unsealSessionState(sealedToken);
      expect(unsealedSession.pin).toBe(3);
      expect(unsealedSession.loc).toBe(BASE_TIME + PIN_LOCKOUT_MS);

      // 4. Attempt transfer on unsealed state with correct PIN
      const attempt = processTransferDebit(unsealedSession, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 500000,
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'key-unsealed-attempt',
        currentTime: BASE_TIME + 10000, // 10 seconds into 15m lockout
      });

      expect(attempt.status).toBe('LOCKED');
      if (attempt.status === 'LOCKED') {
        expect(attempt.retryAfterMs).toBe(PIN_LOCKOUT_MS - 10000);
      }
    });

    it('LOCKED-OUT ON ENTRY TEST: a locked session entering transfer flow is immediately blocked', () => {
      const lockedState: CompactSessionPayload = {
        bal: 20000000,
        pin: 3,
        loc: BASE_TIME + 600000, // Locked for next 10 minutes
        txs: [],
        ik: [],
      };

      const result = processTransferDebit(lockedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'key-locked-entry',
        currentTime: BASE_TIME,
      });

      expect(result.status).toBe('LOCKED');
      if (result.status === 'LOCKED') {
        expect(result.retryAfterMs).toBe(600000);
      }
    });

    it('should unlock automatically after the 15-minute window expires', () => {
      const lockedState: CompactSessionPayload = {
        bal: 20000000,
        pin: 3,
        loc: BASE_TIME + PIN_LOCKOUT_MS,
        txs: [],
        ik: [],
      };

      // Attempt after 15m + 1ms has elapsed
      const result = processTransferDebit(lockedState, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: DEMO_VALID_PIN,
        idempotencyKey: 'key-after-unlock',
        currentTime: BASE_TIME + PIN_LOCKOUT_MS + 1000,
      });

      expect(result.status).toBe('SUCCESS');
    });
  });

  describe('5. ZERO-LOG PIN Mandate Test', () => {
    it('the PIN never appears in any response body, header or console output', () => {
      const state = createBaseState();
      const secretPin = '8249';

      const logSpy = vi.spyOn(console, 'log');
      const infoSpy = vi.spyOn(console, 'info');
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');

      const result = processTransferDebit(state, {
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
        recipientName: 'Chioma Adebayo',
        amountKobo: 100000,
        pin: secretPin,
        idempotencyKey: 'zero-log-key',
        currentTime: BASE_TIME,
      });

      // 1. Not in console output
      for (const spy of [logSpy, infoSpy, warnSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const formatted = call.map((c) => String(c)).join(' ');
          expect(formatted).not.toContain(secretPin);
        }
      }

      // 2. Not in response / result object or nested fields
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(secretPin);
      expect(serialized).not.toContain('pin": "');

      logSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
