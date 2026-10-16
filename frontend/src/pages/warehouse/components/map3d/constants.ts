// ============================================================================
// Hằng số không gian, Bảng màu GSP/FEFO và Định nghĩa Kiểu cho Sơ Đồ Kho 3D
// Dự án: WDP301 - Quản lý Kho Dược Phẩm Trung Tâm (CENTRAL_WH)
// Camera cố định: OVERVIEW (~65°) và RACK (chính diện ~4°)
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

// Contract mới cho WarehouseMap3D: tách biệt rõ chọn xem vs mở modal
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

// FOV chuẩn cho phối cảnh 3D kho
export const FOV = 40;

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
    hex: '#94a3b8',
    num: 0x94a3b8,
    label: 'Trống / Hết hàng',
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    border: '#cbd5e1',
  },
};

// Bảng thông số định danh 7 Phân khu (6 Khu Chính + 1 Khu Dự Trữ FEFO)
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
    size: [40, 11], // Mở rộng lên 40m để chứa đủ 4 dãy kệ không chồng lấn
    racks: ['RES1', 'RES2', 'RES3', 'RES4'],
  },
};

// Thứ tự 28 dãy kệ duyệt tuần tự theo vòng tròn
export const RACK_ORDER = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4',
  'E1', 'E2', 'E3', 'E4',
  'F1', 'F2', 'F3', 'F4',
  'RES1', 'RES2', 'RES3', 'RES4',
];

// Ánh xạ từ mã kệ sang mã khu vực tương ứng
export const RACK_TO_ZONE: Record<string, string> = Object.fromEntries(
  Object.entries(ZONE_METAS).flatMap(([zoneCode, meta]) => meta.racks.map((r) => [r, zoneCode]))
);

// Tọa độ chi tiết của 28 dãy kệ trong không gian 3D
export interface RackPlacement {
  zone: string;
  rack: string;
  position: [number, number, number]; // [X, Y, Z]
  rotationY: number;
}

export function computeRackPlacements(): Record<string, RackPlacement> {
  const placements: Record<string, RackPlacement> = {
    // Khu A: Tây Bắc
    A1: { zone: 'A', rack: 'A1', position: [-21, 0, -16.2], rotationY: 0 },
    A2: { zone: 'A', rack: 'A2', position: [-21, 0, -13.4], rotationY: 0 },
    A3: { zone: 'A', rack: 'A3', position: [-21, 0, -10.6], rotationY: 0 },
    A4: { zone: 'A', rack: 'A4', position: [-21, 0, -7.8], rotationY: 0 },

    // Khu B: Bắc Trung Tâm
    B1: { zone: 'B', rack: 'B1', position: [0, 0, -16.2], rotationY: 0 },
    B2: { zone: 'B', rack: 'B2', position: [0, 0, -13.4], rotationY: 0 },
    B3: { zone: 'B', rack: 'B3', position: [0, 0, -10.6], rotationY: 0 },
    B4: { zone: 'B', rack: 'B4', position: [0, 0, -7.8], rotationY: 0 },

    // Khu C: Đông Bắc
    C1: { zone: 'C', rack: 'C1', position: [21, 0, -16.2], rotationY: 0 },
    C2: { zone: 'C', rack: 'C2', position: [21, 0, -13.4], rotationY: 0 },
    C3: { zone: 'C', rack: 'C3', position: [21, 0, -10.6], rotationY: 0 },
    C4: { zone: 'C', rack: 'C4', position: [21, 0, -7.8], rotationY: 0 },

    // Khu D: Tây Nam
    D1: { zone: 'D', rack: 'D1', position: [-21, 0, 1.8], rotationY: 0 },
    D2: { zone: 'D', rack: 'D2', position: [-21, 0, 4.6], rotationY: 0 },
    D3: { zone: 'D', rack: 'D3', position: [-21, 0, 7.4], rotationY: 0 },
    D4: { zone: 'D', rack: 'D4', position: [-21, 0, 10.2], rotationY: 0 },

    // Khu E: Nam Trung Tâm
    E1: { zone: 'E', rack: 'E1', position: [0, 0, 1.8], rotationY: 0 },
    E2: { zone: 'E', rack: 'E2', position: [0, 0, 4.6], rotationY: 0 },
    E3: { zone: 'E', rack: 'E3', position: [0, 0, 7.4], rotationY: 0 },
    E4: { zone: 'E', rack: 'E4', position: [0, 0, 10.2], rotationY: 0 },

    // Khu F: Đông Nam
    F1: { zone: 'F', rack: 'F1', position: [21, 0, 1.8], rotationY: 0 },
    F2: { zone: 'F', rack: 'F2', position: [21, 0, 4.6], rotationY: 0 },
    F3: { zone: 'F', rack: 'F3', position: [21, 0, 7.4], rotationY: 0 },
    F4: { zone: 'F', rack: 'F4', position: [21, 0, 10.2], rotationY: 0 },

    // Khu RESERVE: Chạy ngang ở phía Nam (x = -14.4, -4.8, 4.8, 14.4; spacing 9.6m tránh va chạm)
    RES1: { zone: 'RESERVE', rack: 'RES1', position: [-14.4, 0, 18.5], rotationY: 0 },
    RES2: { zone: 'RESERVE', rack: 'RES2', position: [-4.8, 0, 18.5], rotationY: 0 },
    RES3: { zone: 'RESERVE', rack: 'RES3', position: [4.8, 0, 18.5], rotationY: 0 },
    RES4: { zone: 'RESERVE', rack: 'RES4', position: [14.4, 0, 18.5], rotationY: 0 },
  };

  return placements;
}

export const RACK_PLACEMENTS = computeRackPlacements();

// Thông số hình học chuẩn cho Dãy Kệ
export const RACK_DIMENSIONS = {
  width: 9.2,   // Dài theo trục X (m)
  depth: 1.6,   // Sâu theo trục Z (m)
  height: 4.8,  // Cao theo trục Y (m)
  shelfHeights: [0.75, 1.85, 2.95, 4.05], // Độ cao mặt đỡ 4 tầng T1, T2, T3, T4
  shelfThickness: 0.12,
  shelfDepth: 1.45,
  shelfWidth: 9.0,
  binsPerShelf: 10,
  binWidth: 0.82,
  binDepth: 1.25,
  binSpacing: 0.90,
  maxBinHeight: 0.75,
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
