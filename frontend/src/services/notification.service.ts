import api from './core/api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export interface NotificationDTO {
  _id: string;
  userId: string;
  type: 'NEW_PR' | 'PR_APPROVED' | 'PR_REJECTED' | 'NEW_PO' | 'GRN_COMPLETED';
  prId?: string;
  prCode?: string;
  poId?: string;
  grnId?: string;
  branchName?: string;
  branchId?: string;
  itemsCount?: number;
  totalAmount?: number;
  supplierName?: string;
  rejectionReason?: string;
  approvedBy?: string;
  receivedBy?: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification Service - CRUD API cho notifications
 * Fallback khi WebSocket không hoạt động
 */
class NotificationService {
  /**
   * Lấy danh sách notifications của user hiện tại
   */
  async getMyNotifications(params?: { 
    unreadOnly?: boolean; 
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.ME, { params });
    return response.data;
  }

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(notificationId: string) {
    const response = await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data;
  }

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  async markAllAsRead() {
    const response = await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  }

  /**
   * Xóa notification
   */
  async deleteNotification(notificationId: string) {
    const response = await api.delete(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data;
  }

  /**
   * Lấy số lượng notifications chưa đọc
   */
  async getUnreadCount() {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data;
  }

  /**
   * Polling: Lấy notifications mới (sau timestamp)
   */
  async getNewNotifications(afterTimestamp: string) {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.CREATE, {
      params: { after: afterTimestamp }
    });
    return response.data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
