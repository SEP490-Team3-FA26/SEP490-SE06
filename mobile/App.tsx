import React, { useEffect } from 'react';
import { AppState } from 'react-native';
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
    });

    // 2. Lắng nghe tương tác người dùng với thông báo (bấm Đã uống / Nhắc lại 10p)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        MedicineReminderService.handleNotificationResponse(response);
      }
    );

    // 3. Tự động gia hạn cửa sổ trượt 7 ngày mỗi khi app foreground lại (AppState.active)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        MedicineReminderService.rescheduleAllActiveReminders();
      }
    });

    return () => {
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
      <Toast />
    </GestureHandlerRootView>
  );
};

export default App;
