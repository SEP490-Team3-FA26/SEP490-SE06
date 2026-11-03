/**
 * CurrencyText — Atom component for consistent VND currency display.
 *
 * RULES:
 *  - Always uses font-mono tabular-nums to prevent layout shifts
 *  - Formats with Vietnamese locale via Intl.NumberFormat
 */
import React from 'react';

export interface CurrencyTextProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'sky' | 'slate' | 'rose';
  /** Hiển thị đơn vị tiền tệ sau số */
  showUnit?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CurrencyTextProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const COLOR_CLASSES: Record<NonNullable<CurrencyTextProps['color']>, string> = {
  sky:     'text-sky-700',
  slate:   'text-slate-700',
  rose:    'text-rose-600',
};

/**
 * Hiển thị số tiền VND định dạng chuẩn.
 * Áp dụng font-mono tabular-nums để số liệu không bị nhảy layout khi thay đổi.
 */
export function CurrencyText({
  amount,
  currency = 'VND',
  size = 'md',
  color = 'sky',
  showUnit = false,
  className = '',
}: CurrencyTextProps) {
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: showUnit ? 'currency' : 'decimal',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <span
      className={`font-mono tabular-nums font-semibold ${SIZE_CLASSES[size]} ${COLOR_CLASSES[color]} ${className}`}
    >
      {formatted}
      {!showUnit && <span className="ml-0.5 text-[0.75em] font-bold opacity-70">₫</span>}
    </span>
  );
}
