/**
 * adminEmployee.service.spec.ts - Kiểm Thử Đơn Vị Tầng Dịch Vụ Quản Trị Nhân Sự & Phân Quyền RBAC (Admin Service)
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Xác thực vai trò admin chuẩn từ role/rolesList/email, lọc nhân viên theo tên/email/phone.
 * 2. [Boundary Values]: Chuỗi rỗng, khoảng trắng, danh sách nhân viên rỗng, vai trò viết hoa/thường lẫn lộn.
 * 3. [Abnormal Values]: Dữ liệu null, undefined, vai trò không tồn tại, tấn công leo thang đặc quyền.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Employee } from '../../src/types/pharmacy.types';
import { AdminEmployeeService } from '../../src/services/adminEmployee.service';

describe('AdminEmployeeService - Tầng Dịch Vụ Quản Trị Nhân Sự & RBAC', () => {
  const sampleEmployees: Employee[] = [
    {
      id: 'emp-01',
      name: 'Nguyễn Văn Admin',
      email: 'admin@vinapharmacy.com',
      phone: '0901234567',
      role: 'admin',
      isActive: true,
    },
    {
      id: 'emp-02',
      name: 'Dược sĩ Trần Thị B',
      email: 'duocsi.b@vinapharmacy.com',
      phone: '0902345678',
      role: 'pharmacist',
      isActive: true,
    },
    {
      id: 'emp-03',
      name: 'Thủ kho Lê Văn C',
      email: 'thukho.c@vinapharmacy.com',
      phone: '0903456789',
      role: 'warehouse',
      isActive: false,
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] - Xác thực quyền & Lọc nhân sự chuẩn', () => {
    it('N-01: Nhận diện chính xác quản trị viên qua role admin hoặc email hệ thống', () => {
      expect(AdminEmployeeService.isAdminUser('admin')).toBe(true);
      expect(AdminEmployeeService.isAdminUser('pharmacist', ['admin'])).toBe(true);
      expect(AdminEmployeeService.isAdminUser(undefined, [], 'admin@vinapharmacy.com')).toBe(true);
    });

    it('N-02: Lọc danh sách nhân viên theo từ khóa họ tên, email hoặc số điện thoại', () => {
      const byName = AdminEmployeeService.filterEmployees(sampleEmployees, 'Trần Thị B');
      expect(byName).toHaveLength(1);
      expect(byName[0].id).toBe('emp-02');

      const byPhone = AdminEmployeeService.filterEmployees(sampleEmployees, '0903456789');
      expect(byPhone).toHaveLength(1);
      expect(byPhone[0].id).toBe('emp-03');
    });

    it('N-03: Lọc nhân viên theo vai trò role (pharmacist, warehouse)', () => {
      const pharmacists = AdminEmployeeService.filterEmployees(sampleEmployees, '', 'pharmacist');
      expect(pharmacists).toHaveLength(1);
      expect(pharmacists[0].name).toContain('Dược sĩ');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên
  // =========================================================================
  describe('2. [Boundary Values] - Kiểm tra giá trị biên', () => {
    it('B-01: Danh sách nhân viên rỗng trả về mảng rỗng an toàn', () => {
      expect(AdminEmployeeService.filterEmployees([], 'admin')).toEqual([]);
    });

    it('B-02: Nhận diện vai trò bất kể chữ hoa / chữ thường', () => {
      expect(AdminEmployeeService.isAdminUser('ADMIN')).toBe(true);
      expect(AdminEmployeeService.isAdminUser('Admin')).toBe(true);
    });

    it('B-03: Bộ lọc ALL hoặc từ khóa khoảng trắng giữ nguyên danh sách', () => {
      const result = AdminEmployeeService.filterEmployees(sampleEmployees, '   ', 'ALL');
      expect(result).toHaveLength(3);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Xử lý dữ liệu dị thường & Bảo mật
  // =========================================================================
  describe('3. [Abnormal Values] - Dữ liệu bất thường & Ngăn chặn leo quyền', () => {
    it('A-01: Phải từ chối quyền admin đối với các email chứa tiền tố admin@ nhưng không phải tài khoản quản trị hệ thống', () => {
      expect(AdminEmployeeService.isAdminUser(undefined, [], 'admin@gmail.com')).toBe(false);
      expect(AdminEmployeeService.isAdminUser(undefined, [], 'admin@attacker.com')).toBe(false);
      expect(AdminEmployeeService.isAdminUser(undefined, [], 'admin@khachhang.vn')).toBe(false);
      expect(AdminEmployeeService.isAdminUser('user', ['user'], 'admin@test.com')).toBe(false);
      expect(AdminEmployeeService.isAdminUser('customer')).toBe(false);
      expect(AdminEmployeeService.isAdminUser('')).toBe(false);
      expect(AdminEmployeeService.isAdminUser(undefined)).toBe(false);
    });

    it('A-02: Mảng nhân viên chứa phần tử null không làm crash hàm lọc', () => {
      const corruptedList: any[] = [null, undefined, sampleEmployees[0]];
      const result = AdminEmployeeService.filterEmployees(corruptedList, 'Admin');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-01');
    });
  });
});
