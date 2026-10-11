// Component 4 Thẻ Chỉ Số Đo Lường Giám Sát Y Tế
import React from "react";
import { Warehouse, Boxes, CheckCircle2, AlertTriangle } from "lucide-react";
import { InspectorMetricsData } from "./types";

interface InspectorMetricsProps {
  metrics: InspectorMetricsData;
}

export const InspectorMetrics: React.FC<InspectorMetricsProps> = ({ metrics }) => {
  const { facilitiesCount, totalTransactions, hqCount, branchCount, complianceRate, violationsCount } = metrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric Card 1: Cơ Sở Được Cấp Phép */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cơ Sở Được Cấp Phép</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{facilitiesCount || 5}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>1 Kho Tổng GSP + 4 Chi nhánh GPP</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold text-xl">
          <Warehouse size={24} />
        </div>
      </div>

      {/* Metric Card 2: Giao Dịch Đã Ghi Sổ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giao Dịch Đã Ghi Sổ</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono tabular-nums">{totalTransactions}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">
            Kho Tổng ({hqCount}) • Chi nhánh ({branchCount})
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
          <Boxes size={24} />
        </div>
      </div>

      {/* Metric Card 3: Tỷ Lệ Tuân Thủ GSP/GPP */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Tuân Thủ GSP/GPP</div>
          <div className="text-2xl font-black text-[#0057cd] mt-1 font-mono tabular-nums">
            {complianceRate}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">Chuẩn Thông tư 11/2025/TT-BYT</div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
          <CheckCircle2 size={24} />
        </div>
      </div>

      {/* Metric Card 4: Radar Cảnh Báo Vi Phạm */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cảnh Báo Vi Phạm</div>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono tabular-nums">{violationsCount}</div>
          <div className="text-xs text-rose-500 font-semibold mt-0.5">Xuất bán quá hạn / Sai lô</div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl">
          <AlertTriangle size={24} />
        </div>
      </div>
    </div>
  );
};
