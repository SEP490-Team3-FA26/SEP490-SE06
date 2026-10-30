import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  X,
  Calendar,
  Search,
  Loader2,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  Box,
  Trash2,
} from "lucide-react";
import {
  ReserveBatch,
  inventoryMapService,
  ShelfLayout,
} from "../../../services/inventory/inventoryMap.service";

interface ReserveBatchesPanelProps {
  batches: ReserveBatch[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectBatch?: (batch: ReserveBatch) => void;
  onSelectShelf?: (zone: string, rack: string, shelf: number, bin?: number) => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  NORMAL: {
    label: "Bình thường",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <CheckCircle size={10} />,
  },
  NEAR_EXPIRY: {
    label: "Cận date",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300 font-bold",
    icon: <Clock size={10} className="text-amber-600" />,
  },
  EXPIRED: {
    label: "Hết hạn",
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-300 font-bold",
    icon: <AlertTriangle size={10} className="text-rose-600" />,
  },
};

const RACK_OPTIONS = ["RES1", "RES2", "RES3", "RES4"];

export function ReserveBatchesPanel({
  batches,
  loading = false,
  onRefresh,
  onSelectBatch,
  onSelectShelf,
  onClose,
}: ReserveBatchesPanelProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Toast thông báo chuyên nghiệp thay cho alert/confirm gốc
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

  // Chế độ xem: Bảng danh sách hoặc Sơ đồ phân kệ & ô thùng
  const [viewMode, setViewMode] = useState<"TABLE" | "RACK_GRID">("TABLE");
  const [selectedRack, setSelectedRack] = useState<string>("RES1");
  const [shelfLayouts, setShelfLayouts] = useState<ShelfLayout[]>([]);
  const [loadingLayout, setLoadingLayout] = useState<boolean>(false);

  // Tải layout kệ dự trữ khi chuyển sang xem Sơ đồ kệ
  useEffect(() => {
    if (viewMode !== "RACK_GRID") return;
    setLoadingLayout(true);
    inventoryMapService
      .getShelfLayout("RESERVE", selectedRack)
      .then((data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data || []);
        setShelfLayouts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error("Lỗi tải sơ đồ kệ dự trữ:", err);
        setShelfLayouts([]);
      })
      .finally(() => setLoadingLayout(false));
  }, [viewMode, selectedRack]);



  // Điều hướng trực tiếp sang phiếu xuất hủy thuốc GSP/GPP và tự động điền thông tin lô dự trữ cần hủy
  const handleNavigateToDispose = (batch: ReserveBatch) => {
    const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/warehouse';
    navigate(`${basePath}/inventory/dispose`, {
      state: {
        autoOpenCreate: true,
        prefillItem: {
          medicineId: batch.medicineId || batch._id,
          medicineName: batch.medicineName,
          batchId: batch._id,
          batchNo: batch.batchNo,
          stock: batch.stock,
          unit: batch.unit || "Hộp",
          expDate: batch.expDate,
          reason: "Thuốc quá hạn sử dụng theo quy định Dược (Hết date)",
        },
      },
    });
    if (onClose) onClose();
  };

  const filteredBatches = batches.filter((b) => {
    const q = searchTerm.toLowerCase();
    const rack = b.location?.rack || "";
    return (
      b.medicineName?.toLowerCase().includes(q) ||
      b.batchNo?.toLowerCase().includes(q) ||
      rack.toLowerCase().includes(q)
    );
  });

  const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
  const nearExpiryCount = batches.filter(
    (b) => b.status === "NEAR_EXPIRY" || b.status === "EXPIRED"
  ).length;

  return (
    <div className="bg-white border-t-2 border-amber-400 text-slate-800 flex flex-col max-h-[420px] shadow-2xl transition-all">
      {/* Header Panel */}
      <div className="px-6 py-3 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
            <Archive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900">
                Khu Kệ Dự Trữ — Phân Ô Chuẩn FEFO
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                4 Kệ: RES1 · RES2 · RES3 · RES4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Phân chia thành các dãy Kệ (RES1, RES2, RES3, RES4), mỗi kệ 4 Tầng và 10 Ô Thùng (B1..B10) rõ ràng, ngăn nắp.
            </p>
          </div>
        </div>

        {/* Chuyển đổi View Mode & Thống kê & Tìm kiếm */}
        <div className="flex items-center gap-3">
          {/* NÚT CHUYỂN CHẾ ĐỘ XEM: SỔ RA KỆ DỰ TRỮ HOẶC BẢNG LÔ */}
          <div className="flex items-center bg-amber-100/80 p-0.5 rounded-xl border border-amber-200">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "TABLE"
                  ? "bg-white text-amber-900 shadow-2xs font-bold"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              <List size={13} />
              <span>Bảng Danh Sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("RACK_GRID")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "RACK_GRID"
                  ? "bg-amber-500 text-white shadow-2xs font-bold"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Sơ Đồ Phân Kệ & Ô Thùng</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs">
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
              placeholder="Tìm thuốc, mã lô, kệ..."
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

      {/* NỘI DUNG CHÍNH (THEO VIEW MODE) */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-50/50">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-amber-500" /> Đang tải danh sách lô dự trữ...
          </div>
        ) : viewMode === "RACK_GRID" ? (
          /* ======================================================== */
          /* CHẾ ĐỘ 1: SƠ ĐỒ PHÂN KỆ VÀ Ô THÙNG CỦA KHU DỰ TRỮ (RES1, RES2, RES3) */
          /* ======================================================== */
          <div className="space-y-4">
            {/* Bộ chọn Kệ Dự Trữ */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Chọn Dãy Kệ Dự Trữ:</span>
                <div className="flex gap-2">
                  {RACK_OPTIONS.map((rack) => (
                    <button
                      key={rack}
                      type="button"
                      onClick={() => setSelectedRack(rack)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedRack === rack
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Layers size={12} />
                      <span>Kệ {rack}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Có hàng
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block ml-2" /> Thùng trống
                <span className="text-[11px] text-slate-400 italic ml-2">
                  (Click ô thùng để xem chi tiết hoặc dời thuốc)
                </span>
              </div>
            </div>

            {loadingLayout ? (
              <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber-500" /> Đang tải sơ đồ các tầng và thùng của Kệ {selectedRack}...
              </div>
            ) : shelfLayouts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có dữ liệu cho Kệ {selectedRack}
              </div>
            ) : (
              <div className="space-y-3">
                {shelfLayouts.map((sh) => (
                  <div key={sh.shelfNo} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-xs">
                          Tầng {sh.shelfNo}
                        </span>
                        <span className="text-xs text-slate-500">
                          {sh.bins.filter((b) => b.currentStock > 0).length}/10 thùng có thuốc dự trữ
                        </span>
                      </div>

                      {onSelectShelf && (
                        <button
                          type="button"
                          onClick={() => onSelectShelf("RESERVE", selectedRack, sh.shelfNo)}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline"
                        >
                          <span>Xem chi tiết tầng</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>

                    {/* Lưới 10 ô Thùng B1..B10 của tầng */}
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {sh.bins.map((bin) => {
                        const hasStock = bin.currentStock > 0;
                        return (
                          <button
                            key={bin.binNo}
                            type="button"
                            onClick={() => {
                              if (onSelectShelf) {
                                onSelectShelf("RESERVE", selectedRack, sh.shelfNo, bin.binNo);
                              }
                            }}
                            className={`p-2 rounded-xl border text-left flex flex-col justify-between min-h-[60px] transition hover:shadow-xs ${
                              hasStock
                                ? "bg-amber-50/70 border-amber-300 text-amber-950 hover:bg-amber-100"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                            }`}
                            title={
                              hasStock
                                ? `Thùng B${bin.binNo}: ${bin.medicineName || "Thuốc dự trữ"} (${bin.currentStock} ${bin.unit || "Hộp"})`
                                : `Thùng B${bin.binNo}: Trống`
                            }
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-mono text-xs font-bold">B{bin.binNo}</span>
                              <Box size={11} className={hasStock ? "text-amber-600" : "text-slate-300"} />
                            </div>

                            <div className="mt-1 w-full overflow-hidden">
                              {hasStock ? (
                                <>
                                  <div className="text-[10px] font-bold text-amber-900 truncate" title={bin.medicineName}>
                                    {bin.medicineName?.split(" ").slice(0, 2).join(" ") || "Lô DT"}
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-600 font-semibold">
                                    {bin.currentStock} {bin.unit || "đv"}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[9px] text-slate-400">Trống</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* CHẾ ĐỘ 2: BẢNG DANH SÁCH LÔ HÀNG (TABLE VIEW CÓ VỊ TRÍ KỆ Ô) */
          /* ======================================================== */
          filteredBatches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center">
              <Archive size={28} className="opacity-30 mb-2 text-amber-500" />
              <span>Khu Dự Trữ hiện tại không có lô hàng nào phù hợp với tìm kiếm.</span>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Dược phẩm</th>
                    <th className="px-4 py-2.5">Số lô</th>
                    <th className="px-4 py-2.5">Vị trí Ô Thùng</th>
                    <th className="px-4 py-2.5 text-right">Số lượng tồn</th>
                    <th className="px-4 py-2.5">Hạn sử dụng (FEFO)</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((b) => {
                    const isExpired =
                      b.status === "EXPIRED" ||
                      (b.daysToExpiry != null && b.daysToExpiry < 0) ||
                      (b.expDate ? new Date(b.expDate) < new Date() : false);
                    const isNearExpiry =
                      !isExpired &&
                      (b.status === "NEAR_EXPIRY" || (b.daysToExpiry != null && b.daysToExpiry <= 90));
                    const sc = isExpired
                      ? STATUS_CONFIG.EXPIRED
                      : isNearExpiry
                      ? STATUS_CONFIG.NEAR_EXPIRY
                      : STATUS_CONFIG[b.status] || STATUS_CONFIG.NORMAL;

                    const rack = b.location?.rack || "RES1";
                    const shelf = b.location?.shelf || 1;
                    const bin = b.location?.bin || 1;

                    return (
                      <tr
                        key={b._id}
                        className={`transition ${
                          isExpired
                            ? "bg-rose-50/50 hover:bg-rose-50/80"
                            : isNearExpiry
                            ? "bg-amber-50/30 hover:bg-amber-50/60"
                            : "hover:bg-amber-50/40"
                        }`}
                      >
                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                          {b.medicineName}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-sky-700 font-bold">
                          {b.batchNo}
                        </td>
                        {/* Cột Vị trí Kệ / Tầng / Ô Thùng */}
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold">
                            <Layers size={10} className="text-amber-700" />
                            Kệ {rack} · T{shelf} · B{bin}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-800 font-mono">
                          {b.stock?.toLocaleString("vi-VN")}{" "}
                          <span className="font-normal text-slate-500 text-[10px]">{b.unit || "Hộp"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {isExpired ? (
                              <div className="flex items-center gap-1 text-rose-600 font-bold">
                                <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                                <span>{b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "—"}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 font-bold">
                                  Quá hạn {Math.abs(b.daysToExpiry || 0)} ngày
                                </span>
                              </div>
                            ) : isNearExpiry ? (
                              <div className="flex items-center gap-1 text-amber-700 font-medium">
                                <Clock size={11} className="text-amber-600 shrink-0" />
                                <span>{b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "—"}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                                  Cận date ({b.daysToExpiry}d)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Calendar size={11} className="text-slate-400" />
                                <span>{b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "—"}</span>
                                {b.daysToExpiry != null && (
                                  <span className="text-[10px] font-mono font-medium text-slate-400">
                                    ({b.daysToExpiry}d)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                          >
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Xuất Hủy màu đỏ rực cho lô hết hạn */}
                            {isExpired && (
                              <button
                                onClick={() => handleNavigateToDispose(b)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs border border-rose-700 cursor-pointer"
                                title="Xuất hủy lô thuốc hết hạn sử dụng (GSP/GDP)"
                              >
                                <Trash2 size={11} />
                                <span>Xuất hủy</span>
                              </button>
                            )}

                            {onSelectBatch && (
                              <button
                                onClick={() => onSelectBatch(b)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition"
                                title="Xem ô thùng chứa lô này"
                              >
                                <span>Xem Thùng</span>
                                <ArrowRight size={11} />
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
    </div>
  );
}
