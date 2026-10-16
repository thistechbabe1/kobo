import { ReactNode, HTMLAttributes } from 'react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className = '',
  ...props
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={`text-center py-8 text-xs text-[var(--text-muted)] ${className}`.trim()}
        {...props}
      >
        {icon && <div className="mb-2 flex justify-center">{icon}</div>}
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        {description && <p className="mt-1 text-[var(--text-muted)]">{description}</p>}
        {action}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] p-8 text-center ${className}`.trim()}
      {...props}
    >
      {icon && <div className="mb-3 flex justify-center text-[var(--text-muted)]">{icon}</div>}
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {description && <p className="mt-2 text-xs text-[var(--text-muted)]">{description}</p>}
      {action}
    </div>
  );
}
