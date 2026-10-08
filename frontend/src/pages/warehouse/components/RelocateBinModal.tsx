import React, { useState, useEffect } from "react";
import {
  X, ArrowLeftRight, Check, AlertTriangle,
  Loader2, Package, MapPin, CheckCircle2,
  Boxes, Info, Layers
} from "lucide-react";
import { inventoryMapService, ShelfLayout, BinData } from "../../../services/inventory/inventoryMap.service";

export interface RelocateBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLocation: {
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
  };
  medicineId?: string;
  medicineName?: string;
  unit?: string;
  currentStock?: number;
  batchId?: string;
  batchNo?: string;
  onSuccess?: () => void;
}

const ZONE_OPTIONS = [
  { value: "A", label: "Khu A" },
  { value: "B", label: "Khu B" },
  { value: "C", label: "Khu C" },
  { value: "D", label: "Khu D" },
  { value: "E", label: "Khu E" },
  { value: "F", label: "Khu F" },
];

export function RelocateBinModal({
  isOpen,
  onClose,
  sourceLocation,
  medicineId,
  medicineName,
  unit = "Hộp",
  currentStock = 0,
  batchId,
  batchNo,
  onSuccess,
}: RelocateBinModalProps) {
  // Trạng thái chọn vị trí đích
  const [targetZone, setTargetZone] = useState<string>(sourceLocation.zone || "A");
  const [targetRack, setTargetRack] = useState<string>(sourceLocation.rack || "A1");
  const [targetShelf, setTargetShelf] = useState<number>(sourceLocation.shelf || 1);
  const [targetBin, setTargetBin] = useState<number | null>(null);

  const [reason, setReason] = useState<string>("Dồn kho, sắp xếp lại kệ hàng");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingLayout, setLoadingLayout] = useState<boolean>(false);
  const [shelfLayouts, setShelfLayouts] = useState<ShelfLayout[]>([]);
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

  // Tải sơ đồ kệ đích khi targetZone hoặc targetRack thay đổi
  useEffect(() => {
    if (!isOpen) return;
    setLoadingLayout(true);
    inventoryMapService
      .getShelfLayout(targetZone, targetRack)
      .then((data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data || []);
        setShelfLayouts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error("Lỗi lấy layout kệ đích:", err);
        setShelfLayouts([]);
      })
      .finally(() => setLoadingLayout(false));
  }, [isOpen, targetZone, targetRack]);

  // Cập nhật rack options khi targetZone thay đổi
  const rackOptions = Array.from({ length: 4 }, (_, i) => `${targetZone}${i + 1}`);

  useEffect(() => {
    // Reset rack khi đổi zone nếu rack không thuộc zone đó
    if (!targetRack.startsWith(targetZone)) {
      setTargetRack(`${targetZone}1`);
      setTargetBin(null);
    }
  }, [targetZone]);

  if (!isOpen) return null;

  // Lấy dữ liệu 10 thùng của Tầng đang chọn
  const currentShelfData = shelfLayouts.find((s) => s.shelfNo === targetShelf);
  const targetBins = currentShelfData?.bins || [];

  const handleConfirm = async () => {
    if (!targetBin) {
      showToast("Vui lòng chọn Ô Thùng đích muốn chuyển đến!", "warning");
      return;
    }

    // Kiểm tra trùng nguồn
    if (
      targetZone === sourceLocation.zone &&
      targetRack === sourceLocation.rack &&
      targetShelf === sourceLocation.shelf &&
      targetBin === sourceLocation.bin
    ) {
      showToast("Vị trí đích không được trùng với vị trí nguồn hiện tại!", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await inventoryMapService.relocateBin({
        fromLocation: sourceLocation,
        toLocation: {
          zone: targetZone,
          rack: targetRack,
          shelf: targetShelf,
          bin: targetBin,
        },
        batchId: batchId || undefined,
        reason: reason || "Dồn kho",
      });

      showToast(
        `Đã gửi yêu cầu chuyển thuốc thành công! (Khu ${sourceLocation.zone}-${sourceLocation.rack}-T${sourceLocation.shelf}-B${sourceLocation.bin} ➔ Khu ${targetZone}-${targetRack}-T${targetShelf}-B${targetBin})`,
        "success"
      );

      // Delay 1000ms để Kafka consumer ghi DB xong trước khi re-fetch (tránh race condition)
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }

      // Tự động đóng modal sau khi hiển thị toast thành công
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || "Lỗi khi chuyển vị trí", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] max-w-md animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold ${
              toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : toast.type === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            ) : toast.type === "warning" ? (
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Chuyển Ô / Dồn Kho Thuốc
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dời vị trí hoặc dồn các lô thuốc cùng loại giữa các thùng theo chuẩn GSP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar bg-slate-50/50 flex-1">
          {/* 1. Thẻ Vị Trí Nguồn */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-sky-500" /> Vị trí nguồn hiện tại
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
                Khu {sourceLocation.zone} · Kệ {sourceLocation.rack} · Tầng {sourceLocation.shelf} · Thùng {sourceLocation.bin}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <h4 className="font-bold text-sm text-slate-800">
                  {medicineName || "Thuốc trong thùng"}
                </h4>
                {batchNo && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Mã lô chuyển: <b className="font-mono text-sky-600">{batchNo}</b>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">Số lượng chuyển</div>
                <div className="text-base font-bold text-emerald-600 font-mono">
                  {currentStock.toLocaleString("vi-VN")}{" "}
                  <span className="text-xs font-normal text-slate-500">{unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Chọn Vị Trí Đích */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-amber-500" /> Chọn vị trí đích muốn chuyển đến
            </h4>

            {/* Bộ chọn Khu / Kệ / Tầng */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Khu vực (Zone)
                </label>
                <select
                  value={targetZone}
                  onChange={(e) => setTargetZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  {ZONE_OPTIONS.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Dãy Kệ (Rack)
                </label>
                <select
                  value={targetRack}
                  onChange={(e) => setTargetRack(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  {rackOptions.map((r) => (
                    <option key={r} value={r}>
                      Kệ {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tầng (Shelf 1..4)
                </label>
                <select
                  value={targetShelf}
                  onChange={(e) => {
                    setTargetShelf(Number(e.target.value));
                    setTargetBin(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  {[1, 2, 3, 4].map((s) => (
                    <option key={s} value={s}>
                      Tầng {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lưới 10 ô Thùng của Tầng đích */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Chọn Ô Thùng tại Kệ {targetRack} — Tầng {targetShelf}:
                </span>
                <span className="text-[11px] text-slate-400">
                  (Click ô để chọn vị trí)
                </span>
              </div>

              {loadingLayout ? (
                <div className="py-8 flex justify-center items-center text-xs text-slate-400 gap-2">
                  <Loader2 size={16} className="animate-spin text-amber-500" />
                  Đang tải thông tin các thùng...
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((binNo) => {
                    const binInfo = targetBins.find((b) => b.binNo === binNo);
                    const isEmpty = !binInfo || binInfo.status === "EMPTY" || !binInfo.medicineName;
                    const isSameMed =
                      Boolean(binInfo?.medicineName && medicineName &&
                      binInfo.medicineName.trim().toLowerCase() === medicineName.trim().toLowerCase());
                    const isSource =
                      targetZone === sourceLocation.zone &&
                      targetRack === sourceLocation.rack &&
                      targetShelf === sourceLocation.shelf &&
                      binNo === sourceLocation.bin;

                    const isConflict = !isEmpty && !isSameMed && !isSource;
                    const isSelected = targetBin === binNo;

                    let bgClass = "bg-white border-slate-200 text-slate-700 hover:border-amber-400";
                    let badgeText = "Trống";
                    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

                    if (isSource) {
                      bgClass = "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed";
                      badgeText = "Vị trí nguồn";
                      badgeClass = "bg-slate-200 text-slate-600";
                    } else if (isConflict) {
                      bgClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed";
                      badgeText = "Thuốc khác";
                      badgeClass = "bg-rose-50 text-rose-600 border-rose-200";
                    } else if (isSameMed) {
                      bgClass = isSelected
                        ? "bg-sky-100 border-sky-500 text-sky-800 ring-2 ring-sky-400/30"
                        : "bg-sky-50/70 border-sky-300 text-sky-800 hover:bg-sky-100";
                      badgeText = "Dồn kho (+)";
                      badgeClass = "bg-sky-100 text-sky-800 border-sky-300 font-bold";
                    } else if (isEmpty) {
                      bgClass = isSelected
                        ? "bg-emerald-100 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/30"
                        : "bg-emerald-50/40 border-emerald-200 text-emerald-800 hover:bg-emerald-50";
                      badgeText = "Ô trống";
                      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                    }

                    return (
                      <button
                        key={binNo}
                        type="button"
                        disabled={isSource || isConflict}
                        onClick={() => setTargetBin(binNo)}
                        className={`p-2.5 rounded-xl border flex flex-col items-start justify-between min-h-[64px] text-left transition relative ${bgClass}`}
                        title={
                          isConflict
                            ? `Đang chứa: ${binInfo?.medicineName}. Không thể dồn lẫn thuốc khác!`
                            : isSameMed
                            ? `Đang chứa cùng loại thuốc (${binInfo?.currentStock} ${unit}). Bấm để dồn kho!`
                            : `Thùng trống. Bấm để chuyển sang!`
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs font-bold">B{binNo}</span>
                          {isSelected && (
                            <CheckCircle2 size={13} className="text-amber-600" />
                          )}
                        </div>

                        <div className="mt-1 w-full">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border inline-block ${badgeClass}`}>
                            {badgeText}
                          </span>
                          {isSameMed && binInfo && (
                            <div className="text-[10px] text-sky-700 font-mono font-medium mt-1 truncate">
                              Có: {binInfo.currentStock} {unit}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chú thích màu sắc */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ô trống (Chuyển mới)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Cùng thuốc (Dồn kho)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Thuốc khác (Khóa)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Lý do chuyển */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú / Lý do chuyển
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do dồn kho..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {targetBin ? (
              <span>
                Đích đã chọn:{" "}
                <b className="text-slate-800">
                  Khu {targetZone} · Kệ {targetRack} · Tầng {targetShelf} · Thùng B{targetBin}
                </b>
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <Info size={13} /> Hãy chọn 1 ô thùng đích ở trên
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!targetBin || submitting}
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Đang chuyển...
                </>
              ) : (
                <>
                  <ArrowLeftRight size={13} /> Xác nhận chuyển vị trí
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
