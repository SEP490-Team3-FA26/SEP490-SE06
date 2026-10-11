// Component Modal Soi Chi Tiết Gói Tin JSON Chuẩn Quyết Định 232/QĐ-TTYQG
import React from "react";
import { Copy } from "lucide-react";
import { NationalTransaction } from "./types";

interface TransactionJsonModalProps {
  isOpen: boolean;
  transaction: NationalTransaction | null;
  onClose: () => void;
  onCopyJson: (jsonStr: string) => void;
}

export const TransactionJsonModal: React.FC<TransactionJsonModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onCopyJson,
}) => {
  if (!isOpen || !transaction) return null;

  const jsonString = JSON.stringify(transaction, null, 2);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">
              Gói Tin Giao Dịch Quốc Gia #{transaction.transaction_id}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuẩn định dạng Quyết định 232/QĐ-TTYQG gửi tới Cục Quản Lý Dược (Bộ Y Tế)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold cursor-pointer transition"
            aria-label="Đóng modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body: Monospace JSON */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs bg-slate-900 text-emerald-400">
          <pre className="whitespace-pre-wrap">{jsonString}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <button
            onClick={() => onCopyJson(jsonString)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <Copy size={13} />
            <span>Sao chép JSON</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
