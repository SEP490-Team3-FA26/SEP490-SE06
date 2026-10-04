import api from '../core/api';

export interface RfqItem {
  medicineId: string;
  medicineName: string;
  sku?: string;
  unit: string;
  quantityRequested: number;
  targetPrice?: number;
  notes?: string;
}

export interface RfqTargetSupplier {
  supplierId: string;
  supplierName: string;
  email: string;
  phone?: string;
  status: 'INVITED' | 'SUBMITTED' | 'DECLINED';
  sentAt?: string;
}

export interface SupplierQuotationItem {
  medicineId: string;
  medicineName: string;
  quotedPrice: number;
  discountPercent?: number;
  offeredShelfLifeMonths: number;
  isCompliantShelfLife: boolean;
  availableQuantity: number;
  batchNo?: string;
  notes?: string;
}

export interface SupplierQuotation {
  quotationId: string;
  supplierId: string;
  supplierName: string;
  submittedAt: string;
  paymentTermsDays: number;
  deliveryDays: number;
  items: SupplierQuotationItem[];
  totalAmount: number;
  notes?: string;
  isSelected?: boolean;
  selectedReason?: string;
}

export interface RequestForQuotationData {
  _id?: string;
  id?: string;
  rfqCode: string;
  title: string;
  status: 'DRAFT' | 'SENT' | 'IN_REVIEW' | 'AWARDED' | 'CANCELLED';
  deadline: string;
  minShelfLifeMonths: number;
  requiredPaymentTermDays: number;
  items: RfqItem[];
  targetSuppliers: RfqTargetSupplier[];
  quotations: SupplierQuotation[];
  awardedSupplierId?: string;
  awardedPoId?: string;
  branchId?: string;
  createdBy?: string;
  createdByName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRfqPayload {
  title: string;
  deadline: string;
  minShelfLifeMonths: number;
  requiredPaymentTermDays: number;
  items: RfqItem[];
  targetSuppliers: { supplierId: string; supplierName: string; email: string; phone?: string }[];
  notes?: string;
}

export interface SubmitQuotePayload {
  supplierId: string;
  supplierName: string;
  paymentTermsDays: number;
  deliveryDays: number;
  items: {
    medicineId: string;
    medicineName: string;
    quotedPrice: number;
    discountPercent?: number;
    offeredShelfLifeMonths: number;
    availableQuantity: number;
    batchNo?: string;
    notes?: string;
  }[];
  totalAmount: number;
  notes?: string;
}

export const rfqService = {
  // Lấy danh sách RFQ
  async getRfqs(params?: { status?: string; branchId?: string }): Promise<RequestForQuotationData[]> {
    const response = await api.get('/api/rfqs', { params });
    return response.data;
  },

  // Chi tiết RFQ và ma trận báo giá
  async getRfqById(id: string): Promise<RequestForQuotationData> {
    const response = await api.get(`/api/rfqs/${id}`);
    return response.data;
  },

  // Tạo RFQ mới
  async createRfq(payload: CreateRfqPayload) {
    const response = await api.post('/api/rfqs', payload);
    return response.data;
  },

  // Gửi RFQ đồng loạt qua email/portal đến các NCC
  async sendRfq(id: string) {
    const response = await api.post(`/api/rfqs/${id}/send`);
    return response.data;
  },

  // Nhập bảng chào giá của NCC
  async submitQuotation(id: string, payload: SubmitQuotePayload) {
    const response = await api.post(`/api/rfqs/${id}/quotations`, payload);
    return response.data;
  },

  // Chọn thầu và tự động sinh PO
  async awardRfq(id: string, awardPayload: { quotationId: string; supplierId: string; reason?: string }) {
    const response = await api.post(`/api/rfqs/${id}/award`, awardPayload);
    return response.data;
  },
};
