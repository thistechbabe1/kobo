'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, ShieldAlert, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AUTH_COOKIE_NAME } from '@/proxy';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('babatunde@kobo.demo');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    document.cookie = `${AUTH_COOKIE_NAME}=authenticated; path=/; max-age=604800; SameSite=Lax`;

    setTimeout(() => {
      router.push(redirectTo);
    }, 400);
  };

  const handleQuickDemoLogin = () => {
    setIsLoading(true);
    setEmail('babatunde@kobo.demo');
    setPassword('demopassword123');

    document.cookie = `${AUTH_COOKIE_NAME}=authenticated; path=/; max-age=604800; SameSite=Lax`;

    setTimeout(() => {
      router.push(redirectTo);
    }, 300);
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/10 dark:bg-emerald-100/10 text-xs font-semibold text-[var(--brand-primary)] mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" /> Demo Environment
        </span>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--text-primary)]">
          Welcome to Kobo
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
          Experience Nigeria’s modern digital wallet &amp; payment dashboard.
        </p>
      </div>

      {/* Quick One-Click Demo Button */}
      <button
        onClick={handleQuickDemoLogin}
        disabled={isLoading}
        type="button"
        className="w-full py-3 px-4 mb-5 rounded-2xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold text-xs hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
      >
        {isLoading ? (
          <span>Authenticating demo session...</span>
        ) : (
          <>
            <span>⚡ One-Click &quot;Try Demo Account&quot;</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-color)]"></div>
        </div>
        <span className="relative px-3 bg-[var(--bg-surface)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
          Or Sign In
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-[var(--text-primary)] mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div>
          <label className="block font-semibold text-[var(--text-primary)] mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold hover:border-[var(--brand-primary)] transition-all cursor-pointer"
        >
          Sign In to Wallet
        </button>
      </form>

      <div className="mt-6 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] flex items-start gap-2">
        <Lock className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
        <span>
          Session cookie (<code className="font-mono text-[var(--text-primary)]">kobo_auth</code>) is set upon sign in to demonstrate Next.js proxy route protection.
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold font-heading text-[var(--text-primary)]">
            Kobo
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Center Auth Card wrapped in Suspense */}
      <div className="w-full max-w-md mx-auto my-8">
        <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse">Loading auth card...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-xs text-[var(--text-muted)] max-w-md mx-auto">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>This app is a demo project with no real money or banking data.</span>
        </p>
      </div>
    </div>
  );
}
