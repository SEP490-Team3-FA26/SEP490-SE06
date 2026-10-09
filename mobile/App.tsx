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
import { MedicineReminderService } from './src/services/medicineReminder.service';
import { FireEmergencyCallService } from './src/services/fireEmergencyCall.service';

// 0. Định nghĩa Background Notification Task để kích hoạt cuộc gọi kể cả khi tắt app
const FIRE_ALARM_BG_TASK = 'FIRE_ALARM_BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(FIRE_ALARM_BG_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BgTask] Lỗi xử lý notification background:', error);
    return;
  }
  try {
    const rawData = (data as any)?.notification?.data;
    if (rawData?.type === 'FIRE_EMERGENCY') {
      FireEmergencyCallService.showEmergencyCall({
        temp: String(rawData.temp || '65.0'),
        deviceId: String(rawData.deviceId || 'Kho Tổng GSP'),
        isTest: rawData.isTest === 'true',
      });
    }
  } catch (err) {
    console.warn('[BgTask] Lỗi kích hoạt cuộc gọi khẩn cấp:', err);
  }
});

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

const App: React.FC = () => {
  useEffect(() => {
    // Khoi tao CallKeep cho cuoc goi bao chay
    FireEmergencyCallService.init();

    // Dang ky background task cho notification
    Notifications.registerTaskAsync(FIRE_ALARM_BG_TASK).catch((e) => {
      console.warn('Register FIRE_ALARM_BG_TASK warning:', e);
    });

    // Lang nghe thong bao den lúc foreground de bat cuoc goi
    const notifReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        FireEmergencyCallService.showEmergencyCall({
          temp: String(payload.temp || '65.0'),
          deviceId: String(payload.deviceId || 'Kho Tổng GSP'),
          isTest: payload.isTest === 'true',
        });
      }
    });
    // 0. Khoi tao Android Notification Channel muc MAX cho canh bao qua nhiet GSP & Hoa hoan
    if (Platform.OS === 'android') {
      // Don dep cac channel loi cu
      Notifications.deleteNotificationChannelAsync('fire_emergency_call_v4').catch(() => {});
      Notifications.deleteNotificationChannelAsync('fire_emergency_alarm_v4').catch(() => {});
      Notifications.deleteNotificationChannelAsync('fire_emergency_alarm_v5').catch(() => {});

      Notifications.setNotificationChannelAsync('iot_temperature_critical', {
        name: 'Cảnh Báo Quá Nhiệt GSP',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        enableVibrate: true,
        lightColor: '#EF4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      }).catch((e) => console.warn('Init notification channel warning:', e));

      Notifications.setNotificationChannelAsync('fire_emergency_siren_v6', {
        name: 'Báo Động Hỏa Hoạn Khẩn Cấp',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        enableVibrate: true,
        lightColor: '#DC2626',
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        sound: 'alarm_gentle.wav',
      }).catch((e) => console.warn('Init fire alarm channel warning:', e));
    }

    // 1. Khởi tạo Notification Channel, Action Categories và xin quyền
    MedicineReminderService.init().then(() => {
      // Gia hạn lịch 7 ngày tới khi mở app
      MedicineReminderService.rescheduleAllActiveReminders();
    }).catch((err) => {
      console.warn('MedicineReminderService.init warning:', err);
    });

    // 2. Lắng nghe tương tác người dùng với thông báo (bấm Đã uống / Nhắc lại 10p)
    let responseListener: { remove: () => void } | null = null;
    try {
      responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          MedicineReminderService.handleNotificationResponse(response);
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
      notifReceivedSub.remove();
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
      <Toast />
    </GestureHandlerRootView>
  );
};

export default App;
