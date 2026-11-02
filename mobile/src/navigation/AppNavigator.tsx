// AppNavigator.tsx - Complete Guest-First Role-based Navigation Routing Hub
import React, { useMemo } from 'react';
import { Platform } from 'react-native';
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
import { SplashScreen } from '../screens/common/SplashScreen';

// Actor Screens
import { AdminScreen } from '../screens/admin/AdminScreen';
import { DirectorScreen } from '../screens/director/DirectorScreen';
import { WarehouseScreen } from '../screens/warehouse/WarehouseScreen';
import { PharmacistScreen } from '../screens/pharmacist/PharmacistScreen';
import { BranchScreen } from '../screens/branch/BranchScreen';
import { CustomerScreen } from '../screens/customer/CustomerScreen';
import { CustomerCheckoutScreen } from '../screens/customer/CustomerCheckoutScreen';
import { CustomerWishlistScreen } from '../screens/customer/CustomerWishlistScreen';
import { MedicineReminderScreen } from '../screens/customer/MedicineReminderScreen';
import { ProductReviewScreen } from '../screens/customer/ProductReviewScreen';
import { MedicineDetailScreen } from '../screens/customer/MedicineDetailScreen';
import { PointsHistoryScreen } from '../screens/customer/PointsHistoryScreen';
import { OrderConfirmation } from '../screens/OrderConfirmation';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { auth, user } = useAuth();
  const rawRole = (user?.role || auth.role || '').toLowerCase().trim();
  const userName = ((user as any)?.fullName || user?.name || '').toLowerCase().trim();
  const userEmail = (user?.email || (user as any)?.userIdentifier || '').toLowerCase().trim();
  const userRolesList = Array.isArray((user as any)?.roles)
    ? (user as any).roles.map((r: any) => String(r).toLowerCase().trim())
    : [];

  // Nhận diện vai trò Ban Giám Đốc chuẩn xác: theo role, roles array, email, số điện thoại hoặc tên chức vụ
  const isDirector =
    ['director', 'headbranch', 'head_branch'].includes(rawRole) ||
    userRolesList.some((r: string) => ['director', 'headbranch', 'head_branch'].includes(r)) ||
    userEmail === 'director@vinapharmacy.com';

  const isWarehouse =
    rawRole === 'warehouse' ||
    userRolesList.includes('warehouse') ||
    userEmail === 'warehouse@vinapharmacy.com' ||
    userName.includes('thủ kho') ||
    userName.includes('thu kho');

  const isPharmacist =
    rawRole === 'pharmacist' ||
    userRolesList.includes('pharmacist') ||
    userEmail === 'pharmacist@vinapharmacy.com' ||
    userName.includes('dược sĩ') ||
    userName.includes('duoc si');

  const isBranch =
    rawRole === 'branch' ||
    userRolesList.includes('branch') ||
    userEmail === 'manager@vinapharmacy.com' ||
    userName.includes('quản lý') ||
    userName.includes('quan ly');

  const isAdmin =
    rawRole === 'admin' ||
    userRolesList.includes('admin') ||
    userEmail === 'admin@vinapharmacy.com' ||
    userName.includes('admin');

  // Hỗ trợ chế độ Review / Showcase URL param trên nền Web
  const isWeb = Platform.OS === 'web';
  const reviewScreen = useMemo(() => {
    if (isWeb && typeof window !== 'undefined' && window.location) {
      return new URLSearchParams(window.location.search).get('screen');
    }
    return null;
  }, [isWeb]);

  const [showSplash, setShowSplash] = React.useState(!reviewScreen);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const getInitialActorScreen = () => {
    if (isAdmin) return 'AdminScreen';
    if (isDirector) return 'DirectorScreen';
    if (isWarehouse) return 'WarehouseScreen';
    if (isPharmacist) return 'PharmacistScreen';
    if (isBranch) return 'BranchScreen';
    return 'CustomerScreen';
  };

  const initialRoute = reviewScreen || (auth.isAuthenticated ? getInitialActorScreen() : 'CustomerScreen');

  return (
    <Stack.Navigator
      id="app-stack"
      key={isWeb ? `web-mode-${reviewScreen || 'default'}` : (auth.isAuthenticated ? `auth-${rawRole || 'user'}` : 'guest-flow')}
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      {isWeb ? (
        // ─── Web & Reviewer Showcase Flow: Cung cấp đầy đủ các màn để kiểm thử và chụp ảnh ───
        <Stack.Group>
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
          <Stack.Screen name="CustomerCheckoutScreen" component={CustomerCheckoutScreen} />
          <Stack.Screen name="CustomerWishlistScreen" component={CustomerWishlistScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
          <Stack.Screen name="MedicineReminderScreen" component={MedicineReminderScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="NotificationListScreen" component={NotificationListScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="PharmacistScreen" component={PharmacistScreen} />
          <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
          <Stack.Screen name="BranchScreen" component={BranchScreen} />
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          <Stack.Screen name="DirectorScreen" component={DirectorScreen} />
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
          <Stack.Screen name="MedicineDetailScreen" component={MedicineDetailScreen} />
          <Stack.Screen name="PointsHistoryScreen" component={PointsHistoryScreen} />
          <Stack.Screen name="ProductReviewScreen" component={ProductReviewScreen} />
        </Stack.Group>
      ) : !auth.isAuthenticated ? (
        // ─── Guest Flow (Guest-First E-Commerce Discovery) ──────────────────────
        <Stack.Group>
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
          <Stack.Screen name="CustomerWishlistScreen" component={CustomerWishlistScreen} />
          <Stack.Screen name="ProductReviewScreen" component={ProductReviewScreen} />
          <Stack.Screen name="MedicineDetailScreen" component={MedicineDetailScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
        </Stack.Group>
      ) : (
        // ─── Authenticated Role-Based App Flow ──────────────────────────────────
        <Stack.Group>
          {isAdmin && (
            <Stack.Screen name="AdminScreen" component={AdminScreen} />
          )}

          {isDirector && (
            <Stack.Screen name="DirectorScreen" component={DirectorScreen} />
          )}

          {isWarehouse && (
            <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
          )}

          {isPharmacist && (
            <Stack.Screen name="PharmacistScreen" component={PharmacistScreen} />
          )}

          {isBranch && (
            <Stack.Screen name="BranchScreen" component={BranchScreen} />
          )}

          {!isAdmin && !isDirector && !isWarehouse && !isPharmacist && !isBranch && (
            <>
              <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
              <Stack.Screen name="CustomerCheckoutScreen" component={CustomerCheckoutScreen} />
              <Stack.Screen name="CustomerWishlistScreen" component={CustomerWishlistScreen} />
              <Stack.Screen name="MedicineDetailScreen" component={MedicineDetailScreen} />
              <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
              <Stack.Screen name="MedicineReminderScreen" component={MedicineReminderScreen} />
              <Stack.Screen name="ProductReviewScreen" component={ProductReviewScreen} />
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
