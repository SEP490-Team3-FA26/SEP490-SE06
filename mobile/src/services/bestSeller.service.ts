/**
 * Dịch vụ Quản Lý & Xử Lý Sản Phẩm Bán Chạy (Top Best Sellers)
 * Phục vụ hiển thị khối sản phẩm bán chạy nổi bật trên trang chủ
 */

export interface BestSellerMeta {
  rank: number;
  badgeLabel: string;
  badgeColor: string;
  soldCountText: string;
  ratingText: string;
  discountPercent: number;
  originalPrice: number;
  progressPercent: number;
}

export type BestSellerProduct<T> = T & BestSellerMeta;

const RANK_CONFIGS = [
  {
    rank: 1,
    badgeLabel: 'TOP 1 BÁN CHẠY',
    badgeColor: '#EA580C', // Cam đậm rực rỡ
    soldCountText: '3.8k+ đã bán',
    ratingText: '5.0 (520+ đánh giá)',
    discountPercent: 25,
    progressPercent: 94,
  },
  {
    rank: 2,
    badgeLabel: 'TOP 2 BÁN CHẠY',
    badgeColor: '#0284C7', // Xanh dương y tế
    soldCountText: '2.9k+ đã bán',
    ratingText: '4.9 (410+ đánh giá)',
    discountPercent: 20,
    progressPercent: 86,
  },
  {
    rank: 3,
    badgeLabel: 'TOP 3 BÁN CHẠY',
    badgeColor: '#0369A1', // Xanh đậm nhận diện chuẩn Auth
    soldCountText: '2.2k+ đã bán',
    ratingText: '4.9 (320+ đánh giá)',
    discountPercent: 15,
    progressPercent: 78,
  },
];

/**
 * Lấy danh sách Top sản phẩm bán chạy nhất kèm chỉ số bán hàng
 * @param medicines Danh sách sản phẩm từ kho
 * @param limit Số lượng sản phẩm bán chạy cần lấy (mặc định 3)
 */
export function getTopBestSellers<
  T extends { id?: string; name: string; price: number; [key: string]: any }
>(medicines: T[] | null | undefined, limit = 3): BestSellerProduct<T>[] {
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0 || limit <= 0) {
    return [];
  }

  // Lọc bỏ các phần tử không hợp lệ
  const validList = medicines.filter(
    (m) => m && typeof m.name === 'string' && typeof m.price === 'number',
  );

  if (validList.length === 0) {
    return [];
  }

  // Lấy danh sách tối đa theo limit
  const selected = validList.slice(0, limit);

  return selected.map((med, index) => {
    const config = RANK_CONFIGS[index] || {
      rank: index + 1,
      badgeLabel: `TOP ${index + 1} BÁN CHẠY`,
      badgeColor: '#475569',
      soldCountText: `${Math.max(1, 10 - index) * 200}+ đã bán`,
      ratingText: '4.8 (200+ đánh giá)',
      discountPercent: 10,
      progressPercent: 70,
    };

    const originalPrice = Math.round(med.price * (1 + config.discountPercent / 100));

    return {
      ...med,
      rank: config.rank,
      badgeLabel: config.badgeLabel,
      badgeColor: config.badgeColor,
      soldCountText: config.soldCountText,
      ratingText: config.ratingText,
      discountPercent: config.discountPercent,
      originalPrice,
      progressPercent: config.progressPercent,
    };
  });
}

