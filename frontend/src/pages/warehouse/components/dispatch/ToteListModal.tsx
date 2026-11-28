import React from "react";
import { Box, QrCode, X } from "lucide-react";
import { ToteItem } from "../../../../services/inventory/dispatchOrder.service";
import { QrPreviewData } from "./QrZoomModal";

interface ToteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  totes: ToteItem[];
  onOpenQr: (qr: QrPreviewData) => void;
}

/**
 * Modal hiển thị danh sách giỏ Tote nhặt hàng và nút in/xem mã QR
 */
export const ToteListModal: React.FC<ToteListModalProps> = ({
  isOpen,
  onClose,
  totes,
  onOpenQr,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Quản Lý Giỏ Tote Nhặt Hàng ({totes.length} giỏ)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {totes.map((t) => (
              <div
                key={t._id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono font-black text-sm text-slate-800">
                    {t.toteCode}
                  </div>
                  <div className="text-[11px] text-slate-500">{t.name || "Giỏ nhặt"}</div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      t.status === "AVAILABLE"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : t.status === "IN_USE"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-slate-100 text-slate-600 border-slate-300"
                    }`}
                  >
                    {t.status === "AVAILABLE"
                      ? "Sẵn sàng"
                      : t.status === "IN_USE"
                      ? "Đang chứa hàng"
                      : "Bảo trì"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenQr({
                      code: t.barcode || t.toteCode,
                      title: `Mã QR Giỏ Tote: ${t.toteCode}`,
                      subtitle: "Dán nhãn lên thân giỏ nhựa để nhân viên quét khi bắt đầu nhặt",
                    })
                  }
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-sky-50 text-sky-700 shadow-xs cursor-pointer flex items-center gap-1 text-xs font-bold"
                >
                  <QrCode size={14} />
                  <span>Xem QR</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

