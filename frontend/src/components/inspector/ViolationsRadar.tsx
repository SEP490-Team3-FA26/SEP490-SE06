// Component Radar Giám Sát Cảnh Báo Vi Phạm Y Tế (Luật Dược & QĐ 232)
import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { NationalTransaction } from "./types";

interface ViolationsRadarProps {
  violations: NationalTransaction[];
  onInspectJson: (txn: NationalTransaction) => void;
}

export const ViolationsRadar: React.FC<ViolationsRadarProps> = ({
  violations,
  onInspectJson,
}) => {
  return (
    <div className="p-6 space-y-4">
      {/* Banner cảnh báo */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
        <AlertCircle className="w-8 h-8 text-rose-600 shrink-0" />
        <div>
          <h4 className="text-xs font-black text-rose-900 uppercase">
            Danh Sách Giao Dịch Bị Từ Chối Do Vi Phạm Quy Chuẩn Y Tế (Luật Dược &amp; QĐ 232)
          </h4>
          <p className="text-xs text-rose-700 mt-0.5">
            Cơ sở có hành vi xuất bán lẻ thuốc đã quá hạn sử dụng hoặc không hợp lệ số lô sẽ bị hệ thống tự động khóa và gửi thông báo kiểm tra đột xuất.
          </p>
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-bold text-slate-700">Tất cả các cơ sở trong chuỗi đều tuân thủ nghiêm ngặt!</p>
          <p className="text-xs text-slate-400 mt-1">Không có hành vi xuất bán thuốc quá hạn hay vi phạm số lô nào được ghi nhận.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
          {violations.map((v) => (
            <div key={v.transaction_id} className="p-4 flex items-start justify-between gap-4 hover:bg-rose-50/30 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-600 text-xs">{v.transaction_id}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
                    VI PHẠM Y TẾ
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Cơ sở: {v.facility_code}</span>
                </div>
                <p className="text-xs font-bold text-rose-900">{v.violation_reason || "Xuất bán thuốc quá hạn sử dụng"}</p>
                <p className="text-[11px] text-slate-500 font-mono">Số chứng từ gốc: {v.reference_number}</p>
              </div>
              <button
                onClick={() => onInspectJson(v)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                Soi Gói Tin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
