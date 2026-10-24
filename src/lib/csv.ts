/**
 * Browser CSV export utilities with RFC 4180 escaping, formula injection protection,
 * and integer-kobo to decimal-naira conversion without floating-point arithmetic.
 */
import { CompactUserTx, calculateTransferFeeKobo } from './session';
import { getTransactionStatus } from './transactions';

/**
 * Converts integer kobo into a decimal Naira string with two decimal places
 * strictly avoiding floating-point division (e.g. 5 -> "0.05", 100 -> "1.00", 12345 -> "123.45").
 */
export function formatKoboToNaira(kobo: number): string {
  const isNegative = kobo < 0;
  const absKobo = Math.abs(Math.trunc(kobo));
  const naira = Math.floor(absKobo / 100);
  const fraction = absKobo % 100;
  const sign = isNegative ? '-' : '';
  return `${sign}${naira}.${fraction.toString().padStart(2, '0')}`;
}

/**
 * Escapes a CSV cell value following RFC 4180 rules.
 *
 * When `guardFormulaInjection` is true (applied to text columns: reference, narration,
 * recipient, type, status), dangerous leading characters (=, +, -, @, \t, \r) are prefixed
 * with a single quote (') to mitigate formula and DDE command execution in spreadsheets.
 *
 * Numeric columns (Amount and Fee) MUST pass `guardFormulaInjection = false` so that negative
 * debit amounts (e.g., "-2500.00") remain standard unquoted numbers for spreadsheet calculations.
 */
export function escapeCsvCell(
  val: string | number | null | undefined,
  guardFormulaInjection: boolean = true
): string {
  if (val === null || val === undefined) {
    return '';
  }

  let str = String(val);

  // 1. CSV injection mitigation for text fields:
  // Spreadsheets treat =, +, -, @, \t, and \r as formula or command triggers.
  if (guardFormulaInjection && str.length > 0) {
    const firstChar = str.charAt(0);
    if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
      str = `'${str}`;
    }
  }

  // 2. RFC 4180 escaping: fields containing commas, double quotes, or newlines must be enclosed in quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export const TRANSACTION_CSV_HEADERS = [
  'Date',
  'Reference',
  'Type',
  'Narration',
  'Recipient',
  'Amount',
  'Fee',
  'Status',
] as const;

/**
 * Generates an RFC 4180 CSV string for the supplied transactions list.
 * Applies formula injection guard only to text columns (reference, type, narration, recipient, status).
 * Amount and Fee are numeric and never formula-guarded, ensuring debit amounts (e.g. -2500.00)
 * and fees (e.g. 10.00) remain raw unquoted numbers.
 */
export function generateTransactionsCsv(transactions: CompactUserTx[]): string {
  const header = TRANSACTION_CSV_HEADERS.map((h) => escapeCsvCell(h, true)).join(',');
  const rows = transactions.map((tx) => {
    const isDebit = tx.typ === 'D';
    const feeKobo = isDebit ? calculateTransferFeeKobo(tx.amt) : 0;
    const dateIso = new Date(tx.ts).toISOString();
    const typeLabel = tx.typ === 'C' ? 'Credit' : 'Debit';
    const status = getTransactionStatus(tx);

    // Debits are output as negative amounts e.g. -2500.00
    const rawKobo = isDebit ? -Math.abs(tx.amt) : Math.abs(tx.amt);
    const amountStr = formatKoboToNaira(rawKobo);
    const feeStr = formatKoboToNaira(feeKobo);

    const row = [
      escapeCsvCell(dateIso, false),
      escapeCsvCell(tx.id, true),
      escapeCsvCell(typeLabel, true),
      escapeCsvCell(tx.nar, true),
      escapeCsvCell(tx.rec ?? '', true),
      escapeCsvCell(amountStr, false), // Numeric: guardFormulaInjection = false
      escapeCsvCell(feeStr, false),    // Numeric: guardFormulaInjection = false
      escapeCsvCell(status, true),
    ];

    return row.join(',');
  });

  return [header, ...rows].join('\r\n');
}

/**
 * Triggers a browser file download of CSV content with a UTF-8 BOM so spreadsheet
 * tools (like Microsoft Excel) properly decode UTF-8 characters and currency markers.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM)
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
