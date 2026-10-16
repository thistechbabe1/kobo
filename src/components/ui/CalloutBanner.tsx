/**
 * Accessible alert banner primitive with semantic role="alert" defaults for error states,
 * supporting error, warning, info, and success variants.
 */
import { ReactNode, HTMLAttributes } from 'react';

export type CalloutVariant = 'error' | 'warning' | 'info' | 'success';

const CALLOUT_STYLES: Record<CalloutVariant, string> = {
  error: 'border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300',
  warning: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200',
  info: 'border-sky-500/30 bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-200',
  success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200',
};

export interface CalloutBannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CalloutVariant;
  children: ReactNode;
  className?: string;
}

export function CalloutBanner({
  variant = 'info',
  children,
  className = '',
  role,
  ...props
}: CalloutBannerProps) {
  const roundedClass = className.includes('rounded-') ? '' : 'rounded-xl';
  const defaultRole = role ?? (variant === 'error' ? 'alert' : undefined);

  return (
    <div
      role={defaultRole}
      className={`${roundedClass} border ${CALLOUT_STYLES[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
