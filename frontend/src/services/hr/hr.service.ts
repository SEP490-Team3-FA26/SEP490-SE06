import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface WorkShift { 
  _id: string; 
  branchId: string; 
  name: string; 
  startTime: string; 
  endTime: string; 
  color: string; 
  isActive: boolean;
}

export interface WorkScheduleAssignment { 
  date: string; 
  shiftId: string; 
  shiftName: string; 
  shiftStart: string; 
  shiftEnd: string; 
  employeeId: string; 
  employeeName: string; 
  note: string;
}

export interface WorkSchedule { 
  _id: string; 
  branchId: string; 
  weekStart: string; 
  weekEnd: string; 
  status: 'draft'|'published'; 
  assignments: WorkScheduleAssignment[]; 
  publishedAt?: string; 
  publishedBy: string;
}

export interface ShiftSwapRequest { 
  _id: string; 
  branchId: string; 
  requesterId: string; 
  requesterName: string; 
  requesterShiftDate: string; 
  requesterShiftId: string; 
  requesterShiftName: string; 
  targetId: string; 
  targetName: string; 
  targetShiftDate: string; 
  targetShiftId: string; 
  targetShiftName: string; 
  reason: string; 
  status: 'pending_target'|'pending_manager'|'approved'|'rejected'; 
  targetResponse?: string; 
  targetRejectReason?: string; 
  managerResponse?: string; 
  managerRejectReason?: string; 
  createdAt: string;
}

export interface StaffNotification { 
  _id: string; 
  recipientId: string; 
  branchId: string; 
  type: string; 
  title: string; 
  message: string; 
  relatedId?: string; 
  isRead: boolean; 
  createdAt: string;
}

export const hrService = {
  // --- SHIFTS ---
  listShifts: async () => {
    const response = await api.get(API_ENDPOINTS.HR.SHIFTS);
    return response.data as WorkShift[];
  },
  createShift: async (data: Partial<WorkShift>) => {
    const response = await api.post(API_ENDPOINTS.HR.SHIFTS, data);
    return response.data;
  },
  updateShift: async (id: string, data: Partial<WorkShift>) => {
    const response = await api.patch(API_ENDPOINTS.HR.SHIFT_DETAIL(id), data);
    return response.data;
  },
  toggleShift: async (id: string) => {
    const response = await api.patch(`${API_ENDPOINTS.HR.SHIFT_DETAIL(id)}/toggle`);
    return response.data;
  },

  // --- SCHEDULES ---
  getWeekSchedule: async (weekStart: string, branchId?: string) => {
    const params: any = { weekStart };
    if (branchId && branchId !== 'all') params.branchId = branchId;
    const response = await api.get(API_ENDPOINTS.HR.WEEK_SCHEDULES, { params });
    return response.data as WorkSchedule;
  },
  upsertSchedule: async (data: { weekStart: string; assignments: any[] }) => {
    const response = await api.post(API_ENDPOINTS.HR.SCHEDULES, data);
    return response.data;
  },
  publishSchedule: async (weekStart: string) => {
    const response = await api.post(API_ENDPOINTS.HR.PUBLISH_SCHEDULE, { weekStart });
    return response.data;
  },
  getMyWeekSchedule: async (weekStart: string) => {
    const response = await api.get(`${API_ENDPOINTS.HR.SCHEDULES}/my-week`, { params: { weekStart } });
    return response.data as WorkSchedule;
  },

  // --- SWAPS ---
  listSwaps: async (status?: string) => {
    const response = await api.get(API_ENDPOINTS.HR.SWAPS, { params: { status } });
    return response.data as ShiftSwapRequest[];
  },
  listMySwaps: async () => {
    const response = await api.get(API_ENDPOINTS.HR.MY_SWAPS);
    return response.data as ShiftSwapRequest[];
  },
  createSwap: async (data: Partial<ShiftSwapRequest>) => {
    const response = await api.post(API_ENDPOINTS.HR.SWAPS, data);
    return response.data;
  },
  targetRespond: async (id: string, data: { response: string; rejectReason?: string }) => {
    const response = await api.patch(`${API_ENDPOINTS.HR.SWAPS}/${id}/target-respond`, data);
    return response.data;
  },
  managerRespond: async (id: string, data: { response: string; rejectReason?: string }) => {
    const response = await api.patch(`${API_ENDPOINTS.HR.SWAPS}/${id}/manager-respond`, data);
    return response.data;
  },

  // --- NOTIFICATIONS ---
  listNotifications: async (limit?: number, skip?: number) => {
    const response = await api.get(API_ENDPOINTS.HR.NOTIFICATIONS, { params: { limit, skip } });
    return response.data as StaffNotification[];
  },
  markRead: async (notificationId?: string) => {
    const response = await api.patch(API_ENDPOINTS.HR.MARK_NOTIFICATION_READ(notificationId || ''));
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get(API_ENDPOINTS.HR.UNREAD_NOTIFICATIONS);
    return response.data as number;
  },

  // --- COLLEAGUES ---
  getColleagues: async () => {
    const response = await api.get(API_ENDPOINTS.HR.COLLEAGUES);
    return response.data;
  }
};
