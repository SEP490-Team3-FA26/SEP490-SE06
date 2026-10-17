import React, { useState, useEffect } from "react";
import {
  X, Loader2, Package, Calendar, AlertTriangle,
  Clock, CheckCircle, MapPin, ShieldAlert, Archive,
  AlertCircle, ArrowLeftRight, ChevronDown, Trash2
} from "lucide-react";
import { inventoryMapService, BinDetailResponse } from "../../../services/inventory/inventoryMap.service";
import { RelocateBinModal } from "./RelocateBinModal";

interface ShelfDetailModalProps {
  zone: string;
  rack: string;
  shelf: number;
  bin?: number | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon?: React.ReactNode }> = {
  OUT_OF_STOCK: { label: "Hết hàng", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
  EXPIRED: { label: "Hết hạn", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300 font-bold", icon: <AlertTriangle size={11} className="text-rose-600" /> },
  NEAR_EXPIRY: { label: "Cận date", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300 font-bold", icon: <Clock size={11} className="text-amber-600" /> },
  LOW_STOCK: { label: "Sắp hết hàng", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: <AlertTriangle size={11} /> },
  NORMAL: { label: "An toàn", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle size={11} /> },
  ACTIVE: { label: "An toàn", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle size={11} /> },
  QUARANTINED: { label: "Đã khóa (Cách ly)", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: <ShieldAlert size={11} /> },
};

export function ShelfDetailModal({ zone, rack, shelf, bin, onClose, onRefresh }: ShelfDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [quarantining, setQuarantining] = useState<string | null>(null);

  // Toast thông báo chuyên nghiệp
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // State quản lý Modal Xuất Hủy cho lô hết hạn
  const [disposeModal, setDisposeModal] = useState<{
    isOpen: boolean;
    batch: any | null;
    quantity: number;
    notes: string;
  }>({
    isOpen: false,
    batch: null,
    quantity: 0,
    notes: "Thuốc hết hạn sử dụng, xuất hủy theo quy chuẩn GSP/GDP",
  });
  const [disposing, setDisposing] = useState(false);

  // Quản lý dropdown mã lô đang mở theo ID của ô thùng
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);

  // Dành cho chế độ xem theo Tầng Kệ (khi không chọn thùng cụ thể)
  const [shelfData, setShelfData] = useState<any[]>([]);

  // Dành cho chế độ xem theo Thùng (khi có thùng được chọn)
  const [binData, setBinData] = useState<BinDetailResponse | null>(null);

  // State cho Relocate / Gom kho modal
  const [relocateState, setRelocateState] = useState<{
    isOpen: boolean;
    sourceBin: number;
    medicineName?: string;
    currentStock?: number;
    batchId?: string;
    batchNo?: string;
    batches?: any[];
  }>({
    isOpen: false,
    sourceBin: bin || 1,
  });

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
    try {
      setQuarantining(batchId);
      await inventoryMapService.quarantineBatch(batchId, "Khóa thủ công từ sơ đồ kho (cận date / hết hạn)");
      showToast("Đã gửi yêu cầu cách ly/khóa lô thuốc thành công!", "success");
      // Delay 1000ms để Kafka consumer ghi DB xong trước khi re-fetch
      setTimeout(() => {
        loadData();
        if (onRefresh) onRefresh();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi khóa lô", "error");
    } finally {
      setQuarantining(null);
    }
  };

  const handleOpenDispose = (batch: any) => {
    setDisposeModal({
      isOpen: true,
      batch,
      quantity: batch.stock,
      notes: "Thuốc hết hạn sử dụng, xuất hủy theo quy chuẩn GSP/GDP",
    });
  };

  const handleConfirmDispose = async () => {
    if (!disposeModal.batch) return;
    if (disposeModal.quantity <= 0 || disposeModal.quantity > disposeModal.batch.stock) {
      showToast("Số lượng xuất hủy không hợp lệ!", "warning");
      return;
    }
    try {
      setDisposing(true);
      await inventoryMapService.disposeExpiredBatch({
        batchId: disposeModal.batch._id || disposeModal.batch.id,
        quantity: disposeModal.quantity,
        notes: disposeModal.notes,
      });
      showToast(`Đã xuất hủy thành công lô ${disposeModal.batch.batchNo}!`, "success");
      setDisposeModal({ isOpen: false, batch: null, quantity: 0, notes: "" });
      setTimeout(() => {
        loadData();
        if (onRefresh) onRefresh();
      }, 1000);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || "Lỗi khi xuất hủy lô", "error");
    } finally {
      setDisposing(false);
    }
  };

  // Thống kê chế độ Ô Thùng
  const mainBatches = binData?.mainBatches || [];
  const reserveBatches = binData?.reserveBatches || [];
  const firstBatchMedName = mainBatches[0]?.medicineName;
  const firstBatchUnit = mainBatches[0]?.unit;
  const unit = binData?.location?.unit || binData?.medicine?.unit || firstBatchUnit || "Hộp";
  const medicineName = binData?.location?.medicineName || binData?.medicine?.name || firstBatchMedName;
  const maxCap = binData?.maxCapacity || binData?.location?.maxCapacity || 200;
  const totalMainStock = binData?.totalMainStock ?? mainBatches.reduce((s: number, b: any) => s + (b.stock || 0), 0);
  const percentCap = maxCap > 0 ? Math.min(100, Math.round((totalMainStock / maxCap) * 100)) : 0;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Package size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">
                    {isBinMode 
                      ? `Thùng ${bin} ${zone === 'RESERVE' ? '(Khu Dự Trữ)' : ''} — ${medicineName || (zone === 'RESERVE' ? 'Ô trống dự trữ' : 'Chưa gán thuốc')}` 
                      : `Chi tiết Kệ ${rack} — Tầng ${shelf}`}
                  </h2>
                  {isBinMode && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-sky-50 text-sky-700 font-bold border border-sky-200">
                      B{bin}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <MapPin size={12} className="text-sky-500" />
                  <span>Khu {zone === 'RESERVE' ? 'Dự Trữ (RESERVE)' : zone} · Kệ {rack} · Tầng {shelf} {isBinMode ? `· Thùng ${bin}` : ""}</span>
                  {medicineName && <span className="text-slate-400">• Đơn vị: <b className="text-slate-700">{unit}</b></span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Nút Chuyển Ô / Dồn Kho ở Header của Thùng */}
              {isBinMode && medicineName && totalMainStock > 0 && (
                <button
                  onClick={() => setRelocateState({
                    isOpen: true,
                    sourceBin: bin as number,
                    medicineName,
                    currentStock: totalMainStock,
                    batches: mainBatches,
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition border border-amber-600 cursor-pointer"
                  title="Chuyển thuốc hoặc dồn kho sang thùng khác"
                >
                  <ArrowLeftRight size={13} />
                  <span>Chuyển ô / Dồn kho</span>
                </button>
              )}

              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Bin Mode: Sức chứa + Thông tin thuốc */}
          {isBinMode && !loading && (
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Sức chứa hiện tại:</span>
                  <span className="font-bold font-mono text-slate-700">
                    {totalMainStock} / {maxCap} {unit} ({percentCap}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${percentCap > 90 ? 'bg-amber-500' : percentCap < 20 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percentCap}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{zone === 'RESERVE' ? 'Lô dự trữ:' : 'Lô đang bán:'} <b>{mainBatches.length}</b></span>
                </div>
                {reserveBatches.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 animate-pulse">
                    <Archive size={13} className="text-amber-600" />
                    <span>Khu Dự Trữ (Lấy trước): <b>{reserveBatches.length}</b></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6 space-y-6 bg-white custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Loader2 className="animate-spin mb-3 text-sky-500" size={32} />
                <p className="text-xs font-medium text-slate-500">Đang tải dữ liệu chi tiết...</p>
              </div>
            ) : isBinMode ? (
              /* CHẾ ĐỘ XEM Ô THÙNG */
              <>
                {/* CẢNH BÁO KHU DỰ TRỮ (NẾU CÓ) - NGUYÊN TẮC FEFO */}
                {reserveBatches.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                        <AlertCircle size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-900 text-xs flex items-center gap-2">
                          🟠 LÔ DỰ TRỮ CŨ — CẦN ƯU TIÊN XUẤT TRƯỚC (NGUYÊN TẮC FEFO)
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            First Expired First Out
                          </span>
                        </h4>
                        <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                          Thuốc này đã nhập lô mới vào thùng chính. Các lô cũ dưới đây đã được dời sang <b>Khu Dự Trữ</b>. Thủ kho vui lòng <b>xuất các lô này trước</b> khi xuất lô trong thùng chính!
                        </p>

                        <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-amber-50/80 text-amber-900 uppercase tracking-wider text-[10px] font-bold border-b border-amber-200">
                              <tr>
                                <th className="px-3 py-2.5">Mã lô</th>
                                <th className="px-3 py-2.5 text-right">Số lượng tồn</th>
                                <th className="px-3 py-2.5">Hạn sử dụng</th>
                                <th className="px-3 py-2.5">Trạng thái</th>
                                <th className="px-3 py-2.5 text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {reserveBatches.map((rb: any) => {
                                const sc = STATUS_CONFIG[rb.status] || STATUS_CONFIG.NORMAL;
                                return (
                                  <tr key={rb._id || rb.batchNo} className="hover:bg-amber-50/50 transition-colors">
                                    <td className="px-3 py-2.5 font-mono font-bold text-amber-900">{rb.batchNo}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                                      {rb.stock} <span className="font-normal text-slate-500">{unit}</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex items-center gap-1 text-slate-600">
                                        <Calendar size={11} className="text-slate-400" />
                                        <span>{rb.expDate ? new Date(rb.expDate).toLocaleDateString("vi-VN") : "—"}</span>
                                        {rb.daysToExpiry != null && (
                                          <span className="text-[10px] text-amber-600 font-mono font-bold">({rb.daysToExpiry}d)</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                        {sc.icon} {sc.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      <button
                                        onClick={() => handleQuarantine(rb._id)}
                                        disabled={quarantining === rb._id}
                                        className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-[10px] transition font-medium"
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

                {/* LÔ HÀNG TRONG THÙNG */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      {zone === 'RESERVE' ? (
                        <>
                          <Archive size={14} className="text-amber-600" />
                          <span className="text-amber-900 font-bold">Các lô thuốc trong thùng dự trữ (RESERVE)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-emerald-700 font-bold">Lô đang bán trong thùng chính (MAIN)</span>
                        </>
                      )}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Tổng tồn: <b className="text-slate-800 font-bold font-mono">{totalMainStock}</b> {unit}
                    </span>
                  </div>

                  {mainBatches.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-xs font-medium">Thùng này hiện tại không có lô hàng nào còn tồn.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Mã lô</th>
                            <th className="px-4 py-2.5 text-right">Số lượng</th>
                            <th className="px-4 py-2.5">Đơn vị</th>
                            <th className="px-4 py-2.5">Hạn sử dụng</th>
                            <th className="px-4 py-2.5">Trạng thái</th>
                            <th className="px-4 py-2.5 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mainBatches.map((mb: any) => {
                            const isExpired =
                              mb.status === "EXPIRED" ||
                              (mb.daysToExpiry != null && mb.daysToExpiry < 0) ||
                              (mb.expDate ? new Date(mb.expDate) < new Date() : false);
                            const isNearExpiry =
                              !isExpired &&
                              (mb.status === "NEAR_EXPIRY" || (mb.daysToExpiry != null && mb.daysToExpiry <= 90));
                            const sc = isExpired
                              ? STATUS_CONFIG.EXPIRED
                              : isNearExpiry
                              ? STATUS_CONFIG.NEAR_EXPIRY
                              : STATUS_CONFIG[mb.status] || STATUS_CONFIG.NORMAL;

                            return (
                              <tr
                                key={mb._id || mb.batchNo}
                                className={`transition-colors ${
                                  isExpired
                                    ? "bg-rose-50/50 hover:bg-rose-50/80"
                                    : isNearExpiry
                                    ? "bg-amber-50/30 hover:bg-amber-50/60"
                                    : "hover:bg-slate-50/70"
                                }`}
                              >
                                <td className="px-4 py-3 font-mono font-bold text-sky-700">{mb.batchNo}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums text-xs">
                                  {mb.stock?.toLocaleString("vi-VN")}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{unit}</td>
                                <td className="px-4 py-3">
                                  {isExpired ? (
                                    <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                                      <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                      <span>
                                        {mb.expDate ? new Date(mb.expDate).toLocaleDateString("vi-VN") : "—"}
                                      </span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 font-bold">
                                        Quá hạn {mb.overdueDays || Math.abs(mb.daysToExpiry || 0)} ngày
                                      </span>
                                    </div>
                                  ) : isNearExpiry ? (
                                    <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                                      <Clock size={12} className="text-amber-600 shrink-0" />
                                      <span>
                                        {mb.expDate ? new Date(mb.expDate).toLocaleDateString("vi-VN") : "—"}
                                      </span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                                        Cận date ({mb.daysToExpiry}d)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <Calendar size={12} className="text-slate-400 shrink-0" />
                                      <span>
                                        {mb.expDate ? new Date(mb.expDate).toLocaleDateString("vi-VN") : "—"}
                                      </span>
                                      {mb.daysToExpiry != null && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          ({mb.daysToExpiry}d)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                    {sc.icon} {sc.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Nút Xuất Hủy màu đỏ rực rỡ chỉ hiển thị cho lô đã hết hạn */}
                                    {isExpired && (
                                      <button
                                        onClick={() => handleOpenDispose(mb)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs border border-rose-700 cursor-pointer"
                                        title="Xuất hủy lô thuốc đã hết hạn sử dụng (GSP/GDP)"
                                      >
                                        <Trash2 size={11} /> Xuất hủy
                                      </button>
                                    )}

                                    {/* Nút dời riêng 1 lô này sang thùng khác */}
                                    <button
                                      onClick={() => setRelocateState({
                                        isOpen: true,
                                        sourceBin: bin as number,
                                        medicineName: mb.medicineName || medicineName,
                                        currentStock: mb.stock,
                                        batchId: mb._id,
                                        batchNo: mb.batchNo,
                                        batches: mainBatches,
                                      })}
                                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                      title="Dời riêng lô này sang ô khác"
                                    >
                                      <ArrowLeftRight size={11} /> Dời ô
                                    </button>

                                    {/* Nút Khóa Lô */}
                                    <button
                                      onClick={() => handleQuarantine(mb._id)}
                                      disabled={quarantining === mb._id || mb.status === 'QUARANTINED'}
                                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs transition disabled:opacity-50 font-medium cursor-pointer"
                                      title="Khóa lô (Cách ly không xuất bán)"
                                    >
                                      {quarantining === mb._id ? "Đang khóa..." : mb.status === 'QUARANTINED' ? "Đã khóa" : "Khóa"}
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
              </>
            ) : (
              /* CHẾ ĐỘ XEM TẦNG KỆ (TẤT CẢ CÁC Ô THÙNG TRÊN TẦNG) */
              shelfData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Package size={40} className="mb-2 opacity-30 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">Tầng kệ này đang trống</p>
                  <p className="text-xs text-slate-400 mt-0.5">Chưa có lô hàng nào được xếp tại đây</p>
                </div>
              ) : (
                <div className="overflow-visible rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
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
                    <tbody className="divide-y divide-slate-100">
                      {shelfData.map((item, idx) => {
                        const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.NORMAL;
                        const isAlert = ["EXPIRED", "NEAR_EXPIRY"].includes(item.status);
                        const itemDropdownKey = `${item.bin}_${item.medicineId || idx}`;
                        const isOpenDropdown = openDropdownKey === itemDropdownKey;
                        const batchCount = item.batches?.length || item.batchCount || 1;

                        return (
                          <tr key={idx} className={`transition-colors hover:bg-slate-50 ${isAlert ? "bg-rose-50/30" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.bin != null && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0" title={`Thùng ${item.bin}`}>
                                    B{item.bin}
                                  </span>
                                )}
                                <div>
                                  <span className="font-semibold text-slate-800 text-xs">{item.medicineName}</span>
                                  {item.category && <span className="block text-[10px] text-slate-400 mt-0.5">{item.category}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 relative">
                              {/* NÚT DROPDOWN MÃ LÔ KIỂU HÌNH 2 */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownKey(isOpenDropdown ? null : itemDropdownKey);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 shadow-2xs transition cursor-pointer"
                                title="Bấm để xem hạn sử dụng chi tiết từng lô"
                              >
                                <span>{batchCount} Lô</span>
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform duration-200 text-sky-600 ${isOpenDropdown ? "rotate-180" : ""}`}
                                />
                              </button>

                              {/* POPOVER CHI TIẾT CÁC LÔ THEO KIỂU HÌNH 2 */}
                              {isOpenDropdown && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownKey(null);
                                    }}
                                  />

                                  <div
                                    className="absolute left-4 top-full mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 text-left animate-in fade-in zoom-in-95 duration-150"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs font-bold text-slate-800 pb-2.5 mb-2.5 border-b border-slate-100 flex items-center justify-between">
                                      <span className="text-slate-800 font-bold">Hạn sử dụng chi tiết:</span>
                                      {item.bin != null && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                          Thùng B{item.bin}
                                        </span>
                                      )}
                                    </div>

                                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-100">
                                      {(item.batches && item.batches.length > 0 ? item.batches : [{
                                        _id: item._id || item.id,
                                        batchNo: item.representativeBatchNo || item.batchNo,
                                        stock: item.stock,
                                        expDate: item.expDate,
                                        status: item.status,
                                        unit: item.unit
                                      }]).map((b: any, bIdx: number) => {
                                        const expFormatted = b.expDate
                                          ? new Date(b.expDate).toLocaleDateString("vi-VN")
                                          : "—";
                                        const isExp = b.status === "EXPIRED";
                                        const isNear = b.status === "NEAR_EXPIRY";
                                        const statusLabel = isExp
                                          ? "Hết hạn"
                                          : isNear
                                          ? "Cận date"
                                          : b.status === "QUARANTINED"
                                          ? "Cách ly"
                                          : "Hoạt động";
                                        const statusColor = isExp
                                          ? "text-rose-600 font-semibold"
                                          : isNear
                                          ? "text-amber-600 font-semibold"
                                          : b.status === "QUARANTINED"
                                          ? "text-purple-600 font-semibold"
                                          : "text-emerald-500 font-semibold";

                                        return (
                                          <div key={bIdx} className={bIdx > 0 ? "pt-2.5" : ""}>
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-slate-800 text-xs">
                                                Lô: {b.batchNo}
                                              </span>
                                              <span className="font-bold text-slate-800 text-xs tabular-nums">
                                                {b.stock?.toLocaleString("vi-VN")} {item.unit || "Hộp"}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] mt-0.5">
                                              <span className="text-slate-500">Hạn: {expFormatted}</span>
                                              <div className="flex items-center gap-1.5">
                                                <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
                                                {isExp && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setOpenDropdownKey(null);
                                                      handleOpenDispose({
                                                        ...b,
                                                        medicineName: item.medicineName,
                                                        unit: item.unit || "Hộp",
                                                      });
                                                    }}
                                                    className="p-1 rounded-md text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                                    title="Xuất hủy lô thuốc hết hạn"
                                                  >
                                                    <Trash2 size={11} />
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownKey(null);
                                                    setRelocateState({
                                                      isOpen: true,
                                                      sourceBin: item.bin || 1,
                                                      medicineName: item.medicineName,
                                                      currentStock: b.stock,
                                                      batchId: b._id || b.id,
                                                      batchNo: b.batchNo,
                                                      batches: item.batches,
                                                    });
                                                  }}
                                                  className="p-1 rounded-md text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                                                  title="Dời riêng lô này sang ô khác"
                                                >
                                                  <ArrowLeftRight size={11} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                              {item.stock.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{item.unit || "Hộp"}</td>
                            <td className="px-4 py-3">
                              {item.status === "EXPIRED" ? (
                                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                                  <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                                  <span>{item.expDate}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 font-bold">
                                    Hết hạn
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Calendar size={12} className="text-slate-400 shrink-0" />
                                  <span className={item.status === "NEAR_EXPIRY" ? "text-amber-700 font-medium" : ""}>{item.expDate}</span>
                                  {item.daysUntilExpiry != null && item.daysUntilExpiry <= 90 && item.daysUntilExpiry >= 0 && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                      ({item.daysUntilExpiry}d)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                {sc.icon} {sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Nút Xuất hủy nếu ô thùng này hết hạn */}
                                {item.status === "EXPIRED" && (
                                  <button
                                    onClick={() => handleOpenDispose({
                                      _id: item._id || item.id || item.batchId,
                                      batchNo: item.representativeBatchNo || item.batchNo,
                                      stock: item.stock,
                                      unit: item.unit || "Hộp",
                                      expDate: item.expDate,
                                      medicineName: item.medicineName,
                                    })}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs border border-rose-700 cursor-pointer"
                                    title="Xuất hủy lô thuốc đã hết hạn sử dụng (GSP/GDP)"
                                  >
                                    <Trash2 size={11} /> Xuất hủy
                                  </button>
                                )}

                                {/* Nút dời ô trong shelf view: mang theo danh sách batches */}
                                <button
                                  onClick={() => setRelocateState({
                                    isOpen: true,
                                    sourceBin: item.bin || 1,
                                    medicineName: item.medicineName,
                                    currentStock: item.stock,
                                    batchId: item._id || item.id || item.batchId,
                                    batchNo: item.representativeBatchNo || item.batchNo,
                                    batches: item.batches,
                                  })}
                                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                  title="Dời các lô trong thùng sang ô khác"
                                >
                                  <ArrowLeftRight size={11} /> Dời ô
                                </button>

                                {(item._id || item.id || item.batchId) && (
                                  <button
                                    onClick={() => handleQuarantine(item._id || item.id || item.batchId)}
                                    disabled={quarantining === (item._id || item.id || item.batchId) || item.status === 'QUARANTINED'}
                                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs transition font-medium"
                                  >
                                    Khóa
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin size={13} className="text-sky-500" />
              Khu {zone} — Kệ {rack} — Tầng {shelf} {isBinMode ? `— Thùng ${bin}` : ""}
            </span>
            <span className="font-medium">
              {isBinMode ? (
                <span>Tổng tồn thùng chính: <b className="text-slate-800 font-bold font-mono">{totalMainStock}</b> {unit}</span>
              ) : (
                <span>Tổng tồn tầng: <b className="text-slate-800 font-bold font-mono">{shelfData.reduce((s, i) => s + (i.stock || 0), 0).toLocaleString("vi-VN")}</b> đơn vị</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Relocate Bin Modal */}
      {relocateState.isOpen && (
        <RelocateBinModal
          isOpen={relocateState.isOpen}
          onClose={() => setRelocateState((prev) => ({ ...prev, isOpen: false }))}
          sourceLocation={{
            zone,
            rack,
            shelf,
            bin: relocateState.sourceBin,
          }}
          medicineName={relocateState.medicineName}
          currentStock={relocateState.currentStock}
          batchId={relocateState.batchId}
          batchNo={relocateState.batchNo}
          batches={relocateState.batches}
          unit={unit}
          onSuccess={() => {
            loadData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* MODAL XÁC NHẬN XUẤT HỦY LÔ THUỐC HẾT HẠN */}
      {disposeModal.isOpen && disposeModal.batch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setDisposeModal({ isOpen: false, batch: null, quantity: 0, notes: "" })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-rose-100 text-rose-700">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Biên Bản Xuất Hủy Lô Thuốc</h3>
                <p className="text-xs text-rose-600 font-medium">Quy chuẩn Dược GDP/GSP & Thông tư 11/2025</p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-700">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dược phẩm:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {disposeModal.batch.medicineName || medicineName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã số lô:</span>
                  <span className="font-mono font-bold text-rose-700">{disposeModal.batch.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tồn kho hiện tại:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {disposeModal.batch.stock} {disposeModal.batch.unit || unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạn sử dụng:</span>
                  <span className="font-bold text-rose-600">
                    {disposeModal.batch.expDate ? new Date(disposeModal.batch.expDate).toLocaleDateString("vi-VN") : "—"} (ĐÃ HẾT HẠN)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số lượng xuất hủy ({disposeModal.batch.unit || unit}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={disposeModal.batch.stock}
                  value={disposeModal.quantity}
                  onChange={(e) => setDisposeModal((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 border rounded-xl text-slate-800 font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Căn cứ xuất hủy:
                </label>
                <textarea
                  rows={2}
                  value={disposeModal.notes}
                  onChange={(e) => setDisposeModal((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                ⚠️ <b>Lưu ý:</b> Thao tác này sẽ trừ số lượng tồn kho của lô, lập phiếu xuất hủy loại <code>DISPOSE</code> và đồng bộ lên CSDL Dược Quốc gia.
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDisposeModal({ isOpen: false, batch: null, quantity: 0, notes: "" })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={disposing}
                onClick={handleConfirmDispose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition flex items-center gap-1.5 border border-rose-700 cursor-pointer disabled:opacity-50"
              >
                {disposing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang xử lý xuất hủy...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Xác nhận xuất hủy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo chuyên nghiệp */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] max-w-md animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-700"
                : toast.type === "warning"
                ? "bg-amber-600 text-white border-amber-700"
                : "bg-rose-600 text-white border-rose-700"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
