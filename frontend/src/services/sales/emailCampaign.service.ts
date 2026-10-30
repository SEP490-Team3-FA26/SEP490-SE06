import api from '../core/api';

// ===================================================================
// Interfaces định nghĩa kiểu dữ liệu Email Marketing
// ===================================================================

export interface FeaturedProductData {
  productId?: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  salePrice: number;
  productUrl?: string;
}

export interface EmailCampaignData {
  _id?: string;
  title: string;
  subject: string;
  preheader?: string;
  bannerUrl: string;
  greetingText?: string;
  mainContentHtml: string;
  promotionId?: string;
  voucherCode?: string;
  discountSummary?: string;
  promotionStartDate?: string;
  promotionEndDate?: string;
  featuredProducts?: FeaturedProductData[];
  ctaButtonText?: string;
  ctaButtonUrl: string;
  termsAndConditions?: string;
  targetAudience?: 'ALL' | 'VIP';
  sendMode?: 'IMMEDIATE' | 'SCHEDULED';
  scheduledAt: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILED' | 'CANCELLED';
  stats?: {
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  };
  createdAt?: string;
}

export interface CampaignStatsData {
  _id: string;
  title: string;
  status: string;
  scheduledAt: string;
  stats: {
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  };
  realtimeStats: {
    sentCount: number;
    failedCount: number;
    pendingCount: number;
  };
}

export interface AsyncAcceptedResponse {
  status: string;
  message: string;
}

// ===================================================================
// Service layer cho Email Marketing Campaign
// Toàn bộ HTTP request đi qua API Gateway (/api/marketing/campaigns/email)
// ===================================================================
export const emailCampaignService = {
  /**
   * Lấy danh sách chiến dịch email (có thể lọc theo status)
   */
  async getCampaigns(params?: { status?: string }): Promise<EmailCampaignData[]> {
    const response = await api.get('/api/marketing/campaigns/email', { params });
    return Array.isArray(response.data) ? response.data : response.data?.data || [];
  },

  /**
   * Lấy chi tiết 1 chiến dịch email theo ID
   */
  async getCampaignById(id: string): Promise<EmailCampaignData> {
    const response = await api.get(`/api/marketing/campaigns/email/${id}`);
    return response.data;
  },

  /**
   * Tạo chiến dịch email mới (DRAFT hoặc SCHEDULED)
   * Trả về chiến dịch đã lưu vào DB (không phải 202 Accepted — lưu đồng bộ)
   */
  async createCampaign(data: Omit<EmailCampaignData, '_id' | 'status' | 'stats' | 'createdAt'>): Promise<EmailCampaignData> {
    const response = await api.post('/api/marketing/campaigns/email', data);
    return response.data;
  },

  /**
   * Cập nhật thông tin chiến dịch email
   */
  async updateCampaign(id: string, data: Partial<EmailCampaignData>): Promise<EmailCampaignData> {
    const response = await api.put(`/api/marketing/campaigns/email/${id}`, data);
    return response.data;
  },

  /**
   * Kích hoạt gửi ngay hoặc Retry chiến dịch PARTIAL_FAILED
   * Trả về 202 Accepted — Kafka Event bất đồng bộ
   */
  async triggerCampaign(id: string): Promise<AsyncAcceptedResponse> {
    const response = await api.post(`/api/marketing/campaigns/email/${id}/trigger`);
    return response.data;
  },

  /**
   * Gửi email thử nghiệm tới 1 địa chỉ bất kỳ để Admin preview
   */
  async sendTestEmail(id: string, testEmail: string): Promise<{ success: boolean; messageId?: string }> {
    const response = await api.post(`/api/marketing/campaigns/email/${id}/send-test`, {
      testEmail,
    });
    return response.data;
  },

  /**
   * Lấy thống kê tiến độ gửi real-time của chiến dịch
   * Dùng để hiển thị Progress Bar & số liệu
   */
  async getCampaignStats(id: string): Promise<CampaignStatsData> {
    const response = await api.get(`/api/marketing/campaigns/email/${id}/stats`);
    return response.data;
  },

  /**
   * Hủy lịch phát tán chiến dịch email (SCHEDULED -> CANCELLED)
   */
  async cancelCampaign(id: string): Promise<EmailCampaignData> {
    const response = await api.post(`/api/marketing/campaigns/email/${id}/cancel`);
    return response.data;
  },

  /**
   * Xóa chiến dịch Email Newsletter vĩnh viễn
   */
  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/marketing/campaigns/email/${id}`);
    return response.data;
  },
};
