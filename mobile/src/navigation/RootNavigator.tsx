import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import UserHomeScreen from '../screens/user/UserHomeScreen';
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';

export type RootStackParamList = {
  Login: undefined;
  UserHome: undefined;
  StaffHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const {
    auth: { role },
  } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {role === 'guest' && (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Đăng nhập' }}
          />
        )}

        {role === 'user' && (
          <Stack.Screen
            name="UserHome"
            component={UserHomeScreen}
            options={{ title: 'Trang khách hàng' }}
          />
        )}

        {role === 'staff' && (
          <Stack.Screen
            name="StaffHome"
            component={StaffHomeScreen}
            options={{ title: 'Trang nhân viên' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

