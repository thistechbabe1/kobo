'use client';

/**
 * Accessible mobile and footer trigger for the Demo Guide drawer.
 * Dispatches a custom event to open DemoTipsDrawer without floating overlap.
 */
import { Zap } from 'lucide-react';

interface DemoGuideLinkProps {
  className?: string;
  label?: string;
}

export function DemoGuideLink({
  className = '',
  label = 'Explore Demo Guide & Test Triggers →',
}: DemoGuideLinkProps) {
  const handleOpen = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kobo:open-demo-tips'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      data-testid="demo-guide-mobile-link"
      aria-label="Open Demo Guide and Test Triggers"
      className={`min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline focus:outline-hidden cursor-pointer ${className}`.trim()}
    >
      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
      <span>{label}</span>
    </button>
  );
}
