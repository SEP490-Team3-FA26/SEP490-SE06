import React from "react";
import { Box, Loader2, QrCode, Truck, X } from "lucide-react";
import { DispatchOrder } from "../../../../services/inventory/dispatchOrder.service";
import { QrPreviewData } from "./QrZoomModal";
import {
  STATUS_META,
  RETURN_OUTCOME_META,
  sortPickingLines,
} from "./dispatchConstants";

interface DispatchDetailDrawerProps {
  order: DispatchOrder | null;
  detailLoading: boolean;
  mode: "WAREHOUSE" | "DIRECTOR_APPROVAL" | "PIC_APPROVAL";
  submitting: boolean;
  canApprove: boolean;
  approvalReason: string;
  onClose: () => void;
  onOpenQr: (qr: QrPreviewData) => void;
  onReject: (order: DispatchOrder) => void;
  onApprove: (order: DispatchOrder) => void;
  onHandover: (order: DispatchOrder) => void;
}

/**
 * Modal / Drawer xem toàn bộ chi tiết Phiếu Xuất Kho Tổng, tiến độ quét nhặt FEFO và nhật ký bàn giao
 */
export const DispatchDetailDrawer: React.FC<DispatchDetailDrawerProps> = ({
  order,
  detailLoading,
  mode,
  submitting,
  canApprove,
  approvalReason,
  onClose,
  onOpenQr,
  onReject,
  onApprove,
  onHandover,
}) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header chi tiết */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono font-black text-lg text-slate-900">
                {order.dispatchCode}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  (STATUS_META[order.status] || STATUS_META.PENDING_APPROVAL).badgeClass
                }`}
              >
                {(STATUS_META[order.status] || STATUS_META.PENDING_APPROVAL).label}
              </span>
              {order.hasControlledDrugs && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                  KSĐB — PIC duyệt
                </span>
              )}
              {detailLoading && <Loader2 size={14} className="animate-spin text-emerald-600" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {order.type === "DISPOSE"
                ? `Phiếu xuất hủy • Biên bản ${order.disposalReportCode || "—"}`
                : `Xuất điều chuyển → ${
                    order.toBranchName || order.toBranchId || "Chi nhánh"
                  }${order.referenceCode ? ` • Tham chiếu PR: ${order.referenceCode}` : ""}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                {order.createdByName || "Thủ kho"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Người phê duyệt
              </span>
              <span className="font-bold text-slate-800">
                {order.approvedByName || "Chưa duyệt"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Vận đơn StockTransfer
              </span>
              <span className="font-mono font-bold text-sky-700">
                {order.stockTransferCode || "Sinh khi xuất bến"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Giỏ Tote gắn phiếu
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {order.toteCodes?.length ? (
                  order.toteCodes.map((tc) => (
                    <button
                      key={tc}
                      type="button"
                      onClick={() =>
                        onOpenQr({
                          code: tc,
                          title: `Mã QR Giỏ Tote ${tc}`,
                          subtitle: `Dùng PDA quét mã này để ghép/đối chiếu rổ đựng hàng cho ${order.dispatchCode}`,
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

          {order.rejectedReason && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <b>Lý do từ chối / hủy:</b> {order.rejectedReason}
            </div>
          )}

          {order.handoverRecipient?.driverName && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex flex-wrap gap-4">
              <span>
                <b>Tài xế nhận hàng:</b> {order.handoverRecipient.driverName}
              </span>
              {order.handoverRecipient.vehiclePlate && (
                <span>
                  <b>Biển số xe:</b> {order.handoverRecipient.vehiclePlate}
                </span>
              )}
              {order.handoverRecipient.carrierNote && (
                <span>
                  <b>Ghi chú bàn giao:</b> {order.handoverRecipient.carrierNote}
                </span>
              )}
            </div>
          )}

          {/* Hướng dẫn quy trình PDA */}
          {["APPROVED", "PICKING"].includes(order.status) && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
              <QrCode size={16} className="text-sky-700 shrink-0" />
              <span>
                <b>Hướng dẫn thực địa:</b> Thủ kho dùng Mobile App PDA tại kho, chọn phiếu{" "}
                <b>{order.dispatchCode}</b> để quét QR Khay kệ &amp; DataMatrix GS1 từng
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
                  {sortPickingLines(order.pickingList).map((line) => (
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
                                onOpenQr({
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
          {(order.picks && order.picks.length > 0 || (order.returnLogs && order.returnLogs.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                <h5 className="font-bold text-xs text-slate-700 mb-2">
                  Lịch sử Quét GS1 / Nhặt hàng ({order.picks?.length || 0})
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                  {order.picks?.map((pk: any, idx: number) => (
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
                  Nhật ký Trả hàng / Hủy nhặt ({order.returnLogs?.length || 0})
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                  {order.returnLogs?.length ? (
                    order.returnLogs.map((rl: any, idx: number) => {
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
            order.status === "PENDING_APPROVAL" && (
              <>
                {!canApprove && (
                  <span className="text-xs text-amber-700 font-semibold mr-auto">
                    {approvalReason}
                  </span>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onReject(order)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                >
                  Từ chối phiếu
                </button>
                <button
                  type="button"
                  disabled={!canApprove || submitting}
                  onClick={() => onApprove(order)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold cursor-pointer"
                >
                  Phê duyệt xuất kho
                </button>
              </>
            )}

          {mode === "WAREHOUSE" && order.status === "STAGED" && (
            <button
              type="button"
              onClick={() => onHandover(order)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Truck size={14} />
              <span>Xác nhận bàn giao xuất kho (Xuất bến)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

