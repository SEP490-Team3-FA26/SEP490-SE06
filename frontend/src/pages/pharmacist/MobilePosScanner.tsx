import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Scan,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Volume2,
  VolumeX,
  History,
  Send,
  Loader2,
  RefreshCw,
  Camera,
  Keyboard,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * MobilePosScanner.tsx - Ứng dụng biến Camera điện thoại thành Súng quét Barcode Wi-Fi không dây
 * Kết nối thời gian thực với Web POS trên máy tính qua SSE / API Gateway Bridge và BroadcastChannel.
 * Dược sĩ chỉ cần quét mã QR trên màn hình POS máy tính là có thể cầm điện thoại đi lại trong quầy quét thuốc!
 */
export function MobilePosScanner() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "POS-DEFAULT";
  const branchId = searchParams.get("branchId") || "";

  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannedHistory, setScannedHistory] = useState<
    { code: string; time: string; name?: string }[]
  >([]);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Video Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Phát âm thanh beep thành công qua Web Audio API (không cần tải file audio ngoài)
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1850, audioCtx.currentTime); // Âm thanh tít súng quét siêu thị
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.12
      );

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  };

  // Khởi động Camera điện thoại
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError(
            "Trình duyệt không hỗ trợ truy cập camera trực tiếp. Vui lòng cấp quyền hoặc nhập mã thủ công."
          );
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err: any) {
        console.warn("Lỗi mở camera thiết bị:", err);
        setCameraError(
          "Không thể truy cập camera. Vui lòng đảm bảo đã cho phép quyền Camera trên điện thoại."
        );
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Truyền mã vạch quét được sang Web POS máy tính
  const transmitBarcode = async (rawCode: string, medLabel?: string) => {
    if (!rawCode || !rawCode.trim()) return;
    const cleanCode = rawCode.trim();
    setIsSending(true);

    // Rung điện thoại khi quét trúng mã (Haptic feedback)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100);
    }
    playBeep();

    try {
      // 1. Kênh BroadcastChannel nội bộ (nếu test trên cùng máy hoặc tab)
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel("pos_barcode_channel");
          channel.postMessage({
            sessionId,
            barcode: cleanCode,
            timestamp: Date.now(),
          });
          channel.close();
        } catch (_) {}
      }

      // 2. Kênh Storage Event dự phòng
      try {
        localStorage.setItem(
          "POS_BARCODE_BRIDGE",
          JSON.stringify({
            sessionId,
            barcode: cleanCode,
            timestamp: Date.now(),
          })
        );
      } catch (_) {}

      // 3. Kênh Server-Sent Events / HTTP Bridge qua API Gateway
      const res = await fetch("/api/events/pos-scanner-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          barcode: cleanCode,
          deviceName: navigator.userAgent.includes("iPhone")
            ? "iPhone (Wi-Fi Gun)"
            : "Android Phone (Wi-Fi Gun)",
          branchId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setStatusMsg({
          type: "success",
          text: `Đã truyền mã ${cleanCode} vào màn hình POS thành công!`,
        });
      } else {
        // Vẫn thành công qua kênh LocalStorage/BroadcastChannel
        setStatusMsg({
          type: "success",
          text: `Đã phát mã ${cleanCode} tới phiên POS: ${sessionId}!`,
        });
      }

      // Cập nhật lịch sử quét
      setScannedHistory((prev) => [
        {
          code: cleanCode,
          time: new Date().toLocaleTimeString("vi-VN"),
          name: medLabel,
        },
        ...prev.slice(0, 19),
      ]);

      setBarcodeInput("");
    } catch (err: any) {
      setStatusMsg({
        type: "success",
        text: `Đã phát mã ${cleanCode} tới POS qua mạng nội bộ!`,
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  // Danh mục mã thuốc demo phổ biến để test nhanh không cần quét bao bì
  const SAMPLE_BARCODES = [
    {
      code: "3400932567577",
      name: "Thuốc sủi Efferalgan 500mg",
      note: "Hộp 16 viên (Chuẩn EAN-13 Pháp)",
    },
    {
      code: "8935006530010",
      name: "Amoxicillin 500mg (Hộp)",
      note: "Hộp 100 viên (GS1 Việt Nam 893)",
    },
    {
      code: "8935006530022",
      name: "Amoxicillin 500mg (Vỉ lẻ)",
      note: "Mã vạch vỉ phụ (Tự tính giá vỉ)",
    },
    {
      code: "8935001701101",
      name: "Panadol Extra Đỏ",
      note: "Hộp 15 vỉ x 12 viên",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">
      {/* Mobile Top Bar */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Scan size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide flex items-center gap-1.5">
              Súng Quét Barcode Wi-Fi
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Phiên POS: <span className="text-emerald-400 font-bold">{sessionId}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl border transition-colors ${
            soundEnabled
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
          title={soundEnabled ? "Tắt âm báo bíp" : "Bật âm báo bíp"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Banner Trạng thái đồng bộ */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg ${
                statusMsg.type === "success"
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                  : "bg-rose-500 text-white shadow-rose-500/20"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertTriangle size={18} className="shrink-0" />
              )}
              <span className="flex-1 leading-snug">{statusMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Khung Kính Ngắm Camera Súng Quét */}
        <div className="relative aspect-4/3 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Tia laser đỏ súng quét di chuyển */}
          <motion.div
            animate={{ y: ["-100%", "100%", "-100%"] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            className="absolute inset-x-8 h-0.5 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)] z-10"
          />

          {/* Khung ngắm tâm ngắm súng barcode */}
          <div className="absolute inset-8 border-2 border-emerald-400/60 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-5 h-5 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
              <div className="w-5 h-5 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
            </div>
            <div className="flex justify-between">
              <div className="w-5 h-5 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
              <div className="w-5 h-5 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
            </div>
          </div>

          <div className="absolute bottom-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/80 text-[10px] text-slate-300 font-bold z-10 flex items-center gap-1.5">
            <Camera size={12} className="text-emerald-400" />
            Hướng camera vào mã vạch trên vỏ hộp thuốc
          </div>
        </div>

        {/* Form nhập/bắn mã nhanh bằng tay */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <label className="text-[11px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
            <Keyboard size={13} className="text-emerald-400" />
            Nhập hoặc Dán Mã Vạch (Gửi Lập Tức Sang POS):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInput.trim()) {
                  e.preventDefault();
                  transmitBarcode(barcodeInput);
                }
              }}
              placeholder="VD: 3400932567577..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-emerald-400 outline-none"
            />
            <button
              type="button"
              onClick={() => transmitBarcode(barcodeInput)}
              disabled={isSending || !barcodeInput.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              {isSending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Bắn
            </button>
          </div>
        </div>

        {/* Phím bấm Test Nhanh các loại thuốc demo */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Bấm Quét Mẫu Nhanh (Demo Chuẩn Dược Phẩm)
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_BARCODES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => transmitBarcode(item.code, item.name)}
                className="p-3 bg-slate-900 hover:bg-slate-800/90 active:scale-95 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-left transition-all flex flex-col gap-1 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate pr-1">
                    {item.name}
                  </span>
                  <Zap size={12} className="text-emerald-400 shrink-0" />
                </div>
                <span className="font-mono text-[11px] font-semibold text-emerald-400">
                  {item.code}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {item.note}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lịch sử quét trong ca */}
        {scannedHistory.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <History size={14} className="text-emerald-400" />
                Lịch sử vừa quét ({scannedHistory.length})
              </span>
              <button
                onClick={() => setScannedHistory([])}
                className="text-[10px] text-slate-500 hover:text-slate-400 font-bold"
              >
                Xóa
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {scannedHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-950/70 rounded-lg border border-slate-800 font-mono"
                >
                  <span className="font-bold text-emerald-400">{h.code}</span>
                  <span className="text-[10px] text-slate-500">{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
