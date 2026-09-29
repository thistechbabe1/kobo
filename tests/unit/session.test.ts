import { describe, it, expect, beforeEach } from 'vitest';
import {
  sealSessionState,
  unsealSessionState,
  pushUserTransaction,
  CompactSessionPayload,
  CompactUserTx,
  MAX_USER_TX_CAP,
} from '../../src/lib/session';

const TEST_SECRET = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';

describe('jose Encrypted Cookie State (lib/session)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it('should encrypt and decrypt session state correctly', async () => {
    const original: CompactSessionPayload = {
      bal: 18500000, // ₦185,000.00
      pin: 1,
      loc: null,
      txs: [
        {
          id: 'TX123456',
          typ: 'D',
          cat: 'TRF',
          amt: 500000,
          nar: 'Transfer to Babatunde',
          rec: 'Babatunde O.',
          bnk: '058',
          acc: '1234',
          ts: Date.now(),
        },
      ],
      ik: ['4b445214-e53b-4cb5-b541-e94d80a1c3f1'],
    };

    const sealed = await sealSessionState(original);
    expect(typeof sealed).toBe('string');
    expect(sealed.length).toBeGreaterThan(0);

    const unsealed = await unsealSessionState(sealed);
    expect(unsealed.bal).toBe(original.bal);
    expect(unsealed.pin).toBe(original.pin);
    expect(unsealed.txs).toHaveLength(1);
    expect(unsealed.txs[0].nar).toBe('Transfer to Babatunde');
    expect(unsealed.ik).toEqual(['4b445214-e53b-4cb5-b541-e94d80a1c3f1']);
  });

  it('MEASURED COOKIE SIZE TEST: worst-case fields with 10 user transactions AND 5 idempotency keys must remain strictly under 3 KB (3072 bytes)', async () => {
    const worstCaseTxs: CompactUserTx[] = Array.from({ length: MAX_USER_TX_CAP }, (_, i) => ({
      id: `TX99990${i}`,
      typ: 'D',
      cat: 'TRANSFER', // 8 chars
      amt: 99999999, // 8-digit Kobo amount
      nar: 'Payment for groceries & supplies', // exactly 32 -> capped at 30: 'Payment for groceries & suppl.'
      rec: 'Folashade Danjuma-Az', // exactly 20 chars
      bnk: 'First City Monument Bank (FCMB)', // 31 chars (longest bank name)
      acc: '9876', // 4 chars
      ts: 1758320000000 + i * 60000,
      status: 'Completed',
    }));

    const worstCaseIks = [
      'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
      '7b6c5432-89ab-4cde-0123-456789abcdef',
      '11223344-5566-7788-99aa-bbccddeeff00',
      'aabbccdd-eeff-0011-2233-445566778899',
      '99887766-5544-3322-1100-ffeeddccbbaa',
    ];

    const worstCasePayload: CompactSessionPayload = {
      bal: 99999999,
      pin: 3,
      loc: 1759000000000 + 900000,
      txs: worstCaseTxs,
      ik: worstCaseIks,
    };

    const sealedToken = await sealSessionState(worstCasePayload);
    const sizeInBytes = new TextEncoder().encode(sealedToken).byteLength;

    console.log(`[Cookie Size Measurement] Sealed JWE token size with WORST-CASE fields (10 txs + 5 keys): ${sizeInBytes} bytes`);

    // Must be strictly under 3,000 bytes (safely within 3 KB / 3072 bytes limit)
    expect(sizeInBytes).toBeLessThan(3000);
  });

  it('should enforce MAX_USER_TX_CAP (8 items) and roll off oldest transaction when 9th is added', () => {
    const state: CompactSessionPayload = {
      bal: 20000000,
      pin: 0,
      loc: null,
      txs: Array.from({ length: MAX_USER_TX_CAP }, (_, i) => ({
        id: `TX_OLD_${i}`,
        typ: 'D',
        cat: 'TRF',
        amt: 10000,
        nar: `Tx ${i}`,
        ts: 1000 + i,
      })),
      ik: [],
    };

    const newTx: CompactUserTx = {
      id: 'TX_NEW_9',
      typ: 'D',
      cat: 'UTL',
      amt: 50000,
      nar: 'Latest 9th payment',
      ts: 2000,
    };

    const result = pushUserTransaction(state, newTx);

    expect(result.rolledOff).toBe(true);
    expect(result.updatedState.txs).toHaveLength(MAX_USER_TX_CAP);
    expect(result.updatedState.txs[0].id).toBe('TX_NEW_9');
    expect(result.updatedState.txs.some(t => t.id === `TX_OLD_${MAX_USER_TX_CAP - 1}`)).toBe(false);
  });

  it('should fail loudly if SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET;
    await expect(sealSessionState({ bal: 100, pin: 0, loc: null, txs: [], ik: [] })).rejects.toThrow(
      'SESSION_SECRET environment variable is missing'
    );
  });
});
