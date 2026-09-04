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
          backgroundColor: colors.background, // Thanh TabBar màu dự án (#0a0014)
          borderTopWidth: 1,
          borderTopColor: colors.border,
          // Trên iOS cần insets.bottom để né vạch Home, 
          // nhưng trên Android ta đã để NavigationBar.relative (màu trắng) bên dưới,
          // nên TabBar này chỉ cần height fix cứng để nó nằm "tách rời" bên trên.
          height: Platform.OS === 'ios' ? 65 + insets.bottom : 65, 
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
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
