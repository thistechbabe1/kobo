// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SendMoneyFlow } from '@/components/send/SendMoneyFlow';
import { CompactSessionPayload } from '@/lib/session';

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

const mockBaseState: CompactSessionPayload = {
  bal: 24585050, // ₦245,850.50
  pin: 0,
  loc: null,
  txs: [],
  ik: [],
};

describe('SendMoneyFlow Component (Feature 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders Step 1 with destination bank and account input with zero axe a11y violations', async () => {
    const { container } = render(<SendMoneyFlow initialState={mockBaseState} />);

    expect(screen.getByText('Select Recipient & Bank')).toBeInTheDocument();
    expect(screen.getByLabelText(/Destination Bank/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/10-Digit NUBAN Account Number/i)).toBeInTheDocument();

    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });

  it('locked-out user reaching /send sees the lockout banner and countdown with no PIN input', () => {
    const futureLockTime = Date.now() + 10 * 60 * 1000; // 10 minutes in future
    const lockedState: CompactSessionPayload = {
      ...mockBaseState,
      pin: 3,
      loc: futureLockTime,
    };

    render(<SendMoneyFlow initialState={lockedState} />);

    expect(screen.getByTestId('lockout-banner')).toBeInTheDocument();
    expect(screen.getByText(/Account Security Lockout Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Unlocks in 10m 0s|Unlocks in 9m 59s/i)).toBeInTheDocument();

    // Verify account number input and buttons are disabled
    const accInput = screen.getByLabelText(/10-Digit NUBAN Account Number/i);
    expect(accInput).toBeDisabled();

    const continueBtn = screen.getByRole('button', { name: /Continue to Amount/i });
    expect(continueBtn).toBeDisabled();

    // Confirm absolutely no PIN keypad or PIN input is available
    expect(screen.queryByText(/Enter 4-Digit Security PIN/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
  });

  it('resolves recipient name via /api/wallet/resolve-account and enables Step 2 navigation', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('resolve-account')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              accountNumber: '0123456789',
              accountName: 'Chioma Adebayo',
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    const accInput = screen.getByLabelText(/10-Digit NUBAN Account Number/i);
    fireEvent.change(accInput, { target: { value: '0123456789' } });

    await waitFor(() => {
      expect(screen.getByTestId('account-verified-badge')).toBeInTheDocument();
      expect(screen.getByText('Chioma Adebayo')).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole('button', { name: /Continue to Amount/i });
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // Step 2 is now visible
    expect(screen.getByTestId('send-step-2')).toBeInTheDocument();
    expect(screen.getByText(/Enter Amount/i)).toBeInTheDocument();
  });

  it('shows error badge when account resolution fails for deterministic trigger 0000000003', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('resolve-account')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              error: 'Account not found. Please verify the account number and selected bank.',
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    const accInput = screen.getByLabelText(/10-Digit NUBAN Account Number/i);
    fireEvent.change(accInput, { target: { value: '0000000003' } });

    await waitFor(() => {
      expect(screen.getByTestId('account-error-badge')).toBeInTheDocument();
      expect(screen.getByText(/Account not found/i)).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole('button', { name: /Continue to Amount/i });
    expect(continueBtn).toBeDisabled();
  });

  it('calculates live CBN fee and transitions from Step 2 to Step 3 Review', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('resolve-account')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              accountNumber: '0123456789',
              accountName: 'Chioma Adebayo',
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    // Step 1: Type account number
    fireEvent.change(screen.getByLabelText(/10-Digit NUBAN Account Number/i), {
      target: { value: '0123456789' },
    });
    await waitFor(() => screen.getByText('Chioma Adebayo'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Amount/i }));

    // Step 2: Set Amount to ₦20,000 (Tier 2 fee: ₦10)
    const amountInput = screen.getByLabelText(/Transfer Amount in Naira/i);
    fireEvent.change(amountInput, { target: { value: '20000' } });

    expect(screen.getByText(/₦10 \(₦5k–₦50k\)/i)).toBeInTheDocument();
    expect(screen.getByText('₦20,010.00')).toBeInTheDocument();

    // Proceed to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Review Details/i }));

    // Step 3 Review Screen
    expect(screen.getByTestId('send-step-3')).toBeInTheDocument();
    expect(screen.getByText('Review Transfer Details')).toBeInTheDocument();
    expect(screen.getByText('•••• 6789')).toBeInTheDocument();
    expect(screen.getByText('₦20,000.00')).toBeInTheDocument();
  });

  it('completes full transfer flow (Steps 1 to 5) and displays transaction receipt', async () => {
    let capturedIdempotencyKey: string | null = null;

    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (String(url).includes('resolve-account')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              accountNumber: '0123456789',
              accountName: 'Chioma Adebayo',
            }),
        });
      }
      if (String(url).includes('transfer')) {
        const payload = JSON.parse(opts.body);
        capturedIdempotencyKey = payload.idempotencyKey;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              transaction: {
                id: 'TX892199',
                amt: 1000000,
                nar: 'Transfer to Chioma Adebayo',
                ts: 1759000000000,
              },
              fee: 1000,
              totalDebit: 1001000,
              newBalance: 23584050,
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/10-Digit NUBAN Account Number/i), {
      target: { value: '0123456789' },
    });
    await waitFor(() => screen.getByText('Chioma Adebayo'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Amount/i }));

    // Step 2
    fireEvent.change(screen.getByLabelText(/Transfer Amount in Naira/i), {
      target: { value: '10000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Review Details/i }));

    // Step 3 -> 4: Mints Idempotency Key
    fireEvent.click(screen.getByRole('button', { name: /Authorize with PIN/i }));

    // Step 4
    expect(screen.getByTestId('send-step-4')).toBeInTheDocument();
    expect(screen.getByText('Enter 4-Digit Security PIN')).toBeInTheDocument();

    // Enter PIN: '1', '2', '3', '4'
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Submit Transfer
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-transfer-btn'));
    });

    // Verify Idempotency Key was generated and sent
    expect(capturedIdempotencyKey).toBeTruthy();
    expect(typeof capturedIdempotencyKey).toBe('string');

    // Step 5 Receipt
    await waitFor(() => {
      expect(screen.getByTestId('send-step-5')).toBeInTheDocument();
      expect(screen.getByText(/Transfer Successful/i)).toBeInTheDocument();
      expect(screen.getByText('TX892199')).toBeInTheDocument();
    });
  });

  it('handles 504 timeout with retry using the exact same idempotency key', async () => {
    const capturedKeys: string[] = [];

    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (String(url).includes('resolve-account')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              accountNumber: '0000000001',
              accountName: 'Emeka Okonkwo',
            }),
        });
      }
      if (String(url).includes('transfer')) {
        const payload = JSON.parse(opts.body);
        capturedKeys.push(payload.idempotencyKey);

        if (capturedKeys.length === 1) {
          // 1st attempt fails with 504
          return Promise.resolve({
            ok: false,
            status: 504,
            json: () =>
              Promise.resolve({
                error: 'NIP Network timeout communicating with destination bank. You can retry safely.',
                retryable: true,
              }),
          });
        } else {
          // 2nd attempt succeeds
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                transaction: {
                  id: 'TX892200',
                  amt: 500000,
                  nar: 'Transfer to Emeka Okonkwo',
                  ts: 1759000000000,
                },
                fee: 1000,
                totalDebit: 501000,
                newBalance: 24084050,
              }),
          });
        }
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/10-Digit NUBAN Account Number/i), {
      target: { value: '0000000001' },
    });
    await waitFor(() => screen.getByText('Emeka Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Amount/i }));

    // Step 2
    fireEvent.click(screen.getByRole('button', { name: /Review Details/i }));

    // Step 3 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Authorize with PIN/i }));

    // Step 4: Enter PIN
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Submit 1st attempt
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-transfer-btn'));
    });

    // Expect timeout banner and retry button
    await waitFor(() => {
      expect(screen.getByTestId('transfer-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/NIP Network timeout/i)).toBeInTheDocument();
      expect(screen.getByTestId('retry-transfer-btn')).toBeInTheDocument();
    });

    // Click Retry Transfer
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-transfer-btn'));
    });

    // Verification: Both requests transmitted the EXACT same idempotency key
    expect(capturedKeys).toHaveLength(2);
    expect(capturedKeys[0]).toBe(capturedKeys[1]);

    // Success receipt displayed
    await waitFor(() => {
      expect(screen.getByTestId('send-step-5')).toBeInTheDocument();
      expect(screen.getByText('TX892200')).toBeInTheDocument();
    });
  });
});
