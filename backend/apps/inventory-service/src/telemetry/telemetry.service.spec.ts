import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TelemetryService } from './telemetry.service';
import { SensorTelemetry } from './schemas/sensor-telemetry.schema';
import { SensorStation } from './schemas/sensor-station.schema';

describe('TelemetryService', () => {
  let service: TelemetryService;

  const mockTelemetryModel: any = {
    syncIndexes: jest.fn().mockResolvedValue(true),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockStationModel: any = {
    syncIndexes: jest.fn().mockResolvedValue(true),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn().mockReturnValue({ catch: jest.fn() }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: getModelToken(SensorTelemetry.name),
          useValue: mockTelemetryModel,
        },
        {
          provide: getModelToken(SensorStation.name),
          useValue: mockStationModel,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHistory', () => {
    it('should query MongoDB with limit and preserve alert records during downsampling', async () => {
      // Giả lập 600 bản ghi, trong đó bản ghi thứ 15 có alert: true
      const fakeRecords = Array.from({ length: 600 }, (_, i) => ({
        timestamp: 1700000000 + i,
        seq: i,
        metrics: { temperature: 25, humidity: 60, vpd: 1.0 },
        diagnostics: { chipTemp: 40, cpuLoad: 10 },
        status: { alert: i === 15 },
      }));

      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(fakeRecords),
      };

      mockTelemetryModel.find.mockReturnValue(mockQueryChain);
      mockStationModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ deviceId: 'ESP32S3_TEST123456' }),
      });

      const res = await service.getHistory('ESP32S3_TEST123456', '24h');

      expect(res.success).toBe(true);
      expect(mockTelemetryModel.find).toHaveBeenCalled();
      expect(mockQueryChain.limit).toHaveBeenCalledWith(3000);

      // Downsampling phải luôn bảo tồn bản ghi có alert = true
      const alertFound = res.records.some((r) => r.status?.alert === true);
      expect(alertFound).toBe(true);
    });

    it('should cap time range to maximum 7 days if client passes oversized window', async () => {
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockTelemetryModel.find.mockReturnValue(mockQueryChain);

      const toSec = 1700000000;
      const fromSec = toSec - 30 * 86400; // 30 ngày

      const res = await service.getHistory('ESP32S3_TEST', undefined, fromSec, toSec);

      expect(res.success).toBe(true);
      // from phải bị cắt ngắn về tối đa 7 ngày trước to
      expect(res.to - res.from).toBeLessThanOrEqual(7 * 86400);
    });
  });

  describe('handleIngestEvent', () => {
    it('should ignore payload if deviceId is invalid or excessively long', async () => {
      await service.handleIngestEvent({
        deviceId: 'A'.repeat(50), // Quá 40 ký tự
        isBatch: false,
        record: { timestamp: 1700000000 },
        receivedAt: new Date().toISOString(),
      });

      expect(mockStationModel.findOne).not.toHaveBeenCalled();
      expect(mockTelemetryModel.create).not.toHaveBeenCalled();
    });
  });
});
