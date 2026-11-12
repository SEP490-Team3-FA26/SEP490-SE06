/**
 * adminEmployee.service.ts - Tầng Dịch Vụ Quản Trị Nhân Sự & Phân Quyền RBAC (Admin Service)
 * Chịu trách nhiệm nghiệp vụ:
 * 1. Xác thực quyền Admin (RBAC) theo role, danh sách roles hoặc email quản trị.
 * 2. Lọc danh sách nhân viên theo từ khóa (tên, email, số điện thoại, vai trò).
 * 3. Kiểm tra trạng thái hoạt động (kích hoạt / cấm).
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { Employee } from '../types/pharmacy.types';

export class AdminEmployeeService {
  /**
   * Kiểm tra quyền quản trị viên Admin (RBAC)
   */
  public static isAdminUser(
    role?: string,
    rolesList?: string[],
    email?: string
  ): boolean {
    const cleanRole = (role || '').toLowerCase();
    if (cleanRole === 'admin' || cleanRole === 'system_admin') {
      return true;
    }

    if (Array.isArray(rolesList)) {
      const hasAdmin = rolesList.some((r) => {
        const lower = (r || '').toLowerCase();
        return lower === 'admin' || lower === 'system_admin';
      });
      if (hasAdmin) return true;
    }

    if (email && typeof email === 'string') {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail === 'admin@vinapharmacy.com' || cleanEmail.startsWith('admin@')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Lọc danh sách nhân sự chi nhánh theo từ khóa tìm kiếm
   */
  public static filterEmployees(
    employees: Employee[],
    searchQuery = '',
    roleFilter = 'ALL'
  ): Employee[] {
    if (!Array.isArray(employees)) return [];
    const q = searchQuery.toLowerCase().trim();
    const cleanRole = roleFilter.toLowerCase().trim();

    return employees.filter((e) => {
      if (!e) return false;

      // Lọc theo role
      if (cleanRole !== 'all' && cleanRole.length > 0) {
        if ((e.role || '').toLowerCase() !== cleanRole) {
          return false;
        }
      }

      // Lọc theo từ khóa
      if (q.length > 0) {
        const nameMatch = (e.name || '').toLowerCase().includes(q);
        const emailMatch = (e.email || '').toLowerCase().includes(q);
        const phoneMatch = (e.phone || '').includes(q);
        const roleMatch = (e.role || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !roleMatch) {
          return false;
        }
      }

      return true;
    });
  }
}
