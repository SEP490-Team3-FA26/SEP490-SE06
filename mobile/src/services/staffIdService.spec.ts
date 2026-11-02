// staffIdService.spec.ts - Unit test kiểm thử nghiệp vụ Thẻ Định Danh Nhân Sự GPP
// Phân chia đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
// Tuân thủ 100% Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md)
// Chú thích mã nguồn: Tiếng Việt 100%

import {
  DEFAULT_STAFF_GPP_LIST,
  StaffMemberRecord,
  filterStaffMembers,
  generateStaffQrPayload,
  validateStaffGppCompliance,
} from './staffIdService';

describe('StaffIdService Test Suite', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng danh sách chuẩn, tìm kiếm hợp lệ, CCHN chuẩn GPP
  // =========================================================================
  describe('[Normal Values] Luồng nghiệp vụ chuẩn GPP', () => {
    it('Nên có danh sách nhân sự mặc định đầy đủ các vai trò (Dược sĩ, Quản lý chi nhánh, Quản lý kho)', () => {
      expect(DEFAULT_STAFF_GPP_LIST.length).toBeGreaterThanOrEqual(4);
      const roles = DEFAULT_STAFF_GPP_LIST.map((s) => s.role);
      expect(roles).toContain('pharmacist');
      expect(roles).toContain('branch');
      expect(roles).toContain('warehouse');
    });

    it('Nên lọc chính xác nhân sự theo tên Tiếng Việt có dấu hoặc không dấu', () => {
      const results = filterStaffMembers(DEFAULT_STAFF_GPP_LIST, 'phước');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Trần Hồng Phước');
      expect(results[0].id).toBe('EMP-00129');
    });

    it('Nên lọc chính xác theo mã số #EMP hoặc CCHN', () => {
      const resById = filterStaffMembers(DEFAULT_STAFF_GPP_LIST, 'EMP-00188');
      expect(resById.length).toBe(1);
      expect(resById[0].name).toBe('Nguyễn Văn An');

      const resByCchn = filterStaffMembers(DEFAULT_STAFF_GPP_LIST, '018442');
      expect(resByCchn.length).toBe(1);
      expect(resByCchn[0].role).toBe('warehouse');
    });

    it('Nên sinh chuỗi mã QR hợp lệ chứa đầy đủ thuộc tính định danh nhân sự', () => {
      const staff = DEFAULT_STAFF_GPP_LIST[0];
      const qrPayload = generateStaffQrPayload(staff);
      const parsed = JSON.parse(qrPayload);

      expect(parsed.type).toBe('STAFF_ID');
      expect(parsed.id).toBe('EMP-00129');
      expect(parsed.name).toBe('Trần Hồng Phước');
      expect(parsed.cchn).toBe('012984/HCM-CCHND');
      expect(parsed.branch).toBe('Cơ Sở Chi Nhánh Q1 (CN1)');
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it('Nên xác thực hợp lệ nhân viên có đầy đủ mã EMP và CCHN còn hạn', () => {
      const validStaff = DEFAULT_STAFF_GPP_LIST[0];
      const check = validateStaffGppCompliance(validStaff);
      expect(check.isValid).toBe(true);
      expect(check.reason).toBe('Đạt chuẩn GPP Bộ Y Tế');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, từ khóa rỗng, khoảng trắng, 1 ký tự
  // =========================================================================
  describe('[Boundary Values] Giá trị biên & Tìm kiếm rỗng', () => {
    it('Nên trả về toàn bộ danh sách khi từ khóa rỗng hoặc chỉ có khoảng trắng', () => {
      expect(filterStaffMembers(DEFAULT_STAFF_GPP_LIST, '').length).toBe(
        DEFAULT_STAFF_GPP_LIST.length
      );
      expect(filterStaffMembers(DEFAULT_STAFF_GPP_LIST, '   ').length).toBe(
        DEFAULT_STAFF_GPP_LIST.length
      );
    });

    it('Nên trả về mảng rỗng khi không tìm thấy bất kỳ nhân sự nào khớp từ khóa', () => {
      const results = filterStaffMembers(DEFAULT_STAFF_GPP_LIST, 'NON_EXISTENT_STAFF_99999');
      expect(results.length).toBe(0);
    });

    it('Nên hỗ trợ từ khóa 1 ký tự', () => {
      const results = filterStaffMembers(DEFAULT_STAFF_GPP_LIST, '0');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, thiếu thông tin CCHN, hết hạn
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường & Vi phạm chuẩn GPP', () => {
    it('Nên từ chối nhân sự thiếu CCHN (Chứng chỉ hành nghề)', () => {
      const staffWithoutCchn: Partial<StaffMemberRecord> = {
        id: 'EMP-00999',
        name: 'Nhân Viên Mới',
        cchn: '',
      };
      const check = validateStaffGppCompliance(staffWithoutCchn);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Thiếu Chứng Chỉ Hành Nghề');
    });

    it('Nên từ chối nhân sự có mã số thẻ không đúng tiền tố EMP-', () => {
      const invalidIdStaff: Partial<StaffMemberRecord> = {
        id: 'CUST-12345',
        name: 'Giả Mạo',
        cchn: '012345/HCM-CCHND',
      };
      const check = validateStaffGppCompliance(invalidIdStaff);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Mã số nhân viên không hợp lệ');
    });

    it('Nên từ chối khi CCHN đã quá hạn sử dụng', () => {
      const expiredStaff: Partial<StaffMemberRecord> = {
        id: 'EMP-00101',
        name: 'Dược Sĩ Cũ',
        cchn: '001000/HCM-CCHND',
        cchnExpiry: '2020-01-01', // Đã hết hạn năm 2020
      };
      const check = validateStaffGppCompliance(expiredStaff);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Chứng chỉ hành nghề đã hết hạn');
    });

    it('Nên sinh QR payload an toàn ngay cả khi object rỗng không ném exception', () => {
      expect(() => generateStaffQrPayload({})).not.toThrow();
      const parsed = JSON.parse(generateStaffQrPayload({}));
      expect(parsed.id).toBe('EMP-UNKNOWN');
      expect(parsed.name).toBe('Nhân Sự Chi Nhánh');
    });
  });
});

