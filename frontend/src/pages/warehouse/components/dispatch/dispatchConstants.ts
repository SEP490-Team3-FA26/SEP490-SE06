import { DispatchPickingLine } from "../../../../services/inventory/dispatchOrder.service";

/** Cấu hình nhãn và màu trạng thái (Tuân thủ Zero-Green Policy: dùng Auth Blue/Indigo/Amber/Rose) */
export const STATUS_META: Record<
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

export const RETURN_OUTCOME_META: Record<string, { label: string; cls: string }> = {
  RESTOCK: { label: "Hoàn kệ", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  DAMAGED: { label: "Hư hỏng / Vỡ", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  QUARANTINE: { label: "Cách ly chờ xử lý", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export const FILTER_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "PICKING", label: "Đang nhặt" },
  { key: "STAGED", label: "Chờ bàn giao" },
  { key: "DISPATCHED", label: "Đã xuất" },
  { key: "PARTIALLY_DISPATCHED", label: "Thiếu hàng" },
  { key: "CANCELLED", label: "Đã hủy" },
];

/** Sắp xếp pickingList theo vị trí vật lý kệ kho (Zone -> Rack -> Shelf -> Bin) */
export const sortPickingLines = (lines: DispatchPickingLine[] = []): DispatchPickingLine[] => {
  return [...lines].sort((a, b) => {
    const la = a.suggestedLocation;
    const lb = b.suggestedLocation;
    if (!la || !lb) return 0;
    if (la.zone !== lb.zone) return String(la.zone).localeCompare(String(la.zone));
    if (la.rack !== lb.rack) return String(la.rack).localeCompare(String(lb.rack));
    if (la.shelf !== lb.shelf) return Number(la.shelf) - Number(lb.shelf);
    return Number(la.bin) - Number(lb.bin);
  });
};

