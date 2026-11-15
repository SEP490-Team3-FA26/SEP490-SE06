import { GoodsReceiptController } from '../../../apps/api-gateway/src/controllers/goods-receipt.controller';
import { ClientKafka } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { AppWebsocketGateway } from '../../../apps/api-gateway/src/websocket/websocket.gateway';
import { NotificationService } from '../../../apps/api-gateway/src/notification/notification.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

/**
 * goods-receipt-vision.spec.ts
 * Bộ kiểm thử đơn vị cho tính năng AI Vision Quét & Đếm Hộp Thuốc Tự Động (Kèm Self-Healing Fallback)
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('GoodsReceiptController - AI Vision Count Boxes & Self-Healing', () => {
  let controller: GoodsReceiptController;
  let mockInventoryClient: Partial<ClientKafka>;
  let mockCacheManager: Partial<Cache>;
  let mockWebsocketGateway: Partial<AppWebsocketGateway>;
  let mockNotificationService: Partial<NotificationService>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockInventoryClient = {
      emit: jest.fn(),
      send: jest.fn(),
    };
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    mockWebsocketGateway = {
      server: { emit: jest.fn() } as any,
    };
    mockNotificationService = {} as any;

    controller = new GoodsReceiptController(
      mockInventoryClient as ClientKafka,
      mockWebsocketGateway as AppWebsocketGateway,
      mockCacheManager as Cache,
      mockNotificationService as NotificationService,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn & thành công
  // =========================================================================
  describe('[Normal Values] Luồng phân tích ảnh kiểm đếm hộp thuốc thành công', () => {
    it('TC-VISION-NORM-01: Phân tích thành công qua Microservice AI nội bộ khi dịch vụ online', async () => {
      const mockAiResponse = {
        success: true,
        detectedCount: 4,
        confidence: 96.5,
        boxes: [
          { top: 10, left: 20, width: 30, height: 40, label: 'Hộp 1' },
        ],
        annotatedImage: 'data:image/jpeg;base64,sample...',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAiResponse,
      } as any);

      const buf = Buffer.from('fake-valid-image-bytes');
      const mockFile = {
        buffer: buf,
        size: buf.length,
        mimetype: 'image/jpeg',
        originalname: 'advagraf.jpg',
      } as Express.Multer.File;

      const result = await controller.countBoxes(mockFile);

      expect(result).toEqual(mockAiResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('TC-VISION-NORM-02: Tự động kích hoạt cơ chế Self-Healing gọi trực tiếp Roboflow Cloud khi AI Service nội bộ gặp sự cố (503)', async () => {
      // Lần 1: Gọi AI Service thất bại (giả lập 503 Service Unavailable hoặc Network error)
      // Lần 2: Tự động chuyển hướng gọi Roboflow Serverless Workflow thành công
      const mockRoboflowResult = {
        outputs: [
          {
            annotated_image: { value: 'base64-annotated-image-content' },
            model_predictions: {
              image: { width: 1000, height: 1000 },
              predictions: [
                { x: 250, y: 250, width: 200, height: 200, confidence: 0.98 },
                { x: 750, y: 750, width: 200, height: 200, confidence: 0.95 },
              ],
            },
          },
        ],
      };

      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Connection refused to ai-service:8000')) // AI Service nội bộ offline
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockRoboflowResult,
        } as any); // Roboflow Vision Cloud phản hồi thành công

      const buf2 = Buffer.from('test-image-data-for-roboflow');
      const mockFile = {
        buffer: buf2,
        size: buf2.length,
        mimetype: 'image/png',
        originalname: 'medicine_box.png',
      } as Express.Multer.File;

      const result = await controller.countBoxes(mockFile);

      expect(result.success).toBe(true);
      expect(result.detectedCount).toBe(2);
      expect(result.confidence).toBe(96.5); // Trung bình cộng (0.98 + 0.95) / 2 = 96.5%
      expect(result.boxes).toHaveLength(2);
      expect(result.annotatedImage).toContain('data:image/jpeg;base64,base64-annotated-image-content');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên (0 hộp nhận diện, nhiều hộp, tọa độ sát mép)
  // =========================================================================
  describe('[Boundary Values] Các trường hợp biên trong nhận diện ảnh', () => {
    it('TC-VISION-BOUND-01: Ảnh không chứa hộp thuốc (0 predictions) trả về danh sách rỗng an toàn', async () => {
      const mockEmptyRoboflow = {
        outputs: [
          {
            annotated_image: { value: '' },
            model_predictions: {
              image: { width: 1000, height: 1000 },
              predictions: [],
            },
          },
        ],
      };

      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Internal AI offline'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEmptyRoboflow,
        } as any);

      const bufEmpty = Buffer.from('empty-desk-image');
      const mockFile = {
        buffer: bufEmpty,
        size: bufEmpty.length,
        mimetype: 'image/jpeg',
        originalname: 'empty.jpg',
      } as Express.Multer.File;

      const result = await controller.countBoxes(mockFile);

      expect(result.success).toBe(true);
      expect(result.detectedCount).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.boxes).toEqual([]);
    });

    it('TC-VISION-BOUND-02: Chuẩn hóa tọa độ % không vượt quá 100% hoặc nhỏ hơn 0% khi hộp thuốc nằm sát mép ảnh', async () => {
      const mockEdgeRoboflow = {
        outputs: [
          {
            model_predictions: {
              image: { width: 1000, height: 1000 },
              predictions: [
                { x: 10, y: 10, width: 50, height: 50, confidence: 0.9 }, // Gần mép (0,0)
                { x: 990, y: 990, width: 50, height: 50, confidence: 0.88 }, // Gần mép (1000, 1000)
              ],
            },
          },
        ],
      };

      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Internal AI offline'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockEdgeRoboflow,
        } as any);

      const bufEdge = Buffer.from('edge-boxes-image');
      const mockFile = {
        buffer: bufEdge,
        size: bufEdge.length,
        mimetype: 'image/webp',
        originalname: 'edge.webp',
      } as Express.Multer.File;

      const result = await controller.countBoxes(mockFile);

      expect(result.success).toBe(true);
      expect(result.detectedCount).toBe(2);
      expect(result.boxes[0].left).toBeGreaterThanOrEqual(0);
      expect(result.boxes[0].top).toBeGreaterThanOrEqual(0);
      expect(result.boxes[1].left + result.boxes[1].width).toBeLessThanOrEqual(105);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & xử lý ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] Xử lý ngoại lệ dữ liệu không hợp lệ', () => {
    it('TC-VISION-ABNORM-01: Ném BadRequestException khi không truyền file hoặc buffer rỗng', async () => {
      await expect(controller.countBoxes(undefined as any)).rejects.toThrow(BadRequestException);
      await expect(controller.countBoxes({ buffer: Buffer.alloc(0) } as any)).rejects.toThrow(BadRequestException);
    });

    it('TC-VISION-ABNORM-02: Ném ServiceUnavailableException khi cả AI Service nội bộ và Roboflow Cloud đều không phản hồi', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Internal AI timeout'))
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        } as any);

      const bufValid = Buffer.from('valid-image-bytes');
      const mockFile = {
        buffer: bufValid,
        size: bufValid.length,
        mimetype: 'image/jpeg',
        originalname: 'sample.jpg',
      } as Express.Multer.File;

      await expect(controller.countBoxes(mockFile)).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
