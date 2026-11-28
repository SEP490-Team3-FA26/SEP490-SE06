import React, { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { DispatchOrder } from "../../../../services/inventory/dispatchOrder.service";

interface RejectDispatchModalProps {
  order: DispatchOrder | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  submitting: boolean;
}

interface CancelDispatchModalProps {
  order: DispatchOrder | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  submitting: boolean;
}

/**
 * Modal Từ Chối Phiếu (Dành cho Giám đốc / Dược sĩ PIC)
 */
export const RejectDispatchModal: React.FC<RejectDispatchModalProps> = ({
  order,
  onClose,
  onConfirm,
  submitting,
}) => {
  const [reason, setReason] = useState("");

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
        <div className="flex items-center gap-2 text-rose-600">
          <ShieldAlert size={20} />
          <h3 className="font-bold text-slate-800 text-sm">
            Từ Chối Phiếu {order.dispatchCode}
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Vui lòng nhập lý do từ chối để thông báo cho Thủ kho và đơn vị yêu cầu PR.
        </p>
        <textarea
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do từ chối phê duyệt..."
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || !reason.trim()}
            onClick={() => void onConfirm(reason.trim())}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal Hủy Phiếu (Dành cho Thủ kho trước khi nhặt)
 */
export const CancelDispatchModal: React.FC<CancelDispatchModalProps> = ({
  order,
  onClose,
  onConfirm,
  submitting,
}) => {
  const [reason, setReason] = useState("");

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle size={20} />
          <h3 className="font-bold text-slate-800 text-sm">
            Hủy Phiếu {order.dispatchCode}
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Thủ kho chỉ có thể hủy phiếu khi chưa tiến hành nhặt món nào. Thao tác này sẽ giải
          phóng các giỏ Tote liên quan.
        </p>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do hủy phiếu (tùy chọn)..."
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onConfirm(reason.trim())}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            Xác nhận hủy phiếu
          </button>
        </div>
      </div>
    </div>
  );
};

