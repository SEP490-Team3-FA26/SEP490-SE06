import { describe, it, expect } from "vitest";
import {
  calculateCartPricing,
  toggleSelectAllItems,
  toggleItemSelection,
  getCartItemId,
  CartItemLike,
} from "./cartPricing";

describe("CartPricing Utility - [Test-Coupled Mandate]", () => {
  const sampleItems: CartItemLike[] = [
    {
      id: "med-1",
      name: "Thuốc Cefixim 200mg",
      price: 395000,
      quantity: 2,
    },
    {
      id: "med-2",
      name: "Cao dán thảo dược Ecosip",
      price: 213000,
      quantity: 1,
    },
    {
      id: "med-3",
      name: "Viên nén Paracetamol 500mg",
      price: 500,
      quantity: 10,
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe("[Normal Values]", () => {
    it("NV-01: Tính đúng giá khi tick chọn 1 sản phẩm", () => {
      // Chọn duy nhất med-1: 395.000 * 2 = 790.000đ
      const result = calculateCartPricing(sampleItems, ["med-1"]);

      expect(result.selectedCount).toBe(1);
      expect(result.totalCount).toBe(3);
      expect(result.selectedQuantityTotal).toBe(2);
      expect(result.subtotal).toBe(790000);
      // Member discount 5%: 790.000 * 0.05 = 39.500đ
      expect(result.memberDiscount).toBe(39500);
      // Thuế VAT 8% tính trên 790.000 - 39.500 = 750.500 * 0.08 = 60.040đ
      expect(result.vat).toBe(60040);
      // Tổng thanh toán: 750.500 + 60.040 = 810.540đ
      expect(result.total).toBe(810540);
      // Điểm tích lũy (1%): 8.105đ
      expect(result.earnedPoints).toBe(8105);
    });

    it("NV-02: Tính đúng giá khi tick chọn nhiều sản phẩm kết hợp", () => {
      // Chọn med-1 và med-2: 790.000 + 213.000 = 1.003.000đ
      const result = calculateCartPricing(sampleItems, ["med-1", "med-2"]);

      expect(result.selectedCount).toBe(2);
      expect(result.selectedQuantityTotal).toBe(3);
      expect(result.subtotal).toBe(1003000);
      // 1.003.000 * 0.05 = 50.150đ
      expect(result.memberDiscount).toBe(50150);
      // (1.003.000 - 50.150) * 0.08 = 952.850 * 0.08 = 76.228đ
      expect(result.vat).toBe(76228);
      // 952.850 + 76.228 = 1.029.078đ
      expect(result.total).toBe(1029078);
    });

    it("NV-03: Áp dụng voucher giảm giá hợp lệ kèm theo chiết khấu thành viên", () => {
      // Chọn med-1 (790.000đ), voucher giảm 50.000đ
      const result = calculateCartPricing(sampleItems, ["med-1"], 50000);

      expect(result.subtotal).toBe(790000);
      expect(result.memberDiscount).toBe(39500);
      expect(result.voucherDiscount).toBe(50000);
      // Sau giảm trừ: 790.000 - 39.500 - 50.000 = 700.500đ
      // VAT 8%: 700.500 * 0.08 = 56.040đ
      expect(result.vat).toBe(56040);
      // Tổng: 700.500 + 56.040 = 756.540đ
      expect(result.total).toBe(756540);
    });

    it("NV-04: toggleItemSelection thêm và bớt sản phẩm chính xác", () => {
      // Bắt đầu danh sách đang chọn med-1
      let selected = ["med-1"];

      // Thêm med-2
      selected = toggleItemSelection(selected, "med-2");
      expect(selected).toEqual(["med-1", "med-2"]);

      // Bỏ med-1
      selected = toggleItemSelection(selected, "med-1");
      expect(selected).toEqual(["med-2"]);
    });

    it("NV-05: toggleSelectAllItems chuyển đổi linh hoạt giữa chọn tất cả và bỏ chọn", () => {
      // Ban đầu chưa chọn hết -> Bấm chọn tất cả
      const allSelected = toggleSelectAllItems(sampleItems, ["med-1"]);
      expect(allSelected).toEqual(["med-1", "med-2", "med-3"]);

      // Đã chọn tất cả -> Bấm tiếp sẽ bỏ chọn toàn bộ
      const cleared = toggleSelectAllItems(sampleItems, allSelected);
      expect(cleared).toEqual([]);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, tối thiểu, tối đa, rỗng
  // =========================================================================
  describe("[Boundary Values]", () => {
    it("BV-01: Bỏ chọn toàn bộ sản phẩm (0 món được chọn) -> Tổng tiền về 0", () => {
      const result = calculateCartPricing(sampleItems, []);

      expect(result.selectedCount).toBe(0);
      expect(result.totalCount).toBe(3);
      expect(result.selectedQuantityTotal).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.memberDiscount).toBe(0);
      expect(result.voucherDiscount).toBe(0);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(0);
      expect(result.earnedPoints).toBe(0);
    });

    it("BV-02: Chọn toàn bộ sản phẩm trong giỏ hàng", () => {
      const allIds = ["med-1", "med-2", "med-3"];
      const result = calculateCartPricing(sampleItems, allIds);

      // 790.000 + 213.000 + (500 * 10 = 5.000) = 1.008.000đ
      expect(result.selectedCount).toBe(3);
      expect(result.subtotal).toBe(1008000);
      expect(result.memberDiscount).toBe(50400); // 1.008.000 * 0.05
    });

    it("BV-03: Giỏ hàng chỉ có đúng 1 sản phẩm", () => {
      const singleCart = [{ id: "med-only", name: "Thuốc X", price: 100000, quantity: 1 }];
      const result = calculateCartPricing(singleCart, ["med-only"]);

      expect(result.selectedCount).toBe(1);
      expect(result.subtotal).toBe(100000);
      expect(result.memberDiscount).toBe(5000);
      expect(result.total).toBe(102600); // 95.000 + 7.600
    });

    it("BV-04: Voucher discount cực lớn vượt quá giá trị đơn hàng -> Không được giảm quá mức âm tiền", () => {
      // Subtotal = 100.000đ, memberDiscount = 5.000đ, voucher = 500.000đ
      const singleCart = [{ id: "med-x", name: "Thuốc X", price: 100000, quantity: 1 }];
      const result = calculateCartPricing(singleCart, ["med-x"], 500000);

      expect(result.voucherDiscount).toBe(95000); // Tối đa 95.000đ
      expect(result.vat).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, rỗng, sai định dạng, ngoại lệ
  // =========================================================================
  describe("[Abnormal Values]", () => {
    it("AV-01: Danh sách giỏ hàng rỗng []", () => {
      const result = calculateCartPricing([], ["med-1"]);

      expect(result.selectedCount).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it("AV-02: selectedIds chứa các ID hoàn toàn không tồn tại trong giỏ", () => {
      const result = calculateCartPricing(sampleItems, ["ghost-id-999", "fake-id-888"]);

      expect(result.selectedCount).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it("AV-03: Sản phẩm có giá âm hoặc số lượng âm -> Tự động đưa về 0", () => {
      const corruptedItems: CartItemLike[] = [
        { id: "bad-1", name: "Thuốc lỗi", price: -50000, quantity: -2 },
      ];
      const result = calculateCartPricing(corruptedItems, ["bad-1"]);

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it("AV-04: Item chứa price hoặc quantity là NaN, null hoặc chuỗi không hợp lệ", () => {
      const dirtyItems: CartItemLike[] = [
        { id: "dirty-1", name: "Thuốc bẩn", price: NaN as any, quantity: "invalid" as any },
      ];
      const result = calculateCartPricing(dirtyItems, ["dirty-1"]);

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it("AV-05: getCartItemId trích xuất đúng id từ id, _id, hoặc medicineId", () => {
      expect(getCartItemId({ id: "id-1" } as any)).toBe("id-1");
      expect(getCartItemId({ _id: "mongo-1" } as any)).toBe("mongo-1");
      expect(getCartItemId({ medicineId: "med-1" } as any)).toBe("med-1");
      expect(getCartItemId(null as any)).toBe("");
    });
  });
});

