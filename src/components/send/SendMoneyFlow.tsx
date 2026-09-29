'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { NIGERIAN_BANKS } from '@/lib/banks';
import { calculateTransferFeeKobo, CompactSessionPayload } from '@/lib/session';
import { BankSelector } from './BankSelector';

export interface SendMoneyFlowProps {
  initialState: CompactSessionPayload;
}

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface CompletedTransferReceipt {
  id: string;
  recipientName: string;
  bankName: string;
  accountNumber: string;
  amountKobo: number;
  feeKobo: number;
  totalDebitKobo: number;
  newBalanceKobo: number;
  narration?: string;
  timestamp: number;
}

function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(naira)
    .replace('NGN', '₦')
    .trim();
}

function formatLagosDateTime(epochMs: number): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(epochMs));
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function SendMoneyFlow({ initialState }: SendMoneyFlowProps) {
  const bankSelectId = useId();
  const accountInputId = useId();
  const amountInputId = useId();
  const narrationInputId = useId();
  // Multi-step progress
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Live balance and lockout state
  const [walletBalanceKobo, setWalletBalanceKobo] = useState<number>(initialState.bal);
  const [lockUntilMs, setLockUntilMs] = useState<number | null>(() => {
    if (initialState.loc === null) return null;
    return Date.now() >= initialState.loc ? null : initialState.loc;
  });
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(() => {
    if (initialState.loc !== null && Date.now() >= initialState.loc) {
      return 3;
    }
    return initialState.pin >= 3 ? 0 : 3 - initialState.pin;
  });
  const [nowEpoch, setNowEpoch] = useState<number>(() => Date.now());

  // Step 1: Recipient & Bank
  const [selectedBankCode, setSelectedBankCode] = useState<string>(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [resolvedRecipientName, setResolvedRecipientName] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolutionError, setResolutionError] = useState<string>('');

  // Step 2: Amount & Narration
  const [amountInputStr, setAmountInputStr] = useState<string>('5000');
  const [narration, setNarration] = useState<string>('');

  // Step 3 & 4: Security & Idempotency Key
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [pinDigits, setPinDigits] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<{ message: string; retryable: boolean } | null>(null);

  // Step 5: Completed Receipt
  const [receipt, setReceipt] = useState<CompletedTransferReceipt | null>(null);

  // Lockout Countdown Timer Subscription
  useEffect(() => {
    if (!lockUntilMs) return;

    const interval = setInterval(() => {
      setNowEpoch(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntilMs]);

  const lockCountdownSec = useMemo(() => {
    if (!lockUntilMs) return 0;
    const remainingMs = lockUntilMs - nowEpoch;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }, [lockUntilMs, nowEpoch]);

  // Selected Bank Object
  const selectedBank = useMemo(() => {
    return NIGERIAN_BANKS.find((b) => b.code === selectedBankCode) || NIGERIAN_BANKS[0];
  }, [selectedBankCode]);

  // Transfer Amount & Fee Calculations
  const numericAmountNaira = useMemo(() => {
    const parsed = parseFloat(amountInputStr.replace(/,/g, ''));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountInputStr]);

  const transferAmountKobo = Math.round(numericAmountNaira * 100);
  const transferFeeKobo = calculateTransferFeeKobo(transferAmountKobo);
  const totalDebitKobo = transferAmountKobo + transferFeeKobo;
  const isBalanceSufficient = walletBalanceKobo >= totalDebitKobo && transferAmountKobo > 0;

  // Account Resolution Effect (Auto-resolve on 10 digits)
  useEffect(() => {
    const cleanAcc = accountNumber.trim();
    if (cleanAcc.length !== 10) return;

    let isMounted = true;
    const controller = new AbortController();

    async function resolveAccount() {
      setIsResolving(true);
      try {
        const res = await fetch('/api/wallet/resolve-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountNumber: cleanAcc, bankCode: selectedBankCode }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.accountName) {
          setResolvedRecipientName(data.accountName);
          setResolutionError('');
        } else {
          setResolvedRecipientName('');
          setResolutionError(data.error || 'Account could not be resolved. Check number and bank.');
        }
      } catch (err: unknown) {
        if (!isMounted || (err instanceof DOMException && err.name === 'AbortError')) return;
        setResolutionError('Network error verifying account. Please check your connection.');
      } finally {
        if (isMounted) setIsResolving(false);
      }
    }

    const timer = setTimeout(resolveAccount, 350);
    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [accountNumber, selectedBankCode]);

  // Action: Step 1 -> Step 2
  const handleProceedToAmount = () => {
    if (!resolvedRecipientName || accountNumber.length !== 10) return;
    setCurrentStep(2);
  };

  // Action: Step 2 -> Step 3
  const handleProceedToReview = () => {
    if (!isBalanceSufficient) return;
    setCurrentStep(3);
  };

  // Action: Step 3 -> Step 4 (Mint fresh Idempotency Key)
  const handleProceedToPin = () => {
    // Specification: Idempotency key is minted when moving from Step 3 -> Step 4
    const newKey = generateIdempotencyKey();
    setIdempotencyKey(newKey);
    setPinDigits('');
    setTransferError(null);
    setCurrentStep(4);
  };

  // Action: Back to Edit (Discard Idempotency Key)
  const handleBackToEdit = (targetStep: StepNumber) => {
    setIdempotencyKey('');
    setPinDigits('');
    setTransferError(null);
    setCurrentStep(targetStep);
  };

  // Action: PIN Digit Press (Keypad or Keyboard)
  const handlePinInput = (digit: string) => {
    if (lockUntilMs && lockCountdownSec > 0) return;
    setPinDigits((prev) => (prev.length < 4 ? prev + digit : prev));
  };

  const handlePinBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
  };

  // Action: Submit Transfer (with In-flight Double-Tap Protection & Idempotency Key)
  const executeTransfer = async (keyToUse: string) => {
    if (isSubmitting || pinDigits.length !== 4) return;
    if (lockUntilMs && lockCountdownSec > 0) return;

    setIsSubmitting(true);
    setTransferError(null);

    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBankCode,
          bankName: selectedBank.name,
          recipientName: resolvedRecipientName,
          amountKobo: transferAmountKobo,
          narration,
          pin: pinDigits,
          idempotencyKey: keyToUse,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Successful Transfer!
        setWalletBalanceKobo(data.newBalance);
        setReceipt({
          id: data.transaction.id,
          recipientName: resolvedRecipientName,
          bankName: selectedBank.name,
          accountNumber,
          amountKobo: data.transaction.amt,
          feeKobo: data.fee,
          totalDebitKobo: data.totalDebit,
          newBalanceKobo: data.newBalance,
          narration: data.transaction.nar,
          timestamp: data.transaction.ts,
        });
        setCurrentStep(5);
      } else if (res.status === 423) {
        // PIN Lockout!
        const serverLock = typeof data.lockUntil === 'number' ? data.lockUntil : (nowEpoch + 15 * 60 * 1000);
        setLockUntilMs(serverLock);
        setAttemptsRemaining(0);
        setPinDigits('');
        setTransferError({
          message: data.error || 'Account locked for 15 minutes due to 3 failed PIN attempts.',
          retryable: false,
        });
      } else if (res.status === 401 && data.attemptsRemaining !== undefined) {
        // Invalid PIN
        setAttemptsRemaining(data.attemptsRemaining);
        setPinDigits('');
        setTransferError({
          message: `Incorrect PIN. ${data.attemptsRemaining} attempt${data.attemptsRemaining === 1 ? '' : 's'} remaining.`,
          retryable: false,
        });
      } else if (res.status === 504 || data.retryable) {
        // Timeout (e.g. trigger 0000000001) - Retryable with SAME idempotency key!
        setTransferError({
          message: data.error || 'NIP Network timeout. You can retry safely without duplicate charge.',
          retryable: true,
        });
      } else {
        setTransferError({
          message: data.error || 'Transfer failed. Please review your details and try again.',
          retryable: false,
        });
      }
    } catch {
      setTransferError({
        message: 'Network connection issue. You can safely retry this transfer.',
        retryable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeTransferRef = useRef(executeTransfer);
  useEffect(() => {
    executeTransferRef.current = executeTransfer;
  });

  // Keyboard PIN Listener for Step 4
  useEffect(() => {
    if (currentStep !== 4) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (pinDigits.length < 4 && !(lockUntilMs && lockCountdownSec > 0)) {
          setPinDigits((prev) => (prev.length < 4 ? prev + e.key : prev));
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPinDigits((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && pinDigits.length === 4) {
        e.preventDefault();
        executeTransferRef.current(idempotencyKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, pinDigits, idempotencyKey, lockUntilMs, lockCountdownSec]);

  // Action: "Send Another Transfer" on Receipt (Reset all state)
  const handleSendAnother = () => {
    setCurrentStep(1);
    setAccountNumber('');
    setResolvedRecipientName('');
    setResolutionError('');
    setAmountInputStr('5000');
    setNarration('');
    setIdempotencyKey('');
    setPinDigits('');
    setTransferError(null);
    setReceipt(null);
  };

  // Render Lockout Warning on Entry if user is currently locked out
  const isLockedOut = Boolean(lockUntilMs && lockCountdownSec > 0);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Back to Dashboard Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header with Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Available Balance
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading">
            {formatNairaFromKobo(walletBalanceKobo)}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>CBN Regulated Transfer</span>
        </div>
      </div>

      {/* Global Lockout Banner if locked on entry or during flow */}
      {isLockedOut && (
        <div
          data-testid="lockout-banner"
          className="rounded-2xl border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-4 text-red-700 dark:text-red-300 space-y-2"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Account Security Lockout Active</span>
          </div>
          <p className="text-xs">
            Transfer capability is temporarily suspended due to 3 consecutive failed PIN attempts.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Unlocks in {Math.floor(lockCountdownSec / 60)}m {lockCountdownSec % 60}s
            </span>
          </div>
        </div>
      )}

      {/* Step Indicators */}
      {currentStep !== 5 && (
        <div className="flex items-center justify-between px-2">
          {[
            { num: 1, label: 'Recipient' },
            { num: 2, label: 'Amount' },
            { num: 3, label: 'Review' },
            { num: 4, label: 'Security' },
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div key={s.num} className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-[var(--text-muted)]'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </span>
                <span
                  className={`text-xs hidden sm:inline font-medium ${
                    isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Recipient Selection & Bank Picker */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div
          data-testid="send-step-1"
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Select Recipient &amp; Bank</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Enter the recipient’s 10-digit NUBAN account number for instant verification.
            </p>
          </div>

          <div className="space-y-4">
            {/* Bank Selector */}
            <div className="space-y-1.5">
              <label htmlFor={bankSelectId} className="text-xs font-semibold text-[var(--text-primary)]">
                Destination Bank
              </label>
              <BankSelector
                id={bankSelectId}
                selectedBankCode={selectedBankCode}
                onSelectBank={(bank) => {
                  setSelectedBankCode(bank.code);
                  setResolvedRecipientName('');
                  setResolutionError('');
                }}
                disabled={isLockedOut}
              />
            </div>

            {/* Account Number Input */}
            <div className="space-y-1.5">
              <label htmlFor={accountInputId} className="text-xs font-semibold text-[var(--text-primary)]">
                10-Digit NUBAN Account Number
              </label>
              <div className="relative">
                <input
                  id={accountInputId}
                  aria-label="10-Digit NUBAN Account Number"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setAccountNumber(clean);
                    if (clean.length !== 10) {
                      setResolvedRecipientName('');
                      setResolutionError('');
                    }
                  }}
                  disabled={isLockedOut}
                  className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono text-sm tracking-widest placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
                />
                {isResolving && (
                  <div className="absolute right-3.5 top-3 text-[var(--brand-primary)] animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Account Resolution Badge */}
            {resolvedRecipientName && (
              <div
                data-testid="account-verified-badge"
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold block">{resolvedRecipientName}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Verified Account Holder ({selectedBank.shortName})
                  </span>
                </div>
              </div>
            )}

            {resolutionError && (
              <div
                data-testid="account-error-badge"
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-500/30 text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-xs font-medium">{resolutionError}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleProceedToAmount}
            disabled={!resolvedRecipientName || accountNumber.length !== 10 || isLockedOut}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Continue to Amount</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Amount Entry & Live Fee Calculator */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div
          data-testid="send-step-2"
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Enter Amount</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Sending to <span className="font-semibold text-[var(--text-primary)]">{resolvedRecipientName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor={amountInputId} className="text-xs font-semibold text-[var(--text-primary)]">
                Transfer Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-lg font-bold text-[var(--text-muted)]">
                  ₦
                </span>
                <input
                  id={amountInputId}
                  aria-label="Transfer Amount in Naira"
                  type="text"
                  inputMode="decimal"
                  value={amountInputStr}
                  onChange={(e) => setAmountInputStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full h-12 pl-9 pr-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xl font-bold font-mono tracking-tight focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-2">
              {['5000', '10000', '20000', '50000'].map((chipVal) => (
                <button
                  key={chipVal}
                  type="button"
                  onClick={() => setAmountInputStr(chipVal)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    amountInputStr === chipVal
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  ₦{parseInt(chipVal, 10).toLocaleString()}
                </button>
              ))}
            </div>

            {/* Live CBN Fee Breakdown Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-[var(--border-color)] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Transfer Amount:</span>
                <span className="font-semibold text-[var(--text-primary)] font-mono">
                  {formatNairaFromKobo(transferAmountKobo)}
                </span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <span>CBN Transfer Fee:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[var(--text-muted)]">
                    {transferAmountKobo < 500000
                      ? 'Free (< ₦5k)'
                      : transferAmountKobo <= 5000000
                        ? '₦10 (₦5k–₦50k)'
                        : '₦50 (> ₦50k)'}
                  </span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  {transferFeeKobo === 0 ? 'Free' : formatNairaFromKobo(transferFeeKobo)}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--border-color)] flex justify-between text-xs font-bold">
                <span className="text-[var(--text-primary)]">Total Debit:</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {formatNairaFromKobo(totalDebitKobo)}
                </span>
              </div>
            </div>

            {/* Insufficient Balance Alert */}
            {!isBalanceSufficient && transferAmountKobo > 0 && (
              <div
                data-testid="insufficient-funds-alert"
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Insufficient funds. Total debit ({formatNairaFromKobo(totalDebitKobo)}) exceeds your
                  balance of {formatNairaFromKobo(walletBalanceKobo)}.
                </span>
              </div>
            )}

            {/* Narration */}
            <div className="space-y-1.5">
              <label htmlFor={narrationInputId} className="text-xs font-semibold text-[var(--text-primary)]">
                Narration (Optional, max 30 chars)
              </label>
              <input
                id={narrationInputId}
                aria-label="Narration"
                type="text"
                maxLength={30}
                placeholder="e.g. Lunch split, Freelance"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-28 sm:w-32 h-11 shrink-0 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToReview}
              disabled={!isBalanceSufficient || isLockedOut}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Review Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Transfer Review Summary */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div
          data-testid="send-step-3"
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Review Transfer Details</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Confirm recipient and payment breakdown before authorizing.
            </p>
          </div>

          <div className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-xs space-y-3">
            <div className="flex justify-between pb-3">
              <span className="text-[var(--text-muted)]">Recipient</span>
              <span className="font-bold text-[var(--text-primary)] text-right">{resolvedRecipientName}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-[var(--text-muted)]">Bank</span>
              <span className="font-semibold text-[var(--text-primary)] text-right">{selectedBank.name}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-[var(--text-muted)]">Account Number</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                •••• {accountNumber.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-[var(--text-muted)]">Transfer Amount</span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
                {formatNairaFromKobo(transferAmountKobo)}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-[var(--text-muted)]">CBN Regulatory Fee</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {transferFeeKobo === 0 ? 'Free' : formatNairaFromKobo(transferFeeKobo)}
              </span>
            </div>
            {narration && (
              <div className="flex justify-between py-3">
                <span className="text-[var(--text-muted)]">Narration</span>
                <span className="italic text-[var(--text-primary)]">{narration}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 text-sm font-extrabold text-[var(--text-primary)]">
              <span>Total Debit</span>
              <span className="font-mono text-[var(--brand-primary)]">
                {formatNairaFromKobo(totalDebitKobo)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleBackToEdit(2)}
              className="w-28 sm:w-32 h-11 shrink-0 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToPin}
              disabled={isLockedOut}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Authorize with PIN</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Secure PIN Modal / Security Screen */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div
          data-testid="send-step-4"
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center mx-auto mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Enter 4-Digit Security PIN</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Enter your transaction PIN to authorize sending {formatNairaFromKobo(transferAmountKobo)}.
            </p>
            {attemptsRemaining > 0 && attemptsRemaining < 3 && !isLockedOut && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before 15-minute lockout
              </p>
            )}
          </div>

          {/* Masked PIN Dots Indicator */}
          <div className="flex justify-center items-center gap-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinDigits.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] scale-110'
                      : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {/* Inline Error / Lockout Banner */}
          {transferError && (
            <div
              data-testid="transfer-error-banner"
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                transferError.retryable
                  ? 'border-sky-500/30 bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-200'
                  : 'border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError.message}</span>
              </div>
              {transferError.retryable && (
                <button
                  type="button"
                  data-testid="retry-transfer-btn"
                  onClick={() => executeTransfer(idempotencyKey)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold text-xs hover:bg-sky-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Retry Transfer (Same Key)</span>
                </button>
              )}
            </div>
          )}

          {/* Numeric Keypad for Mobile and Touch / Accessible Click */}
          {!isLockedOut && (
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handlePinInput(digit)}
                  className="h-12 rounded-xl border border-[var(--border-color)] bg-zinc-50 dark:bg-zinc-900/40 text-[var(--text-primary)] font-bold text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPinDigits('')}
                className="h-12 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handlePinInput('0')}
                className="h-12 rounded-xl border border-[var(--border-color)] bg-zinc-50 dark:bg-zinc-900/40 text-[var(--text-primary)] font-bold text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePinBackspace}
                className="h-12 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center"
              >
                ⌫
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleBackToEdit(3)}
              className="w-28 sm:w-32 h-11 shrink-0 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>Cancel</span>
            </button>
            <button
              type="button"
              data-testid="confirm-transfer-btn"
              disabled={pinDigits.length !== 4 || isSubmitting || isLockedOut}
              onClick={() => executeTransfer(idempotencyKey)}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm &amp; Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: Transaction Receipt */}
      {/* ========================================================================= */}
      {currentStep === 5 && receipt && (
        <div
          data-testid="send-step-5"
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 space-y-6 text-center shadow-sm"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Transfer Successful
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] font-heading">
              {formatNairaFromKobo(receipt.amountKobo)}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Sent to {receipt.recipientName} ({receipt.bankName})
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="text-left divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-xs space-y-2.5">
            <div className="flex justify-between pb-2.5">
              <span className="text-[var(--text-muted)]">Reference Number</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{receipt.id}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--text-muted)]">Recipient Account</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                •••• {receipt.accountNumber.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--text-muted)]">CBN Transfer Fee</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {receipt.feeKobo === 0 ? 'Free' : formatNairaFromKobo(receipt.feeKobo)}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--text-muted)]">Total Amount Debited</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatNairaFromKobo(receipt.totalDebitKobo)}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--text-muted)]">Lagos Timestamp</span>
              <span className="text-[var(--text-primary)] font-mono">
                {formatLagosDateTime(receipt.timestamp)}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 font-bold">
              <span className="text-[var(--text-primary)]">New Wallet Balance</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatNairaFromKobo(receipt.newBalanceKobo)}
              </span>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              data-testid="send-another-btn"
              onClick={handleSendAnother}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
              <span>Send Another Transfer</span>
            </button>
            <Link
              href="/transactions"
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <span>View in Transactions</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
