import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Archive,
  Box,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  LayoutGrid,
  LayoutList,
  Loader2,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useDispatchOrders } from "../../hooks/useDispatchOrders";
import {
  dispatchOrderService,
  DispatchOrder,
  DispatchPickingLine,
  ToteItem,
} from "../../services/inventory/dispatchOrder.service";
import { purchaseRequisitionService } from "../../services/purchase/purchaseRequisition.service";
import { medicineService, Medicine } from "../../services/inventory/medicine.service";

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

/** Cấu hình nhãn và màu trạng thái (Tuân thủ Zero-Green Policy: dùng Auth Blue/Indigo/Amber/Rose) */
const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING_APPROVAL: {
    label: "Chờ phê duyệt",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  APPROVED: {
    label: "Đã duyệt (Chờ soạn)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-600",
  },
  PICKING: {
    label: "Đang quét nhặt",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-600",
  },
  STAGED: {
    label: "Chờ xuất bến (Tote)",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-600",
  },
  DISPATCHED: {
    label: "Đã xuất kho",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
    dotClass: "bg-sky-700",
  },
  PARTIALLY_DISPATCHED: {
    label: "Xuất một phần (Thiếu)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-600",
  },
  CANCELLED: {
    label: "Đã hủy / Từ chối",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
};

const RETURN_OUTCOME_META: Record<string, { label: string; cls: string }> = {
  RESTOCK: { label: "Hoàn kệ", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  DAMAGED: { label: "Hư hỏng / Vỡ", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  QUARANTINE: { label: "Cách ly chờ xử lý", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const FILTER_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "PICKING", label: "Đang nhặt" },
  { key: "STAGED", label: "Chờ bàn giao" },
  { key: "DISPATCHED", label: "Đã xuất" },
  { key: "PARTIALLY_DISPATCHED", label: "Thiếu hàng" },
  { key: "CANCELLED", label: "Đã hủy" },
];

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

  // Drawer xem chi tiết phiếu + tải chi tiết đầy đủ từ server
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal xem mã QR Khay / QR Giỏ Tote để Mobile quét trực tiếp từ màn hình
  const [qrPreview, setQrPreview] = useState<{
    code: string;
    title: string;
    subtitle: string;
  } | null>(null);

  // Modal xem toàn bộ bảng rổ Tote
  const [showToteModal, setShowToteModal] = useState(false);

  // Modal Lập phiếu xuất mới (chế độ Thủ kho)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"TRANSFER" | "DISPOSE">("TRANSFER");
  const [eligiblePrs, setEligiblePrs] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState("");
  const [prLoading, setPrLoading] = useState(false);

  // Dữ liệu lập phiếu Xuất hủy (DISPOSE)
  const [disposalReportCode, setDisposalReportCode] = useState("");
  const [disposalNotes, setDisposalNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [disposeItems, setDisposeItems] = useState<
    Array<{ medicineId: string; quantity: number }>
  >([{ medicineId: "", quantity: 1 }]);

  // Modal Từ chối phiếu (Director / PIC)
  const [rejectModalOrder, setRejectModalOrder] = useState<DispatchOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Modal Hủy phiếu (Thủ kho khi chưa nhặt món nào)
  const [cancelModalOrder, setCancelModalOrder] = useState<DispatchOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Modal Xác nhận bàn giao xuất bến (STAGED -> DISPATCHED)
  const [handoverOrder, setHandoverOrder] = useState<DispatchOrder | null>(null);
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [carrierNote, setCarrierNote] = useState("");
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

  // Nạp dữ liệu PR đủ điều kiện và danh mục thuốc khi mở Modal Lập Phiếu Xuất
  const openCreateModal = async () => {
    setShowCreateModal(true);
    setPrLoading(true);
    try {
      const [prRes, medRes] = await Promise.all([
        purchaseRequisitionService.getPurchaseRequisitions(),
        medicineService
          .getBranchMedicines("CENTRAL_WH", { limit: 150 })
          .catch(() => medicineService.getMedicines({ directDb: true, limit: 150 })),
      ]);

      const rawPrs = Array.isArray(prRes) ? prRes : prRes?.data || [];
      const filteredPrs = rawPrs.filter((pr: any) =>
        ["SUBMITTED", "CONSOLIDATED"].includes(pr.status)
      );
      setEligiblePrs(filteredPrs);
      if (filteredPrs.length > 0 && !selectedPrId) {
        setSelectedPrId(filteredPrs[0]._id);
      }

      const rawMeds = Array.isArray(medRes) ? medRes : (medRes as any)?.data || [];
      setMedicines(rawMeds);
    } catch (err: any) {
      notify("error", err?.message || "Không tải được danh sách yêu cầu PR hoặc thuốc kho tổng.");
    } finally {
      setPrLoading(false);
    }
  };

  // Xử lý Lập phiếu xuất kho mới
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (createType === "TRANSFER") {
        if (!selectedPrId) {
          notify("error", "Vui lòng chọn một Yêu cầu cấp hàng (PR) để lập phiếu xuất.");
          return;
        }
        await createOrder({ type: "TRANSFER", referenceId: selectedPrId });
        notify("success", "Đã tiếp nhận yêu cầu lập Phiếu Xuất Kho (chờ phê duyệt)!");
      } else {
        if (!disposalReportCode.trim()) {
          notify("error", "Xuất hủy bắt buộc phải nhập Số Biên Bản Hủy (BBH-...).");
          return;
        }
        const validItems = disposeItems.filter((it) => it.medicineId && Number(it.quantity) > 0);
        if (validItems.length === 0) {
          notify("error", "Vui lòng chọn ít nhất 1 thuốc với số lượng > 0 để xuất hủy.");
          return;
        }
        await createOrder({
          type: "DISPOSE",
          disposalReportCode: disposalReportCode.trim(),
          items: validItems.map((it) => ({
            medicineId: it.medicineId,
            quantity: Number(it.quantity),
          })),
          notes: disposalNotes.trim() || undefined,
        });
        notify("success", "Đã tiếp nhận lập Phiếu Xuất Hủy (chờ phê duyệt)!");
      }
      setShowCreateModal(false);
      setDisposalReportCode("");
      setDisposalNotes("");
      setDisposeItems([{ medicineId: "", quantity: 1 }]);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi lập phiếu xuất kho.");
    }
  };

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

  const handleRejectSubmit = async () => {
    if (!rejectModalOrder) return;
    if (!rejectReason.trim()) {
      notify("error", "Vui lòng nhập lý do từ chối phiếu xuất kho.");
      return;
    }
    try {
      await rejectOrder(rejectModalOrder._id, rejectReason.trim());
      notify("success", `Đã từ chối phiếu ${rejectModalOrder.dispatchCode}.`);
      setRejectModalOrder(null);
      setRejectReason("");
      if (selectedOrder?._id === rejectModalOrder._id) setSelectedOrder(null);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi từ chối phiếu.");
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelModalOrder) return;
    try {
      await cancelOrder(cancelModalOrder._id, cancelReason.trim() || "Thủ kho hủy phiếu trước khi nhặt");
      notify("success", `Đã gửi yêu cầu hủy phiếu ${cancelModalOrder.dispatchCode}.`);
      setCancelModalOrder(null);
      setCancelReason("");
      if (selectedOrder?._id === cancelModalOrder._id) setSelectedOrder(null);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Không thể hủy phiếu.");
    }
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverOrder) return;
    if (!driverName.trim()) {
      notify("error", "Vui lòng nhập tên tài xế hoặc người nhận bàn giao.");
      return;
    }
    setHandoverBusy(true);
    try {
      await dispatchOrderService.confirmDispatch(handoverOrder._id, {
        driverName: driverName.trim(),
        vehiclePlate: vehiclePlate.trim() || undefined,
        carrierNote: carrierNote.trim() || undefined,
      });
      notify(
        "success",
        `Đã xác nhận xuất kho ${handoverOrder.dispatchCode}! Đang đồng bộ StockTransfer SHIPPING.`
      );
      setHandoverOrder(null);
      setDriverName("");
      setVehiclePlate("");
      setCarrierNote("");
      setSelectedOrder(null);
      setTimeout(() => void reload(), 750);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || err?.message || "Lỗi xác nhận xuất kho.");
    } finally {
      setHandoverBusy(false);
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

  // Sắp xếp pickingList theo vị trí vật lý kệ kho (Zone -> Rack -> Shelf -> Bin)
  const sortPickingLines = (lines: DispatchPickingLine[] = []) => {
    return [...lines].sort((a, b) => {
      const la = a.suggestedLocation;
      const lb = b.suggestedLocation;
      if (!la || !lb) return 0;
      if (la.zone !== lb.zone) return String(la.zone).localeCompare(String(lb.zone));
      if (la.rack !== lb.rack) return String(la.rack).localeCompare(String(lb.rack));
      if (la.shelf !== lb.shelf) return Number(la.shelf) - Number(lb.shelf);
      return Number(la.bin) - Number(lb.bin);
    });
  };

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
                onClick={() => void openCreateModal()}
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
                    onClick={() => void openCreateModal()}
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
                  </div>

                  {/* Middle: Đích đến & Thông tin PR */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      {order.type === "DISPOSE" ? (
                        <>
                          <Archive size={13} className="text-rose-600 shrink-0" />
                          <span className="truncate">BBH: {order.disposalReportCode || "Hủy dược phẩm GSP"}</span>
                        </>
                      ) : (
                        <>
                          <Building2 size={13} className="text-sky-600 shrink-0" />
                          <span className="truncate">{order.toBranchName || order.toBranchId || "Chi nhánh nhận"}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      {order.referenceCode && (
                        <span className="font-mono text-slate-600">PR: {order.referenceCode}</span>
                      )}
                      {order.stockTransferCode && (
                        <span className="font-mono text-sky-600">Vận đơn: {order.stockTransferCode}</span>
                      )}
                    </div>

                    {/* Tiến độ nhặt */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                        <span>Tiến độ nhặt hàng:</span>
                        <span className="text-sky-700">{totalPicked}/{totalRequested} đv ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
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

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canApproveHere && (
                        <>
                          <button
                            type="button"
                            disabled={!guard.canApprove || submitting}
                            title={guard.reason || "Phê duyệt phiếu xuất kho"}
                            onClick={() => void handleApprove(order)}
                            className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <CheckCircle2 size={11} /> Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setRejectModalOrder(order);
                              setRejectReason("");
                            }}
                            className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer hover:bg-rose-100"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {mode === "WAREHOUSE" && order.status === "STAGED" && (
                        <button
                          type="button"
                          onClick={() => setHandoverOrder(order)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Truck size={11} /> Xuất bến
                        </button>
                      )}

                      {canWarehouseCancel && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason("");
                          }}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                          title="Hủy phiếu"
                        >
                          <XCircle size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void openOrderDetail(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Eye size={12} />
                        <span>Chi tiết</span>
                      </button>
                    </div>
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
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                            PR: {order.referenceCode}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Lập: {order.createdByName || "Thủ kho"}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        {order.type === "DISPOSE" ? (
                          <div>
                            <div className="font-semibold text-rose-700 text-xs">
                              BBH: {order.disposalReportCode || "—"}
                            </div>
                            <div className="text-[10px] text-slate-400">Hủy dược phẩm GSP</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              {order.toBranchName || order.toBranchId || "Chi nhánh nhận"}
                            </div>
                            {order.stockTransferCode && (
                              <div className="text-[10px] font-mono text-sky-700 mt-0.5">
                                Vận đơn: {order.stockTransferCode}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle min-w-[130px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-0.5">
                          <span>
                            {totalPicked}/{totalRequested} đv
                          </span>
                          <span className="text-sky-700">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {order.pickingList?.length || 0} dòng kệ FEFO
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        {order.toteCodes && order.toteCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {order.toteCodes.map((tc) => (
                              <span
                                key={tc}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold"
                              >
                                {tc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Chưa gắn giỏ</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </td>

                      <td
                        className="px-3.5 py-2.5 align-middle text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {canApproveHere && (
                            <>
                              <button
                                type="button"
                                disabled={!guard.canApprove || submitting}
                                title={guard.reason || "Phê duyệt phiếu xuất kho"}
                                onClick={() => void handleApprove(order)}
                                className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <CheckCircle2 size={12} />
                                <span>Duyệt</span>
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectReason("");
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <XCircle size={12} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {mode === "WAREHOUSE" && order.status === "STAGED" && (
                            <button
                              type="button"
                              onClick={() => setHandoverOrder(order)}
                              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                            >
                              <Truck size={12} />
                              <span>Xuất bến</span>
                            </button>
                          )}

                          {canWarehouseCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalOrder(order);
                                setCancelReason("");
                              }}
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hủy phiếu (chỉ khi chưa nhặt hàng)"
                            >
                              <XCircle size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void openOrderDetail(order)}
                            className="p-1 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 cursor-pointer"
                            title="Xem chi tiết & QR Khay/Tote"
                          >
                            <Eye size={14} />
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

      {/* Modal / Drawer Chi Tiết Phiếu Xuất Kho */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header chi tiết */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-mono font-black text-lg text-slate-900">
                    {selectedOrder.dispatchCode}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      (STATUS_META[selectedOrder.status] || STATUS_META.PENDING_APPROVAL).badgeClass
                    }`}
                  >
                    {(STATUS_META[selectedOrder.status] || STATUS_META.PENDING_APPROVAL).label}
                  </span>
                  {selectedOrder.hasControlledDrugs && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                      KSĐB — PIC duyệt
                    </span>
                  )}
                  {detailLoading && <Loader2 size={14} className="animate-spin text-emerald-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedOrder.type === "DISPOSE"
                    ? `Phiếu xuất hủy • Biên bản ${selectedOrder.disposalReportCode || "—"}`
                    : `Xuất điều chuyển → ${
                        selectedOrder.toBranchName || selectedOrder.toBranchId || "Chi nhánh"
                      }${selectedOrder.referenceCode ? ` • Tham chiếu PR: ${selectedOrder.referenceCode}` : ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thân chi tiết */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Thông tin hành chính & audit */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Người lập phiếu
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedOrder.createdByName || "Thủ kho"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Người phê duyệt
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedOrder.approvedByName || "Chưa duyệt"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Vận đơn StockTransfer
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {selectedOrder.stockTransferCode || "Sinh khi xuất bến"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Giỏ Tote gắn phiếu
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedOrder.toteCodes?.length ? (
                      selectedOrder.toteCodes.map((tc) => (
                        <button
                          key={tc}
                          type="button"
                          onClick={() =>
                            setQrPreview({
                              code: tc,
                              title: `Mã QR Giỏ Tote ${tc}`,
                              subtitle: `Dùng PDA quét mã này để ghép/đối chiếu rổ đựng hàng cho ${selectedOrder.dispatchCode}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-bold cursor-pointer"
                        >
                          <QrCode size={11} /> {tc}
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-400">Chưa gắn</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.rejectedReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <b>Lý do từ chối / hủy:</b> {selectedOrder.rejectedReason}
                </div>
              )}

              {selectedOrder.handoverRecipient?.driverName && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex flex-wrap gap-4">
                  <span>
                    <b>Tài xế nhận hàng:</b> {selectedOrder.handoverRecipient.driverName}
                  </span>
                  {selectedOrder.handoverRecipient.vehiclePlate && (
                    <span>
                      <b>Biển số xe:</b> {selectedOrder.handoverRecipient.vehiclePlate}
                    </span>
                  )}
                  {selectedOrder.handoverRecipient.carrierNote && (
                    <span>
                      <b>Ghi chú bàn giao:</b> {selectedOrder.handoverRecipient.carrierNote}
                    </span>
                  )}
                </div>
              )}

              {/* Hướng dẫn quy trình PDA */}
              {["APPROVED", "PICKING"].includes(selectedOrder.status) && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                  <QrCode size={16} className="text-sky-700 shrink-0" />
                  <span>
                    <b>Hướng dẫn thực địa:</b> Thủ kho dùng Mobile App PDA tại kho, chọn phiếu{" "}
                    <b>{selectedOrder.dispatchCode}</b> để quét QR Khay kệ &amp; DataMatrix GS1 từng
                    hộp thuốc (hoặc bấm vào nút QR Khay bên dưới để quét test ngay trên màn hình).
                  </span>
                </div>
              )}

              {/* Danh sách gợi ý nhặt FEFO */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                  <Box size={15} className="text-sky-600" />
                  <span>Danh Sách Gợi Ý Nhặt Hàng FEFO (Kèm QR Khay Kệ)</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Vị trí Khay / QR</th>
                        <th className="px-3 py-2.5">Dược phẩm &amp; Số lô</th>
                        <th className="px-3 py-2.5">Hạn dùng</th>
                        <th className="px-3 py-2.5 text-right">Đã nhặt / Yêu cầu</th>
                        <th className="px-3 py-2.5">Trạng thái dòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortPickingLines(selectedOrder.pickingList).map((line) => (
                        <tr key={line.lineId} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                                {line.suggestedLocation?.binCode || "—"}
                              </span>
                              {line.suggestedLocation?.binCode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQrPreview({
                                      code: line.suggestedLocation.binCode,
                                      title: `Mã QR Tem Khay: ${line.suggestedLocation.binCode}`,
                                      subtitle: `${line.medicineName} • Lô ${line.batchNo} • Barcode: ${line.medicineBarcode || "—"}`,
                                    })
                                  }
                                  className="p-1 rounded hover:bg-sky-100 text-sky-600 cursor-pointer"
                                  title="Hiện mã QR Tem Khay duy nhất để Mobile quét"
                                >
                                  <QrCode size={14} />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Khu {line.suggestedLocation?.zone} • Kệ {line.suggestedLocation?.rack} •
                              Tầng {line.suggestedLocation?.shelf} • Thùng {line.suggestedLocation?.bin}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">{line.medicineName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Lô: {line.batchNo}
                              {line.medicineBarcode && (
                                <span className="ml-2 text-slate-400">Barcode: {line.medicineBarcode}</span>
                              )}
                              {line.specialControlType && line.specialControlType > 0 ? (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-sans font-bold">
                                  KSĐB
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {line.expDate
                              ? new Date(line.expDate).toLocaleDateString("vi-VN")
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                            {line.pickedQty} / {line.requestedQty} {line.unit}
                          </td>
                          <td className="px-3 py-2.5">
                            {line.itemStatus === "PICKED" ? (
                              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                                Đủ số lượng
                              </span>
                            ) : line.itemStatus === "SHORTAGE" ? (
                              <div>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                                  Báo thiếu
                                </span>
                                {line.shortageReason && (
                                  <div className="text-[10px] text-amber-700 mt-0.5">
                                    {line.shortageReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                Chờ quét
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lịch sử quét nhặt & Nhật ký trả hàng */}
              {(selectedOrder.picks?.length > 0 || selectedOrder.returnLogs?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                    <h5 className="font-bold text-xs text-slate-700 mb-2">
                      Lịch sử Quét GS1 / Nhặt hàng ({selectedOrder.picks?.length || 0})
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                      {selectedOrder.picks?.map((pk: any, idx: number) => (
                        <div
                          key={pk.pickId || idx}
                          className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-800">
                              Lô {pk.batchNo} • Tote {pk.toteCode}
                            </div>
                            <div className="text-slate-400">
                              {pk.gs1Scanned ? (
                                <span className="text-sky-700 font-semibold">Quét GS1 chuẩn</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">
                                  Nhập tay: {pk.manualReason || "Không rõ"}
                                </span>
                              )}
                              {pk.fefoOverrideReason ? ` • Vượt FEFO: ${pk.fefoOverrideReason}` : ""}
                            </div>
                          </div>
                          <span className="font-mono font-black text-sky-700">+{pk.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                    <h5 className="font-bold text-xs text-slate-700 mb-2">
                      Nhật ký Trả hàng / Hủy nhặt ({selectedOrder.returnLogs?.length || 0})
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                      {selectedOrder.returnLogs?.length ? (
                        selectedOrder.returnLogs.map((rl: any, idx: number) => {
                          const oc = RETURN_OUTCOME_META[rl.outcome] || {
                            label: rl.outcome,
                            cls: "bg-slate-100 text-slate-700 border-slate-200",
                          };
                          return (
                            <div
                              key={rl.returnId || idx}
                              className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="font-mono font-bold text-slate-800">
                                  Lô {rl.batchNo} ({rl.qty} đv)
                                </div>
                                <div className="text-slate-400">{rl.note || "Trả hàng từ Tote"}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full border font-bold ${oc.cls}`}>
                                {oc.label}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-400 py-4 text-center">Chưa có lượt trả kệ nào.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer thao tác trong chi tiết */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              {(mode === "DIRECTOR_APPROVAL" || mode === "PIC_APPROVAL") &&
                selectedOrder.status === "PENDING_APPROVAL" && (
                  <>
                    {!getApprovalGuard(selectedOrder).canApprove && (
                      <span className="text-xs text-amber-700 font-semibold mr-auto">
                        {getApprovalGuard(selectedOrder).reason}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setRejectModalOrder(selectedOrder);
                        setRejectReason("");
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      Từ chối phiếu
                    </button>
                    <button
                      type="button"
                      disabled={!getApprovalGuard(selectedOrder).canApprove || submitting}
                      onClick={() => void handleApprove(selectedOrder)}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold cursor-pointer"
                    >
                      Phê duyệt xuất kho
                    </button>
                  </>
                )}

              {mode === "WAREHOUSE" && selectedOrder.status === "STAGED" && (
                <button
                  type="button"
                  onClick={() => setHandoverOrder(selectedOrder)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck size={14} />
                  <span>Xác nhận bàn giao xuất kho (Xuất bến)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lập Phiếu Xuất Kho Mới (TRANSFER từ PR / DISPOSE có BBH) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowCreateModal(false)}
          />
          <form
            onSubmit={(e) => void handleCreateSubmit(e)}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
          >
            <div className="p-5 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Lập Phiếu Xuất Kho Tổng Mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hệ thống tự tính đường đi FEFO và chờ Giám đốc / Dược sĩ PIC duyệt trước khi trừ kho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Chọn loại phiếu */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateType("TRANSFER")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    createType === "TRANSFER"
                      ? "bg-sky-50 border-sky-500 text-sky-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Truck size={14} className="text-sky-600" /> Điều chuyển chi nhánh (Từ PR)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Chọn từ danh sách PR chi nhánh gửi lên.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType("DISPOSE")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    createType === "DISPOSE"
                      ? "bg-rose-50 border-rose-500 text-rose-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <FileCheck2 size={14} className="text-rose-600" /> Xuất hủy dược phẩm (BBH)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Bắt buộc đính kèm Số Biên Bản Hủy GSP/GDP.
                  </div>
                </button>
              </div>

              {createType === "TRANSFER" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Chọn Yêu cầu cấp hàng từ Chi nhánh (PR)
                  </label>
                  {prLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Loader2 size={18} className="animate-spin mx-auto mb-1 text-emerald-600" />
                      Đang tải PR khả dụng...
                    </div>
                  ) : eligiblePrs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      Hiện chưa có yêu cầu PR nào ở trạng thái SUBMITTED hoặc CONSOLIDATED.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {eligiblePrs.map((pr) => (
                        <label
                          key={pr._id}
                          className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition ${
                            selectedPrId === pr._id
                              ? "bg-sky-50 border-sky-500"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="selectedPr"
                              checked={selectedPrId === pr._id}
                              onChange={() => setSelectedPrId(pr._id)}
                              className="mt-0.5"
                            />
                            <div>
                              <div className="font-mono font-bold text-xs text-slate-900">
                                {pr.prCode || `PR-${String(pr._id).slice(-6).toUpperCase()}`} —{" "}
                                {pr.branchName || pr.branchId}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {pr.items?.length || 0} mặt hàng • {pr.reason || "Cấp bổ sung tồn kho"}
                              </div>
                            </div>
                          </div>
                          {pr.isUrgent && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                              HỎA TỐC
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Số Biên Bản Hủy (Bắt buộc) *
                    </label>
                    <input
                      type="text"
                      value={disposalReportCode}
                      onChange={(e) => setDisposalReportCode(e.target.value)}
                      placeholder="VD: BBH-2026-001"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Danh sách thuốc cần xuất hủy
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDisposeItems((prev) => [...prev, { medicineId: "", quantity: 1 }])
                        }
                        className="text-xs font-bold text-sky-700 hover:underline cursor-pointer"
                      >
                        + Thêm dòng thuốc
                      </button>
                    </div>
                    {disposeItems.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={row.medicineId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDisposeItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, medicineId: val } : it))
                            );
                          }}
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="">-- Chọn dược phẩm kho tổng --</option>
                          {medicines.map((m) => (
                            <option key={m._id || m.id} value={m._id || m.id}>
                              {m.name} (Tồn: {m.stock ?? "—"} {m.unit || ""})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => {
                            const q = Math.max(1, Number(e.target.value) || 1);
                            setDisposeItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                            );
                          }}
                          className="w-24 px-3 py-2 text-xs border border-slate-200 rounded-xl text-right font-mono"
                        />
                        {disposeItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDisposeItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú thêm</label>
                    <textarea
                      rows={2}
                      value={disposalNotes}
                      onChange={(e) => setDisposalNotes(e.target.value)}
                      placeholder="Lý do hủy thuốc hết hạn / hư hỏng..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Gửi duyệt phiếu xuất</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Xác Nhận Bàn Giao Xuất Bến (STAGED -> DISPATCHED) */}
      {handoverOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setHandoverOrder(null)}
          />
          <form
            onSubmit={(e) => void handleConfirmHandover(e)}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="p-5 bg-blue-50 border-b border-blue-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Truck size={17} className="text-blue-600" /> Xác Nhận Bàn Giao Xuất Kho
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Phiếu <b className="font-mono">{handoverOrder.dispatchCode}</b> • Trừ kho chính thức &amp;
                giải phóng rổ Tote.
              </p>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên tài xế / Người nhận *
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Tài"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Biển số xe / Mã chành xe</label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="VD: 51D-678.90"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú vận chuyển</label>
                <textarea
                  rows={2}
                  value={carrierNote}
                  onChange={(e) => setCarrierNote(e.target.value)}
                  placeholder="Bảo quản lạnh 2-8°C, giao trong ngày..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHandoverOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={handoverBusy}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {handoverBusy && <Loader2 size={14} className="animate-spin" />}
                <span>Xuất bến ngay</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Từ Chối Phiếu (Director / PIC) */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setRejectModalOrder(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 bg-rose-50 border-b border-rose-100">
              <h3 className="font-black text-rose-900 text-sm">
                Từ Chối Phiếu {rejectModalOrder.dispatchCode}
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Thao tác sẽ giải phóng toàn bộ tồn giữ chỗ tạm trên kho tổng.
              </p>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Lý do từ chối (Bắt buộc) *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleRejectSubmit()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Phiếu (Thủ kho) */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setCancelModalOrder(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 bg-rose-50 border-b border-rose-100">
              <h3 className="font-black text-rose-900 text-sm">
                Hủy Phiếu {cancelModalOrder.dispatchCode}
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Giải phóng giữ chỗ reservedQty do chưa có sản phẩm nào được quét nhặt.
              </p>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú hủy</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Chi nhánh điều chỉnh lại số lượng PR..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCancelSubmit()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận hủy phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Danh Sách Giỏ Tote + QR Code */}
      {showToteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowToteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Quản Lý Giỏ Nhựa Tote Kho Tổng ({availableTotesCount}/{totes.length} sẵn sàng)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bấm vào bất kỳ giỏ nào để hiển thị mã QR cho máy quét Mobile PDA ghép đơn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowToteModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {totes.map((tote: ToteItem) => {
                const isFree = tote.status === "AVAILABLE";
                return (
                  <button
                    key={tote._id || tote.toteCode}
                    type="button"
                    onClick={() =>
                      setQrPreview({
                        code: tote.toteCode,
                        title: `Mã QR Giỏ ${tote.toteCode}`,
                        subtitle: isFree
                          ? "Giỏ đang trống — sẵn sàng quét ghép phiếu xuất kho."
                          : `Đang khóa cho phiếu ${tote.currentDispatchCode || "hiện tại"}`,
                      })
                    }
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 transition cursor-pointer ${
                      isFree
                        ? "bg-sky-50/70 border-sky-200 hover:bg-sky-100"
                        : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <QRCodeSVG value={tote.toteCode} size={72} level="M" includeMargin />
                    <div className="font-mono font-black text-xs text-slate-900">{tote.toteCode}</div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isFree ? "bg-sky-600 text-white" : "bg-amber-600 text-white"
                      }`}
                    >
                      {isFree ? "Sẵn sàng" : tote.currentDispatchCode || "Đang dùng"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Phóng To QR Code (Khay Kệ / Giỏ Tote) */}
      {qrPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs"
            onClick={() => setQrPreview(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-3 border border-slate-200">
            <button
              type="button"
              onClick={() => setQrPreview(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h4 className="font-black text-slate-900 text-base">{qrPreview.title}</h4>
            <p className="text-xs text-slate-500">{qrPreview.subtitle}</p>
            <div className="inline-block p-4 rounded-2xl bg-white border-2 border-sky-200 shadow-inner">
              <QRCodeSVG value={qrPreview.code} size={200} level="M" includeMargin />
            </div>
            <div className="font-mono font-black text-sm text-sky-700 tracking-wide">
              {qrPreview.code}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchOrdersPage;
