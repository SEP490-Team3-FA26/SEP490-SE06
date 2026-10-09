import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface FeedbackData {
  _id?: string;
  orderId: string;
  orderCode: string;
  branchId: string;
  branchName?: string;
  customerPhone: string;
  customerName?: string;
  customerTier?: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  rating: number;
  tags?: string[];
  comment?: string;
  images?: string[];
  rewardPointsEarned?: number;
  issuedVoucherCode?: string;
  isNegative?: boolean;
  status?: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution?: {
    handledBy?: string;
    handledByName?: string;
    actionTaken?: string;
    notes?: string;
    resolvedAt?: string;
    customerSatisfied?: boolean;
  };
  createdAt?: string;
}

export interface FeedbackSubmissionPayload {
  orderCode: string;
  orderId?: string;
  branchId: string;
  branchName?: string;
  customerPhone: string;
  customerName?: string;
  rating: number;
  tags?: string[];
  comment?: string;
  images?: string[];
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  message: string;
  alreadyReviewed?: boolean;
  rewardPointsEarned?: number;
  rewardMessage?: string;
  customerTier?: string;
  currentPoints?: number;
  voucher?: {
    code: string;
    discountAmount: number;
    minOrderValue: number;
    description: string;
    expiryDays: number;
  };
  feedback?: FeedbackData;
}

export const feedbackService = {
  // Public lookup order from QR code on receipt
  async lookupOrder(orderCode: string) {
    const response = await api.get(API_ENDPOINTS.FEEDBACKS.LOOKUP(orderCode));
    return response.data;
  },

  // Submit feedback (Public or Authenticated)
  async submitFeedback(payload: FeedbackSubmissionPayload): Promise<FeedbackSubmissionResponse> {
    const response = await api.post(API_ENDPOINTS.FEEDBACKS.CREATE, payload);
    return response.data;
  },

  // Branch Manager: Get feedbacks of branch
  async getBranchFeedbacks(branchId: string, params?: { status?: string; rating?: number; page?: number; limit?: number }) {
    const response = await api.get(API_ENDPOINTS.FEEDBACKS.BY_BRANCH(branchId), { params });
    return response.data;
  },

  // Branch Manager: Resolve negative feedback within 24h SLA
  async resolveFeedback(id: string, resolution: { actionTaken?: string; notes: string; customerSatisfied?: boolean }) {
    const response = await api.patch(API_ENDPOINTS.FEEDBACKS.RESOLVE(id), resolution);
    return response.data;
  },

  // Admin / Director: Chain-wide summary
  async getChainSummary() {
    const response = await api.get(API_ENDPOINTS.FEEDBACKS.CHAIN_ANALYTICS);
    return response.data;
  },

  async getFeedbacksByCustomer(phone: string) {
    const response = await api.get(API_ENDPOINTS.FEEDBACKS.BY_CUSTOMER(phone));
    return response.data;
  },
};
