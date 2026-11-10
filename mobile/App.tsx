import React, { useEffect } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/CustomToast';
import { MedicineReminderService } from './src/services/medicineReminder.service';
import { FireEmergencyNotifeeService, FIRE_CHANNEL_ID } from './src/services/fireEmergencyNotifee.service';
import { FireEmergencyModal } from './src/components/warehouse/FireEmergencyModal';

// Bỏ qua các cảnh báo không nguy hiểm khi chạy môi trường dev
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
  'Each child in a list should have a unique "key" prop',
  'Fetch request has been canceled',
]);

// Riêng sự kiện FIRE_EMERGENCY: chặn Expo hiển thị thông báo mặc định để nhường quyền độc quyền cho Notifee Full-Screen Ringing
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    if (data?.type === 'FIRE_EMERGENCY') {
      return {
        shouldShowAlert: false,
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

const BACKGROUND_FIRE_TASK = 'BACKGROUND_FIRE_EMERGENCY_NOTIFICATION_TASK';

// Headless JS Task chạy ngầm khi app đã bị đóng / tắt hẳn (Killed) và nhận FCM Data-Only
TaskManager.defineTask(BACKGROUND_FIRE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Background fire notification task error:', error);
    return;
  }

  const payload =
    (data as any)?.data ||
    (data as any)?.notification?.data ||
    (data as any)?.notification?.request?.content?.data ||
    (data as any);

  if (payload?.type === 'FIRE_EMERGENCY') {
    await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
      title: String(payload.alertTitle || payload.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'),
      body: String(payload.alertBody || payload.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!'),
      deviceId: String(payload.deviceId || 'ESP32S3_404CCA44C814'),
      temp: String(payload.temp || '65.0'),
      isTest: payload.isTest === 'true' || payload.isTest === true,
    });
  }
});

Notifications.registerTaskAsync(BACKGROUND_FIRE_TASK).catch(() => {});

const linking = {
  prefixes: ['wdp301://', 'https://abcpharmacy.store', 'http://localhost:3001', 'http://localhost:3000'],
  config: {
    screens: {
      OrderConfirmation: 'checkout',
      WarehouseScreen: 'warehouse/goods-receipt/inspection',
    },
  },
};

const App: React.FC = () => {
  useEffect(() => {
    // 0. Khởi tạo Notifee channels và kiểm tra nếu app vừa được đánh thức từ Full-Screen Báo cháy
    FireEmergencyNotifeeService.initChannels().catch(() => {});
    FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch().catch(() => {});
    const initialCheckTimer = setTimeout(() => {
      FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch().catch(() => {});
    }, 450);

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(FIRE_CHANNEL_ID, {
        name: 'Báo Động Hỏa Hoạn Khẩn Cấp (Đổ Chuông)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        enableVibrate: true,
        lightColor: '#DC2626',
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        sound: 'default',
      }).catch(() => {});

      Notifications.setNotificationChannelAsync('iot_temperature_critical', {
        name: 'Cảnh Báo Quá Nhiệt GSP',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        enableVibrate: true,
        lightColor: '#EF4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      }).catch(() => {});
    }

    // Lắng nghe FCM khi app đang mở trên màn hình (Foreground)
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
          title: String(payload.alertTitle || notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'),
          body: String(payload.alertBody || notification.request.content.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!'),
          deviceId: String(payload.deviceId || 'ESP32S3_404CCA44C814'),
          temp: String(payload.temp || '65.0'),
          isTest: payload.isTest === 'true' || payload.isTest === true,
        });
      }
    });

    // Lắng nghe khi người dùng nhấn vào thông báo hệ thống
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response.notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
          title: String(payload.alertTitle || response.notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'),
          body: String(payload.alertBody || response.notification.request.content.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!'),
          deviceId: String(payload.deviceId || 'ESP32S3_404CCA44C814'),
          temp: String(payload.temp || '65.0'),
          isTest: payload.isTest === 'true' || payload.isTest === true,
        });
      }
    });

    // 1. Khởi tạo dịch vụ nhắc uống thuốc In-App
    MedicineReminderService.init().then(() => {
      MedicineReminderService.rescheduleAllActiveReminders();
    }).catch((err) => {
      console.warn('MedicineReminderService.init warning:', err);
    });

    // 2. Tự động kiểm tra lại báo cháy / nhắc thuốc khi app chuyển lên foreground (AppState.active)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch().catch(() => {});
        setTimeout(() => {
          FireEmergencyNotifeeService.checkPendingEmergencyOnLaunch().catch(() => {});
        }, 450);
        MedicineReminderService.rescheduleAllActiveReminders();
      }
    });

    return () => {
      clearTimeout(initialCheckTimer);
      receivedListener.remove();
      responseListener.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="dark" />
              <NavigationBar style="dark" />
              <AppNavigator />
            </NavigationContainer>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
      <FireEmergencyModal />
      <Toast config={toastConfig} topOffset={Platform.OS === 'ios' ? 52 : 36} />
    </GestureHandlerRootView>
  );
};

export default App;
