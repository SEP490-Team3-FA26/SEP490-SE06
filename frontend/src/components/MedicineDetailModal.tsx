import React, { useState, useEffect } from "react";
import { XCircle, Check, ShoppingCart, Info, Activity, ShieldAlert, Tag, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { BarcodeLabelModal } from "./BarcodeLabelModal";

export interface MedicineDetailModalProps {
  medicine: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (med: any, quantity: number) => void;
  addedItems: { [key: string]: boolean };
}

export function MedicineDetailModal({ medicine, isOpen, onClose, onAddToCart, addedItems }: MedicineDetailModalProps) {
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);

  // Đặt lại số lượng khi mở thuốc mới
  useEffect(() => {
    if (isOpen && medicine) {
      setModalQuantity(1);
    }
  }, [isOpen, medicine]);

  if (!isOpen || !medicine) return null;

  const med = medicine;
  const medId = med.id || med._id;
  const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
  const isOutOfStock = (med.stock !== undefined && med.stock <= 0);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 cursor-default max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60 shrink-0">
          <div className="flex flex-col gap-1 text-left pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                isRx ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"
              }`}>
                {isRx ? "Thuốc kê đơn (Rx)" : "Không kê đơn"}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                SKU: {med.sku || med.barcode || medId.toString().substring(0, 8).toUpperCase()}
              </span>
              {isOutOfStock ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                  Tạm hết hàng
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Sẵn sàng giao
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-800 leading-snug mt-1">
              {med.name}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer shrink-0"
            title="Đóng modal"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Modal Body Columns (Scrollable) */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 custom-scrollbar text-left">
          
          {/* Cột hiển thị hình ảnh và cam kết */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="w-full h-56 sm:h-64 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100 relative group overflow-hidden">
              <img 
                src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                alt={med.name}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Cam kết chuẩn GPP */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>100% Thuốc chính hãng có hóa đơn</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Truck size={14} className="text-blue-600 shrink-0" />
                <span>Giao nhanh trong 2 giờ nội thành</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <RefreshCw size={14} className="text-amber-600 shrink-0" />
                <span>Đổi trả trong 30 ngày nếu phát hiện lỗi</span>
              </div>
            </div>
          </div>

          {/* Cột thông tin chi tiết dược lý */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-1">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Hoạt chất chính</span>
                <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.active_ingredient || "Đang cập nhật"}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-1">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Nhóm điều trị</span>
                <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.category || "Chưa phân loại"}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3.5 mt-1">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-[#0057cd]" /> Công dụng thuốc
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{med.cong_dung || "Chưa cập nhật mô tả chi tiết."}</p>
              </div>
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Activity size={14} className="text-[#0057cd]" /> Hướng dẫn sử dụng
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{med.cach_dung || "Tham khảo ý kiến bác sĩ hoặc dược sĩ chuyên môn trước khi sử dụng."}</p>
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-600" /> Tác dụng phụ cần lưu ý
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{med.tac_dung_phu || "Chưa ghi nhận tác dụng phụ đáng kể. Ngưng thuốc nếu xuất hiện dị ứng."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer - Luôn hiển thị nút Add to Cart ở đáy modal */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đơn giá</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-[#0057cd]">
                  {(med.price || 0).toLocaleString()}₫
                </span>
                <span className="text-xs font-semibold text-slate-500">/ {med.unit || "Hộp"}</span>
              </div>
            </div>

            {/* Stepper số lượng */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner">
              <button 
                type="button"
                onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-white transition-all cursor-pointer disabled:opacity-40"
                disabled={isOutOfStock}
              >
                -
              </button>
              <span className="w-8 text-center font-black text-slate-800 text-xs sm:text-sm">{modalQuantity}</span>
              <button 
                type="button"
                onClick={() => setModalQuantity(q => Math.min(med.stock || 999, q + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-white transition-all cursor-pointer disabled:opacity-40"
                disabled={isOutOfStock || modalQuantity >= (med.stock || 999)}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowBarcodeModal(true)}
              className="px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-all cursor-pointer whitespace-nowrap"
            >
              <Tag size={13} className="text-emerald-600" /> In Tem
            </button>

            <button 
              type="button"
              onClick={() => onAddToCart(med, modalQuantity)}
              disabled={isOutOfStock}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                isOutOfStock 
                  ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                  : addedItems[medId] 
                    ? "bg-emerald-500 text-white shadow-emerald-200" 
                    : "bg-[#0057cd] hover:bg-[#0047a5] text-white cursor-pointer shadow-blue-200"
              }`}
            >
              {isOutOfStock ? (
                "Tạm hết hàng"
              ) : addedItems[medId] ? (
                <>
                  <Check size={16} /> Đã thêm vào giỏ!
                </>
              ) : (
                <>
                  <ShoppingCart size={16} /> Thêm vào giỏ hàng
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <BarcodeLabelModal 
        isOpen={showBarcodeModal} 
        onClose={() => setShowBarcodeModal(false)} 
        medicine={med} 
      />
    </div>
  );
}
