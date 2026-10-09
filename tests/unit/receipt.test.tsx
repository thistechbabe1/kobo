// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OfficialReceipt, ReceiptData, generateNipSessionId } from '@/components/receipt/OfficialReceipt';
import { TransactionReceiptModal } from '@/components/receipt/TransactionReceiptModal';
import { TransactionBrowser } from '@/components/transactions/TransactionBrowser';
import { CompactUserTx } from '@/lib/session';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/transactions',
  useSearchParams: () => new URLSearchParams(),
}));

const mockReceipt: ReceiptData = {
  id: 'TX892101',
  recipientName: 'Emeka Okonkwo',
  bankName: 'Guaranty Trust Bank (GTBank)',
  bankCode: '058',
  accountNumber: '0000000001',
  amountKobo: 5000000, // ₦50,000.00
  feeKobo: 1000, // ₦10.00
  totalDebitKobo: 501000,
  narration: 'Freelance Project Settlement',
  timestamp: 1775736000000,
  status: 'Completed',
  senderName: 'Babatunde A. • Kobo Wallet',
};

const mockTransactions: CompactUserTx[] = [
  {
    id: 'TX892101',
    typ: 'D',
    cat: 'TRF',
    amt: 5000000,
    nar: 'Freelance Project Settlement',
    rec: 'Emeka Okonkwo',
    bnk: '058',
    acc: '0001',
    ts: 1775736000000,
    status: 'Completed',
  },
];

describe('Official Receipts & Modals (Feature 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('OfficialReceipt Component', () => {
    it('renders CBN compliant header, reference, formatted amounts, and breakdown', () => {
      render(<OfficialReceipt receipt={mockReceipt} />);

      expect(screen.getByTestId('official-receipt-card')).toBeInTheDocument();
      expect(screen.getByText('CBN Compliant')).toBeInTheDocument();
      expect(screen.getByText('Official Electronic Payment Receipt')).toBeInTheDocument();
      expect(screen.getByText('Transfer Successful')).toBeInTheDocument();
      expect(screen.getByText('₦50,000.00')).toBeInTheDocument();
      expect(screen.getByText('TX892101')).toBeInTheDocument();
      expect(screen.getByText('Guaranty Trust Bank (GTBank)')).toBeInTheDocument();
      expect(screen.getByText('•••• 0001')).toBeInTheDocument();
      expect(screen.getByText('Freelance Project Settlement')).toBeInTheDocument();
    });

    it('generates consistent 30-digit NIP session reference', () => {
      const nip = generateNipSessionId('TX892101', 1775736000000);
      expect(nip).toMatch(/^999058\d+/);
      expect(nip.length).toBeGreaterThanOrEqual(20);
    });

    it('triggers window.print when Print / PDF button is clicked', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      render(<OfficialReceipt receipt={mockReceipt} />);

      const printBtn = screen.getByRole('button', { name: /Print or save receipt as PDF/i });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    it('copies receipt summary to clipboard on share fallback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<OfficialReceipt receipt={mockReceipt} />);

      const shareBtn = screen.getByRole('button', { name: /Share receipt/i });
      fireEvent.click(shareBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
        expect(screen.getByText(/Receipt copied to clipboard!/i)).toBeInTheDocument();
      });
    });
  });

  describe('TransactionReceiptModal Component', () => {
    it('renders dialog and closes on Escape key', () => {
      const mockClose = vi.fn();
      render(
        <TransactionReceiptModal
          isOpen={true}
          receipt={mockReceipt}
          onClose={mockClose}
        />
      );

      expect(screen.getByRole('dialog', { name: /Transaction e-Receipt/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click', () => {
      const mockClose = vi.fn();
      render(
        <TransactionReceiptModal
          isOpen={true}
          receipt={mockReceipt}
          onClose={mockClose}
        />
      );

      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('TransactionBrowser Receipt Integration', () => {
    it('opens receipt modal when clicking Receipt button in transaction list', () => {
      render(<TransactionBrowser transactions={mockTransactions} />);

      const receiptBtns = screen.getAllByRole('button', { name: /View receipt for Freelance Project Settlement/i });
      expect(receiptBtns.length).toBeGreaterThanOrEqual(1);

      // Click desktop or mobile receipt button
      fireEvent.click(receiptBtns[0]);

      // Modal is now open
      expect(screen.getByRole('dialog', { name: /Transaction e-Receipt/i })).toBeInTheDocument();
      expect(screen.getByText('TX892101')).toBeInTheDocument();
    });
  });
});
