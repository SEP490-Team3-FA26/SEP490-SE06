import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface TelemetryMetrics {
  temperature: number;
  humidity: number;
  dewPoint?: number;
  dew_point?: number;
  vpd: number;
}

export interface TelemetryDiagnostics {
  chipTemp?: number;
  chip_temp?: number;
  cpuLoad?: number;
  cpu_load?: number;
  cpu0?: number;
  cpu1?: number;
  freeHeap?: number;
  free_heap?: number;
  uptimeSec?: number;
  uptime_sec?: number;
  wifiRssi?: number;
  wifi_rssi?: number;
}

export interface TelemetryStatus {
  alert: boolean;
  sensorValid?: boolean;
  sensor_valid?: boolean;
}

export interface TelemetryRecord {
  timestamp: number;
  seq: number;
  metrics: TelemetryMetrics;
  diagnostics: TelemetryDiagnostics;
  status: TelemetryStatus;
}

export interface SensorStation {
  deviceId: string;
  name: string;
  targetType: string;
  targetId: string;
  tempMin: number;
  tempMax: number;
  humMax: number;
  isActive: boolean;
  lastSeenAt?: string;
  lastMetrics?: TelemetryMetrics;
}

export const sensorTelemetryService = {
  // Lấy chỉ số mới nhất của trạm
  async getLatest(deviceId?: string): Promise<{ success: boolean; station: SensorStation; data: TelemetryRecord | null }> {
    const res = await api.get(API_ENDPOINTS.SENSORS.LATEST, {
      params: deviceId ? { deviceId } : {},
    });
    return res.data;
  },

  // Lấy chuỗi dữ liệu lịch sử (5m, 1h, 24h, 7d hoặc theo khoảng thời gian quá khứ from - to)
  async getHistory(
    deviceId?: string,
    range: string = '1h',
    from?: string | number,
    to?: string | number,
  ): Promise<{
    success: boolean;
    deviceId: string;
    range: string;
    from?: number;
    to?: number;
    count: number;
    totalRaw: number;
    records: TelemetryRecord[];
  }> {
    const params: any = { range };
    if (deviceId) params.deviceId = deviceId;
    if (from !== undefined) params.from = from;
    if (to !== undefined) params.to = to;

    const res = await api.get(API_ENDPOINTS.SENSORS.HISTORY, { params });
    return res.data;
  },

  // Lấy danh sách các trạm đo
  async getStations(): Promise<{ success: boolean; data: SensorStation[] }> {
    const res = await api.get(API_ENDPOINTS.SENSORS.STATIONS);
    return res.data;
  },
};
