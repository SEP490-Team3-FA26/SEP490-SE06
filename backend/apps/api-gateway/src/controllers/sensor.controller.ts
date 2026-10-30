import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  Inject,
  OnModuleInit,
  HttpStatus,
  Logger,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as readline from 'readline';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { SensorIngestDto } from '../dto/sensor-telemetry.dto';
import { PushNotificationService } from '../notification/push-notification.service';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('🌡️ IoT Telemetry Sensor')
@Controller('api/sensor')
export class SensorController implements OnModuleInit {
  private readonly logger = new Logger(SensorController.name);

  // Bộ đệm đếm số mẫu vi phạm liên tiếp (Debounce)
  private readonly consecutiveViolations = new Map<string, number>();

  // Bộ đệm mốc thời gian bắn push gần nhất (Cooldown - tối thiểu 30s)
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
  // LOGIC ĐÁNH GIÁ CẢNH BÁO NHIỆT ĐỘ (HỎA HOẠN / QUÁ NHIỆT GSP)
  // =========================================================================
  private async evaluateTemperatureAlerts(deviceId: string, temp: number): Promise<void> {
    // Chống rò rỉ bộ nhớ: khống chế tối đa 100 trạm trong bộ đệm RAM
    if (this.lastPushTimeMap.size > 100) this.lastPushTimeMap.clear();
    if (this.consecutiveViolations.size > 100) this.consecutiveViolations.clear();

    const threshold = await this.pushService.getStationTempThreshold(deviceId);
    const isFireEmergency = temp >= 60.0;
    const isOverTemp = temp > threshold;

    if (isFireEmergency) {
      const nowMs = Date.now();
      const lastPush = this.lastPushTimeMap.get(deviceId) || 0;
      const isCooldownElapsed = nowMs - lastPush >= 30 * 1000;

      if (isCooldownElapsed) {
        this.lastPushTimeMap.set(deviceId, nowMs);
        this.logger.error(
          `[IOT FIRE EMERGENCY] Nhiệt độ kho ${temp}°C vượt ngưỡng hỏa hoạn (>= 60°C) -> Bắn chuông báo động hỏa hoạn khẩn cấp tới thủ kho`,
        );

        this.pushService
          .sendToRole('warehouse', {
            title: 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
            body: `NGUY CẤP: Nhiệt độ kho ${temp}°C đã vượt ngưỡng hỏa hoạn (>= 60°C)! Sơ tán và kiểm tra ngay lập tức!`,
            channelId: 'fire_emergency_ring_v8',
            sound: 'content://settings/system/ringtone',
            severity: 'EMERGENCY',
            data: {
              type: 'FIRE_EMERGENCY',
              deviceId,
              temp: String(temp),
              threshold: '60',
            },
          })
          .catch((e) => this.logger.error(`Lỗi gửi push fire emergency: ${e?.message}`));

        this.notificationService
          .create({
            type: 'IOT_TEMPERATURE_ALERT',
            targetRooms: ['warehouse', 'admin'],
            message: `NGUY CẤP: Phát hiện hỏa hoạn tại Kho Tổng! Nhiệt độ ${temp}°C vượt ngưỡng 60°C.`,
          })
          .catch((e) => this.logger.warn(`Lỗi lưu notification DB: ${e?.message}`));

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

      const isDebounced = count >= 3;
      const nowMs = Date.now();
      const lastPush = this.lastPushTimeMap.get(deviceId) || 0;
      const isCooldownElapsed = nowMs - lastPush >= 30 * 1000;

      if (isDebounced && isCooldownElapsed) {
        this.lastPushTimeMap.set(deviceId, nowMs);
        this.logger.warn(
          `[IOT PUSH TRIGGERED] Nhiệt độ kho ${temp}°C vượt ngưỡng ${threshold}°C liên tục ${count}s -> Bắn push notification tới thủ kho`,
        );

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

        this.notificationService
          .create({
            type: 'IOT_TEMPERATURE_ALERT',
            targetRooms: ['warehouse', 'admin'],
            message: `Nhiệt độ Kho Tổng ${temp}°C đã vượt ngưỡng an toàn ${threshold}°C!`,
          })
          .catch((e) => this.logger.warn(`Lỗi lưu notification DB: ${e?.message}`));

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

  // =========================================================================
  // XỬ LÝ MỘT BẢN GHI TELEMETRY ĐƠN LẺ
  // =========================================================================
  private async processSingleRecord(deviceId: string, raw: any) {
    const nowSec = Math.floor(Date.now() / 1000);
    const normalizedRecord = {
      timestamp: raw.timestamp && raw.timestamp > 1700000000 ? raw.timestamp : nowSec,
      seq: raw.seq || 0,
      metrics: raw.metrics || {},
      diagnostics: raw.diagnostics || {},
      status: raw.status || { alert: false, sensor_valid: true },
    };

    const kafkaPayload = {
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

      if (normalizedRecord.status?.alert) {
        this.wsGateway.server.to('warehouse').emit('sensor:alert', {
          deviceId,
          title: 'CẢNH BÁO NHIỆT ĐỘ / ĐỘ ẨM KHO TỔNG',
          metrics: normalizedRecord.metrics,
          timestamp: normalizedRecord.timestamp,
        });
      }
    }

    const temp = Number(normalizedRecord.metrics?.temperature ?? 0);
    await this.evaluateTemperatureAlerts(deviceId, temp);

    // Bắn sự kiện vào Kafka để Inventory Service lưu MongoDB
    this.inventoryClient.emit('sensor.telemetry.ingest', JSON.stringify(kafkaPayload));

    return {
      status: 'ok',
      seq: normalizedRecord.seq,
      server_time: nowSec,
    };
  }

  // =========================================================================
  // XỬ LÝ MỘT TẬP BẢN GHI TELEMETRY BATCH (FLASH RECOVERY)
  // =========================================================================
  private async processBatchRecords(deviceId: string, rawRecords: any[]) {
    const nowSec = Math.floor(Date.now() / 1000);
    const normalizedRecords = rawRecords.map((r) => ({
      timestamp: r.timestamp && r.timestamp > 1700000000 ? r.timestamp : nowSec,
      seq: r.seq || 0,
      metrics: r.metrics || {},
      diagnostics: r.diagnostics || {},
      status: r.status || { alert: false, sensor_valid: true },
    }));

    const kafkaPayload = {
      deviceId,
      isBatch: true,
      records: normalizedRecords,
      receivedAt: new Date().toISOString(),
    };

    this.logger.log(`[Batch-Ingest] Received ${normalizedRecords.length} records from ${deviceId}`);

    // Bắn record mới nhất ra WebSocket
    if (normalizedRecords.length > 0 && this.wsGateway?.server) {
      const latest = normalizedRecords[normalizedRecords.length - 1];
      this.wsGateway.server.emit('sensor:telemetry', {
        deviceId,
        ...latest,
      });
      const temp = Number(latest.metrics?.temperature ?? 0);
      await this.evaluateTemperatureAlerts(deviceId, temp);
    }

    this.inventoryClient.emit('sensor.telemetry.ingest', JSON.stringify(kafkaPayload));

    return {
      status: 'ok',
      batch: true,
      received_count: normalizedRecords.length,
      server_time: nowSec,
    };
  }

  // =========================================================================
  // TIẾP NHẬN TELEMETRY TỪ ESP32-S3 (HỖ TRỢ PERSISTENT STREAM, REALTIME & BATCH)
  // =========================================================================
  @Post()
  @ApiOperation({ summary: 'Tiếp nhận telemetry từ trạm cảm biến ESP32-S3' })
  async ingestTelemetry(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-device-id') headerDeviceId?: string,
    @Headers('x-batch-mode') headerBatchMode?: string,
    @Headers('x-stream-mode') headerStreamMode?: string,
    @Body() dto?: SensorIngestDto,
  ) {
    const rawDeviceId = headerDeviceId || dto?.device_id || (req.headers['x-device-id'] as string);
    const deviceId = rawDeviceId ? String(rawDeviceId).trim() : '';

    // Kiểm tra định dạng Device ID an toàn: chữ, số, dấu gạch nối/dưới, độ dài từ 4-32 ký tự
    const DEVICE_ID_REGEX = /^[A-Za-z0-9_-]{4,32}$/;
    if (!deviceId || !DEVICE_ID_REGEX.test(deviceId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Missing or invalid device identifier (X-Device-ID or device_id)',
      });
    }

    const isStreamMode =
      headerStreamMode === 'true' ||
      req.headers['x-stream-mode'] === 'true' ||
      String(req.headers['content-type'] || '').includes('x-ndjson');

    // 1. CHẾ ĐỘ 1-REQUEST PERSISTENT STREAM (NDJSON CHUNKED TRANSFER)
    if (isStreamMode) {
      req.setTimeout(0);
      res.setTimeout(0);
      req.socket?.setKeepAlive(true);

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Cache-Control', 'no-cache');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      this.logger.log(`[Stream-Ingest] Device ${deviceId} connected to persistent HTTP NDJSON stream`);

      const rl = readline.createInterface({
        input: req,
        crlfDelay: Infinity,
      });

      // Helper ghi stream an toàn, triệt tiêu lỗi write-after-end
      const safeWriteStream = (data: string): boolean => {
        if (!res.writableEnded && !res.destroyed && res.writable) {
          try {
            res.write(data);
            return true;
          } catch (e: any) {
            this.logger.warn(`[Stream-Ingest] Write error to ${deviceId}: ${e?.message}`);
            return false;
          }
        }
        return false;
      };

      rl.on('line', async (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (res.writableEnded || res.destroyed) {
          rl.close();
          return;
        }
        try {
          const item = JSON.parse(trimmed);
          const ack = await this.processSingleRecord(deviceId, item);
          safeWriteStream(JSON.stringify(ack) + '\n');
        } catch (err: any) {
          this.logger.error(`[Stream-Ingest] Parse error from ${deviceId}: ${err.message}`);
          safeWriteStream(JSON.stringify({ status: 'error', message: err.message }) + '\n');
        }
      });

      const cleanupStream = () => {
        rl.close();
      };

      req.on('close', () => {
        this.logger.log(`[Stream-Ingest] Device ${deviceId} request closed`);
        cleanupStream();
      });

      res.on('close', () => {
        this.logger.log(`[Stream-Ingest] Device ${deviceId} response closed`);
        cleanupStream();
      });

      req.on('error', (err: any) => {
        this.logger.error(`[Stream-Ingest] Request error from ${deviceId}: ${err?.message}`);
        cleanupStream();
      });

      res.on('error', (err: any) => {
        this.logger.error(`[Stream-Ingest] Response error from ${deviceId}: ${err?.message}`);
        cleanupStream();
      });

      return;
    }

    // 2. CHẾ ĐỘ HTTP POST THƯỜNG (HOẶC BATCH INGESTION)
    const isBatch = dto?.batch === true || headerBatchMode === 'true' || req.headers['x-batch-mode'] === 'true';

    if (isBatch) {
      const result = await this.processBatchRecords(deviceId, dto?.records || []);
      return res.status(HttpStatus.OK).json(result);
    } else {
      const result = await this.processSingleRecord(deviceId, dto || {});
      return res.status(HttpStatus.OK).json({
        ...result,
        batch: false,
        received_count: 1,
      });
    }
  }

  // =========================================================================
  // API TRUY VẤN DÀNH CHO DASHBOARD FRONTEND (YÊU CẦU ĐĂNG NHẬP RBAC)
  // =========================================================================
  @Get('latest')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy chỉ số quan trắc mới nhất của trạm cảm biến' })
  async getLatest(@Query('deviceId') deviceId?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_latest', {
      deviceId,
    });
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy dữ liệu chuỗi thời gian lịch sử (5m, 1h, 24h, 7d hoặc theo khoảng thời gian quá khứ)' })
  async getHistory(
    @Query('deviceId') deviceId?: string,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_history', {
      deviceId,
      range: range || '1h',
      from,
      to,
    });
  }

  @Get('stations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách các trạm quan trắc IoT trong hệ thống' })
  async getStations() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sensor.get_stations', {});
  }
}
