import api from '../core/api';

export interface PaymentReconciliationRecord {
  _id: string;
  orderCode: number;
  branchId: string;
  cashierId?: string;
  expectedAmount: number;
  actualAmount: number;
  differenceAmount: number;
  toleranceApplied: boolean;
  status:
    | 'MATCHED'
    | 'UNDERPAID_TOLERANCE'
    | 'UNDERPAID_BLOCKED'
    | 'OVERPAID_CREDITED'
    | 'MANUAL_OVERRIDE'
    | 'ORPHAN_PAYMENT'
    | 'MANUALLY_RESOLVED';
  bankTransactionId?: string;
  bankCode?: string;
  reconciledAt: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ReconciliationSummary {
  totalRecords: number;
  totalExpected: number;
  totalActual: number;
  difference: number;
  matchRate: number;
  breakdown: {
    matched: number;
    underpaidTolerance: number;
    underpaidBlocked: number;
    overpaidCredited: number;
    manualOverride: number;
    orphan: number;
  };
}

export const reconciliationService = {
  // Lấy danh sách chênh lệch đối soát
  async getDiscrepancies(params?: {
    branchId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/api/orders/reconciliation/discrepancies', { params });
    return response.data;
  },

  // Lấy tổng hợp báo cáo đối soát
  async getSummary(params?: { branchId?: string; startDate?: string; endDate?: string }): Promise<ReconciliationSummary> {
    const response = await api.get('/api/orders/reconciliation/summary', { params });
    return response.data;
  },

  // Dược sĩ xác nhận khẩn cấp có đối soát tại quầy khi mất mạng
  async manualOverride(data: { orderCode: number; bankTransactionId?: string; actualAmount?: number; notes?: string; [key: string]: any }) {
    const response = await api.post('/api/orders/reconciliation/override', data);
    return response.data;
  },

  async manualOverridePayment(data: any) {
    return this.manualOverride(data);
  },

  // Kế toán xử lý giải trình biên bản lệch tiền
  async resolveDiscrepancy(id: string, data: { resolutionNotes: string; refundProcessed?: boolean }) {
    const response = await api.patch(`/api/orders/reconciliation/${id}/resolve`, data);
    return response.data;
  },
};
