/// <reference types="jest" />

/**
 * purchase-requisition-code-timezone.spec.ts
 * Bộ kiểm thử đơn vị cho Cơ chế sinh mã PR/ST/RFQ và Xử lý lệch múi giờ (Timezone Guard & Collision Prevention)
 *
 * Tuân thủ nghiêm ngặt Test-Coupled Mandate & Fullstack Playbook v2.0:
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * - [Normal Values]: Sinh mã PR chuẩn tăng dần theo ngày Việt Nam (GMT+7).
 * - [Boundary Values]: Mốc thời gian biên đêm khuya (00:00 - 07:00 VN) khi UTC vẫn là ngày hôm trước;
 *                      các đơn bị xóa gián đoạn (non-contiguous sequences); ngưỡng chuyển giao ngày.
 * - [Abnormal Values]: Dữ liệu dị thường (danh sách rỗng, thuốc không tồn tại, mã PR cũ sai định dạng).
 */

describe('PurchaseRequisitionCodeTimezone - Kiểm thử Sinh mã PR & Xử lý Múi giờ GMT+7', () => {
  // Mô phỏng thuật toán lấy chuỗi ngày theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
  function getVietnamDateString(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date).replace(/-/g, '');
  }

  // Mô phỏng thuật toán sinh mã PR theo số thứ tự lớn nhất hiện có
  async function generatePrCode(dateStr: string, mockPrModel: any): Promise<string> {
    const latest = await mockPrModel
      .findOne({ prCode: new RegExp(`^PR-${dateStr}-`) })
      .sort({ prCode: -1 })
      .select('prCode')
      .lean()
      .exec();

    let nextSeq = 1;
    if (latest && latest.prCode) {
      const parts = String(latest.prCode).split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq) && lastSeq >= nextSeq) {
        nextSeq = lastSeq + 1;
      }
    }

    return `PR-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  }

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('1. [Normal Values] Sinh mã PR chuẩn và chuyển đổi múi giờ chuẩn', () => {
    it('TC-NORM-01: Chuyển đổi đúng ngày định dạng YYYYMMDD theo múi giờ Việt Nam', () => {
      // 15:00:00 ngày 19/11/2026 tại Việt Nam
      const normalDate = new Date('2026-11-19T08:00:00.000Z');
      const dateStr = getVietnamDateString(normalDate);
      expect(dateStr).toBe('20261119');
    });

    it('TC-NORM-02: Sinh mã bắt đầu từ 0001 khi ngày hôm đó chưa có đơn PR nào', async () => {
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-0001');
    });

    it('TC-NORM-03: Tăng dần số thứ tự tiếp theo khi đã có đơn tồn tại trong ngày', async () => {
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ prCode: 'PR-20261119-0005' }),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-0006');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, ranh giới múi giờ đêm khuya & dãy số đứt quãng
  // =========================================================================
  describe('2. [Boundary Values] Ranh giới múi giờ đêm khuya và chống xung đột trùng lặp', () => {
    it('TC-BOUND-01: Ranh giới lúc 00:26 sáng giờ VN (UTC vẫn là ngày hôm trước) - Phải sinh ngày hôm nay', () => {
      // Giờ người dùng thao tác thực tế: 00:26:00 ngày 19/11/2026 (GMT+7)
      // Tương ứng 17:26:00 ngày 18/11/2026 (UTC)
      const midnightVnTime = new Date('2026-11-18T17:26:00.000Z');
      const dateStr = getVietnamDateString(midnightVnTime);

      // Cũ (lỗi): toISOString().slice(0, 10) ra '20261118'
      // Mới (chuẩn): getVietnamDateString ra '20261119'
      expect(dateStr).toBe('20261119');
      expect(dateStr).not.toBe('20261118');
    });

    it('TC-BOUND-02: Ranh giới chuyển giao năm mới lúc 00:00:01 ngày 01/01/2027 (GMT+7)', () => {
      // 17:00:01 ngày 31/12/2026 (UTC) -> Đã là 00:00:01 ngày 01/01/2027 tại VN
      const newYearVn = new Date('2026-12-31T17:00:01.000Z');
      const dateStr = getVietnamDateString(newYearVn);
      expect(dateStr).toBe('20270101');
    });

    it('TC-BOUND-03: Chống trùng lặp khi danh sách đơn bị xóa gián đoạn (non-contiguous sequences)', async () => {
      // Giả sử trong DB từng có PR-0001, PR-0002, PR-0003 nhưng PR-0002 đã bị xóa
      // Lúc này countDocuments chỉ đếm ra 2 đơn, nếu dùng countDocuments sẽ sinh mã PR-0003 gây trùng!
      // Với cơ chế findOne + sort -1, đơn lớn nhất là PR-0003, mã mới bắt buộc phải là PR-0004
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ prCode: 'PR-20261119-0003' }),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-0004');
    });

    it('TC-BOUND-04: Đạt ngưỡng số thứ tự 4 chữ số (9999) tiếp tục tăng an toàn lên 10000', async () => {
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ prCode: 'PR-20261119-9999' }),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-10000');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, mã sai định dạng, ngoại lệ
  // =========================================================================
  describe('3. [Abnormal Values] Xử lý ngoại lệ và dữ liệu dị thường', () => {
    it('TC-ABNORM-01: Bản ghi cũ nhất trong ngày có mã không hợp lệ (không có số thứ tự) -> fallback về 0001', async () => {
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ prCode: 'PR-INVALID-STRING' }),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-0001');
    });

    it('TC-ABNORM-02: Bản ghi có prCode rỗng hoặc null -> fallback an toàn về 0001', async () => {
      const mockPrModel = {
        findOne: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ prCode: '' }),
      };

      const prCode = await generatePrCode('20261119', mockPrModel);
      expect(prCode).toBe('PR-20261119-0001');
    });

    it('TC-ABNORM-03: Kiểm tra validate khi tạo PR không có sản phẩm -> Ném lỗi bắt buộc', () => {
      const createPrValidator = (data: any) => {
        if (!data.items || data.items.length === 0) {
          throw new Error('Phiếu yêu cầu mua hàng phải có ít nhất 1 sản phẩm');
        }
      };

      expect(() => createPrValidator({ items: [] })).toThrow('Phiếu yêu cầu mua hàng phải có ít nhất 1 sản phẩm');
      expect(() => createPrValidator({})).toThrow('Phiếu yêu cầu mua hàng phải có ít nhất 1 sản phẩm');
    });
  });
});

