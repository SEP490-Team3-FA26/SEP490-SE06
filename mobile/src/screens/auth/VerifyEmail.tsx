import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function VerifyEmail({ navigation, route }: any) {
  const { verifyEmail, resendVerification, isLoading, error, clearError } = useAuth();
  
  const email = route?.params?.email || '';
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideUpAnim = useSharedValue(50);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) });
    slideUpAnim.value = withDelay(100, withSpring(0, { damping: 15, stiffness: 100 }));
  }, []);

  useEffect(() => {
    if (error || localError) {
      const timer = setTimeout(() => {
        clearError();
        setLocalError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, localError]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const animatedFormStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideUpAnim.value }],
    };
  });

  const validateCode = (): boolean => {
    if (!code.trim()) {
      setLocalError('Vui lòng nhập mã xác thực');
      return false;
    }

    if (code.trim().length !== 6) {
      setLocalError('Mã xác thực phải có 6 chữ số');
      return false;
    }

    return true;
  };

  const handleVerify = async () => {
    setLocalError(null);
    clearError();

    if (!validateCode()) {
      return;
    }

    const success = await verifyEmail(email.trim(), code.trim());
    
    if (success) {
      Alert.alert(
        'Xác thực thành công',
        'Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setLocalError(null);
    clearError();
    setResendCooldown(60); // 60 seconds cooldown

    const success = await resendVerification(email.trim());
    
    if (success) {
      Alert.alert(
        'Đã gửi lại mã',
        'Mã xác thực mới đã được gửi đến email của bạn.',
        [{ text: 'OK' }]
      );
    }
  };

  const displayError = error || localError;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#05000a]"
    >
      <LinearGradient
        colors={['#1a0033', '#0a0014', '#05000a']}
        className="absolute inset-0"
      />

      {/* Header */}
      <View className="flex-row items-center p-4 pt-12">
        <TouchableOpacity 
          onPress={() => navigation.replace('CreateAccount')}
          className="w-10 h-10 bg-[#1a0033] rounded-full items-center justify-center border border-[#4d0099]"
        >
          <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-white pr-10">
          Verify Email
        </Text>
      </View>

      {/* Form */}
      <Animated.View style={animatedFormStyle} className="flex-1 px-8 pt-8">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-[#1a0033] rounded-full items-center justify-center border-2 border-[#d500f9] shadow-[0_0_25px_rgba(213,0,249,0.5)] mb-4">
            <MaterialIcons name="email" size={48} color="#00e5ff" />
          </View>
          <Text className="text-2xl font-bold text-white mb-2 text-center">Check Your Email</Text>
          <Text className="text-sm text-[#b388ff] text-center px-4">
            We've sent a 6-digit verification code to
          </Text>
          <Text className="text-base font-semibold text-[#00e5ff] mt-2">{email}</Text>
        </View>

        {displayError && (
          <View className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
            <Text className="text-red-400 text-sm text-center">{displayError}</Text>
          </View>
        )}

        <View className="mb-6">
          <Text className="text-sm font-medium text-[#b388ff] mb-2 ml-2">Verification Code</Text>
          <View className={`flex-row items-center bg-[#0a0014]/90 border h-16 rounded-2xl px-4 ${displayError && !code.trim() ? 'border-red-500/50' : 'border-[#4d0099]'}`}>
            <MaterialIcons name="vpn-key" size={24} color="#b388ff" />
            <TextInput 
              className="flex-1 ml-3 text-base text-white text-center text-2xl tracking-widest font-bold"
              placeholder="000000"
              placeholderTextColor="#6a1b9a"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, ''));
                if (localError) setLocalError(null);
              }}
              editable={!isLoading}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={isLoading}
          className={`w-full h-14 rounded-2xl items-center justify-center mb-4 shadow-[0_0_20px_rgba(213,0,249,0.4)] ${isLoading ? 'bg-[#d500f9]/50' : 'bg-[#d500f9]'}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg tracking-wide">Verify Email</Text>
          )}
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-sm text-[#b388ff] mb-2">Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={isLoading || resendCooldown > 0}
            className="py-2"
          >
            {resendCooldown > 0 ? (
              <Text className="text-[#6a1b9a] text-sm font-medium">
                Resend in {resendCooldown}s
              </Text>
            ) : (
              <Text className="text-[#00e5ff] text-sm font-bold">Resend Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
