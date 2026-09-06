import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContextType';

export default function Profile({ navigation }: any) {
  const { user, logout, refreshUser } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  useFocusEffect(
    React.useCallback(() => {
      void refreshUser();
    }, [refreshUser])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 4, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text, paddingVertical: 16 }}>Profile</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=68' }}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.accent }}
            />
            <TouchableOpacity style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.accent, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background }}>
              <MaterialIcons name="edit" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 16 }}>
            {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>{user?.email || 'Đăng nhập để xem profile'}</Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 24 }}>
            {(user?.role === 'user' || user?.role === 'admin') && (
              <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSecondary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <MaterialIcons name="receipt-long" size={24} color={colors.accentSecondary} />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Lịch sử mua vé</Text>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="person-outline" size={24} color={colors.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Chỉnh sửa hồ sơ</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SecuritySettings')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c4dff20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="security" size={24} color="#7c4dff" />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Bảo mật & Mật khẩu</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <TouchableOpacity onPress={() => navigation.navigate('VoucherManagement')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#00e5ff20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <MaterialIcons name="local-offer" size={24} color="#00e5ff" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Quản lý Voucher (Org)</Text>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {(user?.role === 'user' || user?.role === 'admin') && (
              <TouchableOpacity onPress={() => navigation.navigate('EventTimeline')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#d500f920', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <MaterialIcons name="auto-awesome" size={24} color="#d500f9" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Lịch trình sự kiện</Text>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffab0020', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name={isDarkMode ? "dark-mode" : "light-mode"} size={24} color="#ffab00" />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Chế độ tối</Text>
              <Switch
                trackColor={{ false: "#767577", true: colors.accent }}
                thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
                onValueChange={toggleTheme}
                value={isDarkMode}
              />
            </View>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 32 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.textSecondary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="help-outline" size={24} color={colors.textSecondary} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Trợ giúp & Hỗ trợ</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AboutEventix')}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.textSecondary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <MaterialIcons name="info-outline" size={24} color={colors.textSecondary} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text }}>Về Eventix</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => void logout()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#ff174410', borderRadius: 16, borderWidth: 1, borderColor: '#ff174430' }}>
            <MaterialIcons name="logout" size={20} color="#ff1744" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ff1744', marginLeft: 8 }}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
