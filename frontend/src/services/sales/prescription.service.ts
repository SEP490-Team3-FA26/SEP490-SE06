import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface ScannedCartItem {
  medicineId: string;
  name: string;
  active_ingredient: string;
  price: number;
  quantity: number;
  dosage: string;
  unit: string;
  stock: number;
  batchNo: string;
  expiry: string | null;
  status: 'In Stock' | 'Out of Stock';
}

export interface ProcessedScanResult {
  success: boolean;
  message?: string;
  patient: {
    name: string;
    age: string;
    gender: string;
  };
  doctor: {
    name: string;
    hospital: string;
  };
  newCartItems?: ScannedCartItem[];
  updatedCartItems: any[];
  count?: number;
}

export const prescriptionService = {
  async getPrescriptions() {
    try {
      const response = await api.get(API_ENDPOINTS.PRESCRIPTIONS.LIST);
      return Array.isArray(response?.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async getPrescriptionByCode(code: string) {
    const response = await api.get(API_ENDPOINTS.PRESCRIPTIONS.DETAIL(code));
    return response.data;
  },

  async recommendPrescription(formData: FormData) {
    const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.VOICE_CONSULT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async scanPrescriptionAI(formData: FormData) {
    const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.SCAN_OCR, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Package prescription image files and call AI scanning API
   */
  async scanPrescriptionFiles(files: File[], branchId: string = 'CENTRAL_WH') {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('branch_id', branchId);
    return this.scanPrescriptionAI(formData);
  },

  /**
   * Convert extracted items from AI Scan into POS cart items
   */
  extractCartItemsFromAIScan(aiScanResult: any): ScannedCartItem[] {
    if (!aiScanResult?.items || !Array.isArray(aiScanResult.items)) {
      return [];
    }

    const items: ScannedCartItem[] = [];
    aiScanResult.items.forEach((item: any) => {
      const sku = item.selected_sku;
      const fefo = item.fefo_batch;
      const ext = item.extracted || {};

      if (sku) {
        items.push({
          medicineId: sku.product_id,
          name: sku.product_name,
          active_ingredient: sku.active_ingredient || ext.generic_name || '',
          price: sku.retail_price || 0,
          quantity: ext.quantity || 1,
          dosage: ext.usage_instruction || 'Ngày uống 2 lần, mỗi lần 1 viên sau ăn.',
          unit: sku.unit || ext.unit || 'Viên',
          stock: sku.stock || 0,
          batchNo: fefo ? fefo.batch_no : 'DEFAULT',
          expiry: fefo ? fefo.exp_date : null,
          status: sku.stock > 0 ? 'In Stock' : 'Out of Stock',
        });
      }
    });

    return items;
  },

  /**
   * Match and update cart items according to prescription quantities without cumulative stacking
   */
  mergePrescriptionItems(currentItems: any[], incomingItems: ScannedCartItem[]): any[] {
    const merged = [...currentItems];
    incomingItems.forEach(newItem => {
      const idx = merged.findIndex(it => it.medicineId === newItem.medicineId);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...newItem, quantity: newItem.quantity };
      } else {
        merged.push(newItem);
      }
    });
    return merged;
  },

  /**
   * Process prescription scan results: extract patient/doctor info and update cart
   */
  processAIScanResult(aiScanResult: any, currentCartItems: any[] = []): ProcessedScanResult {
    if (!aiScanResult) {
      return {
        success: false,
        message: 'Không tìm thấy dữ liệu đơn thuốc sau quét!',
        patient: { name: '', age: '', gender: '' },
        doctor: { name: '', hospital: '' },
        updatedCartItems: currentCartItems,
      };
    }

    const patient = {
      name: aiScanResult.patient?.name || '',
      age: aiScanResult.patient?.age ? String(aiScanResult.patient.age) : '',
      gender: aiScanResult.patient?.gender || '',
    };

    const doctor = {
      name: aiScanResult.doctor?.name || '',
      hospital: aiScanResult.doctor?.hospital || '',
    };

    const newCartItems = this.extractCartItemsFromAIScan(aiScanResult);
    if (newCartItems.length === 0) {
      return {
        success: false,
        message: 'Không có sản phẩm nào khớp trong kho để thêm vào giỏ hàng POS!',
        patient,
        doctor,
        newCartItems: [],
        updatedCartItems: currentCartItems,
        count: 0,
      };
    }

    const updatedCartItems = this.mergePrescriptionItems(currentCartItems, newCartItems);

    return {
      success: true,
      patient,
      doctor,
      newCartItems,
      updatedCartItems,
      count: newCartItems.length,
    };
  },

  async textConsult(symptoms: string, branchId?: string) {
    const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.SYMPTOM_CONSULT, {
      symptoms,
      branch_id: branchId,
    });
    return response.data;
  },

  async chatConsult(payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    age_group?: string;
    gender?: string;
    allergies?: string[];
  }) {
    const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.CHAT, payload);
    return response.data;
  },

  async getChatSessions() {
    try {
      const response = await api.get(API_ENDPOINTS.PRESCRIPTIONS.CHAT_SESSIONS);
      return response.data;
    } catch {
      return { success: false, sessions: [] };
    }
  },

  async saveChatSession(session: any) {
    try {
      const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.CHAT_SESSIONS, session);
      return response.data;
    } catch {
      return { success: false };
    }
  },

  async deleteChatSession(sessionId: string) {
    try {
      const response = await api.delete(API_ENDPOINTS.PRESCRIPTIONS.CHAT_SESSION_DELETE(sessionId));
      return response.data;
    } catch {
      return { success: false };
    }
  },
};

