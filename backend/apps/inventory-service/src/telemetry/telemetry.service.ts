import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SensorTelemetry } from './schemas/sensor-telemetry.schema';
import { SensorStation } from './schemas/sensor-station.schema';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);

  // Bộ nhớ đệm ghi nhận mốc thời gian lưu MongoDB gần nhất của từng trạm
  private readonly lastSavedMap = new Map<string, number>();

  // Ghi nhận trạng thái cảnh báo gần nhất để phát hiện mốc chuyển đổi trạng thái (State Transition)
  private readonly lastAlertMap = new Map<string, boolean>();

  // Bộ nhớ đệm cấu hình trạm trong RAM để tránh query findOne vào MongoDB mỗi giây
  private readonly stationCache = new Map<string, { station: any; cachedAt: number }>();

  // Mốc thời gian cập nhật sensor_stations gần nhất (giãn cách tối thiểu 15s để giảm tải DB)
  private readonly lastStationUpdateMap = new Map<string, number>();

  constructor(
    @InjectModel(SensorTelemetry.name)
    private readonly telemetryModel: Model<SensorTelemetry>,
    @InjectModel(SensorStation.name)
    private readonly stationModel: Model<SensorStation>,
  ) {}

  async onModuleInit() {
    try {
      // Tự động đồng bộ các index khai báo trong schema (bao gồm TTL 7 ngày tự dọn dẹp)
      await Promise.all([
        this.telemetryModel.syncIndexes(),
        this.stationModel.syncIndexes(),
      ]);
      this.logger.log('Đã đồng bộ indexes và TTL cho Telemetry và SensorStation thành công');
    } catch (err) {
      this.logger.warn(`Lỗi khi syncIndexes telemetry: ${err?.message || err}`);
    }
  }

  // =========================================================================
  // XỬ LÝ INGESTION TỪ KAFKA (HỖ TRỢ CẢ REALTIME VÀ BATCH INGESTION)
  // =========================================================================
  async handleIngestEvent(payload: {
    deviceId: string;
    isBatch: boolean;
    record?: any;
    records?: any[];
    receivedAt: string;
  }) {
    const { deviceId, isBatch, record, records } = payload;
    if (!deviceId) return;

    const nowMs = Date.now();

    // 1. Tự động tìm hoặc upsert trạm cảm biến (ưu tiên đọc từ cache RAM)
    let stationEntry = this.stationCache.get(deviceId);
    let station = stationEntry?.station;

    if (!station || nowMs - stationEntry.cachedAt > 300000) {
      station = await this.stationModel.findOne({ deviceId });
      if (!station) {
        station = await this.stationModel.create({
          deviceId,
          name: `Trạm Quan Trắc Kho Tổng GSP (${deviceId})`,
          targetType: 'WAREHOUSE',
          targetId: 'CENTRAL_WH',
          tempMin: 15.0,
          tempMax: 25.0,
          humMax: 70.0,
          isActive: true,
        });
        this.logger.log(`[SensorStation] Đã tự động tạo trạm mới cho thiết bị: ${deviceId}`);
      }
      this.stationCache.set(deviceId, { station, cachedAt: nowMs });
    }

    const items = isBatch ? (records || []) : (record ? [record] : []);
    if (items.length === 0) return;

    // 2. Chuyển đổi dữ liệu sang định dạng MongoDB Document
    const docs = items.map((item) => {
      const ts = Number(item.timestamp) || Math.floor(Date.now() / 1000);
      const temp = Number(item.metrics?.temperature ?? 0);
      const hum = Number(item.metrics?.humidity ?? 0);

      // Tự động kiểm tra cờ vi phạm GSP (Nhiệt độ > 25°C hoặc Độ ẩm > 70%)
      const isGspViolated = temp > (station.tempMax || 25.0) || hum > (station.humMax || 70.0);

      return {
        deviceId,
        targetType: station.targetType || 'WAREHOUSE',
        targetId: station.targetId || 'CENTRAL_WH',
        timestamp: ts,
        measuredAt: new Date(ts * 1000),
        seq: Number(item.seq) || 0,
        metrics: {
          temperature: temp,
          humidity: hum,
          dewPoint: Number(item.metrics?.dew_point ?? item.metrics?.dewPoint ?? 0),
          vpd: Number(item.metrics?.vpd ?? 0),
        },
        diagnostics: {
          chipTemp: Number(item.diagnostics?.chip_temp ?? item.diagnostics?.chipTemp ?? 0),
          cpuLoad: Number(item.diagnostics?.cpu_load ?? item.diagnostics?.cpuLoad ?? 0),
          cpu0: Number(item.diagnostics?.cpu0 ?? 0),
          cpu1: Number(item.diagnostics?.cpu1 ?? 0),
          freeHeap: Number(item.diagnostics?.free_heap ?? item.diagnostics?.freeHeap ?? 0),
          uptimeSec: Number(item.diagnostics?.uptime_sec ?? item.diagnostics?.uptimeSec ?? 0),
          wifiRssi: Number(item.diagnostics?.wifi_rssi ?? item.diagnostics?.wifiRssi ?? 0),
        },
        status: {
          alert: Boolean(item.status?.alert || isGspViolated),
          sensorValid: item.status?.sensor_valid !== undefined ? Boolean(item.status?.sensor_valid) : true,
        },
      };
    });

    const latestDoc = docs[docs.length - 1];

    // 3. Cập nhật trạng thái trạm cảm biến (giãn cách tối thiểu 15s để tránh đập DB mỗi giây)
    const lastStationUpdate = this.lastStationUpdateMap.get(deviceId) || 0;
    if (nowMs - lastStationUpdate >= 15000) {
      this.lastStationUpdateMap.set(deviceId, nowMs);
      this.stationModel.updateOne(
        { deviceId },
        {
          $set: {
            lastSeenAt: new Date(),
            lastMetrics: latestDoc.metrics,
          },
        },
      ).catch((err) => this.logger.warn(`Lỗi cập nhật trạm ${deviceId}: ${err?.message}`));
    }

    if (latestDoc.status.alert) {
      this.logger.warn(
        `[GSP VIOLATION] Trạm ${deviceId} vượt ngưỡng bảo quản thuốc! Nhiệt độ: ${latestDoc.metrics.temperature}°C, Độ ẩm: ${latestDoc.metrics.humidity}%`,
      );
    }

    // 4. Cơ chế lưu trữ MongoDB thông minh (Khắc phục việc spam DB mỗi giây)
    try {
      if (isBatch) {
        // Gói gửi bù dữ liệu offline: Lưu toàn bộ bản ghi
        await this.telemetryModel.insertMany(docs, { ordered: false });
        this.logger.log(`[Storage-Batch] Đã lưu ${docs.length} bản ghi offline từ ${deviceId} vào MongoDB`);
      } else {
        // Gói Realtime 1s:
        // - Lưu NGAY LẬP TỨC khi phát hiện chuyển đổi trạng thái (vừa vào alert hoặc vừa hết alert)
        // - Khi duy trì cảnh báo kéo dài: Lưu giãn cách tối thiểu 30 giây / lần (thay vì mỗi giây)
        // - Khi trạng thái bình thường: Lưu giãn cách 60 giây / lần
        const lastSaved = this.lastSavedMap.get(deviceId) || 0;
        const lastAlert = this.lastAlertMap.get(deviceId);
        const isAlertTransition = lastAlert !== undefined && lastAlert !== latestDoc.status.alert;
        const interval = latestDoc.status.alert ? 30 : 60;
        const shouldPersist = isAlertTransition || (latestDoc.timestamp - lastSaved >= interval);

        if (shouldPersist) {
          await this.telemetryModel.create(latestDoc);
          this.lastSavedMap.set(deviceId, latestDoc.timestamp);
          this.lastAlertMap.set(deviceId, latestDoc.status.alert);
          this.logger.log(
            `[Storage-${interval}s] Đã lưu mốc quan trắc (${latestDoc.metrics.temperature}°C - ${latestDoc.metrics.humidity}%) từ ${deviceId} vào MongoDB ${latestDoc.status.alert ? '[ALERT]' : ''} ${isAlertTransition ? '[TRANSITION]' : ''}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Lỗi lưu telemetry từ ${deviceId} vào MongoDB:`, err?.message || err);
    }
  }

  // =========================================================================
  // API TRUY VẤN: LẤY CHỈ SỐ MỚI NHẤT
  // =========================================================================
  async getLatest(deviceId?: string) {
    const filter = deviceId ? { deviceId } : {};
    const [latestTelemetry, station] = await Promise.all([
      this.telemetryModel.findOne(filter).sort({ timestamp: -1 }).lean(),
      this.stationModel.findOne(filter).lean(),
    ]);

    return {
      success: true,
      station: station || {
        deviceId: deviceId || 'ESP32S3_404CCA44C814',
        name: 'Trạm Quan Trắc Kho Tổng GSP',
        targetId: 'CENTRAL_WH',
        tempMin: 15.0,
        tempMax: 25.0,
        humMax: 70.0,
      },
      data: latestTelemetry || null,
    };
  }

  // =========================================================================
  // API TRUY VẤN: LẤY LỊCH SỬ CHUỖI THỜI GIAN (DOWNSAMPLING CHO BIỂU ĐỒ)
  // =========================================================================
  async getHistory(deviceId: string, range: string = '1h') {
    const nowSec = Math.floor(Date.now() / 1000);
    let fromSec = nowSec - 3600; // Mặc định 1 giờ

    if (range === '5m') {
      fromSec = nowSec - 300;
    } else if (range === '1h') {
      fromSec = nowSec - 3600;
    } else if (range === '24h') {
      fromSec = nowSec - 86400;
    } else if (range === '7d') {
      fromSec = nowSec - 7 * 86400;
    }

    const records = await this.telemetryModel
      .find({
        deviceId: deviceId || 'ESP32S3_404CCA44C814',
        timestamp: { $gte: fromSec },
      })
      .sort({ timestamp: 1 })
      .select('timestamp metrics diagnostics status seq -_id')
      .lean();

    // Nếu dữ liệu 24h hoặc 7d quá lớn -> Downsampling để biểu đồ nhẹ và mượt mà
    let result = records;
    if (records.length > 500) {
      const step = Math.ceil(records.length / 300);
      result = records.filter((_, idx) => idx % step === 0);
    }

    return {
      success: true,
      deviceId,
      range,
      count: result.length,
      totalRaw: records.length,
      records: result,
    };
  }

  // =========================================================================
  // API TRUY VẤN: DANH SÁCH CÁC TRẠM CẢM BIẾN
  // =========================================================================
  async getStations() {
    const stations = await this.stationModel.find().lean();
    return {
      success: true,
      data: stations,
    };
  }
}
