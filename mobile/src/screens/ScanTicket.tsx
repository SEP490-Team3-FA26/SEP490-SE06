import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import Toast from 'react-native-toast-message';
import { CheckinAPI } from '../services/checkinApiService';

export default function ScanTicket({ navigation }: any) {
  const scanLineY = useSharedValue(0);
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(250, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    try {
      // qrCodePayload từ backend là JSON string, nhưng ở đây
      // mình chỉ cần ticketId, nên cố gắng parse, fallback dùng raw string.
      let extractedTicketId = '';
      try {
        const parsed = JSON.parse(result.data as string);
        extractedTicketId = parsed.ticketId || '';
      } catch {
        extractedTicketId = result.data as string;
      }

      if (!extractedTicketId) {
        Toast.show({
          type: 'error',
          text1: 'QR không hợp lệ',
          text2: 'Không tìm thấy ticketId trong mã QR',
        });
        setScanned(false);
        return;
      }

      setTicketCode(extractedTicketId);
      await handleCheckin(extractedTicketId);
    } catch (err) {
      setScanned(false);
    }
  };

  const handleCheckin = async (codeOverride?: string) => {
    const trimmed = (codeOverride ?? ticketCode).trim();
    if (!trimmed) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu mã vé',
        text2: 'Vui lòng nhập mã ticketId để check-in (VD: TV-123456-1)',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await CheckinAPI.scanTicket(trimmed);

      Toast.show({
        type: 'success',
        text1: 'Check-in thành công',
        text2: res.data
          ? `Vé ${res.data.ticketCode} • ${res.data.event?.name ?? ''} ${res.data.event?.seatLabel ?? ''}`
          : 'Vé đã được xác thực',
      });

      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Check-in thất bại',
        text2: error?.message || 'Không thể check-in vé, thử lại sau',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0a0014]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View className="flex-row items-center p-4 pt-12 bg-[#1a0033] border-b border-[#4d0099] z-10">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-[#2a004d] rounded-full items-center justify-center border border-[#4d0099]"
        >
          <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-white pr-10">
          Scan Ticket QR
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {!permission || !permission.granted ? (
          <View className="items-center justify-center px-8">
            <Text className="text-white font-bold text-center mb-4">
              Ứng dụng cần quyền truy cập camera để quét QR.
            </Text>
            <TouchableOpacity
              className="bg-[#d500f9] px-6 py-3 rounded-full"
              onPress={() => requestPermission()}
            >
              <Text className="text-white font-bold">Cấp quyền Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="w-64 h-64 border-2 border-[#d500f9] rounded-3xl overflow-hidden relative shadow-[0_0_30px_rgba(213,0,249,0.3)] bg-black/80">
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={handleBarCodeScanned}
              />

              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00e5ff] rounded-tl-3xl" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00e5ff] rounded-tr-3xl" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00e5ff] rounded-bl-3xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00e5ff] rounded-br-3xl" />

              <Animated.View
                style={[
                  animatedLineStyle,
                  {
                    width: '100%',
                    height: 2,
                    backgroundColor: '#00e5ff',
                    shadowColor: '#00e5ff',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 10,
                    elevation: 5,
                  },
                ]}
              />
            </View>

            <Text className="text-white font-bold mt-8 text-center px-8">
              Đưa mã QR vé vào trong khung để quét tự động.
            </Text>
          </>
        )}

        <View className="mt-4 w-72 mb-4">
          <Text className="text-xs text-[#b388ff] mb-2 ml-1">Ticket ID (TV-...)</Text>
          <View className="bg-[#1a0033] border border-[#4d0099] rounded-xl px-4 h-11 flex-row items-center">
            <TextInput
              className="flex-1 text-white text-sm"
              placeholder="VD: TV-123456-1"
              placeholderTextColor="#4d0099"
              autoCapitalize="none"
              value={ticketCode}
              onChangeText={setTicketCode}
            />
          </View>
        </View>

        <TouchableOpacity
          className="mt-2 mb-8 bg-[#d500f9] px-6 py-3 rounded-full flex-row items-center shadow-[0_0_15px_rgba(213,0,249,0.4)]"
          disabled={loading}
          onPress={() => handleCheckin()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Xác thực & Check-in vé</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
