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

@ApiTags('🌡️ IoT Telemetry Sensor')
@Controller('api/sensor')
export class SensorController implements OnModuleInit {
  private readonly logger = new Logger(SensorController.name);

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly wsGateway: AppWebsocketGateway,
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
