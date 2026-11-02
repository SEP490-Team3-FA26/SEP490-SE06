import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CurrencySize = "sm" | "md" | "lg" | "xl";
type CurrencyColor = "sky" | "slate" | "rose";

interface CurrencyTextProps {
  amount: number;
  /** Mã tiền tệ theo chuẩn ISO 4217. Mặc định là "VND". */
  currency?: string;
  size?: CurrencySize;
  color?: CurrencyColor;
  /** Thêm ký hiệu tiền tệ sau số nếu bật. */
  showUnit?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bản đồ style theo tone màu chuẩn Sky
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<CurrencySize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

const COLOR_CLASSES: Record<CurrencyColor, string> = {
  sky:     "text-sky-700",
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
 * Thành phần hiển thị số tiền định dạng chuẩn.
 * - Luôn sử dụng font-mono tabular-nums để căn thẳng hàng chữ số trong bảng và thẻ.
 * - Hỗ trợ 4 kích thước (sm -> xl) và các tone màu ngữ nghĩa (sky / slate / rose).
 * - Tự động thêm ký hiệu tiền tệ ₫ cho VND.
 */
export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  currency = "VND",
  size = "md",
  color = "sky",
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
