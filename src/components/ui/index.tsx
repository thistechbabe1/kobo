import { ReactNode, ButtonHTMLAttributes } from 'react';

// ─── Primary CTA Button ────────────────────────────────────────────────────

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PrimaryButton({
  children,
  isLoading,
  loadingLabel,
  fullWidth = false,
  size = 'md',
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  const sizes = {
    sm: 'py-2 px-3 text-xs rounded-xl',
    md: 'py-2.5 px-4 text-xs rounded-xl',
    lg: 'py-3 px-5 text-sm rounded-2xl',
  };
  return (
    <button
      disabled={disabled || isLoading}
      className={`${fullWidth ? 'w-full' : ''} ${sizes[size]} bg-[var(--brand-primary)] text-white dark:text-[#0A1411] font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {isLoading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

// ─── Ghost / Outline Button ────────────────────────────────────────────────

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

export function GhostButton({
  children,
  fullWidth = false,
  size = 'md',
  className = '',
  ...props
}: GhostButtonProps) {
  const sizes = {
    sm: 'py-1.5 px-3 text-xs rounded-lg',
    md: 'py-2.5 px-4 text-xs rounded-xl',
  };
  return (
    <button
      className={`${fullWidth ? 'w-full' : ''} ${sizes[size]} border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-semibold hover:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all cursor-pointer disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Surface Card ──────────────────────────────────────────────────────────

export function SurfaceCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  error: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  neutral: 'bg-zinc-200/60 dark:bg-zinc-800 text-[var(--text-muted)] border-zinc-300 dark:border-zinc-700',
};

export function StatusBadge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────

export function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-10">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)] mb-2">
          {label}
        </p>
      )}
      <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
