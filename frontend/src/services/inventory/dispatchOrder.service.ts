import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

/**
 * Dữ liệu dòng gợi ý nhặt hàng theo FEFO trên Phiếu Xuất Kho Tổng
 */
export interface DispatchPickingLine {
  lineId: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  medicineBarcode?: string;
  specialControlType?: number;
  batchId: string;
  batchNo: string;
  expDate: string;
  suggestedLocation: {
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
    slotType?: string;
    binCode: string;
  };
  requestedQty: number;
  pickedQty: number;
  itemStatus: 'PENDING' | 'PICKED' | 'SHORTAGE';
  shortageReason?: string;
}

export interface DispatchOrder {
  _id: string;
  dispatchCode: string;
  type: 'TRANSFER' | 'DISPOSE';
  status:
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'PICKING'
    | 'STAGED'
    | 'DISPATCHED'
    | 'PARTIALLY_DISPATCHED'
    | 'CANCELLED';
  fromBranchId: string;
  referenceId?: string;
  referenceCode?: string;
  toBranchId?: string;
  toBranchName?: string;
  disposalReportCode?: string;
  stockTransferId?: string;
  stockTransferCode?: string;
  hasControlledDrugs: boolean;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  pickingList: DispatchPickingLine[];
  picks: any[];
  returnLogs: any[];
  toteCode?: string;
  toteCodes: string[];
  totalPicked: number;
  isStale: boolean;
  lastActivityAt?: string;
  handoverRecipient?: {
    driverName: string;
    vehiclePlate?: string;
    carrierNote?: string;
  };
  version: number;
  createdAt?: string;
}

export interface ToteItem {
  _id: string;
  toteCode: string;
  label?: string;
  status: 'AVAILABLE' | 'IN_USE';
  currentDispatchOrderId?: string | null;
  currentDispatchCode?: string | null;
}

const createIdempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Tầng Service (Tier 1) giao tiếp API Gateway cho Luồng Xuất Kho Tổng (Web React)
 */
export const dispatchOrderService = {
  async listOrders(params?: {
    status?: string;
    type?: string;
    isStale?: boolean;
    search?: string;
  }): Promise<DispatchOrder[]> {
    const response = await api.get(API_ENDPOINTS.DISPATCH_ORDERS.LIST, { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  },

  async getById(id: string): Promise<DispatchOrder> {
    const response = await api.get(API_ENDPOINTS.DISPATCH_ORDERS.DETAIL(id));
    return response.data?.data || response.data;
  },

  async createOrder(payload: {
    type: 'TRANSFER' | 'DISPOSE';
    referenceId?: string;
    toBranchId?: string;
    toBranchName?: string;
    disposalReportCode?: string;
    items?: Array<{ medicineId: string; quantity: number; batchId?: string; batchNo?: string }>;
    notes?: string;
  }) {
    const response = await api.post(API_ENDPOINTS.DISPATCH_ORDERS.CREATE, payload);
    return response.data;
  },

  /**
   * Tạo phiếu xuất kho đồng bộ để nhận ngay kết quả kiểm tra tồn khả dụng tại Kho Tổng hoặc mã phiếu vừa lập
   */
  async createOrderSync(payload: {
    type: 'TRANSFER' | 'DISPOSE';
    referenceId?: string;
    toBranchId?: string;
    toBranchName?: string;
    disposalReportCode?: string;
    items?: Array<{ medicineId: string; quantity: number; batchId?: string; batchNo?: string }>;
    notes?: string;
  }) {
    const response = await api.post(API_ENDPOINTS.DISPATCH_ORDERS.CREATE_SYNC, payload);
    return response.data;
  },

  async approveOrder(id: string, note?: string) {
    const response = await api.post(API_ENDPOINTS.DISPATCH_ORDERS.APPROVE(id), { note: note || '' });
    return response.data;
  },

  async rejectOrder(id: string, reason: string) {
    const response = await api.post(API_ENDPOINTS.DISPATCH_ORDERS.REJECT(id), { reason });
    return response.data;
  },

  async cancelOrder(id: string, reason?: string) {
    const response = await api.post(API_ENDPOINTS.DISPATCH_ORDERS.CANCEL(id), { reason: reason || '' });
    return response.data;
  },

  async confirmDispatch(
    id: string,
    handoverRecipient: { driverName: string; vehiclePlate?: string; carrierNote?: string },
  ) {
    const key = createIdempotencyKey('web-disp');
    const response = await api.post(
      API_ENDPOINTS.DISPATCH_ORDERS.DISPATCH(id),
      { handoverRecipient, idempotencyKey: key },
      { headers: { 'X-Idempotency-Key': key } },
    );
    return response.data;
  },

  async listTotes(): Promise<ToteItem[]> {
    const response = await api.get(API_ENDPOINTS.TOTES.LIST);
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  },
};
