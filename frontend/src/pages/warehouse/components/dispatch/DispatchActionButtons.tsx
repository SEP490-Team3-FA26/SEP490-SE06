import React from "react";
import { CheckCircle2, Eye, Truck, XCircle } from "lucide-react";
import { DispatchOrder } from "../../../../services/inventory/dispatchOrder.service";

interface DispatchActionButtonsProps {
  order: DispatchOrder;
  mode: "WAREHOUSE" | "DIRECTOR_APPROVAL" | "PIC_APPROVAL";
  guard: { canApprove: boolean; reason: string };
  canApproveHere: boolean;
  canWarehouseCancel: boolean;
  submitting: boolean;
  onApprove: (order: DispatchOrder) => void;
  onReject: (order: DispatchOrder) => void;
  onHandover: (order: DispatchOrder) => void;
  onCancel: (order: DispatchOrder) => void;
  onOpenDetail: (order: DispatchOrder) => void;
}

/**
 * Cụm nút thao tác xử lý phiếu xuất (Duyệt, Từ chối, Xuất bến, Hủy, Xem chi tiết)
 * Dùng chung cho cả Chế độ xem Thẻ (Cards View) và Bảng (Table View)
 */
export const DispatchActionButtons: React.FC<DispatchActionButtonsProps> = ({
  order,
  mode,
  guard,
  canApproveHere,
  canWarehouseCancel,
  submitting,
  onApprove,
  onReject,
  onHandover,
  onCancel,
  onOpenDetail,
}) => {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canApproveHere && (
        <>
          <button
            type="button"
            disabled={!guard.canApprove || submitting}
            title={guard.reason || "Phê duyệt phiếu xuất kho"}
            onClick={() => void onApprove(order)}
            className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
          >
            <CheckCircle2 size={11} /> Duyệt
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onReject(order)}
            className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer hover:bg-rose-100"
          >
            Từ chối
          </button>
        </>
      )}

      {mode === "WAREHOUSE" && order.status === "STAGED" && (
        <button
          type="button"
          onClick={() => onHandover(order)}
          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
        >
          <Truck size={11} /> Xuất bến
        </button>
      )}

      {canWarehouseCancel && (
        <button
          type="button"
          onClick={() => onCancel(order)}
          className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
          title="Hủy phiếu"
        >
          <XCircle size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={() => void onOpenDetail(order)}
        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
      >
        <Eye size={12} />
        <span>Chi tiết</span>
      </button>
    </div>
  );
};

