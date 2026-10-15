// AppNavigator.tsx - Complete Guest-First Role-based Navigation Routing Hub
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Common Screens
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { NotificationListScreen } from '../screens/common/NotificationListScreen';
import { WebViewScreen } from '../screens/common/WebViewScreen';

// Actor Screens
import { AdminScreen } from '../screens/admin/AdminScreen';
import { DirectorScreen } from '../screens/director/DirectorScreen';
import { WarehouseScreen } from '../screens/warehouse/WarehouseScreen';
import { PharmacistScreen } from '../screens/pharmacist/PharmacistScreen';
import { BranchScreen } from '../screens/branch/BranchScreen';
import { CustomerScreen } from '../screens/customer/CustomerScreen';
import { CustomerCheckoutScreen } from '../screens/customer/CustomerCheckoutScreen';
import { MedicineReminderScreen } from '../screens/customer/MedicineReminderScreen';
import { OrderConfirmation } from '../screens/OrderConfirmation';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { auth, user } = useAuth();
  const role = user?.role || auth.role;

  const getInitialActorScreen = () => {
    switch (role) {
      case 'admin':
        return 'AdminScreen';
      case 'headBranch':
      case 'director':
        return 'DirectorScreen';
      case 'warehouse':
        return 'WarehouseScreen';
      case 'pharmacist':
        return 'PharmacistScreen';
      case 'branch':
        return 'BranchScreen';
      case 'customer':
      case 'user':
      default:
        return 'CustomerScreen';
    }
  };

  return (
    <Stack.Navigator
      id="app-stack"
      key={auth.isAuthenticated ? `auth-${role || 'user'}` : 'guest-flow'}
      initialRouteName={auth.isAuthenticated ? getInitialActorScreen() : 'CustomerScreen'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      {!auth.isAuthenticated ? (
        // ─── Guest Flow (Guest-First E-Commerce Discovery) ──────────────────────
        <Stack.Group>
          {/* Mở thẳng trang CustomerScreen cho khách vãng lai */}
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
          {/* Màn hình xác thực khi khách bấm Checkout hoặc Login */}
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
        </Stack.Group>
      ) : (
        // ─── Authenticated Role-Based App Flow ──────────────────────────────────
        <Stack.Group>
          {role === 'admin' && (
            <Stack.Screen name="AdminScreen" component={AdminScreen} />
          )}

          {(role === 'director' || role === 'headBranch') && (
            <Stack.Screen name="DirectorScreen" component={DirectorScreen} />
          )}

          {role === 'warehouse' && (
            <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
          )}

          {role === 'pharmacist' && (
            <Stack.Screen name="PharmacistScreen" component={PharmacistScreen} />
          )}

          {role === 'branch' && (
            <Stack.Screen name="BranchScreen" component={BranchScreen} />
          )}

          {(role === 'customer' ||
            role === 'user' ||
            !['admin', 'director', 'headBranch', 'warehouse', 'pharmacist', 'branch'].includes(
              role
            )) && (
            <>
              <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
              <Stack.Screen name="CustomerCheckoutScreen" component={CustomerCheckoutScreen} />
              <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
              <Stack.Screen name="MedicineReminderScreen" component={MedicineReminderScreen} />
            </>
          )}

          {/* Shared Sub-screens for Authenticated Users */}
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="NotificationListScreen" component={NotificationListScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
