import { describe, it, expect } from 'vitest';
import { TOKEN_CONTRAST_PAIRS, evaluateContrastPair } from '../../src/lib/contrast';

describe('WCAG 2.1 Contrast Ratios', () => {
  it('should verify all design token text/background pairs pass WCAG AA (>= 4.5:1 for body, >= 3.0:1 for large/graphics)', () => {
    for (const pair of TOKEN_CONTRAST_PAIRS) {
      const result = evaluateContrastPair(pair.fg, pair.bg, pair.fgName, pair.bgName);
      
      // Large/graphics elements are allowed AA Large (>= 3.0:1)
      if (pair.fgName.includes('Large')) {
        expect(result.ratio).toBeGreaterThanOrEqual(3.0);
      } else {
        expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('should correctly mark dark primary mint button text as passing AAA with dark text (#0A1411 on #14A877)', () => {
    const result = evaluateContrastPair('#0A1411', '#14A877', 'Dark Text', 'Dark Mint Button');
    expect(result.ratio).toBeGreaterThanOrEqual(7.0);
    expect(result.wcagRating).toBe('AAA');
  });

  it('should verify white text on dark mint button fails 4.5:1 contrast', () => {
    const result = evaluateContrastPair('#FFFFFF', '#14A877', 'White Text', 'Dark Mint Button');
    expect(result.ratio).toBeLessThan(4.5);
  });
});
