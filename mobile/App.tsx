import React, { useEffect } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { MedicineReminderService } from './src/services/medicineReminder.service';

// Ignore known non-critical Expo Go warnings
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
  'Each child in a list should have a unique "key" prop',
  'Init notifications failed',
  'Fetch request has been canceled',
]);

// Đảm bảo thông báo hiện banner, rung và phát chuông ngay cả khi app đang mở trên màn hình (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const linking = {
  prefixes: ['wdp301://', 'https://abcpharmacy.store'],
  config: {
    screens: {
      OrderConfirmation: 'checkout',
    },
  },
};

import * as TaskManager from 'expo-task-manager';
import { FireEmergencyNotifeeService } from './src/services/fireEmergencyNotifee.service';
import { FireEmergencyModal } from './src/components/warehouse/FireEmergencyModal';

// Đăng ký TaskManager xử lý FCM Data-Only khi app chạy ngầm hoặc bị killed
const BACKGROUND_FIRE_TASK = 'BACKGROUND_FIRE_EMERGENCY_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_FIRE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Background fire notification task error:', error);
    return;
  }
  const payload = (data as any)?.notification?.data || (data as any)?.data || (data as any);
  if (payload?.type === 'FIRE_EMERGENCY') {
    await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
      title: payload.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
      body: payload.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!',
      deviceId: payload.deviceId,
      temp: payload.temp,
      isTest: payload.isTest === 'true',
    });
  }
});

Notifications.registerTaskAsync(BACKGROUND_FIRE_TASK).catch(() => {});

const App: React.FC = () => {
  useEffect(() => {
    // 0. Khởi tạo Notifee channels mức HIGH/CALL cho Android Full-Screen Alert
    FireEmergencyNotifeeService.initChannels().catch(() => {});

    // Khởi tạo các Notification Channels mức MAX của Expo cho báo cháy
    if (Platform.OS === 'android') {
      const fireChannelConfig = {
        name: 'Báo Động Hỏa Hoạn Khẩn Cấp',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        enableVibrate: true,
        lightColor: '#DC2626',
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        sound: 'alarm_gentle.wav',
      };

      Notifications.setNotificationChannelAsync('fire_emergency_siren_v6', fireChannelConfig).catch(() => {});
      Notifications.setNotificationChannelAsync('fire_emergency_alarm_v5', fireChannelConfig).catch(() => {});
      Notifications.setNotificationChannelAsync('fire_emergency_call_v4', fireChannelConfig).catch(() => {});

      Notifications.setNotificationChannelAsync('iot_temperature_critical', {
        name: 'Cảnh Báo Quá Nhiệt GSP',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        enableVibrate: true,
        lightColor: '#EF4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      }).catch((e) => console.warn('Init notification channel warning:', e));
    }

    // Lắng nghe thông báo khi app đang mở trên màn hình (Foreground)
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
          title: notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
          body: notification.request.content.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!',
          deviceId: String(payload.deviceId || ''),
          temp: String(payload.temp || ''),
          isTest: payload.isTest === 'true',
        });
      }
    });

    // 1. Khởi tạo Notification Channel, Action Categories và xin quyền
    MedicineReminderService.init().then(() => {
      MedicineReminderService.rescheduleAllActiveReminders();
    }).catch((err) => {
      console.warn('MedicineReminderService.init warning:', err);
    });

    // 2. Lắng nghe tương tác người dùng với thông báo (bấm Đã uống / Nhắc lại 10p / Báo cháy)
    let responseListener: { remove: () => void } | null = null;
    try {
      responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const payload = response.notification.request.content.data;
          if (payload?.type === 'FIRE_EMERGENCY') {
            FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
              title: response.notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
              body: response.notification.request.content.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!',
              deviceId: String(payload.deviceId || ''),
              temp: String(payload.temp || ''),
              isTest: payload.isTest === 'true',
            });
          } else {
            MedicineReminderService.handleNotificationResponse(response);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to add notification response listener:', e);
    }

    // 3. Tự động gia hạn cửa sổ trượt 7 ngày mỗi khi app foreground lại (AppState.active)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        MedicineReminderService.rescheduleAllActiveReminders();
      }
    });

    return () => {
      receivedListener.remove();
      responseListener?.remove();
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
      <Toast />
    </GestureHandlerRootView>
  );
};

export default App;
