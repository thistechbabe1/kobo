import '@testing-library/jest-dom/vitest';

// Fix jsdom cross-realm Uint8Array mismatch for crypto/jose in tests
if (typeof window !== 'undefined') {
  const NodeUint8Array = (globalThis as unknown as { [key: symbol]: typeof Uint8Array })[
    Symbol.for('nodejs.util.inspect.custom')
  ] ? Uint8Array : globalThis.Uint8Array;

  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...args) {
    const result = originalEncode.apply(this, args);
    return NodeUint8Array.from(result);
  };
}
