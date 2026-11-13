// mobile/src/services/catalogStorage.service.ts
/**
 * =========================================================================
 * DỊCH VỤ QUẢN LÝ DANH MỤC THUỐC CỤC BỘ (LOCAL CATALOG & OFFLINE ENGINE)
 * Hệ thống ABC Pharmacy Mobile - WDP301 / SEP490
 * Xử lý bài toán 2000+ sản phẩm: Indexing O(1), Delta Sync, Tra cứu tức thì < 2ms
 * =========================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine } from '../types/pharmacy.types';
import { ApiService } from './api.service';

const STORAGE_KEY_CATALOG = '@pharmacy_catalog_medicines_v2';
const STORAGE_KEY_LAST_SYNC = '@pharmacy_catalog_last_synced_v2';

export class CatalogStorageService {
  private static instance: CatalogStorageService;

  // Cấu trúc dữ liệu trong bộ nhớ (In-Memory Index) để tra cứu O(1) siêu tốc
  private medicineIdMap = new Map<string, Medicine>();
  private barcodeMap = new Map<string, Medicine>();
  private skuMap = new Map<string, Medicine>();
  private lastSyncedAt: string | null = null;
  private isInitialized = false;
  private isSyncing = false;

  private constructor() {}

  public static getInstance(): CatalogStorageService {
    if (!CatalogStorageService.instance) {
      CatalogStorageService.instance = new CatalogStorageService();
    }
    return CatalogStorageService.instance;
  }

  /**
   * Khởi tạo bộ nhớ đệm từ AsyncStorage khi ứng dụng bật
   */
  public async init(branchId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      const [storedCatalog, storedLastSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_CATALOG),
        AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC),
      ]);

      if (storedCatalog) {
        const list: Medicine[] = JSON.parse(storedCatalog);
        this.rebuildIndexMaps(list);
      }

      if (storedLastSync) {
        this.lastSyncedAt = storedLastSync;
      }

      this.isInitialized = true;

      // Kích hoạt đồng bộ ngầm Delta Sync với Backend
      this.syncCatalog(branchId).catch((err) => {
        console.warn('⚠️ [CatalogStorage] Đồng bộ ngầm thất bại:', err?.message || err);
      });
    } catch (error) {
      console.warn('⚠️ [CatalogStorage] Lỗi khi nạp danh mục cục bộ:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Tái xây dựng các Map chỉ mục (Index Maps) để tra cứu O(1)
   */
  private rebuildIndexMaps(list: Medicine[]): void {
    this.medicineIdMap.clear();
    this.barcodeMap.clear();
    this.skuMap.clear();

    for (const med of list) {
      const id = med.id || (med as any)._id;
      if (id) {
        this.medicineIdMap.set(String(id), med);
      }

      // Đánh chỉ mục mã vạch chính của thuốc
      if (med.barcode) {
        this.barcodeMap.set(med.barcode.trim(), med);
      }

      // Đánh chỉ mục mã vạch của từng đơn vị đóng gói (Hộp / Vỉ / Viên)
      if (Array.isArray(med.units)) {
        for (const u of med.units) {
          if (u.barcode) {
            this.barcodeMap.set(u.barcode.trim(), med);
          }
        }
      }

      // Đánh chỉ mục mã SKU
      if (med.sku) {
        this.skuMap.set(med.sku.trim().toUpperCase(), med);
      }
    }
  }

  /**
   * Đồng bộ danh mục thuốc từ Backend (Full Sync hoặc Delta Sync)
   */
  public async syncCatalog(branchId?: string, forceFull = false): Promise<{ count: number; isFullSync: boolean }> {
    if (this.isSyncing) {
      return { count: this.medicineIdMap.size, isFullSync: false };
    }

    this.isSyncing = true;
    try {
      const sinceParam = forceFull ? undefined : this.lastSyncedAt || undefined;
      const res = await ApiService.syncMedicineCatalog(sinceParam, branchId, 3000);

      if (res && res.items) {
        if (res.isFullSync || this.medicineIdMap.size === 0) {
          // Full sync: Ghi đè toàn bộ danh mục mới
          this.rebuildIndexMaps(res.items);
        } else if (res.items.length > 0) {
          // Delta sync: Hợp nhất (Merge) các sản phẩm có cập nhật
          for (const item of res.items) {
            const id = item.id || (item as any)._id;
            if (id) {
              this.medicineIdMap.set(String(id), item);
            }
            if (item.barcode) {
              this.barcodeMap.set(item.barcode.trim(), item);
            }
            if (Array.isArray(item.units)) {
              for (const u of item.units) {
                if (u.barcode) {
                  this.barcodeMap.set(u.barcode.trim(), item);
                }
              }
            }
            if (item.sku) {
              this.skuMap.set(item.sku.trim().toUpperCase(), item);
            }
          }
        }

        // Lưu mốc thời gian và lưu danh mục xuống Storage
        this.lastSyncedAt = res.serverTime;
        const fullList = Array.from(this.medicineIdMap.values());

        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(fullList)),
          AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, this.lastSyncedAt),
        ]);
      }

      return { count: this.medicineIdMap.size, isFullSync: Boolean(res?.isFullSync) };
    } catch (e: any) {
      console.warn('⚠️ [CatalogStorage] Lỗi đồng bộ danh mục:', e?.message || e);
      return { count: this.medicineIdMap.size, isFullSync: false };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Tra cứu thuốc siêu tốc O(1) bằng mã vạch Barcode (cả mã thuốc và mã bao gói)
   */
  public findMedicineByBarcode(barcode: string): Medicine | undefined {
    if (!barcode) return undefined;
    const cleanCode = barcode.trim();
    return this.barcodeMap.get(cleanCode);
  }

  /**
   * Tra cứu thuốc bằng ID
   */
  public findMedicineById(id: string): Medicine | undefined {
    if (!id) return undefined;
    return this.medicineIdMap.get(String(id));
  }

  /**
   * Tra cứu thuốc bằng mã SKU
   */
  public findMedicineBySku(sku: string): Medicine | undefined {
    if (!sku) return undefined;
    return this.skuMap.get(sku.trim().toUpperCase());
  }

  /**
   * Tìm kiếm tức thì trong 2000+ thuốc cục bộ (Client-Side Search - Zero Latency)
   */
  public searchMedicines(query: string, limit = 20): Medicine[] {
    if (!query || !query.trim()) {
      return Array.from(this.medicineIdMap.values()).slice(0, limit);
    }

    const q = query.trim().toLowerCase();
    const results: Medicine[] = [];

    for (const med of this.medicineIdMap.values()) {
      const matchName = med.name && med.name.toLowerCase().includes(q);
      const matchBarcode = med.barcode && med.barcode.includes(q);
      const matchSku = med.sku && med.sku.toLowerCase().includes(q);
      const matchActive = (med as any).active_ingredient && String((med as any).active_ingredient).toLowerCase().includes(q);
      const matchCategory = med.category && med.category.toLowerCase().includes(q);

      if (matchName || matchBarcode || matchSku || matchActive || matchCategory) {
        results.push(med);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * Lấy toàn bộ danh sách thuốc đã được cache
   */
  public getAllMedicines(): Medicine[] {
    return Array.from(this.medicineIdMap.values());
  }

  /**
   * Lấy tổng số lượng mặt hàng thuốc hiện có trong kho máy
   */
  public getTotalCount(): number {
    return this.medicineIdMap.size;
  }
}

export const catalogStorageService = CatalogStorageService.getInstance();

