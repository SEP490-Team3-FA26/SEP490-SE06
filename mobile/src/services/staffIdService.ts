// staffIdService.ts - Nghiệp vụ Thẻ Định Danh Nhân Sự GPP & Tra Cứu Nhân Viên
// Phục vụ Ban Giám Đốc & Quản Lý Chi Nhánh Quét / Tra Cứu CCHN & Thẻ Nhân Sự
// Chú thích mã nguồn: Tiếng Việt 100% theo chuẩn SEP490/WDP301

export interface StaffMemberRecord {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  phone: string;
  branchName: string;
  cchn: string;
  cchnExpiry: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'IN_SHIFT';
  statusLabel: string;
}

// Danh sách nhân sự chuẩn GPP dự phòng khi offline
export const DEFAULT_STAFF_GPP_LIST: StaffMemberRecord[] = [
  {
    id: 'EMP-00129',
    name: 'Trần Hồng Phước',
    role: 'pharmacist',
    roleLabel: 'Dược Sĩ Phụ Trách Chuyên Môn',
    phone: '0903 333 444',
    branchName: 'Cơ Sở Chi Nhánh Q1 (CN1)',
    cchn: '012984/HCM-CCHND',
    cchnExpiry: '2028-12-31',
    status: 'IN_SHIFT',
    statusLabel: 'Đang Trong Ca Trực (Đã Chấm GPS)',
  },
  {
    id: 'EMP-00188',
    name: 'Nguyễn Văn An',
    role: 'branch',
    roleLabel: 'Quản Lý Chi Nhánh',
    phone: '0902 222 333',
    branchName: 'Cơ Sở Chi Nhánh Q1 (CN1)',
    cchn: '009872/HCM-CCHND',
    cchnExpiry: '2027-06-30',
    status: 'ACTIVE',
    statusLabel: 'Đang Làm Việc',
  },
  {
    id: 'EMP-00210',
    name: 'Lê Hoàng Nam',
    role: 'warehouse',
    roleLabel: 'Quản Lý Kho Dược GSP',
    phone: '0938 111 222',
    branchName: 'Kho Tổng Trung Tâm (GSP)',
    cchn: '018442/HCM-CCHND',
    cchnExpiry: '2029-01-15',
    status: 'IN_SHIFT',
    statusLabel: 'Đang Trực Kho GSP',
  },
  {
    id: 'EMP-00305',
    name: 'Trần Thị Mai',
    role: 'pharmacist',
    roleLabel: 'Dược Sĩ Bán Lẻ Quầy Thuốc',
    phone: '0912 888 999',
    branchName: 'Cơ Sở Chi Nhánh Q3 (CN2)',
    cchn: '014520/HCM-CCHND',
    cchnExpiry: '2028-09-20',
    status: 'ACTIVE',
    statusLabel: 'Sẵn Sàng Tiếp Nhận Ca',
  },
];

// Hàm lọc nhân sự theo từ khóa
export function filterStaffMembers(list: StaffMemberRecord[], query: string): StaffMemberRecord[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.roleLabel.toLowerCase().includes(q) ||
      s.cchn.toLowerCase().includes(q)
  );
}

// Hàm sinh mã QR chuẩn cho Thẻ nhân viên
export function generateStaffQrPayload(staff: Partial<StaffMemberRecord>): string {
  return JSON.stringify({
    type: 'STAFF_ID',
    id: staff.id || 'EMP-UNKNOWN',
    name: staff.name || 'Nhân Sự Chi Nhánh',
    cchn: staff.cchn || 'CCHN-GPP',
    branch: staff.branchName || 'Chi Nhánh ABC',
    timestamp: Date.now(),
  });
}

// Hàm kiểm tra thẻ nhân sự có đạt chuẩn GPP Bộ Y Tế
export function validateStaffGppCompliance(staff: Partial<StaffMemberRecord>): {
  isValid: boolean;
  reason: string;
} {
  if (!staff.cchn || staff.cchn.trim() === '') {
    return { isValid: false, reason: 'Thiếu Chứng Chỉ Hành Nghề (CCHN) Bộ Y Tế' };
  }
  if (!staff.id || !staff.id.startsWith('EMP-')) {
    return { isValid: false, reason: 'Mã số nhân viên không hợp lệ' };
  }
  if (staff.cchnExpiry) {
    const expiry = new Date(staff.cchnExpiry).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return { isValid: false, reason: 'Chứng chỉ hành nghề đã hết hạn' };
    }
  }
  return { isValid: true, reason: 'Đạt chuẩn GPP Bộ Y Tế' };
}

