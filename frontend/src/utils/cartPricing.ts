/**
 * Tiện ích tính toán giá trị và quản lý chọn sản phẩm trong giỏ hàng
 * Dự án: ABC Pharmacy (WDP301 / SEP490)
 * Tuân thủ quy chuẩn: Tính toán giá theo thời gian thực (Real-time reactive pricing)
 */

export interface CartItemLike {
  id?: string;
  _id?: string;
  medicineId?: string;
  name: string;
  price: number;
  quantity: number | string;
  stock?: number;
  prescription_status?: boolean;
  is_prescription?: boolean;
  drug_classification?: string;
  unit?: string;
  [key: string]: any;
}

export interface CartPricingResult {
  /** Số loại sản phẩm được tick chọn */
  selectedCount: number;
  /** Tổng số loại sản phẩm trong giỏ */
  totalCount: number;
  /** Tổng số lượng sản phẩm được tick chọn (tính tổng quantity) */
  selectedQuantityTotal: number;
  /** Tổng tiền tạm tính của các sản phẩm được tick chọn */
  subtotal: number;
  /** Số tiền chiết khấu thành viên (5%) */
  memberDiscount: number;
  /** Số tiền giảm giá voucher hợp lệ */
  voucherDiscount: number;
  /** Tiền thuế VAT (8%) */
  vat: number;
  /** Tổng thanh toán cuối cùng */
  total: number;
  /** Điểm thưởng tích lũy dự kiến (1% tổng thanh toán) */
  earnedPoints: number;
}

/**
 * Lấy ID chuẩn của một sản phẩm trong giỏ hàng
 */
export function getCartItemId(item: CartItemLike): string {
  if (!item) return "";
  return String(item.id || item._id || item.medicineId || "");
}

/**
 * Tính toán giá tiền chi tiết cho các sản phẩm được chọn trong giỏ hàng
 * @param allItems Toàn bộ danh sách sản phẩm trong giỏ
 * @param selectedIds Danh sách ID sản phẩm được tick chọn
 * @param voucherDiscount Số tiền giảm giá từ voucher (nếu có)
 * @param memberDiscountPercent Tỷ lệ giảm giá thành viên (mặc định 0.05 = 5%)
 * @param vatPercent Tỷ lệ thuế VAT (mặc định 0.08 = 8%)
 */
export function calculateCartPricing(
  allItems: CartItemLike[],
  selectedIds: string[],
  voucherDiscount: number = 0,
  memberDiscountPercent: number = 0.05,
  vatPercent: number = 0.08
): CartPricingResult {
  if (!Array.isArray(allItems) || allItems.length === 0) {
    return {
      selectedCount: 0,
      totalCount: 0,
      selectedQuantityTotal: 0,
      subtotal: 0,
      memberDiscount: 0,
      voucherDiscount: 0,
      vat: 0,
      total: 0,
      earnedPoints: 0,
    };
  }

  // Chuyển danh sách ID được chọn thành Set để kiểm tra O(1)
  const selectedIdSet = new Set((selectedIds || []).map(String));

  // Lọc ra các sản phẩm thực sự được chọn
  const selectedItems = allItems.filter((item) => {
    const id = getCartItemId(item);
    return id !== "" && selectedIdSet.has(id);
  });

  // Tính tổng số lượng và tạm tính
  let subtotal = 0;
  let selectedQuantityTotal = 0;

  for (const item of selectedItems) {
    const price = Math.max(0, Number(item.price) || 0);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    subtotal += price * quantity;
    selectedQuantityTotal += quantity;
  }

  // Nếu không chọn sản phẩm nào hoặc tổng tiền = 0
  if (selectedItems.length === 0 || subtotal <= 0) {
    return {
      selectedCount: 0,
      totalCount: allItems.length,
      selectedQuantityTotal: 0,
      subtotal: 0,
      memberDiscount: 0,
      voucherDiscount: 0,
      vat: 0,
      total: 0,
      earnedPoints: 0,
    };
  }

  // Chiết khấu thành viên (5%)
  const memberDiscount = Math.round(subtotal * Math.max(0, memberDiscountPercent));

  // Giảm giá voucher (không được vượt quá số tiền sau khi đã trừ chiết khấu thành viên)
  const maxVoucherApplicable = Math.max(0, subtotal - memberDiscount);
  const validVoucherDiscount = Math.min(Math.max(0, Number(voucherDiscount) || 0), maxVoucherApplicable);

  // Thuế VAT (8%) tính trên số tiền chịu thuế sau khi đã giảm trừ
  const taxableAmount = Math.max(0, subtotal - memberDiscount - validVoucherDiscount);
  const vat = Math.round(taxableAmount * Math.max(0, vatPercent));

  // Tổng thanh toán
  const total = taxableAmount + vat;

  // Điểm tích lũy (1% tổng thanh toán)
  const earnedPoints = Math.round(total / 100);

  return {
    selectedCount: selectedItems.length,
    totalCount: allItems.length,
    selectedQuantityTotal,
    subtotal,
    memberDiscount,
    voucherDiscount: validVoucherDiscount,
    vat,
    total,
    earnedPoints,
  };
}

/**
 * Xử lý bật/tắt chọn tất cả sản phẩm
 * @param allItems Toàn bộ danh sách sản phẩm
 * @param currentSelectedIds Danh sách ID đang được chọn
 * @returns Danh sách ID mới sau khi toggle
 */
export function toggleSelectAllItems(allItems: CartItemLike[], currentSelectedIds: string[]): string[] {
  if (!Array.isArray(allItems) || allItems.length === 0) return [];

  const allValidIds = allItems.map(getCartItemId).filter(Boolean);
  const currentSet = new Set((currentSelectedIds || []).map(String));

  // Kiểm tra xem hiện tại đã chọn đủ tất cả sản phẩm hợp lệ chưa
  const isFullySelected = allValidIds.length > 0 && allValidIds.every((id) => currentSet.has(id));

  if (isFullySelected) {
    // Đã chọn tất cả -> Bỏ chọn toàn bộ
    return [];
  }

  // Chưa chọn hết -> Chọn tất cả
  return allValidIds;
}

/**
 * Xử lý bật/tắt chọn một sản phẩm đơn lẻ
 * @param currentSelectedIds Danh sách ID đang được chọn
 * @param targetId ID của sản phẩm cần toggle
 * @returns Danh sách ID mới
 */
export function toggleItemSelection(currentSelectedIds: string[], targetId: string): string[] {
  const strId = String(targetId || "").trim();
  if (!strId) return currentSelectedIds || [];

  const currentList = (currentSelectedIds || []).map(String);
  if (currentList.includes(strId)) {
    return currentList.filter((id) => id !== strId);
  }
  return [...currentList, strId];
}

