'use client';

import { useState, useRef, useEffect, useId } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll while dropdown is open to prevent double scrollbars
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
        id={selectId}
        type="button"
        role="combobox"
        aria-label="Destination Bank"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm flex items-center justify-between hover:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold text-[10px] flex items-center justify-center shrink-0 uppercase tracking-tighter">
            {selectedBank.shortName.slice(0, 3)}
          </span>
          <span className="truncate font-medium text-[var(--text-primary)]">
            {selectedBank.name}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Backdrop overlay to prevent scroll chaining and enable easy dismissal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[0.5px]"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Custom Dropdown Menu with Search */}
      {isOpen && (
        <div
          id={`${selectId}-listbox`}
          role="listbox"
          aria-label="Nigerian Banks"
          className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Input Bar */}
          <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bank name or code..."
                aria-label="Filter banks"
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
            </div>
          </div>

          {/* Bank Options List with Contained Scroll */}
          <div className="max-h-56 overflow-y-auto overscroll-contain py-1 pr-1 [scrollbar-width:thin] [scrollbar-color:var(--border-color)_transparent] divide-y divide-[var(--border-color)]/30">
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
                    className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--brand-primary)]/10 font-bold text-[var(--brand-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={`w-6 h-6 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 uppercase tracking-tighter ${
                          isSelected
                            ? 'bg-[var(--brand-primary)] text-white dark:text-[#0A1411]'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-[var(--text-muted)]'
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
