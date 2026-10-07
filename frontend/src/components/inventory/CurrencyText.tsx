import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CurrencySize = "sm" | "md" | "lg" | "xl";
type CurrencyColor = "emerald" | "slate" | "rose";

interface CurrencyTextProps {
  amount: number;
  /** ISO 4217 currency code. Defaults to "VND". */
  currency?: string;
  size?: CurrencySize;
  color?: CurrencyColor;
  /** When true, appends the currency symbol after the formatted amount. */
  showUnit?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<CurrencySize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

const COLOR_CLASSES: Record<CurrencyColor, string> = {
  emerald: "text-emerald-700",
  slate:   "text-slate-700",
  rose:    "text-rose-600",
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a locale-formatted Vietnamese currency string.
 * Uses Intl.NumberFormat for grouping and consistent digit rendering.
 */
function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomic currency display element.
 * - Always renders with `font-mono tabular-nums` to guarantee digit alignment
 *   in tables, cards and lists.
 * - Supports 4 sizes (sm → xl) and 3 semantic colors (emerald / slate / rose).
 * - Optionally appends a currency symbol ("₫" for VND, or the ISO code for others).
 */
export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  currency = "VND",
  size = "md",
  color = "emerald",
  showUnit = true,
}) => {
  const symbol = currency === "VND" ? "₫" : currency;
  const formatted = formatVND(amount);

  return (
    <span
      className={`font-mono tabular-nums font-semibold ${SIZE_CLASSES[size]} ${COLOR_CLASSES[color]}`}
    >
      {formatted}
      {showUnit && <span className="ml-0.5 opacity-80">{symbol}</span>}
    </span>
  );
};
