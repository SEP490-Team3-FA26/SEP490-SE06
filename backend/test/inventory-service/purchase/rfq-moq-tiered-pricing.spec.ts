/// <reference types="jest" />
import {
  normalizeRfqPriceTiers,
  resolveRfqItemPricing,
} from '../../../apps/inventory-service/src/purchase/rfq-pricing.helper';
import { PurchaseService } from '../../../apps/inventory-service/src/purchase/purchase.service';

/**
 * rfq-moq-tiered-pricing.spec.ts
 * Bộ kiểm thử đơn vị cho nghiệp vụ MOQ (Số lượng đặt hàng tối thiểu - Minimum Order Quantity)
 * và Đơn giá theo bậc số lượng (Tiered Pricing) trong quy trình Yêu cầu báo giá (RFQ).
 * Tuân thủ Test-Coupled Mandate: Đủ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values].
 */
describe('RFQ MOQ & Quantity-Based Tiered Pricing Engine', () => {
  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Tính toán chuẩn MOQ & Đơn giá theo bậc số lượng', () => {
    it('TC-MOQ-NORM-01: Tự động chọn bậc giá cao nhất thỏa điều kiện minQuantity <= quantityRequested', () => {
      const tiers = [
        { minQuantity: 100, unitPrice: 48000 },
        { minQuantity: 500, unitPrice: 44000 },
        { minQuantity: 1000, unitPrice: 40000 },
      ];

      // Đặt 600 hộp -> ăn bậc >= 500 hộp (44.000đ), bậc tiếp theo tốt hơn là >= 1000 hộp (40.000đ)
      const res = resolveRfqItemPricing(52000, 600, tiers, 100, 0);

      expect(res.moq).toBe(100);
      expect(res.isMoqMet).toBe(true);
      expect(res.moqShortfall).toBe(0);
      expect(res.effectiveUnitPrice).toBe(44000);
      expect(res.appliedTierMinQuantity).toBe(500);
      expect(res.lineTotal).toBe(44000 * 600);
      expect(res.nextBetterTier).toEqual({ minQuantity: 1000, unitPrice: 40000 });
    });

    it('TC-MOQ-NORM-02: Kết hợp đơn giá bậc thang cùng % chiết khấu thương mại', () => {
      const tiers = [
        { minQuantity: 200, unitPrice: 50000 },
        { minQuantity: 500, unitPrice: 45000 },
      ];

      // Đặt 500 hộp với chiết khấu thêm 10% -> 45.000 * 500 * 0.9 = 20.250.000đ
      const res = resolveRfqItemPricing(55000, 500, tiers, 200, 10);

      expect(res.effectiveUnitPrice).toBe(45000);
      expect(res.appliedTierMinQuantity).toBe(500);
      expect(res.lineTotal).toBe(20250000);
      expect(res.isMoqMet).toBe(true);
    });

    it('TC-MOQ-NORM-03: Tự động sắp xếp bậc giá chưa theo thứ tự trước khi áp dụng', () => {
      const unsortedTiers = [
        { minQuantity: 1000, unitPrice: 38000 },
        { minQuantity: 50, unitPrice: 49000 },
        { minQuantity: 300, unitPrice: 45000 },
      ];

      const normalized = normalizeRfqPriceTiers(unsortedTiers);
      expect(normalized.map((t) => t.minQuantity)).toEqual([50, 300, 1000]);

      const res = resolveRfqItemPricing(52000, 350, unsortedTiers, 50);
      expect(res.effectiveUnitPrice).toBe(45000);
      expect(res.appliedTierMinQuantity).toBe(300);
    });

    it('TC-MOQ-NORM-04: PurchaseService.submitSupplierQuotation lưu đầy đủ MOQ, priceTiers và tính tổng chuẩn xác', async () => {
      const rfqDoc: any = {
        _id: '6af6f99bcaefa79c40a064c2',
        rfqCode: 'RFQ-20261118-0001',
        minShelfLifeMonths: 18,
        items: [
          {
            medicineId: 'MED-01',
            medicineName: 'Augmentin 625mg',
            quantityRequested: 500,
            declaredPrice: 120000,
            nationalDrugCode: 'VN-22012-19',
          },
        ],
        targetSuppliers: [
          { supplierId: 'SUPP-01', supplierName: 'Dược Hậu Giang', status: 'INVITED' },
        ],
        quotations: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRfqModel: any = {
        findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(rfqDoc) }),
      };

      const service = new PurchaseService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockRfqModel,
        {} as any,
        {} as any,
      );

      const res = await service.submitSupplierQuotation('6af6f99bcaefa79c40a064c2', {
        supplierId: 'SUPP-01',
        supplierName: 'Dược Hậu Giang',
        paymentTermsDays: 45,
        deliveryDays: 2,
        items: [
          {
            medicineId: 'MED-01',
            medicineName: 'Augmentin 625mg',
            quotedPrice: 115000,
            moq: 200,
            priceTiers: [
              { minQuantity: 200, unitPrice: 110000 },
              { minQuantity: 500, unitPrice: 100000 },
            ],
            discountPercent: 0,
            offeredShelfLifeMonths: 24,
            availableQuantity: 1000,
          },
        ],
        totalAmount: 999999, // Client truyền sai -> server phải tự tính lại chuẩn 500 * 100.000 = 50.000.000
      });

      expect(res.success).toBe(true);
      expect(rfqDoc.quotations).toHaveLength(1);
      const savedQuote = rfqDoc.quotations[0];
      expect(savedQuote.totalAmount).toBe(50000000);
      expect(savedQuote.items[0].moq).toBe(200);
      expect(savedQuote.items[0].effectiveUnitPrice).toBe(100000);
      expect(savedQuote.items[0].appliedTierMinQuantity).toBe(500);
      expect(savedQuote.items[0].isMoqMet).toBe(true);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên MOQ (đúng bằng, thiếu 1 đơn vị), 0 bậc giá, tự nâng SL đạt MOQ khi sinh PO
  // =========================================================================
  describe('2. [Boundary Values] Các mốc biên MOQ & bậc giá', () => {
    it('TC-MOQ-BOUND-01: Số lượng đặt đúng bằng MOQ (quantity === moq) -> đạt MOQ, shortfall = 0', () => {
      const res = resolveRfqItemPricing(50000, 100, [{ minQuantity: 100, unitPrice: 48000 }], 100);
      expect(res.isMoqMet).toBe(true);
      expect(res.moqShortfall).toBe(0);
      expect(res.effectiveUnitPrice).toBe(48000);
      expect(res.appliedTierMinQuantity).toBe(100);
    });

    it('TC-MOQ-BOUND-02: Số lượng đặt ít hơn MOQ đúng 1 đơn vị -> chưa đạt MOQ, shortfall = 1, dùng đơn giá cơ bản', () => {
      const res = resolveRfqItemPricing(50000, 99, [{ minQuantity: 100, unitPrice: 48000 }], 100);
      expect(res.isMoqMet).toBe(false);
      expect(res.moqShortfall).toBe(1);
      expect(res.effectiveUnitPrice).toBe(50000);
      expect(res.appliedTierMinQuantity).toBeUndefined();
      expect(res.nextBetterTier).toEqual({ minQuantity: 100, unitPrice: 48000 });
    });

    it('TC-MOQ-BOUND-03: Không có bậc giá (priceTiers rỗng) -> fallback đơn giá cơ bản, MOQ mặc định = 1', () => {
      const res = resolveRfqItemPricing(35000, 1, [], undefined);
      expect(res.moq).toBe(1);
      expect(res.isMoqMet).toBe(true);
      expect(res.effectiveUnitPrice).toBe(35000);
      expect(res.lineTotal).toBe(35000);
    });

    it('TC-MOQ-BOUND-04: PurchaseService.awardRfq với adjustToMoq=true tự động nâng SL đặt lên đúng MOQ và áp dụng bậc giá mới', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn(),
      };

      const rfqDoc: any = {
        _id: '6af6f99bcaefa79c40a064c3',
        rfqCode: 'RFQ-20261118-0002',
        branchId: 'CENTRAL_WH',
        items: [{ medicineId: 'MED-02', medicineName: 'Panadol Extra', quantityRequested: 80 }],
        quotations: [
          {
            quotationId: 'QUOTE-100',
            supplierId: 'SUPP-02',
            supplierName: 'Traphaco',
            paymentTermsDays: 30,
            totalAmount: 4000000,
            items: [
              {
                medicineId: 'MED-02',
                medicineName: 'Panadol Extra',
                quotedPrice: 50000,
                moq: 200, // Cao hơn SL yêu cầu 80
                priceTiers: [{ minQuantity: 200, unitPrice: 42000 }],
                discountPercent: 0,
                availableQuantity: 500,
              },
            ],
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRfqModel: any = {
        db: { startSession: jest.fn().mockResolvedValue(mockSession) },
        findOne: jest.fn().mockReturnValue({
          session: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(rfqDoc),
          }),
        }),
      };

      let capturedPoPayload: any = null;
      const MockPoModel: any = jest.fn().mockImplementation((payload) => {
        capturedPoPayload = payload;
        return {
          ...payload,
          _id: 'PO-AUTO-MOQ-01',
          save: jest.fn().mockResolvedValue({ ...payload, _id: 'PO-AUTO-MOQ-01' }),
        };
      });

      const service = new PurchaseService(
        {} as any,
        {} as any,
        MockPoModel,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockRfqModel,
        {} as any,
        {} as any,
      );

      const res = await service.awardRfq('6af6f99bcaefa79c40a064c3', {
        quotationId: 'QUOTE-100',
        supplierId: 'SUPP-02',
        adjustToMoq: true,
      });

      expect(res.success).toBe(true);
      expect(capturedPoPayload).toBeDefined();
      // SL tự động nâng từ 80 -> 200 (đạt MOQ), đồng thời ăn luôn bậc giá 42.000đ -> tổng 8.400.000đ
      expect(capturedPoPayload.items[0].quantity).toBe(200);
      expect(capturedPoPayload.items[0].unitPrice).toBe(42000);
      expect(capturedPoPayload.totalAmount).toBe(8400000);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, số âm, NaN, bậc giá trùng lặp/rác
  // =========================================================================
  describe('3. [Abnormal Values] Chống dữ liệu dị thường, âm, NaN, rác', () => {
    it('TC-MOQ-ABNORM-01: Lọc bỏ các bậc giá rác (minQuantity <= 0, unitPrice < 0, NaN, null) không gây crash', () => {
      const dirtyTiers: any[] = [
        null,
        undefined,
        { minQuantity: 0, unitPrice: 10000 },
        { minQuantity: -50, unitPrice: 10000 },
        { minQuantity: 100, unitPrice: -500 },
        { minQuantity: 'abc', unitPrice: 20000 },
        { minQuantity: 200, unitPrice: 40000 },
      ];

      const normalized = normalizeRfqPriceTiers(dirtyTiers);
      expect(normalized).toEqual([{ minQuantity: 200, unitPrice: 40000 }]);
    });

    it('TC-MOQ-ABNORM-02: Xử lý an toàn khi MOQ âm / 0 / NaN và discountPercent vượt biên (> 100 hoặc < 0)', () => {
      const resNeg = resolveRfqItemPricing(-10000, -5, [], -10, 150);
      expect(resNeg.moq).toBe(1);
      expect(resNeg.effectiveUnitPrice).toBe(0);
      expect(resNeg.lineTotal).toBe(0);
      expect(resNeg.isMoqMet).toBe(false);

      const resOverDiscount = resolveRfqItemPricing(50000, 10, [], NaN, 200);
      expect(resOverDiscount.moq).toBe(1);
      expect(resOverDiscount.lineTotal).toBe(0); // Kẹp chiết khấu trần 100% -> không ra số âm
    });

    it('TC-MOQ-ABNORM-03: Trùng mốc minQuantity trong priceTiers không sinh bản ghi trùng lặp', () => {
      const dupTiers = [
        { minQuantity: 100, unitPrice: 48000 },
        { minQuantity: 100, unitPrice: 46000 },
      ];

      const normalized = normalizeRfqPriceTiers(dupTiers);
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toEqual({ minQuantity: 100, unitPrice: 46000 });
    });
  });
});
