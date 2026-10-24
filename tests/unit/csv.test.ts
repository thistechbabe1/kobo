// @vitest-environment jsdom
/**
 * Unit tests for CSV generation, RFC 4180 escaping, formula injection protection,
 * and integer-kobo to decimal-naira conversion without floating-point arithmetic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatKoboToNaira,
  escapeCsvCell,
  generateTransactionsCsv,
  downloadCsv,
  TRANSACTION_CSV_HEADERS,
} from '@/lib/csv';
import { CompactUserTx } from '@/lib/session';

describe('CSV Utilities (src/lib/csv.ts)', () => {
  describe('formatKoboToNaira', () => {
    it('formats edge integer kobo values without floating-point drift', () => {
      // Zero and edge amounts specifically requested
      expect(formatKoboToNaira(0)).toBe('0.00');
      expect(formatKoboToNaira(5)).toBe('0.05');
      expect(formatKoboToNaira(100)).toBe('1.00');
      expect(formatKoboToNaira(12345)).toBe('123.45');

      // Additional boundary amounts
      expect(formatKoboToNaira(1)).toBe('0.01');
      expect(formatKoboToNaira(99)).toBe('0.99');
      expect(formatKoboToNaira(105)).toBe('1.05');
      expect(formatKoboToNaira(500000)).toBe('5000.00');
      expect(formatKoboToNaira(10000000)).toBe('100000.00');
    });

    it('handles negative kobo amounts correctly', () => {
      expect(formatKoboToNaira(-5)).toBe('-0.05');
      expect(formatKoboToNaira(-100)).toBe('-1.00');
      expect(formatKoboToNaira(-12345)).toBe('-123.45');
      expect(formatKoboToNaira(-250000)).toBe('-2500.00');
    });
  });

  describe('escapeCsvCell', () => {
    it('handles null, undefined, and empty string', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell('')).toBe('');
    });

    it('passes safe alphanumeric text unchanged', () => {
      expect(escapeCsvCell('Transfer to Chioma')).toBe('Transfer to Chioma');
      expect(escapeCsvCell('12345')).toBe('12345');
      expect(escapeCsvCell('TX-89721345')).toBe('TX-89721345');
    });

    it('mitigates CSV formula injection for cells starting with =, +, -, @, \\t, and \\r', () => {
      // Equals injection
      expect(escapeCsvCell('=1+2')).toBe("'=1+2");
      expect(escapeCsvCell('=cmd|\' /C calc\'!A0')).toBe("'=cmd|' /C calc'!A0");

      // Hyperlink injection
      expect(escapeCsvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');

      // Plus injection
      expect(escapeCsvCell('+2348012345678')).toBe("'+2348012345678");

      // Minus injection in text field
      expect(escapeCsvCell('-1500.00')).toBe("'-1500.00");

      // At sign injection
      expect(escapeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");

      // Leading Tab injection
      expect(escapeCsvCell('\tsecret_command')).toBe("'\tsecret_command");

      // Leading Carriage Return injection (contains \\r, so RFC 4180 quotes it)
      expect(escapeCsvCell('\rcommand')).toBe('"\'\rcommand"');
    });

    it('bypasses formula guard for numeric columns so debit amounts remain unquoted numbers', () => {
      // Debit amount with leading minus must stay unquoted and un-prefixed
      expect(escapeCsvCell('-2500.00', false)).toBe('-2500.00');
      expect(escapeCsvCell('0.00', false)).toBe('0.00');
      expect(escapeCsvCell('15000.00', false)).toBe('15000.00');
      expect(escapeCsvCell('10.00', false)).toBe('10.00');
    });

    it('encloses fields containing commas in double quotes', () => {
      expect(escapeCsvCell('Lagos, Nigeria')).toBe('"Lagos, Nigeria"');
      expect(escapeCsvCell('Transfer, fee, total')).toBe('"Transfer, fee, total"');
    });

    it('escapes and encloses fields containing double quotes', () => {
      expect(escapeCsvCell('Dinner at "The Place"')).toBe('"Dinner at ""The Place"""');
      expect(escapeCsvCell('"quoted"')).toBe('"""quoted"""');
    });

    it('encloses fields containing newline characters in double quotes', () => {
      expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
    });

    it('escapes narration containing a comma, a quote, and a newline', () => {
      expect(escapeCsvCell('Shopping, "groceries"\nand snacks')).toBe('"Shopping, ""groceries""\nand snacks"');
    });

    it('combines formula injection defense with quote escaping when necessary', () => {
      expect(escapeCsvCell('=SUM("A", "B")')).toBe('"\'=SUM(""A"", ""B"")"');
      expect(escapeCsvCell('+1,200.00')).toBe('"\' +1,200.00"'.replace(' ', ''));
    });
  });

  describe('generateTransactionsCsv', () => {
    const mockTxs: CompactUserTx[] = [
      {
        id: 'tx-001',
        typ: 'D',
        cat: 'TRF',
        amt: 250000, // ₦2,500.00 debit -> Amount: -2500.00 (unquoted), Fee: 0.00
        nar: 'Payment for groceries',
        rec: 'Chioma Adebayo',
        ts: 1773000000000,
        status: 'Completed',
      },
      {
        id: 'tx-002',
        typ: 'C',
        cat: 'SAL',
        amt: 25000000, // ₦250,000.00 credit -> Amount: 250000.00, Fee: 0.00
        nar: 'Monthly Salary, March',
        rec: 'Employer Inc',
        ts: 1773100000000,
        status: 'Completed',
      },
      {
        id: 'tx-003',
        typ: 'D',
        cat: 'UTL',
        amt: 1500000, // ₦15,000.00 debit -> Amount: -15000.00, Fee: 10.00
        nar: '=HYPERLINK("http://x","y")',
        ts: 1773200000000,
        status: 'Pending',
      },
      {
        id: 'tx-004',
        typ: 'D',
        cat: 'TRF',
        amt: 500, // ₦5.00 debit -> Amount: -5.00, Fee: 0.00
        nar: '\tTabbedNarration',
        rec: '\rReturnRecipient',
        ts: 1773300000000,
        status: 'Failed',
      },
      {
        id: 'tx-005',
        typ: 'D',
        cat: 'GRO',
        amt: 80000, // ₦800.00 debit
        nar: 'Shopping, "groceries"\nand snacks',
        ts: 1773400000000,
        status: 'Completed',
      },
    ];

    it('produces RFC 4180 CSV with unquoted debit amounts, guarded text cells, and correct columns', () => {
      const csv = generateTransactionsCsv(mockTxs);
      const lines = csv.split('\r\n');

      expect(lines[0]).toBe(TRANSACTION_CSV_HEADERS.join(','));
      expect(lines.length).toBe(6); // Header + 5 records

      // Row 1: Debit amount is formatted as plain "-2500.00" without quotes or formula injection prefix
      expect(lines[1]).toContain('tx-001');
      expect(lines[1]).toContain('Debit');
      expect(lines[1]).toContain('Payment for groceries');
      expect(lines[1]).toContain('Chioma Adebayo');
      expect(lines[1]).toContain(',-2500.00,0.00,'); // Debit amount and fee unquoted
      expect(lines[1]).toContain('Completed');

      // Row 2: Credit amount is positive "250000.00", comma in narration quoted
      expect(lines[2]).toContain('tx-002');
      expect(lines[2]).toContain('Credit');
      expect(lines[2]).toContain('"Monthly Salary, March"');
      expect(lines[2]).toContain(',250000.00,0.00,');
      expect(lines[2]).toContain('Completed');

      // Row 3: Formula injection narration =HYPERLINK("http://x","y") is guarded with quote and escaped
      expect(lines[3]).toContain('tx-003');
      expect(lines[3]).toContain('"\'=HYPERLINK(""http://x"",""y"")"');
      expect(lines[3]).toContain(',-15000.00,10.00,');

      // Row 4: Leading tab and CR in text fields get formula guard
      expect(lines[4]).toContain('tx-004');
      expect(lines[4]).toContain("'\tTabbedNarration");
      expect(lines[4]).toContain('"\'\rReturnRecipient"');
      expect(lines[4]).toContain(',-5.00,0.00,');

      // Row 5: Narration with comma, quote, and newline is quoted and internal quotes doubled
      expect(lines[5]).toContain('tx-005');
      expect(lines[5]).toContain('"Shopping, ""groceries""\nand snacks"');
      expect(lines[5]).toContain(',-800.00,0.00,');
    });
  });

  describe('downloadCsv', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-uuid');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('creates an anchor, triggers download, and cleans up elements and object URLs', () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      // Spy on link creation
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      downloadCsv('kobo-statement-2026-10-20.csv', 'Date,Reference\r\n2026-10-20,TX-01');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/mock-uuid');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
