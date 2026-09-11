import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Platform } from 'react-native';

import MyTickets from '../screens/MyTickets';
import MyEvents from '../screens/MyEvents';
import Profile from '../screens/Profile';
import UserScreen from '../screens/user/UserHomeScreen';
import AIAssistant from '../screens/AIAssistant';
import SavedEvents from '../screens/SavedEvents';
import NewsFeed from '../screens/NewsFeed';
import { useTheme } from '../context/ThemeContextType';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      id="main-tab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home';

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'AI Assistant') iconName = 'smart-toy';
          else if (route.name === 'Tickets') iconName = 'local-activity';
          else if (route.name === 'Saved') iconName = 'favorite';
          else if (route.name === 'Manage') iconName = 'event';
          else if (route.name === 'News') iconName = 'campaign';
          else if (route.name === 'Profile') iconName = 'person';

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#1E293B' : '#E2E8F0',
          // Tự động thích ứng an toàn cả iOS (Home Indicator) và Android (Gesture Navigation / 3-button)
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      })}
    >
      {(user?.role === 'user' || user?.role === 'admin') && <Tab.Screen name="Home" component={UserScreen} />}
      {(user?.role === 'organizer' || user?.role === 'staff') && <Tab.Screen name="Manage" component={MyEvents} />}
      <Tab.Screen name="News" component={NewsFeed} />
      <Tab.Screen name="AI Assistant" component={AIAssistant} />
      {(user?.role === 'user' || user?.role === 'admin') && <Tab.Screen name="Tickets" component={MyTickets} />}
      {(user?.role === 'user' || user?.role === 'admin') && <Tab.Screen name="Saved" component={SavedEvents} />}
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
