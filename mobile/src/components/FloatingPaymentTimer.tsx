import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { usePaymentTimer } from '../context/PaymentTimerContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDecay } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export const FloatingPaymentTimer = () => {
  const { isTimerActive, timeLeft, paymentUrl, eventInfo, totalAmount, seatCount, stopTimer, cancelPayment } = usePaymentTimer();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const windowDim = Dimensions.get('window');
  // Card dimensions ~ w-72 (280) h-auto
  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 160;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd((event) => {
      // Snap to bounds
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [-windowDim.width + CARD_WIDTH + 24, 0], // right-aligned originally
      });
      translateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [-windowDim.height + CARD_HEIGHT + 100, 0], // bottom-aligned originally
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  if (!isTimerActive || timeLeft === null) return null;

  if (timeLeft === 0) {
    return (
      <View className="absolute bottom-24 right-6 z-[999] w-[280px]">
        <View className="bg-[#1e1828] border border-red-500/30 rounded-xl shadow-2xl flex-col p-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 rounded-full items-center justify-center bg-red-500/20">
              <MaterialIcons name="timer-off" size={24} color="#f87171" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-red-400">Hết thời gian thanh toán</Text>
              <Text className="text-xs text-gray-400 mt-1">Đơn bị huỷ và ghế đã được trả lại.</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={stopTimer}
            className="w-full py-3 rounded-xl items-center bg-[#2a2438] border border-[#3a3447]"
          >
            <Text className="text-white font-bold text-sm">Đóng thông báo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const progressPercent = Math.min(100, (timeLeft / 300) * 100);
  const isUrgent = timeLeft <= 60;

  return (
    <View className="absolute bottom-24 right-6 z-[999] w-[280px]" pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle} className="bg-[#1e1828] border border-[#3a3447] rounded-xl shadow-2xl overflow-hidden shadow-black/50">
          
          <View className="flex-row items-center justify-between p-3 pb-2 bg-transparent">
            <View className="flex-row items-center gap-3">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                <MaterialIcons name="hourglass-top" size={20} color={isUrgent ? '#f87171' : '#fbbf24'} />
              </View>
              <View>
                <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Chờ thanh toán</Text>
                <Text className={`text-2xl font-black ${isUrgent ? 'text-red-400' : 'text-amber-300'}`}>
                  {minutes}:{seconds}
                </Text>
              </View>
            </View>
          </View>

          <View className="w-full h-1 bg-gray-800">
            <View className={`h-full ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${progressPercent}%` }} />
          </View>

          <View className="px-4 py-3">
            <Text className="text-sm font-semibold text-white mb-1" numberOfLines={1}>
              {eventInfo?.title || 'Vé sự kiện'}
            </Text>
            <Text className="text-xs text-gray-400 mb-4 font-medium">
              {seatCount} ghế • <Text className="font-bold text-white">${totalAmount.toLocaleString()}</Text>
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={cancelPayment}
                className="flex-1 h-9 rounded-lg items-center justify-center bg-[#2a2438] border border-[#3a3447]"
              >
                <Text className="text-gray-300 font-bold text-xs">Huỷ</Text>
              </TouchableOpacity>
              
              {paymentUrl && (
                <TouchableOpacity 
                  onPress={() => WebBrowser.openBrowserAsync(paymentUrl)}
                  className="flex-[2] h-9 rounded-lg overflow-hidden shadow-lg"
                >
                  <LinearGradient
                    colors={['#8655f6', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="flex-row items-center justify-center h-full"
                  >
                    <MaterialIcons name="open-in-new" size={14} color="white" />
                    <Text className="text-white font-bold text-xs ml-1">PayOS</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </Animated.View>
      </GestureDetector>
    </View>
  );
};
