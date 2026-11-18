import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Clock,
  LayoutGrid,
  LayoutList,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  User,
  X,
} from "lucide-react";
import { useDispatchOrders } from "../../hooks/useDispatchOrders";
import {
  dispatchOrderService,
  DispatchOrder,
} from "../../services/inventory/dispatchOrder.service";
import {
  STATUS_META,
  FILTER_TABS,
} from "./components/dispatch/dispatchConstants";
import { DispatchDetailDrawer } from "./components/dispatch/DispatchDetailDrawer";
import { CreateDispatchModal } from "./components/dispatch/CreateDispatchModal";
import { HandoverDispatchModal } from "./components/dispatch/HandoverDispatchModal";
import {
  RejectDispatchModal,
  CancelDispatchModal,
} from "./components/dispatch/RejectCancelDispatchModal";
import { ToteListModal } from "./components/dispatch/ToteListModal";
import { QrZoomModal, QrPreviewData } from "./components/dispatch/QrZoomModal";
import { DispatchActionButtons } from "./components/dispatch/DispatchActionButtons";

/**
 * Thuộc tính đầu vào cho trang Quản lý & Duyệt Phiếu Xuất Kho Tổng (Luồng v6.0)
 */
export interface DispatchOrdersPageProps {
  /** Chế độ hiển thị theo vai trò: Thủ kho, Giám đốc, hoặc Dược sĩ PIC */
  mode?: "WAREHOUSE" | "DIRECTOR_APPROVAL" | "PIC_APPROVAL";
  /** Ẩn tiêu đề lớn khi nhúng bên trong Hub hoặc Tab khác */
  embedded?: boolean;
  /** Callback thông báo lên component cha nếu được nhúng */
  onMsg?: (msg: { type: "success" | "error"; text: string }) => void;
}

/**
 * Trang quản trị Phiếu Xuất Kho Tổng (2 pha: Lập phiếu & Duyệt -> Quét GS1 -> Bàn giao xuất kho).
 */
export const DispatchOrdersPage: React.FC<DispatchOrdersPageProps> = ({
  mode = "WAREHOUSE",
  embedded = false,
  onMsg,
}) => {
  const initialStatus = mode === "WAREHOUSE" ? "ALL" : "PENDING_APPROVAL";
  const {
    orders,
    totes,
    loading,
    submitting,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    error,
    asyncErrorBanner,
    setAsyncErrorBanner,
    reload,
    createOrder,
    approveOrder,
    rejectOrder,
    cancelOrder,
  } = useDispatchOrders(initialStatus);

  // Lọc bổ sung theo loại phiếu và phiếu treo >4h
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TRANSFER" | "DISPOSE">("ALL");
  const [onlyStale, setOnlyStale] = useState(false);
  // Chế độ hiển thị: Dạng Bảng thu gọn (TABLE) hoặc Dạng Thẻ trực quan (CARDS)
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS">("TABLE");

  // Thông báo nội bộ trên trang (In-app toast)
  const [localToast, setLocalToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal / Drawer states
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState<QrPreviewData | null>(null);
  const [showToteModal, setShowToteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rejectModalOrder, setRejectModalOrder] = useState<DispatchOrder | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<DispatchOrder | null>(null);
  const [handoverOrder, setHandoverOrder] = useState<DispatchOrder | null>(null);
  const [handoverBusy, setHandoverBusy] = useState(false);

  // Đọc thông tin người dùng hiện tại để kiểm tra quyền PIC và chống tự duyệt (Two-Person Rule)
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentUserId = String(currentUser?.id || currentUser?._id || "");
  const isPicPharmacist = Boolean(currentUser?.isBranchPIC);

  const notify = (type: "success" | "error", text: string) => {
    if (onMsg) {
      onMsg({ type, text });
    } else {
      setLocalToast({ type, text });
      setTimeout(() => setLocalToast(null), 4000);
    }
  };

  // Mở modal chi tiết và fetch bản mới nhất từ Backend (có đủ picks/returnLogs)
  const openOrderDetail = async (order: DispatchOrder) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const fresh = await dispatchOrderService.getById(order._id);
      if (fresh?._id) setSelectedOrder(fresh);
    } catch {
      // Giữ nguyên dữ liệu hiện có trong danh sách nếu chưa fetch kịp
    } finally {
      setDetailLoading(false);
    }
  };

  // Đồng bộ lại selectedOrder khi danh sách reload xong
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find((o) => o._id === selectedOrder._id);
    if (updated) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, ...updated, picks: prev.picks || updated.picks } : updated
      );
    }
  }, [orders]);

  // Kiểm tra quyền phê duyệt của người dùng hiện tại đối với từng phiếu (hiển thị chính xác ở UI)
  const getApprovalGuard = (order: DispatchOrder) => {
    if (order.status !== "PENDING_APPROVAL") {
      return { canApprove: false, reason: "Phiếu không ở trạng thái chờ duyệt." };
    }
    if (currentUserId && String(order.createdBy) === currentUserId) {
      return { canApprove: false, reason: "Quy tắc 2 người: không được tự duyệt phiếu do mình lập." };
    }
    if (order.hasControlledDrugs) {
      if (mode === "DIRECTOR_APPROVAL" && !isPicPharmacist) {
        return {
          canApprove: false,
          reason: "Có thuốc KSĐB — chỉ Dược sĩ Phụ trách (PIC) mới được phép duyệt.",
        };
      }
      if (mode === "PIC_APPROVAL" && !isPicPharmacist) {
        return {
          canApprove: false,
          reason: "Tài khoản chưa được gắn cờ isBranchPIC (Dược sĩ Phụ trách chuyên môn).",
        };
      }
    }
    if (mode === "PIC_APPROVAL" && !order.hasControlledDrugs && order.type !== "DISPOSE") {
      return {
        canApprove: false,
        reason: "Phiếu thường thuộc thẩm quyền Giám đốc / Quản lý vùng.",
      };
    }
    return { canApprove: true, reason: "" };
  };

  const handleApprove = async (order: DispatchOrder) => {
    try {
      await approveOrder(order._id);
      notify("success", `Đã gửi lệnh phê duyệt phiếu ${order.dispatchCode}!`);
      if (selectedOrder?._id === order._id) setSelectedOrder(null);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi phê duyệt phiếu.");
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectModalOrder) return;
    try {
      await rejectOrder(rejectModalOrder._id, reason);
      notify("success", `Đã từ chối phiếu ${rejectModalOrder.dispatchCode}.`);
      setRejectModalOrder(null);
      if (selectedOrder?._id === rejectModalOrder._id) setSelectedOrder(null);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi từ chối phiếu.");
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelModalOrder) return;
    try {
      await cancelOrder(cancelModalOrder._id, reason || "Thủ kho hủy phiếu trước khi nhặt");
      notify("success", `Đã gửi yêu cầu hủy phiếu ${cancelModalOrder.dispatchCode}.`);
      setCancelModalOrder(null);
      if (selectedOrder?._id === cancelModalOrder._id) setSelectedOrder(null);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Không thể hủy phiếu.");
    }
  };

  const handleHandoverConfirm = async (data: {
    driverName: string;
    vehiclePlate?: string;
    carrierNote?: string;
  }) => {
    if (!handoverOrder) return;
    setHandoverBusy(true);
    try {
      await dispatchOrderService.confirmDispatch(handoverOrder._id, data);
      notify(
        "success",
        `Đã xác nhận xuất kho ${handoverOrder.dispatchCode}! Đang đồng bộ StockTransfer SHIPPING.`
      );
      setHandoverOrder(null);
      setSelectedOrder(null);
      setTimeout(() => void reload(), 750);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi xác nhận xuất kho.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleCreateSubmit = async (payload: any) => {
    try {
      await createOrder(payload);
      notify(
        "success",
        payload.type === "TRANSFER"
          ? "Đã tiếp nhận yêu cầu lập Phiếu Xuất Kho (chờ phê duyệt)!"
          : "Đã tiếp nhận lập Phiếu Xuất Hủy (chờ phê duyệt)!"
      );
      setShowCreateModal(false);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi lập phiếu xuất kho.");
    }
  };

  // Danh sách hiển thị sau khi lọc theo loại, stale và mode
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (typeFilter !== "ALL" && o.type !== typeFilter) return false;
      if (onlyStale && !o.isStale) return false;
      return true;
    });
  }, [orders, typeFilter, onlyStale]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const staleCount = useMemo(() => orders.filter((o) => o.isStale).length, [orders]);
  const availableTotesCount = useMemo(
    () => totes.filter((t) => t.status === "AVAILABLE").length,
    [totes]
  );

  const headerTitle =
    mode === "DIRECTOR_APPROVAL"
      ? "Phê Duyệt Xuất Kho Tổng (Giám Đốc)"
      : mode === "PIC_APPROVAL"
      ? "Phê Duyệt Thuốc Kiểm Soát Đặc Biệt & Hủy (Dược Sĩ PIC)"
      : "Điều Phối Xuất Kho Tổng (2 Pha + GS1)";

  const headerSubtitle =
    mode === "DIRECTOR_APPROVAL"
      ? "Duyệt phiếu điều chuyển chi nhánh & phiếu xuất hủy thông thường trước khi Kho Tổng xuất hàng."
      : mode === "PIC_APPROVAL"
      ? "Thẩm định chuyên môn đối với phiếu có thuốc gây nghiện/hướng thần hoặc xuất hủy dược phẩm GSP/GDP."
      : "Lập phiếu từ PR chi nhánh, giữ chỗ tạm (reservedQty), theo dõi quét mã GS1 trên Mobile PDA và xuất bến.";

  return (
    <div className={embedded ? "flex flex-col h-full gap-4 min-h-0" : "space-y-5 p-4 md:p-6 max-w-7xl mx-auto"}>
      {/* Toast nội bộ khi chạy trang độc lập */}
      {localToast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
            localToast.type === "success"
              ? "bg-sky-600 text-white border-sky-700"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {localToast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{localToast.text}</span>
        </div>
      )}

      {/* Header - Ẩn khi được nhúng bên trong Hub để tối đa hóa không gian hiển thị danh sách */}
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                <Truck size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">{headerTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{headerSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowToteModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Archive size={14} className="text-sky-600" />
              <span>
                Giỏ Tote ({availableTotesCount}/{totes.length} trống)
              </span>
            </button>

            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
              <span>Làm mới</span>
            </button>

            {mode === "WAREHOUSE" && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <Plus size={15} />
                <span>Lập phiếu xuất mới</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cảnh báo nếu vào màn hình PIC nhưng tài khoản chưa gắn cờ isBranchPIC */}
      {mode === "PIC_APPROVAL" && !isPicPharmacist && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800 shrink-0">
          <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <b>Lưu ý phân quyền GSP/GDP:</b> Chỉ tài khoản Dược sĩ được gán cờ{" "}
            <code className="px-1 py-0.5 bg-amber-100 rounded font-mono">isBranchPIC = true</code> mới
            được phép phê duyệt phiếu có thuốc Kiểm soát đặc biệt. Máy chủ vẫn sẽ kiểm tra trực tiếp
            CSDL khi thực hiện duyệt.
          </div>
        </div>
      )}

      {/* Banner lỗi bất đồng bộ từ Kafka */}
      {asyncErrorBanner && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-rose-800 shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{asyncErrorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAsyncErrorBanner(null)}
            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bộ lọc trạng thái + Tìm kiếm + Thao tác chuyển View */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          {/* Dải nút trạng thái */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            {FILTER_TABS.map((t) => {
              const count = statusCounts[t.key] || 0;
              const isActive = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{t.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Công cụ bên phải: Chuyển Table/Cards & Nút thao tác khi embedded */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
            {/* Toggle Table vs Cards */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Xem dạng bảng"
              >
                <LayoutList size={14} />
                <span className="hidden sm:inline">Bảng</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === "CARDS"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Xem dạng thẻ trực quan"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Thẻ</span>
              </button>
            </div>

            {/* Các nút hành động khi ở chế độ embedded */}
            {embedded && (
              <>
                <button
                  type="button"
                  onClick={() => setShowToteModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  title="Kiểm tra trạng thái giỏ Tote"
                >
                  <Archive size={14} className="text-sky-600" />
                  <span className="hidden md:inline">Giỏ Tote</span>
                  <span className="font-mono text-sky-700">({availableTotesCount}/{totes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => void reload()}
                  disabled={loading}
                  className="p-2 md:px-3 md:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin text-sky-600" : "text-slate-500"} />
                  <span className="hidden md:inline">Làm mới</span>
                </button>

                {mode === "WAREHOUSE" && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition shrink-0"
                  >
                    <Plus size={14} />
                    <span>Lập phiếu mới</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hàng 2: Tìm kiếm + Lọc Loại & Treo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu DX-..., mã PR, chi nhánh hoặc mã BBH..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "TRANSFER", "DISPOSE"] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setTypeFilter(tp)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  typeFilter === tp
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tp === "ALL" ? "Mọi loại" : tp === "TRANSFER" ? "Điều chuyển" : "Xuất hủy"}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOnlyStale((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition cursor-pointer ${
                onlyStale
                  ? "bg-rose-50 text-rose-700 border-rose-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Clock size={12} />
              <span>Treo &gt;4h ({staleCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách Phiếu Xuất Kho (Hỗ trợ cả chế độ Bảng thu gọn và Lưới thẻ trực quan) */}
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs ${embedded ? "flex-1 min-h-0 overflow-auto" : "overflow-hidden"}`}>
        {loading && orders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={28} className="animate-spin text-sky-600 mb-2" />
            <p className="text-xs font-medium">Đang tải danh sách phiếu xuất kho...</p>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <p className="text-xs font-semibold text-rose-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Tải lại dữ liệu</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Package size={36} className="opacity-30 mb-2" />
            <p className="text-sm font-bold text-slate-600">Chưa có phiếu xuất kho nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử đổi bộ lọc trạng thái hoặc tạo mới phiếu xuất từ PR chi nhánh.
            </p>
          </div>
        ) : viewMode === "CARDS" ? (
          /* =========================================================================
             CHẾ ĐỘ XEM THẺ (CARDS VIEW) - TRỰC QUAN, RÕ RÀNG, DỄ THEO DÕI
             ========================================================================= */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredOrders.map((order) => {
              const meta = STATUS_META[order.status] || {
                label: order.status,
                badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                dotClass: "bg-slate-500",
              };
              const totalRequested = (order.pickingList || []).reduce(
                (s, l) => s + (l.requestedQty || 0),
                0
              );
              const totalPicked =
                order.totalPicked ??
                (order.pickingList || []).reduce((s, l) => s + (l.pickedQty || 0), 0);
              const pct =
                totalRequested > 0 ? Math.min(100, Math.round((totalPicked / totalRequested) * 100)) : 0;
              const guard = getApprovalGuard(order);
              const canApproveHere =
                (mode === "DIRECTOR_APPROVAL" || mode === "PIC_APPROVAL") &&
                order.status === "PENDING_APPROVAL";
              const canWarehouseCancel =
                mode === "WAREHOUSE" &&
                totalPicked === 0 &&
                ["PENDING_APPROVAL", "APPROVED", "PICKING"].includes(order.status);

              return (
                <div
                  key={order._id}
                  onClick={() => void openOrderDetail(order)}
                  className="bg-white rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all p-3.5 flex flex-col justify-between gap-3 cursor-pointer group"
                >
                  {/* Top: Mã phiếu, Loại phiếu & Trạng thái */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-black text-sky-700 text-xs flex items-center gap-1.5 group-hover:text-sky-800">
                          <Truck size={14} className="text-sky-600 shrink-0" />
                          <span>{order.dispatchCode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${meta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                    </div>

                    {/* Badges: Loại & Cảnh báo */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          order.type === "DISPOSE"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {order.type === "DISPOSE" ? "XUẤT HỦY" : "ĐIỀU CHUYỂN"}
                      </span>

                      {order.hasControlledDrugs && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          <ShieldAlert size={10} /> KSĐB (PIC)
                        </span>
                      )}
                      {order.isStale && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                          <Clock size={10} /> Treo &gt;4h
                        </span>
                      )}
                    </div>

                    {/* Nơi nhận / Thông tin tham chiếu */}
                    <div className="text-xs text-slate-600 line-clamp-1">
                      {order.type === "DISPOSE" ? (
                        <span className="font-mono text-slate-500">
                          Biên bản: {order.disposalReportCode || "—"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800">
                            {order.toBranchName || order.toBranchId || "Chi nhánh"}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Tiến độ nhặt hàng */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium text-[11px]">Tiến độ nhặt:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {totalPicked} / {totalRequested} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{order.pickingList?.length || 0} dòng kệ FEFO</span>
                        {order.toteCodes && order.toteCodes.length > 0 ? (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 rounded">
                            {order.toteCodes.join(", ")}
                          </span>
                        ) : (
                          <span>Chưa gắn giỏ</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Người lập & Thao tác */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <User size={12} />
                      <span className="truncate max-w-[120px]">{order.createdByName || "Thủ kho"}</span>
                    </div>

                    <DispatchActionButtons
                      order={order}
                      mode={mode}
                      guard={guard}
                      canApproveHere={canApproveHere}
                      canWarehouseCancel={canWarehouseCancel}
                      submitting={submitting}
                      onApprove={handleApprove}
                      onReject={(o) => setRejectModalOrder(o)}
                      onHandover={(o) => setHandoverOrder(o)}
                      onCancel={(o) => setCancelModalOrder(o)}
                      onOpenDetail={openOrderDetail}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================================
             CHẾ ĐỘ XEM BẢNG (TABLE VIEW) - THU GỌN, CHUẨN XÁC, THOÁNG MẮT
             ========================================================================= */
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/95 backdrop-blur-xs text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5">Mã Phiếu</th>
                  <th className="px-3 py-2.5">Loại / Nguồn</th>
                  <th className="px-3 py-2.5">Đích nhận / Biên bản</th>
                  <th className="px-3 py-2.5 text-center">Tiến độ nhặt</th>
                  <th className="px-3 py-2.5">Giỏ Tote</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const meta = STATUS_META[order.status] || {
                    label: order.status,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    dotClass: "bg-slate-500",
                  };
                  const totalRequested = (order.pickingList || []).reduce(
                    (s, l) => s + (l.requestedQty || 0),
                    0
                  );
                  const totalPicked =
                    order.totalPicked ??
                    (order.pickingList || []).reduce((s, l) => s + (l.pickedQty || 0), 0);
                  const pct =
                    totalRequested > 0 ? Math.min(100, Math.round((totalPicked / totalRequested) * 100)) : 0;
                  const guard = getApprovalGuard(order);
                  const canApproveHere =
                    (mode === "DIRECTOR_APPROVAL" || mode === "PIC_APPROVAL") &&
                    order.status === "PENDING_APPROVAL";
                  const canWarehouseCancel =
                    mode === "WAREHOUSE" &&
                    totalPicked === 0 &&
                    ["PENDING_APPROVAL", "APPROVED", "PICKING"].includes(order.status);

                  return (
                    <tr
                      key={order._id}
                      onClick={() => void openOrderDetail(order)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="font-mono font-black text-sky-700 text-xs">
                          {order.dispatchCode}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {order.hasControlledDrugs && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold">
                              <ShieldAlert size={9} /> KSĐB (PIC)
                            </span>
                          )}
                          {order.isStale && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold">
                              <Clock size={9} /> Treo &gt;4h
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            order.type === "DISPOSE"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {order.type === "DISPOSE" ? "XUẤT HỦY" : "ĐIỀU CHUYỂN"}
                        </span>
                        {order.referenceCode && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            PR: {order.referenceCode}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        {order.type === "DISPOSE" ? (
                          <div>
                            <span className="font-mono text-slate-700 font-bold text-[11px]">
                              {order.disposalReportCode || "—"}
                            </span>
                            <div className="text-[10px] text-slate-400">Xuất tiêu hủy kho</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-800">
                              {order.toBranchName || order.toBranchId || "Chi nhánh"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {order.pickingList?.length || 0} mặt hàng
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle text-center">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {totalPicked} / {totalRequested} ({pct}%)
                        </div>
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        {order.toteCodes && order.toteCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {order.toteCodes.map((tc) => (
                              <button
                                key={tc}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrPreview({
                                    code: tc,
                                    title: `Mã QR Giỏ Tote: ${tc}`,
                                    subtitle: `Ghép giỏ nhặt hàng cho phiếu ${order.dispatchCode}`,
                                  });
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold cursor-pointer"
                                title="Xem QR Giỏ"
                              >
                                {tc}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${meta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 align-middle text-right">
                        <div className="flex justify-end">
                          <DispatchActionButtons
                            order={order}
                            mode={mode}
                            guard={guard}
                            canApproveHere={canApproveHere}
                            canWarehouseCancel={canWarehouseCancel}
                            submitting={submitting}
                            onApprove={handleApprove}
                            onReject={(o) => setRejectModalOrder(o)}
                            onHandover={(o) => setHandoverOrder(o)}
                            onCancel={(o) => setCancelModalOrder(o)}
                            onOpenDetail={openOrderDetail}
                          />
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

      {/* Modal / Drawer Chi Tiết Phiếu Xuất Kho */}
      <DispatchDetailDrawer
        order={selectedOrder}
        detailLoading={detailLoading}
        mode={mode}
        submitting={submitting}
        canApprove={selectedOrder ? getApprovalGuard(selectedOrder).canApprove : false}
        approvalReason={selectedOrder ? getApprovalGuard(selectedOrder).reason : ""}
        onClose={() => setSelectedOrder(null)}
        onOpenQr={(qr) => setQrPreview(qr)}
        onReject={(order) => setRejectModalOrder(order)}
        onApprove={(order) => void handleApprove(order)}
        onHandover={(order) => setHandoverOrder(order)}
      />

      {/* Modal Lập Phiếu Xuất Kho Mới */}
      <CreateDispatchModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateSubmit}
        submitting={submitting}
        notify={notify}
      />

      {/* Modal Xác Nhận Bàn Giao Xuất Bến (STAGED -> DISPATCHED) */}
      <HandoverDispatchModal
        order={handoverOrder}
        onClose={() => setHandoverOrder(null)}
        onConfirm={handleHandoverConfirm}
        busy={handoverBusy}
      />

      {/* Modal Từ Chối Phiếu (Director / PIC) */}
      <RejectDispatchModal
        order={rejectModalOrder}
        onClose={() => setRejectModalOrder(null)}
        onConfirm={handleRejectConfirm}
        submitting={submitting}
      />

      {/* Modal Hủy Phiếu (Thủ kho) */}
      <CancelDispatchModal
        order={cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        onConfirm={handleCancelConfirm}
        submitting={submitting}
      />

      {/* Modal Danh Sách Giỏ Tote + QR Code */}
      <ToteListModal
        isOpen={showToteModal}
        onClose={() => setShowToteModal(false)}
        totes={totes}
        onOpenQr={(qr) => setQrPreview(qr)}
      />

      {/* Modal Phóng To QR Code */}
      <QrZoomModal
        preview={qrPreview}
        onClose={() => setQrPreview(null)}
      />
    </div>
  );
};
