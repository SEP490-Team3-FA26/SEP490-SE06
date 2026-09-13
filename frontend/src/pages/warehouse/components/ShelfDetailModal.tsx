import React, { useState, useEffect } from "react";
import { X, Loader2, Package, Calendar, AlertTriangle, Clock, CheckCircle, MapPin } from "lucide-react";
import { inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface ShelfDetailModalProps {
  zone: string;
  rack: string;
  shelf: number;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon?: React.ReactNode }> = {
  OUT_OF_STOCK: { label: "Hết hàng", bg: "bg-slate-800/60", text: "text-slate-400", border: "border-slate-600/50" },
  EXPIRED: { label: "Hết hạn", bg: "bg-red-900/40", text: "text-red-300", border: "border-red-500/40", icon: <AlertTriangle size={11} /> },
  NEAR_EXPIRY: { label: "Cận date", bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-500/40", icon: <Clock size={11} /> },
  LOW_STOCK: { label: "Sắp hết hàng", bg: "bg-yellow-900/40", text: "text-yellow-300", border: "border-yellow-500/40", icon: <AlertTriangle size={11} /> },
  NORMAL: { label: "An toàn", bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/40", icon: <CheckCircle size={11} /> },
  ACTIVE: { label: "An toàn", bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/40", icon: <CheckCircle size={11} /> },
};

export function ShelfDetailModal({ zone, rack, shelf, onClose }: ShelfDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    inventoryMapService.getShelfDetail(zone, rack, shelf)
      .then(res => setData(res?.data || res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [zone, rack, shelf]);

  const totalBatches = data.length;
  const totalStock = data.reduce((sum, item) => sum + item.stock, 0);
  const alerts = data.filter(d => ["EXPIRED", "NEAR_EXPIRY"].includes(d.status)).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chi tiết Kệ {rack} — Tầng {shelf}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] flex items-center gap-1 text-slate-400">
                  <MapPin size={11} /> Khu {zone} · Kệ {rack} · Tầng {shelf}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {alerts > 0 && (
              <span className="text-xs px-2 py-1 bg-amber-900/40 border border-amber-500/40 text-amber-300 rounded-lg flex items-center gap-1">
                <AlertTriangle size={12} /> {alerts} lô cần chú ý
              </span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400"><Package size={14} /></div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Số lô</div>
                <div className="text-sm font-bold text-slate-100">{totalBatches} lô</div>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle size={14} /></div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Tổng tồn kho</div>
                <div className="text-sm font-bold text-emerald-300">{totalStock.toLocaleString("vi-VN")}</div>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><AlertTriangle size={14} /></div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Cảnh báo</div>
                <div className="text-sm font-bold text-amber-300">{alerts} lô</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="animate-spin mb-3 text-sky-400" size={28} />
              <p className="text-sm">Đang tải dữ liệu lô hàng...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Package size={40} className="mb-3 opacity-30" />
              <p className="font-medium text-slate-400">Tầng kệ này đang trống</p>
              <p className="text-xs mt-1 text-slate-600">Chưa có lô hàng nào được xếp tại đây</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider bg-slate-800/60 text-slate-400 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Tên thuốc</th>
                  <th className="px-4 py-3">Mã lô</th>
                  <th className="px-4 py-3 text-right">Số lượng</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3">Hạn sử dụng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.map((item, idx) => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.NORMAL;
                  const isAlert = ["EXPIRED", "NEAR_EXPIRY"].includes(item.status);
                  return (
                    <tr key={idx} className={`transition-colors hover:bg-slate-800/30 ${isAlert ? "bg-red-950/10" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-100 text-xs">{item.medicineName}</span>
                        {item.category && <span className="block text-[10px] text-slate-500 mt-0.5">{item.category}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-sky-400">{item.batchNo}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-100 tabular-nums">
                        {item.stock.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{item.unit || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar size={12} className="text-slate-500" />
                          <span className={isAlert ? "text-red-300 font-semibold" : "text-slate-300"}>{item.expDate}</span>
                          {item.daysUntilExpiry != null && item.daysUntilExpiry <= 90 && item.daysUntilExpiry >= 0 && (
                            <span className="text-[10px] text-orange-400">({item.daysUntilExpiry}d)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && data.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={12} /> Khu {zone} — Kệ {rack} — Tầng {shelf}
            </span>
            <span className="text-xs text-slate-400">
              Tổng tồn: <span className="text-emerald-400 font-bold">{totalStock.toLocaleString("vi-VN")}</span> đơn vị trên {totalBatches} lô
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
