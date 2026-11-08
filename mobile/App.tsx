import React, { useEffect } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ui/CustomToast';
import { MedicineReminderService } from './src/services/medicineReminder.service';
import { FireEmergencyModal } from './src/components/warehouse/FireEmergencyModal';

// Bỏ qua các cảnh báo không nguy hiểm của Expo Go
LogBox.ignoreLogs([
  'Each child in a list should have a unique "key" prop',
  'Fetch request has been canceled',
]);

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
    // 1. Khởi tạo dịch vụ nhắc uống thuốc In-App
    MedicineReminderService.init().then(() => {
      MedicineReminderService.rescheduleAllActiveReminders();
    }).catch((err) => {
      console.warn('MedicineReminderService.init warning:', err);
    });

    // 2. Tự động kiểm tra nhắc thuốc khi app chuyển từ nền lên foreground (AppState.active)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        MedicineReminderService.rescheduleAllActiveReminders();
      }
    });

    return () => {
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
