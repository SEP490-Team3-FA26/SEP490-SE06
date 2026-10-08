import React, { useState } from "react";
import { CheckCircle2, Plus, ShoppingBag, AlertCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MedicineCardProps {
  med: {
    stock: number;
    image?: string;
    name: string;
    price: number;
    unit?: string;
    thong_tin_chi_tiet?: Record<string, string>;
    [key: string]: unknown;
  };
  added: boolean;
  onAddToCart: (med: MedicineCardProps["med"], quantity: number, unit: string) => void;
  onClick: () => void;
  allowOutOfStock?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses pharmaceutical packaging spec strings into unit options
 * with corresponding quantity multipliers.
 * Example input pattern: box, blister, pill spec string
 */
function parsePackaging(
  spec: string,
  defaultUnit: string
): { units: string[]; multipliers: Record<string, number> } {
  const cleanSpec = (spec || "").toLowerCase().trim();
  const regexFull = /hộp\s+(\d+)\s+vỉ\s*x\s*(\d+)\s+viên/;
  const regexBoxPills = /hộp\s+(\d+)\s+viên/;
  const regexBoxBlisters = /hộp\s+(\d+)\s+vỉ/;

  const baseUnit = defaultUnit || "Viên";
  const units = [baseUnit];
  const multipliers: Record<string, number> = { [baseUnit]: 1 };

  const matchFull = cleanSpec.match(regexFull);
  if (matchFull) {
    const blisters = parseInt(matchFull[1], 10);
    const pillsPerBlister = parseInt(matchFull[2], 10);
    return {
      units: ["Hộp", "Vỉ", "Viên"],
      multipliers: { Hộp: blisters * pillsPerBlister, Vỉ: pillsPerBlister, Viên: 1 },
    };
  }

  const matchBoxPills = cleanSpec.match(regexBoxPills);
  if (matchBoxPills) {
    const count = parseInt(matchBoxPills[1], 10);
    return { units: ["Hộp", "Viên"], multipliers: { Hộp: count, Viên: 1 } };
  }

  const matchBoxBlisters = cleanSpec.match(regexBoxBlisters);
  if (matchBoxBlisters) {
    const count = parseInt(matchBoxBlisters[1], 10);
    return { units: ["Hộp", "Vỉ"], multipliers: { Hộp: count, Vỉ: 1 } };
  }

  return { units, multipliers };
}

/**
 * Returns a country flag emoji for common Vietnamese pharmaceutical origin labels.
 */
function getFlag(country: string): string {
  if (country.includes("Việt")) return "🇻🇳";
  if (country.includes("Hoa Kỳ") || country.includes("Mỹ")) return "🇺🇸";
  if (country.includes("Pháp")) return "🇫🇷";
  if (country.includes("Đức")) return "🇩🇪";
  if (country.includes("Nhật")) return "🇯🇵";
  if (country.includes("Hàn")) return "🇰🇷";
  if (country.includes("Ấn Độ")) return "🇮🇳";
  return "🌐";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const MedicineCard: React.FC<MedicineCardProps> = ({
  med,
  added,
  onAddToCart,
  onClick,
  allowOutOfStock = false,
}) => {
  const isOutOfStock = med.stock <= 0;
  const isLowStock = med.stock > 0 && med.stock <= 50;

  // Derive packaging units from product detail info
  const packSpec =
    med.thong_tin_chi_tiet?.["Quy cách đóng gói"] ||
    med.thong_tin_chi_tiet?.["Quy cách"] ||
    "";
  const { units, multipliers } = parsePackaging(packSpec, med.unit ?? "Viên");

  const [selectedUnit, setSelectedUnit] = useState<string>(units[0] || med.unit || "Hộp");

  const currentMultiplier = multipliers[selectedUnit] ?? 1;
  const displayPrice = med.price * currentMultiplier;

  const countryName =
    med.thong_tin_chi_tiet?.["Nước sản xuất"] ||
    med.thong_tin_chi_tiet?.["Xuất xứ"] ||
    "";

  // ── Derived button state ──────────────────────────────────────────────────
  const isDisabled = isOutOfStock && !allowOutOfStock;

  const addButtonClass = isDisabled
    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
    : added
      ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md shadow-emerald-200/60"
      : isOutOfStock
        ? "bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-200/60 active:scale-90"
        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/60 active:scale-90";

  return (
    <div
      onClick={onClick}
      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-emerald-300/60 hover:shadow-[0_8px_30px_rgba(5,150,105,0.12)] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* ── Image Area ────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-emerald-50/40 to-teal-50/30 h-40 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={
            med.image ||
            "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"
          }
          alt={med.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        {/* Out-of-stock overlay — glassmorphism */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <span
              className={`px-3 py-1 text-white text-[10px] font-black rounded-full uppercase tracking-wider ${
                allowOutOfStock ? "bg-amber-600/90 shadow-sm" : "bg-slate-800/80"
              }`}
            >
              {allowOutOfStock ? "Hết hàng (Cho phép nhập)" : "Hết hàng"}
            </span>
          </div>
        )}

        {/* Low stock amber pill with animated pulse dot */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
            {/* Animated pulse indicator */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Sắp hết
          </div>
        )}

        {/* Country badge — glassmorphism pill */}
        {countryName && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-100/80 shadow-sm text-[9px] font-bold text-slate-600 flex items-center gap-1">
            <span>{getFlag(countryName)}</span>
            <span className="max-w-[60px] truncate">{countryName}</span>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="p-4 flex-1 flex flex-col gap-3">

        {/* Medicine name */}
        <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
          {med.name}
        </h4>

        {/* Unit selector pills — only shown when multiple packaging units exist */}
        {units.length > 1 && (
          <div className="flex gap-1">
            {units.map((u) => (
              <button
                key={u}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUnit(u);
                }}
                aria-label={`Chọn đơn vị ${u}`}
                className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                  selectedUnit === u
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        )}

        {/* Price + Add-to-cart button */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            {/* Price displayed in monospace tabular-nums for proper digit alignment */}
            <p className="font-mono tabular-nums font-black text-emerald-700 text-base leading-tight">
              {displayPrice.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">/ {selectedUnit}</p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(med, currentMultiplier, selectedUnit);
            }}
            disabled={isDisabled}
            aria-label={added ? "Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all ${addButtonClass}`}
          >
            {added ? <CheckCircle2 size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
