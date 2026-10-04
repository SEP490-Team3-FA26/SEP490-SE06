import React, { useState } from "react";
import { Archive, AlertTriangle, Clock, CheckCircle, ShieldAlert, ArrowRight, X, Calendar, Search, Loader2 } from "lucide-react";
import { ReserveBatch, inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface ReserveBatchesPanelProps {
  batches: ReserveBatch[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectBatch?: (batch: ReserveBatch) => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  NORMAL: {
    label: "Bình thường",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <CheckCircle size={10} />,
  },
  NEAR_EXPIRY: {
    label: "Cận date",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <Clock size={10} />,
  },
  EXPIRED: {
    label: "Hết hạn",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: <AlertTriangle size={10} />,
  },
};

export function ReserveBatchesPanel({
  batches,
  loading = false,
  onRefresh,
  onSelectBatch,
  onClose,
}: ReserveBatchesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [quarantiningId, setQuarantiningId] = useState<string | null>(null);

  const handleQuarantine = async (batchId: string) => {
    if (!window.confirm("Khóa (cách ly) lô dự trữ này?")) return;
    try {
      setQuarantiningId(batchId);
      await inventoryMapService.quarantineBatch(batchId, "Khóa từ Khu Dự Trữ (hết hạn / cận date)");
      alert("Đã gửi yêu cầu khóa lô.");
      setTimeout(() => {
        if (onRefresh) onRefresh();
      }, 800);
    } catch (e: any) {
      alert(e.message || "Lỗi khóa lô");
    } finally {
      setQuarantiningId(null);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.medicineName?.toLowerCase().includes(q) ||
      b.batchNo?.toLowerCase().includes(q)
    );
  });

  const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
  const nearExpiryCount = batches.filter((b) => b.status === "NEAR_EXPIRY" || b.status === "EXPIRED").length;

  return (
    <div className="bg-white border-t-2 border-amber-400 text-slate-800 flex flex-col max-h-80 shadow-2xl">
      {/* Header */}
      <div className="px-6 py-3 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
            <Archive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900">
                Khu Kệ Dự Trữ — Nguyên Tắc FEFO
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Ưu tiên xuất trước
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Lô cũ của các loại thuốc đã nhập lô mới. Tự động chuyển về đây để tránh chèn ép thùng chính.
            </p>
          </div>
        </div>

        {/* Stats & Search & Close */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-700">
              Tổng: <b className="text-amber-700 font-mono">{batches.length}</b> lô ({totalStock.toLocaleString("vi-VN")} đơn vị)
            </div>
            {nearExpiryCount > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
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
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-44"
            />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Đóng bảng dự trữ"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* List / Table */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-50/50">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-amber-500" /> Đang tải danh sách lô dự trữ...
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center">
            <Archive size={28} className="opacity-30 mb-2 text-amber-500" />
            <span>Khu Dự Trữ hiện tại không có lô hàng nào. Toàn bộ thuốc đều đang ở thùng chính.</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Dược phẩm</th>
                  <th className="px-4 py-2.5">Số lô</th>
                  <th className="px-4 py-2.5 text-right">Số lượng tồn</th>
                  <th className="px-4 py-2.5">Hạn sử dụng (FEFO)</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((b) => {
                  const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.NORMAL;
                  return (
                    <tr key={b._id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {b.medicineName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sky-700 font-bold">
                        {b.batchNo}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800 font-mono">
                        {b.stock?.toLocaleString("vi-VN")}{" "}
                        <span className="font-normal text-slate-500 text-[10px]">{b.unit || "Hộp"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar size={11} className="text-slate-400" />
                          <span>
                            {b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "—"}
                          </span>
                          {b.daysToExpiry != null && (
                            <span className={`text-[10px] font-mono font-bold ${b.daysToExpiry <= 90 ? "text-amber-600" : "text-slate-400"}`}>
                              ({b.daysToExpiry}d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onSelectBatch && (
                            <button
                              onClick={() => onSelectBatch(b)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <span>Xem Thùng</span>
                              <ArrowRight size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => handleQuarantine(b._id)}
                            disabled={quarantiningId === b._id}
                            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs transition font-medium"
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
