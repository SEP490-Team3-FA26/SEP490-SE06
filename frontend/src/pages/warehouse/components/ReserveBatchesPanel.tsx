import React, { useState } from "react";
import { Archive, AlertCircle, Calendar, Search, ShieldAlert, ArrowRight, X, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { ReserveBatch, inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface ReserveBatchesPanelProps {
  batches: ReserveBatch[];
  loading: boolean;
  onRefresh: () => void;
  onSelectBatch?: (batch: ReserveBatch) => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon?: React.ReactNode }> = {
  EXPIRED: { label: "Hết hạn", bg: "bg-red-900/40", text: "text-red-300", border: "border-red-500/40", icon: <AlertTriangle size={11} /> },
  NEAR_EXPIRY: { label: "Cận date", bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-500/40", icon: <Clock size={11} /> },
  NORMAL: { label: "An toàn", bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/40", icon: <CheckCircle size={11} /> },
};

export function ReserveBatchesPanel({
  batches,
  loading,
  onRefresh,
  onSelectBatch,
  onClose,
}: ReserveBatchesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [quarantiningId, setQuarantiningId] = useState<string | null>(null);

  const filteredBatches = batches.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.medicineName?.toLowerCase().includes(q) ||
      b.batchNo?.toLowerCase().includes(q)
    );
  });

  const handleQuarantine = async (batchId: string) => {
    if (!window.confirm("Khóa lô này và chuyển sang trạng thái cách ly (không xuất bán)?")) return;
    try {
      setQuarantiningId(batchId);
      await inventoryMapService.quarantineBatch(batchId, "Khóa từ Khu Kệ Dự Trữ");
      alert("Đã gửi yêu cầu cách ly lô thuốc.");
      onRefresh();
    } catch (e: any) {
      alert(e.message || "Lỗi khóa lô");
    } finally {
      setQuarantiningId(null);
    }
  };

  const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
  const nearExpiryCount = batches.filter((b) => b.status === "NEAR_EXPIRY" || b.status === "EXPIRED").length;

  return (
    <div className="bg-slate-900/95 border-t border-amber-500/40 text-slate-100 flex flex-col max-h-80 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 bg-amber-950/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Archive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-300">
                Khu Kệ Dự Trữ — Nguyên Tắc FEFO
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                Ưu tiên xuất trước
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Lô cũ của các loại thuốc đã nhập lô mới. Tự động chuyển về đây để tránh chèn ép thùng chính.
            </p>
          </div>
        </div>

        {/* Stats & Search & Close */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
              Tổng: <b className="text-amber-400 font-mono">{batches.length}</b> lô ({totalStock.toLocaleString("vi-VN")} đơn vị)
            </div>
            {nearExpiryCount > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-700/50 text-orange-300">
                ⚠️ <b className="font-mono">{nearExpiryCount}</b> cận date/hết hạn
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm thuốc, mã lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-44"
            />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Đóng bảng dự trữ"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* List / Table */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Đang tải danh sách lô dự trữ...
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center">
            <Archive size={28} className="opacity-30 mb-2 text-amber-400" />
            <span>Khu Dự Trữ hiện tại không có lô hàng nào. Toàn bộ thuốc đều đang ở thùng chính.</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Dược phẩm</th>
                  <th className="px-3 py-2">Số lô</th>
                  <th className="px-3 py-2 text-right">Số lượng tồn</th>
                  <th className="px-3 py-2">Hạn sử dụng (FEFO)</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBatches.map((b) => {
                  const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.NORMAL;
                  return (
                    <tr key={b._id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2 font-semibold text-slate-100">
                        {b.medicineName}
                      </td>
                      <td className="px-3 py-2 font-mono text-amber-400 font-bold">
                        {b.batchNo}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-white font-mono">
                        {b.stock?.toLocaleString("vi-VN")}{" "}
                        <span className="font-normal text-slate-400 text-[10px]">{b.unit || "Hộp"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span className="text-slate-200">
                            {b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "—"}
                          </span>
                          {b.daysToExpiry != null && (
                            <span className={`text-[10px] font-mono ${b.daysToExpiry <= 90 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                              ({b.daysToExpiry}d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onSelectBatch && (
                            <button
                              onClick={() => onSelectBatch(b)}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                            >
                              <span>Xem Thùng</span>
                              <ArrowRight size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => handleQuarantine(b._id)}
                            disabled={quarantiningId === b._id}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-700 text-[11px] transition"
                            title="Khóa lô (Cách ly)"
                          >
                            {quarantiningId === b._id ? "..." : "Khóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
