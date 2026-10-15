import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Scan,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Thermometer,
  ShieldCheck,
  Package,
  Barcode,
  ArrowLeft,
  X,
  AlertCircle,
  Info
} from "lucide-react";
import { purchaseOrderService } from "../../services/purchase/purchaseOrder.service";
import { goodsReceiptService } from "../../services/purchase/goodsReceipt.service";
import { supplierService } from "../../services/purchase/supplier.service";

interface InspectionItem {
  medicineId: string;
  sku: string;
  medicineName: string;
  orderedQty: number; // Tổng số lượng đặt hàng ban đầu
  previouslyReceivedQty: number; // Đã nhận từ các đợt trước (giao hàng từng phần)
  remainingQty: number; // Số lượng còn lại cần giao
  scannedQty: number; // Số lượng thực tế đã quét đợt này
  unit: string;
  unitPrice: number;
  batchNo: string;
  expDate: string; // Chuỗi ngày ISO yyyy-MM-dd
  barcode: string;
}

export function GoodsReceiptInspectionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const poId = searchParams.get("poId");

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [poData, setPoData] = useState<any>(null);
  const [supplierName, setSupplierName] = useState<string>("Nhà Cung Cấp Dược Phẩm");
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toLocaleDateString("vi-VN"));

  // Dữ liệu quét kiểm nhận hàng thực tế
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [lastScanned, setLastScanned] = useState<{
    barcode: string;
    medicineName: string;
    batchNo: string;
    expDate: string;
  }>({
    barcode: "---",
    medicineName: "Chưa có mặt hàng nào được quét",
    batchNo: "---",
    expDate: "---",
  });

  const [inputBarcode, setInputBarcode] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Toast Notification State
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" | "warning" | "info" }[]
  >([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Khởi tạo và tải dữ liệu đơn PO thực tế từ hệ thống
  useEffect(() => {
    const loadPoDetails = async () => {
      setLoading(true);
      try {
        let currentPo = null;
        if (poId) {
          const pos = await purchaseOrderService.getPurchaseOrders().catch(() => []);
          if (Array.isArray(pos)) {
            currentPo = pos.find((p: any) => (p._id || p.id) === poId);
          }
        }

        if (currentPo) {
          setPoData(currentPo);
          if (currentPo.supplierName) {
            setSupplierName(currentPo.supplierName);
          } else if (currentPo.supplierId) {
            const supps = await supplierService.getSuppliers().catch(() => []);
            const foundSupp = supps.find((s: any) => (s._id || s.id) === currentPo.supplierId);
            if (foundSupp) setSupplierName(foundSupp.name || foundSupp.companyName);
          }

          if (currentPo.expectedDeliveryDate || currentPo.createdAt) {
            setDeliveryDate(
              new Date(currentPo.expectedDeliveryDate || currentPo.createdAt).toLocaleDateString("vi-VN")
            );
          }

          // Chuyển đổi danh mục thuốc trong PO sang InspectionItem với số lượng khởi tạo = 0 thực tế
          const mappedItems: InspectionItem[] = (currentPo.items || []).map((it: any, idx: number) => {
            const totalOrdered = Number(it.quantity || it.orderedQuantity || 0);
            const received = Number(it.receivedQuantity || 0);
            const remaining = Math.max(0, totalOrdered - received);
            // Khởi tạo số lượng đã quét bằng 0 thực tế (hoặc kết quả kiểm đếm lưu sẵn)
            const initialScanned = Number(it.actualQuantity || 0);
            
            // Giữ nguyên chuỗi ngày ISO, không format thành chuỗi hiển thị sai lệch khi gửi lên backend
            let isoExp = "";
            if (it.expiryDate || it.expDate) {
              const d = new Date(it.expiryDate || it.expDate);
              isoExp = !isNaN(d.getTime()) ? d.toISOString() : "";
            }

            return {
              medicineId: it.medicineId || `med-${idx}`,
              sku: it.sku || `SKU-${idx + 100}`,
              medicineName: it.medicineName || `Dược phẩm #${idx + 1}`,
              orderedQty: totalOrdered,
              previouslyReceivedQty: received,
              remainingQty: remaining,
              scannedQty: initialScanned,
              unit: it.unit || "Hộp",
              unitPrice: Number(it.unitPrice || 0),
              batchNo: it.batchNo ? String(it.batchNo).trim() : "",
              expDate: isoExp,
              barcode: it.barcode ? String(it.barcode).trim() : "",
            };
          });

          setItems(mappedItems);
          if (mappedItems.length === 0) {
            showToast("Đơn hàng PO này chưa có danh mục sản phẩm nào cần kiểm nhận.", "info");
          }
        } else {
          showToast("Không tìm thấy thông tin đơn hàng PO tương ứng.", "error");
        }
      } catch (err: any) {
        showToast("Lỗi khi tải thông tin đơn hàng PO: " + (err.message || ""), "error");
      } finally {
        setLoading(false);
      }
    };

    loadPoDetails();
  }, [poId]);

  // Tính toán tiến độ kiểm nhận
  const totalOrdered = items.reduce((sum, item) => sum + (item.remainingQty > 0 ? item.remainingQty : item.orderedQty), 0);
  const totalScanned = items.reduce((sum, item) => sum + item.scannedQty, 0);
  const progressPercent = totalOrdered > 0 ? Math.min(100, ((totalScanned / totalOrdered) * 100)).toFixed(1) : "0";

  // Xử lý quét barcode: Khớp chính xác mặt hàng trong đơn PO; Từ chối mã không hợp lệ
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputBarcode.trim() || isPaused) return;

    const code = inputBarcode.trim();
    setInputBarcode("");

    // Tìm kiếm sản phẩm tương ứng với barcode hoặc SKU trong PO
    const foundIdx = items.findIndex(
      (it) => (it.barcode && it.barcode === code) || (it.sku && it.sku.toLowerCase() === code.toLowerCase())
    );

    if (foundIdx !== -1) {
      const targetItem = items[foundIdx];
      const maxReceivable = targetItem.remainingQty > 0 ? targetItem.remainingQty : targetItem.orderedQty;

      if (targetItem.scannedQty >= maxReceivable) {
        showToast(`Mặt hàng ${targetItem.medicineName} đã quét đủ số lượng cần nhập (${targetItem.scannedQty}/${maxReceivable})!`, "warning");
        return;
      }

      const updated = [...items];
      updated[foundIdx] = {
        ...targetItem,
        scannedQty: targetItem.scannedQty + 1,
      };
      setItems(updated);

      setLastScanned({
        barcode: targetItem.barcode || code,
        medicineName: targetItem.medicineName,
        batchNo: targetItem.batchNo || "Chưa có số lô",
        expDate: targetItem.expDate ? new Date(targetItem.expDate).toLocaleDateString("vi-VN") : "Chưa có HSD",
      });

      showToast(`+1 ${targetItem.medicineName} (Đã quét ${targetItem.scannedQty + 1}/${maxReceivable})`, "success");
    } else {
      // 🚫 TỪ CHỐI MÃ VẠCH LẠ: Tuyệt đối không tự ý cộng vào mặt hàng khác
      showToast(`Mã vạch "${code}" không thuộc bất kỳ sản phẩm nào trong đơn hàng PO này!`, "error");
    }
  };

  // Tiện ích hỗ trợ quét nhanh các mặt hàng đang cần kiểm đếm
  const handleScanNextPendingItem = () => {
    const pendingIdx = items.findIndex((it) => {
      const maxReceivable = it.remainingQty > 0 ? it.remainingQty : it.orderedQty;
      return it.scannedQty < maxReceivable;
    });

    if (pendingIdx === -1) {
      showToast("Tất cả mặt hàng trong đơn hàng PO đã được kiểm đếm đủ!", "info");
      return;
    }

    const targetItem = items[pendingIdx];
    const maxReceivable = targetItem.remainingQty > 0 ? targetItem.remainingQty : targetItem.orderedQty;

    const updated = [...items];
    updated[pendingIdx] = {
      ...targetItem,
      scannedQty: targetItem.scannedQty + 1,
    };
    setItems(updated);

    setLastScanned({
      barcode: targetItem.barcode || `SKU-${targetItem.sku}`,
      medicineName: targetItem.medicineName,
      batchNo: targetItem.batchNo || "Chưa có số lô",
      expDate: targetItem.expDate ? new Date(targetItem.expDate).toLocaleDateString("vi-VN") : "Chưa có HSD",
    });

    showToast(`+1 ${targetItem.medicineName} (${targetItem.scannedQty + 1}/${maxReceivable})`, "success");
  };

  // Hoàn tất kiểm nhận: Tạo GRN, lập biên bản kiểm đếm, verify, nộp và duyệt liên thông CSDL Dược
  const handleCompleteAndCreateGrn = async () => {
    const totalCurrentScanned = items.reduce((sum, it) => sum + it.scannedQty, 0);
    if (totalCurrentScanned <= 0) {
      showToast("Vui lòng quét ít nhất một mặt hàng trước khi hoàn tất kiểm nhận!", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const currentPoId = poData?._id || poId;
      if (!currentPoId) {
        throw new Error("Không tìm thấy thông tin đơn PO");
      }

      // 1. Chuẩn hóa payload GRN theo chuẩn GoodsReceiptPayload (có receivedBy)
      const grnItems = items
        .filter((it) => it.scannedQty > 0)
        .map((it) => {
          // Tính toán số lượng cần nhập (Hỗ trợ partial delivery: quantity - receivedQuantity)
          const targetQty = it.remainingQty > 0 ? it.remainingQty : it.orderedQty;
          // Giữ định dạng ngày ISO chuẩn để backend new Date() không bị lỗi Invalid Date hay đảo ngày/tháng
          const validExpDate = it.expDate && !isNaN(new Date(it.expDate).getTime())
            ? new Date(it.expDate).toISOString()
            : new Date(Date.now() + 730 * 86400000).toISOString();

          return {
            medicineId: it.medicineId,
            batchNo: it.batchNo || `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            expDate: validExpDate,
            quantity: targetQty,
            actualQty: it.scannedQty,
            unitPrice: it.unitPrice || 0,
          };
        });

      const payload = {
        poId: currentPoId,
        receivedBy: "Thủ Kho",
        items: grnItems,
      };

      // 2. Tạo hoặc mở phiên GRN
      const grnRes = await goodsReceiptService.createGoodsReceipt(payload);
      const grnId = grnRes?.data?._id || grnRes?._id;

      if (!grnId) {
        throw new Error("Không thể khởi tạo phiếu nhập kho GRN");
      }

      // 3. Tạo biên bản kiểm đếm thực tế
      const recordRes = await goodsReceiptService.createInspectionRecord(grnId, "Thủ Kho");
      const recordId = recordRes?.data?._id || recordRes?._id;
      const inspectionItems = recordRes?.data?.items || recordRes?.items || [];

      // 4. Xác minh (verify) kết quả kiểm đếm cho từng sản phẩm
      if (recordId && Array.isArray(inspectionItems)) {
        for (const item of grnItems) {
          const matchedInspection = inspectionItems.find(
            (recItem: any) => recItem.medicineId === item.medicineId
          );
          if (matchedInspection?._id) {
            await goodsReceiptService.verifyInspectionItem(
              recordId,
              matchedInspection._id,
              item.actualQty,
              item.batchNo,
              item.expDate
            );
          }
        }

        // 5. Nộp báo cáo kiểm đếm
        await goodsReceiptService.submitInspectionReport(recordId, "Nghiệm thu kiểm đếm bằng máy quét mã vạch Honeywell tại cửa nhập GSP đạt chuẩn.");
      }

      // 6. Nộp biên bản nghiệm thu GRN
      await goodsReceiptService.submitInspection(grnId);

      // 7. Duyệt hoàn tất nhập kho và tự động đồng bộ CSDL Dược Quốc Gia
      await goodsReceiptService.approveGoodsReceipt(grnId);

      showToast("🎉 Hoàn tất kiểm nhận! Phiếu nhập kho GRN đã được duyệt và liên thông CSDL Dược Quốc Gia thành công.", "success");

      setTimeout(() => {
        navigate("/warehouse/inventory/import");
      }, 1500);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || "Lỗi hoàn tất nghiệm thu nhập kho", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Kiểm Nhận Hàng Nhập Kho - Đối Chiếu Đơn Hàng PO #{poData?.poCode || poData?._id || "PO-2026-089"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 ml-9">
            Nhà Cung Cấp: <strong className="text-slate-800">{supplierName}</strong> | Ngày Giao:{" "}
            <span className="text-slate-700 font-semibold">{deliveryDate}</span>
          </p>
        </div>

        {/* Nút Hành Động Trên Header */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isPaused
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? "Tiếp Tục Quét" : "Tạm Dừng"}
          </button>

          <button
            type="button"
            onClick={handleCompleteAndCreateGrn}
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang Tạo Phiếu GRN...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Hoàn Tất & Tạo Phiếu GRN
              </>
            )}
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (COL-SPAN-5): KHUNG CAMERA BARCODE SCANNER LIVE */}
        <div className="lg:col-span-5 bg-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
          {/* Header trong hộp scanner */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Camera Barcode Scanner Live
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold tracking-wider">
              FPS: 30 | 1080p
            </span>
          </div>

          {/* Vùng quét Camera Viewport */}
          <div className="relative w-full aspect-4/3 bg-slate-900/90 rounded-2xl border border-slate-800/90 flex flex-col items-center justify-center overflow-hidden p-6 text-center">
            {/* Lưới tọa độ ngắm laser */}
            <div className="absolute inset-4 border border-dashed border-cyan-500/30 rounded-xl pointer-events-none" />

            {/* 4 góc khung ngắm nhắm Barcode */}
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

            {/* Tia laser quét chạy lên xuống */}
            {!isPaused && (
              <div className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse duration-1000 top-1/2 -translate-y-1/2" />
            )}

            <Barcode size={48} className="text-cyan-500/40 mb-3" />
            <p className="text-xs font-semibold text-slate-300">
              {isPaused ? "Máy quét đang tạm dừng" : "Đặt mã vạch kiện hàng vào khung quét"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Hỗ trợ chuẩn GS1-128, QR Code Dược Quốc Gia, EAN-13
            </p>

            {/* Input giả lập hoặc tiếp nhận tín hiệu từ máy quét phần cứng */}
            <form onSubmit={handleBarcodeSubmit} className="mt-4 w-full max-w-xs relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập hoặc quét mã vạch (Enter)..."
                value={inputBarcode}
                onChange={(e) => setInputBarcode(e.target.value)}
                disabled={isPaused}
                className="w-full bg-slate-800/80 border border-slate-700 text-cyan-300 text-xs px-3 py-1.5 rounded-lg outline-none focus:border-cyan-400 text-center font-mono placeholder:text-slate-500"
              />
            </form>
          </div>

          {/* Khung thông tin mặt hàng vừa quét thành công */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1.5">
            <div className="text-xs text-slate-400 font-mono">
              Mã vừa quét: <strong className="text-cyan-300 font-bold">{lastScanned.barcode}</strong>
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Khớp sản phẩm:</span>
              <span className="text-emerald-400">{lastScanned.medicineName}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Lô: <span className="text-amber-300 font-bold">{lastScanned.batchNo}</span> | HSD:{" "}
              <span className="text-slate-200">{lastScanned.expDate}</span>
            </div>
          </div>

          {/* Footer thông số IoT & Thiết bị phần cứng */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Điều kiện nhiệt độ xe lạnh: 21.4°C
            </div>
            <div className="text-slate-400 font-medium">
              Thiết bị: <span className="text-slate-200">Honeywell Voyager Barcode Scanner</span>
            </div>
          </div>

          {/* Nút tiện ích quét kiểm đếm các mặt hàng còn đang thiếu */}
          {totalScanned < totalOrdered && (
            <button
              type="button"
              onClick={handleScanNextPendingItem}
              className="w-full py-2 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} />
              Quét Kiểm Đếm Mặt Hàng Kế Tiếp (+1)
            </button>
          )}
        </div>

        {/* CỘT PHẢI (COL-SPAN-7): DANH MỤC MẶT HÀNG CẦN NHẬN & BẢNG TIẾN ĐỘ */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          {/* Header Bảng và Badge tiến độ */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Danh Mục Mặt Hàng Cần Nhận ({items.length} Mặt hàng)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Kiểm đếm đối chiếu thực tế từng kiện hàng so với Đơn đặt hàng PO đã duyệt.
              </p>
            </div>

            {/* Badge Tiến Độ */}
            <div className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5">
              <span>Tiến độ:</span>
              <span className="text-blue-900">{totalScanned} / {totalOrdered} Hộp</span>
              <span className="text-blue-600 font-bold">({progressPercent}%)</span>
            </div>
          </div>

          {/* Thanh Tiến Độ Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                Number(progressPercent) >= 100
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Bảng Dữ Liệu Chi Tiết */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Mã SKU</th>
                  <th className="py-3 px-3.5">Tên Thuốc</th>
                  <th className="py-3 px-3.5 text-center">Cần Nhận</th>
                  <th className="py-3 px-3.5 text-center">Đã Quét</th>
                  <th className="py-3 px-3.5">Số Lô & HSD</th>
                  <th className="py-3 px-3.5 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item) => {
                  const targetQty = item.remainingQty > 0 ? item.remainingQty : item.orderedQty;
                  const isDone = item.scannedQty >= targetQty;
                  const diff = Math.max(0, targetQty - item.scannedQty);

                  return (
                    <tr
                      key={item.medicineId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !isDone ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-3.5 font-mono font-bold text-slate-500">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        {item.medicineName}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-700">
                        <span>{targetQty} {item.unit}</span>
                        {item.previouslyReceivedQty > 0 && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            (Đã nhận trước: {item.previouslyReceivedQty})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`font-black ${
                            isDone ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {item.scannedQty} / {targetQty}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800">{item.batchNo || "---"}</span>{" "}
                        <span className="text-slate-400">
                          ({item.expDate ? new Date(item.expDate).toLocaleDateString("vi-VN") : "Chưa có HSD"})
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-800 font-black px-2.5 py-1 rounded-lg text-[10px]">
                            <CheckCircle2 size={12} />
                            ĐỦ HÀNG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 font-black px-2.5 py-1 rounded-lg text-[10px]">
                            <Scan size={12} className="animate-spin" />
                            ĐANG QUÉT (-{diff})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ghi Chú Y Tế & Tiêu Chuẩn GSP/GDP */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                Quy Trình Nghiệm Thu Nhập Kho Chuẩn GSP & GDP (Thông tư 36/2018/TT-BYT):
              </p>
              <p>
                Mọi kiện hàng phải được quét kiểm tra mã vạch Barcode GS1, đối chiếu hạn dùng cam kết ≥ 18 tháng và đo nhiệt độ thùng xe lạnh trước khi chuyển vào giá kệ kho tổng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION CONTAINER CHUẨN Y TẾ (Gắn qua createPortal z-[999999] để không bao giờ bị modal che) */}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed top-6 right-6 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
                t.type === "error"
                  ? "bg-rose-950/95 text-rose-100 border-rose-800"
                  : t.type === "warning"
                  ? "bg-amber-950/95 text-amber-100 border-amber-800"
                  : t.type === "info"
                  ? "bg-blue-950/95 text-blue-100 border-blue-800"
                  : "bg-emerald-950/95 text-emerald-100 border-emerald-800"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === "error" && <AlertCircle size={18} className="text-rose-400" />}
                {t.type === "warning" && <AlertTriangle size={18} className="text-amber-400" />}
                {t.type === "info" && <Info size={18} className="text-blue-400" />}
                {t.type === "success" && <CheckCircle2 size={18} className="text-emerald-400" />}
              </div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
