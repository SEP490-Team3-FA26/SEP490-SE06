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

export default function ForgotPassword({ navigation, route }: any) {
  const { forgotPassword, verifyResetCode, resetPassword, isLoading, error, clearError } = useAuth();
  
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideUpAnim = useSharedValue(50);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) });
    slideUpAnim.value = withDelay(100, withSpring(0, { damping: 15, stiffness: 100 }));
  }, [step]);

  useEffect(() => {
    if (error || localError) {
      const timer = setTimeout(() => {
        clearError();
        setLocalError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, localError]);

  const animatedFormStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideUpAnim.value }],
    };
  });

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setLocalError('Vui lòng nhập email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Email không hợp lệ');
      return false;
    }

    return true;
  };

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

  const validatePassword = (): boolean => {
    if (!newPassword) {
      setLocalError('Vui lòng nhập mật khẩu mới');
      return false;
    }

    if (newPassword.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp');
      return false;
    }

    return true;
  };

  const handleRequestReset = async () => {
    setLocalError(null);
    clearError();

    if (!validateEmail()) {
      return;
    }

    const success = await forgotPassword(email.trim());
    
    if (success) {
      Alert.alert(
        'Email đã được gửi',
        'Vui lòng kiểm tra email để nhận mã xác thực.',
        [{ text: 'OK', onPress: () => setStep('code') }]
      );
    }
  };

  const handleVerifyCode = async () => {
    setLocalError(null);
    clearError();

    if (!validateCode()) {
      return;
    }

    const success = await verifyResetCode(email.trim(), code.trim());
    
    if (success) {
      setStep('password');
    }
  };

  const handleResetPassword = async () => {
    setLocalError(null);
    clearError();

    if (!validatePassword()) {
      return;
    }

    const success = await resetPassword(email.trim(), code.trim(), newPassword);
    
    if (success) {
      Alert.alert(
        'Đặt lại mật khẩu thành công',
        'Bạn có thể đăng nhập với mật khẩu mới.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]
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
          onPress={() => {
            if (step === 'email') {
              navigation.goBack();
            } else if (step === 'code') {
              setStep('email');
            } else {
              setStep('code');
            }
          }}
          className="w-10 h-10 bg-[#1a0033] rounded-full items-center justify-center border border-[#4d0099]"
        >
          <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-white pr-10">
          {step === 'email' ? 'Forgot Password' : step === 'code' ? 'Verify Code' : 'Reset Password'}
        </Text>
      </View>

      {/* Form */}
      <Animated.View style={animatedFormStyle} className="flex-1 px-8 pt-8">
        {step === 'email' && (
          <>
            <Text className="text-2xl font-bold text-white mb-2">Reset Password</Text>
            <Text className="text-sm text-[#b388ff] mb-8">
              Enter your email address and we'll send you a verification code to reset your password.
            </Text>

            {displayError && (
              <View className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <Text className="text-red-400 text-sm text-center">{displayError}</Text>
              </View>
            )}

            <View className="mb-6">
              <View className={`flex-row items-center bg-[#0a0014]/90 border h-14 rounded-2xl px-4 ${displayError && !email.trim() ? 'border-red-500/50' : 'border-[#4d0099]'}`}>
                <MaterialIcons name="email" size={22} color="#b388ff" />
                <TextInput 
                  className="flex-1 ml-3 text-base text-white"
                  placeholder="Email Address"
                  placeholderTextColor="#6a1b9a"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (localError) setLocalError(null);
                  }}
                  editable={!isLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRequestReset}
              disabled={isLoading}
              className={`w-full h-14 rounded-2xl items-center justify-center mb-6 shadow-[0_0_20px_rgba(213,0,249,0.4)] ${isLoading ? 'bg-[#d500f9]/50' : 'bg-[#d500f9]'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg tracking-wide">Send Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'code' && (
          <>
            <Text className="text-2xl font-bold text-white mb-2">Enter Verification Code</Text>
            <Text className="text-sm text-[#b388ff] mb-8">
              We've sent a 6-digit code to {email}. Please enter it below.
            </Text>

            {displayError && (
              <View className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <Text className="text-red-400 text-sm text-center">{displayError}</Text>
              </View>
            )}

            <View className="mb-6">
              <View className={`flex-row items-center bg-[#0a0014]/90 border h-14 rounded-2xl px-4 ${displayError && !code.trim() ? 'border-red-500/50' : 'border-[#4d0099]'}`}>
                <MaterialIcons name="vpn-key" size={22} color="#b388ff" />
                <TextInput 
                  className="flex-1 ml-3 text-base text-white text-center text-xl tracking-widest"
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
              onPress={handleVerifyCode}
              disabled={isLoading}
              className={`w-full h-14 rounded-2xl items-center justify-center mb-4 shadow-[0_0_20px_rgba(213,0,249,0.4)] ${isLoading ? 'bg-[#d500f9]/50' : 'bg-[#d500f9]'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg tracking-wide">Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRequestReset}
              disabled={isLoading}
              className="items-center py-2"
            >
              <Text className="text-[#00e5ff] text-sm font-medium">Resend Code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'password' && (
          <>
            <Text className="text-2xl font-bold text-white mb-2">New Password</Text>
            <Text className="text-sm text-[#b388ff] mb-8">
              Enter your new password. Make sure it's at least 6 characters long.
            </Text>

            {displayError && (
              <View className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <Text className="text-red-400 text-sm text-center">{displayError}</Text>
              </View>
            )}

            <View className="mb-4">
              <View className={`flex-row items-center bg-[#0a0014]/90 border h-14 rounded-2xl px-4 ${displayError && !newPassword ? 'border-red-500/50' : 'border-[#4d0099]'}`}>
                <MaterialIcons name="lock" size={22} color="#b388ff" />
                <TextInput 
                  className="flex-1 ml-3 text-base text-white"
                  placeholder="New Password"
                  placeholderTextColor="#6a1b9a"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (localError) setLocalError(null);
                  }}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons 
                    name={showPassword ? "visibility-off" : "visibility"} 
                    size={22} 
                    color={showPassword ? "#b388ff" : "#6a1b9a"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <View className={`flex-row items-center bg-[#0a0014]/90 border h-14 rounded-2xl px-4 ${displayError && newPassword !== confirmPassword ? 'border-red-500/50' : 'border-[#4d0099]'}`}>
                <MaterialIcons name="lock" size={22} color="#b388ff" />
                <TextInput 
                  className="flex-1 ml-3 text-base text-white"
                  placeholder="Confirm Password"
                  placeholderTextColor="#6a1b9a"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (localError) setLocalError(null);
                  }}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialIcons 
                    name={showConfirmPassword ? "visibility-off" : "visibility"} 
                    size={22} 
                    color={showConfirmPassword ? "#b388ff" : "#6a1b9a"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isLoading}
              className={`w-full h-14 rounded-2xl items-center justify-center mb-6 shadow-[0_0_20px_rgba(213,0,249,0.4)] ${isLoading ? 'bg-[#d500f9]/50' : 'bg-[#d500f9]'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg tracking-wide">Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
