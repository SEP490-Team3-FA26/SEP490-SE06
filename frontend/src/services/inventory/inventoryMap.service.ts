import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

// ============================================================
// Types
// ============================================================
export interface BinData {
  binNo: number;
  medicineId: string | null;
  medicineName: string | null;
  unit: string | null;
  currentStock: number;
  maxCapacity: number;
  status: 'NORMAL' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'EMPTY';
  nearestExpDate: string | null;
  hasReserveBatch: boolean;
}

export interface ShelfLayout {
  shelfNo: number; // 4 (top) → 1 (bottom)
  bins: BinData[];
}

export interface ReserveBatch {
  _id: string;
  medicineId: string;
  medicineName: string;
  batchNo: string;
  expDate: string;
  stock: number;
  unit: string;
  status: 'NORMAL' | 'NEAR_EXPIRY' | 'EXPIRED';
  daysToExpiry: number | null;
  location: { zone: string; rack: string; shelf: number; bin: number; slotType: string };
}

export interface BinLocation {
  zone: string;
  rack: string;
  shelf: number;
  bin: number;
  slotType: 'MAIN' | 'RESERVE';
}

export interface BinDetailResponse {
  location?: {
    medicineId: string;
    medicineName: string;
    unit: string;
    maxCapacity: number;
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
  };
  medicine?: {
    name: string;
    unit: string;
    barcode?: string;
  };
  mainBatches: any[];
  reserveBatches: any[];
  totalMainStock: number;
  maxCapacity: number;
}

// ============================================================
// Service
// ============================================================
export const inventoryMapService = {
  /** Lấy toàn bộ sơ đồ kho (danh sách zone + rack) */
  getWarehouseMap: async () => {
    const response = await api.get(API_ENDPOINTS.MEDICINES.WAREHOUSE_MAP);
    return response.data;
  },

  /** Cũ — lấy chi tiết theo Tầng (backward compat) */
  getShelfDetail: async (zone: string, rack: string, shelf: number) => {
    const response = await api.get(API_ENDPOINTS.MEDICINES.SHELF_DETAIL, { params: { zone, rack, shelf } });
    return response.data;
  },

  /** MỚI — Lấy layout kệ: 4 Tầng × 10 Thùng với thông tin thuốc và tồn kho */
  getShelfLayout: async (zone: string, rack: string): Promise<ShelfLayout[]> => {
    const response = await api.get(`${API_ENDPOINTS.MEDICINES.LIST}/shelf-layout`, { params: { zone, rack } });
    return response.data;
  },

  /** MỚI — Lấy danh sách lô Khu Dự Trữ (slotType = RESERVE), sắp xếp FEFO */
  getReserveBatches: async (branchId = 'CENTRAL_WH'): Promise<ReserveBatch[]> => {
    const response = await api.get(`${API_ENDPOINTS.MEDICINES.LIST}/reserve-batches`, { params: { branchId } });
    return response.data;
  },

  /** MỚI — Chi tiết thùng: lô MAIN + lô RESERVE của thuốc đó */
  getBinDetail: async (zone: string, rack: string, shelf: number, bin: number) => {
    const response = await api.get(`${API_ENDPOINTS.MEDICINES.LIST}/bin-detail`, { params: { zone, rack, shelf, bin } });
    return response.data;
  },

  /** MỚI — Gán thuốc vào vị trí thùng cố định (async) */
  assignMedicineLocation: async (dto: {
    medicineId: string;
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
    maxCapacity?: number;
  }) => {
    const response = await api.post(API_ENDPOINTS.MEDICINES.ASSIGN_LOCATION, dto);
    return response.data;
  },

  /** MỚI — Khóa lô thuốc (QUARANTINED) */
  quarantineBatch: async (batchId: string, reason?: string) => {
    const response = await api.patch(`${API_ENDPOINTS.MEDICINES.LIST}/batches/${encodeURIComponent(batchId)}/quarantine`, { reason });
    return response.data;
  },

  warehouseSearch: async (q: string) => {
    const response = await api.get(API_ENDPOINTS.MEDICINES.WAREHOUSE_SEARCH, { params: { q: q.trim() } });
    return response.data;
  },

  syncLocations: async () => {
    const response = await api.post(API_ENDPOINTS.MEDICINES.SYNC_STOCK);
    return response.data;
  }
};
