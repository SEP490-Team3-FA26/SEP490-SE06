// staffLeaveHelper.spec.ts - Unit Test Nghiệp Vụ Nghỉ Phép & Chính Sách Zero-Green
// Tuân thủ 100% quy chuẩn Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md):
// 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
// Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490

import {
  getLeaveStatusTheme,
  calculateRemainingLeaveDays,
  validateLeaveForm,
  LEAVE_TYPE_OPTIONS,
  SHIFT_OPTIONS_LIST,
} from '../../src/services/staffLeaveHelper';

describe('Staff Leave Helper - sep.md Standard Unit Tests', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn & Màu sắc Auth Blue
  // =========================================================================
  describe('[Normal Values] - Luồng nghiệp vụ chuẩn & Tông màu Auth Blue', () => {
    it('1.1. Trạng thái APPROVED phải trả về nhãn "Đã Duyệt" và màu Auth Blue', () => {
      const theme = getLeaveStatusTheme('APPROVED');
      expect(theme.label).toBe('Đã Duyệt');
      expect(theme.badgeBg).toBe('#E0F2FE');    // Sky 100 (Auth Blue tint)
      expect(theme.badgeText).toBe('#0369A1');  // Sky 700 (Auth Blue text)
      expect(theme.borderColor).toBe('#BAE6FD');
    });

    it('1.2. Trạng thái PENDING trả về màu cảnh báo Amber', () => {
      const theme = getLeaveStatusTheme('PENDING');
      expect(theme.label).toBe('Chờ Duyệt');
      expect(theme.badgeBg).toBe('#FEF3C7');
      expect(theme.badgeText).toBe('#B45309');
    });

    it('1.3. Trạng thái REJECTED trả về màu từ chối Rose', () => {
      const theme = getLeaveStatusTheme('REJECTED');
      expect(theme.label).toBe('Từ Chối');
      expect(theme.badgeBg).toBe('#FEE2E2');
      expect(theme.badgeText).toBe('#DC2626');
    });

    it('1.4. Tính đúng số ngày phép còn lại khi sử dụng trong hạn mức', () => {
      expect(calculateRemainingLeaveDays(12, 3)).toBe(9);
      expect(calculateRemainingLeaveDays(15, 5)).toBe(10);
      expect(calculateRemainingLeaveDays(12, 0)).toBe(12);
    });

    it('1.5. Validate thành công đơn xin nghỉ hợp lệ đầy đủ thông tin', () => {
      const result = validateLeaveForm({
        shiftDate: '2026-11-15',
        shiftId: 'shift-1',
        leaveTypeId: 'ANNUAL_PAID',
        reason: 'Nghỉ khám sức khỏe định kỳ',
      });
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('1.6. Danh sách loại nghỉ phép và ca trực có đầy đủ các lựa chọn', () => {
      expect(LEAVE_TYPE_OPTIONS).toHaveLength(4);
      expect(SHIFT_OPTIONS_LIST).toHaveLength(3);
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên & Không dùng màu xanh lá cây
  // =========================================================================
  describe('[Boundary Values] - Giá trị biên & Chính sách Zero-Green', () => {
    const FORBIDDEN_GREEN_HEXES = [
      '#059669', '#10B981', '#047857', '#ECFDF5', '#D1FAE5',
      '#A7F3D0', '#34D399', '#065F46', '#16A34A', '#22C55E',
      '#86EFAC', '#15803D', '#14532D', '#166534', '#BBF7D0',
    ];

    it.each(['APPROVED', 'PENDING', 'REJECTED', 'CANCELLED'])(
      '2.1. Trạng thái %s tuyệt đối không dùng bất kỳ mã màu xanh lá cây nào',
      (status) => {
        const theme = getLeaveStatusTheme(status);
        for (const green of FORBIDDEN_GREEN_HEXES) {
          expect(theme.badgeBg.toUpperCase()).not.toBe(green.toUpperCase());
          expect(theme.badgeText.toUpperCase()).not.toBe(green.toUpperCase());
          expect(theme.borderColor.toUpperCase()).not.toBe(green.toUpperCase());
        }
      }
    );

    it('2.2. Dùng hết toàn bộ ngày phép (used = total) trả về 0 ngày còn lại', () => {
      expect(calculateRemainingLeaveDays(12, 12)).toBe(0);
    });

    it('2.3. Số ngày dùng vượt quá hạn mức không bị âm (chặn ở 0)', () => {
      expect(calculateRemainingLeaveDays(12, 15)).toBe(0);
      expect(calculateRemainingLeaveDays(10, 20)).toBe(0);
    });

    it('2.4. Lý do xin nghỉ đúng 3 ký tự (biên tối thiểu hợp lệ)', () => {
      const res = validateLeaveForm({
        shiftDate: '2026-11-20',
        shiftId: 'shift-2',
        leaveTypeId: 'SICK_LEAVE',
        reason: 'Ốm sốt',
      });
      expect(res.isValid).toBe(true);
    });

    it('2.5. Không phân biệt chữ hoa thường khi truyền trạng thái', () => {
      const upper = getLeaveStatusTheme('APPROVED');
      const lower = getLeaveStatusTheme('approved');
      expect(upper).toEqual(lower);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường, rỗng, null, undefined
  // =========================================================================
  describe('[Abnormal Values] - Xử lý dữ liệu dị thường & bảo vệ ứng dụng', () => {
    it('3.1. Trạng thái không xác định hoặc null fallback về PENDING (Chờ Duyệt)', () => {
      const nullTheme = getLeaveStatusTheme(null as any);
      expect(nullTheme.label).toBe('Chờ Duyệt');

      const undefinedTheme = getLeaveStatusTheme(undefined as any);
      expect(undefinedTheme.label).toBe('Chờ Duyệt');

      const unknownTheme = getLeaveStatusTheme('UNKNOWN_STATUS_XYZ');
      expect(unknownTheme.label).toBe('Chờ Duyệt');
    });

    it('3.2. Quota hoặc used là NaN, undefined hoặc chuỗi trả về giá trị mặc định an toàn', () => {
      expect(calculateRemainingLeaveDays(undefined as any, 2)).toBe(10);
      expect(calculateRemainingLeaveDays(12, undefined as any)).toBe(12);
      expect(calculateRemainingLeaveDays(NaN as any, NaN as any)).toBe(12);
    });

    it('3.3. Từ chối đơn xin nghỉ thiếu ngày trực hoặc ngày sai định dạng', () => {
      const noDate = validateLeaveForm({
        shiftId: 'shift-1',
        leaveTypeId: 'ANNUAL_PAID',
        reason: 'Nghỉ phép',
      });
      expect(noDate.isValid).toBe(false);
      expect(noDate.errorMessage).toContain('ngày xin nghỉ');

      const invalidDateFormat = validateLeaveForm({
        shiftDate: '15/11/2026', // Sai format, cần YYYY-MM-DD
        shiftId: 'shift-1',
        leaveTypeId: 'ANNUAL_PAID',
        reason: 'Nghỉ phép',
      });
      expect(invalidDateFormat.isValid).toBe(false);
      expect(invalidDateFormat.errorMessage).toContain('YYYY-MM-DD');
    });

    it('3.4. Từ chối đơn xin nghỉ thiếu ca trực hoặc thiếu loại nghỉ phép', () => {
      const noShift = validateLeaveForm({
        shiftDate: '2026-11-15',
        leaveTypeId: 'ANNUAL_PAID',
        reason: 'Nghỉ phép',
      });
      expect(noShift.isValid).toBe(false);
      expect(noShift.errorMessage).toContain('ca trực');

      const noType = validateLeaveForm({
        shiftDate: '2026-11-15',
        shiftId: 'shift-1',
        reason: 'Nghỉ phép',
      });
      expect(noType.isValid).toBe(false);
      expect(noType.errorMessage).toContain('loại nghỉ phép');
    });

    it('3.5. Từ chối đơn có lý do rỗng hoặc dưới 3 ký tự', () => {
      const emptyReason = validateLeaveForm({
        shiftDate: '2026-11-15',
        shiftId: 'shift-1',
        leaveTypeId: 'ANNUAL_PAID',
        reason: '  ',
      });
      expect(emptyReason.isValid).toBe(false);
      expect(emptyReason.errorMessage).toContain('Lý do xin nghỉ');

      const shortReason = validateLeaveForm({
        shiftDate: '2026-11-15',
        shiftId: 'shift-1',
        leaveTypeId: 'ANNUAL_PAID',
        reason: 'ab',
      });
      expect(shortReason.isValid).toBe(false);
      expect(shortReason.errorMessage).toContain('3 ký tự');
    });
  });
});

