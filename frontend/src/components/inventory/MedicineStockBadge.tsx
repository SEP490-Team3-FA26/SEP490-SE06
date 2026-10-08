import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MedicineStockBadgeProps {
  stock: number;
  /** Threshold below which stock is considered "low". Defaults to 50. */
  minStock?: number;
  unit?: string;
  /** When true, renders the numeric stock count alongside the status label. */
  showValue?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type StockLevel = "out" | "low" | "ok";

function getStockLevel(stock: number, minStock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= minStock) return "low";
  return "ok";
}

const LEVEL_STYLES: Record<StockLevel, string> = {
  out: "bg-rose-50 text-rose-700 border border-rose-200/70",
  low: "bg-amber-50 text-amber-700 border border-amber-200/70",
  ok:  "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
};

const LEVEL_LABELS: Record<StockLevel, string> = {
  out: "Hết hàng",
  low: "Sắp hết",
  ok:  "Còn hàng",
};

const DOT_STYLES: Record<StockLevel, string> = {
  out: "bg-rose-500",
  low: "bg-amber-500",
  ok:  "bg-emerald-500",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pill badge indicating medicine stock status:
 *  - Rose  → out of stock (stock ≤ 0)
 *  - Amber → low stock   (stock ≤ minStock), includes animated ping dot
 *  - Emerald → in stock  (stock > minStock)
 *
 * Pass showValue=true to display the numeric quantity inline.
 */
export const MedicineStockBadge: React.FC<MedicineStockBadgeProps> = ({
  stock,
  minStock = 50,
  unit = "đơn vị",
  showValue = false,
}) => {
  const level = getStockLevel(stock, minStock);
  const isLow = level === "low";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${LEVEL_STYLES[level]}`}
    >
      {/* Status indicator dot — animated ping for low stock */}
      <span className="relative flex h-2 w-2 shrink-0">
        {isLow && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${DOT_STYLES[level]}`}
            aria-hidden="true"
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${DOT_STYLES[level]}`} />
      </span>

      {/* Status label */}
      <span>{LEVEL_LABELS[level]}</span>

      {/* Optional numeric count */}
      {showValue && (
        <span className="font-mono tabular-nums opacity-80">
          ({stock} {unit})
        </span>
      )}
    </span>
  );
};
