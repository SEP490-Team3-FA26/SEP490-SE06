// product-review.service.spec.ts - Bộ kiểm thử đơn vị cho ProductReviewService (UC-77)
// Tuân thủ chính sách Test-Coupled Mandate & phân loại 3 nhóm giá trị chuẩn

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductReviewService } from './product-review.service';
import { ProductReview } from './schemas/product-review.schema';
import { Medicine } from './schemas/medicine.schema';
import { RpcException } from '@nestjs/microservices';

describe('ProductReviewService', () => {
  let service: ProductReviewService;
  let mockReviewModel: any;
  let mockMedicineModel: any;

  // Mock dữ liệu cơ bản
  const validReviewDto = {
    medicineId: 'med-001',
    medicineName: 'Paracetamol 500mg',
    orderId: 'ord-12345',
    orderCode: 'PAYOS-9988',
    userId: 'user-001',
    reviewerName: 'Nguyễn Văn A',
    reviewerPhone: '0901234567',
    rating: 5,
    comment: 'Thuốc chính hãng, tác dụng hạ sốt rất nhanh chóng',
    images: ['https://cdn.example.com/img1.jpg'],
    tags: ['Hiệu quả tốt', 'Đóng gói cẩn thận'],
    isVerifiedPurchase: true,
  };

  beforeEach(async () => {
    // Định nghĩa mock cho ProductReview model
    function MockReviewInstance(data: any) {
      Object.assign(this, data);
      this.save = (jest.fn() as any).mockResolvedValue({ _id: 'review-id-1', ...data });
    }
    mockReviewModel = MockReviewInstance as any;
    mockReviewModel.findOne = (jest.fn() as any);
    mockReviewModel.find = (jest.fn() as any);
    mockReviewModel.countDocuments = (jest.fn() as any);
    mockReviewModel.aggregate = (jest.fn() as any);
    mockReviewModel.findByIdAndUpdate = (jest.fn() as any);

    // Định nghĩa mock cho Medicine model
    mockMedicineModel = {
      findByIdAndUpdate: (jest.fn() as any).mockResolvedValue({ _id: 'med-001', averageRating: 4.8, reviewCount: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductReviewService,
        {
          provide: getModelToken(ProductReview.name),
          useValue: mockReviewModel,
        },
        {
          provide: getModelToken(Medicine.name),
          useValue: mockMedicineModel,
        },
      ],
    }).compile();

    service = module.get<ProductReviewService>(ProductReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // [Normal Values] - Luồng nghiệp vụ chuẩn và thành công
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('NV-01: Tạo đánh giá thành công khi đủ dữ liệu hợp lệ', async () => {
      mockReviewModel.findOne.mockResolvedValue(null); // Chưa từng đánh giá
      mockReviewModel.aggregate.mockResolvedValue([
        { _id: 'med-001', avgRating: 4.75, totalReviews: 4 },
      ]);

      const result: any = await service.createReview(validReviewDto);

      expect(result).toBeDefined();
      expect(result.medicineId).toBe('med-001');
      expect(result.rating).toBe(5);
      expect(result.status).toBe('APPROVED');
      expect(mockMedicineModel.findByIdAndUpdate).toHaveBeenCalledWith('med-001', {
        averageRating: 4.8,
        reviewCount: 4,
      });
    });

    it('NV-02: Lấy danh sách đánh giá theo medicineId có phân trang và lọc', async () => {
      const mockList = [
        { _id: 'r1', rating: 5, comment: 'Tốt' },
        { _id: 'r2', rating: 4, comment: 'Khá' },
      ];
      const mockQueryChain = {
        sort: (jest.fn() as any).mockReturnThis(),
        skip: (jest.fn() as any).mockReturnThis(),
        limit: (jest.fn() as any).mockReturnThis(),
        exec: (jest.fn() as any).mockResolvedValue(mockList),
      };
      mockReviewModel.find.mockReturnValue(mockQueryChain);
      mockReviewModel.countDocuments.mockReturnValue({
        exec: (jest.fn() as any).mockResolvedValue(2),
      });

      const res = await service.getReviewsByMedicine('med-001', { page: 1, limit: 10, rating: 5 });

      expect(res.data).toEqual(mockList);
      expect(res.total).toBe(2);
      expect(res.page).toBe(1);
    });

    it('NV-03: Lấy tổng hợp đánh giá (averageRating, percentages, ratingBreakdown)', async () => {
      const mockApprovedReviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 2 },
      ];
      mockReviewModel.find.mockReturnValue({
        select: (jest.fn() as any).mockReturnValue({
          exec: (jest.fn() as any).mockResolvedValue(mockApprovedReviews),
        }),
      });

      const summary = await service.getReviewSummary('med-001');

      expect(summary.totalReviews).toBe(4);
      expect(summary.ratingBreakdown[5]).toBe(2);
      expect(summary.ratingBreakdown[4]).toBe(1);
      expect(summary.ratingBreakdown[2]).toBe(1);
      expect(summary.averageRating).toBe(4); // (5+5+4+2)/4 = 4.0
    });

    it('NV-04: Lấy lịch sử đánh giá của khách hàng theo SĐT', async () => {
      const mockUserReviews = [{ _id: 'r1', reviewerPhone: '0901234567' }];
      mockReviewModel.find.mockReturnValue({
        sort: (jest.fn() as any).mockReturnThis(),
        limit: (jest.fn() as any).mockReturnThis(),
        exec: (jest.fn() as any).mockResolvedValue(mockUserReviews),
      });

      const res = await service.getCustomerReviews({ customerPhone: '0901234567' });

      expect(res).toEqual(mockUserReviews);
    });

    it('NV-05: Bình chọn đánh giá hữu ích tăng helpfulCount', async () => {
      const updatedReview = { _id: 'r1', helpfulCount: 1 };
      mockReviewModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const res = await service.voteHelpful('r1');

      expect(res).toEqual(updatedReview);
      expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'r1',
        { $inc: { helpfulCount: 1 } },
        { new: true },
      );
    });
  });

  // =========================================================================
  // [Boundary Values] - Kiểm tra các giá trị biên, giới hạn và chống trùng lặp
  // =========================================================================
  describe('[Boundary Values] Giá trị biên và Idempotency', () => {
    it('BV-01: Đánh giá biên tối thiểu 1 sao -> Thành công', async () => {
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.aggregate.mockResolvedValue([]);

      const result: any = await service.createReview({
        ...validReviewDto,
        rating: 1,
      });

      expect(result.rating).toBe(1);
    });

    it('BV-02: Đánh giá biên tối đa 5 sao -> Thành công', async () => {
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.aggregate.mockResolvedValue([]);

      const result: any = await service.createReview({
        ...validReviewDto,
        rating: 5,
      });

      expect(result.rating).toBe(5);
    });

    it('BV-03: Giới hạn tối đa 3 hình ảnh đính kèm (Boundary Check)', async () => {
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.aggregate.mockResolvedValue([]);

      const result: any = await service.createReview({
        ...validReviewDto,
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'],
      });

      expect(result.images.length).toBe(3);
    });

    it('BV-04: Bình luận vượt quá 1000 ký tự -> Tự động cắt an toàn (maxlength clamp)', async () => {
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.aggregate.mockResolvedValue([]);

      const longComment = 'a'.repeat(1200);
      const result: any = await service.createReview({
        ...validReviewDto,
        comment: longComment,
      });

      expect(result.comment.length).toBe(1000);
    });

    it('BV-05: Chống trùng lặp (Idempotency) - Gửi lại đơn hàng và sản phẩm đã review -> Ném lỗi Conflict', async () => {
      mockReviewModel.findOne.mockResolvedValue({ _id: 'existing-id' });

      await expect(service.createReview(validReviewDto)).rejects.toThrow(RpcException);
    });

    it('BV-06: Phân trang trang trống (trang vượt quá tổng số) -> Trả về mảng rỗng an toàn', async () => {
      const mockQueryChain = {
        sort: (jest.fn() as any).mockReturnThis(),
        skip: (jest.fn() as any).mockReturnThis(),
        limit: (jest.fn() as any).mockReturnThis(),
        exec: (jest.fn() as any).mockResolvedValue([]),
      };
      mockReviewModel.find.mockReturnValue(mockQueryChain);
      mockReviewModel.countDocuments.mockReturnValue({
        exec: (jest.fn() as any).mockResolvedValue(0),
      });

      const res = await service.getReviewsByMedicine('med-001', { page: 99, limit: 10 });

      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.totalPages).toBe(1);
    });
  });

  // =========================================================================
  // [Abnormal Values] - Kiểm tra dữ liệu dị thường, lỗi ngoại lệ và vi phạm
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường và phòng vệ', () => {
    it('AV-01: Rating = 0 (dưới ngưỡng tối thiểu) -> Ném lỗi 400', async () => {
      await expect(
        service.createReview({
          ...validReviewDto,
          rating: 0,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('AV-02: Rating = 6 (vượt quá ngưỡng tối đa) -> Ném lỗi 400', async () => {
      await expect(
        service.createReview({
          ...validReviewDto,
          rating: 6,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('AV-03: Rating không phải là số (NaN) -> Ném lỗi 400', async () => {
      await expect(
        service.createReview({
          ...validReviewDto,
          rating: 'invalid' as any,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('AV-04: Thiếu medicineId hoặc orderId -> Ném lỗi 400', async () => {
      await expect(
        service.createReview({
          ...validReviewDto,
          medicineId: '',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('AV-05: Thiếu tên người đánh giá hoặc số điện thoại -> Ném lỗi 400', async () => {
      await expect(
        service.createReview({
          ...validReviewDto,
          reviewerName: '   ',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('AV-06: Bình luận chứa từ khóa spam/nhạy cảm -> Chuyển trạng thái sang PENDING để kiểm duyệt', async () => {
      mockReviewModel.findOne.mockResolvedValue(null);

      const result: any = await service.createReview({
        ...validReviewDto,
        comment: 'Đây là thuốc kích dục và lừa đảo đánh bạc',
      });

      expect(result.status).toBe('PENDING');
      // Khi status = PENDING thì không cập nhật ngay vào Medicine rating
      expect(mockMedicineModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('AV-07: Bình chọn hữu ích với reviewId không tồn tại -> Ném lỗi 404', async () => {
      mockReviewModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.voteHelpful('non-existent-id')).rejects.toThrow(RpcException);
    });
  });
});

