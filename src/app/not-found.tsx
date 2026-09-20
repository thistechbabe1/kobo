import Link from 'next/link';
import { Wallet, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] flex items-center justify-center mb-4">
        <Wallet className="w-6 h-6" />
      </div>
      <h1 className="text-4xl font-extrabold font-heading text-[var(--text-primary)] mb-2">
        404 - Page Not Found
      </h1>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
        The requested page does not exist or has been moved within Kobo Wallet.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold text-xs flex items-center gap-2 hover:opacity-95 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
