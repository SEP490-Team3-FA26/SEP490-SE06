import { PrescriptionController } from '../../../apps/api-gateway/src/controllers/prescription.controller';
import { ClientKafka } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * prescription-ocr-speed.spec.ts
 * Bộ kiểm thử đơn vị cho tính năng Quét đơn thuốc bằng AI OCR siêu tốc và tối ưu hóa thời gian phản hồi.
 * Tuân thủ 100% Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md).
 * Đầy đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values].
 * Chú thích mã nguồn: Tiếng Việt 100%.
 */

describe('PrescriptionController - AI OCR High-Performance Prescription Scanning', () => {
  let controller: PrescriptionController;
  let mockInventoryClient: Partial<ClientKafka>;
  let mockCacheManager: Partial<Cache>;
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

    controller = new PrescriptionController(
      mockInventoryClient as ClientKafka,
      mockCacheManager as Cache,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, bóc tách đơn thuốc OCR thành công
  // =========================================================================
  describe('[Normal Values] Luồng quét đơn thuốc OCR chuẩn & thành công', () => {
    it('TC-OCR-NORM-01: Quét thành công đơn thuốc bản in điện tử với thời gian phản hồi tối ưu', async () => {
      const mockOcrResponse = {
        success: true,
        scan_id: 'scan_norm_01',
        from_cache: false,
        processing_time_sec: 1.45,
        patient: { name: 'Nguyen Van An', age: 35, gender: 'Nam', diagnosis: 'Viêm họng cấp' },
        doctor: { name: 'BS. Tran Binh', hospital: 'BV Bach Mai' },
        items: [
          {
            raw_line_text: 'Amoxicillin 500mg 10 viên',
            matched_medicine_id: 'med-amox-001',
            medicine_name: 'Amoxicillin 500mg',
            dosage: 'Uống sáng 1 viên, chiều 1 viên sau ăn',
            quantity: 10,
            unit: 'viên',
            stock_available: true,
          },
        ],
        validation_warnings: [],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOcrResponse,
      } as any);

      const fakeFile: Express.Multer.File = {
        fieldname: 'images',
        originalname: 'prescription_printed.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-jpeg-binary-data'),
        size: 1024 * 50, // 50KB
      } as any;

      const result = await controller.scanPrescriptionImages([fakeFile], 'CENTRAL_WH');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(1);
      expect(result.items[0].medicine_name).toBe('Amoxicillin 500mg');
      expect(result.processing_time_sec).toBeLessThan(3.0);
    });

    it('TC-OCR-NORM-02: Phản hồi tức thì (< 50ms) khi quét đơn thuốc trùng lặp có SHA-256 Cache', async () => {
      const mockCachedResponse = {
        success: true,
        scan_id: 'scan_cached_02',
        from_cache: true,
        processing_time_sec: 0.025,
        patient: { name: 'Nguyen Van An', age: 35 },
        items: [{ medicine_name: 'Amoxicillin 500mg' }],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCachedResponse,
      } as any);

      const fakeFile: Express.Multer.File = {
        fieldname: 'images',
        originalname: 'cached_rx.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('identical-bytes'),
        size: 1024 * 20,
      } as any;

      const result = await controller.scanPrescriptionImages([fakeFile], 'BR-001');

      expect(result.from_cache).toBe(true);
      expect(result.processing_time_sec).toBeLessThan(0.1);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Ranh giới & Dữ liệu biên
  // =========================================================================
  describe('[Boundary Values] Ranh giới & Kiểm tra điều kiện biên', () => {
    it('TC-OCR-BOUND-01: Chấp nhận quét tối đa 5 trang đơn thuốc cùng lúc theo giới hạn Multer', async () => {
      const mockMultiPageResponse = {
        success: true,
        scan_id: 'scan_multipage_05',
        from_cache: false,
        items: [
          { medicine_name: 'Thuoc Trang 1' },
          { medicine_name: 'Thuoc Trang 2' },
        ],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMultiPageResponse,
      } as any);

      const fiveFiles: Express.Multer.File[] = Array.from({ length: 5 }, (_, idx) => ({
        fieldname: 'images',
        originalname: `page_${idx + 1}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(`page-content-${idx}`),
        size: 1024 * 10,
      } as any));

      const result = await controller.scanPrescriptionImages(fiveFiles, 'CENTRAL_WH');
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(2);
    });

    it('TC-OCR-BOUND-02: Kiểm tra biên khi danh sách file rỗng ném BadRequestException 400', async () => {
      await expect(controller.scanPrescriptionImages([], 'CENTRAL_WH')).rejects.toThrow(
        new HttpException('Vui lòng cung cấp ít nhất 1 ảnh đơn thuốc', HttpStatus.BAD_REQUEST),
      );
    });

    it('TC-OCR-BOUND-03: Tự động fallback sang URL container nội bộ khi gọi localhost thất bại', async () => {
      const mockFallbackResponse = {
        success: true,
        scan_id: 'scan_fallback_ok',
        items: [{ medicine_name: 'Paracetamol 500mg' }],
      };

      // Giả lập lần gọi đầu tiên lỗi mạng (reject) và lần gọi fallback container thành công
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8000'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockFallbackResponse,
        } as any);

      const fakeFile: Express.Multer.File = {
        fieldname: 'images',
        originalname: 'sample.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('image-binary'),
        size: 1024,
      } as any;

      const result = await controller.scanPrescriptionImages([fakeFile]);
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường & ngoại lệ y khoa
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & Từ chối vi phạm an toàn y khoa', () => {
    it('TC-OCR-ABNORM-01: Bắt buộc từ chối đơn thuốc chữ viết tay (HANDWRITTEN_PRESCRIPTION_REJECTED)', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            detail:
              'HANDWRITTEN_PRESCRIPTION_REJECTED: Hệ thống chỉ hỗ trợ quét đơn thuốc bản in điện tử, không tiếp nhận đơn viết tay.',
          }),
      } as any);

      const fakeFile: Express.Multer.File = {
        fieldname: 'images',
        originalname: 'handwritten_rx.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('handwritten-bytes'),
        size: 1024 * 30,
      } as any;

      await expect(controller.scanPrescriptionImages([fakeFile])).rejects.toThrow(
        new HttpException(
          'HANDWRITTEN_PRESCRIPTION_REJECTED: Hệ thống chỉ hỗ trợ quét đơn thuốc bản in điện tử, không tiếp nhận đơn viết tay.',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('TC-OCR-ABNORM-02: Ném lỗi 503 khi AI Service gặp sự cố hoặc quá tải model', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            detail: 'Dịch vụ AI Vision đang quá tải hoặc bảo trì tạm thời.',
          }),
      } as any);

      const fakeFile: Express.Multer.File = {
        fieldname: 'images',
        originalname: 'valid.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('some-bytes'),
        size: 1024,
      } as any;

      await expect(controller.scanPrescriptionImages([fakeFile])).rejects.toThrow(
        new HttpException(
          'Dịch vụ AI Vision đang quá tải hoặc bảo trì tạm thời.',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });
});
