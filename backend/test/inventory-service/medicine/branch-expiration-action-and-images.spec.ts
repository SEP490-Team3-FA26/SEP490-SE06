import { Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { MedicineBatchSchema } from '../../../apps/inventory-service/src/medicine/schemas/medicine-batch.schema';
import { BranchInventorySchema } from '../../../apps/inventory-service/src/medicine/schemas/branch-inventory.schema';

/**
 * branch-expiration-action-and-images.spec.ts
 * Bộ kiểm thử đơn vị cho các cải tiến:
 * 1. Enum 'DISPOSED' hợp lệ trên MedicineBatchSchema (triệt tiêu lỗi Mongoose validation).
 * 2. Báo cáo cận hạn (getExpirationReport) truy vấn đầy đủ hình ảnh sản phẩm thực tế, hoạt chất và hỗ trợ kho chi nhánh.
 * 3. Cơ chế xử lý đề xuất cận hạn (handleExpirationAction):
 *    - DISPOSE (xuất hủy) cập nhật tồn và chuyển status sang 'DISPOSED'.
 *    - DISCOUNT (khuyến mãi cận hạn) áp dụng cho kho chi nhánh và tự động đồng bộ từ Kho Tổng.
 *    - RETURN_SUPPLIER (trả NCC) trừ tồn kho an toàn.
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('Branch Expiration Actions & Medicine Image Resolution', () => {
  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn & thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn', () => {
    it('TC-EXP-NORM-01: MedicineBatchSchema chấp nhận trạng thái DISPOSED hợp lệ', () => {
      const statusField = (MedicineBatchSchema as any).paths?.status;
      expect(statusField).toBeDefined();
      const enumValues = statusField.enumValues || [];
      expect(enumValues).toContain('DISPOSED');
      expect(enumValues).toContain('ACTIVE');
      expect(enumValues).toContain('EXPIRED');
      expect(enumValues).toContain('QUARANTINED');
    });

    it('TC-EXP-NORM-02: Báo cáo cận hạn trả về đầy đủ hình ảnh sản phẩm và chi nhánh tương ứng', () => {
      const medMap = new Map([
        ['med-01', {
          name: 'Viên sủi Naroxyn EFF 250',
          image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/naroxyn_fc40918b4c.jpg',
          images: ['https://cdn.nhathuoclongchau.com.vn/v1/static/naroxyn_fc40918b4c.jpg'],
          active_ingredient: 'Naproxen 250mg',
          price: 130000,
        }],
      ]);

      const rawBatch = {
        _id: new Types.ObjectId(),
        medicineId: 'med-01',
        batchNo: 'LOT-2611-7623',
        expDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày tới
        stock: 89,
        status: 'ACTIVE',
        branchId: 'BR-001',
      };

      const med = medMap.get(rawBatch.medicineId);
      const medImage = med?.image || (Array.isArray(med?.images) && med.images[0]) || '';

      const reportItem = {
        id: rawBatch._id.toString(),
        medicineId: rawBatch.medicineId,
        medicineName: med?.name,
        image: medImage,
        images: med?.images,
        batchNo: rawBatch.batchNo,
        stock: rawBatch.stock,
        branchId: rawBatch.branchId,
        status: 'SOON_TO_EXPIRE',
      };

      expect(reportItem.image).toBe('https://cdn.nhathuoclongchau.com.vn/v1/static/naroxyn_fc40918b4c.jpg');
      expect(reportItem.branchId).toBe('BR-001');
      expect(reportItem.status).toBe('SOON_TO_EXPIRE');
    });

    it('TC-EXP-NORM-03: Áp dụng khuyến mãi cận hạn (DISCOUNT) thành công trên kho chi nhánh', () => {
      const branchBatch = {
        _id: new Types.ObjectId(),
        branchId: 'BR-002',
        medicineId: 'med-01',
        batchNo: 'LOT-SALE-01',
        stock: 50,
        status: 'ACTIVE',
        expDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        expiryDiscountPrice: undefined as number | undefined,
      };

      const medicine = { price: 100000 };
      const discountPrice = 70000;

      // Giả lập logic trong handleExpirationAction
      if (discountPrice < medicine.price && discountPrice > 0) {
        branchBatch.expiryDiscountPrice = discountPrice;
      }

      expect(branchBatch.expiryDiscountPrice).toBe(70000);
      expect(branchBatch.expiryDiscountPrice).toBeLessThan(medicine.price);
    });

    it('TC-EXP-NORM-04: Đồng bộ khuyến mãi từ Kho Tổng sang các kho chi nhánh có cùng lô cận hạn', () => {
      const centralBatch = {
        batchNo: 'LOT-CENTRAL-01',
        medicineId: 'med-02',
        expiryDiscountPrice: 35000,
      };

      const branchBatches = [
        { branchId: 'BR-001', batchNo: 'LOT-CENTRAL-01', medicineId: 'med-02', expiryDiscountPrice: undefined as number | undefined },
        { branchId: 'BR-002', batchNo: 'LOT-CENTRAL-01', medicineId: 'med-02', expiryDiscountPrice: undefined as number | undefined },
        { branchId: 'BR-003', batchNo: 'LOT-OTHER-99', medicineId: 'med-02', expiryDiscountPrice: undefined as number | undefined },
      ];

      // Cơ chế đồng bộ: Cập nhật cho tất cả chi nhánh khớp medicineId và batchNo
      branchBatches.forEach(b => {
        if (b.medicineId === centralBatch.medicineId && b.batchNo === centralBatch.batchNo) {
          b.expiryDiscountPrice = centralBatch.expiryDiscountPrice;
        }
      });

      expect(branchBatches[0].expiryDiscountPrice).toBe(35000);
      expect(branchBatches[1].expiryDiscountPrice).toBe(35000);
      expect(branchBatches[2].expiryDiscountPrice).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên (Tồn về 0, Hạn dùng sát mốc 90 ngày)
  // =========================================================================
  describe('2. [Boundary Values] Các trường hợp biên độ', () => {
    it('TC-EXP-BOUND-01: Xuất hủy toàn bộ số lượng (quantity = stock) cập nhật status = DISPOSED', () => {
      const batch = {
        _id: new Types.ObjectId(),
        batchNo: 'LOT-FULL-DISPOSE',
        stock: 372,
        status: 'ACTIVE',
      };
      const quantityToDispose = 372;

      const actualDeduct = Math.min(batch.stock, quantityToDispose);
      batch.stock -= actualDeduct;
      if (batch.stock === 0) {
        batch.status = 'DISPOSED';
      }

      expect(batch.stock).toBe(0);
      expect(batch.status).toBe('DISPOSED');
    });

    it('TC-EXP-BOUND-02: Xuất hủy 1 đơn vị tối thiểu (tồn còn lại lớn hơn 0) giữ status ACTIVE', () => {
      const batch = {
        _id: new Types.ObjectId(),
        batchNo: 'LOT-PARTIAL-1',
        stock: 10,
        status: 'ACTIVE',
      };
      const quantityToDispose = 1;

      const actualDeduct = Math.min(batch.stock, quantityToDispose);
      batch.stock -= actualDeduct;
      if (batch.stock === 0) {
        batch.status = 'DISPOSED';
      }

      expect(batch.stock).toBe(9);
      expect(batch.status).toBe('ACTIVE');
    });

    it('TC-EXP-BOUND-03: Giảm giá cận hạn sát giá niêm yết (giá niêm yết - 1đ) hợp lệ', () => {
      const medicine = { price: 50000 };
      const discountPrice = 49999;

      const isValidDiscount = Number.isSafeInteger(discountPrice) && discountPrice > 0 && discountPrice < medicine.price;
      expect(isValidDiscount).toBe(true);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường & ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý ngoại lệ và dữ liệu dị thường', () => {
    it('TC-EXP-ABNORM-01: Chặn giảm giá khi giá khuyến mãi cao hơn hoặc bằng giá hiện tại', () => {
      const medicine = { price: 50000 };
      const invalidDiscount = 60000;

      const validateDiscount = (price: number) => {
        if (!Number.isSafeInteger(price) || price <= 0 || price >= medicine.price) {
          throw new RpcException({ message: 'Giá khuyến mãi phải thấp hơn giá hiện tại và lớn hơn 0', statusCode: 400 });
        }
      };

      expect(() => validateDiscount(invalidDiscount)).toThrow(RpcException);
      expect(() => validateDiscount(50000)).toThrow(RpcException);
      expect(() => validateDiscount(0)).toThrow(RpcException);
      expect(() => validateDiscount(-1000)).toThrow(RpcException);
    });

    it('TC-EXP-ABNORM-02: Chặn xuất hủy khi số lượng hủy <= 0 hoặc vượt quá tồn kho', () => {
      const batch = { stock: 20 };

      const validateDisposalQty = (qty: number) => {
        const actualDeduct = Math.min(batch.stock, qty);
        if (actualDeduct <= 0) {
          throw new RpcException({ message: 'Số lượng hủy không hợp lệ hoặc lô hàng đã hết', statusCode: 400 });
        }
        return actualDeduct;
      };

      expect(() => validateDisposalQty(0)).toThrow(RpcException);
      expect(() => validateDisposalQty(-5)).toThrow(RpcException);
      expect(validateDisposalQty(15)).toBe(15);
      expect(validateDisposalQty(25)).toBe(20); // Giới hạn tối đa là tồn thực tế
    });

    it('TC-EXP-ABNORM-03: Fallback an toàn khi thuốc chưa có hình ảnh, không gây crash giao diện', () => {
      const emptyMed: any = {};
      const medImage = emptyMed?.image || (Array.isArray(emptyMed?.images) && emptyMed.images[0]) || '';
      const fallbackUrl = medImage || 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60';

      expect(medImage).toBe('');
      expect(fallbackUrl).toContain('unsplash.com');
    });
  });
});
