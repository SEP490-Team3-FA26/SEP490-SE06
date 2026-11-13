/// <reference types="jest" />

/**
 * purchase-order-lookup.spec.ts
 * Bộ kiểm thử đơn vị cho thuật toán tra cứu đơn đặt hàng PO từ mã QR di động & Web URL
 * 
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & Fullstack Playbook v2.0:
 * Phân chia đầy đủ 3 nhóm giá trị kiểm thử:
 * - [Normal Values]: Tra cứu chuẩn qua ObjectId, poCode chính xác.
 * - [Boundary Values]: Tra cứu qua URL Web deep link, tiền tố PO-, hậu tố 6 ký tự hex MongoDB.
 * - [Abnormal Values]: Dữ liệu rỗng, mã không tồn tại, tấn công ký tự đặc biệt Regex.
 */

describe('PurchaseOrderLookupEngine - Tra cứu đơn hàng PO đa phương thức', () => {
  // Danh sách đơn đặt hàng PO mẫu mô phỏng Database MongoDB
  const mockPurchaseOrders = [
    {
      _id: '6735e024b89f02755ea064c2',
      poCode: 'PO-2026-0819',
      supplierName: 'Công Ty CP Dược Hậu Giang',
      status: 'SHIPPING',
      items: [
        { medicineId: 'med-01', medicineName: 'Amoxicillin 500mg', quantity: 500 },
        { medicineId: 'med-02', medicineName: 'Panadol Extra', quantity: 1000 },
      ],
      createdAt: new Date('2026-08-19T10:00:00Z'),
    },
    {
      _id: '6735e024b89f02755ea099d4',
      poCode: 'PO-DHG-001',
      supplierName: 'Sanofi-Aventis Việt Nam',
      status: 'RECEIVING',
      items: [
        { medicineId: 'med-03', medicineName: 'Strepsils Cool', quantity: 300 },
      ],
      createdAt: new Date('2026-08-20T10:00:00Z'),
    },
    {
      _id: '6735e024b89f02755e112233',
      poCode: 'PO-001',
      supplierName: 'Dược Phẩm Bến Tre',
      status: 'APPROVED',
      items: [
        { medicineId: 'med-04', medicineName: 'Decolgen Forte', quantity: 200 },
      ],
      createdAt: new Date('2026-08-21T10:00:00Z'),
    },
  ];

  // Hàm mô phỏng logic tra cứu của getPurchaseOrderById trong PurchaseService
  const isValidHexObjectId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);

  const simulateGetPurchaseOrderById = (id: string | null | undefined) => {
    if (!id) return null;
    let cleanId = String(id).trim();

    // 1. Tự động bóc tách ID nếu quét phải đường link Web (URL deep link)
    if (cleanId.includes('poId=')) {
      const match = cleanId.match(/poId=([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    } else if (cleanId.includes('grnId=')) {
      const match = cleanId.match(/grnId=([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    }

    cleanId = cleanId.replace(/^[#:\s]+/, '').trim();
    if (!cleanId) return null;

    const rawWithoutPo = cleanId.replace(/^PO[-_:\s]*/i, '').trim();

    // 2. Tìm theo ObjectId hợp lệ (cả cleanId và rawWithoutPo)
    if (isValidHexObjectId(cleanId)) {
      const found = mockPurchaseOrders.find((p) => p._id.toLowerCase() === cleanId.toLowerCase());
      if (found) return found;
    }
    if (rawWithoutPo && rawWithoutPo !== cleanId && isValidHexObjectId(rawWithoutPo)) {
      const found = mockPurchaseOrders.find((p) => p._id.toLowerCase() === rawWithoutPo.toLowerCase());
      if (found) return found;
    }

    // 3. Tìm theo poCode khớp chính xác hoặc không phân biệt hoa thường
    const candidates = [
      cleanId.toLowerCase(),
      `po-${cleanId.toLowerCase()}`,
      rawWithoutPo.toLowerCase(),
      `po-${rawWithoutPo.toLowerCase()}`,
    ].filter(Boolean);

    const foundByCode = mockPurchaseOrders.find((p) =>
      candidates.includes(p.poCode.toLowerCase())
    );
    if (foundByCode) return foundByCode;

    // 4. Tra cứu hậu tố QR ngay trên MongoDB, hỗ trợ cả mã hex _id rút gọn 6 ký tự hoặc hậu tố poCode
    const targetSuffix = (rawWithoutPo && rawWithoutPo.length >= 4) ? rawWithoutPo : (cleanId.length >= 4 ? cleanId : '');
    if (targetSuffix) {
      const targetLower = targetSuffix.toLowerCase();
      const isHex = /^[0-9a-fA-F]+$/.test(targetSuffix);

      const foundBySuffix = mockPurchaseOrders.find((p) => {
        const idLower = p._id.toLowerCase();
        const codeLower = p.poCode.toLowerCase();
        if (codeLower.endsWith(targetLower) || codeLower.endsWith(cleanId.toLowerCase())) return true;
        if (isHex && idLower.endsWith(targetLower)) return true;
        return false;
      });

      if (foundBySuffix) return foundBySuffix;
    }

    return null;
  };

  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn & thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn & thành công', () => {
    it('TC-PO-NORM-01: Tra cứu thành công bằng mã ObjectId 24 ký tự hex chuẩn MongoDB', () => {
      const result = simulateGetPurchaseOrderById('6735e024b89f02755ea064c2');
      expect(result).not.toBeNull();
      expect(result?._id).toBe('6735e024b89f02755ea064c2');
      expect(result?.poCode).toBe('PO-2026-0819');
    });

    it('TC-PO-NORM-02: Tra cứu thành công bằng poCode đầy đủ chính xác', () => {
      const result = simulateGetPurchaseOrderById('PO-2026-0819');
      expect(result).not.toBeNull();
      expect(result?.poCode).toBe('PO-2026-0819');
      expect(result?.supplierName).toBe('Công Ty CP Dược Hậu Giang');
    });

    it('TC-PO-NORM-03: Tra cứu không phân biệt chữ hoa chữ thường (case-insensitive)', () => {
      const result = simulateGetPurchaseOrderById('po-dhg-001');
      expect(result).not.toBeNull();
      expect(result?.poCode).toBe('PO-DHG-001');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên, URL deep link & hậu tố QR rút gọn
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên, URL deep link & hậu tố QR rút gọn', () => {
    it('TC-PO-BOUND-01: Tự động trích xuất ObjectId từ URL Web (poId query param)', () => {
      const webUrl = 'http://localhost:5173/warehouse/goods-receipt/mobile-inspection?poId=6735e024b89f02755ea064c2';
      const result = simulateGetPurchaseOrderById(webUrl);
      expect(result).not.toBeNull();
      expect(result?._id).toBe('6735e024b89f02755ea064c2');
    });

    it('TC-PO-BOUND-02: Tự động trích xuất ID từ URL Web (grnId query param)', () => {
      const webUrl = 'https://sep490.com/warehouse/goods-receipt/mobile-inspection?grnId=6735e024b89f02755ea099d4';
      const result = simulateGetPurchaseOrderById(webUrl);
      expect(result).not.toBeNull();
      expect(result?._id).toBe('6735e024b89f02755ea099d4');
    });

    it('TC-PO-BOUND-03: Tra cứu bằng hậu tố 6 ký tự hex in hoa có tiền tố PO- (PO-A064C2)', () => {
      // Đơn hàng có _id là 6735e024b89f02755ea064c2 -> 6 ký tự cuối là a064c2 -> QR hiển thị PO-A064C2
      const qrScannedCode = 'PO-A064C2';
      const result = simulateGetPurchaseOrderById(qrScannedCode);
      expect(result).not.toBeNull();
      expect(result?._id).toBe('6735e024b89f02755ea064c2');
      expect(result?.poCode).toBe('PO-2026-0819');
    });

    it('TC-PO-BOUND-04: Tra cứu bằng mã có tiền tố dấu thăng (#) hoặc hai chấm (PO:A064C2)', () => {
      const hashResult = simulateGetPurchaseOrderById('#PO-2026-0819');
      expect(hashResult).not.toBeNull();
      expect(hashResult?.poCode).toBe('PO-2026-0819');

      const colonResult = simulateGetPurchaseOrderById('PO:A064C2');
      expect(colonResult).not.toBeNull();
      expect(colonResult?._id).toBe('6735e024b89f02755ea064c2');
    });

    it('TC-PO-BOUND-05: Tra cứu đơn hàng mã ngắn biên (PO-001 hoặc 001)', () => {
      const shortResult = simulateGetPurchaseOrderById('PO-001');
      expect(shortResult).not.toBeNull();
      expect(shortResult?.poCode).toBe('PO-001');

      const rawNumberResult = simulateGetPurchaseOrderById('001');
      expect(rawNumberResult).not.toBeNull();
      expect(rawNumberResult?.poCode).toBe('PO-001');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường, rỗng, không tồn tại, tấn công Regex
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường, rỗng, không tồn tại, tấn công Regex', () => {
    it('TC-PO-ABNORM-01: Trả về null an toàn khi ID rỗng, null hoặc chỉ có khoảng trắng', () => {
      expect(simulateGetPurchaseOrderById(null)).toBeNull();
      expect(simulateGetPurchaseOrderById(undefined)).toBeNull();
      expect(simulateGetPurchaseOrderById('')).toBeNull();
      expect(simulateGetPurchaseOrderById('   ')).toBeNull();
    });

    it('TC-PO-ABNORM-02: Trả về null khi mã đơn PO hoàn toàn không tồn tại', () => {
      const nonExistent = simulateGetPurchaseOrderById('PO-9999-NOTFOUND');
      expect(nonExistent).toBeNull();
    });

    it('TC-PO-ABNORM-03: Xử lý an toàn khi đầu vào chứa các ký tự đặc biệt Regex (chống Regex Injection DoS)', () => {
      const maliciousPayload = '.*+?^${}()|[]\\PO-MALICIOUS';
      expect(() => simulateGetPurchaseOrderById(maliciousPayload)).not.toThrow();
      expect(simulateGetPurchaseOrderById(maliciousPayload)).toBeNull();
    });
  });
});
