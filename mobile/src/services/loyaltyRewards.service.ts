/**
 * Dịch vụ Điểm Thưởng & Ưu Đãi Hội Viên Tối Giản (Loyalty Rewards Service)
 * Quản lý tính toán điểm tích lũy, quy đổi tiền mặt, quà tặng đổi điểm và lịch sử điểm thưởng
 * Phong cách FPT Long Châu - Chuẩn WDP301/SEP490
 */

export interface LoyaltyTierInfo {
  tierName: string;
  badgeLabel: string;
  pointsRate: number; // Tỷ lệ tích điểm %
  multiplier: number;
}

export interface PointsHistoryItem {
  id: string;
  title: string;
  orderCode?: string;
  date: string;
  points: number; // Điểm cộng (dương) hoặc điểm trừ (âm)
  type: 'EARN' | 'USE' | 'EXPIRE' | 'BONUS';
  note?: string;
}

export interface LoyaltyGiftItem {
  id: string;
  name: string;
  image: string;
  price: number; // 1.000đ
  unit: string; // 'Miếng', 'Hộp', 'Tuýp'
  requiredPoints: number; // 1500, 3000, 4500
  stock: number;
  description?: string;
}

/**
 * Quy đổi điểm thưởng sang tiền mặt VNĐ (tỷ lệ 1 điểm = 1 ₫)
 */
export function convertPointsToCash(points?: number | null, rate = 1): number {
  if (!points || isNaN(points) || points <= 0) return 0;
  return Math.floor(points * rate);
}

/**
 * Định dạng hiển thị điểm thưởng dạng số có dấu phân cách nghìn
 */
export function formatPointsDisplay(points?: number | null): string {
  if (points === null || points === undefined || isNaN(points)) return '0';
  return Math.max(0, Math.floor(points)).toLocaleString('vi-VN');
}

/**
 * Lấy thông tin quyền lợi hội viên theo hạng thành viên
 */
export function getLoyaltyTierMeta(tier?: string | null): LoyaltyTierInfo {
  const normalized = (tier || '').toLowerCase().trim();
  switch (normalized) {
    case 'diamond':
    case 'kim cương':
      return {
        tierName: 'Kim Cương',
        badgeLabel: 'HẠNG KIM CƯƠNG',
        pointsRate: 3,
        multiplier: 2.0,
      };
    case 'gold':
    case 'vàng':
      return {
        tierName: 'Vàng',
        badgeLabel: 'HẠNG VÀNG',
        pointsRate: 2,
        multiplier: 1.5,
      };
    case 'silver':
    case 'bạc':
      return {
        tierName: 'Bạc',
        badgeLabel: 'HẠNG BẠC',
        pointsRate: 1.5,
        multiplier: 1.2,
      };
    case 'bronze':
    case 'đồng':
    default:
      return {
        tierName: 'Đồng',
        badgeLabel: 'HẠNG ĐỒNG',
        pointsRate: 1,
        multiplier: 1.0,
      };
  }
}

/**
 * Định dạng nhãn giảm giá voucher gọn gàng, tối giản
 * @param discountType Loại giảm giá: PERCENT hoặc FIXED/CASH
 * @param discountValue Giá trị giảm
 */
export function formatMinimalVoucherBadge(
  discountType?: string | null,
  discountValue?: number | null,
): string {
  if (!discountValue || isNaN(discountValue) || discountValue <= 0) {
    return '0%';
  }
  if (discountType === 'PERCENT') {
    return `-${discountValue}%`;
  }
  // Nếu là tiền mặt (ví dụ 50000 -> -50k, 100000 -> -100k)
  if (discountValue >= 1000) {
    return `-${Math.round(discountValue / 1000)}k`;
  }
  return `-${discountValue}₫`;
}

/**
 * Lọc danh sách voucher theo từ khóa tìm kiếm (mã voucher, tên hoặc mô tả)
 * Đảm bảo tìm kiếm voucher trên tab Điểm Thưởng / Ưu Đãi chính xác, không nhầm sang tìm thuốc
 */
export function filterVouchersByQuery(vouchers: any[], query?: string | null): any[] {
  if (!Array.isArray(vouchers)) return [];
  if (!query || !query.trim()) return vouchers;
  const q = query.trim().toUpperCase();
  return vouchers.filter(v => 
    (v.code && String(v.code).toUpperCase().includes(q)) ||
    (v.description && String(v.description).toUpperCase().includes(q)) ||
    (v.name && String(v.name).toUpperCase().includes(q))
  );
}

/**
 * Lọc danh sách lịch sử điểm thưởng theo tab phân loại (Tất cả, Tích điểm, Sử dụng, Hết hạn)
 */
export function filterPointsHistory(
  items: PointsHistoryItem[],
  tab: 'ALL' | 'EARN' | 'USE' | 'EXPIRE' = 'ALL'
): PointsHistoryItem[] {
  if (!Array.isArray(items)) return [];
  if (tab === 'ALL') return items;
  if (tab === 'EARN') {
    return items.filter(i => i.type === 'EARN' || i.type === 'BONUS');
  }
  if (tab === 'USE') {
    return items.filter(i => i.type === 'USE');
  }
  if (tab === 'EXPIRE') {
    return items.filter(i => i.type === 'EXPIRE');
  }
  return items;
}

/**
 * Lọc danh sách quà tặng theo mức điểm đổi (1.500 điểm, 3.000 điểm, 4.500 điểm)
 */
export function filterGiftsByPointsTier(
  gifts: LoyaltyGiftItem[],
  tierPoints?: number | null
): LoyaltyGiftItem[] {
  if (!Array.isArray(gifts)) return [];
  if (!tierPoints || tierPoints <= 0) return gifts;
  return gifts.filter(g => g.requiredPoints === tierPoints);
}

/**
 * Tính toán số điểm cần dùng và kiểm tra điều kiện đổi quà
 */
export function calculatePointsAfterRedeem(
  currentPoints: number,
  requiredPointsPerItem: number,
  quantity = 1
): {
  totalPointsNeeded: number;
  remainingPoints: number;
  isEligible: boolean;
  errorMessage?: string;
} {
  const safeCurrent = Math.max(0, currentPoints || 0);
  const safePointsPerItem = Math.max(0, requiredPointsPerItem || 0);
  const safeQty = Math.max(1, Math.floor(quantity || 1));
  const totalPointsNeeded = safePointsPerItem * safeQty;

  const isEligible = safeCurrent >= totalPointsNeeded && totalPointsNeeded > 0;
  const remainingPoints = isEligible ? safeCurrent - totalPointsNeeded : safeCurrent;

  return {
    totalPointsNeeded,
    remainingPoints,
    isEligible,
    errorMessage: isEligible ? undefined : 'Không đủ điểm thưởng.',
  };
}

/**
 * Dữ liệu quà tặng đổi điểm mẫu chuẩn FPT Long Châu
 */
export const DEFAULT_LOYALTY_GIFTS: LoyaltyGiftItem[] = [
  {
    id: 'GIFT-01',
    name: 'Mặt nạ dưỡng ẩm Pax Moly Hyaluronic Acid Deep Sea Water Mask Pack',
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00030752_mat_na_duong_am_pax_moly_hyaluronic_acid_deep_sea_water_mask_pack_25ml_9925_60da7f7bfa.jpg',
    price: 1000,
    unit: 'Miếng',
    requiredPoints: 1500,
    stock: 50,
    description: 'Chiết xuất nước biển sâu và Hyaluronic Acid cấp ẩm chuyên sâu cho da',
  },
  {
    id: 'GIFT-02',
    name: 'Mặt nạ dưỡng ẩm Pax Moly Super Aqua Mask Pack làm mềm mịn, cải thiện độ đàn hồi da',
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00030753_mat_na_duong_am_pax_moly_super_aqua_mask_pack_25ml_8731_60da8018ce.jpg',
    price: 1000,
    unit: 'Miếng',
    requiredPoints: 1500,
    stock: 45,
    description: 'Bổ sung khoáng chất biển sâu giúp da săn chắc, đàn hồi và tươi trẻ',
  },
  {
    id: 'GIFT-03',
    name: 'Kem dưỡng ẩm Cetaphil Moisturizing Cream 50g cho da nhạy cảm',
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00008544_kem_duong_am_cetaphil_50g_4847_5cf60a37e8.jpg',
    price: 1000,
    unit: 'Tuýp',
    requiredPoints: 3000,
    stock: 20,
    description: 'Dưỡng ẩm vượt trội, lành tính dành cho da nhạy cảm chuẩn da liễu',
  },
  {
    id: 'GIFT-04',
    name: 'Viên uống Vitamin C 500mg ABC Pharmacy tăng sức đề kháng (Hộp 60 viên)',
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00008544_kem_duong_am_cetaphil_50g_4847_5cf60a37e8.jpg',
    price: 1000,
    unit: 'Hộp',
    requiredPoints: 4500,
    stock: 15,
    description: 'Tăng cường hệ miễn dịch và hỗ trợ chống oxy hóa tế bào',
  },
];

/**
 * Dữ liệu lịch sử giao dịch điểm thưởng mẫu
 */
export const DEFAULT_POINTS_HISTORY: PointsHistoryItem[] = [
  {
    id: 'TX-1001',
    title: 'Tích điểm đơn hàng tại quầy POS',
    orderCode: '#HD-20261028-091',
    date: '28/10/2026 14:35',
    points: 150,
    type: 'EARN',
    note: 'Đơn thuốc kháng sinh & vitamin chi nhánh Quận 1',
  },
  {
    id: 'TX-1002',
    title: 'Đổi quà: Mặt nạ Pax Moly Super Aqua',
    date: '24/10/2026 16:45',
    points: -1500,
    type: 'USE',
    note: 'Đổi quà tích điểm trực tiếp tại App ABC Pharmacy',
  },
  {
    id: 'TX-1003',
    title: 'Tích điểm mua thuốc Online giao tận nhà',
    orderCode: '#HD-20261019-542',
    date: '19/10/2026 09:12',
    points: 320,
    type: 'EARN',
    note: 'Giao nhanh 2h dược phẩm & TPCN',
  },
  {
    id: 'TX-1004',
    title: 'Thưởng thăng hạng Hạng Vàng',
    date: '15/10/2026 08:00',
    points: 500,
    type: 'BONUS',
    note: 'Đặc quyền chào mừng thành viên Hạng Vàng ABC Club',
  },
  {
    id: 'TX-1005',
    title: 'Đổi mã voucher giảm 50.000₫',
    date: '10/10/2026 11:20',
    points: -500,
    type: 'USE',
    note: 'Áp dụng cho đơn hàng dược mỹ phẩm từ 200.000₫',
  },
  {
    id: 'TX-1006',
    title: 'Điểm hết hạn định kỳ năm 2025',
    date: '31/12/2025 23:59',
    points: -50,
    type: 'EXPIRE',
    note: 'Điểm tích lũy chưa sử dụng hết hạn chu kỳ',
  },
];
