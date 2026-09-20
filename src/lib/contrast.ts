/**
 * WCAG 2.1 Color Contrast & Luminance Calculator
 * Uses exact W3C relative luminance formula: L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */

export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const normalized = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const num = parseInt(normalized, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);

  const linearize = (val: number): number => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function calculateContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export interface ContrastCheckResult {
  fg: string;
  bg: string;
  fgName: string;
  bgName: string;
  ratio: number;
  passesAA: boolean; // >= 4.5:1 for normal text
  passesAALarge: boolean; // >= 3:1 for large text/icons
  passesAAA: boolean; // >= 7.0:1 for normal text
  wcagRating: 'FAIL' | 'AA Large' | 'AA' | 'AAA';
}

export function evaluateContrastPair(
  fgHex: string,
  bgHex: string,
  fgName: string,
  bgName: string
): ContrastCheckResult {
  const ratio = calculateContrastRatio(fgHex, bgHex);
  const passesAA = ratio >= 4.5;
  const passesAALarge = ratio >= 3.0;
  const passesAAA = ratio >= 7.0;

  let wcagRating: 'FAIL' | 'AA Large' | 'AA' | 'AAA' = 'FAIL';
  if (passesAAA) {
    wcagRating = 'AAA';
  } else if (passesAA) {
    wcagRating = 'AA';
  } else if (passesAALarge) {
    wcagRating = 'AA Large';
  }

  return {
    fg: fgHex,
    bg: bgHex,
    fgName,
    bgName,
    ratio,
    passesAA,
    passesAALarge,
    passesAAA,
    wcagRating,
  };
}

export const TERRA_PALM_TOKENS = {
  // Light Mode
  sandBackground: '#FDFBF7',
  cardWhite: '#FFFFFF',
  graphiteBody: '#1A2421',
  slateOliveMuted: '#4A5551',
  palmGreenPrimary: '#0D7855',
  deepTerracottaAccent: '#C2410C',
  lightTerracottaText: '#E05638',
  
  // Dark Mode
  deepMidnightBg: '#0A1411',
  forestCardSurface: '#14241F',
  silkOffWhiteBody: '#F4F6F5',
  mutedMintText: '#94A8A0',
  palmBrightPrimary: '#14A877',
  coralBrightAccent: '#FF6B4A',
};

export const TOKEN_CONTRAST_PAIRS = [
  // Light mode background pairs
  { fg: TERRA_PALM_TOKENS.graphiteBody, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Body (Graphite)', bgName: 'Light Background (Sand)' },
  { fg: TERRA_PALM_TOKENS.slateOliveMuted, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Muted (Slate Olive)', bgName: 'Light Background (Sand)' },
  { fg: TERRA_PALM_TOKENS.palmGreenPrimary, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Brand Green', bgName: 'Light Background (Sand)' },
  { fg: TERRA_PALM_TOKENS.deepTerracottaAccent, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Deep Terracotta Accent', bgName: 'Light Background (Sand)' },
  { fg: TERRA_PALM_TOKENS.lightTerracottaText, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Terracotta (Large/Icon)', bgName: 'Light Background (Sand)' },

  // Light mode card surface pairs
  { fg: TERRA_PALM_TOKENS.graphiteBody, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Body (Graphite)', bgName: 'Light Card Surface (White)' },
  { fg: TERRA_PALM_TOKENS.slateOliveMuted, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Muted (Slate Olive)', bgName: 'Light Card Surface (White)' },

  // Light mode button pairs
  { fg: '#FFFFFF', bg: TERRA_PALM_TOKENS.palmGreenPrimary, fgName: 'White Button Text', bgName: 'Light Primary Green Button' },
  { fg: '#FFFFFF', bg: TERRA_PALM_TOKENS.deepTerracottaAccent, fgName: 'White Button Text', bgName: 'Deep Terracotta Button' },

  // Dark mode background pairs
  { fg: TERRA_PALM_TOKENS.silkOffWhiteBody, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Body (Silk Off-White)', bgName: 'Dark Background (Midnight)' },
  { fg: TERRA_PALM_TOKENS.mutedMintText, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Muted (Muted Mint)', bgName: 'Dark Background (Midnight)' },
  { fg: TERRA_PALM_TOKENS.palmBrightPrimary, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Brand Mint', bgName: 'Dark Background (Midnight)' },
  { fg: TERRA_PALM_TOKENS.coralBrightAccent, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Coral Accent', bgName: 'Dark Background (Midnight)' },

  // Dark mode card surface pairs (#14241F)
  { fg: TERRA_PALM_TOKENS.silkOffWhiteBody, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Body (Silk Off-White)', bgName: 'Dark Card Surface (#14241F)' },
  { fg: TERRA_PALM_TOKENS.mutedMintText, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Muted (Muted Mint)', bgName: 'Dark Card Surface (#14241F)' },

  // Dark mode button pairs
  { fg: TERRA_PALM_TOKENS.deepMidnightBg, bg: TERRA_PALM_TOKENS.palmBrightPrimary, fgName: 'Dark Text (#0A1411)', bgName: 'Dark Primary Mint Button (#14A877)' },
];
