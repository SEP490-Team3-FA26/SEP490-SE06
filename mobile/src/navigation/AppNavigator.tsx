import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Navigators
import TabNavigator from './TabNavigator';

// Auth Screens
import Login from '../screens/auth/LoginScreen';
import CreateAccount from '../screens/auth/CreateAccount';

// App Screens
import EventDetail from '../screens/EventDetail';
import TicketSelection from '../screens/TicketSelection';
import Checkout from '../screens/Checkout';
import OrderConfirmation from '../screens/OrderConfirmation';
import OrderHistory from '../screens/OrderHistory';
import TicketDetail from '../screens/TicketDetail';
import CreateEvent from '../screens/organizer/CreateEvent';
import SeatMapDesigner from '../screens/organizer/SeatMapDesigner';
import EditProfile from '../screens/EditProfile';
import SecuritySettings from '../screens/auth/SecuritySettings';
import Notifications from '../screens/Notifications';
import UserScreen from '../screens/user/UserHomeScreen';
import StaffScreen from '../screens/staff/StaffHomeScreen';
import ScanTicket from '../screens/ScanTicket';
import MyEvents from '../screens/MyEvents';
import AboutEventix from '../screens/AboutEventix';
import HelpSupport from '../screens/HelpSupport';
import AIAssistant from '../screens/AIAssistant';
import EventAnalytics from '../screens/organizer/EventAnalytics';
import EventTimeline from '../screens/EventTimeline';
import VoucherManagement from '../screens/VoucherManagement';
import NewsFeed from '../screens/NewsFeed';
import NewsDetail from '../screens/NewsDetail';
import NewsManager from '../screens/organizer/NewsManager';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { auth } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0014' } }}>
      {auth.role === 'staff' ? (
        // Staff is signed in
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="StaffScreen" component={StaffScreen} />
          <Stack.Screen name="ScanTicket" component={ScanTicket} />
          <Stack.Screen name="MyEvents" component={MyEvents} />
          <Stack.Screen name="Notifications" component={Notifications} />
        </Stack.Group>
      ) : (auth.role === 'user' || auth.role === 'organizer' || auth.role === 'admin') ? (
        // User is signed in
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="EventDetail" component={EventDetail} />
          <Stack.Screen name="TicketSelection" component={TicketSelection} />
          <Stack.Screen name="Checkout" component={Checkout} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
          <Stack.Screen name="OrderHistory" component={OrderHistory} />
          <Stack.Screen name="TicketDetail" component={TicketDetail} />
          <Stack.Screen name="CreateEvent" component={CreateEvent} />
          <Stack.Screen name="SeatMapDesigner" component={SeatMapDesigner} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettings} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="ScanTicket" component={ScanTicket} />
          <Stack.Screen name="StaffScreen" component={StaffScreen} />
          <Stack.Screen name="AboutEventix" component={AboutEventix} />
          <Stack.Screen name="HelpSupport" component={HelpSupport} />
          <Stack.Screen name="AIAssistant" component={AIAssistant} />
          <Stack.Screen name="EventAnalytics" component={EventAnalytics} />
          <Stack.Screen name="EventTimeline" component={EventTimeline} />
          <Stack.Screen name="VoucherManagement" component={VoucherManagement} />
          <Stack.Screen name="NewsFeed" component={NewsFeed} />
          <Stack.Screen name="NewsDetail" component={NewsDetail} />
          <Stack.Screen name="NewsManager" component={NewsManager} />
        </Stack.Group>
      ) : (
        // User is NOT signed in
        <Stack.Group>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="CreateAccount" component={CreateAccount} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
