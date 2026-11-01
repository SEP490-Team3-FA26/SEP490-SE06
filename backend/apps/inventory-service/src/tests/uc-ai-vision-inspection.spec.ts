/**
 * uc-ai-vision-inspection.spec.ts
 * Bộ kiểm thử đơn vị nghiệp vụ: AI Vision Inspection & Optical Counting (GSP Goods Receipt)
 * Tuân thủ quy chuẩn WDP301/SEP490 Playbook v2.0 & Test-Coupled Mandate (Zero Untested Code).
 * Phân chia đầy đủ 3 nhóm giá trị kiểm thử: [Normal Values], [Boundary Values], [Abnormal Values].
 */

describe('UC-AI-VISION: AI Vision Goods Receipt Inspection & Quantity Counting', () => {

  // Hàm nghiệp vụ thẩm định dung sai và đối soát số lượng AI kiểm đếm
  const evaluateInspectionDiscrepancy = (
    expectedQty: number,
    aiCountedQty: number,
    tolerancePercent: number = 0.02
  ) => {
    if (expectedQty < 0 || aiCountedQty < 0) {
      throw new Error('Số lượng sản phẩm không được là số âm');
    }
    const difference = aiCountedQty - expectedQty;
    const absDiff = Math.abs(difference);
    const pctDiff = expectedQty > 0 ? absDiff / expectedQty : 0;

    let status: 'MATCH' | 'WARNING' | 'MISMATCH';
    if (difference === 0) {
      status = 'MATCH';
    } else if (pctDiff <= tolerancePercent) {
      status = 'WARNING';
    } else {
      status = 'MISMATCH';
    }

    return {
      difference,
      absDiff,
      pctDiff: Number((pctDiff * 100).toFixed(2)),
      status,
      isAcceptable: status !== 'MISMATCH',
    };
  };

  // Hàm xác thực tính hợp lệ của dữ liệu lô và hạn dùng từ nhãn bao bì OCR
  const validateOcrBatchAndExpiry = (batchNo?: string, expDateStr?: string) => {
    if (!batchNo || !batchNo.trim()) {
      return { isValid: false, error: 'Số lô (Batch No.) không được để trống' };
    }
    if (!expDateStr || !expDateStr.trim()) {
      return { isValid: false, error: 'Hạn sử dụng không được để trống' };
    }

    const expDate = new Date(expDateStr);
    if (Number.isNaN(expDate.getTime())) {
      return { isValid: false, error: 'Định dạng ngày hết hạn không hợp lệ' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expDate <= today) {
      return { isValid: false, error: 'Dược phẩm đã hết hạn hoặc cận hạn nguy hiểm, vi phạm GSP' };
    }

    return { isValid: true, error: null };
  };

  // =========================================================================
  // 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] Luồng kiểm đếm chuẩn & thành công', () => {
    it('N-01: Nhận diện chính xác 100% số lượng kiện hàng (difference = 0, status = MATCH)', () => {
      const result = evaluateInspectionDiscrepancy(100, 100);
      expect(result.difference).toBe(0);
      expect(result.pctDiff).toBe(0);
      expect(result.status).toBe('MATCH');
      expect(result.isAcceptable).toBe(true);
    });

    it('N-02: Số lượng AI đếm lệch trong ngưỡng dung sai GSP cho phép (<= 2%)', () => {
      // 100 hộp dự kiến, AI đếm 101 hộp (lệch 1%)
      const result = evaluateInspectionDiscrepancy(100, 101, 0.02);
      expect(result.difference).toBe(1);
      expect(result.pctDiff).toBe(1.0);
      expect(result.status).toBe('WARNING');
      expect(result.isAcceptable).toBe(true);
    });

    it('N-03: Xác thực thành công dữ liệu số lô và hạn dùng tương lai từ nhãn OCR', () => {
      const res = validateOcrBatchAndExpiry('LOT-2026-PANA-99', '2028-12-31');
      expect(res.isValid).toBe(true);
      expect(res.error).toBeNull();
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Giá trị biên, tối thiểu, tối đa, ngưỡng dung sai 2%
  // =========================================================================
  describe('[Boundary Values] Giá trị biên & ngưỡng dung sai 2% GSP', () => {
    it('B-01: Biên tối thiểu số lượng kiểm đếm bằng 0 đơn vị (chưa giao hàng)', () => {
      const result = evaluateInspectionDiscrepancy(0, 0);
      expect(result.difference).toBe(0);
      expect(result.status).toBe('MATCH');
      expect(result.isAcceptable).toBe(true);
    });

    it('B-02: Biên chính xác ngưỡng dung sai tối đa 2.00% (Acceptable)', () => {
      // Dự kiến 1000 hộp, thực tế đếm 1020 hộp (lệch đúng 2%)
      const result = evaluateInspectionDiscrepancy(1000, 1020, 0.02);
      expect(result.pctDiff).toBe(2.0);
      expect(result.status).toBe('WARNING');
      expect(result.isAcceptable).toBe(true);
    });

    it('B-03: Biên vượt nhẹ ngưỡng dung sai 2.01% -> Trở thành MISMATCH', () => {
      // Dự kiến 1000 hộp, thực tế 1021 hộp (lệch 2.1%)
      const result = evaluateInspectionDiscrepancy(1000, 1021, 0.02);
      expect(result.status).toBe('MISMATCH');
      expect(result.isAcceptable).toBe(false);
    });

    it('B-04: Số lượng kiểm đếm lớn quy mô kho tổng (50,000 hộp)', () => {
      const result = evaluateInspectionDiscrepancy(50000, 50000);
      expect(result.status).toBe('MATCH');
      expect(result.difference).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, chênh lệch lớn, sai định dạng
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & vi phạm an toàn y tế', () => {
    it('A-01: Chênh lệch số lượng lớn (Thiếu hụt 30% hàng) -> Phải đánh dấu MISMATCH', () => {
      // PO yêu cầu 100 hộp, giao thực tế chỉ có 70 hộp
      const result = evaluateInspectionDiscrepancy(100, 70);
      expect(result.difference).toBe(-30);
      expect(result.pctDiff).toBe(30.0);
      expect(result.status).toBe('MISMATCH');
      expect(result.isAcceptable).toBe(false);
    });

    it('A-02: Báo lỗi khi truyền số lượng âm (Dữ liệu không hợp lệ)', () => {
      expect(() => evaluateInspectionDiscrepancy(100, -5)).toThrow(
        'Số lượng sản phẩm không được là số âm'
      );
    });

    it('A-03: Từ chối số lô rỗng hoặc chỉ toàn khoảng trắng', () => {
      const res = validateOcrBatchAndExpiry('   ', '2028-12-31');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Số lô (Batch No.) không được để trống');
    });

    it('A-04: Chặn thuốc hết hạn sử dụng (Ngày hết hạn trong quá khứ)', () => {
      const res = validateOcrBatchAndExpiry('LOT-OLD-2020', '2020-01-01');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Dược phẩm đã hết hạn');
    });

    it('A-05: Chặn định dạng ngày hết hạn rác / không hợp lệ', () => {
      const res = validateOcrBatchAndExpiry('LOT-INVALID-DATE', 'invalid-date-string');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Định dạng ngày hết hạn không hợp lệ');
    });
  });
});

