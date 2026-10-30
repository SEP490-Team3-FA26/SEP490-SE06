// ============================================================================
// Hằng Số Cố Định Hệ Thống Sơ Đồ Kho Dược 3D (Constants)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Chuẩn hóa kích thước hình học để 10 thùng/tầng khớp tuyệt đối trong lòng kệ
// ============================================================================

export type WarehouseStatus = 'NORMAL' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED' | 'EMPTY';

export interface ShelfSummary {
  shelf: number;
  totalStock: number;
  status: WarehouseStatus;
  batchCount?: number;
  categories?: string[];
  minExpDate?: string;
}

export interface RackSummary {
  rack: string;
  shelves: ShelfSummary[];
}

export interface ZoneSummary {
  zone: string;
  label?: string;
  racks: RackSummary[];
  icon?: string;
  description?: string;
}

export interface BinItem {
  binNo: number;
  medicineId?: string | null;
  medicineName?: string | null;
  currentStock: number;
  maxCapacity?: number;
  status: WarehouseStatus;
  nearestExpDate?: string | null;
  unit?: string | null;
  hasReserveBatch?: boolean;
}

export interface ShelfBinLayout {
  shelfNo: number;
  bins: BinItem[];
}

export interface WarehouseMap3DProps {
  zones: ZoneSummary[];
  highlightTarget?: string;
  highlightTargets?: Set<string>;
  refreshKey?: number;
  keyboardEnabled?: boolean;
  isModalOpen?: boolean;
  onOpenShelfDetail: (zone: string, rack: string, shelf: number) => void;
  onOpenBinDetail: (zone: string, rack: string, shelf: number, bin: number) => void;
  onOpenReserve?: () => void;
  onSwitchTo2D?: () => void;
}

export const FOV = 38;

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
    label: 'An toàn (Đủ tồn)',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
    border: '#86efac',
  },
  LOW_STOCK: {
    hex: '#eab308',
    num: 0xeab308,
    label: 'Sắp hết hàng',
    badgeBg: '#FEF9C3',
    badgeText: '#A16207',
    border: '#fde047',
  },
  NEAR_EXPIRY: {
    hex: '#f97316',
    num: 0xf97316,
    label: 'Cận date (<90 ngày)',
    badgeBg: '#FFEDD5',
    badgeText: '#C2410C',
    border: '#fdba74',
  },
  EXPIRED: {
    hex: '#ef4444',
    num: 0xef4444,
    label: 'Hết hạn (Cần hủy)',
    badgeBg: '#FEE2E2',
    badgeText: '#B91C1C',
    border: '#fca5a5',
  },
  EMPTY: {
    hex: '#cbd5e1',
    num: 0xcbd5e1,
    label: 'Trống / Hết hàng',
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    border: '#cbd5e1',
  },
};

export interface ZoneMeta {
  code: string;
  name: string;
  categoryDesc: string;
  hex: string;
  num: number;
  center: [number, number];
  size: [number, number];
  racks: string[];
}

export const ZONE_METAS: Record<string, ZoneMeta> = {
  A: {
    code: 'A',
    name: 'Khu A',
    categoryDesc: 'Kháng sinh & Kháng khuẩn',
    hex: '#3b82f6',
    num: 0x3b82f6,
    center: [-21, -12],
    size: [12.5, 13.5],
    racks: ['A1', 'A2', 'A3', 'A4'],
  },
  B: {
    code: 'B',
    name: 'Khu B',
    categoryDesc: 'Hạ sốt, Giảm đau & Hô hấp',
    hex: '#f59e0b',
    num: 0xf59e0b,
    center: [0, -12],
    size: [12.5, 13.5],
    racks: ['B1', 'B2', 'B3', 'B4'],
  },
  C: {
    code: 'C',
    name: 'Khu C',
    categoryDesc: 'Tim mạch, Tiểu đường & Huyết áp',
    hex: '#f43f5e',
    num: 0xf43f5e,
    center: [21, -12],
    size: [12.5, 13.5],
    racks: ['C1', 'C2', 'C3', 'C4'],
  },
  D: {
    code: 'D',
    name: 'Khu D',
    categoryDesc: 'Tiêu hóa, Dạ dày & Gan mật',
    hex: '#22c55e',
    num: 0x22c55e,
    center: [-21, 6],
    size: [12.5, 13.5],
    racks: ['D1', 'D2', 'D3', 'D4'],
  },
  E: {
    code: 'E',
    name: 'Khu E',
    categoryDesc: 'TPCN, Vitamin & Da liễu',
    hex: '#a855f7',
    num: 0xa855f7,
    center: [0, 6],
    size: [12.5, 13.5],
    racks: ['E1', 'E2', 'E3', 'E4'],
  },
  F: {
    code: 'F',
    name: 'Khu F',
    categoryDesc: 'Thần kinh, Cơ xương khớp & TBYT',
    hex: '#64748b',
    num: 0x64748b,
    center: [21, 6],
    size: [12.5, 13.5],
    racks: ['F1', 'F2', 'F3', 'F4'],
  },
  RESERVE: {
    code: 'RESERVE',
    name: 'Khu Dự Trữ',
    categoryDesc: 'Lưu trữ đệm & Lô cận hạn FEFO',
    hex: '#d97706',
    num: 0xd97706,
    center: [0, 20.5],
    size: [42, 11],
    racks: ['RES1', 'RES2', 'RES3', 'RES4'],
  },
};

export const RACK_ORDER = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4',
  'E1', 'E2', 'E3', 'E4',
  'F1', 'F2', 'F3', 'F4',
  'RES1', 'RES2', 'RES3', 'RES4',
];

export const RACK_TO_ZONE: Record<string, string> = {};
Object.entries(ZONE_METAS).forEach(([zoneKey, meta]) => {
  meta.racks.forEach((r) => {
    RACK_TO_ZONE[r] = zoneKey;
  });
});

export interface RackPlacement {
  position: [number, number, number];
  rotationY: number;
}

export const RACK_PLACEMENTS: Record<string, RackPlacement> = {
  A1: { position: [-21, 0, -16.5], rotationY: 0 },
  A2: { position: [-21, 0, -13.5], rotationY: 0 },
  A3: { position: [-21, 0, -10.5], rotationY: 0 },
  A4: { position: [-21, 0, -7.5], rotationY: 0 },

  B1: { position: [0, 0, -16.5], rotationY: 0 },
  B2: { position: [0, 0, -13.5], rotationY: 0 },
  B3: { position: [0, 0, -10.5], rotationY: 0 },
  B4: { position: [0, 0, -7.5], rotationY: 0 },

  C1: { position: [21, 0, -16.5], rotationY: 0 },
  C2: { position: [21, 0, -13.5], rotationY: 0 },
  C3: { position: [21, 0, -10.5], rotationY: 0 },
  C4: { position: [21, 0, -7.5], rotationY: 0 },

  D1: { position: [-21, 0, 1.5], rotationY: 0 },
  D2: { position: [-21, 0, 4.5], rotationY: 0 },
  D3: { position: [-21, 0, 7.5], rotationY: 0 },
  D4: { position: [-21, 0, 10.5], rotationY: 0 },

  E1: { position: [0, 0, 1.5], rotationY: 0 },
  E2: { position: [0, 0, 4.5], rotationY: 0 },
  E3: { position: [0, 0, 7.5], rotationY: 0 },
  E4: { position: [0, 0, 10.5], rotationY: 0 },

  F1: { position: [21, 0, 1.5], rotationY: 0 },
  F2: { position: [21, 0, 4.5], rotationY: 0 },
  F3: { position: [21, 0, 7.5], rotationY: 0 },
  F4: { position: [21, 0, 10.5], rotationY: 0 },

  RES1: { position: [-15, 0, 20.5], rotationY: 0 },
  RES2: { position: [-5, 0, 20.5], rotationY: 0 },
  RES3: { position: [5, 0, 20.5], rotationY: 0 },
  RES4: { position: [15, 0, 20.5], rotationY: 0 },
};

// Kích thước chuẩn: chiều cao 4.30m bao trọn tầng 4 (3.35m + 0.78m thùng + 0.17m khung đỡ)
export const RACK_DIMENSIONS = {
  width: 9.2,
  depth: 1.40,
  height: 4.30,
  levels: 4,
  shelfHeights: [0.35, 1.35, 2.35, 3.35],
  shelfThickness: 0.10,
  shelfDepth: 1.36,
  shelfWidth: 9.04,
  binsPerShelf: 10,
  binWidth: 0.82,
  binDepth: 1.20,
  binSpacing: 0.88,
  uniformBinHeight: 0.78,
};

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
