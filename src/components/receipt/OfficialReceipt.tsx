'use client';

import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Share2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

export interface ReceiptData {
  id: string;
  nipSessionId?: string;
  recipientName: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  amountKobo: number;
  feeKobo: number;
  totalDebitKobo: number;
  narration?: string;
  timestamp: number;
  senderName?: string;
  status?: 'Completed' | 'Pending' | 'Failed';
  newBalanceKobo?: number;
}

interface OfficialReceiptProps {
  receipt: ReceiptData;
  onDone?: () => void;
  doneButtonLabel?: string;
  showDoneButton?: boolean;
}

function formatNaira(kobo: number): string {
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

export function generateNipSessionId(txId: string, timestamp: number): string {
  const cleanTs = new Date(timestamp)
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14);
  const cleanId = txId.replace(/\D/g, '').padEnd(6, '0').slice(0, 6);
  return `999058${cleanTs}${cleanId}`;
}

export function OfficialReceipt({
  receipt,
  onDone,
  doneButtonLabel = 'Done',
  showDoneButton = false,
}: OfficialReceiptProps) {
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const status = receipt.status || 'Completed';
  const nipSessionId =
    receipt.nipSessionId || generateNipSessionId(receipt.id, receipt.timestamp);
  const senderName = receipt.senderName || 'Babatunde A. • Kobo Wallet';

  // High-Resolution PNG Canvas Generator
  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsExporting(false);
        return;
      }

      // 2x Retina Resolution
      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      // Background - Crisp White Receipt Paper
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Top Brand Header Banner (Deep Forest Green)
      ctx.fillStyle = '#0F3E2E';
      ctx.fillRect(0, 0, width, 140);

      // Gold Accent Line
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(0, 140, width, 6);

      // Brand Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('KOBO WALLET', 48, 68);

      // Subtitle / Compliance
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CBN REGULATORY COMPLIANT ELECTRONIC RECEIPT', 48, 102);

      // Status Pill
      const statusY = 190;
      ctx.fillStyle = status === 'Completed' ? '#E6F4EA' : '#FCE8E6';
      ctx.roundRect(48, statusY, 260, 40, 20);
      ctx.fill();

      ctx.fillStyle = status === 'Completed' ? '#137333' : '#C5221F';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        status === 'Completed' ? '✓ TRANSACTION SUCCESSFUL' : '✕ TRANSACTION FAILED',
        68,
        statusY + 25
      );

      // Amount Display
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatNaira(receipt.amountKobo), 48, 290);

      ctx.fillStyle = '#666666';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Transfer to ${receipt.recipientName}`, 48, 324);

      // Divider Line
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(48, 360);
      ctx.lineTo(width - 48, 360);
      ctx.stroke();

      // Details Table
      const rows: [string, string][] = [
        ['Transaction Reference', receipt.id],
        ['NIP Session ID', nipSessionId],
        ['Date & Time (WAT)', formatLagosDateTime(receipt.timestamp)],
        ['Sender', senderName],
        ['Recipient', receipt.recipientName],
        ['Destination Bank', receipt.bankName],
        ['Recipient Account', `•••• ${receipt.accountNumber.slice(-4)}`],
        ['Transfer Fee (CBN Tier)', receipt.feeKobo === 0 ? 'Free (₦0.00)' : formatNaira(receipt.feeKobo)],
        ['Total Amount Debited', formatNaira(receipt.totalDebitKobo)],
        ['Payment Method', 'NIBSS Instant Payment (NIP)'],
        ['Narration', receipt.narration || 'Transfer from Kobo Wallet'],
      ];

      let currentY = 410;
      rows.forEach(([label, value]) => {
        ctx.fillStyle = '#777777';
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label, 48, currentY);

        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const valueWidth = ctx.measureText(value).width;
        ctx.fillText(value, width - 48 - valueWidth, currentY);

        // Subtle row line
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(48, currentY + 16);
        ctx.lineTo(width - 48, currentY + 16);
        ctx.stroke();

        currentY += 46;
      });

      // Watermark / Official Verification Stamp
      ctx.strokeStyle = '#0F3E2E';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#0F3E2E';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const footerNotice =
        'OFFICIAL DIGITAL TRANSACTION RECEIPT • ISSUED UNDER CBN ELECTRONIC PAYMENTS GUIDELINES';
      const noticeWidth = ctx.measureText(footerNotice).width;
      ctx.fillText(footerNotice, (width - noticeWidth) / 2, height - 70);

      ctx.fillStyle = '#999999';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const disclaimer = 'Generated securely by Kobo Wallet. Non-negotiable digital receipt.';
      const discWidth = ctx.measureText(disclaimer).width;
      ctx.fillText(disclaimer, (width - discWidth) / 2, height - 44);

      // Trigger Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kobo-receipt-${receipt.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
      }, 'image/png');
    } catch {
      setIsExporting(false);
    }
  };

  // Browser Print / Vector PDF
  const handlePrint = () => {
    window.print();
  };

  // Web Share or Clipboard Fallback
  const handleShare = async () => {
    const summaryText = [
      `🧾 Kobo Wallet Receipt`,
      `Ref: ${receipt.id}`,
      `Amount: ${formatNaira(receipt.amountKobo)}`,
      `Recipient: ${receipt.recipientName} (${receipt.bankName})`,
      `Account: •••• ${receipt.accountNumber.slice(-4)}`,
      `Date: ${formatLagosDateTime(receipt.timestamp)}`,
      `Status: ${status}`,
      `NIP ID: ${nipSessionId}`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Kobo Receipt - ${receipt.id}`,
          text: summaryText,
        });
        return;
      } catch {
        // User cancelled or unsupported; fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(summaryText);
        setCopyFeedback('Receipt copied to clipboard!');
        setTimeout(() => setCopyFeedback(null), 3000);
      } catch {
        setCopyFeedback('Failed to copy');
      }
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto" data-testid="official-receipt-card">
      {/* Printable Receipt Container */}
      <div
        ref={receiptCardRef}
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6 shadow-sm text-left relative overflow-hidden"
      >
        {/* Top Decorative Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--brand-primary)] via-emerald-500 to-[var(--brand-primary)]" />

        {/* Brand & Regulatory Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black tracking-tight text-xl text-[var(--text-primary)]">
                KOBO<span className="text-[var(--brand-primary)]">.</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                CBN Compliant
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-mono mt-0.5">
              Official Electronic Payment Receipt
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                status === 'Completed'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : status === 'Pending'
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                    : 'bg-red-500/15 text-red-700 dark:text-red-400'
              }`}
            >
              {status === 'Completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : status === 'Pending' ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>{status === 'Completed' ? 'Transfer Successful' : status}</span>
            </span>
          </div>
        </div>

        {/* Amount & Recipient Headline */}
        <div className="text-center py-2 space-y-1">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Amount Transferred
          </span>
          <div className="text-3xl font-extrabold text-[var(--text-primary)] font-heading tracking-tight">
            {formatNaira(receipt.amountKobo)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Transferred to <span className="font-semibold text-[var(--text-primary)]">{receipt.recipientName}</span>
          </p>
        </div>

        {/* Structured Transaction Key-Value Rows */}
        <div className="rounded-xl border border-[var(--border-color)] bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-xs divide-y divide-[var(--border-color)]">
          <div className="flex justify-between pb-2.5">
            <span className="text-[var(--text-muted)]">Transaction Reference</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{receipt.id}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-[var(--text-muted)]">NIP Session ID</span>
            <span className="font-mono text-[11px] text-[var(--text-primary)] truncate max-w-[200px]" title={nipSessionId}>
              {nipSessionId}
            </span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-[var(--text-muted)]">Transaction Date &amp; Time</span>
            <span className="font-mono text-[var(--text-primary)]">
              {formatLagosDateTime(receipt.timestamp)}
            </span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-[var(--text-muted)]">Sender</span>
            <span className="font-semibold text-[var(--text-primary)]">{senderName}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-[var(--text-muted)]">Destination Bank</span>
            <span className="font-semibold text-[var(--text-primary)]">{receipt.bankName}</span>
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
              {receipt.feeKobo === 0 ? 'Free' : formatNaira(receipt.feeKobo)}
            </span>
          </div>
          <div className="flex justify-between py-2.5 font-bold">
            <span className="text-[var(--text-muted)]">Total Amount Debited</span>
            <span className="font-mono text-[var(--text-primary)]">
              {formatNaira(receipt.totalDebitKobo)}
            </span>
          </div>
          {receipt.newBalanceKobo !== undefined && (
            <div className="flex justify-between py-2.5 font-bold">
              <span className="text-[var(--text-primary)]">New Wallet Balance</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatNaira(receipt.newBalanceKobo)}
              </span>
            </div>
          )}
          {receipt.narration && (
            <div className="flex justify-between pt-2.5">
              <span className="text-[var(--text-muted)]">Narration</span>
              <span className="text-[var(--text-primary)] italic max-w-[200px] truncate">
                {receipt.narration}
              </span>
            </div>
          )}
        </div>

        {/* Security Watermark & Verification Notice */}
        <div className="text-center pt-1 border-t border-[var(--border-color)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
            Secure Settlement via NIBSS Instant Payment (NIP)
          </p>
        </div>
      </div>

      {/* Copy / Toast Alert */}
      {copyFeedback && (
        <div
          role="status"
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center font-semibold animate-fade-in"
        >
          {copyFeedback}
        </div>
      )}

      {/* Action Toolbar (Download Image, Print / PDF, Share) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isExporting}
          aria-label="Download receipt as PNG image"
          className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>{isExporting ? 'Saving...' : 'Download'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          aria-label="Print or save receipt as PDF"
          className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>Print / PDF</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share receipt"
          className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>Share</span>
        </button>
      </div>

      {showDoneButton && onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full h-11 flex items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer mt-2"
        >
          {doneButtonLabel}
        </button>
      )}
    </div>
  );
}
