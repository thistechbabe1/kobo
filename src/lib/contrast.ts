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
  // Light Mode Surfaces
  sandBackground: '#FDFBF7',
  cardWhite: '#FFFFFF',
  heroCardLight: '#0D7855', // Hero card background in light mode
  
  // Light Mode Text & Icons
  graphiteBody: '#1A2421',
  slateOliveMuted: '#4A5551',
  palmGreenCredit: '#0D7855', // Credit text / icon on light page & card
  deepTerracottaDebit: '#C2410C', // Debit text on light page & card (5.01:1 on sand, 5.18:1 on white)
  lightTerracottaIcon: '#E05638', // Icon on sand (3.66:1, passes 3:1 graphic rule)
  
  // Dark Mode Surfaces
  deepMidnightBg: '#0A1411',
  forestCardSurface: '#14241F',
  heroCardDark: '#14241F',
  
  // Dark Mode Text & Icons
  silkOffWhiteBody: '#F4F6F5',
  mutedMintText: '#94A8A0',
  palmBrightCredit: '#14A877', // Credit text on dark page (6.15:1) & card (5.31:1)
  coralDebitTextDark: '#FF6B4A', // Debit text on dark page (6.65:1) & card (5.73:1) - PASSES AA!
};

export const TOKEN_CONTRAST_PAIRS = [
  // Light Mode - Main Page Surface (#FDFBF7)
  { fg: TERRA_PALM_TOKENS.graphiteBody, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Body (Graphite)', bgName: 'Light Page (Sand)' },
  { fg: TERRA_PALM_TOKENS.slateOliveMuted, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Muted Text', bgName: 'Light Page (Sand)' },
  { fg: TERRA_PALM_TOKENS.palmGreenCredit, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Semantic Credit Text', bgName: 'Light Page (Sand)' },
  { fg: TERRA_PALM_TOKENS.deepTerracottaDebit, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Semantic Debit Text', bgName: 'Light Page (Sand)' },
  { fg: TERRA_PALM_TOKENS.lightTerracottaIcon, bg: TERRA_PALM_TOKENS.sandBackground, fgName: 'Light Graphic Icon (Terracotta)', bgName: 'Light Page (Sand)', isGraphic: true },

  // Light Mode - Card Surface (#FFFFFF)
  { fg: TERRA_PALM_TOKENS.graphiteBody, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Body (Graphite)', bgName: 'Light Card (White)' },
  { fg: TERRA_PALM_TOKENS.slateOliveMuted, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Muted Text', bgName: 'Light Card (White)' },
  { fg: TERRA_PALM_TOKENS.palmGreenCredit, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Semantic Credit Text', bgName: 'Light Card (White)' },
  { fg: TERRA_PALM_TOKENS.deepTerracottaDebit, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Light Semantic Debit Text', bgName: 'Light Card (White)' },

  // Light Mode - Buttons & Hero
  { fg: '#FFFFFF', bg: TERRA_PALM_TOKENS.palmGreenCredit, fgName: 'White Text', bgName: 'Light Green Button/Hero' },
  { fg: '#FFFFFF', bg: TERRA_PALM_TOKENS.deepTerracottaDebit, fgName: 'White Text', bgName: 'Deep Terracotta Button' },

  // Dark Mode - Main Page Surface (#0A1411)
  { fg: TERRA_PALM_TOKENS.silkOffWhiteBody, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Body (Silk Off-White)', bgName: 'Dark Page (Midnight)' },
  { fg: TERRA_PALM_TOKENS.mutedMintText, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Muted Text', bgName: 'Dark Page (Midnight)' },
  { fg: TERRA_PALM_TOKENS.palmBrightCredit, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Semantic Credit Text', bgName: 'Dark Page (Midnight)' },
  { fg: TERRA_PALM_TOKENS.coralDebitTextDark, bg: TERRA_PALM_TOKENS.deepMidnightBg, fgName: 'Dark Semantic Debit Text (#FF6B4A)', bgName: 'Dark Page (Midnight)' },

  // Dark Mode - Card Surface (#14241F)
  { fg: TERRA_PALM_TOKENS.silkOffWhiteBody, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Body (Silk Off-White)', bgName: 'Dark Card (#14241F)' },
  { fg: TERRA_PALM_TOKENS.mutedMintText, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Muted Text', bgName: 'Dark Card (#14241F)' },
  { fg: TERRA_PALM_TOKENS.palmBrightCredit, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Semantic Credit Text', bgName: 'Dark Card (#14241F)' },
  { fg: TERRA_PALM_TOKENS.coralDebitTextDark, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Dark Semantic Debit Text (#FF6B4A)', bgName: 'Dark Card (#14241F)' },

  // Dark Mode - Buttons & Hero Text
  { fg: TERRA_PALM_TOKENS.deepMidnightBg, bg: TERRA_PALM_TOKENS.palmBrightCredit, fgName: 'Dark Text (#0A1411)', bgName: 'Dark Primary Mint Button' },
  { fg: '#FFFFFF', bg: TERRA_PALM_TOKENS.heroCardDark, fgName: 'White Hero Card Text', bgName: 'Dark Hero Card (#14241F)' },
  { fg: TERRA_PALM_TOKENS.palmBrightCredit, bg: TERRA_PALM_TOKENS.heroCardDark, fgName: 'Mint Hero Card Accent', bgName: 'Dark Hero Card (#14241F)' },

  // Chart Series Colors against Card Surfaces (Graphic/Icon 3.0:1 threshold)
  { fg: TERRA_PALM_TOKENS.palmGreenCredit, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Income Chart Series (Palm Green)', bgName: 'Light Card (White)', isGraphic: true },
  { fg: TERRA_PALM_TOKENS.deepTerracottaDebit, bg: TERRA_PALM_TOKENS.cardWhite, fgName: 'Expense Chart Series (Terracotta)', bgName: 'Light Card (White)', isGraphic: true },
  { fg: TERRA_PALM_TOKENS.palmBrightCredit, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Income Chart Series (Mint)', bgName: 'Dark Card (#14241F)', isGraphic: true },
  { fg: TERRA_PALM_TOKENS.coralDebitTextDark, bg: TERRA_PALM_TOKENS.forestCardSurface, fgName: 'Expense Chart Series (Coral #FF6B4A)', bgName: 'Dark Card (#14241F)', isGraphic: true },
];
