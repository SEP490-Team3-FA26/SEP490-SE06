// ============================================================================
// Hằng số không gian, Bảng màu GSP/FEFO và Định nghĩa Kiểu cho Sơ Đồ Kho 3D
// Dự án: WDP301 - Quản lý Kho Dược Phẩm Trung Tâm (CENTRAL_WH)
// ============================================================================

export type WarehouseStatus = 'NORMAL' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'EMPTY';

export interface ShelfSummary {
  shelf: number; // 1..4 (1 dưới cùng, 4 trên cùng)
  status: WarehouseStatus;
  totalStock: number;
  batchCount: number;
  categories?: string[];
  minExpDate?: string;
}

export interface RackSummary {
  rack: string; // 'A1'..'A4', ..., 'RES1'..'RES4'
  shelves: ShelfSummary[];
}

export interface ZoneSummary {
  zone: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'RESERVE'
  label: string;
  racks: RackSummary[];
  icon?: string;
  description?: string;
}

export interface BinItem {
  binNo: number; // 1..10 (B1..B10)
  medicineId?: string | null;
  medicineName?: string | null;
  unit?: string | null;
  currentStock: number;
  maxCapacity: number;
  status: WarehouseStatus;
  nearestExpDate?: string | null;
  hasReserveBatch?: boolean;
}

export interface ShelfBinLayout {
  shelfNo: number; // 1..4
  bins: BinItem[];
}

export interface WarehouseMap3DProps {
  zones: ZoneSummary[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
  onBinSelect?: (zone: string, rack: string, shelf: number, bin: number) => void;
  onZoneClick?: (zoneData: any) => void;
  highlightTargets?: Set<string>;
  highlightTarget?: string;
}

// Bảng màu trạng thái chuẩn GSP & FEFO
export const STATUS_COLORS: Record<WarehouseStatus, {
  hex: string;
  num: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  border: string;
}> = {
  NORMAL: {
    hex: '#22c55e',
    num: 0x22c55e,
    label: 'An toàn',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
    border: '#86efac',
  },
  LOW_STOCK: {
    hex: '#eab308',
    num: 0xeab308,
    label: 'Sắp hết',
    badgeBg: '#FEF9C3',
    badgeText: '#A16207',
    border: '#fde047',
  },
  NEAR_EXPIRY: {
    hex: '#f97316',
    num: 0xf97316,
    label: 'Cận date',
    badgeBg: '#FFEDD5',
    badgeText: '#C2410C',
    border: '#fdba74',
  },
  EXPIRED: {
    hex: '#ef4444',
    num: 0xef4444,
    label: 'Hết hạn',
    badgeBg: '#FEE2E2',
    badgeText: '#B91C1C',
    border: '#fca5a5',
  },
  EMPTY: {
    hex: '#94a3b8',
    num: 0x94a3b8,
    label: 'Trống',
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    border: '#cbd5e1',
  },
};

// Bảng thông số định danh 7 Phân khu (6 Khu Chính + 1 Khu Dự Trữ)
export interface ZoneMeta {
  code: string;
  name: string;
  categoryDesc: string;
  hex: string;
  num: number;
  center: [number, number]; // [X, Z]
  size: [number, number];   // [Width X, Depth Z]
  racks: string[];
}

export const ZONE_METAS: Record<string, ZoneMeta> = {
  A: {
    code: 'A',
    name: 'Khu A',
    categoryDesc: 'Kháng sinh & Kháng virus',
    hex: '#3b82f6',
    num: 0x3b82f6,
    center: [-25, -12],
    size: [14, 11],
    racks: ['A1', 'A2', 'A3', 'A4'],
  },
  B: {
    code: 'B',
    name: 'Khu B',
    categoryDesc: 'Hạ sốt, Giảm đau & Hô hấp',
    hex: '#f59e0b',
    num: 0xf59e0b,
    center: [3, -12],
    size: [14, 11],
    racks: ['B1', 'B2', 'B3', 'B4'],
  },
  C: {
    code: 'C',
    name: 'Khu C',
    categoryDesc: 'Tim mạch & Huyết áp',
    hex: '#f43f5e',
    num: 0xf43f5e,
    center: [-25, 0],
    size: [14, 11],
    racks: ['C1', 'C2', 'C3', 'C4'],
  },
  D: {
    code: 'D',
    name: 'Khu D',
    categoryDesc: 'Tiêu hóa & Gan mật',
    hex: '#22c55e',
    num: 0x22c55e,
    center: [3, 0],
    size: [14, 11],
    racks: ['D1', 'D2', 'D3', 'D4'],
  },
  E: {
    code: 'E',
    name: 'Khu E',
    categoryDesc: 'TPCN, Da liễu & Nội tiết',
    hex: '#a855f7',
    num: 0xa855f7,
    center: [-25, 12],
    size: [14, 11],
    racks: ['E1', 'E2', 'E3', 'E4'],
  },
  F: {
    code: 'F',
    name: 'Khu F',
    categoryDesc: 'Tiểu đường, Thần kinh & TBYT',
    hex: '#64748b',
    num: 0x64748b,
    center: [3, 12],
    size: [14, 11],
    racks: ['F1', 'F2', 'F3', 'F4'],
  },
  RESERVE: {
    code: 'RESERVE',
    name: 'Khu Dự Trữ',
    categoryDesc: 'Lưu trữ đệm & Lô cận hạn FEFO',
    hex: '#d97706',
    num: 0xd97706,
    center: [30, 0],
    size: [16, 26],
    racks: ['RES1', 'RES2', 'RES3', 'RES4'],
  },
};

// Tọa độ chi tiết của 28 dãy kệ trong không gian 3D
export interface RackPlacement {
  zone: string;
  rack: string;
  position: [number, number, number]; // [X, Y, Z]
  rotationY: number;
}

export function computeRackPlacements(): Record<string, RackPlacement> {
  const placements: Record<string, RackPlacement> = {};

  // 6 Khu thông thường (A..F): 4 dãy kệ xếp song song theo trục Z
  // Khoảng cách giữa các kệ trong khu là 2.5m
  const normalZones = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const zoneKey of normalZones) {
    const meta = ZONE_METAS[zoneKey];
    const [cx, cz] = meta.center;
    const zOffsets = [-3.75, -1.25, 1.25, 3.75]; // 4 kệ cách đều
    meta.racks.forEach((rackName, idx) => {
      placements[rackName] = {
        zone: zoneKey,
        rack: rackName,
        position: [cx, 0, cz + zOffsets[idx]],
        rotationY: 0,
      };
    });
  }

  // Khu Dự Trữ (RESERVE): 4 kệ RES1..RES4 xếp dọc theo chiều sâu kho
  const reserveMeta = ZONE_METAS.RESERVE;
  const [rcx, rcz] = reserveMeta.center;
  const resZOffsets = [-9.0, -3.0, 3.0, 9.0];
  reserveMeta.racks.forEach((resRack, idx) => {
    placements[resRack] = {
      zone: 'RESERVE',
      rack: resRack,
      position: [rcx, 0, rcz + resZOffsets[idx]],
      rotationY: 0,
    };
  });

  return placements;
}

export const RACK_PLACEMENTS = computeRackPlacements();

// Thông số hình học chuẩn cho Dãy Kệ
export const RACK_DIMENSIONS = {
  width: 9.2,   // Dài theo trục X (m)
  depth: 1.6,   // Sâu theo trục Z (m)
  height: 4.6,  // Cao theo trục Y (m)
  shelfHeights: [0.45, 1.45, 2.45, 3.45], // Tầng 1 -> Tầng 4
  shelfThickness: 0.12,
  shelfDepth: 1.45,
  shelfWidth: 9.0,
  binsPerShelf: 10,
  maxBinHeight: 0.65,
};

// Thông số Cửa Kho
export const DOCKS_CONFIG = {
  inbound: {
    code: 'INBOUND',
    title: 'CỬA NHẬP HÀNG (Inbound Docks)',
    subtitle: 'Khu Tiếp Nhận & Kiểm Đếm GSP',
    hex: '#10b981',
    num: 0x10b981,
    position: [-20, 0, -26] as [number, number, number],
    size: [32, 2.8, 6] as [number, number, number],
  },
  outbound: {
    code: 'OUTBOUND',
    title: 'CỬA XUẤT HÀNG (Outbound Docks)',
    subtitle: 'Khu Soạn Đơn & Đóng Gói FEFO/FIFO',
    hex: '#0284c7',
    num: 0x0284c7,
    position: [20, 0, 26] as [number, number, number],
    size: [32, 2.8, 6] as [number, number, number],
  },
};

// Parser phân tích mã mục tiêu tìm kiếm
export interface ParsedTargetId {
  kind: 'shelf' | 'bin';
  zone: string;
  rack: string;
  shelf: number;
  binNo?: number;
  rawId: string;
}

export function parseWarehouseTargetId(id: string | null | undefined): ParsedTargetId | null {
  if (!id) return null;
  const trimmed = id.trim();

  // Định dạng cấp thùng: bin-${zone}-${rack}-${shelf}-${binNo} (ví dụ: "bin-A-A1-4-1" hoặc "bin-RESERVE-RES1-2-5")
  if (trimmed.startsWith('bin-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 5) {
      const binNo = Number(parts[parts.length - 1]);
      const shelf = Number(parts[parts.length - 2]);
      const rack = parts[parts.length - 3];
      const zone = parts.slice(1, parts.length - 3).join('-');
      if (!Number.isNaN(shelf) && !Number.isNaN(binNo)) {
        return { kind: 'bin', zone, rack, shelf, binNo, rawId: trimmed };
      }
    }
  }

  // Định dạng cấp tầng: ${zone}-${rack}-${shelf} (ví dụ: "A-A1-4" hoặc "RESERVE-RES1-2")
  const parts = trimmed.split('-');
  if (parts.length >= 3) {
    const shelf = Number(parts[parts.length - 1]);
    const rack = parts[parts.length - 2];
    const zone = parts.slice(0, parts.length - 2).join('-');
    if (!Number.isNaN(shelf)) {
      return { kind: 'shelf', zone, rack, shelf, rawId: trimmed };
    }
  }

  return null;
}
