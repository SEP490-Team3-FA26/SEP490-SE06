import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export const reportService = {
  getHistory: async (branchId?: string, type?: string) => {
    try {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      if (type) params.type = type;
      
      const res = await api.get(API_ENDPOINTS.REPORTS.HISTORY, { params });
      if (Array.isArray(res.data)) {
        return res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        return res.data.data;
      } else if (res.data) {
        return res.data;
      }
      return [];
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử báo cáo:", error);
      return [];
    }
  },

  getDashboardSummary: async (branchId?: string) => {
    try {
      const params = branchId && branchId !== 'all' ? { branchId } : undefined;
      const res = await api.get(API_ENDPOINTS.REPORTS.SUMMARY, { params });
      return res.data;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu summary dashboard:", error);
      return null;
    }
  },

  getSeasonalAnalysis: async (branchId?: string, year?: string, month?: string) => {
    try {
      const params: Record<string, string> = {};
      if (branchId && branchId !== 'all') params.branchId = branchId;
      if (year && year !== 'all') params.year = year;
      if (month && month !== 'all') params.month = month;
      
      const res = await api.get(API_ENDPOINTS.REPORTS.SEASONAL_ANALYSIS, { params });
      return res.data;
    } catch (error) {
      console.error("Lỗi khi lấy phân tích xu hướng mùa/dịch bệnh:", error);
      return null;
    }
  },

  getAiForecast: async (periodDays: number = 30) => {
    try {
      const res = await api.get(API_ENDPOINTS.REPORTS.AI_FORECAST, { params: { periodDays } });
      return res.data;
    } catch (error) {
      console.error("Lỗi khi lấy AI forecast:", error);
      return null;
    }
  },

  trainAiForecast: async (epochs: number = 60, batchSize: number = 64) => {
    const res = await api.post(API_ENDPOINTS.AI.FORECAST_TRAIN, { epochs, batch_size: batchSize });
    return res.data;
  },

  getProfitAnalytics: async (params: { period?: string; date?: string; branchId?: string }) => {
    const res = await api.get(API_ENDPOINTS.REPORTS.PROFIT, { params });
    return res.data;
  },

  getRevenueAnalytics: async (params: { period?: string; date?: string; branchId?: string }) => {
    const res = await api.get(API_ENDPOINTS.REPORTS.REVENUE_ANALYTICS, { params });
    return res.data;
  },

  getInventoryPerformance: async (params: { branchId?: string; startDate?: string; endDate?: string }) => {
    const res = await api.get(API_ENDPOINTS.REPORTS.INVENTORY_PERFORMANCE, { params });
    return res.data;
  },

  evictSeasonalAnalysis: async (branchId?: string) => {
    try {
      const url = branchId && branchId !== 'all' ? `${API_ENDPOINTS.REPORTS.SEASONAL_ANALYSIS}/evict?branchId=${branchId}` : `${API_ENDPOINTS.REPORTS.SEASONAL_ANALYSIS}/evict`;
      const res = await api.post(url);
      return res.data;
    } catch (error) {
      console.error("Lỗi khi xóa cache phân tích xu hướng:", error);
      return null;
    }
  }
};
