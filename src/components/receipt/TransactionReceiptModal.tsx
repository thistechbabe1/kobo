'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { OfficialReceipt, ReceiptData } from './OfficialReceipt';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function TransactionReceiptModal({
  isOpen,
  receipt,
  onClose,
}: TransactionReceiptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard Escape listener & focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const prevActive = document.activeElement as HTMLElement | null;

    // Body scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on mount
    requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !receipt) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <h2
            id="receipt-modal-title"
            className="text-sm font-bold text-[var(--text-primary)] font-heading"
          >
            Transaction e-Receipt
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close transaction receipt"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <OfficialReceipt receipt={receipt} onDone={onClose} showDoneButton={false} />
      </div>
    </div>
  );
}
