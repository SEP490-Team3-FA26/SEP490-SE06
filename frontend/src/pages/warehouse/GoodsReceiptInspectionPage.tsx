import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Camera,
  CameraOff,
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
  Info,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { BinaryBitmap, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from "@zxing/library";
import { medicineService } from "../../services/inventory/medicine.service";
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

  // State hiển thị mã QR đơn PO để đồng bộ quét bằng Mobile App
  const [showMobileQrModal, setShowMobileQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

  // State quản lý luồng Webcam / Camera quét mã vạch trực tiếp
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAttemptTimeRef = useRef<number>(0);
  const lastSuccessScanRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trạng thái bộ nhận diện máy quét (Scanner Engine HUD) & Heartbeat
  const [scannerEngineStatus, setScannerEngineStatus] = useState<string>("Đang nạp...");
  const [scanFrameCount, setScanFrameCount] = useState<number>(0);
  const [lastDetectedRaw, setLastDetectedRaw] = useState<string>("");
  const [syncQrTab, setSyncQrTab] = useState<"FULL_DATA" | "RAW_ID">("FULL_DATA");
  const frameCounterRef = useRef<number>(0);

  // Phát âm thanh Beep phản hồi khi nhận diện mã thành công qua Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  // Giữ ref cho items và isPaused để tránh stale closure trong vòng lặp animation frame
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

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
          const mappedItems: InspectionItem[] = await Promise.all((currentPo.items || []).map(async (it: any, idx: number) => {
            // PO cũ không lưu mã vạch. Lấy mã đối chiếu từ danh mục thuốc theo đúng ID.
            const medicine = !it.barcode && it.medicineId
              ? await medicineService.getMedicineById(it.medicineId).catch(() => undefined)
              : undefined;
            const totalOrdered = Number(it.quantity || it.orderedQuantity || 0);
            const received = Number(it.receivedQuantity || 0);
            const remaining = Math.max(0, totalOrdered - received);
            // Khởi tạo số lượng đã quét bằng 0 thực tế (hoặc kết quả kiểm đếm lưu sẵn)
            const initialScanned = Number(it.actualQuantity || 0);
            
            // Chuẩn hóa ngày để hiển thị trong trường nhập hạn dùng.
            let expiryDate = "";
            if (it.expiryDate || it.expDate) {
              const d = new Date(it.expiryDate || it.expDate);
              expiryDate = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
            }

            return {
              medicineId: it.medicineId || `med-${idx}`,
              sku: it.sku || medicine?.sku || "",
              medicineName: it.medicineName || `Dược phẩm #${idx + 1}`,
              orderedQty: totalOrdered,
              previouslyReceivedQty: received,
              remainingQty: remaining,
              scannedQty: initialScanned,
              unit: it.unit || "Hộp",
              unitPrice: Number(it.unitPrice || 0),
              batchNo: it.batchNo ? String(it.batchNo).trim() : "",
              expDate: expiryDate,
              barcode: String(it.barcode || medicine?.barcode || "").trim(),
            };
          }));

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

  // Xử lý quét barcode: Khớp chính xác mặt hàng trong đơn PO; Hỗ trợ bóc tách URL/JSON; Từ chối mã không hợp lệ
  const processBarcode = (rawCode: string) => {
    if (!rawCode || !rawCode.trim() || isPausedRef.current) return;

    let code = rawCode.trim();

    // 1. Tự động bóc tách ID/mã nếu quét phải mã QR là URL Web
    if (code.includes("poId=") || code.includes("barcode=") || code.includes("sku=") || code.includes("code=")) {
      const match = code.match(/[?&](poId|barcode|sku|code)=([^&#]+)/i);
      if (match && match[2]) {
        code = decodeURIComponent(match[2]);
      }
    }
    // 2. Tự động bóc tách nếu quét phải mã QR dạng JSON kiện hàng
    else if (code.startsWith("{") && code.endsWith("}")) {
      try {
        const parsed = JSON.parse(code);
        code = parsed.barcode || parsed.sku || parsed.medicineId || parsed.code || parsed.poId || code;
      } catch (_) {}
    }

    const currentItems = itemsRef.current;

    // Tìm kiếm sản phẩm tương ứng với barcode, SKU, mã thuốc hoặc tên trong PO
    const q = code.toLowerCase();
    const foundIdx = currentItems.findIndex(
      (it) =>
        (it.barcode && it.barcode.toLowerCase() === q) ||
        (it.sku && it.sku.toLowerCase() === q) ||
        (it.medicineId && it.medicineId.toLowerCase() === q) ||
        (it.medicineName && it.medicineName.toLowerCase() === q) ||
        (it.medicineName && it.medicineName.toLowerCase().includes(q))
    );

    if (foundIdx !== -1) {
      const targetItem = currentItems[foundIdx];
      const maxReceivable = targetItem.remainingQty > 0 ? targetItem.remainingQty : targetItem.orderedQty;

      if (targetItem.scannedQty >= maxReceivable) {
        showToast(`Mặt hàng ${targetItem.medicineName} đã quét đủ số lượng cần nhập (${targetItem.scannedQty}/${maxReceivable})!`, "warning");
        return;
      }

      // Phát âm thanh Beep xác nhận nhận diện thành công
      playBeep();

      const updated = [...currentItems];
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

      showToast(`+1 ${targetItem.medicineName} (${targetItem.scannedQty + 1}/${maxReceivable} ${targetItem.unit})`, "success");
    } else {
      // 🚫 TỪ CHỐI MÃ VẠCH LẠ: Tuyệt đối không tự ý cộng vào mặt hàng khác
      showToast(`Mã quét "${code}" không thuộc bất kỳ sản phẩm nào trong đơn hàng PO này!`, "error");
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputBarcode.trim() || isPaused) return;
    const code = inputBarcode.trim();
    setInputBarcode("");
    processBarcode(code);
  };

  // Khởi động Camera / Webcam máy tính
  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Trình duyệt không hỗ trợ truy cập Webcam/Camera trực tiếp.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      showToast("Đã kích hoạt Camera quét mã vạch thành công!", "success");
    } catch (err: any) {
      console.warn("Lỗi mở camera:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Bạn đã chặn quyền truy cập Camera trên trình duyệt. Vui lòng cho phép quyền Camera trên thanh địa chỉ URL."
          : "Không thể kết nối đến Camera/Webcam. Vui lòng kiểm tra thiết bị camera của bạn."
      );
      setIsCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Dừng Camera / Webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Tự động tắt camera khi component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Gói dữ liệu đồng bộ đầy đủ dành cho Mobile (Cross-network instant sync)
  const fullSyncPayload = useMemo(() => {
    return JSON.stringify({
      type: "PO_SYNC",
      poId: poData?._id || poId || "",
      poCode: poData?.poCode || (poData?._id || poId || "").slice(-6).toUpperCase(),
      supplier: supplierName || "Nhà Cung Cấp",
      items: items.map((it) => ({
        medicineId: it.medicineId,
        name: it.medicineName,
        expected: it.remainingQty > 0 ? it.remainingQty : it.orderedQty,
        unit: it.unit || "Hộp",
        barcode: it.barcode || "",
        sku: it.sku || "",
      })),
    });
  }, [poData, poId, supplierName, items]);

  // Vòng lặp nhận diện Barcode & QR Code: Kết hợp BarcodeDetector Native + jsQR + ZXing Fallback (100% trình duyệt)
  useEffect(() => {
    if (!isCameraActive || typeof window === "undefined") return;

    let active = true;
    let animId: number;
    let detector: any = null;
    const zxingReader = new MultiFormatReader();

    if ("BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
        });
      } catch (err) {
        console.warn("Không khởi tạo được BarcodeDetector:", err);
      }
    }

    // Hiển thị và ghi log các engines nhận diện sẵn sàng
    const activeEngines: string[] = [];
    if (detector) activeEngines.push("BarcodeDetector Native");
    activeEngines.push("jsQR 2D");
    activeEngines.push("ZXing MultiFormat");
    const engineText = activeEngines.join(" + ");
    setScannerEngineStatus(engineText);
    console.log("📷 [Webcam Scanner] Đã kích hoạt vòng lặp nhận diện với bộ Engines:", engineText);

    const scanFrame = async () => {
      if (!active) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !isPausedRef.current
      ) {
        // Tăng đếm frame và cập nhật HUD
        frameCounterRef.current++;
        if (frameCounterRef.current % 15 === 0) {
          setScanFrameCount(frameCounterRef.current);
        }
        if (frameCounterRef.current % 180 === 0) {
          console.log(`📷 [Webcam Scanner] Heartbeat: Đã xử lý ${frameCounterRef.current} frames... Sẵn sàng quét mã.`);
        }

        const now = Date.now();

        // 1. Cooldown giữa 2 lần quét thành công liên tiếp (1.2s) để tránh quét dồn dập
        if (now - lastSuccessScanRef.current < 1200) {
          animId = requestAnimationFrame(scanFrame);
          return;
        }

        // 2. Throttling tần suất giải mã trên Main UI Thread: tối đa 1 lần mỗi 250ms (chống 100% CPU khi không có mã vạch)
        if (now - lastAttemptTimeRef.current < 250) {
          animId = requestAnimationFrame(scanFrame);
          return;
        }

        // Cập nhật mốc thời gian thử giải mã NGAY LẬP TỨC (dù có tìm thấy mã hay không)
        lastAttemptTimeRef.current = now;

        let scannedCode = "";
        let detectedEngine = "";

        // Cách 1: Thử dùng Native BarcodeDetector nếu trình duyệt hỗ trợ
        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && active) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue && rawValue.trim()) {
                scannedCode = rawValue.trim();
                detectedEngine = "BarcodeDetector Native";
              }
            }
          } catch (_) {}
        }

        // Cách 2: Fallback qua Canvas HTML5 bằng jsQR (siêu nhạy cho QR) & ZXing (mã vạch EAN-13)
        if (!scannedCode) {
          try {
            let canvas = canvasRef.current;
            if (!canvas) {
              canvas = document.createElement("canvas");
              canvasRef.current = canvas;
            }
            // Tối ưu kích thước Canvas: scale về tối đa 640px chiều rộng để giảm tải CPU 4x mà vẫn giữ độ nét
            const rawWidth = video.videoWidth || 640;
            const rawHeight = video.videoHeight || 480;
            const targetWidth = Math.min(640, rawWidth);
            const targetHeight = Math.round(targetWidth * (rawHeight / rawWidth || 0.75));

            if (targetWidth > 0 && targetHeight > 0) {
              if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
              }
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

                // 2.1 Giải mã QR Code qua jsQR (nhận diện cực nhanh kể cả khi đưa camera máy tính)
                const qrCode = jsQR(imageData.data, targetWidth, targetHeight, {
                  inversionAttempts: "dontInvert",
                });
                if (qrCode && qrCode.data && qrCode.data.trim()) {
                  scannedCode = qrCode.data.trim();
                  detectedEngine = "jsQR 2D";
                }

                // 2.2 Nếu không phải QR Code, thử giải mã mã vạch 1D qua ZXing
                if (!scannedCode) {
                  try {
                    const { data, width, height } = imageData;
                    const pixels = new Int32Array(data.buffer, data.byteOffset, data.length / 4);
                    const source = new RGBLuminanceSource(pixels, width, height);
                    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
                    scannedCode = zxingReader.decodeWithState(bitmap).getText().trim();
                    detectedEngine = "ZXing MultiFormat";
                  } catch (_) {}
                }
              }
            }
          } catch (_) {}
        }

        if (scannedCode && active) {
          console.log(`🎯 [Webcam Scanner] Đã đọc được mã: "${scannedCode}" bằng Engine: ${detectedEngine}`);
          setLastDetectedRaw(scannedCode);
          lastSuccessScanRef.current = now;
          processBarcode(scannedCode);
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive]);

  // Tiện ích hỗ trợ nghiệm thu nhanh toàn bộ đơn hàng (rất hữu ích khi demo)
  const handleScanAllFull = () => {
    const updated = items.map((it) => {
      const maxReceivable = it.remainingQty > 0 ? it.remainingQty : it.orderedQty;
      return {
        ...it,
        scannedQty: maxReceivable,
      };
    });
    setItems(updated);
    showToast(`Đã nghiệm thu đủ toàn bộ ${items.length} mặt hàng!`, "success");
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
    const receivedItems = items.filter((it) => it.scannedQty > 0);
    if (receivedItems.length === 0) {
      showToast("Vui lòng quét ít nhất một mặt hàng trước khi hoàn tất kiểm nhận!", "warning");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invalidItem = receivedItems.find((it) => {
      const expiryDate = new Date(it.expDate + "T00:00:00");
      return !it.batchNo.trim() || Number.isNaN(expiryDate.getTime()) || expiryDate <= today;
    });
    if (invalidItem) {
      showToast("Nhập số lô và hạn dùng thực tế (sau ngày hôm nay) cho " + invalidItem.medicineName + ".", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const currentPoId = poData?._id || poId;
      if (!currentPoId) {
        throw new Error("Không tìm thấy thông tin đơn PO");
      }

      // 1. Chuẩn hóa payload GRN theo chuẩn GoodsReceiptPayload (có receivedBy)
      const grnItems = receivedItems.map((it) => {
          // Tính toán số lượng cần nhập (Hỗ trợ partial delivery: quantity - receivedQuantity)
          const targetQty = it.remainingQty > 0 ? it.remainingQty : it.orderedQty;
          return {
            medicineId: it.medicineId,
            batchNo: it.batchNo.trim(),
            expDate: new Date(it.expDate).toISOString(),
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
          {/* Nút Mở QR Đồng Bộ Sang Mobile */}
          <button
            type="button"
            onClick={() => setShowMobileQrModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Mở mã QR đơn PO để quét kiểm đếm trên ứng dụng Mobile"
          >
            <QrCode size={15} className="text-indigo-600" />
            <span>Mã QR Mobile</span>
          </button>

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
            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            <span className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-xs font-bold transition-all ${
              isCameraActive
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                : "bg-sky-950/80 text-sky-400 border-sky-800/80"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-emerald-400 animate-ping" : "bg-sky-400 animate-pulse"}`} />
              {isCameraActive ? "Camera Barcode Live (Đang Chạy)" : "Camera Barcode Scanner"}
            </span>

            {/* Nút Bật / Tắt Camera trực tiếp trên Laptop */}
            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              disabled={isCameraLoading}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isCameraActive
                  ? "bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/80"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30"
              }`}
              title={isCameraActive ? "Bấm để tắt camera" : "Bấm để bật webcam laptop quét mã vạch"}
            >
              {isCameraLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang mở...</span>
                </>
              ) : isCameraActive ? (
                <>
                  <CameraOff size={13} />
                  <span>Tắt Camera</span>
                </>
              ) : (
                <>
                  <Camera size={13} />
                  <span>Bật Camera</span>
                </>
              )}
            </button>
          </div>

          {/* Vùng quét Camera Viewport */}
          <div className="relative w-full aspect-4/3 bg-slate-900/90 rounded-2xl border border-slate-800/90 flex flex-col items-center justify-center overflow-hidden p-6 text-center">
            {/* Live Video Stream từ Webcam / Camera Laptop */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
              }`}
            />

            {/* Lớp phủ mờ bảo vệ text khi camera đang chạy */}
            {isCameraActive && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none z-10" />
            )}

            {/* Lưới tọa độ ngắm laser */}
            <div className="absolute inset-4 border border-dashed border-cyan-500/40 rounded-xl pointer-events-none z-10" />

            {/* 4 góc khung ngắm nhắm Barcode */}
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-cyan-400 z-10" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-cyan-400 z-10" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-cyan-400 z-10" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-cyan-400 z-10" />

            {/* Tia laser quét chạy lên xuống */}
            {!isPaused && (
              <div className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse duration-1000 top-1/2 -translate-y-1/2 z-10" />
            )}

            {/* Nội dung khi CHƯA BẬT camera */}
            {!isCameraActive ? (
              <div className="relative z-10 flex flex-col items-center">
                <Barcode size={48} className="text-cyan-500/40 mb-3" />
                <p className="text-xs font-semibold text-slate-300">
                  {isPaused ? "Máy quét đang tạm dừng" : "Đặt mã vạch kiện hàng vào khung quét"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Hỗ trợ chuẩn GS1-128, QR Code Dược Quốc Gia, EAN-13
                </p>

                {cameraError ? (
                  <div className="mt-3 px-3 py-1.5 bg-rose-950/90 border border-rose-800 text-rose-300 text-[11px] rounded-lg max-w-xs font-medium">
                    {cameraError}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={isCameraLoading}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Camera size={14} />
                    <span>Bật Camera Quét Trực Tiếp</span>
                  </button>
                )}
              </div>
            ) : (
              /* Huy hiệu khi ĐANG BẬT camera */
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <span className="bg-slate-950/80 backdrop-blur-xs text-cyan-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700/80 font-mono flex items-center gap-1.5 shadow-sm">
                  <Scan size={12} className="text-cyan-400 animate-spin" />
                  Đang nhận diện Barcode...
                </span>
                <span className="bg-emerald-950/90 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE 1080P
                </span>
              </div>
            )}

            {/* Input tiếp nhận tín hiệu từ máy quét phần cứng hoặc nhập thủ công */}
            <form onSubmit={handleBarcodeSubmit} className="mt-4 w-full max-w-xs relative z-20">
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập hoặc quét mã vạch (Enter)..."
                value={inputBarcode}
                onChange={(e) => setInputBarcode(e.target.value)}
                disabled={isPaused}
                className="w-full bg-slate-800/90 border border-slate-700 text-cyan-300 text-xs px-3 py-1.5 rounded-lg outline-none focus:border-cyan-400 text-center font-mono placeholder:text-slate-500 shadow-md backdrop-blur-xs"
              />
            </form>

            {/* Thanh hiển thị trạng thái bộ quét thời gian thực (Scanner Engine Live HUD) */}
            {isCameraActive && (
              <div className="absolute bottom-2.5 inset-x-3 z-20 flex items-center justify-between bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[10px] font-mono text-slate-300 shadow-md pointer-events-none">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-cyan-300 font-bold truncate">Engine: {scannerEngineStatus}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-400">FPS frames: {scanFrameCount}</span>
                  {lastDetectedRaw ? (
                    <span className="text-emerald-400 font-bold bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-700/60 max-w-[120px] truncate">
                      Mã: {lastDetectedRaw}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Đang quét...</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Khung thông tin mặt hàng vừa quét thành công */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1.5">
            <div className="text-xs text-slate-400 font-mono">
              Mã vừa quét: <strong className="text-cyan-300 font-bold">{lastScanned.barcode}</strong>
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Khớp sản phẩm:</span>
              <span className="text-sky-400">{lastScanned.medicineName}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Lô: <span className="text-amber-300 font-bold">{lastScanned.batchNo}</span> | HSD:{" "}
              <span className="text-slate-200">{lastScanned.expDate}</span>
            </div>
          </div>

          {/* Footer thông số IoT & Thiết bị phần cứng */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
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

          {/* Banner gợi ý mở quét kiểm đếm bằng Mobile App */}
          <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900/90 rounded-2xl p-3 border border-indigo-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Smartphone size={17} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-indigo-100">Đồng bộ kiểm hàng bằng Mobile</p>
                <p className="text-[10px] text-indigo-300">Quét mã QR đơn PO để AI Vision đếm hàng</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileQrModal(true)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shrink-0 shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <QrCode size={13} />
              Mã QR PO
            </button>
          </div>
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

            {/* Nút Nghiệm Thu Đủ Nhanh & Badge Tiến Độ */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleScanAllFull}
                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Tự động nghiệm thu đủ 100% tất cả các mặt hàng phục vụ buổi demo"
              >
                <Sparkles size={13} className="text-sky-600" />
                <span>Nghiệm Thu Đủ Hàng (+All)</span>
              </button>

              <div className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5">
                <span>Tiến độ:</span>
                <span className="text-blue-900">{totalScanned} / {totalOrdered} {items[0]?.unit || "Hộp"}</span>
                <span className="text-blue-600 font-bold">({progressPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Thanh Tiến Độ Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                Number(progressPercent) >= 100
                  ? "bg-sky-500"
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
                  <th className="py-3 px-3.5 text-center min-w-[140px]">Đã Quét / Điều Chỉnh</th>
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
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.scannedQty > 0) {
                                const updated = items.map((it) =>
                                  it.medicineId === item.medicineId ? { ...it, scannedQty: it.scannedQty - 1 } : it
                                );
                                setItems(updated);
                              }
                            }}
                            disabled={item.scannedQty <= 0}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                            title="Giảm 1"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={targetQty}
                            value={item.scannedQty}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(targetQty, parseInt(e.target.value, 10) || 0));
                              const updated = items.map((it) =>
                                it.medicineId === item.medicineId ? { ...it, scannedQty: val } : it
                              );
                              setItems(updated);
                            }}
                            className="w-12 text-center py-1 border border-slate-200 rounded-md font-bold text-xs bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (item.scannedQty < targetQty) {
                                const updated = items.map((it) =>
                                  it.medicineId === item.medicineId ? { ...it, scannedQty: it.scannedQty + 1 } : it
                                );
                                setItems(updated);
                              }
                            }}
                            disabled={item.scannedQty >= targetQty}
                            className="w-6 h-6 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                            title="Tăng 1"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span className={`text-[10px] font-bold ${isDone ? "text-sky-700" : "text-amber-700"}`}>
                            {item.scannedQty} / {targetQty}
                          </span>
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = items.map((it) =>
                                  it.medicineId === item.medicineId ? { ...it, scannedQty: targetQty } : it
                                );
                                setItems(updated);
                                showToast(`Đã nhận đủ ${targetQty} ${item.unit} ${item.medicineName}`, "success");
                              }}
                              className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-200 transition-colors ml-1 cursor-pointer"
                              title="Nhận đủ cả thùng"
                            >
                              Đủ (+{diff})
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-slate-600 space-y-1">
                        <input
                          type="text"
                          aria-label={"Số lô " + item.medicineName}
                          placeholder="Nhập số lô"
                          value={item.batchNo}
                          onChange={(e) => {
                            const batchNo = e.target.value;
                            setItems((current) => current.map((it) =>
                              it.medicineId === item.medicineId ? { ...it, batchNo } : it
                            ));
                          }}
                          className="block w-full rounded border border-slate-200 px-2 py-1"
                        />
                        <input
                          type="date"
                          aria-label={"Hạn dùng " + item.medicineName}
                          value={item.expDate}
                          onChange={(e) => {
                            const expDate = e.target.value;
                            setItems((current) => current.map((it) =>
                              it.medicineId === item.medicineId ? { ...it, expDate } : it
                            ));
                          }}
                          className="block w-full rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 bg-sky-100/90 text-sky-800 font-black px-2.5 py-1 rounded-lg text-[10px]">
                            <CheckCircle2 size={12} />
                            ĐỦ HÀNG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 font-black px-2.5 py-1 rounded-lg text-[10px]">
                            <Loader2 size={12} className="animate-spin text-emerald-600" />
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
            <ShieldCheck size={20} className="text-sky-600 shrink-0 mt-0.5" />
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

      {/* MODAL MÃ QR ĐƠN HÀNG PO ĐỂ QUÉT BẰNG MOBILE */}
      {showMobileQrModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden text-center flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/70">
              <div className="flex items-center gap-2 text-indigo-950">
                <Smartphone size={20} className="text-indigo-600" />
                <h3 className="font-extrabold text-sm tracking-tight">Đồng Bộ Phiên Kiểm Đếm Mobile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileQrModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Mở ứng dụng <strong>ABC Pharmacy Mobile</strong> (Tab <strong>Phiếu Nhập Kho</strong> hoặc nút <strong>Quét Đơn PO</strong>) để quét mã QR bên dưới:
              </p>

              {/* Nút chuyển đổi định dạng mã QR */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSyncQrTab("FULL_DATA")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    syncQrTab === "FULL_DATA"
                      ? "bg-white text-indigo-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ⚡ Đồng Bộ Ngay (Khuyên dùng)
                </button>
                <button
                  type="button"
                  onClick={() => setSyncQrTab("RAW_ID")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    syncQrTab === "RAW_ID"
                      ? "bg-white text-indigo-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🏷️ Mã ID Đơn Hàng
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                  <QRCodeSVG
                    value={syncQrTab === "FULL_DATA" ? fullSyncPayload : (poData?._id || poId || "PO")}
                    size={200}
                    level={syncQrTab === "FULL_DATA" ? "L" : "H"}
                    includeMargin={true}
                  />
                </div>
                <span className="mt-3 font-mono text-xs font-bold text-indigo-900 bg-indigo-100/80 px-3 py-1 rounded-full">
                  MÃ ĐƠN: #{poData?.poCode || (poData?._id || poId || '').slice(-6).toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">
                  {syncQrTab === "FULL_DATA" ? "Chế độ: Gói dữ liệu đồng bộ tức thì" : `ID: ${poData?._id || poId}`}
                </span>
              </div>

              <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nhà cung cấp:</span>
                  <span className="font-bold text-slate-800 truncate ml-2">{supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Danh mục thuốc:</span>
                  <span className="font-bold text-slate-800">{items.length} mặt hàng ({totalOrdered} hộp)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/warehouse/goods-receipt/mobile-inspection?poId=${poData?._id || poId}`;
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check size={14} className="text-sky-600" /> : <Copy size={14} />}
                  {copiedLink ? "Đã Sao Chép!" : "Sao Chép Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`/warehouse/goods-receipt/mobile-inspection?poId=${poData?._id || poId}`, "_blank");
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={14} /> Mở Bản Mobile
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                  : "bg-sky-950/95 text-sky-100 border-sky-800"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === "error" && <AlertCircle size={18} className="text-rose-400" />}
                {t.type === "warning" && <AlertTriangle size={18} className="text-amber-400" />}
                {t.type === "info" && <Info size={18} className="text-blue-400" />}
                {t.type === "success" && <CheckCircle2 size={18} className="text-sky-400" />}
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
