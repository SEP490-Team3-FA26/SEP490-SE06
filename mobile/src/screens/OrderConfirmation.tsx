import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function OrderConfirmation({ navigation, route }: any) {
  const orderCode = route?.params?.orderCode as number | undefined;
  const eventName = (route?.params?.eventName as string | undefined) || 'Event';
  const zoneName = (route?.params?.zoneName as string | undefined) || '';
  const quantity = Number(route?.params?.quantity || 0);
  const paymentStatus = route?.params?.paymentStatus || 'pending';

  const [status, setStatus] = useState<string>(paymentStatus);
  const paid = useMemo(() => status === 'paid' || status === 'success', [status]);
  const pending = useMemo(() => status === 'pending' || status === 'processing', [status]);

  // Simulate checking payment status (in real app, you'd call an API)
  useEffect(() => {
    if (pending) {
      const timer = setTimeout(() => {
        // Simulate successful payment after 3 seconds
        setStatus('success');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [pending]);

  return (
    <View className="flex-1 bg-[#0a0014]">
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxleHBsb3JlLWZlZWR8M3x8fGVufDB8fHx8fA%3D%3D' }}
        className="flex-1 justify-center items-center px-6"
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10, 0, 20, 0.8)', '#0a0014', '#0a0014']}
          className="absolute inset-0"
        />
        
        <View className={`w-24 h-24 rounded-full items-center justify-center border-4 shadow-[0_0_30px_rgba(213,0,249,0.6)] mb-6 ${
          paid ? 'bg-[#00e5ff]/20 border-[#00e5ff]' : 'bg-[#d500f9]/20 border-[#d500f9]'
        }`}>
          <MaterialIcons 
            name={paid ? 'check-circle' : pending ? 'hourglass-top' : 'error'} 
            size={48} 
            color={paid ? '#00e5ff' : pending ? '#d500f9' : '#ff1744'} 
          />
        </View>
        
        <Text
          className="text-3xl font-black text-white mb-2 tracking-wide text-center"
          style={{ 
            textShadowColor: paid ? '#00e5ff' : '#d500f9', 
            textShadowOffset: { width: 0, height: 0 }, 
            textShadowRadius: 10 
          }}
        >
          {paid ? 'Thanh toán thành công!' : pending ? 'Đang xử lý thanh toán...' : 'Thanh toán thất bại'}
        </Text>
        <Text className="text-base text-[#b388ff] text-center mb-10">
          {paid
            ? 'Vé của bạn đã được xác nhận và ghi nhận trong hệ thống. Bạn có thể xem chi tiết trong lịch sử mua vé.'
            : pending 
            ? 'Đơn hàng đã được tạo. Vui lòng chờ xác nhận thanh toán từ PayOS.'
            : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
        </Text>

        <View className="w-full bg-[#1a0033]/90 border border-[#4d0099] rounded-3xl p-6 mb-8 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Text className="text-white font-bold text-xl mb-4 text-center">{eventName}</Text>
          <View className="flex-row justify-between mb-3 border-b border-[#4d0099] pb-3">
            <Text className="text-[#b388ff]">Tickets</Text>
            <Text className="text-white font-bold">{quantity ? `${quantity}x ${zoneName}` : zoneName || '--'}</Text>
          </View>
          <View className="flex-row justify-between pt-1">
            <Text className="text-[#b388ff]">Order ID</Text>
            <Text className="text-[#00e5ff] font-bold">{orderCode ? `#${orderCode}` : '--'}</Text>
          </View>
          <View className="flex-row justify-between pt-3">
            <Text className="text-[#b388ff]">Trạng thái</Text>
            <Text className={`font-bold ${
              paid ? 'text-[#00e5ff]' : pending ? 'text-[#d500f9]' : 'text-[#ff1744]'
            }`}>
              {paid ? 'Đã thanh toán' : pending ? 'Đang xử lý' : 'Thất bại'}
            </Text>
          </View>
        </View>

        <View className="w-full space-y-3">
          {paid && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('OrderHistory')}
              className="w-full bg-[#00e5ff] h-14 rounded-2xl items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,229,255,0.4)]"
            >
              <Text className="text-[#0a0014] font-bold text-lg tracking-wide">Xem lịch sử mua vé</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('MainTabs')}
            className="w-full bg-[#d500f9] h-14 rounded-2xl items-center justify-center mb-4 shadow-[0_0_20px_rgba(213,0,249,0.4)]"
          >
            <Text className="text-white font-bold text-lg tracking-wide">Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}