import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthAPI } from '../../services/authApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContextType';
import { useAuth } from '../../context/AuthContext';

export default function SecuritySettings({ navigation }: any) {
  const { isBiometricSupported, isBiometricEnabled, toggleBiometrics } = useAuth();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { colors } = useTheme();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng điền đầy đủ thông tin',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Mật khẩu mới không khớp',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Phiên đăng nhập hết hạn',
        });
        return;
      }

      await AuthAPI.changePassword(token, {
        currentPassword,
        newPassword,
      });

      // Tự động vô hiệu hóa token sinh trắc học cũ để đảm bảo an toàn
      try {
        await toggleBiometrics(false);
      } catch {}

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đổi mật khẩu thành công. Vui lòng kích hoạt lại sinh trắc học nếu muốn.',
      });
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Change password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error.message || 'Không thể đổi mật khẩu',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (!isBiometricSupported && val) {
      Toast.show({
        type: 'error',
        text1: 'Không khả dụng',
        text2: 'Thiết bị chưa cài đặt vân tay hoặc không hỗ trợ sinh trắc học',
      });
      return;
    }

    try {
      setBiometricLoading(true);
      const res = await toggleBiometrics(val);
      if (res.success) {
        Toast.show({
          type: 'success',
          text1: 'Thành công',
          text2: val
            ? 'Đã kích hoạt đăng nhập bằng sinh trắc học'
            : 'Đã tắt đăng nhập bằng sinh trắc học',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Thông báo',
          text2: res.message || 'Không thể thay đổi thiết lập sinh trắc học',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: err?.message || 'Có lỗi xảy ra khi xử lý sinh trắc học',
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center p-4 pt-12 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 rounded-full items-center justify-center border"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold" style={{ color: colors.text }}>Bảo mật</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-sm font-bold uppercase tracking-wider mb-4 ml-2" style={{ color: colors.textSecondary }}>Xác thực</Text>
        
        <View className="border rounded-3xl overflow-hidden mb-8" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <TouchableOpacity 
            onPress={() => setIsChangingPassword(!isChangingPassword)}
            className="flex-row items-center justify-between p-5 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.surfaceSecondary }}>
                <MaterialIcons name="lock" size={20} color={colors.accentSecondary} />
              </View>
              <Text className="text-base font-bold" style={{ color: colors.text }}>Đổi mật khẩu</Text>
            </View>
            <MaterialIcons name={isChangingPassword ? "expand-less" : "expand-more"} size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {isChangingPassword && (
            <View className="p-5" style={{ backgroundColor: colors.surfaceSecondary + '50' }}>
              <Text className="text-xs mb-2 ml-1" style={{ color: colors.textSecondary }}>Mật khẩu hiện tại</Text>
              <View className="border h-12 rounded-xl px-4 mb-4 flex-row items-center" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <TextInput
                  secureTextEntry={!showCurrentPassword}
                  className="flex-1 text-sm"
                  style={{ color: colors.text }}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="pl-2">
                  <MaterialIcons 
                    name={showCurrentPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-xs mb-2 ml-1" style={{ color: colors.textSecondary }}>Mật khẩu mới</Text>
              <View className="border h-12 rounded-xl px-4 mb-4 flex-row items-center" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <TextInput
                  secureTextEntry={!showNewPassword}
                  className="flex-1 text-sm"
                  style={{ color: colors.text }}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="pl-2">
                  <MaterialIcons 
                    name={showNewPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-xs mb-2 ml-1" style={{ color: colors.textSecondary }}>Xác nhận mật khẩu mới</Text>
              <View className="border h-12 rounded-xl px-4 mb-6 flex-row items-center" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 text-sm"
                  style={{ color: colors.text }}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="pl-2">
                  <MaterialIcons 
                    name={showConfirmPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                disabled={loading}
                onPress={handleChangePassword}
                className="h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Cập nhật mật khẩu</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center justify-between p-5 border-b" style={{ borderBottomColor: colors.border }}>
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.surfaceSecondary }}>
                <MaterialIcons name="fingerprint" size={24} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: colors.text }}>Sinh trắc học (Vân tay / Khuôn mặt)</Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {!isBiometricSupported
                    ? 'Thiết bị chưa cài đặt vân tay/khuôn mặt'
                    : isBiometricEnabled
                    ? 'Đang bật • Đăng nhập an toàn bằng Android Keystore'
                    : 'Bật để mở khóa nhanh không cần nhập mật khẩu'}
                </Text>
              </View>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometrics}
                disabled={!isBiometricSupported && !isBiometricEnabled}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={isBiometricEnabled ? '#fff' : '#f4f3f4'}
              />
            )}
          </View>

          <View className="flex-row items-center justify-between p-5">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.surfaceSecondary }}>
                <MaterialIcons name="security" size={20} color={colors.accentSecondary} />
              </View>
              <Text className="text-base font-bold" style={{ color: colors.text }}>Xác thực 2 lớp (2FA)</Text>
            </View>
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={twoFactor ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <Text className="text-sm font-bold uppercase tracking-wider mb-4 ml-2" style={{ color: colors.textSecondary }}>Thiết bị đang đăng nhập</Text>
        
        <View className="border rounded-3xl overflow-hidden mb-8" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between p-5 border-b" style={{ borderBottomColor: colors.border }}>
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.surfaceSecondary }}>
                <MaterialIcons name="smartphone" size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="text-base font-bold" style={{ color: colors.text }}>Thiết bị này</Text>
                <Text className="text-xs mt-1" style={{ color: colors.accentSecondary }}>Đang hoạt động</Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center justify-between p-5">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.surfaceSecondary }}>
                <MaterialIcons name="laptop-mac" size={20} color={colors.textSecondary} />
              </View>
              <View>
                <Text className="text-base font-bold" style={{ color: colors.text }}>Trình duyệt Web</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Hoạt động 2 ngày trước</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text className="text-red-500 font-bold">Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
