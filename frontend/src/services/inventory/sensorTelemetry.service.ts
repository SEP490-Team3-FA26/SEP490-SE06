import api from '../core/api';

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
    const res = await api.get('/api/sensor/latest', {
      params: deviceId ? { deviceId } : {},
    });
    return res.data;
  },

  // Lấy chuỗi dữ liệu lịch sử (5m, 1h, 24h, 7d)
  async getHistory(deviceId?: string, range: string = '1h'): Promise<{
    success: boolean;
    deviceId: string;
    range: string;
    count: number;
    totalRaw: number;
    records: TelemetryRecord[];
  }> {
    const res = await api.get('/api/sensor/history', {
      params: {
        deviceId: deviceId || 'ESP32S3_404CCA44C814',
        range,
      },
    });
    return res.data;
  },

  // Lấy danh sách các trạm đo
  async getStations(): Promise<{ success: boolean; data: SensorStation[] }> {
    const res = await api.get('/api/sensor/stations');
    return res.data;
  },
};
