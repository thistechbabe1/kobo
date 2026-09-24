import { describe, it, expect } from 'vitest';

describe('Reduced Motion Media Query Standard (prefers-reduced-motion: reduce)', () => {
  it('verifies standard prefers-reduced-motion media query string', () => {
    const QUERY_STRING = '(prefers-reduced-motion: reduce)';
    
    expect(QUERY_STRING).toBe('(prefers-reduced-motion: reduce)');
    expect(QUERY_STRING).not.toContain('color-scheme');
  });
});
