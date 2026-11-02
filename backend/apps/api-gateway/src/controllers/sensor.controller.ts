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
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { Socket } from 'net';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { SensorIngestDto } from '../dto/sensor-telemetry.dto';
import { PushNotificationService } from '../notification/push-notification.service';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('IoT Telemetry Sensor')
@Controller('api/sensor')
export class SensorController implements OnModuleInit {
  private readonly logger = new Logger(SensorController.name);

  // Bộ đệm đếm số mẫu vi phạm liên tiếp nhằm debounce cảnh báo
  private readonly consecutiveViolations = new Map<string, number>();

  // Cooldown tối thiểu 30s giữa các lần bắn push notification
  private readonly lastPushTimeMap = new Map<string, number>();
  private upgradeHookAttached = false;

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly wsGateway: AppWebsocketGateway,
    private readonly pushService: PushNotificationService,
    private readonly notificationService: NotificationService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sensor.get_latest',
      'inventory.sensor.get_history',
      'inventory.sensor.get_stations',
    ]);

    // Trì hoãn 1s để HTTP server và Socket.IO khởi tạo hoàn tất trước khi bọc listener
    setTimeout(() => this.attachRawWebSocketTunnel(), 1000);
  }

  // =========================================================================
  // ĐƯỜNG ỐNG WEBSOCKET TUNNEL (1 REQUEST DUY NHẤT SUỐT CẢ NGÀY CHO ESP32-S3)
  // =========================================================================
  private attachRawWebSocketTunnel() {
    if (this.upgradeHookAttached) return;
    const httpServer = this.httpAdapterHost?.httpAdapter?.getHttpServer();
    if (!httpServer) return;

    this.upgradeHookAttached = true;
    const existingListeners = httpServer.listeners('upgrade');
    httpServer.removeAllListeners('upgrade');

    httpServer.on('upgrade', (req: any, socket: Socket, head: Buffer) => {
      const url = String(req.url || '');
      if (url.startsWith('/api/sensor')) {
        this.handleEsp32WebSocketUpgrade(req, socket, head);
      } else {
        for (const listener of existingListeners) {
          listener.call(httpServer, req, socket, head);
        }
      }
    });

    this.logger.log('[WS-Tunnel] Da kich hoat cong WebSocket 1-Request tai /api/sensor cho ESP32-S3');
  }

  private sendWsTextFrame(socket: Socket, text: string) {
    if (socket.destroyed || !socket.writable) return;
    const payload = Buffer.from(text, 'utf8');
    const len = payload.length;
    let header: Buffer;

    if (len < 126) {
      header = Buffer.from([0x81, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      return;
    }
    socket.write(Buffer.concat([header, payload]));
  }

  private handleEsp32WebSocketUpgrade(req: any, socket: Socket, head: Buffer) {
    const rawDeviceId = req.headers['x-device-id'] as string;
    const deviceId = rawDeviceId ? String(rawDeviceId).trim() : '';
    const DEVICE_ID_REGEX = /^[A-Za-z0-9_-]{4,32}$/;

    if (!deviceId || !DEVICE_ID_REGEX.test(deviceId)) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const wsKey = req.headers['sec-websocket-key'];
    if (!wsKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(wsKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.setNoDelay(true);
    socket.setKeepAlive(true, 15000);

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`,
    );

    this.logger.log(`[WS-Tunnel] Tram ${deviceId} da mo luong 1-Request WebSocket thanh cong`);

    let rxBuffer = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);

    socket.on('data', async (chunk: Buffer) => {
      rxBuffer = Buffer.concat([rxBuffer, chunk]);

      // Gioi han bo dem toi da 1MB de chong flood/DoS
      if (rxBuffer.length > 1024 * 1024) {
        socket.destroy();
        return;
      }

      while (rxBuffer.length >= 2) {
        const opcode = rxBuffer[0] & 0x0f;
        const isMasked = (rxBuffer[1] & 0x80) !== 0;
        let payloadLen = rxBuffer[1] & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (rxBuffer.length < 4) return;
          payloadLen = rxBuffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (rxBuffer.length < 10) return;
          payloadLen = Number(rxBuffer.readBigUInt64BE(2));
          offset = 10;
        }

        const maskOffset = offset;
        if (isMasked) offset += 4;

        if (rxBuffer.length < offset + payloadLen) {
          return;
        }

        const payloadBuf = Buffer.from(rxBuffer.subarray(offset, offset + payloadLen));
        if (isMasked) {
          const mask = rxBuffer.subarray(maskOffset, maskOffset + 4);
          for (let i = 0; i < payloadLen; i++) {
            payloadBuf[i] ^= mask[i & 3];
          }
        }

        rxBuffer = rxBuffer.subarray(offset + payloadLen);

        if (opcode === 0x08) {
          socket.end();
          return;
        } else if (opcode === 0x09) {
          if (!socket.destroyed && socket.writable) {
            socket.write(Buffer.from([0x8a, 0x00]));
          }
          continue;
        } else if (opcode === 0x01 || opcode === 0x02) {
          const jsonStr = payloadBuf.toString('utf8').trim();
          if (!jsonStr) continue;

          try {
            const item = JSON.parse(jsonStr);
            if (item.batch === true && Array.isArray(item.records)) {
              const ack = await this.processBatchRecords(deviceId, item.records);
              this.sendWsTextFrame(socket, JSON.stringify(ack) + '\n');
            } else {
              const ack = await this.processSingleRecord(deviceId, item);
              this.sendWsTextFrame(socket, JSON.stringify(ack) + '\n');
            }
          } catch (err: any) {
            this.sendWsTextFrame(
              socket,
              JSON.stringify({ status: 'client_error', message: err?.message }) + '\n',
            );
          }
        }
      }
    });

    socket.on('close', () => {
      this.logger.log(`[WS-Tunnel] Tram ${deviceId} da dong ket noi WebSocket`);
    });

    socket.on('error', (err: any) => {
      this.logger.warn(`[WS-Tunnel] Loi socket tu tram ${deviceId}: ${err?.message}`);
    });
  }

  // =========================================================================
  // LOGIC ĐÁNH GIÁ CẢNH BÁO NHIỆT ĐỘ (HỎA HOẠN / QUÁ NHIỆT GSP)
  // =========================================================================
  private async evaluateTemperatureAlerts(deviceId: string, temp: number): Promise<void> {
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
          `[IOT FIRE EMERGENCY] Nhiet do kho ${temp}C vuot nguong hoa hoan (>= 60C) -> Ban chuong bao dong khan cap`,
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
          .catch((e) => this.logger.error(`Loi gui push fire emergency: ${e?.message}`));

        this.notificationService
          .create({
            type: 'IOT_TEMPERATURE_ALERT',
            targetRooms: ['warehouse', 'admin'],
            message: `NGUY CẤP: Phát hiện hỏa hoạn tại Kho Tổng! Nhiệt độ ${temp}°C vượt ngưỡng 60°C.`,
          })
          .catch((e) => this.logger.warn(`Loi luu notification DB: ${e?.message}`));

        this.pushService
          .recordIotAlert({
            deviceId,
            stationName: 'Trạm Quan Trắc Kho Tổng GSP',
            targetId: 'CENTRAL_WH',
            currentValue: temp,
            thresholdValue: 60,
            severity: 'EMERGENCY',
          })
          .catch((e) => this.logger.warn(`Loi luu iot_alert DB: ${e?.message}`));
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
          `[IOT PUSH TRIGGERED] Nhiet do kho ${temp}C vuot nguong ${threshold}C lien tuc ${count}s -> Ban push alert`,
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
          .catch((e) => this.logger.error(`Loi gui push alert: ${e?.message}`));

        this.notificationService
          .create({
            type: 'IOT_TEMPERATURE_ALERT',
            targetRooms: ['warehouse', 'admin'],
            message: `Nhiệt độ Kho Tổng ${temp}°C đã vượt ngưỡng an toàn ${threshold}°C!`,
          })
          .catch((e) => this.logger.warn(`Loi luu notification DB: ${e?.message}`));

        this.pushService
          .recordIotAlert({
            deviceId,
            stationName: 'Trạm Quan Trắc Kho Tổng GSP',
            targetId: 'CENTRAL_WH',
            currentValue: temp,
            thresholdValue: threshold,
            severity: temp > threshold + 3.0 ? 'CRITICAL' : 'WARNING',
          })
          .catch((e) => this.logger.warn(`Loi luu iot_alert DB: ${e?.message}`));
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

    // 1. Chế độ persistent stream (Transfer-Encoding: chunked)
    if (isStreamMode) {
      req.setTimeout(0);
      res.setTimeout(0);
      req.socket?.setKeepAlive(true);

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      this.logger.log(`[Stream-Ingest] Device ${deviceId} connected to persistent HTTP NDJSON stream`);

      const rl = readline.createInterface({
        input: req,
        crlfDelay: Infinity,
      });

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
          let ack: any;
          if (item.batch === true && Array.isArray(item.records)) {
            ack = await this.processBatchRecords(deviceId, item.records);
          } else {
            ack = await this.processSingleRecord(deviceId, item);
          }
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

    // 2. Chế độ HTTP POST thường hoặc batch ingestion
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
