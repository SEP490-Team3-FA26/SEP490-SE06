import React, { useState, useEffect } from "react";
import { X, Loader2, Package, Calendar, AlertTriangle, Clock, CheckCircle, MapPin, ShieldAlert, Archive, AlertCircle } from "lucide-react";
import { inventoryMapService, BinDetailResponse } from "../../../services/inventory/inventoryMap.service";

interface ShelfDetailModalProps {
  zone: string;
  rack: string;
  shelf: number;
  bin?: number | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon?: React.ReactNode }> = {
  OUT_OF_STOCK: { label: "Hết hàng", bg: "bg-slate-800/60", text: "text-slate-400", border: "border-slate-600/50" },
  EXPIRED: { label: "Hết hạn", bg: "bg-red-900/40", text: "text-red-300", border: "border-red-500/40", icon: <AlertTriangle size={11} /> },
  NEAR_EXPIRY: { label: "Cận date", bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-500/40", icon: <Clock size={11} /> },
  LOW_STOCK: { label: "Sắp hết hàng", bg: "bg-yellow-900/40", text: "text-yellow-300", border: "border-yellow-500/40", icon: <AlertTriangle size={11} /> },
  NORMAL: { label: "An toàn", bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/40", icon: <CheckCircle size={11} /> },
  ACTIVE: { label: "An toàn", bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/40", icon: <CheckCircle size={11} /> },
  QUARANTINED: { label: "Đã khóa (Cách ly)", bg: "bg-purple-900/40", text: "text-purple-300", border: "border-purple-500/40", icon: <ShieldAlert size={11} /> },
};

export function ShelfDetailModal({ zone, rack, shelf, bin, onClose, onRefresh }: ShelfDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [quarantining, setQuarantining] = useState<string | null>(null);

  // For Shelf-level view (when bin is null/undefined)
  const [shelfData, setShelfData] = useState<any[]>([]);

  // For Bin-level view (when bin is selected)
  const [binData, setBinData] = useState<BinDetailResponse | null>(null);

  const isBinMode = bin != null && bin > 0;

  const loadData = () => {
    setLoading(true);
    if (isBinMode) {
      inventoryMapService.getBinDetail(zone, rack, shelf, bin as number)
        .then(res => setBinData(res?.data || res || null))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      inventoryMapService.getShelfDetail(zone, rack, shelf)
        .then(res => setShelfData(res?.data || res || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [zone, rack, shelf, bin]);

  const handleQuarantine = async (batchId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn khóa (cách ly) lô thuốc này không? Lô sẽ không được phép xuất bán.")) return;
    try {
      setQuarantining(batchId);
      await inventoryMapService.quarantineBatch(batchId, "Khóa thủ công từ sơ đồ kho (cận date / hết hạn)");
      alert("Đã gửi yêu cầu cách ly lô thuốc.");
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Lỗi khi khóa lô");
    } finally {
      setQuarantining(null);
    }
  };

  // Bin Mode stats
  const unit = binData?.location?.unit || binData?.medicine?.unit || "Hộp";
  const medicineName = binData?.location?.medicineName || binData?.medicine?.name;
  const maxCap = binData?.maxCapacity || binData?.location?.maxCapacity || 200;
  const totalMainStock = binData?.totalMainStock ?? (binData?.mainBatches || []).reduce((s: number, b: any) => s + (b.stock || 0), 0);
  const percentCap = maxCap > 0 ? Math.min(100, Math.round((totalMainStock / maxCap) * 100)) : 0;
  const reserveBatches = binData?.reserveBatches || [];
  const mainBatches = binData?.mainBatches || [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {isBinMode 
                    ? `Thùng ${bin} — ${medicineName || "Chưa gán thuốc"}` 
                    : `Chi tiết Kệ ${rack} — Tầng ${shelf}`}
                </h2>
                {isBinMode && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-sky-950 text-sky-300 border border-sky-700/50">
                    B{bin}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <MapPin size={12} className="text-sky-400" />
                <span>Khu {zone} · Kệ {rack} · Tầng {shelf} {isBinMode ? `· Thùng ${bin}` : ""}</span>
                {medicineName && <span className="text-slate-500">• Đơn vị: <b className="text-slate-300">{unit}</b></span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Bin Mode: Sức chứa + Thông tin thuốc */}
        {isBinMode && !loading && (
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Sức chứa hiện tại:</span>
                <span className="font-bold font-mono text-slate-200">
                  {totalMainStock} / {maxCap} {unit} ({percentCap}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-300 ${percentCap > 90 ? 'bg-amber-500' : percentCap < 20 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percentCap}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Lô đang bán: <b>{mainBatches.length}</b></span>
              </div>
              {reserveBatches.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-300 animate-pulse">
                  <Archive size={13} className="text-amber-400" />
                  <span>Khu Dự Trữ (Lấy trước): <b>{reserveBatches.length}</b></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-5 space-y-6 bg-slate-950/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="animate-spin mb-3 text-sky-400" size={32} />
              <p className="text-sm">Đang tải dữ liệu chi tiết...</p>
            </div>
          ) : isBinMode ? (
            /* BIN VIEW */
            <>
              {/* CẢNH BÁO KHU DỰ TRỮ (NẾU CÓ) - NGUYÊN TẮC FEFO */}
              {reserveBatches.length > 0 && (
                <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                        🟠 LÔ DỰ TRỮ CŨ — CẦN ƯU TIÊN XUẤT TRƯỚC (NGUYÊN TẮC FEFO)
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                          First Expired First Out
                        </span>
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                        Thuốc này đã nhập lô mới vào thùng chính. Các lô cũ dưới đây đã được hệ thống tự động dời sang <b>Khu Dự Trữ</b>. Thủ kho vui lòng <b>xuất các lô này trước</b> khi xuất lô trong thùng chính!
                      </p>

                      <div className="mt-3 overflow-hidden rounded-lg border border-amber-500/30 bg-slate-900/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-amber-950/60 text-amber-300 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-3 py-2">Mã lô</th>
                              <th className="px-3 py-2 text-right">Số lượng tồn</th>
                              <th className="px-3 py-2">Hạn sử dụng</th>
                              <th className="px-3 py-2">Trạng thái</th>
                              <th className="px-3 py-2 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-900/30">
                            {reserveBatches.map((rb: any) => {
                              const sc = STATUS_CONFIG[rb.status] || STATUS_CONFIG.NORMAL;
                              return (
                                <tr key={rb._id || rb.batchNo} className="hover:bg-amber-900/20">
                                  <td className="px-3 py-2 font-mono font-bold text-amber-300">{rb.batchNo}</td>
                                  <td className="px-3 py-2 text-right font-bold text-white tabular-nums">
                                    {rb.stock} <span className="font-normal text-slate-400">{unit}</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={11} className="text-slate-400" />
                                      <span className="text-amber-200">{rb.expDate ? new Date(rb.expDate).toLocaleDateString("vi-VN") : "—"}</span>
                                      {rb.daysToExpiry != null && (
                                        <span className="text-[10px] text-amber-400 font-mono">({rb.daysToExpiry}d)</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                      {sc.icon} {sc.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => handleQuarantine(rb._id)}
                                      disabled={quarantining === rb._id}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-700 text-[10px] transition"
                                      title="Khóa cách ly nếu hỏng/hết hạn"
                                    >
                                      {quarantining === rb._id ? "Đang khóa..." : "Khóa Lô"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LÔ ĐANG BÁN TRONG THÙNG CHÍNH */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                    🟢 LÔ ĐANG BÁN TRONG THÙNG CHÍNH (MAIN)
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    Tổng: <b className="text-white">{totalMainStock}</b> {unit}
                  </span>
                </div>

                {mainBatches.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-500">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Thùng này hiện tại không có lô hàng đang bán nào còn tồn.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Mã lô</th>
                          <th className="px-4 py-2.5 text-right">Số lượng</th>
                          <th className="px-4 py-2.5">Đơn vị</th>
                          <th className="px-4 py-2.5">Hạn sử dụng</th>
                          <th className="px-4 py-2.5">Trạng thái</th>
                          <th className="px-4 py-2.5 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {mainBatches.map((mb: any) => {
                          const sc = STATUS_CONFIG[mb.status] || STATUS_CONFIG.NORMAL;
                          return (
                            <tr key={mb._id || mb.batchNo} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-mono font-bold text-sky-400">{mb.batchNo}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-100 tabular-nums text-sm">
                                {mb.stock?.toLocaleString("vi-VN")}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{unit}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-500" />
                                  <span className="text-slate-200">
                                    {mb.expDate ? new Date(mb.expDate).toLocaleDateString("vi-VN") : "—"}
                                  </span>
                                  {mb.daysToExpiry != null && (
                                    <span className={`text-[10px] ${mb.daysToExpiry <= 90 ? 'text-amber-400' : 'text-slate-500'}`}>
                                      ({mb.daysToExpiry}d)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                  {sc.icon} {sc.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleQuarantine(mb._id)}
                                  disabled={quarantining === mb._id || mb.status === 'QUARANTINED'}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-700 text-xs transition disabled:opacity-50"
                                  title="Khóa lô (Cách ly không xuất bán)"
                                >
                                  {quarantining === mb._id ? "Đang khóa..." : mb.status === 'QUARANTINED' ? "Đã khóa" : "Khóa Lô"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SHELF VIEW (ALL BINS ON THIS SHELF) */
            shelfData.length === 0 ? (
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
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shelfData.map((item, idx) => {
                    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.NORMAL;
                    const isAlert = ["EXPIRED", "NEAR_EXPIRY"].includes(item.status);
                    return (
                      <tr key={idx} className={`transition-colors hover:bg-slate-800/30 ${isAlert ? "bg-red-950/10" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.bin != null && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/50 shrink-0" title={`Thùng ${item.bin}`}>
                                B{item.bin}
                              </span>
                            )}
                            <div>
                              <span className="font-semibold text-slate-100 text-xs">{item.medicineName}</span>
                              {item.category && <span className="block text-[10px] text-slate-500 mt-0.5">{item.category}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-sky-400">{item.batchNo}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-100 tabular-nums">
                          {item.stock.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{item.unit || "Hộp"}</td>
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
                        <td className="px-4 py-3 text-right">
                          {(item._id || item.id || item.batchId) && (
                            <button
                              onClick={() => handleQuarantine(item._id || item.id || item.batchId)}
                              disabled={quarantining === (item._id || item.id || item.batchId) || item.status === 'QUARANTINED'}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-700 text-xs transition"
                            >
                              Khóa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center shrink-0 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin size={13} className="text-sky-400" />
            Khu {zone} — Kệ {rack} — Tầng {shelf} {isBinMode ? `— Thùng ${bin}` : ""}
          </span>
          <span className="text-slate-400">
            {isBinMode ? (
              <span>Tổng tồn thùng chính: <b className="text-emerald-400">{totalMainStock}</b> {unit}</span>
            ) : (
              <span>Tổng: <b className="text-emerald-400">{shelfData.reduce((s, i) => s + (i.stock || 0), 0).toLocaleString("vi-VN")}</b> đơn vị</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
