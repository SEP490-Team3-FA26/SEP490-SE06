/**
 * catalogFilter.service.ts - Tầng Dịch Vụ Lọc & Sắp Xếp Dược Phẩm Dành Cho Khách Hàng (Catalog Filter Service)
 * 
 * Chịu trách nhiệm nghiệp vụ:
 * 1. Tuân thủ 100% chuẩn GPP & Thông tư 07/2017/TT-BYT: Chặn toàn bộ thuốc kê đơn (Rx) trên giao diện mua sắm khách hàng.
 * 2. Lọc theo danh mục, từ khóa tìm kiếm (tên, hoạt chất, SKU), khoảng giá, nhóm sản phẩm và tình trạng tồn kho.
 * 3. Sắp xếp đa tiêu chí (giá tăng/giảm dần, tên A-Z) và phân trang 50 sản phẩm / trang.
 * 4. Thuật toán Single-Pass O(N) tối ưu hiệu năng không gây giật lag khi danh mục có 2000+ sản phẩm.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine } from '../types/pharmacy.types';

export type PriceFilterType = 'ALL' | 'UNDER_100' | '100_300' | '300_500' | 'OVER_500';
export type ProductGroupType = 'ALL' | 'OTC' | 'SUPPLEMENT' | 'DEVICE';
export type CatalogSortType = 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC';

export interface CatalogFilterCriteria {
  query?: string;
  categoryKeyword?: string;
  priceFilter?: PriceFilterType;
  productType?: ProductGroupType;
  inStockOnly?: boolean;
  sortBy?: CatalogSortType;
}

export class CatalogFilterService {
  /**
   * Lọc và sắp xếp danh mục sản phẩm y tế bằng thuật toán Single-Pass O(N)
   * Đảm bảo không render bất kỳ thuốc kê đơn Rx nào cho khách hàng
   */
  public static filterAndSortMedicines(
    items: Medicine[],
    criteria: CatalogFilterCriteria = {}
  ): Medicine[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const {
      query = '',
      categoryKeyword = '',
      priceFilter = 'ALL',
      productType = 'ALL',
      inStockOnly = false,
      sortBy = 'DEFAULT',
    } = criteria;

    const cleanQuery = query.toLowerCase().trim();
    const cleanCategory = categoryKeyword.toLowerCase().trim();
    const result: Medicine[] = [];
    const len = items.length;

    for (let i = 0; i < len; i++) {
      const m = items[i];
      if (!m) continue;

      // 1. Quy chuẩn Dược phẩm GPP & Thông tư 07/2017/TT-BYT:
      // Tuyệt đối không hiển thị thuốc kê đơn (Rx) trên danh mục khách hàng
      if (m.isRx) continue;

      // 2. Lọc theo tình trạng còn hàng
      if (inStockOnly && (m.stock || 0) <= 0) continue;

      // 3. Lọc theo từ khóa tìm kiếm (tên thuốc, hoạt chất, mã SKU)
      if (cleanQuery.length > 0) {
        const nameMatch = m.name?.toLowerCase().includes(cleanQuery);
        const activeMatch = m.active?.toLowerCase().includes(cleanQuery) || m.active_ingredient?.toLowerCase().includes(cleanQuery);
        const skuMatch = m.sku?.toLowerCase().includes(cleanQuery);
        if (!nameMatch && !activeMatch && !skuMatch) {
          continue;
        }
      }

      // 4. Lọc theo từ khóa danh mục
      if (cleanCategory.length > 0 && cleanCategory !== 'all') {
        const cat = (m.category || '').toLowerCase();
        if (!cat.includes(cleanCategory)) {
          continue;
        }
      }

      // 5. Lọc theo khoảng giá của Modal
      const price = m.price || 0;
      if (priceFilter === 'UNDER_100' && price >= 100000) continue;
      if (priceFilter === '100_300' && (price < 100000 || price > 300000)) continue;
      if (priceFilter === '300_500' && (price < 300000 || price > 500000)) continue;
      if (priceFilter === 'OVER_500' && price <= 500000) continue;

      // 6. Lọc theo phân loại sản phẩm không kê đơn
      if (productType !== 'ALL') {
        const cat = (m.category || '').toLowerCase();
        if (productType === 'OTC') {
          const isOtc =
            cat.includes('thuốc') ||
            cat.includes('giảm đau') ||
            cat.includes('dán') ||
            cat.includes('kháng sinh') ||
            cat.includes('tiêu hóa') ||
            cat.includes('hô hấp') ||
            cat.includes('dầu');
          if (!isOtc) continue;
        } else if (productType === 'SUPPLEMENT') {
          const isSupplement =
            cat.includes('vitamin') ||
            cat.includes('thực phẩm') ||
            cat.includes('khoáng') ||
            cat.includes('bổ') ||
            cat.includes('dinh dưỡng');
          if (!isSupplement) continue;
        } else if (productType === 'DEVICE') {
          const isDevice =
            cat.includes('thiết bị') ||
            cat.includes('vật tư') ||
            cat.includes('dụng cụ') ||
            cat.includes('y tế');
          if (!isDevice) continue;
        }
      }

      result.push(m);
    }

    // 7. Sắp xếp kết quả (chỉ chạy khi có yêu cầu sắp xếp)
    if (sortBy === 'PRICE_ASC') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'PRICE_DESC') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    return result;
  }

  /**
   * Phân trang danh mục 50 sản phẩm / trang
   */
  public static paginateCatalog(
    items: Medicine[],
    page = 1,
    limit = 50
  ): {
    data: Medicine[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(limit, 1);
    const total = items.length;
    const totalPages = Math.ceil(total / safeLimit) || 1;
    const startIndex = (safePage - 1) * safeLimit;
    const data = items.slice(startIndex, startIndex + safeLimit);
    const hasMore = safePage < totalPages;

    return {
      data,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasMore,
    };
  }

  /**
   * Tạo trạng thái bộ lọc mặc định khi nhấn nút "Xem Tất Cả Thuốc" (Reset Filters)
   */
  public static getDefaultFilterState() {
    return {
      searchQuery: '',
      selectedCategory: 'ALL',
      selectedProductType: 'ALL' as ProductGroupType,
      selectedPriceFilter: 'ALL' as PriceFilterType,
      selectedInStockOnly: false,
      sortBy: 'DEFAULT' as CatalogSortType,
    };
  }
}
