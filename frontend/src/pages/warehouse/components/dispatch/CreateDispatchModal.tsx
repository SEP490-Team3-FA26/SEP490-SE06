import React, { useState, useEffect } from "react";
import { FileCheck2, Loader2, Truck, X } from "lucide-react";
import { purchaseRequisitionService } from "../../../../services/purchase/purchaseRequisition.service";
import { medicineService, Medicine } from "../../../../services/inventory/medicine.service";

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: any) => Promise<void>;
  submitting: boolean;
  notify: (type: "success" | "error", text: string) => void;
}

/**
 * Modal Lập Phiếu Xuất Kho Mới (TRANSFER từ PR / DISPOSE có BBH)
 */
export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  submitting,
  notify,
}) => {
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

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setPrLoading(true);

    Promise.all([
      purchaseRequisitionService.getPurchaseRequisitions(),
      medicineService
        .getBranchMedicines("CENTRAL_WH", { limit: 150 })
        .catch(() => medicineService.getMedicines({ directDb: true, limit: 150 })),
    ])
      .then(([prRes, medRes]) => {
        if (!mounted) return;
        const rawPrs = Array.isArray(prRes) ? prRes : prRes?.data || [];
        const filteredPrs = rawPrs.filter((pr: any) =>
          ["SUBMITTED", "CONSOLIDATED"].includes(pr.status)
        );
        setEligiblePrs(filteredPrs);
        if (filteredPrs.length > 0) {
          setSelectedPrId(filteredPrs[0]._id);
        }

        const rawMeds = Array.isArray(medRes) ? medRes : (medRes as any)?.data || [];
        setMedicines(rawMeds);
      })
      .catch((err: any) => {
        if (mounted) {
          notify("error", err?.message || "Không tải được danh sách yêu cầu PR hoặc thuốc kho tổng.");
        }
      })
      .finally(() => {
        if (mounted) setPrLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createType === "TRANSFER") {
      if (!selectedPrId) {
        notify("error", "Vui lòng chọn một Yêu cầu cấp hàng (PR) để lập phiếu xuất.");
        return;
      }
      await onCreate({ type: "TRANSFER", referenceId: selectedPrId });
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
      await onCreate({
        type: "DISPOSE",
        disposalReportCode: disposalReportCode.trim(),
        items: validItems.map((it) => ({
          medicineId: it.medicineId,
          quantity: Number(it.quantity),
        })),
        notes: disposalNotes.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
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
            onClick={onClose}
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
                        <option key={m._id || (m as any).id} value={m._id || (m as any).id}>
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
            onClick={onClose}
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
  );
};

