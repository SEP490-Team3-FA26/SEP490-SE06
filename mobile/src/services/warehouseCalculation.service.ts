/**
 * warehouseCalculation.service.ts - Tầng Dịch Vụ Tính Toán KPI & Quản Trị Kho Hàng (Warehouse Service)
 * Phục vụ màn hình WarehouseScreen theo chuẩn GSP
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Medicine, StockTransfer } from '../types/pharmacy.types';

export class WarehouseCalculationService {
  /**
   * Tính toán KPI hiển thị trên màn hình Thủ kho (tổng số loại thuốc, tổng tồn kho, số lượng Rx và OTC)
   */
  public static calculateWarehouseKPI(
    inventoryStats: { totalMedicines: number; totalStock: number },
    medicines: Medicine[]
  ): {
    displayedTotalMedicines: number;
    displayedTotalStock: number;
    rxCount: number;
    otcCount: number;
  } {
    const medList = Array.isArray(medicines) ? medicines : [];
    const displayedTotalMedicines =
      (inventoryStats?.totalMedicines || 0) > 0 ? inventoryStats.totalMedicines : medList.length;

    const calculatedStock = medList.reduce((sum, m) => sum + (m?.stock || 0), 0);
    const displayedTotalStock =
      (inventoryStats?.totalStock || 0) > 0 ? inventoryStats.totalStock : calculatedStock;

    const rxCount = medList.filter((m) => m?.isRx).length;
    const otcCount = medList.filter((m) => !m?.isRx).length;

    return {
      displayedTotalMedicines,
      displayedTotalStock,
      rxCount,
      otcCount,
    };
  }

  /**
   * Lọc danh mục kho phục vụ Thủ kho kiểm kê (không chặn thuốc kê đơn Rx)
   */
  public static filterWarehouseInventory(
    medicines: Medicine[],
    searchQuery = '',
    zoneFilter = 'ALL'
  ): Medicine[] {
    if (!Array.isArray(medicines)) return [];
    let result = [...medicines];

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.active?.toLowerCase().includes(q) ||
          m.active_ingredient?.toLowerCase().includes(q) ||
          m.sku?.toLowerCase().includes(q) ||
          m.barcode?.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Lọc danh sách chuyển kho liên chi nhánh
   */
  public static filterStockTransfers(
    transfers: StockTransfer[],
    filter: 'ALL' | 'SHIPPING' | 'COMPLETED' = 'ALL'
  ): StockTransfer[] {
    if (!Array.isArray(transfers)) return [];
    if (filter === 'ALL') return transfers;
    return transfers.filter((t) => t.status === filter);
  }
}
