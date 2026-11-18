/**
 * Bộ hàm tiện ích tính toán nghiệp vụ MOQ (Số lượng đặt hàng tối thiểu - Minimum Order Quantity)
 * và Đơn giá theo bậc số lượng (Quantity-Based Tiered Pricing) cho phân hệ Báo giá Nhà cung cấp (RFQ).
 */

export interface RfqPriceTierInput {
  minQuantity: number;
  unitPrice: number;
}

export interface RfqPricingResolution {
  /** Số lượng đặt hàng tối thiểu đã chuẩn hóa (tối thiểu 1) */
  moq: number;
  /** Bảng bậc giá đã chuẩn hóa, loại trùng và sắp xếp tăng dần theo minQuantity */
  normalizedTiers: RfqPriceTierInput[];
  /** Đơn giá thực tế áp dụng cho số lượng đặt hàng hiện tại */
  effectiveUnitPrice: number;
  /** Mốc số lượng của bậc giá đang áp dụng (undefined nếu dùng đơn giá cơ bản) */
  appliedTierMinQuantity?: number;
  /** Trạng thái số lượng yêu cầu có đáp ứng MOQ hay không */
  isMoqMet: boolean;
  /** Số lượng còn thiếu để đạt MOQ (0 nếu đã đạt) */
  moqShortfall: number;
  /** Thành tiền dòng hàng sau khi áp dụng đơn giá bậc thang và % chiết khấu thương mại */
  lineTotal: number;
  /** Bậc giá tốt hơn tiếp theo nếu nhà thuốc tăng số lượng đặt (nếu có) */
  nextBetterTier?: RfqPriceTierInput;
}

/**
 * Chuẩn hóa danh sách bậc giá theo số lượng:
 * - Bỏ qua các bản ghi lỗi (NaN, minQuantity < 1, unitPrice < 0).
 * - Nếu trùng minQuantity, giữ lại mức đơn giá tốt hơn (hoặc cập nhật mới nhất).
 * - Sắp xếp tăng dần theo minQuantity.
 */
export function normalizeRfqPriceTiers(rawTiers?: any[]): RfqPriceTierInput[] {
  if (!Array.isArray(rawTiers) || rawTiers.length === 0) {
    return [];
  }

  const tierMap = new Map<number, number>();
  for (const tier of rawTiers) {
    if (!tier || typeof tier !== 'object') continue;
    const minQty = Math.floor(Number(tier.minQuantity));
    const price = Number(tier.unitPrice);

    if (!Number.isFinite(minQty) || minQty < 1) continue;
    if (!Number.isFinite(price) || price < 0) continue;

    tierMap.set(minQty, price);
  }

  return Array.from(tierMap.entries())
    .map(([minQuantity, unitPrice]) => ({ minQuantity, unitPrice }))
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * Xác định đơn giá thực tế theo số lượng (Tiered Pricing) và đánh giá điều kiện MOQ cho một mặt hàng RFQ.
 *
 * @param baseQuotedPrice Đơn giá chào cơ bản (VNĐ)
 * @param orderQuantity Số lượng đặt hàng yêu cầu từ nhà thuốc
 * @param rawPriceTiers Danh sách các bậc giá theo số lượng từ NCC
 * @param rawMoq Số lượng đặt hàng tối thiểu (MOQ) do NCC quy định
 * @param discountPercent Tỷ lệ % chiết khấu thương mại bổ sung (0 - 100)
 */
export function resolveRfqItemPricing(
  baseQuotedPrice: number,
  orderQuantity: number,
  rawPriceTiers?: any[],
  rawMoq?: number,
  discountPercent = 0,
): RfqPricingResolution {
  const safeBasePrice = Number.isFinite(Number(baseQuotedPrice))
    ? Math.max(0, Number(baseQuotedPrice))
    : 0;
  const safeQty = Number.isFinite(Number(orderQuantity))
    ? Math.max(0, Math.floor(Number(orderQuantity)))
    : 0;
  const parsedMoq = Number(rawMoq);
  const moq = Number.isFinite(parsedMoq) && parsedMoq >= 1 ? Math.floor(parsedMoq) : 1;

  const normalizedTiers = normalizeRfqPriceTiers(rawPriceTiers);

  // Tìm bậc giá có minQuantity <= safeQty lớn nhất (mức ưu đãi cao nhất đạt được)
  let effectiveUnitPrice = safeBasePrice;
  let appliedTierMinQuantity: number | undefined = undefined;

  for (const tier of normalizedTiers) {
    if (safeQty >= tier.minQuantity) {
      effectiveUnitPrice = tier.unitPrice;
      appliedTierMinQuantity = tier.minQuantity;
    } else {
      break;
    }
  }

  // Kiểm tra điều kiện MOQ (Số lượng đặt hàng tối thiểu)
  const isMoqMet = safeQty >= moq;
  const moqShortfall = isMoqMet ? 0 : moq - safeQty;

  // Tìm bậc giá ưu đãi hơn kế tiếp để gợi ý tối ưu chi phí cho bộ phận Thu mua
  const nextBetterTier = normalizedTiers.find(
    (tier) => tier.minQuantity > safeQty && tier.unitPrice < effectiveUnitPrice,
  );

  // Tính thành tiền dòng hàng sau chiết khấu thương mại
  const safeDiscount = Number.isFinite(Number(discountPercent))
    ? Math.max(0, Math.min(100, Number(discountPercent)))
    : 0;
  const lineTotal = Math.round(effectiveUnitPrice * safeQty * (1 - safeDiscount / 100));

  return {
    moq,
    normalizedTiers,
    effectiveUnitPrice,
    appliedTierMinQuantity,
    isMoqMet,
    moqShortfall,
    lineTotal,
    nextBetterTier,
  };
}
