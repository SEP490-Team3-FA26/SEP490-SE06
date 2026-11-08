// product-review.controller.spec.ts - Bộ kiểm thử đơn vị cho API Gateway ProductReviewController (UC-77)
// Tuân thủ Test-Coupled Mandate & phân loại 3 nhóm giá trị chuẩn

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductReviewController } from '../../../apps/api-gateway/src/controllers/product-review.controller';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import * as kafkaHelper from '../../../apps/api-gateway/src/common/kafka.helper';
import { CloudinaryStorageService } from '../../../apps/api-gateway/src/storage/cloudinary-storage.service';

describe('ProductReviewController (API Gateway)', () => {
  let controller: ProductReviewController;
  let mockInventoryClient: any;
  let mockOrderClient: any;
  let mockCacheManager: any;
  let mockCloudinaryStorage: any;

  const validReviewDto: any = {
    medicineId: 'med-123',
    medicineName: 'Amoxicillin 500mg',
    orderId: 'ord-999',
    orderCode: '100234',
    reviewerName: 'Trần Văn B',
    reviewerPhone: '0912345678',
    rating: 5,
    comment: 'Thuốc dùng rất tốt',
    images: ['https://res.cloudinary.com/dubhxhwvk/image/upload/v1/wdp301/reviews/test.jpg'],
    tags: ['Hiệu quả tốt'],
  };

  beforeEach(async () => {
    mockInventoryClient = {
      emit: jest.fn(),
      send: jest.fn(),
    };
    mockOrderClient = {
      send: jest.fn(),
    };
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockCloudinaryStorage = {
      uploadImage: (jest.fn() as any).mockResolvedValue({
        url: 'https://res.cloudinary.com/dubhxhwvk/image/upload/v1793349759/wdp301/reviews/img_123.jpg',
        fileName: 'img_123.jpg',
        publicId: 'wdp301/reviews/img_123',
        isCloudinary: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductReviewController],
      providers: [
        { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        { provide: 'ORDER_SERVICE', useValue: mockOrderClient },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: CloudinaryStorageService, useValue: mockCloudinaryStorage },
      ],
    }).compile();

    controller = module.get<ProductReviewController>(ProductReviewController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // [Normal Values] - Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('NV-01: Gửi đánh giá thành công khi đơn hàng PAID hợp lệ -> Trả về 202 Accepted', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockImplementation(async (client, topic, data) => {
        if (topic === 'orders.check') {
          return { order: { orderCode: 100234, paymentStatus: 'PAID' } };
        }
        if (topic === 'product.review.create') {
          return { _id: 'rev-01', ...validReviewDto, status: 'APPROVED' };
        }
        return null;
      });

      const res = await controller.createReview('med-123', validReviewDto, { user: { id: 'usr-1' } });

      expect(res.status).toBe('Accepted');
      expect(res.message).toContain('thành công');
      expect(mockCacheManager.del).toHaveBeenCalledWith('reviews:summary:med-123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('reviews:list:med-123');
    });

    it('NV-02: Lấy danh sách đánh giá khi Cache Hit -> Không gọi Kafka', async () => {
      const cachedReviews = { data: [{ _id: 'r1' }], total: 1 };
      mockCacheManager.get.mockResolvedValue(cachedReviews);
      const sendKafkaSpy = jest.spyOn(kafkaHelper, 'sendKafkaMessage');

      const res = await controller.getReviews('med-123', { page: 1, limit: 10 });

      expect(res).toEqual(cachedReviews);
      expect(sendKafkaSpy).not.toHaveBeenCalled();
    });

    it('NV-03: Lấy danh sách đánh giá khi Cache Miss -> Gọi Kafka và ghi Cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const dbReviews = { data: [{ _id: 'r1' }], total: 1 };
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue(dbReviews);

      const res = await controller.getReviews('med-123', { page: 1, limit: 10 });

      expect(res).toEqual(dbReviews);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('NV-04: Lấy dữ liệu tổng quan xếp hạng sao sản phẩm (summary)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const summaryData = {
        medicineId: 'med-123',
        averageRating: 4.8,
        totalReviews: 20,
        ratingBreakdown: { 5: 16, 4: 4, 3: 0, 2: 0, 1: 0 },
      };
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue(summaryData);

      const res = await controller.getReviewSummary('med-123');

      expect(res).toEqual(summaryData);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('NV-05: Bình chọn đánh giá hữu ích thành công', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue({ _id: 'rev-01', helpfulCount: 5 });

      const res = await controller.voteHelpful('rev-01');

      expect(res.status).toBe('Accepted');
      expect(res.message).toContain('bình chọn');
    });

    it('NV-06: Tải ảnh đánh giá thực tế lên Cloudinary thành công', async () => {
      const uploadRes = await controller.uploadReviewImage(undefined, {
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        filename: 'medicine_box.png',
      });

      expect(uploadRes.status).toBe('Success');
      expect(uploadRes.url).toContain('https://res.cloudinary.com/');
      expect(uploadRes.isCloudinary).toBe(true);
      expect(mockCloudinaryStorage.uploadImage).toHaveBeenCalled();
    });

    it('NV-07: Gửi đánh giá cho đơn bán tại quầy POS (RETAIL / Mua tại quầy) -> Thành công', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockImplementation(async (client, topic) => {
        if (topic === 'orders.check') {
          return {
            order: {
              orderCode: 41301834,
              shippingAddress: 'Mua tại quầy',
              type: 'RETAIL',
              paymentStatus: 'INVENTORY_FAILED',
            },
          };
        }
        if (topic === 'product.review.create') {
          return { _id: 'rev-02', status: 'APPROVED' };
        }
        return null;
      });

      const res = await controller.createReview(
        'med-123',
        { ...validReviewDto, orderCode: '41301834' },
        { user: { id: 'usr-1' } },
      );

      expect(res.status).toBe('Accepted');
    });
  });

  // =========================================================================
  // [Boundary Values] - Kiểm tra các giá trị biên
  // =========================================================================
  describe('[Boundary Values] Giá trị biên', () => {
    it('BV-01: Gửi đánh giá với điểm biên 1 sao -> Thành công', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue({
        _id: 'rev-1star',
        rating: 1,
      });

      const res = await controller.createReview(
        'med-123',
        { ...validReviewDto, rating: 1 },
        { user: {} },
      );

      expect(res.status).toBe('Accepted');
    });

    it('BV-02: Gửi đánh giá với điểm biên 5 sao -> Thành công', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue({
        _id: 'rev-5star',
        rating: 5,
      });

      const res = await controller.createReview(
        'med-123',
        { ...validReviewDto, rating: 5 },
        { user: {} },
      );

      expect(res.status).toBe('Accepted');
    });

    it('BV-03: Tra cứu đánh giá khi không có dữ liệu cache -> Vẫn trả về đối tượng an toàn', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockResolvedValue([]);

      const res = await controller.getCustomerReviews('0912345678');

      expect(res).toEqual([]);
    });

    it('BV-04: Tải ảnh qua File Buffer (Multer) lên Cloudinary -> Thành công', async () => {
      const mockFile: any = {
        buffer: Buffer.from('fake-image-bytes'),
        originalname: 'real_pill.jpg',
        mimetype: 'image/jpeg',
      };

      const uploadRes = await controller.uploadReviewImage(mockFile);

      expect(uploadRes.status).toBe('Success');
      expect(uploadRes.isCloudinary).toBe(true);
    });
  });

  // =========================================================================
  // [Abnormal Values] - Kiểm tra dữ liệu dị thường và ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường và phòng vệ', () => {
    it('AV-01: medicineId rỗng -> Ném lỗi BadRequestException', async () => {
      await expect(
        controller.createReview('', validReviewDto, { user: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('AV-02: Đơn hàng ở trạng thái chưa thanh toán (PENDING) -> Chặn và ném BadRequestException', async () => {
      jest.spyOn(kafkaHelper, 'sendKafkaMessage').mockImplementation(async (client, topic) => {
        if (topic === 'orders.check') {
          return { order: { orderCode: 100234, paymentStatus: 'PENDING' } };
        }
        return null;
      });

      await expect(
        controller.createReview('med-123', validReviewDto, { user: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('AV-03: Không truyền file hoặc base64 khi gọi upload -> Ném lỗi BadRequestException', async () => {
      await expect(controller.uploadReviewImage(undefined, {})).rejects.toThrow(BadRequestException);
    });
  });
});
