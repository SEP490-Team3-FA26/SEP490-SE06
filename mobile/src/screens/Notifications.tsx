import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';
import { useAuth } from '../context/AuthContext';
import { CheckinAPI } from '../services/checkinApiService';
import Toast from 'react-native-toast-message';

export default function Notifications({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await CheckinAPI.getPendingRequests();
      setPendingRequests(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('fetchRequests error:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user?.role === 'organizer' || user?.role === 'admin') {
      void fetchRequests();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await CheckinAPI.approveRequest(requestId);
        Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã phê duyệt nhân viên.' });
      } else {
        await CheckinAPI.rejectRequest(requestId);
        Toast.show({ type: 'info', text1: 'Từ chối', text2: 'Yêu cầu đã bị bác bỏ.' });
      }
      void fetchRequests();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Thất bại', text2: err.message });
    }
  };

  const defaultNotifications = [
    { id: 1, title: 'Vé đã xác nhận', message: 'Vé VIP Summer Music Fest của bạn đã sẵn sàng.', time: '2h trước', icon: 'check-circle', color: '#00e5ff', read: false },
    { id: 2, title: 'Nhắc nhở sự kiện', message: 'Tech Conference 2024 sẽ bắt đầu vào 9h sáng mai.', time: '1 ngày trước', icon: 'event', color: '#d500f9', read: true },
    { id: 3, title: 'Ưu đãi đặc biệt', message: 'Giảm 20% cho lần đặt chỗ tiếp theo với mã NEON20.', time: '2 ngày trước', icon: 'local-offer', color: '#ff007f', read: true },
  ];

  const mappedRequests = pendingRequests.map(req => ({
    id: req._id,
    title: 'Yêu cầu phụ trách',
    message: `Nhân viên ${req.staffName || 'N/A'} muốn phụ trách sự kiện "${req.eventName || 'N/A'}"`,
    time: req.createdAt ? new Date(req.createdAt).toLocaleTimeString() : 'Mới',
    icon: 'person-add',
    color: '#00e5ff',
    read: false,
    type: 'staff_request',
    staffName: req.staffName,
    requestId: req._id
  }));

  const displayNotifications = [...mappedRequests, ...defaultNotifications];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center p-4 pt-12 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold pr-10" style={{ color: colors.text }}>Notifications</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {displayNotifications.map((notif) => (
          <View 
            key={notif.id} 
            className={`p-4 mb-3 rounded-2xl border`}
            style={{ 
              backgroundColor: notif.read ? colors.surface : colors.surfaceSecondary,
              borderColor: notif.read ? colors.border : colors.accent
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{ backgroundColor: `${notif.color}20` }}>
                <MaterialIcons name={notif.icon as any} size={24} color={notif.color} />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className={`font-bold text-base`} style={{ color: notif.read ? colors.text : colors.accent }}>{notif.title}</Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>{notif.time}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, marginBottom: (notif as any).type === 'staff_request' ? 12 : 0 }}>{notif.message}</Text>
                
                {(notif as any).type === 'staff_request' && (
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity 
                      className="bg-[#00e5ff] px-4 py-2 rounded-lg mr-2"
                      onPress={() => handleAction((notif as any).requestId, 'approve')}
                    >
                      <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>CHẤP NHẬN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="bg-[#ff1744]/20 border border-[#ff1744] px-4 py-2 rounded-lg"
                      onPress={() => handleAction((notif as any).requestId, 'reject')}
                    >
                      <Text style={{ color: '#ff1744', fontWeight: 'bold', fontSize: 12 }}>TỪ CHỐI</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            {!notif.read && (
              <View className="w-2 h-2 rounded-full absolute top-4 right-4" style={{ backgroundColor: colors.accentSecondary }} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}