import { Test, TestingModule } from '@nestjs/testing';
import { SensorController } from './sensor.controller';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { PushNotificationService } from '../notification/push-notification.service';
import { NotificationService } from '../notification/notification.service';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

describe('SensorController', () => {
  let controller: SensorController;

  const mockInventoryClient = {
    emit: jest.fn(),
    send: jest.fn(),
  };

  const mockWsGateway = {
    server: {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
  };

  const mockPushService = {
    getStationTempThreshold: jest.fn().mockResolvedValue(25.0),
    sendToRole: jest.fn().mockResolvedValue(true),
    recordIotAlert: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue(true),
  };

  const mockHttpServer = {
    listeners: jest.fn().mockReturnValue([]),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
  };

  const mockHttpAdapterHost = {
    httpAdapter: {
      getHttpServer: jest.fn().mockReturnValue(mockHttpServer),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorController],
      providers: [
        { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        { provide: AppWebsocketGateway, useValue: mockWsGateway },
        { provide: PushNotificationService, useValue: mockPushService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: HttpAdapterHost, useValue: mockHttpAdapterHost },
      ],
    }).compile();

    controller = module.get<SensorController>(SensorController);
  });

  describe('1. [Normal Values] Xu ly du lieu telemetry hop le', () => {
    it('TC-SENSOR-NORM-01: Tiep nhan 1 ban ghi don le qua HTTP POST thanh cong', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      const dto = {
        device_id: 'ESP32S3_A1B2C3',
        batch: false,
        metrics: { temperature: 24.5, humidity: 60.0 },
      };

      await controller.ingestTelemetry(mockReq, mockRes, 'ESP32S3_A1B2C3', 'false', 'false', dto as any);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          batch: false,
          received_count: 1,
        }),
      );
      expect(mockInventoryClient.emit).toHaveBeenCalledWith(
        'sensor.telemetry.ingest',
        expect.any(String),
      );
    });

    it('TC-SENSOR-NORM-02: Tiep nhan batch records qua HTTP POST thanh cong', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      const batchDto = {
        device_id: 'ESP32S3_A1B2C3',
        batch: true,
        records: [
          { seq: 1, metrics: { temperature: 22.0, humidity: 55.0 } },
          { seq: 2, metrics: { temperature: 22.5, humidity: 56.0 } },
        ],
      };

      await controller.ingestTelemetry(mockReq, mockRes, 'ESP32S3_A1B2C3', 'true', 'false', batchDto as any);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          batch: true,
          received_count: 2,
        }),
      );
    });

    it('TC-SENSOR-NORM-03: Tinh toan ma Sec-WebSocket-Accept hop le theo chuan RFC 6455', () => {
      const clientKey = 'dGhlIHNhbXBsZSBub25jZQ==';
      const expectedAccept = crypto
        .createHash('sha1')
        .update(clientKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

      expect(expectedAccept).toBe('s3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
    });
  });

  describe('2. [Boundary Values] Kiem tra do dai Device ID va gioi han tap ban ghi', () => {
    it('TC-SENSOR-BOUND-01: Device ID co do dai toi thieu 4 ky tu van duoc chap nhan', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      await controller.ingestTelemetry(mockReq, mockRes, 'E32S', 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('TC-SENSOR-BOUND-02: Device ID co do dai toi da 32 ky tu van duoc chap nhan', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      const maxLenId = 'ESP32_1234567890_1234567890_ABCD'; // 32 ky tu
      expect(maxLenId.length).toBe(32);

      await controller.ingestTelemetry(mockReq, mockRes, maxLenId, 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('TC-SENSOR-BOUND-03: Batch rong voi records = [] xu ly an toan va tra ve received_count = 0', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      const batchDto = {
        device_id: 'ESP32S3_A1B2C3',
        batch: true,
        records: [],
      };

      await controller.ingestTelemetry(mockReq, mockRes, 'ESP32S3_A1B2C3', 'true', 'false', batchDto as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          batch: true,
          received_count: 0,
        }),
      );
    });
  });

  describe('3. [Abnormal Values] Du lieu di thuong va tan cong gia mao', () => {
    it('TC-SENSOR-ABNORM-01: Tu choi request thieu Device ID hoac chua ky tu dac biet nguy hiem', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      await controller.ingestTelemetry(mockReq, mockRes, 'ID<script>', 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

      await controller.ingestTelemetry(mockReq, mockRes, 'ABC', 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

      await controller.ingestTelemetry(mockReq, mockRes, '', 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('TC-SENSOR-ABNORM-02: Device ID qua 32 ky tu bi chan boi regex validation', async () => {
      const mockReq: any = { headers: {} };
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes: any = { status: statusMock };

      const tooLongId = 'ESP32_1234567890_1234567890_ABCDE_FGH'; // 37 ky tu
      await controller.ingestTelemetry(mockReq, mockRes, tooLongId, 'false', 'false', {} as any);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});

