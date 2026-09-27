import api from '../core/api';

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
    const response = await api.get('/api/hr/shifts');
    return response.data as WorkShift[];
  },
  createShift: async (data: Partial<WorkShift>) => {
    const response = await api.post('/api/hr/shifts', data);
    return response.data;
  },
  updateShift: async (id: string, data: Partial<WorkShift>) => {
    const response = await api.patch(`/api/hr/shifts/${id}`, data);
    return response.data;
  },
  toggleShift: async (id: string) => {
    const response = await api.patch(`/api/hr/shifts/${id}/toggle`);
    return response.data;
  },

  // --- SCHEDULES ---
  getWeekSchedule: async (weekStart: string) => {
    const response = await api.get('/api/hr/schedules/week', { params: { weekStart } });
    return response.data as WorkSchedule;
  },
  upsertSchedule: async (data: { weekStart: string; assignments: any[] }) => {
    const response = await api.post('/api/hr/schedules', data);
    return response.data;
  },
  publishSchedule: async (weekStart: string) => {
    const response = await api.post('/api/hr/schedules/publish', { weekStart });
    return response.data;
  },
  getMyWeekSchedule: async (weekStart: string) => {
    const response = await api.get('/api/hr/schedules/my-week', { params: { weekStart } });
    return response.data as WorkSchedule;
  },

  // --- SWAPS ---
  listSwaps: async (status?: string) => {
    const response = await api.get('/api/hr/swaps', { params: { status } });
    return response.data as ShiftSwapRequest[];
  },
  listMySwaps: async () => {
    const response = await api.get('/api/hr/swaps/mine');
    return response.data as ShiftSwapRequest[];
  },
  createSwap: async (data: Partial<ShiftSwapRequest>) => {
    const response = await api.post('/api/hr/swaps', data);
    return response.data;
  },
  targetRespond: async (id: string, data: { response: string; rejectReason?: string }) => {
    const response = await api.patch(`/api/hr/swaps/${id}/target-respond`, data);
    return response.data;
  },
  managerRespond: async (id: string, data: { response: string; rejectReason?: string }) => {
    const response = await api.patch(`/api/hr/swaps/${id}/manager-respond`, data);
    return response.data;
  },

  // --- NOTIFICATIONS ---
  listNotifications: async (limit?: number, skip?: number) => {
    const response = await api.get('/api/hr/notifications', { params: { limit, skip } });
    return response.data as StaffNotification[];
  },
  markRead: async (notificationId?: string) => {
    const response = await api.patch('/api/hr/notifications/mark-read', { notificationId });
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/api/hr/notifications/unread-count');
    return response.data as number;
  }
};
