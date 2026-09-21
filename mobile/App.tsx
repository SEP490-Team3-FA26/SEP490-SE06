import React, { useEffect } from 'react';
import { AppState, LogBox } from 'react-native';
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

const linking = {
  prefixes: ['wdp301://', 'https://vinapharmacy.vn'],
  config: {
    screens: {
      OrderConfirmation: 'checkout',
    },
  },
};

const App: React.FC = () => {
  useEffect(() => {
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
