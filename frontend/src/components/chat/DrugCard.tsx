import React, { useState } from "react";
import { Pill, Check, Plus, ShieldAlert, Zap } from "lucide-react";

export interface ChatDrugItem {
  medicine_id: string | null;
  name: string;
  active_ingredient?: string;
  dosage?: string;
  usage?: string;
  price: number;
  stock: number;
  unit?: string;
  category?: string;
  image?: string;
  drug_classification?: string;
  is_supplement?: boolean;
  in_stock: boolean;
}

interface DrugCardProps {
  drug: ChatDrugItem;
  onAddToCart: (drug: ChatDrugItem) => Promise<boolean>;
  onBuyNow?: (drug: ChatDrugItem) => void;
}

export const DrugCard: React.FC<DrugCardProps> = ({ drug, onAddToCart, onBuyNow }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = async () => {
    if (!drug.in_stock || !drug.medicine_id || isAdding) return;
    setIsAdding(true);
    try {
      const ok = await onAddToCart(drug);
      if (ok) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2500);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const isRx = drug.drug_classification === "PRESCRIPTION" || drug.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
  const isSupplement = drug.is_supplement || drug.drug_classification === "SUPPLEMENT" || drug.drug_classification === "COMMON_SUPPLEMENT";

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-all flex flex-col gap-2">
      {/* Header card: Image/Icon + Name + Classification badge */}
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
          {drug.image ? (
            <img
              src={drug.image}
              alt={drug.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to pill icon when image fails to load
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Pill className="text-blue-600" size={18} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {isSupplement && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                TPCN
              </span>
            )}
            {isRx && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                <ShieldAlert size={10} /> Thuốc kê đơn (Rx)
              </span>
            )}
            {!isSupplement && !isRx && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                OTC
              </span>
            )}
          </div>

          <h4 className="font-semibold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-1" title={drug.name}>
            {drug.name}
          </h4>

          {drug.active_ingredient && (
            <p className="text-[11px] text-slate-400 font-normal truncate">
              {drug.active_ingredient}
            </p>
          )}
        </div>
      </div>

      {/* Usage and dosage details if available */}
      {(drug.dosage || drug.usage) && (
        <div className="bg-slate-50/80 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 flex flex-col gap-0.5 border border-slate-100">
          {drug.dosage && (
            <div className="flex items-start gap-1">
              <span className="text-slate-400 shrink-0 font-medium">Liều:</span>
              <span className="text-slate-700 leading-tight truncate">{drug.dosage}</span>
            </div>
          )}
          {drug.usage && (
            <div className="flex items-start gap-1">
              <span className="text-slate-400 shrink-0 font-medium">Dùng:</span>
              <span className="text-slate-700 leading-tight truncate">{drug.usage}</span>
            </div>
          )}
        </div>
      )}

      {/* Pricing + Stock + Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div>
          <div className="text-xs sm:text-[13px] font-mono tabular-nums font-semibold text-blue-600">
            {drug.price > 0 ? (
              <>
                {drug.price.toLocaleString("vi-VN")}{" "}
                <span className="text-[10px] font-sans font-medium text-slate-500">
                  ₫{drug.unit ? ` / ${drug.unit}` : ""}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-sans text-slate-400">Liên hệ báo giá</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            {drug.in_stock ? (
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Còn hàng ({drug.stock})
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                Tạm hết
              </span>
            )}
          </div>
        </div>

        {drug.in_stock && drug.medicine_id ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {onBuyNow && (
              <button
                type="button"
                onClick={() => onBuyNow(drug)}
                aria-label={`Mua ngay ${drug.name}`}
                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Mua ngay qua VietQR PayOS"
              >
                <Zap size={12} className="text-amber-600" />
                <span>Mua ngay</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              aria-label={`Thêm ${drug.name} vào giỏ hàng`}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isAdded
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
              }`}
            >
              {isAdded ? (
                <>
                  <Check size={12} className="stroke-[3]" />
                  <span>Đã thêm</span>
                </>
              ) : isAdding ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang thêm</span>
                </>
              ) : (
                <>
                  <Plus size={12} className="stroke-[2.5]" />
                  <span>Thêm giỏ</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            Hết hàng
          </span>
        )}
      </div>
    </div>
  );
};

export default DrugCard;
