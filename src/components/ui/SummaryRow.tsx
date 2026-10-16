import { ReactNode, HTMLAttributes } from 'react';

export interface SummaryRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function SummaryRow({
  label,
  value,
  className = '',
  labelClassName = 'text-[var(--text-muted)]',
  valueClassName = '',
  ...props
}: SummaryRowProps) {
  return (
    <div className={`flex justify-between ${className}`.trim()} {...props}>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
