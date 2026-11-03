// productReviewApiService.ts - API Service cho tính năng Đánh giá & Review sản phẩm trên Mobile App (UC-77)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvService } from './env.service';

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

export const ProductReviewAPI = {
  getBaseUrl(): string {
    return EnvService.getApiBaseUrl();
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    let token = await AsyncStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  /**
   * Khách hàng gửi đánh giá sản phẩm (UC-77)
   */
  async submitReview(
    medicineId: string,
    data: CreateReviewPayload,
  ): Promise<{ status: string; message: string; data?: any }> {
    const url = `${this.getBaseUrl()}/api/products/${medicineId}/reviews`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi gửi đánh giá sản phẩm');
    }

    return resJson;
  },

  /**
   * Lấy danh sách đánh giá của sản phẩm kèm phân trang và lọc sao
   */
  async getMedicineReviews(
    medicineId: string,
    params?: { page?: number; limit?: number; rating?: number },
  ): Promise<{ data: ProductReviewItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.rating) query.append('rating', String(params.rating));

    const qs = query.toString() ? `?${query.toString()}` : '';
    const url = `${this.getBaseUrl()}/api/products/${medicineId}/reviews${qs}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { method: 'GET', headers });
    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi lấy danh sách đánh giá');
    }

    return resJson;
  },

  /**
   * Lấy dữ liệu tổng hợp rating và phân bố 1 đến 5 sao
   */
  async getMedicineReviewSummary(medicineId: string): Promise<ProductReviewSummary> {
    const url = `${this.getBaseUrl()}/api/products/${medicineId}/reviews/summary`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { method: 'GET', headers });
    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi lấy tổng hợp đánh giá');
    }

    return resJson;
  },

  /**
   * Lấy lịch sử đánh giá của người dùng hiện tại (nếu đã đăng nhập)
   */
  async getMyReviews(): Promise<ProductReviewItem[]> {
    const url = `${this.getBaseUrl()}/api/products/reviews/me`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { method: 'GET', headers });
    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi lấy lịch sử đánh giá');
    }

    return Array.isArray(resJson) ? resJson : resJson?.data || [];
  },

  /**
   * Lấy lịch sử đánh giá theo số điện thoại khách hàng (cho khách vãng lai)
   */
  async getCustomerReviews(phone: string): Promise<ProductReviewItem[]> {
    const url = `${this.getBaseUrl()}/api/products/reviews/customer/${encodeURIComponent(phone)}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { method: 'GET', headers });
    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi lấy lịch sử đánh giá theo SĐT');
    }

    return Array.isArray(resJson) ? resJson : resJson?.data || [];
  },

  /**
   * Bình chọn đánh giá hữu ích
   */
  async voteHelpful(reviewId: string): Promise<void> {
    const url = `${this.getBaseUrl()}/api/products/reviews/${reviewId}/helpful`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { method: 'POST', headers });
    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi bình chọn hữu ích');
    }
  },

  /**
   * Tải ảnh đánh giá thực tế lên Cloudinary qua API Gateway (UC-77)
   */
  async uploadReviewImage(base64: string, filename?: string): Promise<string> {
    const url = `${this.getBaseUrl()}/api/products/reviews/upload-image`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base64,
        filename: filename || `review_${Date.now()}.jpg`,
      }),
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson?.message || 'Lỗi khi tải ảnh lên Cloudinary');
    }

    return resJson.url;
  },
};

