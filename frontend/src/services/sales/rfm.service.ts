import api from '../core/api';

export interface CustomerRFMSegment {
  _id?: string;
  phone: string;
  fullName?: string;
  primaryBranchId?: string;
  customerType: 'CHRONIC_PATIENT' | 'GENERAL_RETAIL';
  lastOrderDate?: string;
  recencyDays: number;
  totalOrders12M: number;
  totalSpent12M: number;
  avgOrderValue: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmScoreStr: string;
  segment: 'CHAMPIONS' | 'LOYAL_CHRONIC' | 'POTENTIAL_LOYALIST' | 'AT_RISK' | 'HIBERNATING';
  predictedRefillDate?: string;
  recommendedVoucher?: string;
  lastEvaluatedAt?: string;
}

export interface RFMOverview {
  totalCustomers: number;
  segments: Record<string, { count: number; totalRevenue: number; avgSpent: number }>;
}

export const rfmService = {
  // POS: Tra cứu phân khúc khách hàng theo SĐT (cache 24h)
  async getCustomerSegment(phone: string): Promise<CustomerRFMSegment> {
    const response = await api.get(`/api/users/rfm/customer/${encodeURIComponent(phone)}`);
    return response.data;
  },

  // Admin/Director: Lấy ma trận tổng quan RFM
  async getOverview(branchId?: string): Promise<RFMOverview> {
    const response = await api.get('/api/users/rfm/overview', { params: { branchId } });
    return response.data;
  },

  // Admin: Kích hoạt tính toán lại RFM
  async triggerRecalculate() {
    const response = await api.post('/api/users/rfm/recalculate');
    return response.data;
  },

  // CSKH: Danh sách khách hàng có nguy cơ rời bỏ cần chăm sóc
  async getAtRiskCustomers(params?: { branchId?: string; limit?: number }) {
    const response = await api.get('/api/users/rfm/at-risk', { params });
    return response.data;
  },
};
