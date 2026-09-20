import { TOKEN_CONTRAST_PAIRS, evaluateContrastPair } from '../src/lib/contrast';

console.log('=== Kobo Design System - WCAG 2.1 Contrast Audit ===\n');

let hasFailure = false;
const rows: string[] = [];

rows.push('| Element / Pair | Foreground | Background | Calculated Ratio | WCAG Rating | Status |');
rows.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

for (const pair of TOKEN_CONTRAST_PAIRS) {
  const result = evaluateContrastPair(pair.fg, pair.bg, pair.fgName, pair.bgName);

  if (result.wcagRating === 'FAIL') {
    hasFailure = true;
  }

  const statusBadge = result.wcagRating === 'FAIL' ? '❌ FAIL' : '✅ PASS';
  rows.push(
    `| **${pair.fgName} on ${pair.bgName}** | \`${pair.fg}\` | \`${pair.bg}\` | **${result.ratio.toFixed(2)}:1** | **${result.wcagRating}** | ${statusBadge} |`
  );
}

console.log(rows.join('\n'));
console.log('\n====================================================');

if (hasFailure) {
  console.error('❌ Contrast check FAILED: One or more pairs failed WCAG AA requirement.');
  process.exit(1);
} else {
  console.log('✅ All token contrast pairs passed WCAG AA / AAA requirements!');
}
