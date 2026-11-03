// product-review.service.ts - Xử lý nghiệp vụ đánh giá và review sản phẩm (UC-77)
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductReview, ProductReviewDocument } from './schemas/product-review.schema';
import { Medicine } from './schemas/medicine.schema';
import { RpcException } from '@nestjs/microservices';

// Danh sách từ khóa nghi vấn spam hoặc vi phạm tiêu chuẩn cộng đồng y tế
const SPAM_KEYWORDS = [
  'lừa đảo',
  'casino',
  'tiền ảo',
  'cờ bạc',
  'tự tử',
  'thuốc giả',
  'kích dục',
  'sex',
  'đánh bạc',
  'hack',
];

@Injectable()
export class ProductReviewService {
  constructor(
    @InjectModel(ProductReview.name)
    private readonly productReviewModel: Model<ProductReviewDocument>,
    @InjectModel(Medicine.name)
    private readonly medicineModel: Model<Medicine>,
  ) {}

  /**
   * Tạo đánh giá sản phẩm mới kèm kiểm duyệt tự động và cập nhật điểm trung bình (UC-77)
   */
  async createReview(dto: {
    medicineId: string;
    medicineName: string;
    orderId: string;
    orderCode: string;
    userId?: string;
    reviewerName: string;
    reviewerPhone: string;
    rating: number;
    comment?: string;
    images?: string[];
    tags?: string[];
    isVerifiedPurchase?: boolean;
  }): Promise<ProductReview> {
    // 1. Kiểm tra tham số bắt buộc
    if (!dto || !dto.medicineId || !dto.orderId) {
      throw new RpcException({
        message: 'Thiếu thông tin thuốc hoặc đơn hàng cần đánh giá',
        statusCode: 400,
      });
    }

    const rating = Number(dto.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new RpcException({
        message: 'Số sao đánh giá phải từ 1 đến 5 sao',
        statusCode: 400,
      });
    }

    if (!dto.reviewerName?.trim() || !dto.reviewerPhone?.trim()) {
      throw new RpcException({
        message: 'Vui lòng cung cấp tên và số điện thoại người đánh giá',
        statusCode: 400,
      });
    }

    // 2. Chống gửi trùng lặp (Idempotency): Mỗi đơn hàng chỉ review 1 sản phẩm 1 lần
    const existing = await this.productReviewModel.findOne({
      orderId: dto.orderId,
      medicineId: dto.medicineId,
    });

    if (existing) {
      throw new RpcException({
        message: 'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng rồi',
        statusCode: 409,
      });
    }

    // 3. Kiểm duyệt nội dung tự động (Spam Filter)
    let reviewStatus = 'APPROVED';
    if (dto.comment) {
      const lowerComment = dto.comment.toLowerCase();
      const hasSpam = SPAM_KEYWORDS.some((kw) => lowerComment.includes(kw));
      if (hasSpam) {
        reviewStatus = 'PENDING'; // Chuyển vào hàng đợi kiểm duyệt thủ công
      }
    }

    // 4. Lưu đánh giá vào Database
    const createdReview = new this.productReviewModel({
      medicineId: dto.medicineId,
      medicineName: dto.medicineName,
      orderId: dto.orderId,
      orderCode: dto.orderCode,
      userId: dto.userId || undefined,
      reviewerName: dto.reviewerName.trim(),
      reviewerPhone: dto.reviewerPhone.trim(),
      rating,
      comment: dto.comment ? dto.comment.slice(0, 1000).trim() : '',
      images: Array.isArray(dto.images) ? dto.images.slice(0, 3) : [],
      tags: Array.isArray(dto.tags) ? dto.tags : [],
      status: reviewStatus,
      isVerifiedPurchase: dto.isVerifiedPurchase ?? true,
      helpfulCount: 0,
    });

    const saved = await createdReview.save();

    // 5. Nếu đánh giá được APPROVED ngay, tái tính toán điểm trung bình trên Medicine
    if (reviewStatus === 'APPROVED') {
      await this.recalculateMedicineRating(dto.medicineId);
    }

    return saved;
  }

  /**
   * Tính toán lại điểm đánh giá trung bình và số lượng review cho sản phẩm
   */
  async recalculateMedicineRating(medicineId: string): Promise<void> {
    try {
      const stats = await this.productReviewModel.aggregate([
        {
          $match: {
            medicineId,
            status: 'APPROVED',
          },
        },
        {
          $group: {
            _id: '$medicineId',
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        const avg = Math.round(stats[0].avgRating * 10) / 10;
        const total = stats[0].totalReviews;
        await this.medicineModel.findByIdAndUpdate(medicineId, {
          averageRating: avg,
          reviewCount: total,
        });
      } else {
        await this.medicineModel.findByIdAndUpdate(medicineId, {
          averageRating: 0,
          reviewCount: 0,
        });
      }
    } catch (error) {
      console.error(`[ProductReviewService] Lỗi khi cập nhật rating cho medicine ${medicineId}:`, error);
    }
  }

  /**
   * Lấy danh sách đánh giá của sản phẩm kèm phân trang và lọc số sao
   */
  async getReviewsByMedicine(
    medicineId: string,
    query?: { page?: number; limit?: number; rating?: number; status?: string },
  ) {
    if (!medicineId) {
      throw new RpcException({
        message: 'Mã sản phẩm không được để trống',
        statusCode: 400,
      });
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {
      medicineId,
      status: query?.status || 'APPROVED',
    };

    if (query?.rating && Number(query.rating) >= 1 && Number(query.rating) <= 5) {
      filter.rating = Number(query.rating);
    }

    const [data, total] = await Promise.all([
      this.productReviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productReviewModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Thống kê tổng quan đánh giá: điểm trung bình và phân bố sao (1 đến 5 sao)
   */
  async getReviewSummary(medicineId: string) {
    if (!medicineId) {
      throw new RpcException({
        message: 'Mã sản phẩm không được để trống',
        statusCode: 400,
      });
    }

    const reviews = await this.productReviewModel.find({
      medicineId,
      status: 'APPROVED',
    }).select('rating').exec();

    const total = reviews.length;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      breakdown[star] = (breakdown[star] || 0) + 1;
      sum += r.rating;
    }

    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    const percentages: Record<number, number> = {
      1: total > 0 ? Math.round((breakdown[1] / total) * 100) : 0,
      2: total > 0 ? Math.round((breakdown[2] / total) * 100) : 0,
      3: total > 0 ? Math.round((breakdown[3] / total) * 100) : 0,
      4: total > 0 ? Math.round((breakdown[4] / total) * 100) : 0,
      5: total > 0 ? Math.round((breakdown[5] / total) * 100) : 0,
    };

    return {
      medicineId,
      averageRating: avg,
      totalReviews: total,
      ratingBreakdown: breakdown,
      percentages,
    };
  }

  /**
   * Lấy lịch sử đánh giá của khách hàng theo số điện thoại hoặc userId
   */
  async getCustomerReviews(params: { customerPhone?: string; userId?: string }) {
    const filter: any = {};
    if (params.customerPhone) {
      filter.reviewerPhone = params.customerPhone;
    } else if (params.userId) {
      filter.userId = params.userId;
    } else {
      return [];
    }

    return this.productReviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  /**
   * Bình chọn đánh giá hữu ích (Helpful count)
   */
  async voteHelpful(reviewId: string) {
    if (!reviewId) {
      throw new RpcException({
        message: 'Mã đánh giá không hợp lệ',
        statusCode: 400,
      });
    }

    const updated = await this.productReviewModel.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true },
    );

    if (!updated) {
      throw new RpcException({
        message: 'Không tìm thấy đánh giá để bình chọn',
        statusCode: 404,
      });
    }

    return updated;
  }
}

