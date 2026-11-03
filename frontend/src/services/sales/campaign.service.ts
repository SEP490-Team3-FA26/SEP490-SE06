import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface CampaignCostItem {
  type: 'ADS' | 'PRINTING' | 'GIFTS' | 'VOUCHER_DISCOUNT' | 'AGENCY_FEE' | 'OTHER';
  amount: number;
  note?: string;
  date?: string;
}

export interface MarketingCampaignData {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  channel: string;
  budget: number;
  costs: CampaignCostItem[];
  totalCost: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  voucherCodes: string[];
  utmSource?: string;
  targetBranches?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignAnalyticsItem {
  _id: string;
  code: string;
  name: string;
  channel: string;
  budget: number;
  totalCost: number;
  status: string;
  startDate: string;
  endDate: string;
  voucherCodes: string[];
  totalOrders: number;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  roi: number; // %
  roas: number; // Ratio
  uniqueCustomers: number;
  newCustomerOrders: number;
  returningCustomerOrders: number;
  cannibalizationRatio: number; // % khách cũ
}

export interface MarketingRoiOverviewResponse {
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalRevenue: number;
    totalGrossProfit: number;
    totalNetProfit: number;
    averageRoi: number;
    averageRoas: number;
    totalOrders: number;
  };
  campaigns: CampaignAnalyticsItem[];
}

export interface CreateCampaignPayload {
  name: string;
  channel: string;
  budget: number;
  startDate: string;
  endDate: string;
  voucherCodes: string[];
  notes?: string;
  initialCost?: number;
}

export const campaignService = {
  // Lấy danh sách chiến dịch
  async getCampaigns(status?: string): Promise<MarketingCampaignData[]> {
    const response = await api.get(API_ENDPOINTS.MARKETING.CAMPAIGNS, { params: { status } });
    return response.data;
  },

  // Tạo chiến dịch mới
  async createCampaign(payload: CreateCampaignPayload) {
    const costs: CampaignCostItem[] = [];
    if (payload.initialCost && payload.initialCost > 0) {
      costs.push({
        type: 'ADS',
        amount: payload.initialCost,
        note: 'Chi phí ngân sách ban đầu',
        date: new Date().toISOString(),
      });
    }
    const response = await api.post(API_ENDPOINTS.MARKETING.CAMPAIGNS, { ...payload, costs });
    return response.data;
  },

  // Chi tiết chiến dịch
  async getCampaignById(id: string): Promise<MarketingCampaignData> {
    const response = await api.get(API_ENDPOINTS.MARKETING.CAMPAIGN_DETAIL(id));
    return response.data;
  },

  // Hạch toán chi phí phát sinh
  async addCampaignCost(id: string, cost: CampaignCostItem) {
    const response = await api.post(API_ENDPOINTS.MARKETING.CAMPAIGN_COSTS(id), cost);
    return response.data;
  },

  // Phân tích hiệu quả ROI & ROAS toàn chuỗi
  async getRoiOverview(): Promise<MarketingRoiOverviewResponse> {
    const response = await api.get(API_ENDPOINTS.MARKETING.ANALYTICS_OVERVIEW);
    return response.data;
  },
};
