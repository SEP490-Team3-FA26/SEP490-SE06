import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Thermometer,
  Droplets,
  Gauge,
  CloudFog,
  Cpu,
  Wifi,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  sensorTelemetryService,
  TelemetryRecord,
  SensorStation,
} from "../../services/inventory/sensorTelemetry.service";
import { useSocket } from "../../hooks/useSocket";

// ── COMPONENT MINI SPARKLINE CANVAS (SIÊU NHẸ, 60 FPS, 0% CPU OVERHEAD) ──
interface SparklineCanvasProps {
  data: number[];
  color: string;
  height?: number;
  minRange?: number;
}

const SparklineCanvas: React.FC<SparklineCanvasProps> = React.memo(
  ({ data, color, height = 40, minRange = 1.0 }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.offsetWidth || 140;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const validData = data.filter((v) => v !== null && v !== undefined && !isNaN(v));
      if (validData.length < 2) return;

      const min = Math.min(...validData);
      const max = Math.max(...validData);
      const diff = max - min;
      // Dùng effectiveRange để tránh dao động siêu nhỏ (ví dụ 0.01) bị phóng to thành sóng vuông
      const effectiveRange = Math.max(diff, minRange);
      const mid = (min + max) / 2;
      const plotMin = mid - effectiveRange / 2;
      const plotMax = mid + effectiveRange / 2;
      const range = plotMax - plotMin === 0 ? 1 : plotMax - plotMin;
      const padding = 3;

      const step = width / (validData.length - 1);

      ctx.beginPath();
      validData.forEach((val, i) => {
        const x = i * step;
        const y = height - padding - ((val - plotMin) / range) * (height - padding * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.stroke();

      // Dải gradient nhẹ dưới đường biểu đồ
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `${color}25`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.fill();
    }, [data, color, height, minRange]);

    return <canvas ref={canvasRef} className="w-full h-10 pointer-events-none" />;
  }
);

// Kiểu loại 8 chỉ số theo dõi
export type MetricKey =
  | "temperature"
  | "humidity"
  | "dewPoint"
  | "vpd"
  | "chipTemp"
  | "cpuLoad"
  | "freeHeap"
  | "wifiRssi";

export type ViewMode = "climate" | "hardware" | "single";
export type TimeRange = "5m" | "1h" | "24h" | "7d";

// Cấu hình hiển thị chi tiết cho từng chỉ số
const METRIC_DEFINITIONS: Record<
  MetricKey,
  { label: string; unit: string; color: string; desc: string; minRange: number }
> = {
  temperature: { label: "Nhiệt Độ Kho", unit: "°C", color: "#10b981", desc: "Chuẩn GSP 15 - 25°C", minRange: 2.0 },
  humidity: { label: "Độ Ẩm Không Khí", unit: "%RH", color: "#06b6d4", desc: "Chuẩn GSP ≤ 70%RH", minRange: 5.0 },
  dewPoint: { label: "Điểm Sương (Td)", unit: "°C", color: "#6366f1", desc: "Công thức Magnus Eq", minRange: 2.0 },
  vpd: { label: "Áp Suất Hơi (VPD)", unit: "kPa", color: "#a855f7", desc: "Tốc độ bay hơi ẩm dược phẩm", minRange: 0.5 },
  chipTemp: { label: "Nhiệt Độ Chip ESP32", unit: "°C", color: "#f59e0b", desc: "Ngưỡng mát an toàn < 75°C", minRange: 5.0 },
  cpuLoad: { label: "Tải CPU Tổng", unit: "%", color: "#f97316", desc: "Xtensa Dual-Core 240MHz", minRange: 10.0 },
  freeHeap: { label: "RAM Heap Trống", unit: "KB", color: "#14b8a6", desc: "SRAM nội vi điều khiển", minRange: 20.0 },
  wifiRssi: { label: "Sóng Wi-Fi (RSSI)", unit: "dBm", color: "#0284c7", desc: "Cường độ tín hiệu trạm", minRange: 10.0 },
};

export function GspTelemetryDashboard() {
  const [station, setStation] = useState<SensorStation | null>(null);
  const [latestData, setLatestData] = useState<TelemetryRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TelemetryRecord[]>([]);
  const [range, setRange] = useState<TimeRange>("5m");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode & selected metric
  const [viewMode, setViewMode] = useState<ViewMode>("climate");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("temperature");

  // Bộ đệm 30 điểm gần nhất cho từng sparkline mini trên 8 thẻ
  const [sparkSeries, setSparkSeries] = useState<{ [key in MetricKey]: number[] }>({
    temperature: [],
    humidity: [],
    dewPoint: [],
    vpd: [],
    chipTemp: [],
    cpuLoad: [],
    freeHeap: [],
    wifiRssi: [],
  });

  // Quản lý trạng thái online/offline thực tế (hoàn toàn không mock)
  const [hasReceivedAny, setHasReceivedAny] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [offlineElapsedSec, setOfflineElapsedSec] = useState<number | null>(null);

  const { onEvent, offEvent } = useSocket();

  // 1. Tải dữ liệu ban đầu
  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [latestRes, historyRes] = await Promise.all([
        sensorTelemetryService.getLatest(),
        sensorTelemetryService.getHistory(undefined, range),
      ]);

      if (latestRes.success) {
        if (latestRes.station) setStation(latestRes.station);
        if (latestRes.data) {
          setLatestData(latestRes.data);
          setHasReceivedAny(true);
          const t = new Date(latestRes.data.timestamp * 1000);
          setLastPacketTime(t);
          const elapsed = Math.round((Date.now() - t.getTime()) / 1000);
          if (elapsed < 4) {
            setIsLiveConnected(true);
            setOfflineElapsedSec(null);
          } else {
            setIsLiveConnected(false);
            setOfflineElapsedSec(elapsed);
          }
        }
      }

      if (historyRes.success && Array.isArray(historyRes.records)) {
        setHistoryRecords(historyRes.records);

        // Nạp 30 điểm gần nhất cho 8 sparklines
        const recent = historyRes.records.slice(-30);
        setSparkSeries({
          temperature: recent.map((r) => r.metrics?.temperature ?? NaN).filter((v) => !isNaN(v)),
          humidity: recent.map((r) => r.metrics?.humidity ?? NaN).filter((v) => !isNaN(v)),
          dewPoint: recent.map((r) => (r.metrics?.dewPoint ?? r.metrics?.dew_point ?? NaN)).filter((v) => !isNaN(v)),
          vpd: recent.map((r) => r.metrics?.vpd ?? NaN).filter((v) => !isNaN(v)),
          chipTemp: recent.map((r) => (r.diagnostics?.chipTemp ?? r.diagnostics?.chip_temp ?? NaN)).filter((v) => !isNaN(v)),
          cpuLoad: recent.map((r) => (r.diagnostics?.cpuLoad ?? r.diagnostics?.cpu_load ?? NaN)).filter((v) => !isNaN(v)),
          freeHeap: recent.map((r) => Math.round(((r.diagnostics?.freeHeap ?? r.diagnostics?.free_heap ?? NaN) / 1024))).filter((v) => !isNaN(v)),
          wifiRssi: recent.map((r) => (r.diagnostics?.wifiRssi ?? r.diagnostics?.wifi_rssi ?? NaN)).filter((v) => !isNaN(v)),
        });
      }
    } catch (err) {
      console.error("Lỗi khi nạp dữ liệu IoT telemetry:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [range]);

  // 2. Lắng nghe gói tin Realtime (1s/lần) qua WebSocket / SSE
  useEffect(() => {
    const handleRealtimePacket = (data: any) => {
      setHasReceivedAny(true);
      setIsLiveConnected(true);
      setOfflineElapsedSec(null);
      const now = new Date();
      setLastPacketTime(now);

      const record: TelemetryRecord = {
        timestamp: data.timestamp || Math.floor(now.getTime() / 1000),
        seq: data.seq,
        metrics: {
          temperature: data.metrics?.temperature !== undefined ? Number(data.metrics.temperature) : undefined,
          humidity: data.metrics?.humidity !== undefined ? Number(data.metrics.humidity) : undefined,
          dewPoint: data.metrics?.dew_point !== undefined ? Number(data.metrics.dew_point) : (data.metrics?.dewPoint !== undefined ? Number(data.metrics.dewPoint) : undefined),
          vpd: data.metrics?.vpd !== undefined ? Number(data.metrics.vpd) : undefined,
        },
        diagnostics: {
          chipTemp: data.diagnostics?.chip_temp !== undefined ? Number(data.diagnostics.chip_temp) : (data.diagnostics?.chipTemp !== undefined ? Number(data.diagnostics.chipTemp) : undefined),
          cpuLoad: data.diagnostics?.cpu_load !== undefined ? Number(data.diagnostics.cpu_load) : (data.diagnostics?.cpuLoad !== undefined ? Number(data.diagnostics.cpuLoad) : undefined),
          cpu0: data.diagnostics?.cpu0 !== undefined ? Number(data.diagnostics.cpu0) : undefined,
          cpu1: data.diagnostics?.cpu1 !== undefined ? Number(data.diagnostics.cpu1) : undefined,
          freeHeap: data.diagnostics?.free_heap !== undefined ? Number(data.diagnostics.free_heap) : (data.diagnostics?.freeHeap !== undefined ? Number(data.diagnostics.freeHeap) : undefined),
          uptimeSec: data.diagnostics?.uptime_sec !== undefined ? Number(data.diagnostics.uptime_sec) : (data.diagnostics?.uptimeSec !== undefined ? Number(data.diagnostics.uptimeSec) : undefined),
          wifiRssi: data.diagnostics?.wifi_rssi !== undefined ? Number(data.diagnostics.wifi_rssi) : (data.diagnostics?.wifiRssi !== undefined ? Number(data.diagnostics.wifiRssi) : undefined),
        },
        status: {
          alert: Boolean(data.status?.alert),
          sensorValid: data.status?.sensor_valid !== undefined ? Boolean(data.status.sensor_valid) : true,
        },
      };

      setLatestData(record);

      // Cập nhật Sparklines mini trên 8 thẻ (tối đa 30 điểm gần nhất)
      setSparkSeries((prev) => {
        const pushPoint = (arr: number[], val?: number) => {
          if (val === undefined || isNaN(val)) return arr;
          const next = [...arr, val];
          return next.length > 30 ? next.slice(-30) : next;
        };

        const freeHeapKb = record.diagnostics?.freeHeap !== undefined ? Math.round(record.diagnostics.freeHeap / 1024) : undefined;

        return {
          temperature: pushPoint(prev.temperature, record.metrics?.temperature),
          humidity: pushPoint(prev.humidity, record.metrics?.humidity),
          dewPoint: pushPoint(prev.dewPoint, record.metrics?.dewPoint),
          vpd: pushPoint(prev.vpd, record.metrics?.vpd),
          chipTemp: pushPoint(prev.chipTemp, record.diagnostics?.chipTemp),
          cpuLoad: pushPoint(prev.cpuLoad, record.diagnostics?.cpuLoad),
          freeHeap: pushPoint(prev.freeHeap, freeHeapKb),
          wifiRssi: pushPoint(prev.wifiRssi, record.diagnostics?.wifiRssi),
        };
      });

      // Nếu đang ở dải Realtime 5m: Giữ cửa sổ trượt 60 điểm gần nhất để đảm bảo 0% giật lag
      if (range === "5m") {
        setHistoryRecords((prev) => {
          const next = [...prev, record];
          return next.length > 60 ? next.slice(-60) : next;
        });
      }
    };

    onEvent("sensor:telemetry", handleRealtimePacket);

    return () => {
      offEvent("sensor:telemetry", handleRealtimePacket);
    };
  }, [range, onEvent, offEvent]);

  // 3. Heartbeat kiểm tra trạng thái Online / Offline mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastPacketTime) {
        setIsLiveConnected(false);
        return;
      }
      const diffSec = Math.round((Date.now() - lastPacketTime.getTime()) / 1000);
      if (diffSec >= 4) {
        setIsLiveConnected(false);
        setOfflineElapsedSec(diffSec);
      } else {
        setIsLiveConnected(true);
        setOfflineElapsedSec(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastPacketTime]);

  // Chuẩn hóa danh sách dữ liệu cho biểu đồ Recharts (đầy đủ 8 thông số)
  const chartData = useMemo(() => {
    return historyRecords.map((r) => {
      const d = new Date(r.timestamp * 1000);
      const timeLabel =
        range === "24h" || range === "7d"
          ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}`
          : `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

      const rawFreeHeap = r.diagnostics?.freeHeap ?? r.diagnostics?.free_heap;

      return {
        time: timeLabel,
        rawTimestamp: r.timestamp,
        temperature: r.metrics?.temperature,
        humidity: r.metrics?.humidity,
        dewPoint: r.metrics?.dewPoint ?? r.metrics?.dew_point,
        vpd: r.metrics?.vpd,
        chipTemp: r.diagnostics?.chipTemp ?? r.diagnostics?.chip_temp,
        cpuLoad: r.diagnostics?.cpuLoad ?? r.diagnostics?.cpu_load,
        freeHeap: rawFreeHeap !== undefined ? Math.round(rawFreeHeap / 1024) : undefined,
        wifiRssi: r.diagnostics?.wifiRssi ?? r.diagnostics?.wifi_rssi,
      };
    });
  }, [historyRecords, range]);

  // Thống kê Min, Max, Avg từ dữ liệu đang vẽ
  const stats = useMemo(() => {
    if (chartData.length === 0) return { count: 0, min: "--", max: "--", avg: "--" };

    let targetKey: keyof (typeof chartData)[0] = "temperature";
    if (viewMode === "single") {
      targetKey = selectedMetric;
    } else if (viewMode === "hardware") {
      targetKey = "chipTemp";
    }

    const values = chartData
      .map((item) => item[targetKey] as number | undefined)
      .filter((v): v is number => typeof v === "number" && !isNaN(v));

    if (values.length === 0) return { count: 0, min: "--", max: "--", avg: "--" };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      count: values.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
    };
  }, [chartData, viewMode, selectedMetric]);

  // Click chọn card để xem chi tiết
  const handleCardClick = (metric: MetricKey) => {
    setSelectedMetric(metric);
    setViewMode("single");
  };

  // Giá trị thực tế từ trạm (không dùng mock fallback)
  const tempVal = latestData?.metrics?.temperature;
  const humVal = latestData?.metrics?.humidity;
  const dewVal = latestData?.metrics?.dewPoint ?? latestData?.metrics?.dew_point;
  const vpdVal = latestData?.metrics?.vpd;
  const chipTempVal = latestData?.diagnostics?.chipTemp ?? latestData?.diagnostics?.chip_temp;
  const cpuLoadVal = latestData?.diagnostics?.cpuLoad ?? latestData?.diagnostics?.cpu_load;
  const cpu0Val = latestData?.diagnostics?.cpu0;
  const cpu1Val = latestData?.diagnostics?.cpu1;
  const rawHeap = latestData?.diagnostics?.freeHeap ?? latestData?.diagnostics?.free_heap;
  const freeHeapKb = rawHeap !== undefined ? Math.round(rawHeap / 1024) : undefined;
  const wifiVal = latestData?.diagnostics?.wifiRssi ?? latestData?.diagnostics?.wifi_rssi;
  const uptimeVal = latestData?.diagnostics?.uptimeSec ?? latestData?.diagnostics?.uptime_sec;
  const seqVal = latestData?.seq;

  // Đánh giá vi phạm chuẩn GSP thực tế
  const isTempViolated = tempVal !== undefined && (tempVal < 15.0 || tempVal > (station?.tempMax || 25.0));
  const isHumViolated = humVal !== undefined && humVal > (station?.humMax || 70.0);
  const isGspAlert = isTempViolated || isHumViolated || Boolean(latestData?.status?.alert);

  // Đánh giá khoa học về nguy cơ đọng sương:
  // Nguy cơ đọng sương CHỈ xảy ra khi nhiệt độ môi trường tiến gần điểm sương (chênh lệch <= 2.5°C) VÀ độ ẩm cao
  const dewDelta = tempVal !== undefined && dewVal !== undefined ? tempVal - dewVal : undefined;
  const isDewRisk = dewDelta !== undefined && (dewDelta <= 2.5 || (humVal !== undefined && humVal >= 85));

  // Format Uptime
  const formatUptime = (sec?: number) => {
    if (sec === undefined) return "--";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 text-slate-800 antialiased">
      {/* ── TOP HEADER: THÔNG TIN TRẠM & TRẠNG THÁI KẾT NỐI REALTIME ── */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
            <Radio className={`w-6 h-6 ${isLiveConnected ? "animate-pulse text-emerald-600" : "text-slate-400"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Giám Sát Môi Trường GSP — Kho Tổng
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 border border-teal-200 text-teal-700">
                {station?.targetId || "CENTRAL_WH"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600">
                ESP32-S3 Dual-Core
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Mã trạm: <code className="font-mono text-slate-700 font-semibold">{station?.deviceId || (latestData as any)?.deviceId || "ESP32S3_404CCA44C814"}</code></span>
              <span>•</span>
              <span>Gói tin: <strong className="font-mono text-slate-700">{seqVal !== undefined ? `#${seqVal}` : "--"}</strong></span>
              <span>•</span>
              <span>Uptime: <strong className="font-mono text-slate-700">{formatUptime(uptimeVal)}</strong></span>
              <span>•</span>
              <span>Lần cuối: <strong className="text-slate-700">{lastPacketTime ? lastPacketTime.toLocaleTimeString("vi-VN") : "Chưa có dữ liệu"}</strong></span>
            </p>
          </div>
        </div>

        {/* Trạng thái kết nối & Nút điều khiển */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge Chuẩn GSP */}
          {hasReceivedAny ? (
            <div
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                isGspAlert
                  ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              {isGspAlert ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              <span>{isGspAlert ? "CẢNH BÁO VI PHẠM GSP" : "ĐẠT CHUẨN GSP (15-25°C, ≤70%RH)"}</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>CHỜ KẾT NỐI TRẠM</span>
            </div>
          )}

          {/* Badge Trực tiếp (1Hz) */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-medium transition-all ${
              isLiveConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : hasReceivedAny
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected
                  ? "bg-emerald-500 animate-ping"
                  : hasReceivedAny
                  ? "bg-rose-500"
                  : "bg-slate-400"
              }`}
            />
            <span>
              {isLiveConnected
                ? "LIVE (1Hz)"
                : hasReceivedAny
                ? `MẤT TÍN HIỆU (${offlineElapsedSec || 4}s)`
                : "CHỜ KẾT NỐI"}
            </span>
          </div>

          {/* Nút Làm mới thủ công */}
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── BANNER CẢNH BÁO KHI TRẠM BỊ NGẮT KẾT NỐI ── */}
      {hasReceivedAny && !isLiveConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-800 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">THÔNG BÁO MẤT TÍN HIỆU:</span> Trạm cảm biến ESP32-S3 tại kho tổng hiện đang ngắt kết nối. Dưới đây là dữ liệu thực tế ghi nhận lần cuối lúc{" "}
            <strong>{lastPacketTime?.toLocaleTimeString("vi-VN")} {lastPacketTime?.toLocaleDateString("vi-VN")}</strong>. Hệ thống sẽ tự động cập nhật ngay khi trạm kết nối lại.
          </div>
        </div>
      )}

      {/* ── PHẦN 1: CÁC CHỈ SỐ MÔI TRƯỜNG GSP (4 THẺ CHÍNH KÈM MINI SPARKLINE) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>1. Chỉ Số Khí Hậu & Môi Trường GSP</span>
            <span className="text-[11px] font-normal text-slate-400">(Bấm vào thẻ để xem biểu đồ chi tiết)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Sensirion SHT31 High Precision</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Nhiệt độ Kho */}
          <div
            onClick={() => handleCardClick("temperature")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "temperature"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Thermometer className="w-4 h-4 text-emerald-600 shrink-0" />
                Nhiệt Độ Kho
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  tempVal === undefined
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : tempVal >= 15 && tempVal <= 25
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : tempVal > 25
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-cyan-50 text-cyan-700 border-cyan-200"
                }`}
              >
                {tempVal === undefined
                  ? "Chờ dữ liệu"
                  : tempVal >= 15 && tempVal <= 25
                  ? "Chuẩn GSP"
                  : tempVal > 25
                  ? "Vượt chuẩn"
                  : "Thấp"}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                {tempVal !== undefined ? tempVal.toFixed(2) : "--.-"}
              </span>
              <span className="text-base font-semibold text-slate-500">°C</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.temperature} color="#10b981" minRange={2.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Chuẩn: <strong>15 - 25°C</strong></span>
              <span
                className={`font-semibold ${
                  tempVal === undefined
                    ? "text-slate-400"
                    : tempVal > 25
                    ? "text-rose-600"
                    : tempVal < 15
                    ? "text-cyan-600"
                    : "text-emerald-600"
                }`}
              >
                {tempVal === undefined
                  ? "--"
                  : tempVal > 25
                  ? "Vượt chuẩn (Quá nóng)"
                  : tempVal < 15
                  ? "Thấp hơn chuẩn"
                  : "Bảo quản mát chuẩn GSP"}
              </span>
            </div>
          </div>

          {/* Card 2: Độ ẩm không khí */}
          <div
            onClick={() => handleCardClick("humidity")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "humidity"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Droplets className="w-4 h-4 text-cyan-600 shrink-0" />
                Độ Ẩm Không Khí
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  humVal === undefined
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : humVal <= 70
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {humVal === undefined
                  ? "Chờ dữ liệu"
                  : humVal <= 70
                  ? "Tối ưu"
                  : "Quá ẩm"}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-cyan-700 tracking-tight">
                {humVal !== undefined ? humVal.toFixed(2) : "--.-"}
              </span>
              <span className="text-base font-semibold text-cyan-600">%RH</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.humidity} color="#06b6d4" minRange={5.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Giới hạn GSP: <strong>≤ 70%</strong></span>
              <span className={`font-semibold ${humVal !== undefined && humVal > 70 ? "text-rose-600" : "text-cyan-700"}`}>
                {humVal === undefined ? "--" : humVal <= 70 ? "Độ ẩm an toàn" : "Quá ẩm (Nguy cơ hỏng thuốc)"}
              </span>
            </div>
          </div>

          {/* Card 3: Điểm sương (Dew Point) */}
          <div
            onClick={() => handleCardClick("dewPoint")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "dewPoint"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <CloudFog className="w-4 h-4 text-indigo-600 shrink-0" />
                Điểm Sương (Td)
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  isDewRisk
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {dewVal === undefined ? "Magnus" : isDewRisk ? "Nguy cơ ngưng tụ" : "An toàn (Khô)"}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-indigo-700 tracking-tight">
                {dewVal !== undefined ? dewVal.toFixed(2) : "--.-"}
              </span>
              <span className="text-base font-semibold text-indigo-500">°C</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.dewPoint} color="#6366f1" minRange={2.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Độ chênh (T - Td):</span>
              <span className={`font-semibold ${isDewRisk ? "text-amber-600" : "text-indigo-600"}`}>
                {dewDelta !== undefined ? `+${dewDelta.toFixed(1)}°C (${isDewRisk ? "Gần bão hòa" : "Khô ráo"})` : "--"}
              </span>
            </div>
          </div>

          {/* Card 4: Độ hụt áp suất hơi nước (VPD) */}
          <div
            onClick={() => handleCardClick("vpd")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "vpd"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Gauge className="w-4 h-4 text-purple-600 shrink-0" />
                Áp Suất Hơi (VPD)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap shrink-0">
                Thoát ẩm
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-purple-700 tracking-tight">
                {vpdVal !== undefined ? vpdVal.toFixed(2) : "--.-"}
              </span>
              <span className="text-base font-semibold text-purple-500">kPa</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.vpd} color="#a855f7" minRange={0.5} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Mức thoát ẩm:</span>
              <span className="font-semibold text-purple-600">
                {vpdVal === undefined
                  ? "--"
                  : vpdVal > 2.0
                  ? "Bốc hơi rất nhanh"
                  : vpdVal >= 1.2
                  ? "Bốc hơi nhanh"
                  : vpdVal >= 0.8
                  ? "Lý tưởng (0.8 - 1.2)"
                  : "Bốc ẩm chậm"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PHẦN 2: CHẨN ĐOÁN PHẦN CỨNG ESP32-S3 (ĐẦY ĐỦ 4 THẺ CHẨN ĐOÁN) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>2. Chẩn Đoán Phần Cứng ESP32-S3</span>
            <span className="text-[11px] font-normal text-slate-400">(Bấm vào thẻ để xem biểu đồ chi tiết)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Xtensa LX7 Dual-Core Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 5: Nhiệt độ Chip ESP32 */}
          <div
            onClick={() => handleCardClick("chipTemp")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "chipTemp"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Cpu className="w-4 h-4 text-amber-600 shrink-0" />
                Nhiệt Độ Chip
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  chipTempVal === undefined
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : chipTempVal < 45
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : chipTempVal <= 65
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : chipTempVal <= 75
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {chipTempVal === undefined
                  ? "Chờ đo"
                  : chipTempVal < 45
                  ? "Mát"
                  : chipTempVal <= 65
                  ? "Bình thường"
                  : chipTempVal <= 75
                  ? "Ấm"
                  : "Quá nhiệt"}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-amber-700 tracking-tight">
                {chipTempVal !== undefined ? chipTempVal.toFixed(1) : "--.-"}
              </span>
              <span className="text-base font-semibold text-amber-500">°C</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.chipTemp} color="#f59e0b" minRange={5.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Giới hạn an toàn:</span>
              <span className="text-slate-700 font-semibold">&lt; 75°C (Tự làm mát)</span>
            </div>
          </div>

          {/* Card 6: Tải CPU Tổng */}
          <div
            onClick={() => handleCardClick("cpuLoad")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "cpuLoad"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Activity className="w-4 h-4 text-orange-600 shrink-0" />
                Tải CPU Tổng
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap shrink-0">
                Core 0 & 1
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-orange-700 tracking-tight">
                {cpuLoadVal !== undefined ? Math.round(cpuLoadVal) : "--"}
              </span>
              <span className="text-base font-semibold text-orange-500">%</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.cpuLoad} color="#f97316" minRange={10.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>C0: <strong>{cpu0Val !== undefined ? `${Math.round(cpu0Val)}%` : "--"}</strong></span>
              <span>C1: <strong>{cpu1Val !== undefined ? `${Math.round(cpu1Val)}%` : "--"}</strong></span>
            </div>
          </div>

          {/* Card 7: RAM Heap Trống */}
          <div
            onClick={() => handleCardClick("freeHeap")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "freeHeap"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Layers className="w-4 h-4 text-teal-600 shrink-0" />
                RAM Heap Trống
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap shrink-0">
                SRAM
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-teal-700 tracking-tight">
                {freeHeapKb !== undefined ? freeHeapKb : "--"}
              </span>
              <span className="text-base font-semibold text-teal-500">KB</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.freeHeap} color="#14b8a6" minRange={20.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>SRAM khả dụng:</span>
              <span className="font-semibold text-teal-700">{freeHeapKb !== undefined ? `~${freeHeapKb} KB (Ổn định)` : "--"}</span>
            </div>
          </div>

          {/* Card 8: Tín hiệu Wi-Fi (RSSI) */}
          <div
            onClick={() => handleCardClick("wifiRssi")}
            className={`bg-white rounded-2xl border p-5 cursor-pointer relative overflow-hidden transition-all shadow-xs hover:shadow-md ${
              viewMode === "single" && selectedMetric === "wifiRssi"
                ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5 whitespace-nowrap truncate">
                <Wifi className="w-4 h-4 text-sky-600 shrink-0" />
                Sóng Wi-Fi (RSSI)
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  wifiVal === undefined
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : wifiVal >= -65
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : wifiVal >= -75
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {wifiVal === undefined ? "Chờ đo" : wifiVal >= -65 ? "Rất mạnh" : wifiVal >= -75 ? "Tốt" : "Yếu"}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-3xl font-extrabold font-mono text-sky-700 tracking-tight">
                {wifiVal !== undefined ? wifiVal : "--"}
              </span>
              <span className="text-base font-semibold text-sky-500">dBm</span>
            </div>

            <div className="mt-2">
              <SparklineCanvas data={sparkSeries.wifiRssi} color="#0284c7" minRange={10.0} />
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Gói tin: <strong className="text-slate-700">{seqVal !== undefined ? `#${seqVal}` : "--"}</strong></span>
              <span className="text-sky-700 font-medium">{wifiVal !== undefined && wifiVal >= -75 ? "Kết nối tốt" : "Cần kiểm tra AP"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PHẦN 3: MASTER DETAILED CHART (BIỂU ĐỒ CHI TIẾT TƯƠNG TÁC) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                {viewMode === "climate"
                  ? "Biểu Đồ Toàn Cảnh: Khí Hậu & Môi Trường Kho"
                  : viewMode === "hardware"
                  ? "Biểu Đồ Toàn Cảnh: Chẩn Đoán Phần Cứng ESP32-S3"
                  : `Biểu Đồ Chi Tiết: ${METRIC_DEFINITIONS[selectedMetric].label} (${METRIC_DEFINITIONS[selectedMetric].unit})`}
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {range === "5m" ? "Realtime 1Hz" : range === "1h" ? "1 Giờ" : range === "24h" ? "24 Giờ" : "7 Ngày"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dữ liệu chuỗi thời gian thực tế thu thập từ trạm ESP32-S3 tại kho tổng CENTRAL_WH.
            </p>
          </div>

          {/* Controls: Chế độ xem & Dải thời gian */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setViewMode("climate")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "climate"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Khí Hậu
              </button>
              <button
                onClick={() => setViewMode("hardware")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "hardware"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Phần Cứng
              </button>
              <button
                onClick={() => setViewMode("single")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "single"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đơn Lẻ
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
              {(["5m", "1h", "24h", "7d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    range === r
                      ? "bg-teal-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r === "5m" ? "5 Phút" : r === "1h" ? "1 Giờ" : r === "24h" ? "24 Giờ" : "7 Ngày"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Khung vẽ biểu đồ Recharts (Tắt hoạt ảnh để triệt tiêu hoàn toàn giật lag) */}
        <div className="w-full h-80 sm:h-96 relative">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center p-6">
              <Radio className="w-10 h-10 text-slate-400 mb-2 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">Chưa có dữ liệu từ trạm cảm biến ESP32-S3</span>
              <span className="text-xs text-slate-500 mt-1 max-w-md">
                Biểu đồ sẽ tự động vẽ ngay khi nhận được gói tin dữ liệu thực tế đầu tiên từ thiết bị.
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === "climate" ? (
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={11} domain={["auto", "auto"]} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      color: "#1e293b",
                    }}
                  />
                  {/* Ngưỡng GSP */}
                  <ReferenceLine yAxisId="left" y={25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max 25°C", fill: "#ef4444", fontSize: 10 }} />
                  <ReferenceLine yAxisId="left" y={15} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "Min 15°C", fill: "#3b82f6", fontSize: 10 }} />
                  <ReferenceLine yAxisId="right" y={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Max 70%RH", fill: "#f59e0b", fontSize: 10 }} />

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    name="Nhiệt độ (°C)"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    name="Độ ẩm (%RH)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="dewPoint"
                    name="Điểm sương (°C)"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : viewMode === "hardware" ? (
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} domain={["auto", "auto"]} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      color: "#1e293b",
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chipTemp"
                    name="Nhiệt độ Chip (°C)"
                    stroke="#f59e0b"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cpuLoad"
                    name="Tải CPU (%)"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="wifiRssi"
                    name="Wi-Fi RSSI (dBm)"
                    stroke="#0284c7"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="singleMetricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={METRIC_DEFINITIONS[selectedMetric].color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={METRIC_DEFINITIONS[selectedMetric].color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke={METRIC_DEFINITIONS[selectedMetric].color} fontSize={11} domain={["auto", "auto"]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      color: "#1e293b",
                    }}
                  />
                  {selectedMetric === "temperature" && (
                    <>
                      <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max 25°C", fill: "#ef4444", fontSize: 10 }} />
                      <ReferenceLine y={15} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "Min 15°C", fill: "#3b82f6", fontSize: 10 }} />
                    </>
                  )}
                  {selectedMetric === "humidity" && (
                    <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Max 70%RH", fill: "#f59e0b", fontSize: 10 }} />
                  )}
                  {selectedMetric === "chipTemp" && (
                    <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Cảnh báo 75°C", fill: "#ef4444", fontSize: 10 }} />
                  )}
                  <Area
                    type="monotone"
                    dataKey={selectedMetric}
                    name={`${METRIC_DEFINITIONS[selectedMetric].label} (${METRIC_DEFINITIONS[selectedMetric].unit})`}
                    stroke={METRIC_DEFINITIONS[selectedMetric].color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#singleMetricGrad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Master Chart Footer Stats */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-500">
          <div>Điểm dữ liệu: <strong className="text-slate-800 font-semibold">{stats.count}</strong></div>
          <div>Thấp nhất: <strong className="text-slate-800 font-semibold">{stats.min}</strong></div>
          <div>Cao nhất: <strong className="text-slate-800 font-semibold">{stats.max}</strong></div>
          <div>Trung bình: <strong className="text-slate-800 font-semibold">{stats.avg}</strong></div>
        </div>
      </div>
    </div>
  );
}

export default GspTelemetryDashboard;
