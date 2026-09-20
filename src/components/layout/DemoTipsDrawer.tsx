'use client';

import { useState } from 'react';
import { HelpCircle, X, KeyRound, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export function DemoTipsDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Demo Tips Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Open Demo Tips and Test Triggers"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 bg-[var(--brand-primary)] text-white dark:text-[#0A1411] px-3.5 py-2 rounded-full shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 flex items-center gap-2 text-xs font-medium cursor-pointer transition-transform hover:scale-105"
      >
        <Zap className="w-4 h-4 text-amber-300 dark:text-amber-900 fill-current" />
        <span>Demo Tips & Triggers</span>
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-[var(--bg-surface)] text-[var(--text-primary)] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-[var(--border-color)] animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[var(--accent-terracotta)]" />
                  <h3 className="text-lg font-bold font-heading">Tester Guide & Demo Credentials</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close Demo Tips"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                Use these test triggers to verify Kobo’s error handling, state validation, and rate limiting during evaluation:
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--brand-primary)] mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span>Transaction PIN</span>
                  </div>
                  <p className="text-[var(--text-muted)]">Valid Demo PIN: <code className="bg-emerald-950/10 dark:bg-emerald-100/10 px-1.5 py-0.5 rounded font-mono font-bold text-[var(--text-primary)]">1234</code></p>
                  <p className="text-[var(--text-muted)] mt-1">Locked Account Trigger: Enter <code className="bg-red-950/10 dark:bg-red-100/10 px-1.5 py-0.5 rounded font-mono font-bold text-red-600 dark:text-red-400">0000</code></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Simulated Failure Accounts</span>
                  </div>
                  <ul className="space-y-1.5 text-[var(--text-muted)] mt-1">
                    <li>• Account ending in <code className="font-mono font-bold text-[var(--text-primary)]">9999</code>: Simulates <strong>Network Timeout (504)</strong></li>
                    <li>• Account ending in <code className="font-mono font-bold text-[var(--text-primary)]">8888</code>: Simulates <strong>Destination Bank Error (503)</strong></li>
                    <li>• Amount &gt; Current Balance: Simulates <strong>Dynamic Insufficient Funds (400)</strong></li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)] mb-1">
                    <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Rate Limiter &amp; State</span>
                  </div>
                  <p className="text-[var(--text-muted)]">
                    Sending more than 5 payments in 60 seconds triggers a <strong>429 Rate Limit</strong> error.
                    State is sealed in an encrypted JWE cookie (`kobo_state`) capped at 10 user transactions (&lt;3 KB payload).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-color)] mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold text-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                Got It, Let&apos;s Test!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
