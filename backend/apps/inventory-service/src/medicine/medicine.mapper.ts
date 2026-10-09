export interface MedicineBatchDto {
  batchNo: string;
  expDate: string | Date;
  stock: number;
  status: string;
}

export interface MedicineUnitDto {
  unitName: string;
  exchangeValue: number;
  price: number;
  isBaseUnit?: boolean;
  barcode?: string;
}

export interface MedicineListItemDto {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  registration_number: string;
  national_drug_code: string;
  national_drug_id: string;
  is_medicine: boolean;
  national_sync_status: string;
  national_synced_at: string;
  prescription_status: number;
  special_control_type: number;
  category: string;
  drug_classification: string;
  price: number;
  stock: number;
  unopenedBoxes: number;
  openedBoxUnits: number;
  units: MedicineUnitDto[];
  minStock: number;
  status: 'In Stock' | 'Out of Stock';
  expiry: string;
  unit: string;
  image?: string;
  active_ingredient: string;
  supplierId: string;
  priceTiers: any[];
  batches: MedicineBatchDto[];
}

export interface MedicineMappingContext {
  dbMed?: any;
  branchId?: string;
  specificBranchInvs?: any[];
  balanceStock?: number;
}

/**
 * MedicineMapper
 * Lớp Data Mapper chuyên trách tuân thủ nguyên tắc Đơn trách nhiệm (SRP) và DRY trong SOLID.
 * Đóng gói toàn bộ logic chuyển đổi giữa Document MongoDB / Dữ liệu AI sang DTO phản hồi cho Client.
 */
export class MedicineMapper {
  /**
   * Gom nhóm danh sách lô hàng theo mã thuốc (medicineId) tương ứng vào Map
   */
  public static groupBatchesByMedicineId<T extends { medicineId?: any }>(batches: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const batch of batches) {
      const medId = batch.medicineId ? String(batch.medicineId) : '';
      if (!medId) continue;
      const list = map.get(medId) || [];
      list.push(batch);
      map.set(medId, list);
    }
    return map;
  }

  /**
   * Lọc chỉ lấy các lô hàng đang hoạt động (ACTIVE) và có số lượng tồn khả dụng > 0
   */
  public static filterActiveBatches<T extends { status?: string; stock?: number }>(batches: T[] = []): T[] {
    if (!batches || !Array.isArray(batches)) return [];
    return batches.filter(
      (b) => (!b.status || String(b.status).toUpperCase() === 'ACTIVE') && Number(b.stock || 0) > 0,
    );
  }

  /**
   * Tính ngày hết hạn gần nhất (earliest expiry) từ danh sách các lô hàng khả dụng
   */
  public static calculateEarliestExpiry(
    batches: Array<{ expDate?: string | Date }>,
    defaultDate: string = '2026-12-31',
  ): string {
    if (!batches || batches.length === 0) {
      return defaultDate;
    }
    const validBatches = batches.filter((b) => b && b.expDate);
    if (validBatches.length === 0) {
      return defaultDate;
    }
    const earliestBatch = validBatches.reduce((min, b) => {
      return new Date(b.expDate) < new Date(min.expDate) ? b : min;
    }, validBatches[0]);

    try {
      return new Date(earliestBatch.expDate).toISOString().split('T')[0];
    } catch {
      return defaultDate;
    }
  }

  /**
   * Chuẩn hóa cấu trúc thứ bậc đơn vị quy đổi (Hộp, Vỉ, Viên) kèm giá trị mặc định nếu chưa cấu hình
   */
  public static normalizeUnits(med: any, basePrice: number, dbMed?: any): MedicineUnitDto[] {
    if (dbMed?.units && Array.isArray(dbMed.units) && dbMed.units.length > 0) {
      return dbMed.units;
    }
    if (med?.units && Array.isArray(med.units) && med.units.length > 0) {
      return med.units;
    }
    const safePrice = basePrice || 50000;
    const baseUnitName = med?.unit || dbMed?.unit || 'Hộp';
    return [
      { unitName: baseUnitName, exchangeValue: 100, price: safePrice, isBaseUnit: true },
      { unitName: 'Vỉ', exchangeValue: 10, price: Math.round((safePrice / 10) * 1.05) },
      { unitName: 'Viên', exchangeValue: 1, price: Math.round((safePrice / 100) * 1.1) },
    ];
  }

  /**
   * Tính toán tổng tồn kho thực tế và hạn dùng gần nhất dựa trên ngữ cảnh chi nhánh vật lý
   */
  public static computeStockAndExpiry(
    med: any,
    activeBatches: any[],
    context?: MedicineMappingContext,
  ): { totalStock: number; earliestExpiryStr: string } {
    let totalStock = 0;
    let earliestExpiryStr = '2026-12-31';

    const specificBranchInvs = context?.specificBranchInvs || [];
    const balanceStock = context?.balanceStock;
    const branchId = context?.branchId;

    if (branchId && branchId !== 'CENTRAL_WH') {
      // Chi nhánh bán lẻ: Ưu tiên số dư bảng cân bằng kho -> collection kho vật lý -> lô hàng chi nhánh -> tồn kho tổng
      if (balanceStock !== undefined) {
        totalStock = balanceStock;
      } else if (specificBranchInvs.length > 0) {
        totalStock = specificBranchInvs.reduce((sum, b) => sum + Number(b.stock || 0), 0);
      } else if (activeBatches.length > 0) {
        totalStock = activeBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0);
      } else {
        totalStock = context?.dbMed?.stock || med?.stock || 0;
      }

      if (specificBranchInvs.length > 0) {
        earliestExpiryStr = this.calculateEarliestExpiry(specificBranchInvs);
      } else if (activeBatches.length > 0) {
        earliestExpiryStr = this.calculateEarliestExpiry(activeBatches);
      }
    } else if (branchId === 'CENTRAL_WH') {
      // Kho tổng GSP: Tổng tồn tính theo các lô hàng thuộc kho tổng
      totalStock =
        activeBatches.length > 0
          ? activeBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0)
          : (context?.dbMed?.stock || med?.stock || 0);
      earliestExpiryStr = this.calculateEarliestExpiry(activeBatches);
    } else {
      // Toàn chuỗi hoặc không chỉ định chi nhánh: Lấy tồn kho chung của thuốc
      totalStock = context?.dbMed?.stock || med?.stock || 0;
      earliestExpiryStr = this.calculateEarliestExpiry(activeBatches);
    }

    return { totalStock, earliestExpiryStr };
  }

  /**
   * Chuyển đổi dữ liệu thuốc thô + danh sách lô hàng sang DTO phản hồi chuẩn hóa cho Client
   */
  public static toListItemDto(
    med: any,
    medBatches: any[] = [],
    context?: MedicineMappingContext,
  ): MedicineListItemDto {
    const medId = (med._id || med.id || '').toString();
    const dbMed = context?.dbMed;
    const activeBatches = this.filterActiveBatches(medBatches);

    const actualPrice = dbMed?.price || med.price || 50000;
    const { totalStock, earliestExpiryStr } = this.computeStockAndExpiry(med, activeBatches, context);

    const barcode =
      dbMed?.barcode ||
      med.barcode ||
      (dbMed?.units && dbMed.units[0]?.barcode) ||
      (med.units && med.units[0]?.barcode) ||
      '';

    const sku = dbMed?.sku || med.sku || (medId ? medId.slice(-6).toUpperCase() : '');

    const registrationNumber = med.registration_number || dbMed?.registration_number || '';
    const nationalDrugCode =
      med.national_drug_code ||
      dbMed?.national_drug_code ||
      registrationNumber ||
      med.nationalDrugId ||
      dbMed?.nationalDrugId ||
      '';
    const nationalDrugId =
      med.national_drug_id ||
      dbMed?.national_drug_id ||
      med.nationalDrugId ||
      dbMed?.nationalDrugId ||
      '';

    const isMedicine = med.is_medicine !== false && dbMed?.is_medicine !== false;
    const nationalSyncStatus = med.national_sync_status || dbMed?.national_sync_status || 'SYNCED';
    const nationalSyncedAt = med.national_synced_at || dbMed?.national_synced_at || new Date().toISOString();

    const prescriptionStatus =
      med.prescription_status !== undefined
        ? med.prescription_status
        : dbMed?.prescription_status !== undefined
        ? dbMed.prescription_status
        : 0;

    const specialControlType =
      med.special_control_type !== undefined
        ? med.special_control_type
        : dbMed?.special_control_type !== undefined
        ? dbMed.special_control_type
        : 0;

    const category = med.category || dbMed?.category || 'Chưa phân loại';
    const drugClassification = med.drug_classification || dbMed?.drug_classification || 'COMMON_SUPPLEMENT';

    const units = this.normalizeUnits(med, actualPrice, dbMed);

    return {
      id: medId,
      name: med.name,
      barcode,
      sku,
      registration_number: registrationNumber,
      national_drug_code: nationalDrugCode,
      national_drug_id: nationalDrugId,
      is_medicine: isMedicine,
      national_sync_status: nationalSyncStatus,
      national_synced_at: nationalSyncedAt,
      prescription_status: prescriptionStatus,
      special_control_type: specialControlType,
      category,
      drug_classification: drugClassification,
      price: actualPrice,
      stock: totalStock,
      unopenedBoxes: Math.max(0, Math.floor(totalStock / 100)),
      openedBoxUnits: med.openedBoxUnits !== undefined ? med.openedBoxUnits : totalStock % 100,
      units,
      minStock: med.minStock || 50,
      status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
      expiry: earliestExpiryStr,
      unit: med.unit || dbMed?.unit || 'Hộp',
      image: med.image || dbMed?.image,
      active_ingredient: med.active_ingredient || dbMed?.active_ingredient || '',
      supplierId: med.supplierId || dbMed?.supplierId || '',
      priceTiers: med.priceTiers || dbMed?.priceTiers || [],
      batches: medBatches.map((b) => ({
        batchNo: b.batchNo,
        expDate: b.expDate,
        stock: b.stock,
        status: b.status,
      })),
    };
  }
}
