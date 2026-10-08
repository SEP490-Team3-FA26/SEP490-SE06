import React, { useRef, useEffect, useCallback, useId } from 'react';
import { Search, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Controlled input value */
  value: string;
  /** Called immediately on every keystroke */
  onChange: (value: string) => void;
  /** Called after the debounce delay — ideal for triggering API calls */
  onSearch?: (value: string) => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Additional CSS classes for the root wrapper */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SearchBar molecule with built-in debounce, clear button, and "/" keyboard
 * shortcut for quick focus. Uses glassmorphism styling consistent with the
 * ABC Pharmacy ERP design system.
 *
 * - Pressing "/" on the page focuses the input (when no other input is active).
 * - An "×" clear button appears once the user has typed anything.
 * - A "/" hint badge is shown on the right when the field is empty.
 */
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search…',
  debounceMs = 300,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable unique ID for the label/input pair
  const inputId = useId();

  // ── Debounced search callback ───────────────────────────────────────────────
  const triggerSearch = useCallback(
    (nextValue: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (!onSearch) return;
      debounceTimerRef.current = setTimeout(() => {
        onSearch(nextValue);
      }, debounceMs);
    },
    [onSearch, debounceMs],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── "/" keyboard shortcut ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus the input when "/" is pressed and no other editable element is active
      if (
        event.key === '/' &&
        document.activeElement !== inputRef.current &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement) &&
        !(document.activeElement instanceof HTMLSelectElement) &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    triggerSearch(next);
  };

  const handleClear = () => {
    onChange('');
    if (onSearch) onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onSearch(value);
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const hasValue = value.length > 0;

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Visually hidden label for screen readers */}
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>

      {/* Glassmorphism wrapper — acts as the visible "input box" */}
      <div
        className={[
          'relative flex items-center w-full',
          'bg-white/70 backdrop-blur-sm',
          'border border-slate-200/80 rounded-xl',
          'focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20',
          'transition-all duration-200',
        ].join(' ')}
      >
        {/* Search icon — left */}
        <Search
          className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />

        {/* Input field */}
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="searchbox"
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={[
            'w-full h-10 bg-transparent text-sm text-slate-800 placeholder:text-slate-400',
            'pl-9 pr-16',          // make room for icons on both sides
            'outline-none border-none',
            // Remove browser's built-in search cancel button
            '[appearance:none] [&::-webkit-search-cancel-button]:appearance-none',
          ].join(' ')}
        />

        {/* Right-side affordances */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {hasValue ? (
            /* Clear (×) button */
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className={[
                'flex items-center justify-center w-5 h-5 rounded-full',
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
                'transition-colors duration-150',
              ].join(' ')}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            /* Keyboard hint badge */
            <kbd
              aria-label="Press slash to search"
              className={[
                'hidden sm:inline-flex items-center justify-center',
                'h-5 px-1.5 rounded border border-slate-200 bg-slate-50',
                'text-[10px] font-mono text-slate-400 leading-none',
                'pointer-events-none select-none',
              ].join(' ')}
            >
              /
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
};

export { SearchBar };
export default SearchBar;
export type { SearchBarProps };
