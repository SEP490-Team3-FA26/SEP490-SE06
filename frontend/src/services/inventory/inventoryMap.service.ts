import api from '../core/api';

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

export interface ShelfSummary {
  shelf: number;
  status: 'NORMAL' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'EMPTY';
  totalStock: number;
  batchCount: number;
  categories?: string[];
  minExpDate?: string;
}

export interface RackSummary {
  rack: string;
  shelves: ShelfSummary[];
}

export interface ZoneSummary {
  zone: string;
  label: string;
  racks: RackSummary[];
  icon?: string;
  description?: string;
}

export interface WarehouseMapResponse {
  zones: ZoneSummary[];
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
  getWarehouseMap: async (): Promise<WarehouseMapResponse> => {
    const response = await api.get('/api/medicines/warehouse-map');
    return response.data;
  },

  /** Cũ — lấy chi tiết theo Tầng (backward compat) */
  getShelfDetail: async (zone: string, rack: string, shelf: number) => {
    const response = await api.get(`/api/medicines/shelf-detail?zone=${zone}&rack=${rack}&shelf=${shelf}`);
    return response.data;
  },

  /** MỚI — Lấy layout kệ: 4 Tầng × 10 Thùng với thông tin thuốc và tồn kho */
  getShelfLayout: async (zone: string, rack: string): Promise<ShelfLayout[]> => {
    const response = await api.get('/api/medicines/shelf-layout', { params: { zone, rack } });
    return response.data;
  },

  /** MỚI — Lấy danh sách lô Khu Dự Trữ (slotType = RESERVE), sắp xếp FEFO */
  getReserveBatches: async (branchId = 'CENTRAL_WH'): Promise<ReserveBatch[]> => {
    const response = await api.get('/api/medicines/reserve-batches', { params: { branchId } });
    return response.data;
  },

  /** MỚI — Chi tiết thùng: lô MAIN + lô RESERVE của thuốc đó */
  getBinDetail: async (zone: string, rack: string, shelf: number, bin: number) => {
    const response = await api.get('/api/medicines/bin-detail', { params: { zone, rack, shelf, bin } });
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
    const response = await api.post('/api/medicines/assign-location', dto);
    return response.data;
  },

  /** MỚI — Khóa lô thuốc (QUARANTINED) */
  quarantineBatch: async (batchId: string, reason?: string) => {
    const response = await api.patch(`/api/medicines/batches/${batchId}/quarantine`, { reason });
    return response.data;
  },

  warehouseSearch: async (q: string) => {
    const response = await api.get(`/api/medicines/warehouse-search?q=${encodeURIComponent(q)}`);
    return response.data;
  },

  syncLocations: async () => {
    const response = await api.post('/api/medicines/sync-locations');
    return response.data;
  },

  /** MỚI — Chuyển ô / Dồn kho thuốc giữa các thùng */
  relocateBin: async (dto: {
    fromLocation: { zone: string; rack: string; shelf: number; bin: number };
    toLocation: { zone: string; rack: string; shelf: number; bin: number };
    batchId?: string;
    reason?: string;
  }) => {
    const response = await api.post('/api/medicines/relocate-bin', dto);
    return response.data;
  }
};
