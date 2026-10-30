import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface Employee {
  _id: string;
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  role: string;
  branchId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isApproved?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffTransferRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  fromBranchId?: string;
  fromBranchName?: string;
  toBranchId: string;
  toBranchName?: string;
  targetBranchId?: string;
  targetBranchName?: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note?: string;
  responseNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
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

  // Tra cứu nhân sự để tiếp nhận / điều chuyển
  lookupEmployees: async (query: string): Promise<Employee[]> => {
    const response = await api.get(API_ENDPOINTS.EMPLOYEES.LOOKUP, { params: { query } });
    return response.data;
  },

  // Tạo yêu cầu điều chuyển nhân sự
  createTransferRequest: async (data: { employeeId: string; note?: string }): Promise<StaffTransferRequest> => {
    const response = await api.post(API_ENDPOINTS.EMPLOYEES.TRANSFERS, data);
    return response.data;
  },

  // Lấy danh sách yêu cầu điều chuyển
  getTransferRequests: async (params?: { status?: string }): Promise<StaffTransferRequest[]> => {
    const response = await api.get(API_ENDPOINTS.EMPLOYEES.TRANSFERS, { params });
    return response.data;
  },

  // Phản hồi yêu cầu điều chuyển (Duyệt / Từ chối)
  respondTransferRequest: async (
    id: string,
    data: { action: 'approve' | 'reject'; responseNote?: string; scheduleResolution?: 'cancel_upcoming_shifts' | 'defer' },
  ): Promise<any> => {
    const response = await api.put(API_ENDPOINTS.EMPLOYEES.TRANSFER_RESPOND(id), data);
    return response.data;
  },
};

