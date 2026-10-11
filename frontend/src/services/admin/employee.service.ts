import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface Employee {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  branchId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isApproved?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export const employeeService = {
  // Lấy danh sách nhân viên
  getEmployees: async (params?: { role?: string; branchId?: string; unassigned?: boolean }) => {
    const response = await api.get(API_ENDPOINTS.EMPLOYEES.LIST, { params });
    return response.data;
  },

  // Lấy chi tiết nhân viên
  getEmployeeById: async (id: string) => {
    const response = await api.get(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
    return response.data;
  },

  // Tạo nhân viên mới
  createEmployee: async (data: any) => {
    const response = await api.post(API_ENDPOINTS.EMPLOYEES.CREATE, data);
    return response.data;
  },

  // Cập nhật thông tin nhân viên
  updateEmployee: async (id: string, data: any) => {
    const response = await api.put(API_ENDPOINTS.EMPLOYEES.DETAIL(id), data);
    return response.data;
  },

  // Khóa / Mở khóa nhân viên
  toggleBanEmployee: async (id: string) => {
    const response = await api.put(API_ENDPOINTS.EMPLOYEES.BAN(id));
    return response.data;
  },

  // Xóa nhân viên
  deleteEmployee: async (id: string) => {
    const response = await api.delete(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
    return response.data;
  },

  // Phê duyệt / Từ chối nhân viên (chỉ Admin)
  approveEmployee: async (id: string, action: 'approve' | 'reject') => {
    const response = await api.put(API_ENDPOINTS.EMPLOYEES.APPROVE(id), { action });
    return response.data;
  },
};
