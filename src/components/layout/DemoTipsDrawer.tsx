'use client';

import { useState } from 'react';
import {
  HelpCircle,
  X,
  KeyRound,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Coins,
  LogIn,
} from 'lucide-react';

interface TriggerItemProps {
  label: string;
  value: string;
  badge: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'neutral';
  description: string;
  onCopy: (val: string) => void;
  copiedVal: string | null;
}

function TriggerItem({
  label,
  value,
  badge,
  badgeVariant = 'neutral',
  description,
  onCopy,
  copiedVal,
}: TriggerItemProps) {
  const isCopied = copiedVal === value;

  const badgeStyles = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    error: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    neutral: 'bg-zinc-200/60 dark:bg-zinc-800 text-[var(--text-muted)] border-zinc-300 dark:border-zinc-700',
  };

  return (
    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1.5 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-xs text-[var(--text-primary)]">{label}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyles[badgeVariant]}`}>
          {badge}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
        <code className="font-mono font-bold text-xs text-[var(--text-primary)] tracking-wide">
          {value}
        </code>
        <button
          type="button"
          onClick={() => onCopy(value)}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] hover:opacity-80 transition-opacity cursor-pointer p-1"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-tight">{description}</p>
    </div>
  );
}

export function DemoTipsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedValue(text);
      setTimeout(() => setCopiedValue(null), 2000);
    }
  };

  return (
    <>
      {/* Floating Demo Guide & Triggers Launcher */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Open Demo Guide and Test Triggers"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 z-40 bg-[var(--brand-primary)] text-white dark:text-[#0A1411] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
      >
        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 dark:text-amber-900 fill-current animate-pulse shrink-0" />
        <span className="hidden sm:inline">Demo Guide &amp; Triggers</span>
        <span className="sm:hidden">Demo Guide</span>
      </button>

      {/* Drawer Overlay & Sliding Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-[var(--bg-surface)] text-[var(--text-primary)] h-full p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-[var(--border-color)] animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center font-bold">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-heading">Demo Guide &amp; Triggers</h2>
                    <p className="text-[11px] text-[var(--text-muted)]">Live interactive testing cheat sheet</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close Demo Guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                Use these deterministic account numbers, PINs, and failure triggers to evaluate Kobo’s state management, edge cases, and CBN regulatory rules.
              </p>

              <div className="space-y-4">
                {/* 1. Transaction PIN & Lockout */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-primary)]">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Security PIN &amp; Lockout Rules</span>
                  </div>

                  <TriggerItem
                    label="Valid Demo PIN"
                    value="1234"
                    badge="Authorized"
                    badgeVariant="success"
                    description="Standard 4-digit PIN for confirming transfers."
                    onCopy={handleCopy}
                    copiedVal={copiedValue}
                  />

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>15-Minute Server Lockout</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
                      Entering 3 incorrect PINs activates a strict 15-minute server-side lock sealed in the encrypted session cookie (`kobo_state`), persisting across refreshes.
                    </p>
                  </div>
                </div>

                {/* 2. Deterministic Simulation Triggers */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Deterministic Account Triggers</span>
                  </div>

                  <TriggerItem
                    label="Instant Success (Happy Path)"
                    value="0123456789"
                    badge="200 OK"
                    badgeVariant="success"
                    description="Resolves recipient Chioma Adebayo and succeeds on submission."
                    onCopy={handleCopy}
                    copiedVal={copiedValue}
                  />

                  <TriggerItem
                    label="NIP Network Timeout"
                    value="0000000001"
                    badge="504 Timeout"
                    badgeVariant="warning"
                    description="Simulates destination bank timeout. Safely retryable with the same idempotency key."
                    onCopy={handleCopy}
                    copiedVal={copiedValue}
                  />

                  <TriggerItem
                    label="Destination Bank Offline"
                    value="0000000002"
                    badge="502 Bad Gateway"
                    badgeVariant="error"
                    description="Simulates bank switch downtime. Non-retryable error."
                    onCopy={handleCopy}
                    copiedVal={copiedValue}
                  />

                  <TriggerItem
                    label="Unregistered Account"
                    value="0000000003"
                    badge="404 Not Found"
                    badgeVariant="error"
                    description="Fails at Step 1 NUBAN name resolution before transfer can be created."
                    onCopy={handleCopy}
                    copiedVal={copiedValue}
                  />

                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-[var(--text-primary)]">Insufficient Funds Trigger</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                        422 Error
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                      Entering an amount greater than the current wallet balance triggers the insufficient-funds (422) error path.
                    </p>
                  </div>
                </div>

                {/* 3. CBN Transfer Fee Tiers */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>CBN Transfer Fee Tiers (2026 Circular)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="block text-[10px] text-[var(--text-muted)]">&lt; ₦5,000</span>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">Free</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="block text-[10px] text-[var(--text-muted)]">₦5k – ₦50k</span>
                      <span className="font-mono font-bold text-xs text-[var(--text-primary)]">₦10</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="block text-[10px] text-[var(--text-muted)]">&gt; ₦50,000</span>
                      <span className="font-mono font-bold text-xs text-[var(--text-primary)]">₦50</span>
                    </div>
                  </div>
                </div>

                {/* 4. Demo Login Credentials */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <LogIn className="w-3.5 h-3.5 text-sky-500" />
                    <span>Demo Account Sign-In</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Email:</span>
                      <code className="font-mono font-bold text-[var(--text-primary)]">babatunde@kobo.demo</code>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Password:</span>
                      <code className="font-mono font-bold text-[var(--text-primary)]">demopassword123</code>
                    </div>
                  </div>
                </div>

                {/* 5. Security & State Architecture */}
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Zero-Log PIN &amp; Sealed State</span>
                  </div>
                  <p>
                    All state is held in an AES-256-GCM JWE cookie (`kobo_state`) with a 5-item server-side idempotency ring buffer and worst-case size under 3 KB.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Dismiss Button */}
            <div className="pt-4 border-t border-[var(--border-color)] mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold text-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                Close Demo Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
