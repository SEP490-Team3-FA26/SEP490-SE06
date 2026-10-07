import React, { useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Tag, Zap } from "lucide-react";

// --- Type Definitions ---

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  sku?: string;
  discount?: number; // percent (0–100)
}

interface PosOrderCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (total: number, discountCode?: string) => void;
  loading?: boolean;
  vatRate?: number; // default 10
}

// --- Helper ---

const formatVND = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

// --- Sub-components ---

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemoveItem }: CartItemRowProps) {
  const discountedPrice = item.discount
    ? item.price * (1 - item.discount / 100)
    : item.price;
  const lineTotal = discountedPrice * item.quantity;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100/80 last:border-0 group">
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 text-sm truncate">{item.name}</p>
        {item.sku && (
          <p className="font-mono text-xs text-slate-400 mt-0.5">{item.sku}</p>
        )}
        {item.discount && item.discount > 0 ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono tabular-nums text-xs text-slate-400 line-through">
              {formatVND(item.price)}
            </span>
            <span className="text-xs text-rose-500 font-semibold">-{item.discount}%</span>
          </div>
        ) : null}
        <p className="font-mono tabular-nums text-emerald-700 font-bold text-sm mt-0.5">
          {formatVND(lineTotal)}
        </p>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
          aria-label={`Decrease quantity of ${item.name}`}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm"
        >
          <Minus size={13} />
        </button>
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) onUpdateQuantity(item.id, val);
          }}
          className="w-10 text-center font-mono tabular-nums text-sm font-bold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white/80"
          aria-label={`Quantity of ${item.name}`}
        />
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Increase quantity of ${item.name}`}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-sm"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Unit label */}
      <span className="text-xs text-slate-400 font-medium shrink-0 mt-1">{item.unit}</span>

      {/* Remove button */}
      <button
        onClick={() => onRemoveItem(item.id)}
        aria-label="Remove item from cart"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0 mt-0.5"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// --- Main Component ---

export function PosOrderCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  loading = false,
  vatRate = 10,
}: PosOrderCartProps) {
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucherApplied, setVoucherApplied] = useState<boolean>(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const discountedPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
    return sum + discountedPrice * item.quantity;
  }, 0);
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  const handleValidateVoucher = () => {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code.");
      return;
    }
    // Placeholder validation — replace with real API call
    setVoucherApplied(true);
    setVoucherError(null);
  };

  const handleCheckout = () => {
    onCheckout(total, voucherApplied ? voucherCode : undefined);
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-emerald-100/60 px-5 py-4 rounded-t-2xl flex items-center gap-2.5">
        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
          <ShoppingCart size={16} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm leading-tight">Giỏ hàng POS</h2>
          <p className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? "sản phẩm" : "sản phẩm"}
          </p>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
        {items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">Giỏ hàng trống</p>
            <p className="text-xs text-slate-300 text-center">
              Thêm sản phẩm vào giỏ để bắt đầu thanh toán
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Voucher input */}
      {items.length > 0 && (
        <div className="px-5 pt-3 pb-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Tag size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Nhập mã voucher..."
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherApplied(false);
                  setVoucherError(null);
                }}
                className="flex-1 text-xs font-mono font-semibold bg-transparent text-slate-700 placeholder:text-slate-300 focus:outline-none"
              />
              {voucherApplied && (
                <span className="text-xs text-emerald-600 font-semibold">✓</span>
              )}
            </div>
            <button
              onClick={handleValidateVoucher}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all"
            >
              Áp dụng
            </button>
          </div>
          {voucherError && (
            <p className="text-xs text-rose-500 mt-1.5 pl-1">{voucherError}</p>
          )}
        </div>
      )}

      {/* Summary section (sticky bottom) */}
      {items.length > 0 && (
        <div className="px-5 py-4 border-t border-slate-100/80 bg-slate-50/60 rounded-b-2xl space-y-2">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Tạm tính</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {formatVND(subtotal)}
            </span>
          </div>

          {/* VAT */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              VAT{" "}
              <span className="text-emerald-600 font-semibold font-mono">{vatRate}%</span>
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              {formatVND(vatAmount)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Tổng cộng</span>
              <span className="font-mono tabular-nums font-black text-xl text-emerald-700">
                {formatVND(total)}
              </span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0}
            className="w-full mt-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
            ) : (
              <Zap size={16} />
            )}
            <span>{loading ? "Đang xử lý..." : "Thanh toán"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
