/**
 * inventoryCheckHelper.ts
 * Bộ tiện ích xử lý nghiệp vụ Biên Bản Kiểm Kê Kho (BW07) & Tích hợp Sơ Đồ Kho GSP cho Mobile
 * Tuân thủ chuẩn WDP301/SEP490 Playbook v2.0 và quy tắc Chú thích Tiếng Việt 100%.
 */

export interface InventoryCheckItem {
  medicineId: string;
  medicineName: string;
  sku?: string;
  barcode?: string;
  batchId?: string;
  batchNo?: string;
  expDate?: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  discrepancyReason?: string;
  unit?: string;
  location?: {
    zone: string;
    rack: string;
    shelf: number;
  };
}

export interface ShelfDetailPayload {
  zone: string;
  rack: string;
  shelf: number;
  batches?: any[];
}

/**
 * Trích xuất danh sách thuốc từ tầng kệ kho sang các dòng kiểm kê kho
 * Hỗ trợ chọn toàn bộ thuốc trên kệ hoặc lọc theo danh sách ID thuốc đã chọn
 */
export function buildCheckItemsFromShelf(
  shelfData: ShelfDetailPayload,
  selectedMedicineIds?: string[]
): InventoryCheckItem[] {
  if (!shelfData || !Array.isArray(shelfData.batches)) {
    return [];
  }

  const { zone, rack, shelf, batches } = shelfData;
  const filterSet = selectedMedicineIds && selectedMedicineIds.length > 0
    ? new Set(selectedMedicineIds.map((id) => String(id).trim()))
    : null;

  const result: InventoryCheckItem[] = [];

  for (const item of batches) {
    const medId = String(item.id || item.medicineId || item._id || item.sku || '').trim();
    // Nếu có bộ lọc ID đã chọn và thuốc không nằm trong danh sách chọn thì bỏ qua
    if (filterSet && !filterSet.has(medId)) {
      continue;
    }

    const batchList = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches : [null];

    for (const b of batchList) {
      const sysStock = Number(b ? b.stock : item.stock || 0);
      result.push({
        medicineId: medId || `med_${result.length + 1}`,
        medicineName: item.name || item.medicineName || 'Dược phẩm không tên',
        sku: item.sku || '',
        barcode: item.barcode || (b && b.barcode) || '',
        batchId: b ? (b._id || b.batchId || '') : '',
        batchNo: b ? (b.batchNo || '') : '',
        expDate: b ? (b.expDate || '') : '',
        systemStock: Math.max(0, sysStock),
        actualStock: Math.max(0, sysStock), // Mặc định gán bằng tồn hệ thống, thủ kho có thể quét/sửa
        difference: 0,
        discrepancyReason: '',
        unit: item.unit || 'Hộp',
        location: {
          zone: zone || 'A',
          rack: rack || 'A1',
          shelf: Number(shelf) || 1,
        },
      });
    }
  }

  return result;
}

/**
 * Tính toán chênh lệch tồn kho giữa số lượng đếm thực tế và số liệu hệ thống
 */
export function calculateDiscrepancy(
  systemStock: number,
  actualStock: number
): {
  difference: number;
  status: 'MATCH' | 'SURPLUS' | 'DEFICIT';
  isValid: boolean;
} {
  const sys = Number(systemStock);
  const act = Number(actualStock);

  if (isNaN(sys) || isNaN(act) || act < 0) {
    return {
      difference: 0,
      status: 'MATCH',
      isValid: false,
    };
  }

  const diff = act - sys;
  let status: 'MATCH' | 'SURPLUS' | 'DEFICIT' = 'MATCH';
  if (diff > 0) status = 'SURPLUS';
  else if (diff < 0) status = 'DEFICIT';

  return {
    difference: diff,
    status,
    isValid: true,
  };
}

/**
 * Quét mã Barcode trực tiếp: Tự động tìm đúng dòng thuốc trong đợt kiểm kê và tăng số lượng đếm thực tế
 */
export function incrementStockByBarcode(
  items: InventoryCheckItem[],
  scannedCode: string
): {
  updatedItems: InventoryCheckItem[];
  found: boolean;
  matchedItem?: InventoryCheckItem;
} {
  if (!Array.isArray(items) || items.length === 0 || !scannedCode || !scannedCode.trim()) {
    return { updatedItems: items || [], found: false };
  }

  const cleanCode = scannedCode.trim().toLowerCase();
  let found = false;
  let matchedItem: InventoryCheckItem | undefined;

  const updatedItems = items.map((item) => {
    const isMatch =
      (item.barcode && item.barcode.toLowerCase() === cleanCode) ||
      (item.sku && item.sku.toLowerCase() === cleanCode) ||
      (item.batchNo && item.batchNo.toLowerCase() === cleanCode) ||
      (item.medicineId && item.medicineId.toLowerCase() === cleanCode);

    if (isMatch && !found) {
      found = true;
      const newActual = item.actualStock + 1;
      const { difference } = calculateDiscrepancy(item.systemStock, newActual);
      matchedItem = {
        ...item,
        actualStock: newActual,
        difference,
      };
      return matchedItem;
    }
    return item;
  });

  return {
    updatedItems,
    found,
    matchedItem,
  };
}

/**
 * Xác thực dữ liệu biên bản kiểm kê trước khi gửi lên API
 * Bắt buộc nhập lý do nếu phát hiện sai lệch thừa hoặc thiếu
 */
export function validateInventoryCheckSubmission(items: InventoryCheckItem[]): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      error: 'Danh sách kiểm kê không được để trống! Vui lòng chọn ít nhất 1 thuốc.',
    };
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (isNaN(Number(it.actualStock)) || Number(it.actualStock) < 0) {
      return {
        isValid: false,
        error: `Dòng ${i + 1} (${it.medicineName}): Số lượng thực tế không hợp lệ (phải >= 0).`,
      };
    }

    const diff = Number(it.actualStock) - Number(it.systemStock);
    if (diff !== 0) {
      const reason = (it.discrepancyReason || '').trim();
      if (!reason) {
        return {
          isValid: false,
          error: `Dòng ${i + 1} (${it.medicineName}): Có chênh lệch (${diff > 0 ? '+' : ''}${diff}). Bắt buộc phải ghi rõ lý do chênh lệch!`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Định dạng nhãn vị trí kho GSP chuẩn hóa
 */
export function formatWarehouseLocationLabel(location?: {
  zone?: string;
  rack?: string;
  shelf?: number;
}): string {
  if (!location) return 'Chưa phân vị trí';
  const { zone = 'A', rack = 'A1', shelf = 1 } = location;
  return `Khu ${zone} · Kệ ${rack} · Tầng ${shelf}`;
}

