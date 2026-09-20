import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    };

    const sealed = await sealSessionState(original);
    expect(typeof sealed).toBe('string');
    expect(sealed.length).toBeGreaterThan(0);

    const unsealed = await unsealSessionState(sealed);
    expect(unsealed.bal).toBe(original.bal);
    expect(unsealed.pin).toBe(original.pin);
    expect(unsealed.txs).toHaveLength(1);
    expect(unsealed.txs[0].nar).toBe('Transfer to Babatunde');
  });

  it('MEASURED COOKIE SIZE TEST: max 10 user transactions must remain well under 3 KB (3072 bytes)', async () => {
    const fullTxs: CompactUserTx[] = Array.from({ length: MAX_USER_TX_CAP }, (_, i) => ({
      id: `TX99990${i}`,
      typ: i % 2 === 0 ? 'D' : 'C',
      cat: 'TRANSFER',
      amt: 1500000 + i * 1000,
      nar: `Payment narration sample item ${i + 1}`,
      rec: `Adefemi Oluwaseun ${i + 1}`,
      bnk: '033',
      acc: '9876',
      ts: 1758320000000 + i * 60000,
    }));

    const fullPayload: CompactSessionPayload = {
      bal: 24500000,
      pin: 0,
      loc: null,
      txs: fullTxs,
    };

    const sealedToken = await sealSessionState(fullPayload);
    const sizeInBytes = new TextEncoder().encode(sealedToken).byteLength;

    console.log(`[Cookie Size Measurement] Sealed JWE token size with 10 user transactions: ${sizeInBytes} bytes`);

    // Must be well under 3 KB limit (3072 bytes)
    expect(sizeInBytes).toBeLessThan(3072);
  });

  it('should enforce MAX_USER_TX_CAP (10 items) and roll off oldest transaction when 11th is added', () => {
    let state: CompactSessionPayload = {
      bal: 20000000,
      pin: 0,
      loc: null,
      txs: Array.from({ length: 10 }, (_, i) => ({
        id: `TX_OLD_${i}`,
        typ: 'D',
        cat: 'TRF',
        amt: 10000,
        nar: `Tx ${i}`,
        ts: 1000 + i,
      })),
    };

    const newTx: CompactUserTx = {
      id: 'TX_NEW_11',
      typ: 'D',
      cat: 'UTL',
      amt: 50000,
      nar: 'Latest 11th payment',
      ts: 2000,
    };

    const result = pushUserTransaction(state, newTx);

    expect(result.rolledOff).toBe(true);
    expect(result.updatedState.txs).toHaveLength(10);
    expect(result.updatedState.txs[0].id).toBe('TX_NEW_11');
    expect(result.updatedState.txs.some(t => t.id === 'TX_OLD_9')).toBe(false);
  });

  it('should fail loudly if SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET;
    await expect(sealSessionState({ bal: 100, pin: 0, loc: null, txs: [] })).rejects.toThrow(
      'SESSION_SECRET environment variable is missing'
    );
  });
});
