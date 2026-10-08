import React, { useId, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeScannerInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Triggered when user presses Enter or clicks the scan icon */
  onScan: (barcode: string) => void;
  placeholder?: string;
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Barcode scanner input field.
 * - Connects a visible label (via auto-generated id) for accessibility.
 * - Triggers onScan on Enter key or scan button click.
 * - Applies a brief emerald-pulse border animation after a successful scan.
 * - Shows a teal scanning line animation while focused.
 * - Monospace tracking for barcode readability.
 */
export const BarcodeScannerInput: React.FC<BarcodeScannerInputProps> = ({
  value,
  onChange,
  onScan,
  placeholder = "Nhập hoặc quét mã barcode...",
  label = "Mã barcode",
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Trigger scan and play the success flash animation
  const triggerScan = () => {
    if (!value.trim()) return;
    onScan(value.trim());
    setScanned(true);
    // Reset flash after animation completes
    setTimeout(() => setScanned(false), 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerScan();
    }
  };

  const handleScanButtonClick = () => {
    inputRef.current?.focus();
    triggerScan();
  };

  // Compose border/ring classes based on state
  const borderClass = scanned
    ? "border-emerald-400 ring-4 ring-emerald-500/20 animate-pulse"
    : isFocused
      ? "border-teal-400 ring-4 ring-teal-500/20"
      : "border-slate-200 hover:border-slate-300";

  return (
    <div className="flex flex-col gap-1.5">
      {/* Accessible label */}
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-slate-600 tracking-wide uppercase select-none"
      >
        {label}
      </label>

      {/* Input wrapper — positions the scan icon absolutely */}
      <div className="relative">
        {/* Scanning line animation — visible only while focused */}
        {isFocused && (
          <span className="scanner-line pointer-events-none" aria-hidden="true" />
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pr-11 pl-4 py-2.5 rounded-xl border bg-white/90 backdrop-blur-sm text-sm font-mono tracking-widest text-slate-800 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 transition-all duration-200 outline-none ${borderClass}`}
        />

        {/* Scan trigger button */}
        <button
          type="button"
          onClick={handleScanButtonClick}
          aria-label="Scan barcode"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
        >
          <ScanBarcode size={18} />
        </button>
      </div>
    </div>
  );
};
