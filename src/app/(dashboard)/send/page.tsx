import { SendHorizontal, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Send Money | Kobo',
  description: 'Fast, secure bank transfers and peer-to-peer payments across Nigeria.',
};

export default function SendPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-[var(--text-primary)]">Send Money</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Instant transfers to any Nigerian bank account or Kobo wallet.
        </p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[var(--brand-primary)] mx-auto flex items-center justify-center">
          <SendHorizontal className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Direct Transfers</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Send funds securely to Nigerian banks with instant account verification.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-xs font-medium text-[var(--brand-primary)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NDIC Insured &amp; CBN Regulated Partner Network</span>
        </div>
      </div>
    </div>
  );
}
