// AppNavigator.tsx - Complete Role-based Navigation Routing Hub for Pharma ERP Mobile
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
import { FlatComponentsShowcase } from '../screens/common/FlatComponentsShowcase';

// Actor Screens
import { AdminScreen } from '../screens/admin/AdminScreen';
import { DirectorScreen } from '../screens/director/DirectorScreen';
import { WarehouseScreen } from '../screens/warehouse/WarehouseScreen';
import { PharmacistScreen } from '../screens/pharmacist/PharmacistScreen';
import { BranchScreen } from '../screens/branch/BranchScreen';
import { CustomerScreen } from '../screens/customer/CustomerScreen';
import { CustomerCheckoutScreen } from '../screens/customer/CustomerCheckoutScreen';

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
      initialRouteName={auth.isAuthenticated ? getInitialActorScreen() : 'LoginScreen'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      {!auth.isAuthenticated ? (
        // Auth Flow
        <Stack.Group>
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
          <Stack.Screen name="FlatComponentsShowcase" component={FlatComponentsShowcase} />
        </Stack.Group>
      ) : (
        // Authenticated App Flow
        <Stack.Group>
          {/* Actor Entry Screens */}
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          <Stack.Screen name="DirectorScreen" component={DirectorScreen} />
          <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
          <Stack.Screen name="PharmacistScreen" component={PharmacistScreen} />
          <Stack.Screen name="BranchScreen" component={BranchScreen} />
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />

          {/* Sub-screens */}
          <Stack.Screen name="CustomerCheckoutScreen" component={CustomerCheckoutScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="NotificationListScreen" component={NotificationListScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
          <Stack.Screen name="FlatComponentsShowcase" component={FlatComponentsShowcase} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
