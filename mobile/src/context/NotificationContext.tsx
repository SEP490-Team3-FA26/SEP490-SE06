// NotificationContext.tsx - Global notification state with real-time socket updates
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { ApiService } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import { AppNotification } from '../types/pharmacy.types';
import Toast from 'react-native-toast-message';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const [list, count] = await Promise.all([
        ApiService.getMyNotifications(),
        ApiService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const unsubscribe = SocketService.subscribe((notification) => {
      setUnreadCount((prev) => prev + 1);
      const newNotif: AppNotification = {
        id: notification.id || notification._id || `notif_${Date.now()}`,
        title: notification.title || 'Thông báo mới',
        message: notification.message || notification.content || '',
        type: notification.type || 'SYSTEM',
        isRead: false,
        createdAt: notification.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));

      Toast.show({
        type: notification.type === 'SENSOR_ALERT' ? 'error' : 'info',
        text1: notification.title || 'Thông báo mới',
        text2: notification.message || notification.content || '',
        position: 'top',
        visibilityTime: 4000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (id && !id.startsWith('notif_')) {
      try {
        await ApiService.markAsRead(id);
      } catch (err) {
        console.warn('Lỗi markAsRead:', err);
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    }
  };

  const markAllAsRead = async () => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await ApiService.markAllAsRead();
    } catch (err) {
      console.warn('Lỗi markAllAsRead:', err);
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  // Cung cấp giá trị mặc định an toàn nếu component nằm ngoài NotificationProvider
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      refreshNotifications: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
    };
  }
  return ctx;
};
