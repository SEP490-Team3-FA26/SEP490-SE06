import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useStaffHome } from './useStaffHome';
import { useTheme } from '../../context/ThemeContextType';
import { CheckinAPI } from '../../services/checkinApiService';
import Toast from 'react-native-toast-message';

interface StaffHomeProps {
  navigation: any;
  route: { params?: { eventId?: string; eventName?: string; venueName?: string } };
}

export default function StaffHomeScreen({ navigation, route }: StaffHomeProps) {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const eventId = route?.params?.eventId;
  const eventNameParam = route?.params?.eventName;
  const venueNameParam = route?.params?.venueName;

  const {
    summary,
    recentScans,
    eventStaffs,
    loadingSummary,
    loadingRecent,
    loadingStaffs,
    assignmentStatus,
    refreshing,
    eventDetails,
    onRefresh,
    loadStaffStatus,
  } = useStaffHome(eventId);

  const displayEventName = eventNameParam || eventDetails?.eventName || 'Đang tải...';
  const displayLocation = venueNameParam || eventDetails?.eventLocation || 'Hệ thống';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginRight: 12 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Quản lý nhân sự</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>{eventNameParam || 'Sự kiện'}</Text>
        </View>
        <TouchableOpacity onPress={() => void logout()} style={{ width: 44, height: 44, backgroundColor: colors.surfaceSecondary, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
          <MaterialIcons name="logout" size={20} color="#ff1744" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ScanTicket')}
              style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
            >
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="qr-code-scanner" size={32} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>Scan Ticket</Text>
              </View>
            </TouchableOpacity>

            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <TouchableOpacity
                onPress={() => {
                  // TODO: Implement actual staff creation logic
                  import('react-native-toast-message').then(Toast => {
                    Toast.default.show({
                      type: 'info',
                      text1: 'Tính năng nâng cao',
                      text2: 'Vui lòng sử dụng trang Web để quản lý nhân sự chi tiết.'
                    });
                  });
                }}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.accent, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
              >
                <MaterialIcons name="person-add" size={32} color={colors.accentSecondary} />
                <Text style={{ color: colors.accentSecondary, fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>Thêm nhân sự</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text className="text-lg font-bold text-white mb-4">Thông tin sự kiện</Text>
        <View className="bg-[#1a0033] border border-[#4d0099] rounded-2xl p-4 mb-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                {displayEventName}
              </Text>
              <Text className="text-[#b388ff] text-sm">
                {displayLocation}
              </Text>
            </View>

            <View className="items-end">
              <View className="px-2 py-1 rounded bg-[#00e5ff]/20 border border-[#00e5ff]/50">
                <Text className="text-[#00e5ff] text-[10px] font-bold">STATUS: {eventDetails ? 'ACTIVE' : 'READY'}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-between border-t border-[#4d0099] pt-4">
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Khu vực</Text>
              <Text className="text-white font-bold text-base">{eventDetails?.zones?.length || 0}</Text>
            </View>
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Giá từ</Text>
              <Text className="text-[#d500f9] font-bold text-base">₫{eventDetails?.minPrice?.toLocaleString() || '0'}</Text>
            </View>
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Loại hình</Text>
              <Text className="text-white font-bold text-base">Trực tiếp</Text>
            </View>
          </View>
        </View>

        {user?.role === 'staff' && (
          <View style={{ marginBottom: 24 }}>
            {!assignmentStatus || assignmentStatus === 'rejected' ? (
              <TouchableOpacity
                style={{ backgroundColor: colors.accent, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
                onPress={async () => {
                  try {
                    if (!eventId) return;
                    const res = await CheckinAPI.requestAssignment(eventId);
                    Alert.alert('Thành công', res.message || 'Vui lòng chờ Organizer phê duyệt cho bạn phụ trách sự kiện này.');
                    Toast.show({
                      type: 'success',
                      text1: 'Đã gửi yêu cầu',
                      text2: res.message || 'Vui lòng chờ Organizer phê duyệt cho bạn phụ trách sự kiện này.'
                    });
                    void loadStaffStatus(); // Cập nhật lại trạng thái ngay lập tức
                  } catch (err: any) {
                    Alert.alert('Thất bại', err.message || 'Vui lòng thử lại sau');
                    Toast.show({
                      type: 'error',
                      text1: 'Gửi yêu cầu thất bại',
                      text2: err.message || 'Vui lòng thử lại sau'
                    });
                  }
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{assignmentStatus === 'rejected' ? 'GỬI LẠI YÊU CẦU PHỤ TRÁCH' : 'YÊU CẦU PHỤ TRÁCH SỰ KIỆN'}</Text>
              </TouchableOpacity>
            ) : assignmentStatus === 'pending' ? (
              <View style={{ backgroundColor: '#ffb30020', borderColor: '#ffb300', borderWidth: 1, padding: 16, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: '#ffb300', fontWeight: 'bold', fontSize: 16 }}>ĐANG CHỜ PHÊ DUYỆT</Text>
                <Text style={{ color: '#ffb300', fontSize: 12, marginTop: 4 }}>Yêu cầu phụ trách sự kiện của bạn đang được xét duyệt</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#00e5ff20', borderColor: '#00e5ff', borderWidth: 1, padding: 16, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: 16 }}>ĐÃ ĐƯỢC PHÂN QUYỀN</Text>
                <Text style={{ color: '#00e5ff', fontSize: 12, marginTop: 4 }}>Bạn là nhân viên chính thức của sự kiện này</Text>
              </View>
            )}
          </View>
        )}

        {(user?.role === 'admin' || user?.role === 'organizer') && (
          <View style={{ marginBottom: 24 }}>
            <Text className="text-lg font-bold text-[#d500f9] mb-4">Nhân viên Sự kiện</Text>
            {loadingStaffs ? (
              <ActivityIndicator color="#d500f9" />
            ) : eventStaffs.length === 0 ? (
              <Text className="text-[#b388ff] text-xs">Chưa có nhân viên nào được phân quyền.</Text>
            ) : (
              eventStaffs.map((staff, idx) => (
                <View key={staff._id || idx} className="bg-[#1a0033] border border-[#4d0099] rounded-xl p-3 mb-2 flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-[#d500f9]/20 items-center justify-center mr-3">
                    <MaterialIcons name="person" size={16} color="#d500f9" />
                  </View>
                  <View>
                    <Text className="text-white font-bold">{staff.staffName || staff.staffId}</Text>
                    <Text className="text-[#b388ff] text-xs">Đã phê duyệt</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {eventId && (
          <View className="flex-row justify-between border-t border-[#4d0099] pt-4 mb-6">
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Checked In</Text>
              {loadingSummary ? (
                <ActivityIndicator color="#d500f9" />
              ) : (
                <Text className="text-[#d500f9] font-bold text-xl">
                  {summary?.checkedIn ?? 0}
                </Text>
              )}
            </View>
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Total Tickets</Text>
              <Text className="text-[#d500f9] font-bold text-xl">
                {summary?.total ?? 0}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[#b388ff] text-xs mb-1">Remaining</Text>
              <Text className="text-[#d500f9] font-bold text-xl">
                {summary?.remaining ?? (summary ? 0 : 0)}
              </Text>
            </View>
          </View>
        )}

        <Text className="text-lg font-bold text-[#d500f9] mb-4">Recent Scans</Text>
        {loadingRecent && (
          <View className="items-center my-4">
            <ActivityIndicator color="#d500f9" />
          </View>
        )}

        {!loadingRecent && recentScans.length === 0 && (
          <Text className="text-[#b388ff] text-xs text-center mb-4">
            Chưa có lượt check-in nào gần đây cho sự kiện này.
          </Text>
        )}

        {!loadingRecent &&
          recentScans.map((log, index) => (
            <View
              key={`${log.ticketCode}-${log.createdAt}-${index}`}
              className="bg-[#1a0033] border border-[#4d0099] rounded-xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-[#00e5ff]/20 rounded-full items-center justify-center mr-3">
                  <MaterialIcons
                    name={log.result === 'SUCCESS' ? 'check' : 'error-outline'}
                    size={20}
                    color={log.result === 'SUCCESS' ? '#00e5ff' : '#ff5252'}
                  />
                </View>
                <View>
                  <Text className="text-white font-bold">
                    Ticket {log.ticketCode}
                  </Text>
                  <Text className="text-[#b388ff] text-xs">
                    {log.result === 'SUCCESS'
                      ? 'Check-in thành công'
                      : log.reason || 'Thao tác check-in'}
                  </Text>
                </View>
              </View>
              <Text className="text-[#6a1b9a] text-xs">
                {new Date(log.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
