import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  Inject,
  OnModuleInit,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { SensorIngestDto } from '../dto/sensor-telemetry.dto';
import { PushNotificationService } from '../notification/push-notification.service';
import { NotificationService } from '../notification/notification.service';

@ApiTags('🌡️ IoT Telemetry Sensor')
@Controller('api/sensor')
export class SensorController implements OnModuleInit {
  private readonly logger = new Logger(SensorController.name);

  // Bộ đệm đếm số mẫu vi phạm liên tiếp (Debounce)
  private readonly consecutiveViolations = new Map<string, number>();

  // Bộ đệm mốc thời gian bắn push gần nhất (Cooldown - tối thiểu 5 phút)
  private readonly lastPushTimeMap = new Map<string, number>();

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly wsGateway: AppWebsocketGateway,
    private readonly pushService: PushNotificationService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sensor.get_latest',
      'inventory.sensor.get_history',
      'inventory.sensor.get_stations',
    ]);
  }

  // =========================================================================
  // TIẾP NHẬN TELEMETRY TỪ ESP32-S3 (HỖ TRỢ CẢ REALTIME 1S VÀ BATCH INGESTION)
  // =========================================================================
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tiếp nhận telemetry từ trạm cảm biến ESP32-S3' })
  async ingestTelemetry(
    @Headers('x-device-id') headerDeviceId: string,
    @Headers('x-batch-mode') headerBatchMode: string,
    @Body() dto: SensorIngestDto,
  ) {
    const deviceId = headerDeviceId || dto.device_id;
    if (!deviceId) {
      throw new BadRequestException('Missing device identifier (X-Device-ID or device_id)');
    }

    const isBatch = dto.batch === true || headerBatchMode === 'true';
    const nowSec = Math.floor(Date.now() / 1000);

    let receivedCount = 0;
    let kafkaPayload: any;

    if (isBatch) {
      const rawRecords = dto.records || [];
      // Chuẩn hóa timestamp nếu ESP32 vừa boot chưa đồng bộ NTP
      const normalizedRecords = rawRecords.map((r) => ({
        timestamp: r.timestamp && r.timestamp > 1700000000 ? r.timestamp : nowSec,
        seq: r.seq || 0,
        metrics: r.metrics || {},
        diagnostics: r.diagnostics || {},
        status: r.status || { alert: false, sensor_valid: true },
      }));

      receivedCount = normalizedRecords.length;
      kafkaPayload = {
        deviceId,
        isBatch: true,
        records: normalizedRecords,
        receivedAt: new Date().toISOString(),
      };

      this.logger.log(`[Batch-Ingest] Received ${receivedCount} records from ${deviceId}`);
    } else {
      // Gói tin Realtime đơn lẻ
      const normalizedRecord = {
        timestamp: dto.timestamp && dto.timestamp > 1700000000 ? dto.timestamp : nowSec,
        seq: dto.seq || 0,
        metrics: dto.metrics || {},
        diagnostics: dto.diagnostics || {},
        status: dto.status || { alert: false, sensor_valid: true },
      };

      receivedCount = 1;
      kafkaPayload = {
        deviceId,
        isBatch: false,
        record: normalizedRecord,
        receivedAt: new Date().toISOString(),
      };

      // Đẩy Realtime ra WebSocket / SSE Dashboard
      if (this.wsGateway?.server) {
        this.wsGateway.server.emit('sensor:telemetry', {
          deviceId,
          ...normalizedRecord,
        });

        // Nếu vượt ngưỡng cảnh báo -> Bắn tin động tới phòng ban Kho Tổng
        if (normalizedRecord.status?.alert) {
          this.wsGateway.server.to('warehouse').emit('sensor:alert', {
            deviceId,
            title: 'CẢNH BÁO NHIỆT ĐỘ / ĐỘ ẨM KHO TỔNG',
            metrics: normalizedRecord.metrics,
            timestamp: normalizedRecord.timestamp,
          });
        }
      }

      // Đánh giá cảnh báo: Hỏa hoạn (>= 60°C) hoặc Quá nhiệt GSP (> threshold)
      const temp = Number(normalizedRecord.metrics?.temperature ?? 0);
      const threshold = await this.pushService.getStationTempThreshold(deviceId);
      const isFireEmergency = temp >= 60.0;
      const isOverTemp = temp > threshold;

      if (isFireEmergency) {
        // Hỏa hoạn khẩn cấp: Kích hoạt ngay lập tức 0s debounce
        const nowMs = Date.now();
        const lastPush = this.lastPushTimeMap.get(deviceId) || 0;
        const isCooldownElapsed = nowMs - lastPush >= 30 * 1000; // Cooldown 30s giữa các lần bắn push

        if (isCooldownElapsed) {
          this.lastPushTimeMap.set(deviceId, nowMs);
          this.logger.error(
            `[IOT FIRE EMERGENCY] Nhiệt độ kho ${temp}°C vượt ngưỡng hỏa hoạn (>= 60°C) -> Bắn chuông báo động hỏa hoạn khẩn cấp tới thủ kho`,
          );

          // 1. Bắn Push Notification kênh hỏa hoạn đến toàn bộ điện thoại role warehouse
          this.pushService
            .sendToRole('warehouse', {
              title: 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
              body: `NGUY CẤP: Nhiệt độ kho ${temp}°C đã vượt ngưỡng hỏa hoạn (>= 60°C)! Sơ tán và kiểm tra ngay lập tức!`,
              channelId: 'fire_emergency_ringtone_v7',
              sound: 'phone_ring',
              severity: 'EMERGENCY',
              data: {
                type: 'FIRE_EMERGENCY',
                deviceId,
                temp: String(temp),
                threshold: '60',
              },
            })
            .catch((e) => this.logger.error(`Lỗi gửi push fire emergency: ${e?.message}`));

          // 2. Lưu vào danh sách thông báo hệ thống
          this.notificationService
            .create({
              type: 'IOT_TEMPERATURE_ALERT',
              targetRooms: ['warehouse', 'admin'],
              message: `NGUY CẤP: Phát hiện hỏa hoạn tại Kho Tổng! Nhiệt độ ${temp}°C vượt ngưỡng 60°C.`,
            })
            .catch((e) => this.logger.warn(`Lỗi lưu notification DB: ${e?.message}`));

          // 3. Ghi nhận nhật ký sự cố vào iot_alerts với mức độ EMERGENCY
          this.pushService
            .recordIotAlert({
              deviceId,
              stationName: 'Trạm Quan Trắc Kho Tổng GSP',
              targetId: 'CENTRAL_WH',
              currentValue: temp,
              thresholdValue: 60,
              severity: 'EMERGENCY',
            })
            .catch((e) => this.logger.warn(`Lỗi lưu iot_alert DB: ${e?.message}`));
        }
      } else if (isOverTemp) {
        const count = (this.consecutiveViolations.get(deviceId) || 0) + 1;
        this.consecutiveViolations.set(deviceId, count);

        // Debounce: Vượt ngưỡng liên tiếp >= 3 mẫu (khoảng 3s) để test phản hồi nhanh
        const isDebounced = count >= 3;
        const nowMs = Date.now();
        const lastPush = this.lastPushTimeMap.get(deviceId) || 0;
        const isCooldownElapsed = nowMs - lastPush >= 30 * 1000; // 30s cooldown

        if (isDebounced && isCooldownElapsed) {
          this.lastPushTimeMap.set(deviceId, nowMs);
          this.logger.warn(
            `[IOT PUSH TRIGGERED] Nhiệt độ kho ${temp}°C vượt ngưỡng ${threshold}°C liên tục ${count}s -> Bắn push notification tới thủ kho`,
          );

          // 1. Bắn Push Notification đến toàn bộ điện thoại có role warehouse
          this.pushService
            .sendToRole('warehouse', {
              title: 'CẢNH BÁO QUÁ NHIỆT KHO TỔNG',
              body: `Nhiệt độ hiện tại ${temp}°C đã vượt ngưỡng ${threshold}°C! Vui lòng kiểm tra kho ngay lập tức.`,
              channelId: 'iot_temperature_critical',
              sound: 'default',
              severity: 'WARNING',
              data: {
                type: 'IOT_TEMPERATURE_ALERT',
                deviceId,
                temp: String(temp),
                threshold: String(threshold),
              },
            })
            .catch((e) => this.logger.error(`Lỗi gửi push alert: ${e?.message}`));

          // 2. Lưu vào danh sách thông báo hệ thống
          this.notificationService
            .create({
              type: 'IOT_TEMPERATURE_ALERT',
              targetRooms: ['warehouse', 'admin'],
              message: `Nhiệt độ Kho Tổng ${temp}°C đã vượt ngưỡng an toàn ${threshold}°C!`,
            })
            .catch((e) => this.logger.warn(`Lỗi lưu notification DB: ${e?.message}`));

          // 3. Ghi nhận nhật ký sự cố vào iot_alerts
          this.pushService
            .recordIotAlert({
              deviceId,
              stationName: 'Trạm Quan Trắc Kho Tổng GSP',
              targetId: 'CENTRAL_WH',
              currentValue: temp,
              thresholdValue: threshold,
              severity: temp > threshold + 3.0 ? 'CRITICAL' : 'WARNING',
            })
            .catch((e) => this.logger.warn(`Lỗi lưu iot_alert DB: ${e?.message}`));
        }
      } else {
        this.consecutiveViolations.set(deviceId, 0);
      }
    }

    // Bắn sự kiện ngầm vào Kafka xử lý ghi MongoDB & kiểm tra chuẩn GSP
    this.inventoryClient.emit('sensor.telemetry.ingest', JSON.stringify(kafkaPayload));

    // Fast ACK: Trả lời ngay 200 OK kèm server_time để ESP32 cập nhật RTC và xóa Flash LittleFS
    return {
      status: 'ok',
      batch: isBatch,
      received_count: receivedCount,
      server_time: nowSec,
    };
  }

  // =========================================================================
  // API TRUY VẤN DÀNH CHO DASHBOARD FRONTEND
  // =========================================================================
  @Get('latest')
  @ApiOperation({ summary: 'Lấy chỉ số quan trắc mới nhất của trạm cảm biến' })
  async getLatest(@Query('deviceId') deviceId?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_latest', {
      deviceId: deviceId || 'ESP32S3_404CCA44C814',
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Lấy dữ liệu chuỗi thời gian lịch sử (5m, 1h, 24h)' })
  async getHistory(
    @Query('deviceId') deviceId?: string,
    @Query('range') range?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_history', {
      deviceId: deviceId || 'ESP32S3_404CCA44C814',
      range: range || '1h',
    });
  }

  @Get('stations')
  @ApiOperation({ summary: 'Danh sách các trạm quan trắc IoT trong hệ thống' })
  async getStations() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_stations', {});
  }
}
