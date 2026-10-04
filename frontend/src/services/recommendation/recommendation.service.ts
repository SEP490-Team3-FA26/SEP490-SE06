import api from '../core/api';

export interface RecommendedMedicine {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  drug_classification?: string;
  stock?: number;
  unit?: string;
  cong_dung?: string;
}

export interface ChronicReminder {
  isDue: boolean;
  daysRemaining: number;
  patientName?: string;
  message: string;
  recommendedVoucher?: string;
  suggestedProducts: RecommendedMedicine[];
}

export interface RecommendationData {
  rfmSegment?: string;
  chronicReminder?: ChronicReminder | null;
  recentSearches: string[];
  recommendationReason: string;
  recommendationType: 'CROSS_SELL_HEALTH_BOOST' | 'CHRONIC_REFILL' | 'POPULAR_FAMILY_CARE';
  items: RecommendedMedicine[];
}

// Utility lấy hoặc sinh Device ID ẩn danh duy nhất cho khách vãng lai
export const getOrSetDeviceId = (): string => {
  const STORAGE_KEY = 'pharma_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
};

export const recommendationService = {
  // Ghi nhận lịch sử tìm kiếm (Async Kafka Event)
  async logSearch(payload: {
    keyword: string;
    category?: string;
    phone?: string;
    userId?: string;
    deviceId?: string;
    resultsCount?: number;
  }): Promise<{ status: string; message: string }> {
    try {
      const deviceId = payload.deviceId || getOrSetDeviceId();
      const response = await api.post('/api/recommendations/search-log', {
        ...payload,
        deviceId,
      });
      return response.data;
    } catch (err) {
      console.warn('Silent search log error:', err);
      return { status: 'Error', message: 'Failed to log search' };
    }
  },

  // Lấy danh sách sản phẩm gợi ý cá nhân hóa (Pharma-Smart Recommender)
  async getRecommendationsForYou(params?: {
    phone?: string;
    userId?: string;
    deviceId?: string;
    branchId?: string;
  }): Promise<RecommendationData> {
    const deviceId = params?.deviceId || getOrSetDeviceId();
    const response = await api.get<RecommendationData>('/api/recommendations/for-you', {
      params: {
        ...params,
        deviceId,
      },
    });
    return response.data;
  },

  // Lấy danh sách các từ khóa tìm kiếm gần đây
  async getRecentSearches(params?: {
    phone?: string;
    userId?: string;
    deviceId?: string;
  }): Promise<string[]> {
    const deviceId = params?.deviceId || getOrSetDeviceId();
    const response = await api.get<string[]>('/api/recommendations/recent-searches', {
      params: {
        ...params,
        deviceId,
      },
    });
    return response.data || [];
  },

  // Xóa lịch sử tìm kiếm theo yêu cầu bảo mật cá nhân
  async clearRecentSearches(params?: {
    phone?: string;
    userId?: string;
    deviceId?: string;
  }): Promise<{ status: string; message: string }> {
    const deviceId = params?.deviceId || getOrSetDeviceId();
    const response = await api.delete('/api/recommendations/recent-searches', {
      data: {
        ...params,
        deviceId,
      },
    });
    return response.data;
  },
};
