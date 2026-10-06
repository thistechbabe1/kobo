'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Bank, NIGERIAN_BANKS } from '@/lib/banks';

interface BankSelectorProps {
  id?: string;
  selectedBankCode: string;
  onSelectBank: (bank: Bank) => void;
  disabled?: boolean;
}

export function BankSelector({
  id,
  selectedBankCode,
  onSelectBank,
  disabled = false,
}: BankSelectorProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [bottomNavHeight, setBottomNavHeight] = useState<number>(66);
  const [openUpward, setOpenUpward] = useState(false);
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>(280);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedBank =
    NIGERIAN_BANKS.find((b) => b.code === selectedBankCode) || NIGERIAN_BANKS[0];

  const filteredBanks = NIGERIAN_BANKS.filter((bank) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      bank.name.toLowerCase().includes(q) ||
      bank.shortName.toLowerCase().includes(q) ||
      bank.code.includes(q)
    );
  });

  const updatePanelMetrics = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === 'undefined') return;

    const rect = triggerEl.getBoundingClientRect();
    // In JSDOM unit tests, bounding rect is all zeros
    if (rect.width === 0 && rect.height === 0) {
      setIsMobile(false);
      setOpenUpward(false);
      setPanelMaxHeight(280);
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

  const handleOpen = () => {
    updatePanelMetrics();
    setIsOpen(true);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Move focus into the sheet/panel search input on open without scrolling the viewport
  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus({ preventScroll: true });

    window.addEventListener('resize', updatePanelMetrics);
    return () => {
      window.removeEventListener('resize', updatePanelMetrics);
    };
  }, [isOpen, updatePanelMetrics]);

  // Lock body scroll while dropdown/sheet is open and release on close/unmount
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Click outside & Escape listener to close dropdown/sheet
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const handleSelect = (bank: Bank) => {
    onSelectBank(bank);
    handleClose();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Hidden native select for form accessibility */}
      <select
        value={selectedBankCode}
        onChange={(e) => {
          const bank = NIGERIAN_BANKS.find((b) => b.code === e.target.value);
          if (bank) onSelectBank(bank);
        }}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      >
        {NIGERIAN_BANKS.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>

      {/* Styled Custom Select Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-label="Destination Bank"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
        className={`w-full h-11 px-3.5 rounded-xl border ${
          isOpen
            ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-ring)]'
            : 'border-[var(--border-color)] hover:border-[var(--brand-primary)]'
        } bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm flex items-center justify-between focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-ring)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-left`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-md bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold text-[10px] flex items-center justify-center shrink-0 uppercase tracking-tighter">
            {selectedBank.shortName.slice(0, 3)}
          </span>
          <span className="truncate font-medium text-[var(--text-primary)]">
            {selectedBank.name}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--brand-primary)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Backdrop overlay to prevent scroll chaining and enable easy dismissal */}
      {isOpen && (
        <div
          data-testid="bank-selector-backdrop"
          style={isMobile ? { bottom: `${bottomNavHeight}px` } : undefined}
          className={
            isMobile
              ? 'fixed inset-x-0 top-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-[1px]'
              : 'fixed inset-0 z-40 bg-black/10 dark:bg-black/30'
          }
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Custom Dropdown / Mobile Bottom Sheet: flex-col with fixed search header and scrolling list below */}
      {isOpen && (
        <div
          id={`${selectId}-listbox`}
          role="listbox"
          aria-label="Nigerian Banks"
          style={
            isMobile
              ? { bottom: `${bottomNavHeight}px`, maxHeight: '60dvh' }
              : { maxHeight: `${panelMaxHeight}px` }
          }
          className={
            isMobile
              ? 'fixed left-0 right-0 z-50 rounded-t-2xl border-t border-x border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[0_-8px_30px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[60dvh]'
              : `absolute left-0 right-0 ${
                  openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                } z-50 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden flex flex-col`
          }
        >
          {/* Fixed, non-scrolling Search Header */}
          <div className="shrink-0 relative z-10 p-2.5 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
            {isMobile && (
              <div
                className="w-10 h-1 rounded-full bg-[var(--border-color)] mx-auto mb-2"
                aria-hidden="true"
              />
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--brand-primary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bank name or code..."
                aria-label="Filter banks"
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-ring)] transition-all"
              />
            </div>
          </div>

          {/* Bank Options List — the ONLY scrolling element */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain themed-scrollbar">
            {filteredBanks.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-[var(--text-muted)]">
                No Nigerian bank found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = bank.code === selectedBankCode;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(bank)}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer border-b border-[var(--border-color)] last:border-b-0 ${
                      isSelected
                        ? 'bg-[var(--brand-soft)] font-bold text-[var(--brand-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={`w-6 h-6 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 uppercase tracking-tighter ${
                          isSelected
                            ? 'bg-[var(--brand-primary)] text-white dark:text-[#0A1411]'
                            : 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                        }`}
                      >
                        {bank.shortName.slice(0, 3)}
                      </span>
                      <div className="truncate">
                        <span className="block truncate font-medium">{bank.name}</span>
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          NIP Code: {bank.nipCode}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--brand-primary)] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
