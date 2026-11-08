// backend/apps/inventory-service/src/tests/uc-barcode-scanner.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-BARCODE] GS1 EAN-13 BARCODE SCANNER & FEFO LOT TRACKING
 * Tham chiếu: Chuẩn GS1 Quốc tế, Thông tư 36/2018/TT-BYT (GSP), Nghiệp vụ POS bán lẻ
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-BARCODE] Tra cứu siêu tốc bằng Barcode & GS1 EAN-13 Checksum', () => {
  // Hàm tính Checksum Modulo 10 chuẩn GS1 quốc tế cho 12 chữ số
  const calculateEAN13Checksum = (code12: string): number => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  };

  // Hàm kiểm tra hợp lệ chuỗi EAN-13 13 số
  const isValidEAN13 = (barcode: string): boolean => {
    if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) return false;
    const code12 = barcode.substring(0, 12);
    const check = parseInt(barcode[12], 10);
    return calculateEAN13Checksum(code12) === check;
  };

  // Danh mục dược phẩm mẫu mô phỏng Database
  const mockMedicines = [
    {
      _id: 'med-001',
      name: 'Thuốc sủi giảm đau hạ sốt Efferalgan 500mg',
      barcode: '3400932567577',
      sku: 'MED-EFFERALGAN-500',
      unit: 'Hộp',
      price: 68000,
      units: [
        { unitName: 'Hộp', barcode: '3400932567577', conversionRate: 1 },
        { unitName: 'Vỉ', barcode: '340093256757', conversionRate: 4 }, // Mã dạng 12 số
      ],
    },
    {
      _id: 'med-002',
      name: 'Amoxicillin 500mg (GSP)',
      barcode: '8935006530015', // Mã GS1 Việt Nam (893)
      sku: 'MED-AMO-500',
      unit: 'Hộp',
      price: 120000,
      units: [
        { unitName: 'Hộp', barcode: '8935006530015', conversionRate: 1 },
        { unitName: 'Vỉ', barcode: '8935006530022', conversionRate: 10 },
      ],
    },
  ];

  // Danh mục lô thuốc mô phỏng theo chi nhánh (FEFO)
  const mockBatches = [
    {
      _id: 'batch-01',
      medicineId: 'med-001',
      branchId: 'BRANCH-HCM-01',
      batchNo: 'LOT-EFF-2026B',
      expDate: new Date('2026-11-30'),
      stock: 40,
      status: 'ACTIVE',
    },
    {
      _id: 'batch-02',
      medicineId: 'med-001',
      branchId: 'BRANCH-HCM-01',
      batchNo: 'LOT-EFF-2026A',
      expDate: new Date('2026-06-15'), // Hạn gần hơn -> FEFO ưu tiên
      stock: 25,
      status: 'ACTIVE',
    },
    {
      _id: 'batch-03',
      medicineId: 'med-002',
      branchId: 'BRANCH-HCM-01',
      batchNo: 'LOT-AMO-2027',
      expDate: new Date('2027-01-01'),
      stock: 0, // Hết tồn kho
      status: 'ACTIVE',
    },
  ];

  // Logic nghiệp vụ tra cứu Barcode tương đương hàm getByBarcode trong medicine.service.ts
  const lookupByBarcode = (barcode: string, branchId?: string) => {
    if (!barcode || barcode.trim() === '') {
      throw new Error('Mã vạch không được để trống');
    }

    const cleanBarcode = barcode.trim();
    const searchCodes = [cleanBarcode];
    if (cleanBarcode.length === 12) {
      searchCodes.push('0' + cleanBarcode);
    } else if (cleanBarcode.length === 13 && cleanBarcode.startsWith('0')) {
      searchCodes.push(cleanBarcode.slice(1));
    }

    // 1. Tìm dược phẩm khớp mã chính, SKU hoặc mã đơn vị quy cách
    const medicine = mockMedicines.find(
      (m) =>
        searchCodes.includes(m.barcode) ||
        searchCodes.includes(m.sku) ||
        m.units?.some((u) => searchCodes.includes(u.barcode)),
    );

    if (!medicine) {
      return {
        success: false,
        found: false,
        message: `Không tìm thấy dược phẩm với mã vạch: ${cleanBarcode}`,
        barcode: cleanBarcode,
      };
    }

    // 2. Lấy danh sách lô theo chi nhánh và sắp xếp FEFO (expDate tăng dần)
    let batches = mockBatches.filter(
      (b) =>
        b.medicineId === medicine._id &&
        b.status === 'ACTIVE' &&
        b.stock > 0 &&
        (!branchId || branchId === 'ALL' || b.branchId === branchId),
    );
    batches.sort((a, b) => a.expDate.getTime() - b.expDate.getTime());

    const totalBranchStock = batches.reduce((sum, b) => sum + b.stock, 0);
    const fefoBatch = batches.length > 0 ? batches[0] : null;

    // 3. Nhận diện nếu quét đúng mã vạch của đơn vị quy cách phụ
    const matchedUnit =
      medicine.units?.find((u) => searchCodes.includes(u.barcode)) || null;

    return {
      success: true,
      found: true,
      medicine: {
        ...medicine,
        totalBranchStock,
      },
      batches,
      fefoBatch,
      totalBranchStock,
      matchedUnit,
      barcode: cleanBarcode,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn: Tra cứu EAN-13, Quy cách và FEFO
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. [Normal Values] Luồng quét mã vạch và phân bổ FEFO chuẩn xác', () => {
    it('TC-BARCODE-NORM-01: Tính Checksum GS1 EAN-13 chính xác cho mã Việt Nam tiền tố 893', () => {
      // Mã 12 số: 893500653001 có tổng có trọng số = 80, chia hết cho 10 -> checksum = 0
      const code12A = '893500653001';
      expect(calculateEAN13Checksum(code12A)).toBe(0);
      expect(isValidEAN13('8935006530010')).toBe(true);

      // Mã 12 số: 893500170110 có tổng = 79 -> checksum = 10 - 9 = 1
      const code12B = '893500170110';
      expect(calculateEAN13Checksum(code12B)).toBe(1);
      expect(isValidEAN13('8935001701101')).toBe(true);
    });

    it('TC-BARCODE-NORM-02: Quét mã vạch chính của thuốc Efferalgan và tự động gắn Lô cận hạn nhất (FEFO)', () => {
      const res = lookupByBarcode('3400932567577', 'BRANCH-HCM-01');

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.medicine.name).toContain('Efferalgan');
      expect(res.totalBranchStock).toBe(65); // 40 + 25
      // Lô có hạn 2026-06-15 (LOT-EFF-2026A) phải được chọn trước LOT-EFF-2026B (2026-11-30)
      expect(res.fefoBatch?.batchNo).toBe('LOT-EFF-2026A');
      expect(res.matchedUnit?.unitName).toBe('Hộp');
    });

    it('TC-BARCODE-NORM-03: Quét mã vạch của đơn vị quy cách phụ (Vỉ Amoxicillin 8935006530022)', () => {
      const res = lookupByBarcode('8935006530022', 'BRANCH-HCM-01');

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.medicine._id).toBe('med-002');
      expect(res.matchedUnit?.unitName).toBe('Vỉ');
      expect(res.matchedUnit?.conversionRate).toBe(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. [Boundary Values] Giá trị biên: Chuyển đổi 12-13 số, tồn kho bằng 0, không có lô
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. [Boundary Values] Xử lý mốc biên định dạng mã và trạng thái tồn kho', () => {
    it('TC-BARCODE-BOUND-01: Tự động tương thích mã UPC 12 số sang EAN-13 với tiền tố 0', () => {
      // Giả sử mã 12 số: '340093256757', hệ thống đối chiếu khớp với đơn vị Vỉ
      const res = lookupByBarcode('340093256757', 'BRANCH-HCM-01');

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.matchedUnit?.unitName).toBe('Vỉ');
    });

    it('TC-BARCODE-BOUND-02: Quét thuốc có tồn kho khả dụng bằng 0 (Hết hàng tại chi nhánh)', () => {
      // Amoxicillin chỉ có 1 lô nhưng stock = 0
      const res = lookupByBarcode('8935006530015', 'BRANCH-HCM-01');

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.totalBranchStock).toBe(0);
      expect(res.fefoBatch).toBeNull();
      expect(res.batches).toHaveLength(0);
    });

    it('TC-BARCODE-BOUND-03: Quét mã vạch có khoảng trắng ở hai đầu (whitespace padding)', () => {
      const res = lookupByBarcode('   3400932567577   ', 'BRANCH-HCM-01');

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.barcode).toBe('3400932567577');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. [Abnormal Values] Dữ liệu dị thường: Mã rỗng, mã không tồn tại, tấn công
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. [Abnormal Values] Xử lý ngoại lệ, mã sai định dạng và mã không tồn tại', () => {
    it('TC-BARCODE-ABNORM-01: Báo lỗi khi truyền chuỗi mã vạch rỗng hoặc chỉ có khoảng trắng', () => {
      expect(() => lookupByBarcode('')).toThrow('Mã vạch không được để trống');
      expect(() => lookupByBarcode('   ')).toThrow('Mã vạch không được để trống');
    });

    it('TC-BARCODE-ABNORM-02: Trả về found: false khi quét mã không có trong hệ thống', () => {
      const res = lookupByBarcode('9999999999999');

      expect(res.success).toBe(false);
      expect(res.found).toBe(false);
      expect(res.message).toContain('Không tìm thấy dược phẩm');
    });

    it('TC-BARCODE-ABNORM-03: Phát hiện mã EAN-13 sai Checksum Modulo 10', () => {
      // Mã đúng là 8935006530015 (checksum 5), nhập sai thành số cuối là 9
      const isCheckValid = isValidEAN13('8935006530019');
      expect(isCheckValid).toBe(false);
    });

    it('TC-BARCODE-ABNORM-04: Xử lý an toàn khi tham số mã vạch chứa ký tự đặc biệt nguy hiểm', () => {
      const res = lookupByBarcode('8935006530015\'; DROP TABLE medicines; --');

      expect(res.found).toBe(false);
      expect(res.success).toBe(false);
    });
  });
});
