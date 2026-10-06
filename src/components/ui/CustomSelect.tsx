'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string = string> {
  id: string;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function CustomSelect<T extends string = string>({
  id,
  label,
  value,
  options,
  onChange,
  size = 'sm',
  className = '',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bottomNavHeight, setBottomNavHeight] = useState<number>(66);
  const [openUpward, setOpenUpward] = useState(false);
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>(280);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );
  const [activeIndex, setActiveIndex] = useState<number>(selectedIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options[selectedIndex] || options[0];

  const updatePanelMetrics = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === 'undefined') return;

    const rect = triggerEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setIsMobile(false);
      setOpenUpward(false);
      setPanelMaxHeight(200);
      return;
    }

    const mobile = window.innerWidth < 1024;
    setIsMobile(mobile);

    if (mobile) {
      const bottomNavEl = document.querySelector('nav[aria-label="Mobile Navigation Bar"]');
      const navH = bottomNavEl
        ? Math.round(bottomNavEl.getBoundingClientRect().height)
        : 66;
      setBottomNavHeight(navH);
      return;
    }

    const vh = window.innerHeight || 800;
    const spaceBelow = vh - rect.bottom - 12;
    const spaceAbove = rect.top - 24;

    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      setOpenUpward(false);
      setPanelMaxHeight(Math.max(120, Math.min(200, Math.floor(spaceBelow))));
    } else {
      setOpenUpward(true);
      setPanelMaxHeight(Math.max(120, Math.min(200, Math.floor(spaceAbove))));
    }
  }, []);

  const openMenu = () => {
    const currentIdx = Math.max(
      0,
      options.findIndex((opt) => opt.value === value)
    );
    setActiveIndex(currentIdx);
    updatePanelMetrics();
    setIsOpen(true);
  };

  const closeMenuAndFocusTrigger = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Move focus into the sheet/listbox, lock body scroll, & listen for resize while open
  useEffect(() => {
    if (!isOpen) return;
    listboxRef.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', updatePanelMetrics);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('resize', updatePanelMetrics);
    };
  }, [isOpen, updatePanelMetrics]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenuAndFocusTrigger();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeMenuAndFocusTrigger]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenuAndFocusTrigger();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const targetOption = options[activeIndex];
      if (targetOption) {
        onChange(targetOption.value);
      }
      closeMenuAndFocusTrigger();
    }
  };

  const sizeStyles =
    size === 'md'
      ? 'h-10 px-3.5 rounded-xl text-xs font-medium'
      : 'h-8 px-2.5 rounded-lg text-xs font-medium';

  return (
    <div
      className={`relative ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <span id={`${id}-label`} className="sr-only">
        {label},
      </span>

      {/* Custom Styled Select Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        onClick={() => {
          if (isOpen) {
            closeMenuAndFocusTrigger();
          } else {
            openMenu();
          }
        }}
        className={`w-full ${sizeStyles} border ${
          isOpen
            ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-ring)]'
            : 'border-[var(--border-color)] hover:border-[var(--brand-primary)]'
        } bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-between gap-2 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-ring)] transition-all cursor-pointer text-left`}
      >
        <span id={`${id}-value`} className="truncate">
          {selectedOption?.label ?? value}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          data-testid={`${id}-backdrop`}
          style={isMobile ? { bottom: `${bottomNavHeight}px` } : undefined}
          className={
            isMobile
              ? 'fixed inset-x-0 top-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-[1px]'
              : 'fixed inset-0 z-40 bg-black/5 dark:bg-black/25'
          }
          onClick={closeMenuAndFocusTrigger}
          aria-hidden="true"
        />
      )}

      {/* Custom Dropdown Listbox / Mobile Bottom Sheet: flex-col with sole scrolling list */}
      {isOpen && (
        <div
          ref={listboxRef}
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-option-${options[activeIndex]?.value}`}
          style={
            isMobile
              ? { bottom: `${bottomNavHeight}px`, maxHeight: '60dvh' }
              : { maxHeight: `${panelMaxHeight}px` }
          }
          className={
            isMobile
              ? 'fixed left-0 right-0 z-50 rounded-t-2xl border-t border-x border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[0_-8px_30px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[60dvh] focus:outline-none'
              : `absolute left-0 min-w-[160px] w-full ${
                  openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                } z-50 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden flex flex-col focus:outline-none`
          }
        >
          {isMobile && (
            <div
              className="shrink-0 px-4 pt-2.5 pb-2 border-b border-[var(--border-color)] bg-[var(--bg-surface)]"
              aria-hidden="true"
            >
              <div className="w-10 h-1 rounded-full bg-[var(--border-color)] mx-auto mb-2" />
              <p className="text-xs font-bold text-[var(--text-primary)]">{label}</p>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain themed-scrollbar">
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === activeIndex;
              return (
                <button
                  key={opt.value}
                  id={`${id}-option-${opt.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onChange(opt.value);
                    closeMenuAndFocusTrigger();
                  }}
                  className={`w-full px-3 py-2.5 text-xs flex items-center justify-between gap-2 text-left transition-colors cursor-pointer border-b border-[var(--border-color)] last:border-b-0 ${
                    isSelected
                      ? 'bg-[var(--brand-soft)] font-bold text-[var(--brand-primary)]'
                      : isFocused
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
