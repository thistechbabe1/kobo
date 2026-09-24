import { describe, it, expect } from 'vitest';
import { TOKEN_CONTRAST_PAIRS, evaluateContrastPair } from '../../src/lib/contrast';

describe('WCAG 2.1 Contrast Ratios', () => {
  it('should verify all design token text/background pairs pass WCAG AA (>= 4.5:1 for body, >= 3.0:1 for large/graphics)', () => {
    for (const pair of TOKEN_CONTRAST_PAIRS) {
      const result = evaluateContrastPair(pair.fg, pair.bg, pair.fgName, pair.bgName);
      
      // Graphic/icon elements (isGraphic: true) are allowed AA Large (>= 3.0:1 per WCAG 1.4.11)
      if (pair.isGraphic) {
        expect(result.ratio, `${pair.fgName} on ${pair.bgName} (graphic/icon, need >= 3:1)`).toBeGreaterThanOrEqual(3.0);
      } else {
        expect(result.ratio, `${pair.fgName} on ${pair.bgName} (body text, need >= 4.5:1)`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('should correctly mark dark primary mint button text as passing AA with dark text (#0A1411 on #14A877 = 6.15:1)', () => {
    const result = evaluateContrastPair('#0A1411', '#14A877', 'Dark Text', 'Dark Mint Button');
    // Measured ratio: 6.15:1 – passes AA (>= 4.5) but NOT AAA (>= 7.0)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.ratio).toBeLessThan(7.0);
    expect(result.wcagRating).toBe('AA');
  });

  it('should verify white text on dark mint button fails 4.5:1 contrast', () => {
    const result = evaluateContrastPair('#FFFFFF', '#14A877', 'White Text', 'Dark Mint Button');
    expect(result.ratio).toBeLessThan(4.5);
  });
});
