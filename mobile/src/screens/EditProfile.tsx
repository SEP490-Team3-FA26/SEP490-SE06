import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AuthAPI } from '../services/authApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfile({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(''); // Số điện thoại có thể fetch sau
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn');
        return;
      }

      await AuthAPI.updateProfile(token, {
        firstName,
        lastName,
        phone,
        avatar,
      });

      await refreshUser();
      Alert.alert('Thành công', 'Thông tin profile đã được cập nhật');
      navigation.goBack();
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0a0014]">
      <View className="flex-row items-center p-4 pt-12 bg-[#1a0033] border-b border-[#4d0099]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-[#2a004d] rounded-full items-center justify-center border border-[#4d0099]">
          <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-white pr-10">Chỉnh sửa hồ sơ</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <View className="items-center mb-8">
          <View className="relative">
            <Image 
              source={{ uri: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop' }} 
              className="w-28 h-28 rounded-full border-4 border-[#d500f9] shadow-[0_0_20px_rgba(213,0,249,0.5)]"
            />
          </View>
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Link ảnh đại diện (URL)</Text>
        <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-6">
          <MaterialIcons name="link" size={20} color="#d500f9" />
          <TextInput 
            className="flex-1 ml-3 text-base text-white"
            value={avatar}
            onChangeText={setAvatar}
            placeholder="Dán link ảnh tại đây"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Họ</Text>
        <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-6">
          <MaterialIcons name="person" size={20} color="#d500f9" />
          <TextInput 
            className="flex-1 ml-3 text-base text-white"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Nhập họ"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Tên</Text>
        <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-6">
          <MaterialIcons name="person" size={20} color="#d500f9" />
          <TextInput 
            className="flex-1 ml-3 text-base text-white"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nhập tên"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Email (Không thể thay đổi)</Text>
        <View className="flex-row items-center bg-[#1a0033]/50 border border-[#4d0099] h-14 rounded-2xl px-4 mb-6">
          <MaterialIcons name="email" size={20} color="#6a1b9a" />
          <TextInput 
            className="flex-1 ml-3 text-base text-[#6a1b9a]"
            value={user?.email}
            editable={false}
            keyboardType="email-address"
          />
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Số điện thoại</Text>
        <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-8">
          <MaterialIcons name="phone" size={20} color="#d500f9" />
          <TextInput 
            className="flex-1 ml-3 text-base text-white"
            value={phone}
            onChangeText={setPhone}
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className={`w-full ${loading ? 'bg-[#d500f9]/50' : 'bg-[#d500f9]'} h-14 rounded-2xl items-center justify-center shadow-[0_0_20px_rgba(213,0,249,0.4)] mb-10`}
        >
          <Text className="text-white font-bold text-lg tracking-wide">
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}