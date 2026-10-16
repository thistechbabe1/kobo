import { useEffect, RefObject } from 'react';

/**
 * Custom hook to handle dropdown dismissal on outside click (mousedown)
 * and keyboard Escape key dismissal.
 *
 * @param ref - Ref to the dropdown/menu container DOM element
 * @param isOpen - Boolean indicating whether the dropdown is active
 * @param onDismiss - Callback invoked to close the dropdown
 */
export function useDropdownDismiss(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isOpen, onDismiss]);
}
