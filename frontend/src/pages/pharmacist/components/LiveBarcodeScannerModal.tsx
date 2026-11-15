import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Camera,
  CameraOff,
  Barcode,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  Layers,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsQR from "jsqr";
import { BinaryBitmap, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from "@zxing/library";

interface LiveBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => Promise<void> | void;
  cart?: any[];
}

/**
 * LiveBarcodeScannerModal.tsx
 * Bộ Điều Khiển Quét Mã Vạch Barcode & QR Code Trực Tiếp Bằng Camera / Webcam Cho Dược Sĩ
 * Tự động nhận diện và nhảy thuốc vào ô bán hàng POS.
 * Tuân thủ quy chuẩn WDP301/SEP490 Fullstack Playbook v2.0 (Zero Mock Data, Vietnamese Comments).
 */
export function LiveBarcodeScannerModal({
  isOpen,
  onClose,
  onBarcodeScanned,
  cart = [],
}: LiveBarcodeScannerModalProps) {
  // Trạng thái Camera
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Thiết bị Camera đa nguồn
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Trạng thái quét & HUD
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [scannerEngineStatus, setScannerEngineStatus] = useState<string>("Sẵn sàng");
  const [scanFrameCount, setScanFrameCount] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>("");
  const [isSuccessFlash, setIsSuccessFlash] = useState<boolean>(false);
  const [history, setHistory] = useState<{ code: string; time: string; count: number }[]>([]);

  // Refs điều khiển luồng Camera và Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSuccessScanRef = useRef<number>(0);
  const lastSuccessCodeRef = useRef<string>("");
  const lastAttemptTimeRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Âm thanh Beep báo hiệu quét thành công
  const playBeep = () => {
    if (!isAudioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 Note trong sáng
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  };

  // Liệt kê các camera có sẵn trên thiết bị
  const getCameraDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        // Ưu tiên camera sau (back/environment) hoặc camera đầu tiên
        const backCam = videoDevs.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("sau"));
        setSelectedDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
      }
    } catch (e) {
      console.warn("Không thể lấy danh sách camera:", e);
    }
  };

  // Khởi động Camera stream
  const startCamera = async (deviceIdToUse?: string) => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Trình duyệt không hỗ trợ truy cập Webcam/Camera trực tiếp.");
        return;
      }

      // Dừng stream cũ nếu đang chạy
      stopCamera();

      const targetId = deviceIdToUse || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: targetId
          ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      await getCameraDevices();
    } catch (err: any) {
      console.warn("Lỗi mở camera:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Bạn đã từ chối quyền truy cập Camera. Vui lòng cấp quyền Camera trên thanh địa chỉ URL để tiếp tục."
          : "Không thể kết nối đến Camera/Webcam. Vui lòng kiểm tra lại thiết bị phần cứng."
      );
      setIsCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Dừng Camera stream
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

  // Tự động bật camera khi mở modal và dọn dẹp khi đóng
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Xử lý đổi thiết bị camera
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  // Xử lý khi nhận diện được một mã vạch hợp lệ
  const handleDetectedCode = async (rawCode: string) => {
    if (!rawCode || isPausedRef.current) return;
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);
    setIsSuccessFlash(true);
    setTimeout(() => setIsSuccessFlash(false), 500);

    // Cập nhật danh sách lịch sử quét trong phiên
    const nowStr = new Date().toLocaleTimeString("vi-VN");
    setHistory((prev) => {
      const existing = prev.find((h) => h.code === cleanCode);
      if (existing) {
        return prev.map((h) => (h.code === cleanCode ? { ...h, count: h.count + 1, time: nowStr } : h));
      }
      return [{ code: cleanCode, time: nowStr, count: 1 }, ...prev.slice(0, 19)];
    });

    // Phát âm thanh Beep
    playBeep();

    // Gọi callback nạp thuốc vào giỏ hàng POS
    try {
      await onBarcodeScanned(cleanCode);
    } catch (err) {
      console.error("Lỗi khi nạp thuốc từ barcode vào giỏ hàng:", err);
    }
  };

  // Vòng lặp giải mã Barcode: BarcodeDetector + jsQR + ZXing MultiFormat
  useEffect(() => {
    if (!isCameraActive || typeof window === "undefined" || !isOpen) return;

    let active = true;
    let animId: number;
    let nativeDetector: any = null;
    const zxingReader = new MultiFormatReader();

    if ("BarcodeDetector" in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
        });
      } catch (_) {}
    }

    const engines = [];
    if (nativeDetector) engines.push("BarcodeDetector Native");
    engines.push("jsQR 2D");
    engines.push("ZXing MultiFormat");
    setScannerEngineStatus(engines.join(" + "));

    const scanFrame = async () => {
      if (!active) return;

      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !isPausedRef.current) {
        frameCounterRef.current++;
        if (frameCounterRef.current % 15 === 0) {
          setScanFrameCount(frameCounterRef.current);
        }

        const now = Date.now();

        // 1. Cooldown quét: nếu cùng một mã vạch thì cách nhau 1200ms; mã vạch khác thì 500ms
        const timeSinceLastSuccess = now - lastSuccessScanRef.current;
        if (timeSinceLastSuccess < 500) {
          animId = requestAnimationFrame(scanFrame);
          return;
        }

        // 2. Throttling CPU: tối đa 1 lần decode mỗi 200ms
        if (now - lastAttemptTimeRef.current < 200) {
          animId = requestAnimationFrame(scanFrame);
          return;
        }
        lastAttemptTimeRef.current = now;

        let scannedCode = "";

        // Cách 1: Native BarcodeDetector
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && active) {
              const raw = barcodes[0].rawValue;
              if (raw && raw.trim()) {
                scannedCode = raw.trim();
              }
            }
          } catch (_) {}
        }

        // Cách 2: Canvas HTML5 qua jsQR & ZXing
        if (!scannedCode) {
          try {
            let canvas = canvasRef.current;
            if (!canvas) {
              canvas = document.createElement("canvas");
              canvasRef.current = canvas;
            }
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

                // jsQR cho mã 2D QR Code
                const qr = jsQR(imageData.data, targetWidth, targetHeight, {
                  inversionAttempts: "dontInvert",
                });
                if (qr && qr.data && qr.data.trim()) {
                  scannedCode = qr.data.trim();
                }

                // ZXing MultiFormat cho mã 1D Barcode
                if (!scannedCode) {
                  try {
                    const { data, width, height } = imageData;
                    const pixels = new Int32Array(data.buffer, data.byteOffset, data.length / 4);
                    const source = new RGBLuminanceSource(pixels, width, height);
                    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
                    scannedCode = zxingReader.decodeWithState(bitmap).getText().trim();
                  } catch (_) {}
                }
              }
            }
          } catch (_) {}
        }

        if (scannedCode && active) {
          // Tránh quét liên tục cùng 1 mã khi người dùng chưa kịp nhấc hộp thuốc ra
          const isSameCode = scannedCode === lastSuccessCodeRef.current;
          if (!isSameCode || timeSinceLastSuccess >= 1200) {
            lastSuccessScanRef.current = now;
            lastSuccessCodeRef.current = scannedCode;
            handleDetectedCode(scannedCode);
          }
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive, isOpen]);

  // Xử lý nạp mã vạch gõ tay thủ công
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const code = manualInput.trim();
    setManualInput("");
    handleDetectedCode(code);
  };

  // Tính tổng tiền giỏ hàng hiện tại
  const cartTotalPrice = cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  if (!isOpen) return null;

  // ==========================================
  // GIAO DIỆN THU NHỎ (MINI PICTURE-IN-PICTURE)
  // ==========================================
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-84 bg-slate-950 text-white rounded-3xl shadow-2xl border-2 border-cyan-500/80 p-3.5 overflow-hidden flex flex-col gap-2.5 backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Camera Quét Mini</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Phóng to cửa sổ"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-rose-900/60 rounded-lg text-rose-300 hover:text-rose-100 transition cursor-pointer"
              title="Tắt Camera"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Khung video mini */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-2 border border-dashed border-cyan-400/50 rounded-lg pointer-events-none" />
          <div className="absolute inset-x-3 h-0.5 bg-cyan-400/80 shadow-[0_0_8px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2" />
        </div>

        {/* Thông tin nhanh giỏ hàng */}
        <div className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <span className="text-slate-400">Giỏ: <strong className="text-emerald-400">{cart.length} món</strong></span>
          <span className="font-extrabold text-cyan-300">
            {cartTotalPrice.toLocaleString("vi-VN")} đ
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN MODAL TOÀN PHẦN (FULL MODAL)
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="p-4.5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
              <Camera size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center gap-2">
                Quét Barcode / QR Live Dược Sĩ (Tự Động Nạp Bán Hàng)
                <span className="text-[10px] bg-cyan-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Webcam Live
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Hỗ trợ EAN-13, GS1-128, QR Sổ Sức Khỏe Số</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-medium">{scannerEngineStatus}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Thu nhỏ cửa sổ camera sang góc màn hình"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-300 transition cursor-pointer"
              title="Đóng Camera"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nội dung chính Modal: 2 Cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1">
          {/* CỘT TRÁI (COL-7): KHUNG CAMERA WEBCAM LIVE */}
          <div className="lg:col-span-7 p-5 bg-slate-950 text-white flex flex-col justify-between space-y-4 border-r border-slate-800">
            {/* Thanh trạng thái phía trên camera */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    isCameraActive
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80"
                      : "bg-rose-950/80 text-rose-400 border border-rose-800/80"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraActive ? "bg-emerald-400 animate-ping" : "bg-rose-400"
                    }`}
                  />
                  {isCameraActive ? "Webcam Đang Quét Live" : "Camera Đang Tắt"}
                </span>

                {isCameraActive && (
                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    Frames: <strong className="text-cyan-300">{scanFrameCount}</strong>
                  </span>
                )}
              </div>

              {/* Nút Bật/Tắt Âm Thanh Beep & Tạm Dừng */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    isAudioEnabled
                      ? "bg-slate-900 border-slate-700 text-cyan-400"
                      : "bg-slate-900/40 border-slate-800 text-slate-500"
                  }`}
                  title={isAudioEnabled ? "Tắt âm thanh Beep" : "Bật âm thanh Beep"}
                >
                  {isAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isPaused
                      ? "bg-amber-950/80 border-amber-700 text-amber-300"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  {isPaused ? <Play size={13} /> : <Pause size={13} />}
                  <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                </button>
              </div>
            </div>

            {/* Viewport Khung Camera */}
            <div
              className={`relative w-full aspect-4/3 bg-slate-900/90 rounded-2xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden p-6 text-center ${
                isSuccessFlash
                  ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                  : "border-slate-800"
              }`}
            >
              {/* Thẻ Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
                }`}
              />

              {/* Lớp phủ & khung ngắm Laser */}
              {isCameraActive && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none z-10" />
                  <div className="absolute inset-6 border border-dashed border-cyan-400/40 rounded-2xl pointer-events-none z-10" />
                  {/* 4 góc khung ngắm */}
                  <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-cyan-400 z-10" />
                  <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-cyan-400 z-10" />
                  <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-cyan-400 z-10" />
                  <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-cyan-400 z-10" />

                  {/* Tia laser quét */}
                  {!isPaused && (
                    <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse duration-1000 top-1/2 -translate-y-1/2 z-10" />
                  )}

                  {/* HUD Thông báo mã vừa quét */}
                  {lastScannedCode && (
                    <div className="absolute bottom-4 inset-x-4 z-20 bg-slate-950/90 border border-cyan-500/60 rounded-xl px-3 py-2 text-center backdrop-blur-md">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Mã vừa nhận diện</p>
                      <p className="text-sm font-black text-cyan-300 font-mono tracking-wider truncate">
                        {lastScannedCode}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Trạng thái khi camera tắt hoặc lỗi */}
              {!isCameraActive && (
                <div className="relative z-10 flex flex-col items-center">
                  <Barcode size={48} className="text-cyan-500/40 mb-3" />
                  <p className="text-xs font-semibold text-slate-300">
                    {cameraError ? "Không thể truy cập camera" : "Camera đang tạm dừng hoặc chưa bật"}
                  </p>
                  {cameraError ? (
                    <div className="mt-3 px-3 py-2 bg-rose-950/90 border border-rose-800 text-rose-300 text-xs rounded-xl max-w-sm font-medium">
                      {cameraError}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isCameraLoading}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isCameraLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    <span>{isCameraLoading ? "Đang kết nối..." : "Bật Lại Camera"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chọn camera & Form nhập Barcode dự phòng */}
            <div className="space-y-3 pt-1">
              {devices.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-400 shrink-0 font-medium">Chọn Camera:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={handleDeviceChange}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {devices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nhập mã thủ công nếu barcode mờ */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã Barcode thủ công nếu tem mờ..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  Nạp Vào Giỏ
                </button>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI (COL-5): GIỎ HÀNG BÁN HÀNG TỨC THÌ (REALTIME CART PREVIEW) */}
          <div className="lg:col-span-5 p-5 bg-slate-50 flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#0057cd]" />
                  <span>Giỏ Hàng Bán Lẻ Tại Quầy</span>
                  <span className="text-[11px] bg-sky-100 text-[#0057cd] px-2 py-0.5 rounded-full font-black">
                    {cart.length} món
                  </span>
                </h3>
                <span className="text-xs text-slate-500">Tự động cộng dồn</span>
              </div>

              {/* Danh sách các sản phẩm đang có trong giỏ hàng */}
              <div className="overflow-y-auto max-h-[380px] py-3 space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                    <ShoppingCart size={36} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">Giỏ hàng đang trống</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Hướng camera vào mã vạch trên hộp thuốc hoặc quét mã QR Sổ sức khỏe số để tự động thêm vào đơn.
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <motion.div
                      key={item.id || item._id || idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-sky-300 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-semibold">
                            {item.selectedUnit || item.unit || "Hộp"}
                          </span>
                          <span>•</span>
                          <span>{(Number(item.price) || 0).toLocaleString("vi-VN")} đ</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black">
                          x{item.quantity}
                        </span>
                        <p className="text-xs font-extrabold text-[#0057cd] mt-0.5">
                          {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Lịch sử quét trong phiên */}
              {history.length > 0 && (
                <div className="mt-2 pt-3 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Mã đã quét phiên này ({history.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {history.slice(0, 6).map((h, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md"
                      >
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span>{h.code}</span>
                        {h.count > 1 && (
                          <strong className="text-sky-600">x{h.count}</strong>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chân cột giỏ hàng: Tổng tiền & Nút xác nhận */}
            <div className="pt-4 border-t border-slate-200 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tạm tính đơn hàng:</span>
                <span className="text-base font-black text-[#0057cd]">
                  {cartTotalPrice.toLocaleString("vi-VN")} đ
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-[#0057cd] hover:bg-[#00419e] active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-[#0057cd]/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>Xong & Về Quầy POS Thu Tiền</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
export default LiveBarcodeScannerModal;
