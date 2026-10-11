// Component Banner Tiêu Đề Giám Sát CSDL Dược Quốc Gia
import React from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";

interface InspectorHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({ loading, onRefresh }) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-[#0d2a4a] to-[#0057cd] text-white rounded-3xl p-6 shadow-md border border-slate-700/40 relative overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldCheck className="w-9 h-9 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-widest uppercase text-emerald-300 flex items-center gap-2">
              HỆ THỐNG QUẢN LÝ DƯỢC WDP301 — GIÁM SÁT LIÊN THÔNG TOÀN CHUỖI
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                CSDL DƯỢC QUỐC GIA
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              BẢNG ĐIỀU KHIỂN GIÁM SÁT &amp; ĐỒNG BỘ DƯỢC QUỐC GIA
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Theo dõi và quản lý dữ liệu nhập GDP Kho Tổng, chuyển kho, bán lẻ &amp; kiểm kê liên thông theo Quyết định số 232/QĐ-TTYQG &amp; Thông tư 11/2025/TT-BYT.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu từ chuỗi"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={`text-[#0057cd] ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
