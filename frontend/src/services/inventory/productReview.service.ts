// productReview.service.ts - Service quản lý Đánh giá & Review sản phẩm thuốc phía Web Frontend (UC-77)
import api from '../core/api';

export interface ProductReviewItem {
  _id: string;
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
  status: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductReviewSummary {
  medicineId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  percentages: Record<number, number>;
}

export interface CreateReviewPayload {
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
}

export interface ProductReviewListResponse {
  data: ProductReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productReviewService = {
  /**
   * Gửi bài đánh giá sản phẩm mới (HTTP 202 ACCEPTED)
   */
  async submitReview(medicineId: string, payload: CreateReviewPayload): Promise<any> {
    const response = await api.post(`/api/products/${medicineId}/reviews`, payload);
    return response.data;
  },

  /**
   * Lấy danh sách đánh giá của sản phẩm kèm phân trang và lọc sao
   */
  async getReviews(
    medicineId: string,
    params?: { page?: number; limit?: number; rating?: number },
  ): Promise<ProductReviewListResponse> {
    const response = await api.get(`/api/products/${medicineId}/reviews`, { params });
    return response.data;
  },

  /**
   * Lấy tổng hợp điểm trung bình và phân bố sao (1-5 sao)
   */
  async getReviewSummary(medicineId: string): Promise<ProductReviewSummary> {
    const response = await api.get(`/api/products/${medicineId}/reviews/summary`);
    return response.data;
  },

  /**
   * Tải ảnh đánh giá lên Cloudinary qua API Gateway
   */
  async uploadImage(file: File): Promise<{ url: string; fileName: string; isCloudinary: boolean }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/products/reviews/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Bình chọn đánh giá hữu ích
   */
  async voteHelpful(reviewId: string): Promise<any> {
    const response = await api.post(`/api/products/reviews/${reviewId}/helpful`);
    return response.data;
  },

  /**
   * Lấy lịch sử đánh giá của người dùng hiện tại
   */
  async getMyReviews(): Promise<ProductReviewItem[]> {
    const response = await api.get('/api/products/reviews/me');
    return Array.isArray(response.data) ? response.data : response.data?.data || [];
  },

  /**
   * Lấy lịch sử đánh giá theo số điện thoại khách hàng
   */
  async getCustomerReviews(phone: string): Promise<ProductReviewItem[]> {
    const response = await api.get(`/api/products/reviews/customer/${encodeURIComponent(phone)}`);
    return Array.isArray(response.data) ? response.data : response.data?.data || [];
  },
};

