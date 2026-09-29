// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SendMoneyFlow } from '@/components/send/SendMoneyFlow';
import { DemoTipsDrawer } from '@/components/layout/DemoTipsDrawer';
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

  it('custom bank selector allows searching and selecting a different bank with accessibility', async () => {
    render(<SendMoneyFlow initialState={mockBaseState} />);

    // Click bank selector combobox trigger
    const bankButton = screen.getByRole('combobox', { name: /Destination Bank/i });
    expect(bankButton).toBeInTheDocument();
    expect(bankButton).toHaveTextContent(/Guaranty Trust Bank/i);

    fireEvent.click(bankButton);

    // Dropdown listbox and search input should now be open
    const searchInput = screen.getByPlaceholderText(/Search bank name or code/i);
    expect(searchInput).toBeInTheDocument();

    // Filter banks by "kuda"
    fireEvent.change(searchInput, { target: { value: 'kuda' } });
    expect(screen.getByRole('option', { name: /Kuda Microfinance Bank/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Zenith Bank/i })).not.toBeInTheDocument();

    // Select Kuda Bank
    fireEvent.click(screen.getByRole('option', { name: /Kuda Microfinance Bank/i }));

    // Dropdown closes and trigger button reflects selected bank
    expect(screen.queryByPlaceholderText(/Search bank name or code/i)).not.toBeInTheDocument();
    expect(bankButton).toHaveTextContent(/Kuda Microfinance Bank/i);
  });

  it('DemoTipsDrawer displays all triggers, fee tiers, credentials, and lockout policies with zero axe violations', async () => {
    const { container } = render(<DemoTipsDrawer />);

    // Floating launcher button is visible
    const launcher = screen.getByRole('button', { name: /Open Demo Guide and Test Triggers/i });
    expect(launcher).toBeInTheDocument();

    // Open drawer
    fireEvent.click(launcher);

    // Verify key test credentials & deterministic triggers
    expect(screen.getByRole('heading', { name: /Demo Guide & Triggers/i })).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText(/15-Minute Server Lockout/i)).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('0000000001')).toBeInTheDocument();
    expect(screen.getByText('0000000002')).toBeInTheDocument();
    expect(screen.getByText('0000000003')).toBeInTheDocument();

    // Verify CBN Fee Tiers
    expect(screen.getByText(/CBN Transfer Fee Tiers/i)).toBeInTheDocument();
    expect(screen.getByText('< ₦5,000')).toBeInTheDocument();
    expect(screen.getByText('₦5k – ₦50k')).toBeInTheDocument();
    expect(screen.getByText('> ₦50,000')).toBeInTheDocument();

    // Verify Demo account
    expect(screen.getByText('babatunde@kobo.demo')).toBeInTheDocument();
    expect(screen.getByText('demopassword123')).toBeInTheDocument();
    expect(screen.getByText(/insufficient-funds \(422\) error path/i)).toBeInTheDocument();

    // Test copy button interaction
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const copyPinBtn = screen.getByRole('button', { name: /Copy Valid Demo PIN/i });
    fireEvent.click(copyPinBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234');

    // Accessibility check
    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);

    // Dismiss drawer
    fireEvent.click(screen.getAllByRole('button', { name: /Close Demo Guide/i })[0]);
    expect(screen.queryByText(/Live interactive testing cheat sheet/i)).not.toBeInTheDocument();
  });

  it('action buttons on Steps 2, 3, and 4 maintain balanced mobile flex spacing without edge overflow', async () => {
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

    // Step 1: Type account number and proceed
    fireEvent.change(screen.getByLabelText(/10-Digit NUBAN Account Number/i), {
      target: { value: '0123456789' },
    });
    await waitFor(() => screen.getByText('Chioma Adebayo'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Amount/i }));

    // Step 2 buttons
    const step2Back = screen.getByRole('button', { name: /Back/i });
    const step2Continue = screen.getByRole('button', { name: /Review Details/i });
    expect(step2Back.className).toContain('shrink-0');
    expect(step2Continue.className).toContain('flex-1');
    expect(step2Continue.className).not.toContain('flex-2');
    expect(step2Continue.className).not.toContain('w-full');

    // Step 3
    fireEvent.click(step2Continue);
    const step3Edit = screen.getByRole('button', { name: /Edit/i });
    const step3Authorize = screen.getByRole('button', { name: /Authorize with PIN/i });
    expect(step3Edit.className).toContain('shrink-0');
    expect(step3Authorize.className).toContain('flex-1');
    expect(step3Authorize.className).not.toContain('flex-2');
    expect(step3Authorize.className).not.toContain('w-full');

    // Step 4
    fireEvent.click(step3Authorize);
    const step4Cancel = screen.getByRole('button', { name: /Cancel/i });
    const step4Confirm = screen.getByTestId('confirm-transfer-btn');
    expect(step4Cancel.className).toContain('shrink-0');
    expect(step4Confirm.className).toContain('flex-1');
    expect(step4Confirm.className).not.toContain('flex-2');
    expect(step4Confirm.className).not.toContain('w-full');

    // Verify back to dashboard link is present and properly styled away from edges
    const backToDashboard = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(backToDashboard).toBeInTheDocument();
    expect(backToDashboard).toHaveAttribute('href', '/dashboard');
  });

  it('PIN attempt counter behavior: fresh entry has 3 attempts with no 0-attempts warning, invalid attempts decrement, lockout blocks keypad', async () => {
    let callCount = 0;
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
      if (String(url).includes('transfer')) {
        callCount++;
        if (callCount === 1) {
          // 1st failed attempt
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () =>
              Promise.resolve({
                error: 'Incorrect PIN. 2 attempts remaining.',
                attemptsRemaining: 2,
              }),
          });
        }
        if (callCount === 2) {
          // 2nd failed attempt
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () =>
              Promise.resolve({
                error: 'Incorrect PIN. 1 attempt remaining.',
                attemptsRemaining: 1,
              }),
          });
        }
        // 3rd failed attempt -> Lockout
        return Promise.resolve({
          ok: false,
          status: 423,
          json: () =>
            Promise.resolve({
              error: 'Account locked for 15 minutes due to 3 failed PIN attempts.',
              lockUntil: Date.now() + 15 * 60 * 1000,
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SendMoneyFlow initialState={mockBaseState} />);

    // Navigate to Step 4
    fireEvent.change(screen.getByLabelText(/10-Digit NUBAN Account Number/i), {
      target: { value: '0123456789' },
    });
    await waitFor(() => screen.getByText('Chioma Adebayo'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Amount/i }));
    fireEvent.click(screen.getByRole('button', { name: /Review Details/i }));
    fireEvent.click(screen.getByRole('button', { name: /Authorize with PIN/i }));

    // Fresh Step 4: absolutely NO "0 attempts remaining" warning is shown
    expect(screen.queryByText(/0 attempts remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/attempts remaining before 15-minute lockout/i)).not.toBeInTheDocument();

    // 1st incorrect PIN submission
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-transfer-btn'));
    });

    // Expect warning: "2 attempts remaining before 15-minute lockout"
    await waitFor(() => {
      expect(screen.getByText(/2 attempts remaining before 15-minute lockout/i)).toBeInTheDocument();
    });

    // 2nd incorrect PIN submission
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-transfer-btn'));
    });

    // Expect warning: "1 attempt remaining before 15-minute lockout"
    await waitFor(() => {
      expect(screen.getByText(/1 attempt remaining before 15-minute lockout/i)).toBeInTheDocument();
    });

    // 3rd incorrect PIN submission
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-transfer-btn'));
    });

    // Expect lockout activated, banner displayed, keypad removed, and NEVER "0 attempts remaining"
    await waitFor(() => {
      expect(screen.getByTestId('lockout-banner')).toBeInTheDocument();
      expect(screen.queryByText(/0 attempts remaining/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });
  });

  it('BankSelector locks document.body scroll when open and restores it when closed', () => {
    render(<SendMoneyFlow initialState={mockBaseState} />);

    expect(document.body.style.overflow).toBe('');

    const combobox = screen.getByRole('combobox', { name: /Destination Bank/i });
    fireEvent.click(combobox);

    // Dropdown is open -> body scroll is locked
    expect(document.body.style.overflow).toBe('hidden');

    // Close dropdown
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });
});
