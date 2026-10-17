/**
 * Unit tests for JWE session encryption, ring-buffer transaction capping,
 * and RFC 6265 cookie size budget compliance (< 4,096 bytes).
 */
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

  it('MEASURED COOKIE SIZE TEST: worst-case fields with 8 user transactions, 5 idempotency keys, AND 5 beneficiaries must remain under 3,500-byte budget and 4,096-byte RFC 6265 limit', async () => {
    const worstCaseTxs: CompactUserTx[] = Array.from({ length: MAX_USER_TX_CAP }, (_, i) => ({
      id: `TX99990${i}`,
      typ: 'D',
      cat: 'TRF', // 3 chars
      amt: 99999999, // 8-digit Kobo amount
      nar: 'Payment for groceries & suppl.', // 30 chars
      rec: 'Folashade Danjuma-Az', // 20 chars
      bnk: '058', // 3 chars
      acc: '9876', // 4 chars
      ts: 1758320000000 + i * 60000,
    }));

    const worstCaseIks = [
      'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
      '7b6c5432-89ab-4cde-0123-456789abcdef',
      '11223344-5566-7788-99aa-bbccddeeff00',
      'aabbccdd-eeff-0011-2233-445566778899',
      '99887766-5544-3322-1100-ffeeddccbbaa',
    ];

    // Beneficiaries with 40-character recipient names and 4-char bank short code/name
    const worstCaseBens = Array.from({ length: 5 }, (_, i) => ({
      id: `ben_${i + 1}`,
      a: `012345678${i}`,
      b: '214',
      n: 'FCMB',
      r: ('Oluwaseun Babatunde-Oladipo-Williams-' + (i + 1)).padEnd(40, 'X').slice(0, 40), // EXACTLY 40 chars
      t: 1758320000000 + i * 1000,
    }));

    const worstCasePayload: CompactSessionPayload = {
      bal: 99999999,
      pin: 3,
      loc: 1759000000000 + 900000,
      txs: worstCaseTxs,
      ik: worstCaseIks,
      ben: worstCaseBens,
    };

    const sealedToken = await sealSessionState(worstCasePayload);
    const sizeInBytes = new TextEncoder().encode(sealedToken).byteLength;

    console.log(`[Cookie Size Measurement] Sealed JWE token size with 8 txs, 5 keys, and 5 beneficiaries (40-char names): ${sizeInBytes} bytes`);
    console.log(`  - 8 Txs: narrations = ${worstCaseTxs[0].nar.length} chars, recipient names = ${worstCaseTxs[0].rec?.length} chars`);
    console.log(`  - 5 IKs: length = ${worstCaseIks[0].length} chars UUIDs`);
    console.log(`  - 5 Bens: recipient names = ${worstCaseBens[0].r.length} chars ('${worstCaseBens[0].r}')`);
    console.log(`  - Margin under 3,500 bytes budget: ${3500 - sizeInBytes} bytes`);
    console.log(`  - Margin under 4,096 bytes RFC 6265 limit: ${4096 - sizeInBytes} bytes`);

    // Budget set to 3,500 bytes: provides an operational safety ceiling for worst-case payload
    // (8 user transactions, 5 UUID idempotency keys, and 5 beneficiaries with 40-character recipient names),
    // allowing headroom for base64url overhead and encryption metadata while strictly preventing cookie bloat.
    expect(sizeInBytes).toBeLessThan(3500);

    // Hard assertion: sealed cookie must strictly remain under the 4,096-byte RFC 6265 browser cookie limit
    expect(sizeInBytes).toBeLessThan(4096);
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

  it('should fail loudly in production if SESSION_SECRET is missing', async () => {
    const prevEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;

    await expect(
      sealSessionState({ bal: 100, pin: 0, loc: null, txs: [], ik: [] })
    ).rejects.toThrow('SESSION_SECRET environment variable is missing in production');

    (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  it('should fall back to development key when SESSION_SECRET is missing in non-production', async () => {
    const prevEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.SESSION_SECRET;

    const sealed = await sealSessionState({ bal: 100, pin: 0, loc: null, txs: [], ik: [] });
    expect(typeof sealed).toBe('string');
    expect(sealed.length).toBeGreaterThan(0);

    const unsealed = await unsealSessionState(sealed);
    expect(unsealed.bal).toBe(100);

    (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    process.env.SESSION_SECRET = TEST_SECRET;
  });
});
