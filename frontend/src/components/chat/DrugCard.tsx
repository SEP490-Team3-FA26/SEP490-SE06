import React, { useState } from "react";
import { Pill, Check, Plus, AlertCircle, Sparkles, ShieldAlert, PackageCheck, PackageX } from "lucide-react";

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
}

export const DrugCard: React.FC<DrugCardProps> = ({ drug, onAddToCart }) => {
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
    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-2.5">
      {/* Header card: Image/Icon + Name + Classification */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
          {drug.image ? (
            <img
              src={drug.image}
              alt={drug.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to pill icon on load error
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Pill className="text-blue-600" size={22} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {isSupplement && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Thực phẩm chức năng
              </span>
            )}
            {isRx && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                <ShieldAlert size={10} /> Thuốc kê đơn (Rx)
              </span>
            )}
            {!isSupplement && !isRx && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Không kê đơn (OTC)
              </span>
            )}
          </div>

          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2" title={drug.name}>
            {drug.name}
          </h4>

          {drug.active_ingredient && (
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Hoạt chất: <span className="text-slate-700">{drug.active_ingredient}</span>
            </p>
          )}
        </div>
      </div>

      {/* Details: Liều dùng & Cách dùng */}
      {(drug.dosage || drug.usage) && (
        <div className="bg-slate-50 rounded-xl p-2 text-[11px] text-slate-600 flex flex-col gap-1 border border-slate-100">
          {drug.dosage && (
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-700 shrink-0">• Liều dùng:</span>
              <span className="text-slate-600 leading-tight">{drug.dosage}</span>
            </div>
          )}
          {drug.usage && (
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-700 shrink-0">• Cách dùng:</span>
              <span className="text-slate-600 leading-tight">{drug.usage}</span>
            </div>
          )}
        </div>
      )}

      {/* Price + Stock + Action Button */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div>
          <div className="text-sm font-black text-blue-600">
            {drug.price > 0 ? (
              <>
                {drug.price.toLocaleString("vi-VN")} <span className="text-[10px] font-bold">₫</span>
                {drug.unit && <span className="text-[10px] font-medium text-slate-400"> / {drug.unit}</span>}
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Liên hệ báo giá</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] mt-0.5">
            {drug.in_stock ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Còn {drug.stock} {drug.unit || "sản phẩm"}
              </span>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                Tạm hết hàng
              </span>
            )}
          </div>
        </div>

        {drug.in_stock && drug.medicine_id ? (
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isAdded
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
            }`}
          >
            {isAdded ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Đã thêm</span>
              </>
            ) : isAdding ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Đang thêm...</span>
              </>
            ) : (
              <>
                <Plus size={14} className="stroke-[2.5]" />
                <span>Thêm vào giỏ</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {!drug.medicine_id ? "Chưa có sẵn" : "Hết hàng"}
          </span>
        )}
      </div>
    </div>
  );
};
