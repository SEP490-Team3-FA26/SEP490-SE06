// staffLeaveHelper.ts - Nghiệp Vụ Nghỉ Phép & Phân Bổ Quỹ Phép Năm Chuẩn Auth Blue
// Tuân thủ 100% Zero-Green Color Policy (Chỉ dùng Auth Blue #0284C7 & Theme Tokens)
// Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490

export interface LeaveTypeOption {
  id: string;
  label: string;
  desc: string;
  isPaid: boolean;
}

export const LEAVE_TYPE_OPTIONS: LeaveTypeOption[] = [
  { id: 'ANNUAL_PAID', label: 'Phép năm (Có lương)', desc: 'Trừ 1 ngày vào quỹ phép năm', isPaid: true },
  { id: 'SICK_LEAVE', label: 'Nghỉ ốm (BHXH)', desc: 'Cần giấy ra viện / chứng nhận y tế', isPaid: false },
  { id: 'UNPAID', label: 'Nghỉ không lương', desc: 'Nghỉ việc riêng không hưởng lương', isPaid: false },
  { id: 'SPECIAL_PAID', label: 'Việc riêng (Có lương)', desc: 'Cưới hỏi, tang chế theo Luật', isPaid: true },
];

export const SHIFT_OPTIONS_LIST = [
  { id: 'shift-1', name: 'Ca Sáng', start: '06:30', end: '14:30' },
  { id: 'shift-2', name: 'Ca Chiều', start: '14:30', end: '22:00' },
  { id: 'shift-3', name: 'Ca Đêm', start: '22:00', end: '06:30' },
];

export interface LeaveStatusTheme {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

// Bảng màu trạng thái đơn xin nghỉ - Tuyệt đối không dùng màu xanh lá cây
export function getLeaveStatusTheme(status: string): LeaveStatusTheme {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'APPROVED':
      // Trạng thái đã duyệt: Chuyển 100% sang Xanh Auth Blue chuẩn dự án
      return {
        label: 'Đã Duyệt',
        badgeBg: '#E0F2FE',    // Sky 100
        badgeText: '#0369A1',  // Sky 700
        borderColor: '#BAE6FD',// Sky 200
      };
    case 'REJECTED':
      return {
        label: 'Từ Chối',
        badgeBg: '#FEE2E2',    // Rose 100
        badgeText: '#DC2626',  // Rose 600
        borderColor: '#FECACA',
      };
    case 'CANCELLED':
      return {
        label: 'Đã Hủy',
        badgeBg: '#F1F5F9',    // Slate 100
        badgeText: '#64748B',  // Slate 500
        borderColor: '#E2E8F0',
      };
    case 'PENDING':
    default:
      return {
        label: 'Chờ Duyệt',
        badgeBg: '#FEF3C7',    // Amber 100
        badgeText: '#B45309',  // Amber 700
        borderColor: '#FDE68A',
      };
  }
}

// Tính số ngày phép còn lại
export function calculateRemainingLeaveDays(totalQuota: number, usedDays: number): number {
  const total = typeof totalQuota === 'number' && !isNaN(totalQuota) ? totalQuota : 12;
  const used = typeof usedDays === 'number' && !isNaN(usedDays) ? usedDays : 0;
  return Math.max(0, total - used);
}

// Kiểm tra tính hợp lệ của đơn xin nghỉ phép
export function validateLeaveForm(payload: {
  shiftDate?: string;
  shiftId?: string;
  leaveTypeId?: string;
  reason?: string;
}): { isValid: boolean; errorMessage?: string } {
  if (!payload.shiftDate || !payload.shiftDate.trim()) {
    return { isValid: false, errorMessage: 'Vui lòng chọn ngày xin nghỉ phép' };
  }

  // Kiểm tra định dạng ngày YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(payload.shiftDate.trim())) {
    return { isValid: false, errorMessage: 'Ngày xin nghỉ phải có định dạng YYYY-MM-DD' };
  }

  if (!payload.shiftId || !payload.shiftId.trim()) {
    return { isValid: false, errorMessage: 'Vui lòng chọn ca trực xin nghỉ' };
  }

  if (!payload.leaveTypeId || !payload.leaveTypeId.trim()) {
    return { isValid: false, errorMessage: 'Vui lòng chọn loại nghỉ phép' };
  }

  if (!payload.reason || payload.reason.trim().length < 3) {
    return { isValid: false, errorMessage: 'Lý do xin nghỉ phải từ 3 ký tự trở lên' };
  }

  return { isValid: true };
}

