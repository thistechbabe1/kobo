'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Kobo App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-3xl font-extrabold font-heading text-[var(--text-primary)] mb-2">
        Something Went Wrong
      </h1>
      <p className="text-xs text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
        An unhandled error occurred in the application shell. You can attempt to retry the operation or return home.
      </p>
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={reset}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold flex items-center gap-2 hover:border-[var(--brand-primary)] transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
