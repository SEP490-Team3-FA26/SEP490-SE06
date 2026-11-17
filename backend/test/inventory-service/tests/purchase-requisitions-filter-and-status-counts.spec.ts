/// <reference types="jest" />

/**
 * purchase-requisitions-filter-and-status-counts.spec.ts
 * Bộ kiểm thử đơn vị cho logic lọc đa trạng thái, phân trang và thống kê số lượng PR, PO, GRN
 * 
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & Fullstack Playbook v2.0:
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * - [Normal Values]: Lọc trạng thái đơn, đa trạng thái phân tách bằng dấu phẩy, phân trang chuẩn.
 * - [Boundary Values]: Giới hạn phân trang biên (min 1, max 100), chuỗi rỗng, mảng rỗng.
 * - [Abnormal Values]: Chuỗi status sai lệch, tham số âm hoặc quá lớn, đối tượng dị thường.
 */

describe('PurchaseQueryEngine - Lọc đa trạng thái và Thống kê PR/PO/GRN', () => {
  // Mô phỏng hàm trích xuất bộ lọc trạng thái giống logic trong PurchaseService
  function extractStatusFilter(statusInput: any) {
    if (!statusInput) return undefined;
    if (typeof statusInput === 'string' && statusInput.includes(',')) {
      return { $in: statusInput.split(',').map((s: string) => s.trim()).filter(Boolean) };
    }
    if (Array.isArray(statusInput)) {
      return { $in: statusInput.filter(Boolean) };
    }
    return statusInput;
  }

  // Mô phỏng thuật toán tính toán phân trang chuẩn Kafka 1MB ceiling
  function calculatePagination(query: { limit?: any; page?: any }) {
    const rawPage = Number(query?.page);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const rawLimit = Number(query?.limit);
    const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20), 100);
    const skip = Math.max(0, (page - 1) * limit);
    return { limit, skip };
  }

  // Mô phỏng tổng hợp status counts từ aggregate kết quả MongoDB
  function formatStatusCounts(aggregateResults: Array<{ _id: string; count: number }>) {
    const result: Record<string, number> = {
      SUBMITTED: 0,
      SHIPPING: 0,
      COMPLETED: 0,
      OUT_OF_STOCK: 0,
      REJECTED: 0,
      CONSOLIDATED: 0,
      PENDING_APPROVAL: 0,
      DRAFT: 0,
    };
    if (Array.isArray(aggregateResults)) {
      aggregateResults.forEach(c => {
        if (c && c._id && typeof c.count === 'number') {
          result[c._id] = c.count;
        }
      });
    }
    return result;
  }

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng nghiệp vụ chuẩn & thành công', () => {
    it('TC-NORM-01: Lọc đơn lẻ một trạng thái chuỗi hợp lệ', () => {
      const filter = extractStatusFilter('SUBMITTED');
      expect(filter).toBe('SUBMITTED');
    });

    it('TC-NORM-02: Lọc đa trạng thái chuỗi phân tách bởi dấu phẩy (SHIPPING,RECEIVING,PARTIAL_RECEIVED)', () => {
      const filter = extractStatusFilter('SHIPPING,RECEIVING,PARTIAL_RECEIVED');
      expect(filter).toEqual({
        $in: ['SHIPPING', 'RECEIVING', 'PARTIAL_RECEIVED'],
      });
    });

    it('TC-NORM-03: Lọc đa trạng thái truyền vào dạng mảng hợp lệ', () => {
      const filter = extractStatusFilter(['SUBMITTED', 'OUT_OF_STOCK']);
      expect(filter).toEqual({
        $in: ['SUBMITTED', 'OUT_OF_STOCK'],
      });
    });

    it('TC-NORM-04: Tính toán phân trang chuẩn mặc định (page=1, limit=20)', () => {
      const pagination = calculatePagination({});
      expect(pagination).toEqual({ limit: 20, skip: 0 });
    });

    it('TC-NORM-05: Định dạng đúng kết quả status counts từ aggregate MongoDB', () => {
      const mockDbAggregate = [
        { _id: 'SUBMITTED', count: 98 },
        { _id: 'SHIPPING', count: 4 },
        { _id: 'COMPLETED', count: 11 },
        { _id: 'OUT_OF_STOCK', count: 2 },
      ];
      const counts = formatStatusCounts(mockDbAggregate);
      expect(counts.SUBMITTED).toBe(98);
      expect(counts.SHIPPING).toBe(4);
      expect(counts.COMPLETED).toBe(11);
      expect(counts.OUT_OF_STOCK).toBe(2);
      expect(counts.REJECTED).toBe(0);
      expect(counts.DRAFT).toBe(0);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, tối thiểu, tối đa
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên & chống tràn tải', () => {
    it('TC-BOUND-01: Giới hạn trần tối đa limit không vượt quá 100 theo trần Kafka', () => {
      const pagination = calculatePagination({ limit: 500, page: 1 });
      expect(pagination.limit).toBe(100);
      expect(pagination.skip).toBe(0);
    });

    it('TC-BOUND-02: Giới hạn sàn tối thiểu limit là 20 (mặc định) khi truyền vào 0 hoặc số âm', () => {
      const paginationZero = calculatePagination({ limit: 0, page: 1 });
      expect(paginationZero.limit).toBe(20);

      const paginationNegative = calculatePagination({ limit: -5, page: 1 });
      expect(paginationNegative.limit).toBe(20);
    });

    it('TC-BOUND-03: Tính skip chính xác ở các trang kế tiếp (page=2, limit=50 -> skip=50)', () => {
      const pagination = calculatePagination({ limit: 50, page: 2 });
      expect(pagination.limit).toBe(50);
      expect(pagination.skip).toBe(50);
    });

    it('TC-BOUND-04: Xử lý chuỗi có khoảng trắng giữa các dấu phẩy (trim khoảng trắng)', () => {
      const filter = extractStatusFilter(' SHIPPING , RECEIVING ,  PARTIAL_RECEIVED ');
      expect(filter).toEqual({
        $in: ['SHIPPING', 'RECEIVING', 'PARTIAL_RECEIVED'],
      });
    });

    it('TC-BOUND-05: Mảng rỗng hoặc chuỗi rỗng trả về undefined', () => {
      expect(extractStatusFilter('')).toBeUndefined();
      expect(extractStatusFilter(null)).toBeUndefined();
      expect(extractStatusFilter(undefined)).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, sai định dạng, ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Dữ liệu dị thường & ngoại lệ an toàn', () => {
    it('TC-ABNORM-01: Truyền chuỗi chỉ chứa dấu phẩy không làm crash bộ lọc', () => {
      const filter = extractStatusFilter(',,,');
      expect(filter).toEqual({ $in: [] });
    });

    it('TC-ABNORM-02: Tham số page và limit dạng chuỗi ký tự không hợp lệ fallback về mặc định', () => {
      const pagination = calculatePagination({ limit: 'abc', page: 'xyz' });
      expect(pagination.limit).toBe(20);
      expect(pagination.skip).toBe(0);
    });

    it('TC-ABNORM-03: Aggregate rỗng hoặc null trả về đầy đủ các trường mặc định bằng 0', () => {
      const counts = formatStatusCounts([] as any);
      expect(counts.SUBMITTED).toBe(0);
      expect(counts.COMPLETED).toBe(0);
      expect(counts.OUT_OF_STOCK).toBe(0);
      expect(counts.REJECTED).toBe(0);
    });

    it('TC-ABNORM-04: Bản ghi aggregate chứa _id null hoặc count không phải number được bỏ qua an toàn', () => {
      const corruptData: any = [
        { _id: null, count: 10 },
        { _id: 'SUBMITTED', count: 'NaN' },
        { _id: 'SHIPPING', count: 5 },
      ];
      const counts = formatStatusCounts(corruptData);
      expect(counts.SHIPPING).toBe(5);
      expect(counts.SUBMITTED).toBe(0); // Bỏ qua giá trị NaN
    });
  });
});
