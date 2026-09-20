import { sealSessionState, unsealSessionState, pushUserTransaction, CompactSessionPayload, CompactUserTx, MAX_USER_TX_CAP } from '../src/lib/session';

process.env.SESSION_SECRET = 'dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtb25seTMyYnl0ZXM=';

async function runSessionTests() {
  console.log('=== Kobo Session & Sealed Cookie Test Audit ===\n');

  // Test 1: Encryption / Decryption
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
  if (typeof sealed !== 'string' || sealed.length === 0) {
    throw new Error('Test 1 Failed: sealSessionState returned invalid token');
  }

  const unsealed = await unsealSessionState(sealed);
  if (unsealed.bal !== original.bal || unsealed.pin !== original.pin || unsealed.txs[0].nar !== 'Transfer to Babatunde') {
    throw new Error('Test 1 Failed: unsealSessionState payload mismatch');
  }
  console.log('✅ Test 1 Passed: Encryption and decryption verified.');

  // Test 2: Measured Cookie Size at Max Cap (10 items)
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

  if (sizeInBytes >= 3072) {
    throw new Error(`Test 2 Failed: Sealed token size (${sizeInBytes} bytes) exceeds 3 KB limit!`);
  }
  console.log(`✅ Test 2 Passed: Sealed JWE cookie size is ${sizeInBytes} bytes (< 3,072 bytes cap limit).`);

  // Test 3: Roll-off cap
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
  if (!result.rolledOff || result.updatedState.txs.length !== 10 || result.updatedState.txs[0].id !== 'TX_NEW_11') {
    throw new Error('Test 3 Failed: Roll-off cap did not pop oldest transaction');
  }
  console.log('✅ Test 3 Passed: 11th transaction successfully rolled off oldest transaction.');

  console.log('\n====================================================');
  console.log('✅ All session cookie tests passed cleanly!');
}

runSessionTests().catch(err => {
  console.error('Session test failed:', err);
  process.exit(1);
});
