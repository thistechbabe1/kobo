import Link from 'next/link';
import { Wallet } from 'lucide-react';

export interface BrandLogoProps {
  href?: string;
  variant?: 'default' | 'dark';
  className?: string;
  ariaLabel?: string;
}

export function BrandLogo({
  href,
  variant = 'default',
  className = '',
  ariaLabel = 'Kobo Wallet Home',
}: BrandLogoProps) {
  const isDark = variant === 'dark';

  const iconClasses = isDark
    ? 'w-9 h-9 rounded-xl bg-[#14A877] text-[#0A1411] flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform'
    : 'w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white dark:text-[#0A1411] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform';

  const titleClasses = isDark
    ? 'text-xl font-extrabold font-heading text-white tracking-tight'
    : 'text-xl font-extrabold font-heading tracking-tight text-[var(--text-primary)]';

  const subtitleClasses = isDark
    ? 'text-[10px] font-semibold uppercase tracking-wider text-[#14A877] block -mt-1'
    : 'text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)] block -mt-1';

  const content = (
    <>
      <div className={iconClasses}>
        <Wallet className="w-5 h-5" />
      </div>
      <div>
        <span className={titleClasses}>Kobo</span>
        <span className={subtitleClasses}>Wallet</span>
      </div>
    </>
  );

  const containerClasses = `flex items-center gap-2.5 group ${className}`.trim();

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={containerClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div aria-label={ariaLabel} className={containerClasses}>
      {content}
    </div>
  );
}
