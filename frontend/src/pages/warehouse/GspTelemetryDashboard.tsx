import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Thermometer,
  Droplets,
  Gauge,
  CloudFog,
  Cpu,
  Wifi,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Activity,
  Server,
  Zap,
  CheckCircle2,
  BellRing,
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

export function GspTelemetryDashboard() {
  const [station, setStation] = useState<SensorStation | null>(null);
  const [latestData, setLatestData] = useState<TelemetryRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TelemetryRecord[]>([]);
  const [range, setRange] = useState<"5m" | "1h" | "24h" | "7d">("1h");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);

  const { onEvent, offEvent } = useSocket();

  // 1. Tải dữ liệu ban đầu và lịch sử
  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [latestRes, historyRes] = await Promise.all([
        sensorTelemetryService.getLatest(),
        sensorTelemetryService.getHistory(undefined, range),
      ]);

      if (latestRes.success) {
        setStation(latestRes.station);
        if (latestRes.data) {
          setLatestData(latestRes.data);
          setLastPacketTime(new Date(latestRes.data.timestamp * 1000));
        }
      }

      if (historyRes.success && historyRes.records) {
        setHistoryRecords(historyRes.records);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu telemetry:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [range]);

  // 2. Lắng nghe Realtime qua WebSocket / SSE (1s/lần)
  useEffect(() => {
    const handleRealtimePacket = (data: any) => {
      setIsLiveConnected(true);
      setLastPacketTime(new Date());

      const record: TelemetryRecord = {
        timestamp: data.timestamp || Math.floor(Date.now() / 1000),
        seq: data.seq || 0,
        metrics: {
          temperature: Number(data.metrics?.temperature ?? 0),
          humidity: Number(data.metrics?.humidity ?? 0),
          dewPoint: Number(data.metrics?.dew_point ?? data.metrics?.dewPoint ?? 0),
          vpd: Number(data.metrics?.vpd ?? 0),
        },
        diagnostics: {
          chipTemp: Number(data.diagnostics?.chip_temp ?? data.diagnostics?.chipTemp ?? 0),
          cpuLoad: Number(data.diagnostics?.cpu_load ?? data.diagnostics?.cpuLoad ?? 0),
          cpu0: Number(data.diagnostics?.cpu0 ?? 0),
          cpu1: Number(data.diagnostics?.cpu1 ?? 0),
          freeHeap: Number(data.diagnostics?.free_heap ?? data.diagnostics?.freeHeap ?? 0),
          uptimeSec: Number(data.diagnostics?.uptime_sec ?? data.diagnostics?.uptimeSec ?? 0),
          wifiRssi: Number(data.diagnostics?.wifi_rssi ?? data.diagnostics?.wifiRssi ?? 0),
        },
        status: {
          alert: Boolean(data.status?.alert),
          sensorValid: data.status?.sensor_valid !== undefined ? Boolean(data.status?.sensor_valid) : true,
        },
      };

      setLatestData(record);

      // Cập nhật biểu đồ lịch sử theo thời gian thực (nếu đang xem 5m hoặc 1h)
      if (range === "5m" || range === "1h") {
        setHistoryRecords((prev) => {
          const updated = [...prev, record];
          const maxPoints = range === "5m" ? 300 : 3600;
          return updated.slice(-maxPoints);
        });
      }
    };

    onEvent("sensor:telemetry", handleRealtimePacket);

    return () => {
      offEvent("sensor:telemetry", handleRealtimePacket);
    };
  }, [range, onEvent, offEvent]);

  // 3. Chuẩn hóa dữ liệu biểu đồ Recharts
  const chartData = useMemo(() => {
    return historyRecords.map((r) => {
      const d = new Date(r.timestamp * 1000);
      const timeLabel =
        range === "24h" || range === "7d"
          ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}`
          : `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

      return {
        time: timeLabel,
        rawTime: r.timestamp,
        temperature: r.metrics?.temperature ?? 0,
        humidity: r.metrics?.humidity ?? 0,
        dewPoint: r.metrics?.dewPoint ?? r.metrics?.dew_point ?? 0,
        vpd: r.metrics?.vpd ?? 0,
        cpuLoad: r.diagnostics?.cpuLoad ?? r.diagnostics?.cpu_load ?? 0,
      };
    });
  }, [historyRecords, range]);

  // Đánh giá trạng thái chuẩn GSP hiện tại
  const temp = latestData?.metrics?.temperature ?? 24.5;
  const hum = latestData?.metrics?.humidity ?? 62.0;
  const dewPoint = latestData?.metrics?.dewPoint ?? latestData?.metrics?.dew_point ?? 16.8;
  const vpd = latestData?.metrics?.vpd ?? 1.15;

  const isTempViolated = temp < 15.0 || temp > (station?.tempMax || 25.0);
  const isHumViolated = hum > (station?.humMax || 70.0);
  const isGspAlert = isTempViolated || isHumViolated || Boolean(latestData?.status?.alert);

  // Định dạng Uptime giờ:phút:giây
  const uptimeSec = latestData?.diagnostics?.uptimeSec ?? latestData?.diagnostics?.uptime_sec ?? 0;
  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* ── HEADER PHÒNG ĐIỀU HÀNH IOT GSP ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-teal-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Trạm Giám Sát Môi Trường GSP — Kho Tổng
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400">
                CENTRAL_WH
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
                ESP32-S3 Dual-Core
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Mã phần cứng: <code className="text-sky-300 font-mono">{station?.deviceId || "ESP32S3_404CCA44C814"}</code></span>
              <span>•</span>
              <span>Cảm biến: Sensirion SHT31 (I2C)</span>
            </p>
          </div>
        </div>

        {/* Trạng thái GSP & Kết nối Realtime */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge Chuẩn GSP */}
          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
              isGspAlert
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse shadow-lg shadow-rose-500/20"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/10"
            }`}
          >
            {isGspAlert ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{isGspAlert ? "CẢNH BÁO VI PHẠM GSP" : "ĐẠT CHUẨN GSP (15-25°C, <70%RH)"}</span>
          </div>

          {/* Badge Live Realtime */}
          <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-emerald-400 font-semibold">1Hz Live</span>
            {lastPacketTime && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({lastPacketTime.toLocaleTimeString()})
              </span>
            )}
          </div>

          {/* Nút Làm mới */}
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── THẺ CHỈ SỐ QUAN TRẮC MÔI TRƯỜNG THỰC TẾ ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Nhiệt độ */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nhiệt độ Kho</span>
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Thermometer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {temp.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-sky-400">°C</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Chuẩn GSP: 15.0°C – 25.0°C</span>
            <span className={`font-semibold ${isTempViolated ? "text-rose-400" : "text-emerald-400"}`}>
              {isTempViolated ? "Vượt chuẩn" : "An toàn"}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isTempViolated ? "bg-rose-500" : "bg-gradient-to-r from-sky-400 to-teal-400"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, ((temp - 10) / 25) * 100))}%` }}
            />
          </div>
        </div>

        {/* 2. Độ ẩm */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Độ ẩm Không khí</span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {hum.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-teal-400">%RH</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Ngưỡng tối đa: &lt; 70% RH</span>
            <span className={`font-semibold ${isHumViolated ? "text-rose-400" : "text-emerald-400"}`}>
              {isHumViolated ? "Ẩm cao" : "Chuẩn GSP"}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isHumViolated ? "bg-rose-500" : "bg-gradient-to-r from-teal-400 to-emerald-400"
              }`}
              style={{ width: `${Math.min(100, hum)}%` }}
            />
          </div>
        </div>

        {/* 3. Điểm sương */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm Sương (Dew Point)</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <CloudFog className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {dewPoint.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-purple-400">°C</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Ngưng tụ hơi ẩm</span>
            <span className="text-slate-300 font-mono">Magnus Eq</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, (dewPoint / 35) * 100))}%` }}
            />
          </div>
        </div>

        {/* 4. VPD (Vapor Pressure Deficit) */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Độ Hụt Áp Suất (VPD)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {vpd.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-amber-400">kPa</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Thoát ẩm dược phẩm</span>
            <span className="text-amber-300 font-semibold">{vpd > 1.4 ? "Thoát ẩm nhanh" : "Tối ưu"}</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (vpd / 2.5) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── BIỂU ĐỒ DIỄN BIẾN LỊCH SỬ CHUẨN GSP ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 lg:p-6 backdrop-blur shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <span>Biểu Đồ Xu Hướng Nhiệt Độ & Độ Ẩm (Chuỗi Thời Gian)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đường nét đứt màu đỏ và cam đánh dấu ngưỡng giới hạn an toàn dược phẩm theo tiêu chuẩn GSP
            </p>
          </div>

          {/* Dải chọn thời gian */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            {(["5m", "1h", "24h", "7d"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setRange(item)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  range === item
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item === "5m" ? "5 Phút" : item === "1h" ? "1 Giờ" : item === "24h" ? "24 Giờ" : "7 Ngày"}
              </button>
            ))}
          </div>
        </div>

        {/* Khung vẽ Recharts */}
        <div className="w-full h-72 sm:h-80 lg:h-96">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
              Đang tiếp nhận dữ liệu telemetry từ trạm cảm biến...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} domain={[10, 35]} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#2dd4bf" fontSize={11} domain={[30, 90]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#1e293b",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                />

                {/* Ngưỡng cảnh báo GSP */}
                <ReferenceLine yAxisId="left" y={25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max 25°C", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceLine yAxisId="left" y={15} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: "Min 15°C", fill: "#38bdf8", fontSize: 10, position: "insideBottomLeft" }} />
                <ReferenceLine yAxisId="right" y={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Max 70%RH", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Nhiệt độ (°C)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tempGradient)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Độ ẩm (%RH)"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#humGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── CHẨN ĐOÁN PHẦN CỨNG ESP32-S3 (HARDWARE HEALTH) ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Chẩn Đoán Sức Khỏe Vi Điều Khiển ESP32-S3
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Chip Temp */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Nhiệt độ Chip</span>
            <div className="text-base font-bold font-mono text-white mt-1">
              {(latestData?.diagnostics?.chipTemp ?? latestData?.diagnostics?.chip_temp ?? 42.5).toFixed(1)}°C
            </div>
            <span className="text-[10px] text-slate-500">Mức an toàn &lt; 75°C</span>
          </div>

          {/* CPU Total */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Tải CPU Tổng</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {(latestData?.diagnostics?.cpuLoad ?? latestData?.diagnostics?.cpu_load ?? 3.0).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500">Dual-Core 240MHz</span>
          </div>

          {/* CPU Core 0 / Core 1 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Nhân C0 / C1</span>
            <div className="text-sm font-bold font-mono text-sky-400 mt-1">
              {(latestData?.diagnostics?.cpu0 ?? 2.1).toFixed(0)}% / {(latestData?.diagnostics?.cpu1 ?? 3.5).toFixed(0)}%
            </div>
            <span className="text-[10px] text-slate-500">C0: Network | C1: Sensor</span>
          </div>

          {/* Free Heap */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">RAM Khả Dụng</span>
            <div className="text-sm font-bold font-mono text-purple-300 mt-1">
              {Math.round((latestData?.diagnostics?.freeHeap ?? latestData?.diagnostics?.free_heap ?? 184320) / 1024)} KB
            </div>
            <span className="text-[10px] text-slate-500">+8MB PSRAM Buffer</span>
          </div>

          {/* Wi-Fi RSSI */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Sóng Wi-Fi</span>
            <div className="text-sm font-bold font-mono text-teal-400 mt-1 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              <span>{latestData?.diagnostics?.wifiRssi ?? latestData?.diagnostics?.wifi_rssi ?? -58} dBm</span>
            </div>
            <span className="text-[10px] text-slate-500">Kết nối ổn định</span>
          </div>

          {/* Uptime */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Thời Gian Chạy</span>
            <div className="text-sm font-bold font-mono text-amber-300 mt-1">
              {formatUptime(uptimeSec)}
            </div>
            <span className="text-[10px] text-slate-500">Seq #{latestData?.seq ?? 1052}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default GspTelemetryDashboard;
