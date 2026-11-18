import React, { useState } from "react";
import { Loader2, Truck, X } from "lucide-react";
import { DispatchOrder } from "../../../../services/inventory/dispatchOrder.service";

interface HandoverDispatchModalProps {
  order: DispatchOrder | null;
  onClose: () => void;
  onConfirm: (data: { driverName: string; vehiclePlate?: string; carrierNote?: string }) => Promise<void>;
  busy: boolean;
}

/**
 * Modal Xác Nhận Bàn Giao Xuất Bến (STAGED -> DISPATCHED)
 */
export const HandoverDispatchModal: React.FC<HandoverDispatchModalProps> = ({
  order,
  onClose,
  onConfirm,
  busy,
}) => {
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [carrierNote, setCarrierNote] = useState("");

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;
    await onConfirm({
      driverName: driverName.trim(),
      vehiclePlate: vehiclePlate.trim() || undefined,
      carrierNote: carrierNote.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Xác Nhận Xuất Bến & Bàn Giao Vận Chuyển
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-800">
            Phiếu xuất: <span className="font-mono font-bold">{order.dispatchCode}</span>
            {order.toBranchName && (
              <div>
                Đích đến: <span className="font-bold">{order.toBranchName}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Họ tên tài xế / Người nhận bàn giao <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Vận Chuyển"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Biển số xe</label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Ví dụ: 29C-123.45"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-mono uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Ghi chú vận đơn / Số niêm phong
            </label>
            <textarea
              rows={2}
              value={carrierNote}
              onChange={(e) => setCarrierNote(e.target.value)}
              placeholder="Ví dụ: Niêm phong seal xanh số 987654..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            <span>Xác nhận xuất kho</span>
          </button>
        </div>
      </form>
    </div>
  );
};

